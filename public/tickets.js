// public/tickets.js: the Tickets section of the Arcane dashboard. Loaded on demand with import('/tickets.js').
import { DEFAULTS, MESSAGE_META, ACTIONS, VARIABLES, PRIORITIES, STYLES, OVERRIDABLE, validateMessage, renderMessage, sampleVars, newEmbed, newButton, uid, clone, pad } from '/render.js';

let H, G, S;
const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const getP = (o, p) => String(p).split('.').reduce((a, k) => (a == null ? a : a[k]), o);
const setP = (o, p, v) => { const k = String(p).split('.'); const last = k.pop(); k.reduce((a, x) => a[x], o)[last] = v; };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const call = async (path, method = 'GET', body) => {
  const r = await fetch('/api/' + path, { method, headers: body ? { 'content-type': 'application/json' } : undefined, body: body ? JSON.stringify(body) : undefined });
  let data = null; try { data = await r.json(); } catch { /* no body */ }
  return { ok: r.ok, status: r.status, data };
};
const ago = (t) => { const s = (Date.now() - new Date(t)) / 1000; return s < 60 ? 'just now' : s < 3600 ? `${Math.floor(s / 60)}m ago` : s < 86400 ? `${Math.floor(s / 3600)}h ago` : `${Math.floor(s / 86400)}d ago`; };
const dur = (s) => (!s ? '—' : s < 3600 ? `${Math.round(s / 60)}m` : s < 86400 ? `${(s / 3600).toFixed(1)}h` : `${(s / 86400).toFixed(1)}d`);
const when = (t) => new Date(t).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });

// ── light markdown + embed/message HTML (shared by preview, drawer and transcripts) ──
const md = (s) => esc(s)
  .replace(/&lt;@&amp;[\w-]+&gt;/g, '<span class="mn">@role</span>').replace(/&lt;@!?[\w-]+&gt;/g, '<span class="mn">@user</span>').replace(/&lt;#[\w-]+&gt;/g, '<span class="mn">#channel</span>')
  .replace(/(^|\s)(@\w+)/g, '$1<span class="mn">$2</span>')
  .replace(/`([^`\n]+)`/g, '<code>$1</code>').replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>').replace(/(^|[^*\w])\*([^*\n]+)\*/g, '$1<i>$2</i>')
  .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>').replace(/\n/g, '<br>');
const img = (u, c = '') => (u ? `<img ${c ? `class="${c}" ` : ''}src="${esc(u)}" alt="" onerror="this.remove()">` : '');
function embedHtml(e) {
  const col = e.color != null ? '#' + Number(e.color).toString(16).padStart(6, '0') : '#4f5b73';
  return `<div class="ye" style="--ec:${col}">${e.thumbnail ? img(e.thumbnail.url, 'tk-th') : ''}${e.author ? `<div class="tk-au">${img(e.author.icon_url)}<span>${esc(e.author.name)}</span></div>` : ''}
${e.title ? `<h4>${e.url ? `<a href="${esc(e.url)}" target="_blank" rel="noopener">${md(e.title)}</a>` : md(e.title)}</h4>` : ''}${e.description ? `<p>${md(e.description)}</p>` : ''}
${e.fields?.length ? `<div class="ef tk-ef">${e.fields.map((x) => `<div class="${x.inline ? '' : 'full'}"><b>${md(x.name)}</b><span>${md(x.value)}</span></div>`).join('')}</div>` : ''}
${e.image ? img(e.image.url, 'bn') : ''}${e.footer || e.timestamp ? `<small class="tk-ft">${img(e.footer?.icon_url)}${esc(e.footer?.text || '')}${e.timestamp ? `${e.footer ? ' · ' : ''}Today at 3:42 PM` : ''}</small>` : ''}</div>`;
}
const btnHtml = (b) => `<span class="tkb ${b.style}">${b.emoji ? esc(b.emoji) + ' ' : ''}${esc(b.label || '')}${b.style === 'link' ? ' ↗' : ''}</span>`;
const pvHtml = (r) => `<div class="yp"><div class="ym"><div class="ya">${H.LOGO}</div><div class="yb"><div class="yn">Arcane<i>BOT</i><time>Today at 3:42 PM</time></div>
${r.content ? `<div class="yt">${md(r.content)}</div>` : ''}${r.embeds.map(embedHtml).join('')}${r.components.map((row) => `<div class="vbtns">${row.components.map(btnHtml).join('')}</div>`).join('')}</div></div></div>`;

// ── styles ──────────────────────────────────────────────────────────────────
function css() {
  if ($('tkcss')) return;
  const s = document.createElement('style'); s.id = 'tkcss';
  s.textContent = `
