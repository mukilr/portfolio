import worker from './index.js';

const buildUrl = (event) => {
  const host = event.headers?.host || 'localhost';
  const path = event.rawPath || '/';
  const query = event.rawQueryString ? `?${event.rawQueryString}` : '';
  return `https://${host}${path}${query}`;
};

export const handler = async (event) => {
  const method = event.requestContext?.http?.method || 'GET';
  const body = event.body
    ? event.isBase64Encoded
      ? Buffer.from(event.body, 'base64')
      : event.body
    : undefined;

  const request = new Request(buildUrl(event), {
    method,
    headers: event.headers || {},
    body: ['GET', 'HEAD'].includes(method) ? undefined : body,
  });

  const response = await worker.fetch(request, process.env);
  const headers = Object.fromEntries(response.headers.entries());

  return {
    statusCode: response.status,
    headers,
    body: await response.text(),
  };
};
