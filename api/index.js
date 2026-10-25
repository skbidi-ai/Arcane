import pg from 'pg';
import crypto from 'node:crypto';
const pool = new pg.Pool({ connectionString: process.env.NEON_DATABASE_URL, max: 3 });
const E = process.env, OWNERS = (E.BOT_OWNER_IDS || '').split(',').map((s) => s.trim()).filter(Boolean);
const sign = (s) => crypto.createHmac('sha256', E.SESSION_SECRET).update(s).digest('base64url');
const enc = (o) => { const b = Buffer.from(JSON.stringify(o)).toString('base64url'); return `${b}.${sign(b)}`; };
function session(req) {
  const m = /(?:^|; )arc=([^;]+)/.exec(req.headers.cookie || ''); if (!m) return null;
  const [b, s] = m[1].split('.'); if (!s || sign(b) !== s) return null;
  try { const o = JSON.parse(Buffer.from(b, 'base64url')); return o.exp > Date.now() ? o : null; } catch { return null; }
}
const json = (res, code, o) => { res.statusCode = code; res.setHeader('content-type', 'application/json'); res.end(JSON.stringify(o)); };
const body = (req) => new Promise((r) => { let d = ''; req.on('data', (c) => (d += c)); req.on('end', () => { try { r(JSON.parse(d || '{}')); } catch { r({}); } }); });
const str = (v, n = 1000) => (typeof v === 'string' ? v.slice(0, n) : undefined);
const bool = (v) => (typeof v === 'boolean' ? v : undefined);
const clean = (o) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined));

// Only these keys can be changed from the website.
function sanitize(c = {}) {
  const w = c.welcome || {}, g = c.goodbye || {}, a = c.automod || {};
  const xr = Number(c.xpRate);
  return clean({
    modlog: str(c.modlog, 64), levelChannel: str(c.levelChannel, 64), suggest: str(c.suggest, 64), autoRole: str(c.autoRole, 64),
    xp: bool(c.xp), xpRate: xr >= 0.5 && xr <= 5 ? xr : undefined,
    automod: Object.keys(a).length ? clean(Object.fromEntries(['spam', 'links', 'caps', 'invites', 'mentions'].map((k) => [k, bool(a[k])]))) : undefined,
    badWords: Array.isArray(c.badWords) ? [...new Set(c.badWords.map((x) => String(x).toLowerCase().trim().slice(0, 40)).filter(Boolean))].slice(0, 200) : undefined,
    modRoles: Array.isArray(c.modRoles) ? c.modRoles.map(String).slice(0, 25) : undefined,
    welcome: Object.keys(w).length ? clean({ channel: str(w.channel, 64), title: str(w.title, 256), message: str(w.message, 2000), image: str(w.image, 500), footer: str(w.footer, 256), color: /^#?[0-9a-f]{6}$/i.test(w.color) ? w.color : undefined }) : undefined,
    goodbye: Object.keys(g).length ? clean({ channel: str(g.channel, 64), message: str(g.message, 2000) }) : undefined,
  });
}
async function allowed(user, id) {
  const { rows } = await pool.query('SELECT owner_id FROM arcane_guilds WHERE server_id=$1', [id]);
  return rows[0] && (OWNERS.includes(user.id) || rows[0].owner_id === user.id);
}

export default async function handler(req, res) {
  const path = new URL(req.url, 'http://x').pathname.replace(/^\/api\/?/, '').split('/');
  const user = session(req);
  try {
    if (path[0] === 'login') {
      const state = crypto.randomUUID();
      res.setHeader('set-cookie', `arc_state=${state}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=600`);
      const q = new URLSearchParams({ client_id: E.YAPPER_CLIENT_ID, redirect_uri: `${E.SITE_URL}/api/callback`, response_type: 'code', scope: 'identify', state });
      res.statusCode = 302; res.setHeader('location', `${E.YAPPER_AUTH_URL}?${q}`); return res.end();
    }
    if (path[0] === 'callback') {
      const u = new URL(req.url, 'http://x'); const st = /arc_state=([^;]+)/.exec(req.headers.cookie || '')?.[1];
      if (!st || st !== u.searchParams.get('state')) return json(res, 400, { error: 'bad state' });
      const t = await (await fetch(E.YAPPER_TOKEN_URL, { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ grant_type: 'authorization_code', code: u.searchParams.get('code'), client_id: E.YAPPER_CLIENT_ID, client_secret: E.YAPPER_CLIENT_SECRET, redirect_uri: `${E.SITE_URL}/api/callback` }) })).json();
      let p = t.user;
      if (!p && t.access_token) p = await (await fetch(E.YAPPER_USERINFO_URL, { headers: { authorization: `Bearer ${t.access_token}` } })).json();
      p = p?.user || p; const id = p?.id || p?.sub; if (!id) return json(res, 401, { error: 'login failed' });
      res.setHeader('set-cookie', `arc=${enc({ id: String(id), name: p.display_name || p.username || p.name || 'User', avatar: p.avatar_url || p.avatar || null, exp: Date.now() + 7 * 864e5 })}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=604800`);
      res.statusCode = 302; res.setHeader('location', '/#/dashboard'); return res.end();
    }
    if (path[0] === 'logout') { res.setHeader('set-cookie', 'arc=; Path=/; Max-Age=0'); return json(res, 200, { ok: true }); }
    if (path[0] === 'registry') { // public: real command list published by the bot
      const { rows } = await pool.query("SELECT value FROM arcane_dashboard_state WHERE key='registry'"); return json(res, 200, rows[0]?.value || []);
    }
    if (!user) return json(res, 401, { error: 'not logged in' });
    if (path[0] === 'me') return json(res, 200, { ...user, owner: OWNERS.includes(user.id) });
    if (path[0] === 'guilds') {
      const { rows } = await pool.query('SELECT server_id,name,icon,member_count FROM arcane_guilds WHERE owner_id=$1 OR $2', [user.id, OWNERS.includes(user.id)]);
      return json(res, 200, rows);
    }
    if (path[0] === 'guild' && path[1]) {
      if (!(await allowed(user, path[1]))) return json(res, 403, { error: 'forbidden' });
      if (req.method === 'PUT') {
        const patch = sanitize((await body(req)).config);
        await pool.query(`INSERT INTO arcane_guild_settings (server_id,config) VALUES ($1,$2::jsonb)
          ON CONFLICT (server_id) DO UPDATE SET config = arcane_guild_settings.config || EXCLUDED.config, updated_at=now()`, [path[1], JSON.stringify(patch)]);
      }
      const [g, s] = await Promise.all([pool.query('SELECT * FROM arcane_guilds WHERE server_id=$1', [path[1]]), pool.query('SELECT config FROM arcane_guild_settings WHERE server_id=$1', [path[1]])]);
      return json(res, 200, { guild: g.rows[0], config: s.rows[0]?.config || {} });
    }
    if (path[0] === 'commands' && OWNERS.includes(user.id)) { // global on/off, picked up by the bot within 15s
      if (req.method === 'PUT') {
        const list = ((await body(req)).commands || []).map((c) => ({ name: String(c.name).slice(0, 32), description: String(c.description).slice(0, 100) }));
        await pool.query(`INSERT INTO arcane_dashboard_state (key,value) VALUES ('commands',$1::jsonb) ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value, updated_at=now()`, [JSON.stringify(list)]);
      }
      const { rows } = await pool.query("SELECT value FROM arcane_dashboard_state WHERE key='commands'"); return json(res, 200, rows[0]?.value || null);
    }
    json(res, 404, { error: 'not found' });
  } catch (e) { console.error(e); json(res, 500, { error: 'server error' }); }
}