.tk{display:grid;grid-template-columns:210px minmax(0,1fr);gap:26px;align-items:start}@media(max-width:860px){.tk{grid-template-columns:1fr}.tk-nav{flex-direction:row!important;overflow:auto;position:static!important}}
.tk-nav{position:sticky;top:92px;display:flex;flex-direction:column;gap:4px}.tk-nav a{display:flex;gap:10px;align-items:center;padding:11px 14px;border-radius:12px;color:var(--mu);font-weight:500;white-space:nowrap}.tk-nav a.on,.tk-nav a:hover{background:#12203a;color:var(--a)}
.tk-hd{display:flex;justify-content:space-between;gap:16px;align-items:flex-start;flex-wrap:wrap;margin-bottom:20px}.tk-hd h3{margin:0;font-size:28px;letter-spacing:-.01em}.tk-hd p{margin:6px 0 0;color:var(--mu);font-size:14.5px;max-width:560px}
.tk-card{background:var(--pn);border:1px solid var(--ln);border-radius:20px;padding:22px;margin-bottom:16px}.tk-card>h4{margin:0 0 14px;font-size:17px}
.tk-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:14px}
.tk-item{background:var(--pn);border:1px solid var(--ln);border-radius:18px;padding:18px;cursor:pointer;transition:border-color .15s}.tk-item:hover{border-color:#4aa7ee}.tk-item p{margin:6px 0 0;color:var(--mu);font-size:13.5px}.tk-it{display:flex;justify-content:space-between;gap:10px;align-items:center}
.tk-pill{font-size:12px;padding:2px 10px;border-radius:99px;border:1px solid var(--ln);color:var(--mu);white-space:nowrap}.tk-pill.ok{color:#5be39b;border-color:#5be39b44;background:#5be39b14}.tk-pill.warn{color:#f5d36b;border-color:#f5d36b40;background:#f5d36b12}.tk-pill.bad{color:#ef6b73;border-color:#ef6b7340;background:#ef6b7312}
.tk-empty{border:1px dashed #2a3d5c;border-radius:20px;padding:42px 24px;text-align:center}.tk-empty b{font-size:18px}.tk-empty p{color:var(--mu);margin:8px auto 18px;max-width:420px}
.tk-back{background:none;border:0;color:var(--mu);font:inherit;cursor:pointer;padding:0;margin-bottom:12px}.tk-back:hover{color:var(--a)}
.tk-split{display:grid;grid-template-columns:240px minmax(0,1fr);gap:20px;align-items:start}@media(max-width:1000px){.tk-split{grid-template-columns:1fr}}
.tk-list{display:flex;flex-direction:column;gap:6px}.tk-li{display:flex;justify-content:space-between;align-items:center;gap:8px;text-align:left;padding:11px 14px;border-radius:12px;border:1px solid transparent;background:none;color:var(--mu);font:500 14.5px Poppins;cursor:pointer}.tk-li:hover,.tk-li.on{background:#12203a;color:var(--tx);border-color:var(--ln)}.tk-li small{color:var(--mu);font-size:12px}.tk-gl{margin:14px 0 4px 6px;font-size:12px;color:var(--mu);font-weight:600}
.tkf{display:flex;flex-direction:column;gap:6px;margin:0 0 12px;min-width:0}.tkf>span{font-size:13px;color:#c3d3e4;display:flex;justify-content:space-between;gap:8px}.tkf>span small{color:var(--mu);font-size:12px}.tkf.em{width:74px;flex:none}
.cc{font-style:normal;color:var(--mu);font-size:12px}.cc.over{color:#ef6b73;font-weight:600}
.tk-g2,.tk-g3{display:grid;gap:0 14px}.tk-g2{grid-template-columns:repeat(auto-fit,minmax(220px,1fr))}.tk-g3{grid-template-columns:repeat(auto-fit,minmax(170px,1fr))}
.tk-chk{display:flex;gap:8px;align-items:center;color:#c3d3e4;font-size:13.5px;margin:2px 0 10px;cursor:pointer}.tk-chk input{width:auto;accent-color:var(--a)}
.tk-sec{display:flex;align-items:center;gap:10px;margin:20px 0 10px;padding-bottom:8px;border-bottom:1px solid var(--ln)}.tk-sec b{font-size:15px}.tk-sec span{color:var(--mu);font-size:13px;margin-right:auto}.tk-sec.s{margin-top:12px}
.tk-x{background:#0e1626;border:1px solid var(--ln);color:var(--mu);border-radius:99px;padding:3px 12px;font:500 12.5px Poppins;cursor:pointer}.tk-x:hover{color:var(--tx);border-color:var(--a)}
.tk-b{display:grid;grid-template-columns:minmax(0,1.05fr) minmax(0,.95fr);gap:22px;align-items:start}@media(max-width:1100px){.tk-b{grid-template-columns:1fr}}
.tk-pvw{position:sticky;top:92px}.tk-pvh{font-size:13px;color:var(--mu);margin-bottom:8px}.tk-err{margin-top:12px;color:#ef6b73;font-size:13px}.tk-err div{margin:3px 0}
.tk-tools{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px}
.tk-emb{border:1px solid var(--ln);border-radius:16px;padding:0 16px 6px;margin-bottom:12px;background:#09111f}.tk-emb summary{display:flex;justify-content:space-between;align-items:center;gap:10px;padding:13px 0;cursor:pointer;font-weight:500;font-size:14.5px;list-style:none}.tk-emb summary::-webkit-details-marker{display:none}
.tk-col{display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-bottom:12px}.tk-col>span{font-size:13px;color:#c3d3e4;width:48px}.tk-col input[type=color]{width:36px;height:36px;padding:0;border:0;background:none;cursor:pointer}.tk-hex{width:110px!important}
.tk-fl{display:grid;grid-template-columns:1fr 1.4fr auto auto;gap:0 10px;align-items:end;border-left:2px solid #1d2d49;padding-left:12px;margin-bottom:6px}@media(max-width:700px){.tk-fl{grid-template-columns:1fr}}
.tk-row{border:1px solid var(--ln);border-radius:16px;padding:12px 14px;margin-bottom:12px;background:#09111f}.tk-rh{display:flex;gap:8px;align-items:center;margin-bottom:10px}.tk-rh b{margin-right:auto;font-size:14px}
.tk-btn{border-top:1px solid var(--ln);padding-top:10px;margin-top:6px}.tk-bh{display:flex;gap:10px;align-items:flex-end;flex-wrap:wrap}.tk-bh .tkf{flex:1;min-width:110px}.tk-bh .tkf.em{flex:none}.tk-bh .tk-x{margin-bottom:12px}
.tk-vars{display:flex;gap:6px;flex-wrap:wrap;max-height:150px;overflow:auto;padding:2px}.tk-v{background:#12203a;border:1px solid var(--ln);color:var(--a);border-radius:8px;padding:3px 9px;font:12.5px ui-monospace,monospace;cursor:pointer}.tk-v:hover{border-color:var(--a)}
.tkb{display:inline-flex;gap:4px;align-items:center;padding:7px 16px;border-radius:8px;font:600 14px Poppins,sans-serif;color:#fff;margin:6px 8px 0 0}.tkb.primary{background:#5865f2}.tkb.secondary{background:#4e5058}.tkb.success{background:#23a55a}.tkb.danger{background:#da373c}.tkb.link{background:#4e5058}
.tk-th{float:right;width:64px;height:64px;border-radius:8px;object-fit:cover;margin:0 0 8px 12px}.tk-au{display:flex;gap:8px;align-items:center;font-size:13.5px;font-weight:600;margin-bottom:6px}.tk-au img{width:22px;height:22px;border-radius:50%}
.tk-ef{display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr))}.tk-ef .full{grid-column:1/-1}.tk-ft{display:flex!important;gap:6px;align-items:center}.tk-ft img{width:18px;height:18px;border-radius:50%}.ye h4 a{color:var(--a)}
.tk-bar{position:fixed;left:50%;bottom:22px;transform:translate(-50%,140%);z-index:30;display:flex;gap:14px;align-items:center;flex-wrap:wrap;justify-content:center;background:#0a1222;border:1px solid #2a3d5c;border-radius:18px;padding:12px 18px;box-shadow:0 12px 50px #000a;transition:transform .25s;max-width:92vw}.tk-bar.show{transform:translate(-50%,0)}#tk-errs{color:#ef6b73;font-size:13px;max-width:420px}
.tk-ov{position:fixed;inset:0;background:#000b;z-index:50;display:grid;place-items:center;padding:20px}.tk-md{background:var(--pn);border:1px solid var(--ln);border-radius:20px;padding:22px;width:min(640px,100%)}.tk-md h4{margin:0 0 12px}.tk-md textarea{font:13px ui-monospace,monospace}
.tk-flt{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;margin-bottom:14px}
.tk-tr{display:grid;grid-template-columns:70px minmax(0,1.6fr) 1fr 90px 90px 1fr;gap:12px;align-items:center;padding:13px 16px;border-bottom:1px solid var(--ln);cursor:pointer;font-size:14px}.tk-tr:hover{background:#0f1a2e}.tk-tr.h{cursor:default;color:var(--mu);font-size:12.5px}.tk-tr.h:hover{background:none}.tk-tr .u{display:flex;gap:10px;align-items:center;min-width:0}.tk-tr .u span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}@media(max-width:860px){.tk-tr{grid-template-columns:60px 1fr 80px}.tk-tr>:nth-child(n+4){display:none}}
.tk-av{width:30px;height:30px;border-radius:50%;background:#12203a;display:grid;place-items:center;font-size:13px;color:var(--a);overflow:hidden;flex:none}.tk-av img{width:100%;height:100%;object-fit:cover}
.tk-dr{position:fixed;top:0;right:0;bottom:0;width:min(560px,100vw);background:#080d19;border-left:1px solid var(--ln);z-index:40;display:flex;flex-direction:column;box-shadow:-20px 0 60px #000a}.tk-dh{padding:20px 22px;border-bottom:1px solid var(--ln)}.tk-dh h4{margin:0 0 6px;font-size:20px}.tk-db{flex:1;overflow:auto;padding:18px 22px}
.tk-m{display:flex;gap:12px;margin-bottom:16px}.tk-m .tk-av{width:38px;height:38px}.tk-mh{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:2px}.tk-mh b{font-size:14.5px}.tk-mh time{color:var(--mu);font-size:12px}.tk-mc{color:#dbe7f3;font-size:14.5px;overflow-wrap:anywhere}.tk-m>div:last-child{min-width:0;flex:1}
.tk-tag{font-size:10.5px;border-radius:5px;padding:1px 7px;font-weight:600;background:#8fdcff22;color:var(--a)}.tk-m.member .tk-tag{background:#2ecc7122;color:#5be39b}.tk-m.note{background:#f5b94212;border:1px dashed #f5b94255;border-radius:12px;padding:10px}.tk-m.note .tk-tag{background:#f5b94230;color:#f5d36b}.tk-m.bot .tk-tag{background:#5865f233;color:#a9b2ff}
.tk-sysm{text-align:center;color:var(--mu);font-size:12.5px;margin:12px 0}.tk-att{max-width:320px;max-height:220px;border-radius:10px;margin-top:8px;display:block}.tk-m .ye{max-width:560px}
.tk-kpi{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:12px;margin-bottom:16px}.tk-k{background:var(--pn);border:1px solid var(--ln);border-radius:18px;padding:16px 18px}.tk-k b{display:block;font-size:30px;line-height:1.2;letter-spacing:-.02em}.tk-k small{color:var(--mu)}
.tk-ch{display:flex;align-items:flex-end;gap:6px;height:150px;margin-top:6px}.tk-ch>div{flex:1;display:flex;flex-direction:column;justify-content:flex-end;align-items:center;gap:6px;height:100%;min-width:0}.tk-ch i{display:block;width:100%;border-radius:6px 6px 2px 2px;background:linear-gradient(180deg,#8fdcff,#4aa7ee);min-height:3px}.tk-ch small{font-size:10.5px;color:var(--mu);white-space:nowrap}
.tk-hb{display:grid;grid-template-columns:130px 1fr 40px;gap:12px;align-items:center;margin:9px 0;font-size:14px}.tk-hb>i{display:block;height:10px;border-radius:99px;background:#12203a;position:relative;overflow:hidden}.tk-hb>i>u{position:absolute;inset:0 auto 0 0;background:linear-gradient(90deg,#8fdcff,#4aa7ee);border-radius:99px}.tk-hb span:last-child{text-align:right;color:var(--mu)}
.tk-hero{border:1px solid var(--ln);border-radius:20px;padding:22px;margin-bottom:20px;background:var(--pn)}.tk-hero h3{margin:0 0 6px;font-size:26px}.tk-hero .tk-meta{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}.tk-tcw{max-width:860px;margin:0 auto}
.tk-note{background:#f5d36b12;border:1px solid #f5d36b40;color:#f5d36b;border-radius:14px;padding:12px 16px;font-size:14px;margin-bottom:16px}
`;
  document.head.appendChild(s);
}

// ── data ────────────────────────────────────────────────────────────────────
const TABS = [['panels', '🪧', 'Panels'], ['types', '🏷️', 'Ticket types'], ['messages', '💬', 'Messages'], ['settings', '⚙️', 'Settings'], ['active', '🎫', 'Tickets'], ['stats', '📊', 'Analytics']];
const newType = (name = 'Support') => ({ id: uid(), name, label: name, emoji: '🎫', style: 'primary', color: '', description: '', staffRoles: [], categoryId: '', nameTemplate: 'ticket-{ticket.id}-{user.name}', assign: 'none', maxOpen: 0, questions: [], msgs: {} });
const newQ = () => ({ id: 'q' + uid().slice(0, 3), label: 'What do you need help with?', placeholder: 'Describe the problem', required: true, long: true, min: 0, max: 1000 });
const newPanel = () => ({ id: uid(), name: 'Support panel', channel: '', typeIds: S.cfg.types.map((t) => t.id).slice(0, 5), message: clone(DEFAULTS.panel), messageId: '', postedChannel: '' });
const chans = () => (S.guild.channels || []).filter((c) => !c.type || c.type === 'text');
const cats = () => { const m = new Map(); (S.guild.channels || []).forEach((c) => c.category && m.set(c.category.id, c.category.name)); return [...m].map(([id, name]) => ({ id, name })); };
const roles = () => (S.guild.roles || []).filter((r) => r && r.id && r.name && r.name !== '@everyone');
const chName = (id) => (S.guild.channels || []).find((c) => c.id === id)?.name || 'unknown';
const rcol = (r) => { let x = r.color; if (typeof x === 'number' && x > 0) x = '#' + x.toString(16).padStart(6, '0'); return /^#[0-9a-f]{6}$/i.test(x || '') && x.toLowerCase() !== '#000000' ? x : '#6b7c93'; };
const opt = (list, v, ph) => `<option value="">${ph}</option>` + list.map((x) => `<option value="${esc(x.id)}" ${x.id === v ? 'selected' : ''}>${esc(x.name)}</option>`).join('');
const bfld = (path, label, val, o = {}) => `<label class="tkf"><span>${label}${o.hint ? `<small>${o.hint}</small>` : ''}</span><input data-b="${path}" ${o.num ? 'type="number" data-k="num"' : ''} ${o.min != null ? `min="${o.min}"` : ''} value="${esc(val)}" ${o.ph ? `placeholder="${esc(o.ph)}"` : ''}></label>`;
const bsel = (path, label, inner, o = {}) => `<label class="tkf"><span>${label}${o.hint ? `<small>${o.hint}</small>` : ''}</span><select data-b="${path}" ${o.re ? 'data-re="1"' : ''}>${inner}</select></label>`;
const chips = (path, list, sel, re) => `<div class="chips" style="margin:6px 0 12px">${list.map((x) => `<button type="button" class="chip mrb ${sel.includes(x.id) ? 'on' : ''}" data-act="tog" data-p="${path}" data-v="${esc(x.id)}" ${re ? 'data-re="1"' : ''}>${x.color !== undefined ? `<i class="rd" style="background:${rcol(x)}"></i>` : ''}${esc(x.label || x.name)}</button>`).join('') || '<span class="cap">Nothing to pick yet. Roles appear a few minutes after Arcane joins the server.</span>'}</div>`;
const row = (t, s, i) => `<div class="row"><div><b>${t}</b><small>${s}</small></div><div>${i}</div></div>`;
const sw = (p, v) => `<input type="checkbox" class="sw" data-b="${p}" ${v ? 'checked' : ''}>`;
const empty = (t, d, btn = '') => `<div class="tk-empty"><b>${t}</b><p>${d}</p>${btn}</div>`;

const dirty = () => { S.dirty = true; $('tk-bar')?.classList.add('show'); };
async function save() {
  const r = await call(`tickets/${G}/config`, 'PUT', { config: S.cfg });
  if (!r.ok) { $('tk-errs').innerHTML = (r.data?.errors || [r.data?.error || 'Could not save.']).slice(0, 4).map((e) => `<div>⚠ ${esc(e)}</div>`).join(''); $('tk-bar').classList.add('show'); return false; }
  S.cfg = r.data.config; S.dirty = false; $('tk-errs').innerHTML = ''; $('tk-bar').classList.remove('show'); H.toast('Saved'); renderTab(); return true;
}
async function runAction(body) {
  const r = await call(`tickets/${G}/action`, 'POST', body);
  if (!r.ok) { H.toast(r.data?.error || 'Could not queue that.'); return null; }
  H.toast('Queued. Arcane picks it up within 15 seconds.');
  for (let n = 0; n < 14; n++) {
    await sleep(3000); const s = await call(`tickets/${G}/action/${r.data.id}`);
    if (s.data?.status === 'done') return { ok: true, result: s.data.result };
    if (s.data?.status === 'error') return { ok: false, result: s.data.result };
  }
  return { ok: false, result: 'Arcane did not answer. Check that the bot is online.' };
}
async function reloadCfg() { const r = await call(`tickets/${G}/config`); if (r.ok) { S.cfg = r.data.config; S.guild = r.data.guild || S.guild; } }

// ── Message Builder ─────────────────────────────────────────────────────────
const PRESET = ['#74c9f4', '#8fdcff', '#2ecc71', '#f5b942', '#e74c3c', '#e91e8c', '#b79cff', '#4f5b73'];
const fld = (p, label, val, o = {}) => `<label class="tkf"><span>${label}${o.max ? `<em class="cc${String(val || '').length > o.max ? ' over' : ''}" data-max="${o.max}">${String(val || '').length}/${o.max}</em>` : ''}</span>${o.area
  ? `<textarea data-m="${p}" rows="${o.rows || 3}" ${o.ph ? `placeholder="${esc(o.ph)}"` : ''}>${esc(val)}</textarea>`
  : `<input data-m="${p}" value="${esc(val)}" ${o.ph ? `placeholder="${esc(o.ph)}"` : ''}>`}</label>`;
const embedForm = (e, i) => { const p = `embeds.${i}`; return `<details class="tk-emb" ${i === 0 ? 'open' : ''}><summary><span>Embed ${i + 1}${e.title ? ` · ${esc(e.title.slice(0, 28))}` : ''}</span><button type="button" class="tk-x" data-act="del-embed" data-i="${i}">Remove</button></summary>
<div class="tk-g2">${fld(p + '.title', 'Title', e.title, { max: 256 })}${fld(p + '.url', 'Title link', e.url, { ph: 'https://' })}</div>
${fld(p + '.description', 'Description', e.description, { area: 1, rows: 4, max: 4096 })}
<div class="tk-col"><span>Color</span><input type="color" data-m="${p}.color" value="${esc(e.color || '#74c9f4')}"><input class="tk-hex" data-m="${p}.color" value="${esc(e.color)}" placeholder="#74c9f4" maxlength="7"><div class="sws">${PRESET.map((c) => `<button type="button" class="swc" style="background:${c}" aria-label="${c}" data-act="color" data-p="${p}.color" data-c="${c}"></button>`).join('')}</div></div>
<div class="tk-g3">${fld(p + '.author.name', 'Author', e.author.name, { max: 256 })}${fld(p + '.author.icon', 'Author icon URL', e.author.icon)}${fld(p + '.author.url', 'Author link', e.author.url)}</div>
<div class="tk-g2">${fld(p + '.thumbnail', 'Thumbnail URL', e.thumbnail, { ph: 'https://… or {user.avatar}' })}${fld(p + '.image', 'Image URL', e.image, { ph: 'https://…' })}</div>
<div class="tk-g2">${fld(p + '.footer.text', 'Footer', e.footer.text, { max: 2048 })}${fld(p + '.footer.icon', 'Footer icon URL', e.footer.icon)}</div>
<label class="tk-chk"><input type="checkbox" data-m="${p}.timestamp" ${e.timestamp ? 'checked' : ''}> Show a timestamp</label>
<div class="tk-sec s"><b>Fields</b><span>${e.fields.length}/10</span><button type="button" class="tk-x" data-act="add-field" data-i="${i}">＋ Field</button></div>
${e.fields.map((f, j) => `<div class="tk-fl">${fld(`${p}.fields.${j}.name`, 'Name', f.name, { max: 256 })}${fld(`${p}.fields.${j}.value`, 'Value', f.value, { max: 1024 })}<label class="tk-chk" style="margin-bottom:12px"><input type="checkbox" data-m="${p}.fields.${j}.inline" ${f.inline ? 'checked' : ''}> Inline</label><button type="button" class="tk-x" style="margin-bottom:12px" data-act="del-field" data-i="${i}" data-j="${j}">✕</button></div>`).join('')}</details>`; };
const btnForm = (b, ri, bi, meta) => { const p = `rows.${ri}.${bi}`; const acts = [...new Set([...meta.a, b.action])]; return `<div class="tk-btn"><div class="tk-bh"><label class="tkf em"><span>Emoji</span><input data-m="${p}.emoji" value="${esc(b.emoji)}" maxlength="16"></label>${fld(p + '.label', 'Label', b.label, { max: 80 })}
<label class="tkf"><span>Style</span><select data-m="${p}.style" ${b.action === 'link' ? 'disabled' : ''}>${STYLES.map((s) => `<option ${b.style === s ? 'selected' : ''}>${s}</option>`).join('')}</select></label>
<label class="tkf"><span>When clicked</span><select data-m="${p}.action" data-re="1">${acts.map((a) => `<option value="${a}" ${b.action === a ? 'selected' : ''}>${ACTIONS[a]}</option>`).join('')}</select></label><button type="button" class="tk-x" data-act="del-btn" data-r="${ri}" data-b="${bi}">✕</button></div>
${b.action === 'link' ? fld(p + '.url', 'Link', b.url, { ph: 'https://… or {transcript.url}' }) : ''}<label class="tk-chk"><input type="checkbox" data-m="${p}.disabled" ${b.disabled ? 'checked' : ''}> Disabled</label></div>`; };
function bForm(msg, meta, b) {
  return `<div><div class="tk-tools"><button type="button" class="tk-x" data-act="b-import">Import JSON</button><button type="button" class="tk-x" data-act="b-export">Export JSON</button><button type="button" class="tk-x" data-act="b-reset">Reset to default</button><button type="button" class="tk-x" data-act="b-test">Send test to me</button></div>
${fld('content', 'Message text', msg.content, { area: 1, rows: 3, max: 2000, ph: 'Plain text above the embeds' })}
<div class="tk-sec"><b>Embeds</b><span>${msg.embeds.length}/5</span><button type="button" class="tk-x" data-act="add-embed">＋ Embed</button></div>${msg.embeds.map(embedForm).join('') || '<p class="cap">No embeds. Add one for a card-style message.</p>'}
<div class="tk-sec"><b>Buttons</b><span>${msg.rows.length}/5 rows${b.panel != null ? ' · ticket buttons come first' : ''}</span><button type="button" class="tk-x" data-act="add-row">＋ Row</button></div>
${msg.rows.map((r, ri) => `<div class="tk-row"><div class="tk-rh"><b>Row ${ri + 1} <small style="color:var(--mu);font-weight:400">${r.length}/5</small></b><button type="button" class="tk-x" data-act="add-btn" data-r="${ri}">＋ Button</button><button type="button" class="tk-x" data-act="del-row" data-r="${ri}">Remove row</button></div>${r.map((x, bi) => btnForm(x, ri, bi, meta)).join('')}</div>`).join('') || '<p class="cap">No extra buttons.</p>'}
<div class="tk-sec"><b>Variables</b><span>Click to insert</span></div><div class="tk-vars">${[...VARIABLES.map((v) => v[0]), ...(meta.x || [])].map((v) => `<button type="button" class="tk-v" data-act="var" data-v="${esc(v)}" title="${esc((VARIABLES.find((x) => x[0] === v) || [])[1] || '')}">${esc(v)}</button>`).join('')}</div><div class="tk-err"></div></div>
<div class="tk-pvw"><div class="tk-pvh">Live preview</div><div class="tk-pv"></div><p class="cap">Sample values stand in for variables. The bot renders from this same schema.</p></div>`;
}
function mountBuilder(el) {
  const msg = getP(S.cfg, el.dataset.bm), key = el.dataset.key;
  const b = el._b = { el, msg, key, meta: MESSAGE_META[key], panel: el.dataset.panel ?? null };
  b.draw = () => { const open = [...el.querySelectorAll('details')].map((d) => d.open); el.innerHTML = bForm(msg, b.meta, b); el.querySelectorAll('details').forEach((d, i) => { if (open[i] !== undefined) d.open = open[i]; }); refresh(b); };
  b.draw();
}
function refresh(b) {
  const types = b.panel != null ? S.cfg.panels[b.panel].typeIds.map((id) => S.cfg.types.find((t) => t.id === id)).filter(Boolean) : null;
  b.el.querySelector('.tk-pv').innerHTML = pvHtml(renderMessage(b.msg, sampleVars(), { ref: 'x', panel: types ? { id: 'p', types } : null }));
  const errs = validateMessage(b.msg, 'Message').errors;
  b.el.querySelector('.tk-err').innerHTML = errs.map((e) => `<div>⚠ ${esc(e)}</div>`).join('');
}
function overlay(title, body, wire) {
  const d = document.createElement('div'); d.className = 'tk-ov'; d.innerHTML = `<div class="tk-md"><h4>${title}</h4>${body}</div>`;
  d.addEventListener('click', (e) => { if (e.target === d || e.target.dataset.close) d.remove(); }); document.body.appendChild(d); wire?.(d); return d;
}
function builderAct(act, t, b) {
  const m = b.msg, i = +t.dataset.i, j = +t.dataset.j, r = +t.dataset.r;
  const redraw = () => { b.draw(); dirty(); };
  if (act === 'add-embed') { if (m.embeds.length < 5) m.embeds.push(newEmbed()); return redraw(); }
  if (act === 'del-embed') { m.embeds.splice(i, 1); return redraw(); }
  if (act === 'add-field') { if (m.embeds[i].fields.length < 10) m.embeds[i].fields.push({ name: 'Field', value: 'Value', inline: true }); return redraw(); }
  if (act === 'del-field') { m.embeds[i].fields.splice(j, 1); return redraw(); }
  if (act === 'add-row') { if (m.rows.length < 5) m.rows.push([newButton('link')]); return redraw(); }
  if (act === 'del-row') { m.rows.splice(r, 1); return redraw(); }
  if (act === 'add-btn') { if (m.rows[r].length < 5) m.rows[r].push(newButton('link')); return redraw(); }
  if (act === 'del-btn') { m.rows[r].splice(+t.dataset.b, 1); if (!m.rows[r].length) m.rows.splice(r, 1); return redraw(); }
  if (act === 'color') { setP(m, t.dataset.p, t.dataset.c); return redraw(); }
  if (act === 'var') {
    const f = lastF && b.el.contains(lastF) ? lastF : b.el.querySelector('textarea[data-m="content"]'); const v = t.dataset.v;
    const s = f.selectionStart ?? f.value.length; f.value = f.value.slice(0, s) + v + f.value.slice(f.selectionEnd ?? s);
    f.dispatchEvent(new Event('input', { bubbles: true })); f.focus(); f.setSelectionRange(s + v.length, s + v.length); return;
  }
  if (act === 'b-export') return overlay('Export message', `<textarea rows="16" readonly>${esc(JSON.stringify(m, null, 2))}</textarea><div class="acts"><button class="btn p s" data-copy>Copy</button><button class="btn s" data-close="1">Close</button></div>`, (d) => { d.querySelector('[data-copy]').onclick = () => { navigator.clipboard?.writeText(JSON.stringify(m, null, 2)); H.toast('Copied'); }; });
  if (act === 'b-import') return overlay('Import message', '<textarea rows="16" placeholder="Paste exported JSON"></textarea><div class="acts"><button class="btn p s" data-ok>Apply</button><button class="btn s" data-close="1">Cancel</button></div>', (d) => {
    d.querySelector('[data-ok]').onclick = () => { try { const v = validateMessage(JSON.parse(d.querySelector('textarea').value), 'Message').value; Object.keys(m).forEach((k) => delete m[k]); Object.assign(m, v); d.remove(); redraw(); H.toast('Imported'); } catch { H.toast('That is not valid message JSON.'); } };
  });
  if (act === 'b-reset') { if (!confirm('Reset this message to the default?')) return; Object.keys(m).forEach((k) => delete m[k]); Object.assign(m, clone(DEFAULTS[b.key])); return redraw(); }
  if (act === 'b-test') { H.toast('Sending a test…'); runAction({ type: 'ticket_test', message: m, panelId: b.panel != null ? S.cfg.panels[b.panel].id : '' }).then((x) => x && H.toast(x.ok ? 'Sent. Check your DMs.' : x.result)); }
}
let lastF = null;

// ── tabs ────────────────────────────────────────────────────────────────────
const VIEWS = {
  panels() {
    const i = S.sel.panel;
    if (i != null && S.cfg.panels[i]) {
      const p = S.cfg.panels[i];
      return `<button class="tk-back" data-act="back-panel">← All panels</button>
<div class="tk-hd"><div><h3>${esc(p.name)}</h3><p>${p.messageId ? 'Posted. Posting again edits the same message, so nothing is duplicated.' : 'Not posted yet. Choose a channel and ticket types, then post it.'}</p></div>
<div class="acts" style="margin:0"><button class="btn p" data-act="post-panel">Save &amp; post panel</button><button class="btn" data-act="dup-panel">Duplicate</button><button class="btn" data-act="del-panel">Delete</button></div></div>
<div class="tk-card"><div class="tk-g2">${bfld(`panels.${i}.name`, 'Panel name', p.name)}${bsel(`panels.${i}.channel`, 'Post in channel', opt(chans(), p.channel, 'Choose a channel'))}</div>
<div class="tkf"><span>Ticket types on this panel<small>Each one becomes a button</small></span>${S.cfg.types.length ? chips(`panels.${i}.typeIds`, S.cfg.types.map((t) => ({ id: t.id, label: `${t.emoji} ${t.name}` })), p.typeIds, true) : '<p class="cap">Create a ticket type first, in the Ticket types tab.</p>'}</div></div>
<div class="tk-card"><h4>Panel message</h4><div class="tk-b" data-bm="panels.${i}.message" data-key="panel" data-panel="${i}"></div></div>`;
    }
    return `<div class="tk-hd"><div><h3>Panels</h3><p>A panel is the message members click to open a ticket. Design it here, post it in any channel, and update it later without reposting.</p></div><button class="btn p" data-act="new-panel">＋ New panel</button></div>
${S.cfg.panels.length ? `<div class="tk-grid">${S.cfg.panels.map((p, n) => `<div class="tk-item" data-act="edit-panel" data-i="${n}"><div class="tk-it"><b>${esc(p.name)}</b><span class="tk-pill ${p.messageId ? 'ok' : ''}">${p.messageId ? 'Posted' : 'Not posted'}</span></div><p>${p.channel ? '#' + esc(chName(p.channel)) : 'No channel yet'} · ${p.typeIds.length} ticket type${p.typeIds.length === 1 ? '' : 's'}</p></div>`).join('')}</div>`
  : empty('No panels yet', 'Start with a ready-made setup: one Support ticket type with a question, and a panel to post.', '<button class="btn p" data-act="starter">Create a starter setup</button>')}`;
  },
  types() {
    const list = S.cfg.types, i = Math.min(S.sel.type, list.length - 1), t = list[i];
    const side = `<div class="tk-list">${list.map((x, n) => `<button class="tk-li ${n === i ? 'on' : ''}" data-act="pick-type" data-i="${n}"><span>${esc(x.emoji)} ${esc(x.name)}</span><small>${x.questions.length}q</small></button>`).join('')}<button class="tk-li" data-act="new-type" style="color:var(--a)">＋ New ticket type</button></div>`;
    if (!t) return `<div class="tk-hd"><div><h3>Ticket types</h3><p>Categories members choose from, like Setup help or Appeals.</p></div></div>${empty('No ticket types yet', 'Create your first type. You can add questions and staff roles after.', '<button class="btn p" data-act="new-type">＋ New ticket type</button>')}`;
    const p = `types.${i}`;
    return `<div class="tk-hd"><div><h3>Ticket types</h3><p>Each type has its own button, staff, questions and (optionally) its own messages.</p></div></div><div class="tk-split">${side}<div>
<div class="tk-card"><h4>Button</h4><div class="tk-g2">${bfld(p + '.name', 'Name', t.name, { hint: 'Used in lists and {ticket.type}' })}${bfld(p + '.label', 'Button label', t.label)}${bfld(p + '.emoji', 'Emoji', t.emoji)}${bfld(p + '.color', 'Accent color', t.color || '', { hint: 'Optional hex, e.g. #e91e8c. Recolors every embed of this type' })}${bsel(p + '.style', 'Button color', STYLES.map((s) => `<option ${t.style === s ? 'selected' : ''}>${s}</option>`).join(''))}</div>${bfld(p + '.description', 'Description', t.description, { hint: 'Shown in the dashboard only' })}</div>
<div class="tk-card"><h4>Staff and channel</h4><div class="tkf"><span>Staff roles<small>Can see and answer. Empty uses the roles in Settings</small></span>${chips(p + '.staffRoles', roles(), t.staffRoles)}</div>
<div class="tk-g2">${bsel(p + '.categoryId', 'Category for ticket channels', opt(cats(), t.categoryId, 'Server default'))}${bfld(p + '.nameTemplate', 'Channel name template', t.nameTemplate, { hint: 'Try {ticket.id} and {user.name}' })}
${bsel(p + '.assign', 'Auto-assign', `<option value="none" ${t.assign === 'none' ? 'selected' : ''}>Nobody (staff claim)</option><option value="roundrobin" ${t.assign === 'roundrobin' ? 'selected' : ''}>Round robin (least busy staff)</option>`)}${bfld(p + '.maxOpen', 'Open tickets per member', t.maxOpen, { num: 1, min: 0, hint: '0 = no limit for this type' })}</div></div>
<div class="tk-card"><h4>Questions</h4><p class="cap" style="margin:-6px 0 14px;text-align:left">Asked one at a time in DMs (up to 5). Use an answer anywhere with its name, like <code>{answers.${esc(t.questions[0]?.id || 'q1')}}</code>.</p>
${t.questions.map((q, j) => `<div class="tk-row"><div class="tk-rh"><b>Question ${j + 1}</b><button class="tk-x" data-act="del-q" data-j="${j}">Remove</button></div><div class="tk-g2">${bfld(`${p}.questions.${j}.label`, 'Question', q.label)}${bfld(`${p}.questions.${j}.placeholder`, 'Hint text', q.placeholder)}</div>
<div class="tk-g3">${bfld(`${p}.questions.${j}.id`, 'Variable name', q.id)}${bfld(`${p}.questions.${j}.min`, 'Min length', q.min, { num: 1, min: 0 })}${bfld(`${p}.questions.${j}.max`, 'Max length', q.max, { num: 1, min: 1 })}</div>
<label class="tk-chk"><input type="checkbox" data-b="${p}.questions.${j}.required" ${q.required ? 'checked' : ''}> Required</label></div>`).join('') || '<p class="cap" style="text-align:left">No questions. Tickets open instantly.</p>'}
${t.questions.length < 5 ? '<button class="btn s" data-act="add-q">＋ Add question</button>' : ''}</div>
<div class="tk-card"><h4>Messages for this type</h4><p class="cap" style="margin:-6px 0 4px;text-align:left">Override the defaults from the Messages tab for this type only.</p>
${OVERRIDABLE.map((k) => t.msgs[k] ? `<div class="tk-sec"><b>${MESSAGE_META[k].t}</b><span>Custom</span><button class="tk-x" data-act="rm-ov" data-k="${k}">Use default</button></div><div class="tk-b" data-bm="${p}.msgs.${k}" data-key="${k}"></div>`
  : `<div class="tk-sec"><b>${MESSAGE_META[k].t}</b><span>Using the default</span><button class="tk-x" data-act="add-ov" data-k="${k}">Customize</button></div>`).join('')}</div>
<button class="btn" data-act="del-type">Delete this ticket type</button></div></div>`;
  },
  messages() {
    const keys = Object.keys(MESSAGE_META), k = MESSAGE_META[S.sel.msg] ? S.sel.msg : 'dm'; const groups = [...new Set(keys.map((x) => MESSAGE_META[x].g))];
    return `<div class="tk-hd"><div><h3>Messages</h3><p>Every message the ticket system sends, down to the letter. Edit, preview and test each one.</p></div></div><div class="tk-split"><div class="tk-list">${groups.map((g) => `<div class="tk-gl">${g}</div>${keys.filter((x) => MESSAGE_META[x].g === g).map((x) => `<button class="tk-li ${x === k ? 'on' : ''}" data-act="pick-msg" data-k="${x}">${MESSAGE_META[x].t}</button>`).join('')}`).join('')}</div>
<div class="tk-card"><h4>${MESSAGE_META[k].t}</h4><p class="cap" style="margin:-8px 0 16px;text-align:left">${MESSAGE_META[k].d}</p><div class="tk-b" data-bm="messages.${k}" data-key="${k}"></div></div></div>`;
  },
  settings() {
    const s = S.cfg.settings, a = s.autoClose;
    return `<div class="tk-hd"><div><h3>Settings</h3><p>Limits, logging and automatic closing for all ticket types.</p></div></div>
<div class="tk-card"><h4>General</h4>${row('Tickets enabled', 'Turn off to stop new tickets', sw('settings.enabled', s.enabled))}${row('Log channel', 'Opened and closed tickets, with transcript links', `<select data-b="settings.logChannel">${opt(chans(), s.logChannel, 'Off')}</select>`)}
${row('Default category', 'Where ticket channels are created', `<select data-b="settings.categoryId">${opt(cats(), s.categoryId, 'No category')}</select>`)}
<div class="tkf" style="margin-top:14px"><span>Staff roles<small>See every ticket unless a type sets its own</small></span>${chips('settings.staffRoles', roles(), s.staffRoles)}</div></div>
<div class="tk-card"><h4>Limits</h4>${row('Open tickets per member', '0 means unlimited', `<input type="number" min="0" data-k="num" data-b="settings.maxOpen" value="${s.maxOpen}">`)}${row('Cooldown between tickets', 'In minutes, 0 for none', `<input type="number" min="0" data-k="num" data-b="settings.cooldownMin" value="${s.cooldownMin}">`)}
${row('Blocked members', 'User IDs, separated by commas or spaces', `<textarea rows="3" data-k="csv" data-b="settings.blacklist">${esc(s.blacklist.join(', '))}</textarea>`)}</div>
<div class="tk-card"><h4>Inactivity</h4>${row('Close quiet tickets', 'Counts from the last message on either side', sw('settings.autoClose.enabled', a.enabled))}${row('Close after (hours)', 'Of no activity', `<input type="number" min="1" data-k="num" data-b="settings.autoClose.hours" value="${a.hours}">`)}${row('Warn this many hours before', 'Uses the Inactivity warning message', `<input type="number" min="1" data-k="num" data-b="settings.autoClose.warnHours" value="${a.warnHours}">`)}</div>
<div class="tk-card"><h4>Closing</h4>${row('Delete channel after closing', 'Seconds to wait, or -1 to keep it', `<input type="number" min="-1" data-k="num" data-b="settings.deleteDelay" value="${s.deleteDelay}">`)}${row('DM the transcript', 'Send the member a link to their copy', sw('settings.dmTranscript', s.dmTranscript))}${row('Ask for feedback', 'A 1 to 5 rating plus an optional comment', sw('settings.feedback', s.feedback))}</div>`;
  },
  active() {
    const f = S.f;
    return `<div class="tk-hd"><div><h3>Tickets</h3><p>Everything members have opened. Click a ticket to read the conversation and act on it.</p></div></div>
<div class="tk-flt"><select data-f="status"><option value="">Any status</option><option value="open" ${f.status === 'open' ? 'selected' : ''}>Open</option><option value="closed" ${f.status === 'closed' ? 'selected' : ''}>Closed</option></select>
<select data-f="type"><option value="">Any type</option>${S.cfg.types.map((t) => `<option value="${esc(t.id)}" ${f.type === t.id ? 'selected' : ''}>${esc(t.name)}</option>`).join('')}</select>
<select data-f="priority"><option value="">Any priority</option>${PRIORITIES.map((p) => `<option ${f.priority === p ? 'selected' : ''}>${p}</option>`).join('')}</select>
<select data-f="claimed"><option value="">Anyone</option><option value="none" ${f.claimed === 'none' ? 'selected' : ''}>Unclaimed</option><option value="me" ${f.claimed === 'me' ? 'selected' : ''}>Claimed by me</option></select>
<input data-f="q" placeholder="Search member, reason or #" value="${esc(f.q)}"></div><div class="tk-card" style="padding:0;overflow:hidden" id="tk-rows"><p class="cap" style="padding:30px">Loading…</p></div>`;
  },
  stats() { return '<div id="tk-st"><p class="cap">Loading…</p></div>'; },
};
const AFTER = {
  async active() {
    const f = S.f, qs = new URLSearchParams(Object.entries(f).filter(([, v]) => v));
    const r = await call(`tickets/${G}/list?${qs}`); const el = $('tk-rows'); if (!el) return;
    if (!r.ok) { el.innerHTML = '<p class="cap" style="padding:30px">Could not load tickets.</p>'; return; }
    el.innerHTML = r.data.length ? `<div class="tk-tr h"><span>#</span><span>Member</span><span>Type</span><span>Status</span><span>Priority</span><span>Claimed by</span></div>${r.data.map((t) => `<div class="tk-tr" data-act="open-ticket" data-id="${t.id}"><b>${pad(t.num)}</b><span class="u"><span class="tk-av">${t.user_avatar ? img(t.user_avatar) : esc((t.user_name || '?')[0])}</span><span>${esc(t.user_name || t.user_id)}</span></span><span>${esc(t.type_name || '—')}</span>
<span><span class="tk-pill ${t.status === 'open' ? 'ok' : ''}">${t.status}</span></span><span><span class="tk-pill ${t.priority === 'urgent' ? 'bad' : t.priority === 'high' ? 'warn' : ''}">${t.priority}</span></span><span>${esc(t.claimed_name || '—')} <small style="color:var(--mu)">· ${ago(t.created_at)}</small></span></div>`).join('')}`
      : empty('No tickets match', 'Try changing the filters, or post a panel so members can open one.');
  },
  async stats() {
    const r = await call(`tickets/${G}/stats`); const el = $('tk-st'); if (!el) return;
    if (!r.ok) { el.innerHTML = '<p class="cap">Could not load analytics.</p>'; return; }
    const d = r.data, k = d.kpi, max = Math.max(1, ...d.series.map((x) => x.n)), tmax = Math.max(1, ...d.types.map((x) => x.n)), rmax = Math.max(1, ...d.ratings.map((x) => x.n));
    el.innerHTML = `<div class="tk-hd"><div><h3>Analytics</h3><p>How your support is doing.</p></div></div>
<div class="tk-kpi"><div class="tk-k"><b>${k.open}</b><small>Open now</small></div><div class="tk-k"><b>${k.total}</b><small>Total tickets</small></div><div class="tk-k"><b>${k.week}</b><small>Last 7 days</small></div><div class="tk-k"><b>${k.avg_rating ? k.avg_rating.toFixed(1) + ' ★' : '—'}</b><small>${k.rated} rating${k.rated === 1 ? '' : 's'}</small></div><div class="tk-k"><b>${dur(k.avg_close)}</b><small>Average time to close</small></div></div>
<div class="tk-card"><h4>Tickets opened, last 14 days</h4><div class="tk-ch">${d.series.map((x, n) => `<div title="${esc(x.day)}: ${x.n}"><small>${x.n || ''}</small><i style="height:${Math.round(x.n / max * 100)}%"></i><small>${n % 2 ? '' : esc(x.day.slice(4))}</small></div>`).join('')}</div></div>
<div class="tk-g2"><div class="tk-card"><h4>By type</h4>${d.types.map((x) => `<div class="tk-hb"><span>${esc(x.name)}</span><i><u style="width:${x.n / tmax * 100}%"></u></i><span>${x.n}</span></div>`).join('') || '<p class="cap">Nothing yet.</p>'}</div>
<div class="tk-card"><h4>Ratings</h4>${[5, 4, 3, 2, 1].map((n) => { const c = d.ratings.find((x) => x.rating === n)?.n || 0; return `<div class="tk-hb"><span>${'★'.repeat(n)}</span><i><u style="width:${c / rmax * 100}%"></u></i><span>${c}</span></div>`; }).join('')}</div></div>
<div class="tk-g2"><div class="tk-card"><h4>Most active staff</h4>${d.staff.map((x) => `<div class="tk-hb"><span>${esc(x.name)}</span><i><u style="width:${x.n / d.staff[0].n * 100}%"></u></i><span>${x.n}</span></div>`).join('') || '<p class="cap">Claim tickets to see this.</p>'}</div>
<div class="tk-card"><h4>Recent feedback</h4>${d.feedback.map((x) => `<p style="margin:0 0 12px"><b>#${pad(x.num)}</b> ${x.rating ? '★'.repeat(x.rating) : ''} <span style="color:var(--mu)">${esc(x.user_name || '')}</span><br>${esc(x.feedback)}</p>`).join('') || '<p class="cap">No comments yet.</p>'}</div></div>`;
  },
};
function renderTab() {
  const m = $('tk-main'); if (!m) return;
  m.innerHTML = VIEWS[S.tab](); m.querySelectorAll('.tk-b[data-bm]').forEach(mountBuilder); AFTER[S.tab]?.();
}

// ── transcripts + drawer ────────────────────────────────────────────────────
const SIDE = { member: 'Member', staff: 'Staff', bot: 'Bot', note: 'Internal note' };
function msgList(ms) {
  return ms.map((m) => {
    if (m.side === 'system') return `<div class="tk-sysm">${esc(m.content)} · ${when(m.created_at)}</div>`;
    const files = m.attachments || [];
    return `<div class="tk-m ${m.side}"><div class="tk-av">${m.side === 'bot' ? H.LOGO : m.author_avatar ? img(m.author_avatar) : esc((m.author_name || '?')[0])}</div><div><div class="tk-mh"><b>${esc(m.side === 'bot' ? 'Arcane' : m.author_name || 'Unknown')}</b><span class="tk-tag">${SIDE[m.side] || m.side}</span><time>${when(m.created_at)}</time></div>
${m.content ? `<div class="tk-mc">${md(m.content)}</div>` : ''}${files.map((u) => (/\.(png|jpe?g|gif|webp)(\?|$)/i.test(u) ? `<a href="${esc(u)}" target="_blank" rel="noopener">${img(u, 'tk-att')}</a>` : `<div><a href="${esc(u)}" target="_blank" rel="noopener" style="color:var(--a)">📎 Attachment</a></div>`)).join('')}${(m.embeds || []).map(embedHtml).join('')}</div></div>`;
  }).join('') || '<p class="cap">No messages yet.</p>';
}
async function openDrawer(id) {
  const r = await call(`tickets/${G}/ticket/${id}`); if (!r.ok) return H.toast('Could not load that ticket.');
  const { ticket: t, messages } = r.data; document.querySelector('.tk-dr')?.remove();
  const d = document.createElement('div'); d.className = 'tk-dr';
  d.innerHTML = `<div class="tk-dh"><div style="display:flex;justify-content:space-between;gap:10px"><h4>#${pad(t.num)} · ${esc(t.type_name || 'Ticket')}</h4><button class="tk-x" data-x>Close panel</button></div>
<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px"><span class="tk-pill ${t.status === 'open' ? 'ok' : ''}">${t.status}</span><span class="tk-pill">${esc(t.priority)}</span><span class="tk-pill">${esc(t.user_name || t.user_id)}</span><span class="tk-pill">${t.claimed_name ? 'Claimed by ' + esc(t.claimed_name) : 'Unclaimed'}</span>${t.rating ? `<span class="tk-pill warn">${'★'.repeat(t.rating)}</span>` : ''}</div>
<div class="acts" style="margin:0">${t.status === 'open' ? '<button class="btn s p" data-op="claim">Claim</button><button class="btn s" data-op="close">Close</button>' : '<button class="btn s p" data-op="reopen">Reopen</button>'}
<select data-op="priority" style="width:auto;padding:6px 12px">${PRIORITIES.map((p) => `<option ${t.priority === p ? 'selected' : ''}>${p}</option>`).join('')}</select><a class="btn s" href="#/t/${esc(t.staff_token)}" target="_blank">Open transcript</a></div></div>
<div class="tk-db">${msgList(messages)}</div>`;
  document.body.appendChild(d);
  d.querySelector('[data-x]').onclick = () => d.remove();
  d.querySelector('.tk-db').scrollTop = 1e9;
  const op = async (name, value = '') => { H.toast('Working…'); const x = await runAction({ type: 'ticket_op', ticketId: String(t.id), op: name, value }); H.toast(x?.ok ? 'Done' : x?.result || 'Failed'); d.remove(); if (S.tab === 'active') AFTER.active(); };
  d.querySelectorAll('button[data-op]').forEach((b) => (b.onclick = () => { const o = b.dataset.op; if (o === 'close') { const why = prompt('Reason for closing (optional)'); if (why === null) return; op('close', why); } else op(o); }));
  d.querySelector('select[data-op]').onchange = (e) => op('priority', e.target.value);
}
export async function transcript(token, helpers) {
  css(); H = helpers;
  H.app.innerHTML = '<p class="c" style="margin-top:60px">Loading transcript…</p>';
  const r = await call('transcript/' + encodeURIComponent(token));
  if (r.status === 401) { H.app.innerHTML = '<section class="hero"><h1><b>Staff transcript</b></h1><p class="sub">Log in with an account that manages this server to read it.</p><a class="btn p" href="/api/login">Login with Yapin’</a></section>'; return; }
  if (!r.ok) { H.app.innerHTML = `<section class="hero"><h1><b>${r.status === 403 ? 'No access' : 'Not found'}</b></h1><p class="sub">${r.status === 403 ? 'Your account does not manage this server.' : 'This transcript link is wrong or no longer exists.'}</p></section>`; return; }
  const { ticket: t, messages, staff, server } = r.data;
  H.app.innerHTML = `<div class="tk-tcw"><div class="tk-hero"><p class="cap" style="text-align:left;margin:0 0 6px">${esc(server.name || 'Server')} · ${staff ? 'Staff transcript' : 'Your transcript'}</p><h3>Ticket #${pad(t.num)} · ${esc(t.type || 'Support')}</h3>
<div class="tk-meta"><span class="tk-pill ${t.status === 'open' ? 'ok' : ''}">${t.status}</span><span class="tk-pill">Opened ${when(t.created_at)}</span>${t.closed_at ? `<span class="tk-pill">Closed ${when(t.closed_at)}</span>` : ''}<span class="tk-pill">${esc(t.user_name || 'Member')}</span>${t.claimed_name ? `<span class="tk-pill">Handled by ${esc(t.claimed_name)}</span>` : ''}${t.rating ? `<span class="tk-pill warn">${'★'.repeat(t.rating)}</span>` : ''}</div>
${t.close_reason ? `<p style="margin:14px 0 0;color:#c3d3e4"><b>Closed because:</b> ${esc(t.close_reason)}</p>` : ''}</div>
${staff ? '<div class="tk-note">Staff view. Internal notes are shown here and are never included in the member’s copy.</div>' : ''}<div class="tk-card">${msgList(messages)}</div></div>`;
}

// ── events ──────────────────────────────────────────────────────────────────
function onInput(e) {
  const t = e.target;
  if (t.dataset.f) { S.f[t.dataset.f] = t.value; clearTimeout(onInput.tm); onInput.tm = setTimeout(() => AFTER.active(), t.tagName === 'INPUT' ? 300 : 0); return; }
  if (t.dataset.m) {
    const host = t.closest('.tk-b'); const b = host?._b; if (!b) return;
    const v = t.type === 'checkbox' ? t.checked : t.value; setP(b.msg, t.dataset.m, v);
    host.querySelectorAll(`[data-m="${t.dataset.m}"]`).forEach((o) => { if (o !== t && o.type !== 'checkbox') o.value = v; });
    const cc = t.closest('label')?.querySelector('.cc'); if (cc && typeof v === 'string') { cc.textContent = `${v.length}/${cc.dataset.max}`; cc.classList.toggle('over', v.length > +cc.dataset.max); }
    if (t.dataset.re && e.type === 'change') b.draw(); else refresh(b);
    return dirty();
  }
  if (t.dataset.b) {
    let v = t.type === 'checkbox' ? t.checked : t.value; const k = t.dataset.k;
    if (k === 'num') v = Number(v); else if (k === 'csv') v = v.split(/[\s,]+/).map((x) => x.trim()).filter(Boolean);
    setP(S.cfg, t.dataset.b, v); dirty(); if (t.dataset.re && e.type === 'change') renderTab();
  }
}
async function onClick(e) {
  const t = e.target.closest('[data-act]'); if (!t) return; const act = t.dataset.act;
  const host = t.closest('.tk-b');
  if (host?._b && !['tog'].includes(act)) { e.preventDefault(); return builderAct(act, t, host._b); }
  const i = +t.dataset.i, j = +t.dataset.j, c = S.cfg;
  switch (act) {
    case 'save': return save();
    case 'discard': await reloadCfg(); S.dirty = false; $('tk-bar').classList.remove('show'); return renderTab();
    case 'tog': { const a = getP(c, t.dataset.p), v = t.dataset.v, n = a.indexOf(v); n < 0 ? a.push(v) : a.splice(n, 1); t.classList.toggle('on', n < 0); dirty(); if (t.dataset.re) renderTab(); return; }
    case 'starter': { const ty = newType('Support'); ty.questions.push(newQ()); c.types.push(ty); c.panels.push(newPanel()); S.sel.panel = c.panels.length - 1; dirty(); return renderTab(); }
    case 'new-panel': c.panels.push(newPanel()); S.sel.panel = c.panels.length - 1; dirty(); return renderTab();
    case 'edit-panel': S.sel.panel = i; return renderTab();
    case 'back-panel': S.sel.panel = null; return renderTab();
    case 'dup-panel': { const p = clone(c.panels[S.sel.panel]); p.id = uid(); p.name += ' copy'; p.messageId = ''; p.postedChannel = ''; c.panels.push(p); S.sel.panel = c.panels.length - 1; dirty(); return renderTab(); }
    case 'del-panel': if (confirm('Delete this panel? The posted message stays in the channel.')) { c.panels.splice(S.sel.panel, 1); S.sel.panel = null; dirty(); renderTab(); } return;
    case 'post-panel': {
      const p = c.panels[S.sel.panel]; if (!p.channel) return H.toast('Choose a channel first.'); if (!p.typeIds.length) return H.toast('Add at least one ticket type.');
      t.disabled = true; try { if (!(await save())) return; const x = await runAction({ type: 'ticket_panel', panelId: p.id }); if (x?.ok) { H.toast('Posted in #' + chName(x.result)); await reloadCfg(); renderTab(); } else if (x) H.toast(x.result); } finally { t.disabled = false; }
      return;
    }
    case 'pick-type': S.sel.type = i; return renderTab();
    case 'new-type': c.types.push(newType('New type')); S.sel.type = c.types.length - 1; dirty(); return renderTab();
    case 'del-type': if (confirm('Delete this ticket type? Existing tickets keep their history.')) { const id = c.types[S.sel.type].id; c.types.splice(S.sel.type, 1); c.panels.forEach((p) => (p.typeIds = p.typeIds.filter((x) => x !== id))); S.sel.type = 0; dirty(); renderTab(); } return;
    case 'add-q': c.types[S.sel.type].questions.push(newQ()); dirty(); return renderTab();
    case 'del-q': c.types[S.sel.type].questions.splice(j, 1); dirty(); return renderTab();
    case 'add-ov': c.types[S.sel.type].msgs[t.dataset.k] = clone(c.messages[t.dataset.k]); dirty(); return renderTab();
    case 'rm-ov': delete c.types[S.sel.type].msgs[t.dataset.k]; dirty(); return renderTab();
    case 'pick-msg': S.sel.msg = t.dataset.k; return renderTab();
    case 'open-ticket': return openDrawer(t.dataset.id);
  }
}

// ── mount ───────────────────────────────────────────────────────────────────
export async function mount(gid, tab, helpers) {
  css(); H = helpers;
  if (!S || G !== gid) {
    H.app.innerHTML = '<p class="c" style="margin-top:60px">Loading tickets…</p>';
    const r = await call(`tickets/${gid}/config`); if (!r.ok) throw r.status;
    G = gid; S = { cfg: r.data.config, guild: r.data.guild || {}, tab: 'panels', dirty: false, sel: { panel: null, type: 0, msg: 'dm' }, f: { status: 'open', type: '', priority: '', claimed: '', q: '' } };
  }
  S.tab = TABS.some((x) => x[0] === tab) ? tab : 'panels';
  H.app.innerHTML = `<div class="tkroot"><a href="#/dashboard/${esc(gid)}" style="color:var(--mu)">← Server settings</a><h2 style="margin:8px 0 22px;font-size:32px">🎫 Tickets <span style="color:var(--mu);font-weight:300">· ${esc(S.guild.name || '')}</span></h2>
<div class="tk"><nav class="tk-nav">${TABS.map(([k, ic, l]) => `<a href="#/dashboard/${esc(gid)}/tickets/${k}" class="${k === S.tab ? 'on' : ''}"><span>${ic}</span>${l}</a>`).join('')}</nav><section id="tk-main"></section></div>
<div class="tk-bar ${S.dirty ? 'show' : ''}" id="tk-bar"><span>You have unsaved changes</span><div id="tk-errs"></div><button class="btn s" data-act="discard">Discard</button><button class="btn p s" data-act="save">Save changes</button></div></div>`;
  const root = H.app.querySelector('.tkroot');
  root.addEventListener('input', onInput); root.addEventListener('change', onInput); root.addEventListener('click', onClick);
  root.addEventListener('focusin', (e) => { const x = e.target; if (x.dataset?.m && /^(INPUT|TEXTAREA)$/.test(x.tagName) && !['checkbox', 'color'].includes(x.type)) lastF = x; });
  renderTab();
}
