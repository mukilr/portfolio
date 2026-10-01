import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, resolve } from 'node:path';
import worker from './server/index.js';

const port = Number(process.env.PORT || 4174);
const root = resolve('.');
const testSiteKey = '6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI';
const testSecretKey = '6LeIxAcTAAAAAGG-vFI1TnRWxMZNFuojJ4WifJWe';
const env = {
  RECAPTCHA_SITE_KEY: process.env.RECAPTCHA_SITE_KEY || testSiteKey,
  RECAPTCHA_SECRET_KEY: process.env.RECAPTCHA_SECRET_KEY || testSecretKey,
  CONTACT_EMAIL: process.env.CONTACT_EMAIL,
  ALLOWED_ORIGIN: process.env.ALLOWED_ORIGIN || `http://127.0.0.1:${port}`,
  ALLOWED_HOSTNAME: process.env.ALLOWED_HOSTNAME,
};

const mime = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.pdf': 'application/pdf',
  '.svg': 'image/svg+xml',
};

const toRequest = async (request) => {
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  const body = chunks.length ? Buffer.concat(chunks) : undefined;
  return new Request(`http://127.0.0.1:${port}${request.url}`, {
    method: request.method,
    headers: request.headers,
    body: ['GET', 'HEAD'].includes(request.method) ? undefined : body,
  });
};

createServer(async (request, response) => {
  try {
    if (request.url.startsWith('/api/')) {
      const workerResponse = await worker.fetch(await toRequest(request), env);
      response.writeHead(workerResponse.status, Object.fromEntries(workerResponse.headers));
      response.end(Buffer.from(await workerResponse.arrayBuffer()));
      return;
    }

    const pathname = new URL(request.url, `http://127.0.0.1:${port}`).pathname;
    const requested = pathname === '/' ? '/index.html' : pathname;
    const file = resolve(root, `.${requested}`);
    if (!file.startsWith(root)) {
      response.writeHead(403).end('Forbidden');
      return;
    }
    const content = await readFile(file);
    response.writeHead(200, { 'Content-Type': mime[extname(file)] || 'application/octet-stream' });
    response.end(content);
  } catch (error) {
    response.writeHead(error.code === 'ENOENT' ? 404 : 500).end(error.code === 'ENOENT' ? 'Not found' : 'Server error');
  }
}).listen(port, '127.0.0.1', () => {
  process.stdout.write(`Portfolio preview: http://127.0.0.1:${port}\n`);
});
