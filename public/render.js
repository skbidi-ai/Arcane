// ─────────────────────────────────────────────────────────────────────────────
//  render.js: ONE file shared by the dashboard (browser), the API (Vercel) and the bot (Node).
//  Message schema, validation, variables, defaults and the renderer live here, so the
//  dashboard preview is built by the exact same code that builds what members see.
//  Keep a byte-identical copy next to bot.js. No dependencies.
// ─────────────────────────────────────────────────────────────────────────────
export const PRIORITIES = ['low', 'normal', 'high', 'urgent'];
export const STYLES = ['primary', 'secondary', 'success', 'danger'];
export const pad = (n) => String(n).padStart(4, '0');
export const uid = () => Math.random().toString(36).slice(2, 8);
export const slug = (x = '') => String(x).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
export const fill = (s, v) => String(s ?? '').replace(/\{([\w.]+)\}/g, (m, k) => (v && v[k] != null ? String(v[k]) : m));

const clean = (x) => Object.fromEntries(Object.entries(x).filter(([, v]) => v !== undefined && v !== '' && !(Array.isArray(v) && !v.length)));
const https = (u) => (/^https:\/\/\S{3,}$/.test(String(u || '').trim()) ? String(u).trim().slice(0, 500) : undefined);
const hexInt = (c) => (/^#?[0-9a-f]{6}$/i.test(c || '') ? parseInt(String(c).replace('#', ''), 16) : undefined);

// ── database ────────────────────────────────────────────────────────────────
export const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS arcane_ticket_cfg (server_id text PRIMARY KEY, config jsonb NOT NULL DEFAULT '{}'::jsonb, updated_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS arcane_tickets (
  id bigserial PRIMARY KEY, server_id text NOT NULL, num int NOT NULL, type_id text, type_name text,
  user_id text NOT NULL, user_name text, user_avatar text, channel_id text,
  status text NOT NULL DEFAULT 'open', priority text NOT NULL DEFAULT 'normal',
  claimed_by text, claimed_name text, reason text, answers jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(), closed_at timestamptz, closed_by text, close_reason text,
  last_activity timestamptz NOT NULL DEFAULT now(), warned boolean NOT NULL DEFAULT false,
  rating int, feedback text, staff_token text, member_token text, UNIQUE (server_id, num));
CREATE INDEX IF NOT EXISTS arcane_tickets_srv ON arcane_tickets (server_id, status);
CREATE INDEX IF NOT EXISTS arcane_tickets_usr ON arcane_tickets (user_id, status);
CREATE INDEX IF NOT EXISTS arcane_tickets_tok_s ON arcane_tickets (staff_token);
CREATE INDEX IF NOT EXISTS arcane_tickets_tok_m ON arcane_tickets (member_token);
CREATE TABLE IF NOT EXISTS arcane_ticket_msgs (
  id bigserial PRIMARY KEY, ticket_id bigint NOT NULL, side text NOT NULL, author_id text, author_name text, author_avatar text,
  content text, attachments jsonb NOT NULL DEFAULT '[]'::jsonb, embeds jsonb NOT NULL DEFAULT '[]'::jsonb, created_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX IF NOT EXISTS arcane_ticket_msgs_t ON arcane_ticket_msgs (ticket_id, id);
CREATE TABLE IF NOT EXISTS arcane_actions (id bigserial PRIMARY KEY, server_id text NOT NULL, type text NOT NULL, payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending', result text, created_at timestamptz NOT NULL DEFAULT now(), done_at timestamptz);
`;

// ── buttons the builder can offer ───────────────────────────────────────────
export const ACTIONS = {
  link: 'Open a link', claim: 'Claim ticket', unclaim: 'Unclaim ticket', close: 'Close ticket', reopen: 'Reopen ticket', priority: 'Change priority',
  rate1: 'Rate 1 star', rate2: 'Rate 2 stars', rate3: 'Rate 3 stars', rate4: 'Rate 4 stars', rate5: 'Rate 5 stars',
};

// ── variables ───────────────────────────────────────────────────────────────
export const VARIABLES = [
  ['{user}', 'Mention the member'], ['{user.name}', 'Member name'], ['{user.id}', 'Member ID'], ['{user.avatar}', 'Member avatar URL'],
  ['{server}', 'Server name'], ['{server.icon}', 'Server icon URL'], ['{memberCount}', 'Member count'],
  ['{ticket.id}', 'Number, like 0042'], ['{ticket.type}', 'Ticket type'], ['{ticket.reason}', 'First answer'], ['{ticket.priority}', 'Priority'],
  ['{ticket.claimedBy}', 'Who claimed it'], ['{ticket.channel}', 'Staff channel'], ['{staff}', 'Staff member'], ['{staffRoles}', 'Pings the staff roles'],
  ['{closeReason}', 'Close reason'], ['{transcript.url}', 'Transcript link'], ['{answers}', 'All answers'], ['{answers.name}', 'One answer, by its variable name'],
  ['{rating}', 'Stars given'], ['{feedback}', 'Feedback comment'], ['{date}', 'Today’s date'],
];

export function sampleVars() {
  return {
    user: '@Member', 'user.name': 'Member', 'user.id': '1234', 'user.avatar': '', server: 'Your Server', 'server.icon': '', memberCount: '1,204',
    'ticket.id': '0042', 'ticket.type': 'Support', 'ticket.reason': 'I need help with setup', 'ticket.priority': 'Normal', 'ticket.claimedBy': '@YourMod', 'ticket.channel': '#ticket-0042',
    staff: '@YourMod', staffRoles: '@Staff', closeReason: 'Resolved', 'transcript.url': 'https://example.com/transcript', answers: '**What do you need help with?**\nI need help with setup',
    rating: '⭐⭐⭐⭐⭐', feedback: 'Fast and friendly!', date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    message: 'Hey! Could you send a screenshot of the error?', 'author.name': 'YourMod', 'author.avatar': '', attachments: '', 'attachment.image': '',
    closeIn: '24h', limit: '1', cooldown: '10 minutes', 'question.index': '1', 'question.total': '2', 'question.label': 'What do you need help with?',
    'question.placeholder': 'Describe the problem', 'question.hint': 'Required · reply in this DM',
  };
}

// ── defaults ────────────────────────────────────────────────────────────────
const E = (o = {}) => ({ title: '', url: '', description: '', color: '#74c9f4', author: { name: '', icon: '', url: '' }, thumbnail: '', image: '', footer: { text: '', icon: '' }, timestamp: false, fields: [], ...o });
export const newEmbed = () => E({ title: 'New embed', description: 'Write something…' });
export const newButton = (action = 'link') => ({ label: 'Button', emoji: '', style: action === 'link' ? 'secondary' : 'primary', action, url: '', disabled: false });
const B = (label, emoji, style, action, url = '') => ({ label, emoji, style, action, url, disabled: false });
const F = (name, value, inline = true) => ({ name, value, inline });
const M = (content, embeds, rows = []) => ({ content, embeds, rows });
const RED = '#e74c3c', GREEN = '#2ecc71', GOLD = '#f5b942';

export const DEFAULTS = {
  panel: M('', [E({ title: '🎫 Support', description: 'Need a hand? Pick a category below and a private ticket opens for you.\n\nOur team replies as soon as they can.', thumbnail: '{server.icon}', footer: { text: '{server} Support', icon: '{server.icon}' } })]),
  confirm: M('', [E({ color: GREEN, title: '✅ Ticket #{ticket.id} opened', description: 'Check your **DMs**. I sent you a message so we can continue there.' })]),
  question: M('', [E({ title: 'Question {question.index} of {question.total}', description: '**{question.label}**\n{question.placeholder}', footer: { text: '{question.hint}', icon: '' } })]),
  dm: M('', [E({ title: '🎫 Ticket #{ticket.id} · {ticket.type}', description: 'Hi **{user.name}**, thanks for reaching out to **{server}**.\nA staff member will be with you shortly. Reply here and I will pass it on.', fields: [F('Priority', '{ticket.priority}'), F('Claimed by', '{ticket.claimedBy}')], footer: { text: 'Reply in this DM to talk to staff', icon: '' } })]),
  staff: M('{staffRoles}', [E({ title: '🎫 Ticket #{ticket.id} · {ticket.type}', description: '{user} opened a ticket.\n\n{answers}', thumbnail: '{user.avatar}', fields: [F('Member', '{user.name}'), F('Priority', '{ticket.priority}'), F('Claimed by', '{ticket.claimedBy}')], footer: { text: 'Start a message with // to keep it internal', icon: '' } })],
    [[B('Claim', '🙋', 'success', 'claim'), B('Close', '🔒', 'danger', 'close'), B('Priority', '🚩', 'secondary', 'priority')]]),
  claimed: M('', [E({ color: GOLD, title: '🙋 Ticket claimed', description: '{staff} is now handling ticket **#{ticket.id}**.' })]),
  close: M('', [E({ color: RED, title: '🔒 Ticket #{ticket.id} closed', description: 'Closed by {staff}.\n**Reason:** {closeReason}' })]),
  reopen: M('', [E({ color: GREEN, title: '🔓 Ticket #{ticket.id} reopened', description: '{staff} reopened this ticket. Reply here to continue.' })]),
  transcriptDm: M('', [E({ title: '📄 Your transcript', description: 'A copy of ticket **#{ticket.id}** is ready.' })], [[B('View transcript', '📄', 'secondary', 'link', '{transcript.url}')]]),
  inactivity: M('', [E({ color: GOLD, title: '⏰ Still need help?', description: 'Ticket **#{ticket.id}** has been quiet for a while. It closes in about **{closeIn}** unless someone replies.' })]),
  rating: M('', [E({ color: GOLD, title: '⭐ How did we do?', description: 'Rate your support on ticket **#{ticket.id}**.' })],
    [[1, 2, 3, 4, 5].map((n) => B(String(n), '⭐', 'secondary', `rate${n}`))]),
  thanks: M('', [E({ color: GREEN, title: '💙 Thank you!', description: 'You rated ticket **#{ticket.id}** {rating}.\nWant to add a comment? Just reply here.' })]),
  relayStaff: M('', [E({ description: '{message}\n{attachments}', author: { name: '{author.name}', icon: '{author.avatar}', url: '' }, image: '{attachment.image}', footer: { text: 'Staff · Ticket #{ticket.id}', icon: '' }, timestamp: true })]),
  relayMember: M('', [E({ color: GREEN, description: '{message}\n{attachments}', author: { name: '{author.name}', icon: '{author.avatar}', url: '' }, image: '{attachment.image}', footer: { text: 'Member · Ticket #{ticket.id}', icon: '' }, timestamp: true })]),
  errLimit: M('', [E({ color: RED, title: '❌ Ticket limit reached', description: 'You already have **{limit}** open ticket(s). Close one before opening another.' })]),
  errBlacklist: M('', [E({ color: RED, title: '🚫 You can’t open tickets', description: 'You are blocked from opening tickets in **{server}**.' })]),
  errCooldown: M('', [E({ color: RED, title: '⏳ Slow down', description: 'You can open another ticket in **{cooldown}**.' })]),
  errPerm: M('', [E({ color: RED, title: '🔒 No permission', description: 'Only staff can do that.' })]),
  errDm: M('', [E({ color: RED, title: '📪 I can’t DM you', description: 'Turn on direct messages from server members, then try again.' })]),
};

const A_LINK = ['link'], A_STAFF = ['link', 'claim', 'unclaim', 'close', 'priority'], A_RATE = ['link', 'rate1', 'rate2', 'rate3', 'rate4', 'rate5'];
export const MESSAGE_META = {
  panel: { g: 'Opening', t: 'Panel message', d: 'Posted in your panel channel. Buttons for your ticket types are added automatically.', a: A_LINK },
  confirm: { g: 'Opening', t: 'Ticket opened (confirmation)', d: 'Only the member sees this, in the panel channel.', a: A_LINK },
  question: { g: 'Opening', t: 'Custom question (DM)', d: 'Sent in DMs for each custom question.', a: A_LINK, x: ['{question.index}', '{question.total}', '{question.label}', '{question.placeholder}', '{question.hint}'] },
  dm: { g: 'Opening', t: 'Member welcome (DM)', d: 'DM sent to the member when the ticket opens.', a: A_LINK },
  staff: { g: 'Opening', t: 'Staff channel opening message', d: 'First message in the private staff channel.', a: A_STAFF },
  claimed: { g: 'Handling', t: 'Ticket claimed', d: 'Posted in the channel and sent to the member.', a: A_LINK },
  relayStaff: { g: 'Handling', t: 'Staff reply (shown to member)', d: 'Wraps every staff message relayed to the member’s DM.', a: A_LINK, x: ['{message}', '{author.name}', '{author.avatar}', '{attachments}', '{attachment.image}'] },
  relayMember: { g: 'Handling', t: 'Member reply (shown to staff)', d: 'Wraps every member message relayed to the staff channel.', a: A_LINK, x: ['{message}', '{author.name}', '{author.avatar}', '{attachments}', '{attachment.image}'] },
  inactivity: { g: 'Handling', t: 'Inactivity warning', d: 'Sent before a quiet ticket closes automatically.', a: A_LINK, x: ['{closeIn}'] },
  close: { g: 'Closing', t: 'Ticket closed', d: 'Sent to the member and posted in the channel and log.', a: A_LINK },
  reopen: { g: 'Closing', t: 'Ticket reopened', d: 'Sent to the member and posted in the channel.', a: A_LINK },
  transcriptDm: { g: 'Closing', t: 'Transcript DM', d: 'The member’s copy of the transcript.', a: A_LINK },
  rating: { g: 'Closing', t: 'Rating prompt', d: 'Sent after closing when feedback is on. Keep the star buttons.', a: A_RATE },
  thanks: { g: 'Closing', t: 'Rating thanks', d: 'Replaces the rating prompt after a click.', a: A_LINK },
  errLimit: { g: 'Errors', t: 'Limit reached', d: 'Too many open tickets.', a: A_LINK, x: ['{limit}'] },
  errBlacklist: { g: 'Errors', t: 'Blocked member', d: 'Member is on the blacklist.', a: A_LINK },
  errCooldown: { g: 'Errors', t: 'Cooldown', d: 'Member opened a ticket too recently.', a: A_LINK, x: ['{cooldown}'] },
  errPerm: { g: 'Errors', t: 'Missing permission', d: 'Someone who isn’t staff used a staff tool.', a: A_LINK },
  errDm: { g: 'Errors', t: 'DMs closed', d: 'The bot could not DM the member.', a: A_LINK },
};
export const OVERRIDABLE = ['dm', 'staff', 'confirm'];

// ── validation ──────────────────────────────────────────────────────────────
const S = (v, n, errs, label) => { v = v == null ? '' : String(v); if (v.length > n) errs.push(`${label} is ${v.length}/${n} characters`); return v.slice(0, n); };
export function validateMessage(m, label = 'Message') {
  const errs = []; m = m && typeof m === 'object' ? m : {};
  const v = { content: S(m.content, 2000, errs, `${label}: content`), embeds: [], rows: [] };
  let total = 0;
  const embs = Array.isArray(m.embeds) ? m.embeds : [];
  if (embs.length > 5) errs.push(`${label}: at most 5 embeds`);
  embs.slice(0, 5).forEach((e, i) => {
    const L = `${label}: embed ${i + 1}`; e = e && typeof e === 'object' ? e : {};
    const au = e.author || {}, ft = e.footer || {};
    const o = E({
      title: S(e.title, 256, errs, `${L} title`), url: S(e.url, 500, errs, `${L} URL`), description: S(e.description, 4096, errs, `${L} description`),
      color: /^#?[0-9a-f]{6}$/i.test(e.color || '') ? '#' + String(e.color).replace('#', '').toLowerCase() : '',
      author: { name: S(au.name, 256, errs, `${L} author`), icon: S(au.icon, 500, errs, `${L} author icon`), url: S(au.url, 500, errs, `${L} author URL`) },
      thumbnail: S(e.thumbnail, 500, errs, `${L} thumbnail`), image: S(e.image, 500, errs, `${L} image`),
      footer: { text: S(ft.text, 2048, errs, `${L} footer`), icon: S(ft.icon, 500, errs, `${L} footer icon`) }, timestamp: !!e.timestamp, fields: [],
    });
    const fs = Array.isArray(e.fields) ? e.fields : [];
    if (fs.length > 10) errs.push(`${L}: at most 10 fields`);
    fs.slice(0, 10).forEach((f, j) => { f = f || {}; o.fields.push({ name: S(f.name, 256, errs, `${L} field ${j + 1} name`), value: S(f.value, 1024, errs, `${L} field ${j + 1} value`), inline: !!f.inline }); });
    total += o.title.length + o.description.length + o.author.name.length + o.footer.text.length + o.fields.reduce((n, f) => n + f.name.length + f.value.length, 0);
    v.embeds.push(o);
  });
  if (total > 6000) errs.push(`${label}: embeds hold ${total}/6000 characters in total`);
  const rows = Array.isArray(m.rows) ? m.rows : [];
  if (rows.length > 5) errs.push(`${label}: at most 5 button rows`);
  rows.slice(0, 5).forEach((r, ri) => {
    r = Array.isArray(r) ? r : [];
    if (r.length > 5) errs.push(`${label}: row ${ri + 1} has more than 5 buttons`);
    v.rows.push(r.slice(0, 5).map((b, bi) => {
      b = b || {}; const bl = `${label}: row ${ri + 1} button ${bi + 1}`; const action = ACTIONS[b.action] ? b.action : 'link';
      const x = { label: S(b.label, 80, errs, `${bl} label`), emoji: S(b.emoji, 16, errs, `${bl} emoji`), style: STYLES.includes(b.style) ? b.style : 'secondary', action, url: S(b.url, 500, errs, `${bl} URL`), disabled: !!b.disabled };
      if (!x.label.trim() && !x.emoji.trim()) errs.push(`${bl} needs a label or an emoji`);
      if (action === 'link' && x.url && !/^(https:\/\/|\{)/.test(x.url)) errs.push(`${bl}: links must start with https://`);
      return x;
    }));
  });
  if (!v.content.trim() && !v.embeds.length && !v.rows.some((r) => r.length)) errs.push(`${label} is empty`);
  return { ok: !errs.length, errors: errs, value: v };
}

