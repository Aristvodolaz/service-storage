// Проксирование сервисов ТехВП через этот сервис (порт 3006): остальные порты сеть с ПК оператора не пропускает.
// /techvp/journal/*  -> сервис журнала   127.0.0.1:8770 (запросы RPC; авторизация — заголовок X-Token)
// /techvp/removal/*  -> сайт Кати «Удалить из тех ВП» 127.0.0.1:8765 (авторизация — web.token)
const express = require('express');
const http = require('http');

const router = express.Router();

const TARGETS = [
  { prefix: '/journal', host: '127.0.0.1', port: 8770 },
  { prefix: '/removal', host: '127.0.0.1', port: 8765 },
];

function proxy(target) {
  return (req, res) => {
    // express уже срезал префикс: req.url — путь на целевом сервисе вместе с query-строкой
    const up = http.request(
      {
        host: target.host,
        port: target.port,
        path: req.url || '/',
        method: req.method,
        headers: { ...req.headers, host: `${target.host}:${target.port}` },
        timeout: 60000,
      },
      (upRes) => {
        res.status(upRes.statusCode);
        for (const [k, v] of Object.entries(upRes.headers)) res.setHeader(k, v);
        upRes.pipe(res);
      }
    );
    up.on('timeout', () => up.destroy(new Error('таймаут')));
    up.on('error', () => {
      if (!res.headersSent) res.status(502).json({ success: false, msg: 'сервис ТехВП недоступен', errorCode: 502 });
    });
    req.pipe(up);
  };
}

// корень раздела — на страницу списка Кати
router.get('/', (req, res) => res.redirect('/techvp/removal/'));

for (const t of TARGETS) router.use(t.prefix, proxy(t));

module.exports = router;
