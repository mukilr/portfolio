const json = (body, status = 200, extraHeaders = {}) => new Response(JSON.stringify(body), {
  status,
  headers: {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    ...extraHeaders,
  },
});

const allowedOrigin = (request, env) => {
  const origin = request.headers.get('Origin');
  if (!origin) return null;
  if (env.ALLOWED_ORIGIN && origin !== env.ALLOWED_ORIGIN) return false;
  return origin;
};

const verifyRecaptcha = async (token, request, env) => {
  const body = new URLSearchParams({
    secret: env.RECAPTCHA_SECRET_KEY,
    response: token,
  });
  const ip = request.headers.get('CF-Connecting-IP');
  if (ip) body.set('remoteip', ip);

  const response = await fetch('https://www.google.com/recaptcha/api/siteverify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  if (!response.ok) return false;
  const result = await response.json();
  if (!result.success) return false;

  if (env.ALLOWED_HOSTNAME) {
    const allowedHostnames = env.ALLOWED_HOSTNAME.split(',').map((hostname) => hostname.trim());
    if (!allowedHostnames.includes(result.hostname)) return false;
  }
  return true;
};

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = allowedOrigin(request, env);
    if (origin === false) return json({ error: 'Origin not allowed.' }, 403);
    const cors = origin ? { 'Access-Control-Allow-Origin': origin, Vary: 'Origin' } : {};

    if (request.method === 'OPTIONS' && url.pathname.startsWith('/api/contact/')) {
      return new Response(null, {
        status: 204,
        headers: {
          ...cors,
          'Access-Control-Allow-Headers': 'Content-Type',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        },
      });
    }

    if (request.method === 'GET' && url.pathname === '/api/contact/config') {
      if (!env.RECAPTCHA_SITE_KEY) return json({ error: 'Verification is not configured.' }, 503, cors);
      return json({ siteKey: env.RECAPTCHA_SITE_KEY }, 200, cors);
    }

    if (request.method === 'POST' && url.pathname === '/api/contact/unlock') {
      if (!env.RECAPTCHA_SECRET_KEY || !env.CONTACT_EMAIL) {
        return json({ error: 'Verification is not configured.' }, 503, cors);
      }

      let payload;
      try {
        payload = await request.json();
      } catch {
        return json({ error: 'Invalid request.' }, 400, cors);
      }
      if (!payload?.token || typeof payload.token !== 'string') {
        return json({ error: 'Google verification is required.' }, 400, cors);
      }

      const verified = await verifyRecaptcha(payload.token, request, env);
      if (!verified) return json({ error: 'Google verification failed. Please try again.' }, 403, cors);
      return json({ email: env.CONTACT_EMAIL }, 200, cors);
    }

    if (env.ASSETS) return env.ASSETS.fetch(request);
    return new Response('Not found', { status: 404 });
  },
};
