import pg from 'pg';
import crypto from 'node:crypto';
import { ticketsApi } from '../lib/tickets-api.js';
const pool = new pg.Pool({ connectionString: process.env.NEON_DATABASE_URL, max: 3 });
const E = process.env;
const AUTH_URL = 'https://www.yapin.gg/oauth/authorize', TOKEN_URL = 'https://www.yapin.gg/api/oauth/token', ME_URL = 'https://www.yapin.gg/api/oauth/me';
const SITE = (E.SITE_URL || '').trim().replace(/\/+$/, ''), CID = (E.YAPPER_CLIENT_ID || '').trim(), CSEC = (E.YAPPER_CLIENT_SECRET || '').trim();
const OWNERS = (E.BOT_OWNER_IDS || '').split(',').map((s) => s.trim()).filter(Boolean);
const sign = (s) => crypto.createHmac('sha256', E.SESSION_SECRET).update(s).digest('base64url');
const mkState = () => { const n = crypto.randomUUID(), t = Date.now().toString(36); return `${n}.${t}.${sign(`${n}.${t}`)}`; };
const okState = (v) => { const [n, t, g] = String(v || '').split('.'); if (!g) return false; const w = sign(`${n}.${t}`);
  return g.length === w.length && crypto.timingSafeEqual(Buffer.from(g), Buffer.from(w)) && Date.now() - parseInt(t, 36) < 15 * 60e3; };
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
    verify: c.verify && typeof c.verify === 'object' ? sanitizeVerify(c.verify) : undefined,
    discover: c.discover && typeof c.discover === 'object' ? clean({ enabled: bool(c.discover.enabled), description: str(c.discover.description, 300), invite: c.discover.invite === '' || /^https:\/\/\S{3,200}$/.test(c.discover.invite || '') ? c.discover.invite : undefined }) : undefined,
  });
}
const hex6 = (v) => (/^#?[0-9a-f]{6}$/i.test(v || '') ? (String(v).startsWith('#') ? v : '#' + v) : undefined);
// Only settings. The bot owns verify.panels and verify.count, so they are never accepted from the website.
function sanitizeVerify(v) {
  const e = v.embed && typeof v.embed === 'object' ? v.embed : null;
  return clean({
    role: str(v.role, 64), unverifiedRole: str(v.unverifiedRole, 64), channel: str(v.channel, 64),
    label: str(v.label, 40)?.trim() || undefined, emoji: str(v.emoji, 16)?.trim() || undefined,
    dm: bool(v.dm), log: bool(v.log),
    embed: e ? clean({ title: str(e.title, 256), description: str(e.description, 1500), steps: str(e.steps, 1000), security: str(e.security, 1000), ready: str(e.ready, 400), footer: str(e.footer, 200), color: hex6(e.color) }) : undefined,
  });
}
const slug = (x = '') => String(x).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const cleanList = (key, items) => (Array.isArray(items) ? items : []).slice(0, 100).map((e) => (key === 'docs'
  ? { id: slug(str(e.id, 60)), title: str(e.title, 120), category: str(e.category, 40) || 'General', body: str(e.body, 20000) || '' }
  : { version: str(e.version, 20), tag: str(e.tag, 40) || '', date: str(e.date, 30) || '', items: (Array.isArray(e.items) ? e.items : []).map((x) => str(String(x), 500)).filter(Boolean).slice(0, 30) }))
  .filter((e) => (key === 'docs' ? e.id && e.title : e.version));
async function allowed(user, id) {
  const { rows } = await pool.query('SELECT owner_id FROM arcane_guilds WHERE server_id=$1', [id]);
  return rows[0] && (OWNERS.includes(user.id) || rows[0].owner_id === user.id);
}

export default async function handler(req, res) {
  const path = new URL(req.url, 'http://x').pathname.replace(/^\/api\/?/, '').split('/');
  const user = session(req);
  try {
    if (path[0] === 'login') {
      const state = mkState();
      const q = new URLSearchParams({ client_id: CID, redirect_uri: `${SITE}/api/callback`, response_type: 'code', scope: 'identify', state });
      res.statusCode = 302; res.setHeader('location', `${AUTH_URL}?${q}`); return res.end();
    }
    if (path[0] === 'callback') {
      const u = new URL(req.url, 'http://x'); 
      if (!okState(u.searchParams.get('state'))) return json(res, 400, { error: 'bad state', hint: 'login link expired, start again from the site' });
      const t = await (await fetch(TOKEN_URL, { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ grant_type: 'authorization_code', code: u.searchParams.get('code'), client_id: CID, client_secret: CSEC, redirect_uri: `${SITE}/api/callback` }) })).json();
      let p = t.user;
      if (!p && t.access_token) p = await (await fetch(ME_URL, { headers: { authorization: `Bearer ${t.access_token}` } })).json();
      p = p?.user || p; const id = p?.id || p?.sub; if (!id) return json(res, 401, { error: 'login failed' });
      res.setHeader('set-cookie', `arc=${enc({ id: String(id), name: p.display_name || p.username || p.name || 'User', avatar: p.avatar_url || p.avatar || null, exp: Date.now() + 7 * 864e5 })}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=604800`);
      res.statusCode = 302; res.setHeader('location', '/#/dashboard'); return res.end();
    }
    if (path[0] === 'logout') { res.setHeader('set-cookie', 'arc=; Path=/; Max-Age=0'); return json(res, 200, { ok: true }); }
    if (path[0] === 'registry') { // public: real command list published by the bot
      const { rows } = await pool.query("SELECT value FROM arcane_dashboard_state WHERE key='registry'"); return json(res, 200, rows[0]?.value || []);
    }
    if (path[0] === 'stats') {
      res.setHeader('cache-control', 'public, s-maxage=30');
      const { rows } = await pool.query('SELECT count(*)::int AS servers, coalesce(sum(member_count),0)::int AS members FROM arcane_guilds'); return json(res, 200, rows[0]);
    }
    if (path[0] === 'discover') { // opt-in only: servers that switched Discover on in their dashboard
      const q = (new URL(req.url, 'http://x').searchParams.get('q') || '').slice(0, 60);
      const { rows } = await pool.query(`SELECT g.server_id, g.name, g.icon, g.member_count, s.config->'discover' AS d FROM arcane_guilds g JOIN arcane_guild_settings s USING (server_id)
        WHERE (s.config->'discover'->>'enabled') = 'true' AND ($1 = '' OR g.name ILIKE '%'||$1||'%' OR (s.config->'discover'->>'description') ILIKE '%'||$1||'%') ORDER BY g.member_count DESC NULLS LAST LIMIT 40`, [q]);
      return json(res, 200, rows);
    }
    if (path[0] === 'docs' || path[0] === 'changelog') { // public read, owner-only write
      const key = path[0];
      if (req.method === 'PUT') {
        if (!user || !OWNERS.includes(user.id)) return json(res, 403, { error: 'owner only' });
        const list = cleanList(key, (await body(req)).items);
        await pool.query(`INSERT INTO arcane_dashboard_state (key,value) VALUES ($1,$2::jsonb) ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value, updated_at=now()`, [key, JSON.stringify(list)]);
      }
      const { rows } = await pool.query('SELECT value FROM arcane_dashboard_state WHERE key=$1', [key]); return json(res, 200, rows[0]?.value || null);
    }
    if (path[0] === 'transcript' || path[0] === 'tickets') return ticketsApi({ req, res, path, user, pool, json, body, allowed }); // handles its own auth (member transcripts are public by token)
    if (!user) return json(res, 401, { error: 'not logged in' });
    if (path[0] === 'me') return json(res, 200, { ...user, owner: OWNERS.includes(user.id) });
    if (path[0] === 'guilds') {
      const { rows } = await pool.query('SELECT server_id,name,icon,member_count FROM arcane_guilds WHERE owner_id=$1 OR $2', [user.id, OWNERS.includes(user.id)]);
      return json(res, 200, rows);
    }
    if (path[0] === 'guild' && path[1]) {
      if (!(await allowed(user, path[1]))) return json(res, 403, { error: 'forbidden' });
      if (path[2] === 'action') { // jobs for the bot (picked up on its 15s sync)
        await pool.query(`CREATE TABLE IF NOT EXISTS arcane_actions (id bigserial PRIMARY KEY, server_id text NOT NULL, type text NOT NULL, payload jsonb NOT NULL DEFAULT '{}'::jsonb,
          status text NOT NULL DEFAULT 'pending', result text, created_at timestamptz NOT NULL DEFAULT now(), done_at timestamptz)`);
        if (req.method === 'POST') {
          const b = await body(req);
          if (b.type !== 'verify_panel') return json(res, 400, { error: 'unknown action' });
          const channel = str(b.channel, 64);
          if (!channel) return json(res, 400, { error: 'channel required' });
          const busy = await pool.query("SELECT 1 FROM arcane_actions WHERE server_id=$1 AND type=$2 AND status IN ('pending','running') AND created_at > now() - interval '10 minutes'", [path[1], b.type]);
          if (busy.rowCount) return json(res, 429, { error: 'A panel is already waiting to be posted' });
          const { rows } = await pool.query('INSERT INTO arcane_actions (server_id,type,payload) VALUES ($1,$2,$3::jsonb) RETURNING id', [path[1], b.type, JSON.stringify({ channel })]);
          return json(res, 200, { id: String(rows[0].id), status: 'pending' });
        }
        const { rows } = await pool.query('SELECT id::text, status, result FROM arcane_actions WHERE server_id=$1 AND id=$2', [path[1], /^\d+$/.test(path[3] || '') ? path[3] : '0']);
        return rows[0] ? json(res, 200, rows[0]) : json(res, 404, { error: 'not found' });
      }
      if (req.method === 'PUT') {
        const patch = sanitize((await body(req)).config);
        // Top-level keys replace, but `verify` is merged one level deep so the bot's panels + count survive a save.
        await pool.query(`INSERT INTO arcane_guild_settings (server_id,config) VALUES ($1,$2::jsonb)
          ON CONFLICT (server_id) DO UPDATE SET config =
            (arcane_guild_settings.config || (EXCLUDED.config - 'verify'))
            || CASE WHEN EXCLUDED.config ? 'verify'
                 THEN jsonb_build_object('verify', COALESCE(arcane_guild_settings.config->'verify', '{}'::jsonb) || (EXCLUDED.config->'verify'))
                 ELSE '{}'::jsonb END,
            updated_at=now()`, [path[1], JSON.stringify(patch)]);
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