// Whole config: used by the API on save and by the bot on load. Always returns a usable config.
export function normalizeConfig(raw) {
  raw = raw && typeof raw === 'object' ? raw : {}; const errors = [];
  const num = (v, d, lo, hi) => { v = Number(v); return Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : d; };
  const str = (v, n = 64) => (typeof v === 'string' ? v.slice(0, n) : '');
  const ids = (a, n) => (Array.isArray(a) ? [...new Set(a.map((x) => String(x).trim().slice(0, 64)).filter(Boolean))].slice(0, n) : []);
  const s = raw.settings || {}, ac = s.autoClose || {};
  const settings = {
    enabled: s.enabled !== false, logChannel: str(s.logChannel), categoryId: str(s.categoryId), staffRoles: ids(s.staffRoles, 25),
    maxOpen: Math.floor(num(s.maxOpen, 0, 0, 50)), cooldownMin: Math.floor(num(s.cooldownMin, 0, 0, 10080)), blacklist: ids(s.blacklist, 500),
    feedback: s.feedback !== false, dmTranscript: s.dmTranscript !== false, deleteDelay: Math.floor(num(s.deleteDelay, 10, -1, 3600)),
    autoClose: { enabled: !!ac.enabled, hours: num(ac.hours, 72, 1, 720), warnHours: num(ac.warnHours, 24, 1, 240) },
  };
  const rm = raw.messages || {}, messages = {};
  for (const k of Object.keys(DEFAULTS)) {
    if (rm[k]) { const r = validateMessage(rm[k], MESSAGE_META[k].t); errors.push(...r.errors); messages[k] = r.value; }
    else messages[k] = structuredCloneSafe(DEFAULTS[k]);
  }
  const seen = new Set();
  const types = (Array.isArray(raw.types) ? raw.types : []).slice(0, 25).map((t, i) => {
    t = t || {}; const name = str(t.name, 40).trim() || `Ticket type ${i + 1}`;
    let id = slug(str(t.id, 40)) || slug(name) || uid(); if (seen.has(id)) id += '-' + uid(); seen.add(id);
    const seenQ = new Set();
    const questions = (Array.isArray(t.questions) ? t.questions : []).slice(0, 5).map((x, j) => {
      x = x || {}; let qid = slug(str(x.id, 30)).replace(/-/g, '_') || `q${j + 1}`; while (seenQ.has(qid)) qid += '_' + j; seenQ.add(qid);
      const min = Math.floor(num(x.min, 0, 0, 4000)), max = Math.floor(num(x.max, 1000, 1, 4000));
      return { id: qid, label: str(x.label, 200).trim() || `Question ${j + 1}`, placeholder: str(x.placeholder, 100), required: x.required !== false, long: !!x.long, min: Math.min(min, max), max };
    });
    const msgs = {};
    for (const k of OVERRIDABLE) if (t.msgs && t.msgs[k]) { const r = validateMessage(t.msgs[k], `${name} · ${MESSAGE_META[k].t}`); errors.push(...r.errors); msgs[k] = r.value; }
    return {
      id, name, label: str(t.label, 80).trim() || name, emoji: str(t.emoji, 16).trim(), style: STYLES.includes(t.style) ? t.style : 'primary', description: str(t.description, 100),
      staffRoles: ids(t.staffRoles, 25), categoryId: str(t.categoryId), nameTemplate: str(t.nameTemplate, 100).trim() || 'ticket-{ticket.id}-{user.name}',
      assign: t.assign === 'roundrobin' ? 'roundrobin' : 'none', maxOpen: Math.floor(num(t.maxOpen, 0, 0, 50)), questions, msgs,
    };
  });
  const seenP = new Set();
  const panels = (Array.isArray(raw.panels) ? raw.panels : []).slice(0, 10).map((p, i) => {
    p = p || {}; let id = slug(str(p.id, 30)) || uid(); if (seenP.has(id)) id += uid(); seenP.add(id);
    const name = str(p.name, 60).trim() || `Panel ${i + 1}`; let message = structuredCloneSafe(DEFAULTS.panel);
    if (p.message) { const r = validateMessage(p.message, `Panel “${name}”`); errors.push(...r.errors); message = r.value; }
    return { id, name, channel: str(p.channel), typeIds: ids(p.typeIds, 25).filter((x) => types.some((t) => t.id === x)), message, messageId: str(p.messageId), postedChannel: str(p.postedChannel) };
  });
  if (!errors.length) for (const t of types) if (!t.name) errors.push('Every ticket type needs a name');
  return { config: { settings, messages, types, panels }, errors };
}
const structuredCloneSafe = (o) => JSON.parse(JSON.stringify(o));
export const clone = structuredCloneSafe;

