const express = require('express');
const bodyParser = require('body-parser');
const request = require('supertest');
const { createIdempotencyMiddleware, STALE_AFTER_MS } = require('../middlewares/idempotency');

/** Хранилище в памяти с тем же контрактом, что IdempotencyRepository. */
class MemoryStore {
  constructor() {
    this.rows = new Map();
    this.failInsert = false;
  }

  async insert(key, requestHash) {
    if (this.failInsert) throw new Error('db down');
    if (this.rows.has(key)) return false;
    this.rows.set(key, { requestHash, statusCode: null, responseBody: null, createdAt: Date.now() });
    return true;
  }

  async find(key) {
    const row = this.rows.get(key);
    if (!row) return null;
    return {
      requestHash: row.requestHash,
      statusCode: row.statusCode,
      responseBody: row.responseBody,
      ageMs: Date.now() - row.createdAt
    };
  }

  async claimStale(key, requestHash, staleMs) {
    const row = this.rows.get(key);
    if (!row || row.statusCode !== null || row.requestHash !== requestHash) return false;
    if (Date.now() - row.createdAt <= staleMs) return false;
    row.createdAt = Date.now();
    return true;
  }

  async complete(key, statusCode, responseBody) {
    const row = this.rows.get(key);
    row.statusCode = statusCode;
    row.responseBody = responseBody;
  }

  async release(key) {
    const row = this.rows.get(key);
    if (row && row.statusCode === null) this.rows.delete(key);
  }
}

const silentLogger = { error: () => {} };

function buildApp(store, handler) {
  const app = express();
  app.use(bodyParser.json());
  app.post('/write', createIdempotencyMiddleware(store, silentLogger), handler);
  return app;
}

describe('Idempotency-Key middleware', () => {
  it('без заголовка запрос выполняется каждый раз, как раньше', async () => {
    const store = new MemoryStore();
    let calls = 0;
    const app = buildApp(store, (req, res) => { calls++; res.json({ success: true }); });

    await request(app).post('/write').send({ a: 1 });
    await request(app).post('/write').send({ a: 1 });

    expect(calls).toBe(2);
    expect(store.rows.size).toBe(0);
  });

  it('повтор с тем же ключом не выполняет операцию второй раз и отдаёт сохранённый ответ', async () => {
    const store = new MemoryStore();
    let calls = 0;
    const app = buildApp(store, (req, res) => {
      calls++;
      res.status(201).json({ success: true, message: 'размещено' });
    });

    const first = await request(app).post('/write').set('Idempotency-Key', 'k1').send({ quantity: 2 });
    const second = await request(app).post('/write').set('Idempotency-Key', 'k1').send({ quantity: 2 });

    expect(calls).toBe(1);
    expect(first.status).toBe(201);
    expect(second.status).toBe(201);
    expect(second.body).toEqual({ success: true, message: 'размещено' });
    expect(second.headers['idempotent-replayed']).toBe('true');
  });

  it('тот же ключ с другим телом отклоняется с 422', async () => {
    const store = new MemoryStore();
    let calls = 0;
    const app = buildApp(store, (req, res) => { calls++; res.json({ success: true }); });

    await request(app).post('/write').set('Idempotency-Key', 'k2').send({ quantity: 2 });
    const conflict = await request(app).post('/write').set('Idempotency-Key', 'k2').send({ quantity: 5 });

    expect(conflict.status).toBe(422);
    expect(calls).toBe(1);
  });

  it('пока первый запрос выполняется, повтор получает 503 с Retry-After и не выполняется', async () => {
    const store = new MemoryStore();
    let calls = 0;
    const app = buildApp(store, (req, res) => { calls++; res.json({ success: true }); });
    // Резервация уже есть, ответа ещё нет
    await store.insert('k3', require('../middlewares/idempotency').hashBody({ quantity: 2 }));

    const response = await request(app).post('/write').set('Idempotency-Key', 'k3').send({ quantity: 2 });

    expect(response.status).toBe(503);
    expect(response.headers['retry-after']).toBe('5');
    expect(calls).toBe(0);
  });

  it('после ответа 5xx резервация снимается, и повтор выполняет операцию заново', async () => {
    const store = new MemoryStore();
    let calls = 0;
    const app = buildApp(store, (req, res) => {
      calls++;
      if (calls === 1) return res.status(500).json({ success: false });
      return res.json({ success: true });
    });

    const failed = await request(app).post('/write').set('Idempotency-Key', 'k4').send({ quantity: 2 });
    const retried = await request(app).post('/write').set('Idempotency-Key', 'k4').send({ quantity: 2 });

    expect(failed.status).toBe(500);
    expect(retried.status).toBe(200);
    expect(calls).toBe(2);
  });

  it('ошибка хранилища возвращает 503 и не выполняет операцию без защиты', async () => {
    const store = new MemoryStore();
    store.failInsert = true;
    let calls = 0;
    const app = buildApp(store, (req, res) => { calls++; res.json({ success: true }); });

    const response = await request(app).post('/write').set('Idempotency-Key', 'k5').send({ quantity: 2 });

    expect(response.status).toBe(503);
    expect(calls).toBe(0);
  });

  it('слишком длинный ключ отклоняется с 400', async () => {
    const store = new MemoryStore();
    const app = buildApp(store, (req, res) => res.json({ success: true }));

    const response = await request(app).post('/write').set('Idempotency-Key', 'x'.repeat(101)).send({});

    expect(response.status).toBe(400);
    expect(store.rows.size).toBe(0);
  });

  it('брошенная резервация старше порога перехватывается и операция выполняется', async () => {
    const store = new MemoryStore();
    const { hashBody } = require('../middlewares/idempotency');
    await store.insert('k6', hashBody({ quantity: 2 }));
    store.rows.get('k6').createdAt = Date.now() - STALE_AFTER_MS - 1000;
    let calls = 0;
    const app = buildApp(store, (req, res) => { calls++; res.json({ success: true }); });

    const response = await request(app).post('/write').set('Idempotency-Key', 'k6').send({ quantity: 2 });

    expect(response.status).toBe(200);
    expect(calls).toBe(1);
  });
});
