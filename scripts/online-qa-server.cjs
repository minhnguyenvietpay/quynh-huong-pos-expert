'use strict';
const http = require('node:http');
const { createMonitor } = require('../lib/monitoring/index.cjs');
function createServer(monitor = createMonitor()) {
  return http.createServer((req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none'");
    res.setHeader('X-Content-Type-Options', 'nosniff');
    const host = req.headers.host || '';
    if (!/^(localhost|127\.0\.0\.1|\[::1\])(?::\d{1,5})?$/.test(host) || (req.headers.origin && !/^http:\/\/(localhost|127\.0\.0\.1|\[::1\])(?::\d{1,5})?$/.test(req.headers.origin))) { res.writeHead(403); res.end(); return; }
    if (req.method !== 'GET') { res.writeHead(405, { Allow: 'GET' }); res.end(); return; }
    if (req.url !== '/' && req.url !== '/api/metrics') { res.writeHead(404); res.end(); return; }
    const payload = JSON.stringify(monitor.snapshot());
    if (req.url === '/api/metrics') { res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' }); res.end(payload); }
    else { res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }); res.end('<!doctype html><html lang="vi"><meta charset="utf-8"><title>QA metrics</title><h1>QA monitoring interface</h1><p>Offline interface; no live connector attached.</p><pre>' + payload.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;') + '</pre></html>'); }
  });
}
if (require.main === module) createServer().listen(3048, '127.0.0.1');
module.exports = { createServer };