// ── renderer ────────────────────────────────────────────────────────────────
// renderMessage(msg, vars, { ref, panel: { id, types } }) → { content, embeds, components } in the exact shape the Yapper API takes.
export function renderMessage(m, vars = {}, o = {}) {
  m = m || {}; const f = (s) => fill(s, vars);
  const embeds = (m.embeds || []).slice(0, 5).map((e) => {
    const th = https(f(e.thumbnail)), im = https(f(e.image));
    return clean({
      title: f(e.title).slice(0, 256), url: https(f(e.url)), description: f(e.description).slice(0, 4096), color: hexInt(e.color),
      author: e.author?.name ? clean({ name: f(e.author.name).slice(0, 256), url: https(f(e.author.url)), icon_url: https(f(e.author.icon)) }) : undefined,
      footer: e.footer?.text ? clean({ text: f(e.footer.text).slice(0, 2048), icon_url: https(f(e.footer.icon)) }) : undefined,
      thumbnail: th ? { url: th } : undefined, image: im ? { url: im } : undefined,
      timestamp: e.timestamp ? new Date().toISOString() : undefined,
      fields: (e.fields || []).slice(0, 10).map((x) => ({ name: f(x.name).trim().slice(0, 256), value: f(x.value).trim().slice(0, 1024), inline: !!x.inline })).filter((x) => x.name && x.value),
    });
  }).filter((e) => Object.keys(e).some((k) => k !== 'color'));
  const btn = (b) => {
    const label = f(b.label).slice(0, 80), emoji = String(b.emoji || '').trim().slice(0, 16) || undefined;
    if (!label.trim() && !emoji) return null;
    if (b.action === 'link') { const url = https(f(b.url)); return url ? clean({ type: 'button', style: 'link', label, emoji, url }) : null; }
    const rate = /^rate([1-5])$/.exec(b.action || '');
    const custom_id = rate ? `tk:rate:${o.ref ?? 0}:${rate[1]}` : `tk:${b.action}:${o.ref ?? 0}`;
    return clean({ type: 'button', style: STYLES.includes(b.style) ? b.style : 'secondary', label, emoji, custom_id, disabled: b.disabled || undefined });
  };
  const rows = [];
  if (o.panel) {
    const bs = (o.panel.types || []).map((t) => clean({ type: 'button', style: STYLES.includes(t.style) ? t.style : 'primary', label: f(t.label || t.name).slice(0, 80), emoji: t.emoji || undefined, custom_id: `tk:open:${o.panel.id}:${t.id}` }));
    for (let i = 0; i < bs.length && rows.length < 5; i += 5) rows.push({ type: 'action_row', components: bs.slice(i, i + 5) });
  }
  for (const r of m.rows || []) { const c = (r || []).map(btn).filter(Boolean); if (c.length && rows.length < 5) rows.push({ type: 'action_row', components: c }); }
  return { content: f(m.content).slice(0, 2000), embeds, components: rows };
}
