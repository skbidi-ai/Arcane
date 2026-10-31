// lib/tickets-api.js: every /api/tickets/* and /api/transcript/* route. Called from api/index.js.
import { SCHEMA_SQL, normalizeConfig } from './render.js';

let ready = null;
const ensure = (pool) => (ready ||= pool.query(SCHEMA_SQL).catch((e) => { ready = null; throw e; }));
const OPS = ['close', 'reopen', 'claim', 'unclaim', 'priority'];
const LIST_COLS = 'id,num,type_id,type_name,user_id,user_name,user_avatar,channel_id,status,priority,claimed_by,claimed_name,created_at,closed_at,last_activity,rating,reason';

export async function ticketsApi({ req, res, path, user, pool, json, body, allowed }) {
  await ensure(pool);
  const sp = new URL(req.url, 'http://x').searchParams;

  // ── transcripts: member copy is public by its token, staff copy needs a login + access to the server ──
  if (path[0] === 'transcript') {
    const tok = String(path[1] || '').slice(0, 80);
    const { rows: [t] } = await pool.query('SELECT * FROM arcane_tickets WHERE staff_token=$1 OR member_token=$1', [tok]);
    if (!t) return json(res, 404, { error: 'not found' });
    const staff = tok === t.staff_token;
    if (staff) {
      if (!user) return json(res, 401, { error: 'login required' });
      if (!(await allowed(user, t.server_id))) return json(res, 403, { error: 'forbidden' });
    }
    const [m, g] = await Promise.all([
      pool.query(`SELECT side,author_id,author_name,author_avatar,content,attachments,embeds,created_at FROM arcane_ticket_msgs WHERE ticket_id=$1 ${staff ? '' : "AND side <> 'note'"} ORDER BY id LIMIT 500`, [t.id]),
      pool.query('SELECT name,icon FROM arcane_guilds WHERE server_id=$1', [t.server_id]),
    ]);
    res.setHeader('cache-control', 'private, no-store');
    return json(res, 200, {
      staff, server: g.rows[0] || {}, messages: m.rows,
      ticket: { num: t.num, type: t.type_name, user_name: t.user_name, user_avatar: t.user_avatar, status: t.status, priority: t.priority, claimed_name: t.claimed_name, created_at: t.created_at, closed_at: t.closed_at, user_id: t.user_id, channel_id: t.channel_id },
    });
  }

  if (!user) return json(res, 401, { error: 'not logged in' });
  const gid = String(path[1] || '');
  if (!gid || !(await allowed(user, gid))) return json(res, 403, { error: 'forbidden' });

  switch (path[2]) {
    case 'config': {
      const old = (await pool.query('SELECT config FROM arcane_ticket_cfg WHERE server_id=$1', [gid])).rows[0]?.config || {};
      if (req.method === 'PUT') {
        const { config, errors } = normalizeConfig((await body(req)).config);
        if (errors.length) return json(res, 400, { error: 'validation', errors: errors.slice(0, 20) });
        // messageId + postedChannel belong to the bot; never let a stale browser tab overwrite them.
        const prev = new Map((old.panels || []).map((p) => [p.id, p]));
        for (const p of config.panels) { const o = prev.get(p.id); p.messageId = o?.messageId || ''; p.postedChannel = o?.postedChannel || ''; }
        await pool.query(`INSERT INTO arcane_ticket_cfg (server_id,config) VALUES ($1,$2::jsonb) ON CONFLICT (server_id) DO UPDATE SET config=EXCLUDED.config, updated_at=now()`, [gid, JSON.stringify(config)]);
        return json(res, 200, { config });
      }
      const g = await pool.query('SELECT name,icon,channels,roles FROM arcane_guilds WHERE server_id=$1', [gid]);
      return json(res, 200, { config: normalizeConfig(old).config, guild: g.rows[0] || {} });
    }

    case 'action': {
      if (req.method === 'POST') {
        const b = await body(req); let payload;
        if (b.type === 'ticket_panel') payload = { panelId: String(b.panelId || '').slice(0, 40) };
        else if (b.type === 'ticket_test') payload = { message: b.message, panelId: String(b.panelId || '').slice(0, 40), userId: user.id };
        else if (b.type === 'ticket_op' && OPS.includes(b.op) && /^\d+$/.test(String(b.ticketId))) payload = { ticketId: String(b.ticketId), op: b.op, value: String(b.value || '').slice(0, 300), by: user.id };
        else return json(res, 400, { error: 'unknown action' });
        const busy = await pool.query("SELECT count(*)::int n FROM arcane_actions WHERE server_id=$1 AND type LIKE 'ticket_%' AND status IN ('pending','running') AND created_at > now() - interval '10 minutes'", [gid]);
        if (busy.rows[0].n >= 8) return json(res, 429, { error: 'Too many actions are waiting. Try again in a moment.' });
        const { rows } = await pool.query('INSERT INTO arcane_actions (server_id,type,payload) VALUES ($1,$2,$3::jsonb) RETURNING id', [gid, b.type, JSON.stringify(payload)]);
        return json(res, 200, { id: String(rows[0].id), status: 'pending' });
      }
      const { rows } = await pool.query('SELECT id::text, status, result FROM arcane_actions WHERE server_id=$1 AND id=$2', [gid, /^\d+$/.test(path[3] || '') ? path[3] : '0']);
      return rows[0] ? json(res, 200, rows[0]) : json(res, 404, { error: 'not found' });
    }

    case 'list': {
      const w = ['server_id=$1'], p = [gid], add = (sql, v) => { p.push(v); w.push(sql.replace('?', '$' + p.length)); };
      const st = sp.get('status'); if (['open', 'closed'].includes(st)) add('status=?', st);
      if (sp.get('type')) add('type_id=?', sp.get('type').slice(0, 40));
      const pr = sp.get('priority'); if (['low', 'normal', 'high', 'urgent'].includes(pr)) add('priority=?', pr);
      const cl = sp.get('claimed'); if (cl === 'none') w.push('claimed_by IS NULL'); else if (cl === 'me') add('claimed_by=?', user.id);
      const s = (sp.get('q') || '').trim().slice(0, 60);
      if (s) { p.push('%' + s.replace(/[%_]/g, '') + '%'); const n = p.length; w.push(`(user_name ILIKE $${n} OR reason ILIKE $${n} OR num::text = '${s.replace(/\D/g, '').slice(0, 9) || '-1'}')`); }
      const { rows } = await pool.query(`SELECT ${LIST_COLS} FROM arcane_tickets WHERE ${w.join(' AND ')} ORDER BY created_at DESC LIMIT 100`, p);
      return json(res, 200, rows);
    }

    case 'ticket': {
      if (!/^\d+$/.test(path[3] || '')) return json(res, 404, { error: 'not found' });
      const { rows: [t] } = await pool.query('SELECT * FROM arcane_tickets WHERE server_id=$1 AND id=$2', [gid, path[3]]);
      if (!t) return json(res, 404, { error: 'not found' });
      const m = await pool.query('SELECT side,author_id,author_name,author_avatar,content,attachments,embeds,created_at FROM arcane_ticket_msgs WHERE ticket_id=$1 ORDER BY id LIMIT 500', [t.id]);
      const { member_token, ...rest } = t;
      return json(res, 200, { ticket: rest, messages: m.rows });
    }

    case 'stats': {
      const [k, types, series, ratings, fb, staff] = await Promise.all([
        pool.query(`SELECT count(*)::int total, count(*) FILTER (WHERE status='open')::int open, count(*) FILTER (WHERE created_at > now() - interval '7 days')::int week,
          avg(rating)::float avg_rating, count(rating)::int rated, avg(extract(epoch FROM closed_at - created_at)) FILTER (WHERE closed_at IS NOT NULL)::float avg_close FROM arcane_tickets WHERE server_id=$1`, [gid]),
        pool.query(`SELECT coalesce(type_name,'Unknown') name, count(*)::int n FROM arcane_tickets WHERE server_id=$1 GROUP BY 1 ORDER BY n DESC LIMIT 8`, [gid]),
        pool.query(`SELECT to_char(d,'Mon DD') day, count(t.id)::int n FROM generate_series(current_date-13, current_date, '1 day') d LEFT JOIN arcane_tickets t ON t.server_id=$1 AND t.created_at::date = d::date GROUP BY 1 ORDER BY d`, [gid]),
        pool.query('SELECT rating, count(*)::int n FROM arcane_tickets WHERE server_id=$1 AND rating IS NOT NULL GROUP BY 1 ORDER BY 1', [gid]),
        pool.query('SELECT num,user_name,rating,feedback FROM arcane_tickets WHERE server_id=$1 AND feedback IS NOT NULL ORDER BY closed_at DESC NULLS LAST LIMIT 8', [gid]),
        pool.query(`SELECT claimed_name name, count(*)::int n FROM arcane_tickets WHERE server_id=$1 AND claimed_name IS NOT NULL GROUP BY 1 ORDER BY n DESC LIMIT 5`, [gid]),
      ]);
      return json(res, 200, { kpi: k.rows[0], types: types.rows, series: series.rows, ratings: ratings.rows, feedback: fb.rows, staff: staff.rows });
    }
  }
  return json(res, 404, { error: 'not found' });
}
