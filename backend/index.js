// Local username/password auth provider for dokku-manager.
//
// Required env vars on the Dokku app:
//   LOCAL_AUTH_USERNAME  — the single allowed username
//   LOCAL_AUTH_PASSWORD  — the password (sensitive)

const crypto = require('crypto');

const CACHE_TTL = 30_000;

const LOGIN_STYLES = `
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f3f4f6; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; }
  .card { background: white; border-radius: 12px; box-shadow: 0 4px 24px rgba(0,0,0,.1); padding: 2rem; width: 100%; max-width: 380px; }
  .logo { width: 40px; height: 40px; background: #4f46e5; border-radius: 10px; display: flex; align-items: center; justify-content: center; margin: 0 auto 1.25rem; }
  .logo span { color: white; font-weight: 700; font-size: 1.25rem; }
  h2 { margin: 0 0 1.5rem; color: #1f2937; font-size: 1.25rem; text-align: center; }
  label { display: block; font-size: .875rem; font-weight: 500; color: #374151; margin-bottom: .25rem; }
  input { width: 100%; box-sizing: border-box; padding: .5rem .75rem; border: 1px solid #d1d5db; border-radius: 6px; font-size: .9rem; margin-bottom: 1rem; outline: none; }
  input:focus { border-color: #4f46e5; box-shadow: 0 0 0 3px rgba(79,70,229,.15); }
  button { width: 100%; padding: .6rem; background: #4f46e5; color: white; border: none; border-radius: 6px; font-size: .9rem; font-weight: 500; cursor: pointer; }
  button:hover { background: #4338ca; }
  .error { background: #fef2f2; border: 1px solid #fecaca; color: #dc2626; border-radius: 6px; padding: .6rem .75rem; font-size: .875rem; margin-bottom: 1rem; }
`;

function renderPage(errorMsg) {
  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><title>Sign in — Dokku Manager</title>
<style>${LOGIN_STYLES}</style></head><body>
<div class="card">
  <div class="logo"><span>D</span></div>
  <h2>Sign in</h2>
  ${errorMsg ? `<div class="error">${errorMsg.replace(/</g, '&lt;')}</div>` : ''}
  <form method="POST" action="/api/auth/login">
    <label for="username">Username</label>
    <input id="username" name="username" type="text" autocomplete="username" required autofocus>
    <label for="password">Password</label>
    <input id="password" name="password" type="password" autocomplete="current-password" required>
    <button type="submit">Sign in</button>
  </form>
</div>
</body></html>`;
}

function timingSafeEqual(a, b) {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) {
    // Still run the comparison to avoid timing leak on length
    crypto.timingSafeEqual(ba, Buffer.alloc(ba.length));
    return false;
  }
  return crypto.timingSafeEqual(ba, bb);
}

function register(ctx) {
  const dokku = ctx.host.dokku;

  let cfgCache = null;
  let cfgCacheTime = 0;

  ctx.registerSensitiveKey('LOCAL_AUTH_PASSWORD');

  ctx.registerAuthProvider({
    id: 'local',
    label: 'Local Auth',
    type: 'credentials',

    configKeys: ['LOCAL_AUTH_USERNAME', 'LOCAL_AUTH_PASSWORD'],

    async readConfig() {
      if (cfgCache && Date.now() - cfgCacheTime < CACHE_TTL) return cfgCache;
      try {
        const config = await dokku.getConfig(dokku.appName);
        cfgCache = {
          username: config.LOCAL_AUTH_USERNAME || '',
          password: config.LOCAL_AUTH_PASSWORD || '',
        };
        cfgCacheTime = Date.now();
        return cfgCache;
      } catch {
        return cfgCache || { username: '', password: '' };
      }
    },

    clearCache() {
      cfgCache = null;
      cfgCacheTime = 0;
    },

    isConfigured(cfg) {
      return !!(cfg.username && cfg.password);
    },

    renderLoginPage(cfg, req, res) {
      const error = req.query.error || null;
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.send(renderPage(error));
    },

    async handleLoginPost(cfg, body) {
      const { username = '', password = '' } = body;
      const userOk = timingSafeEqual(username, cfg.username);
      const passOk = timingSafeEqual(password, cfg.password);
      if (!userOk || !passOk) {
        throw new Error('Invalid credentials');
      }
      return {
        user: { id: 'local', name: cfg.username, email: '', isAdmin: true },
      };
    },
  });
}

module.exports = { register };
