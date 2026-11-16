const crypto = require('crypto');

const HEADER = 'idempotency-key';
const MAX_KEY_LENGTH = 100;
// Резервация старше этого срока считается брошенной (процесс упал до ответа) и может быть перехвачена
const STALE_AFTER_MS = 5 * 60 * 1000;

function hashBody(body) {
  return crypto.createHash('sha256').update(JSON.stringify(body ?? {})).digest('hex');
}

/**
 * Контракт хранилища:
 *  - insert(key, requestHash) -> true, если создана новая запись; false, если ключ уже есть
 *  - find(key) -> null | { requestHash, statusCode, responseBody, ageMs }
 *  - claimStale(key, requestHash, staleMs) -> true, если брошенная резервация перехвачена
 *  - complete(key, statusCode, responseBody) -> сохраняет финальный ответ
 *  - release(key) -> удаляет незавершённую резервацию
 */
async function reserve(store, key, requestHash) {
  if (await store.insert(key, requestHash)) {
    return { state: 'reserved' };
  }

  const existing = await store.find(key);
  if (!existing) {
    // Запись удалили между попытками (например, release после 5xx): просим повторить
    return { state: 'in_progress' };
  }
  if (existing.requestHash !== requestHash) {
    return { state: 'conflict' };
  }
  if (existing.statusCode !== null && existing.statusCode !== undefined) {
    return { state: 'done', statusCode: existing.statusCode, responseBody: existing.responseBody };
  }
  if (existing.ageMs > STALE_AFTER_MS && (await store.claimStale(key, requestHash, STALE_AFTER_MS))) {
    return { state: 'reserved' };
  }
  return { state: 'in_progress' };
}

/**
 * Защита от повторной записи, когда клиент не получил ответ и отправляет запрос снова.
 * Без заголовка Idempotency-Key запрос обрабатывается как раньше.
 *
 * Правила:
 *  - тот же ключ и тело, ответ уже сохранён -> отдаём сохранённый ответ, операция не повторяется;
 *  - тот же ключ, но другое тело -> 422;
 *  - запрос с этим ключом ещё выполняется -> 503 с Retry-After (клиент повторит позже);
 *  - сервер ответил 5xx -> резервация снимается, повтор выполнит операцию заново;
 *  - хранилище недоступно -> 503, чтобы не выполнить запись без защиты.
 */
function createIdempotencyMiddleware(store, logger = console) {
  return async function idempotency(req, res, next) {
    const raw = req.get(HEADER);
    if (raw === undefined) {
      return next();
    }

    const key = String(raw).trim();
    if (!key || key.length > MAX_KEY_LENGTH) {
      return res.status(400).json({ success: false, message: 'Некорректный заголовок Idempotency-Key' });
    }

    const requestHash = hashBody(req.body);
    let outcome;
    try {
      outcome = await reserve(store, key, requestHash);
    } catch (err) {
      logger.error(`Idempotency: ошибка хранилища: ${err.message}`);
      return res.status(503).json({ success: false, message: 'Сервис временно недоступен, повторите позже' });
    }

    if (outcome.state === 'conflict') {
      return res.status(422).json({ success: false, message: 'Ключ Idempotency-Key уже использован для другого запроса' });
    }
    if (outcome.state === 'in_progress') {
      res.set('Retry-After', '5');
      return res.status(503).json({ success: false, message: 'Запрос с этим ключом уже выполняется' });
    }
    if (outcome.state === 'done') {
      res.set('Idempotent-Replayed', 'true');
      return res.status(outcome.statusCode).json(outcome.responseBody);
    }

    // Резервация получена: запоминаем финальный ответ или снимаем резервацию
    let finished = false;
    const originalJson = res.json.bind(res);

    res.json = (body) => {
      if (finished) {
        return originalJson(body);
      }
      finished = true;
      const persist = res.statusCode >= 500
        ? store.release(key)
        : store.complete(key, res.statusCode, body);
      Promise.resolve(persist)
        .catch((err) => logger.error(`Idempotency: не удалось сохранить ответ: ${err.message}`))
        .finally(() => originalJson(body));
      return res;
    };

    res.on('close', () => {
      if (finished) return;
      finished = true;
      Promise.resolve(store.release(key)).catch((err) =>
        logger.error(`Idempotency: не удалось снять резервацию: ${err.message}`)
      );
    });

    return next();
  };
}

module.exports = { createIdempotencyMiddleware, reserve, hashBody, STALE_AFTER_MS, MAX_KEY_LENGTH };
