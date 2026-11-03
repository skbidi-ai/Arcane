/* Arcane extras: embed builder · docs blocks (embed/card/callouts) + live docs editor · Discover with banners · Status · Privacy/Terms · more docs.
   Loaded after the main inline script, so it can use esc, hex, mn, LOGO, $, app, api, toast, md, DOCS_D. */
(() => {
const E = esc, U = (u) => (/^https:\/\/\S+$/.test(u || '') ? E(u) : '');
const col = (n) => (typeof n === 'number' ? '#' + n.toString(16).padStart(6, '0') : hex(n));
const mdi = (t) => E(t).replace(/\{user\}/g, mn('@NewMember')).replace(/\{username\}/g, 'NewMember').replace(/\{server\}/g, 'Your Server').replace(/\{count\}/g, '1,204').replace(/\{ordinal\}/g, '1,204th')
  .replace(/`([^`\n]+)`/g, '<code>$1</code>').replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>').replace(/__([^_]+)__/g, '<u>$1</u>').replace(/~~([^~]+)~~/g, '<s>$1</s>')
  .replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<i>$2</i>').replace(/\[([^\]]+)\]\((https:\/\/[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener" style="color:var(--a)">$1</a>')
  .replace(/^# (.*)$/gm, '<b style="font-size:1.25em">$1</b>').replace(/^-# (.*)$/gm, '<small>$1</small>').replace(/\n/g, '<br>');
const rBtns = (b) => { b = (b || []).filter((x) => x && x.label); return b.length ? `<div class="vbtns">${b.map((x) => `<a class="lbtn" ${U(x.url) ? `href="${U(x.url)}" target="_blank" rel="noopener"` : ''}>${E(x.label)} ↗</a>`).join('')}</div>` : ''; };

// ── renderers (used by the builder AND by ```embed / ```card blocks in docs) ──
function rEmbed(d) {
  const e = (d.embeds && d.embeds[0]) || d.embed || d;
  const f = (e.fields || []).filter((x) => x && (x.name || x.value));
  const has = e.title || e.description || f.length || e.image || (e.author && e.author.name) || e.thumbnail;
  const ft = e.footer && (e.footer.text || e.footer) ? `${U(e.footer.icon) ? `<img class="fi" src="${U(e.footer.icon)}" alt="">` : ''}${E(e.footer.text || e.footer)}${e.timestamp ? ' · Today at 3:42 PM' : ''}` : e.timestamp ? 'Today at 3:42 PM' : '';
  return `${d.content ? `<div class="yt">${mdi(d.content)}</div>` : ''}${has ? `<div class="ye" style="--ec:${col(e.color || '#8fdcff')};max-width:540px">${U(e.thumbnail) ? `<img class="th" src="${U(e.thumbnail)}" alt="" onerror="this.remove()">` : ''}${e.author && e.author.name ? `<div class="au">${U(e.author.icon) ? `<img src="${U(e.author.icon)}" alt="">` : ''}${E(e.author.name)}</div>` : ''}${e.title ? `<h4>${U(e.url) ? `<a href="${U(e.url)}" target="_blank" rel="noopener" style="color:var(--a)">${mdi(e.title)}</a>` : mdi(e.title)}</h4>` : ''}${e.description ? `<p>${mdi(e.description)}</p>` : ''}${f.length ? `<div class="ef2">${f.map((x) => `<div style="${x.inline ? '' : 'grid-column:1/-1'}"><b>${mdi(x.name || '​')}</b><span>${mdi(x.value || '​')}</span></div>`).join('')}</div>` : ''}${U(e.image) ? `<img class="bn" src="${U(e.image)}" alt="" onerror="this.remove()">` : ''}${ft ? `<small class="ft2">${ft}</small>` : ''}</div>` : ''}${rBtns(d.buttons)}`;
}
const rc = (c) => {
  if (!c) return '';
  switch (c.type) {
    case 17: return `<div class="cv" style="--ec:${col(c.accent_color ?? '#8fdcff')}">${(c.components || []).map(rc).join('')}</div>`;
    case 10: return `<div class="ct">${mdi(c.content)}</div>`;
    case 14: return c.divider === false ? `<div style="height:${c.spacing == 2 ? 18 : 8}px"></div>` : `<hr class="cs">`;
    case 9: return `<div class="csec"><div>${(c.components || []).map(rc).join('')}</div>${c.accessory ? (c.accessory.type == 11 ? `<img class="cth" src="${U(c.accessory.media && c.accessory.media.url)}" alt="" onerror="this.remove()">` : rc(c.accessory)) : ''}</div>`;
    case 12: return `<div class="cg n${Math.min(4, (c.items || []).length)}">${(c.items || []).map((i) => `<img src="${U(i.media && i.media.url)}" alt="" onerror="this.remove()">`).join('')}</div>`;
    case 'row': case 1: return rBtns((c.components || []).map((b) => ({ label: b.label, url: b.url })));
    case 'button': return rBtns([{ label: c.label, url: c.url }]);
  }
  return '';
};
const wrap = (inner, cmd) => `<div class="yp">${cmd ? `<div class="yc">${mn('@Member')} used <b>${E(cmd)}</b></div>` : ''}<div class="ym"><div class="ya">${LOGO}</div><div class="yb"><div class="yn">Arcane<i>BOT</i><time>Today at 3:42 PM</time></div>${inner}</div></div></div>`;
const rMsg = (d) => wrap(Array.isArray(d.layout) ? d.layout.map(rc).join('') : Array.isArray(d) ? d.map(rc).join('') : rEmbed(d), d.cmd);
window.arcRender = rMsg;

// ── docs: ```embed / ```card / ```note|tip|warn blocks ──
const CALL = { note: ['ℹ️', 'Note', '#8fdcff'], tip: ['💡', 'Tip', '#5be39b'], warn: ['⚠️', 'Heads up', '#f5b84a'] };
const _md = md;
window.md = function (t) {
  const bl = [];
  const s = String(t).replace(/```(embed|card|note|tip|warn)\n([\s\S]*?)```/g, (_, k, b) => { bl.push([k, b.trim()]); return `\n\nXBLK${bl.length - 1}X\n\n`; });
  return _md(s).replace(/<p>XBLK(\d+)X<\/p>/g, (_, i) => {
    const [k, b] = bl[i];
    if (CALL[k]) return `<div class="co" style="--ec:${CALL[k][2]}"><b>${CALL[k][0]} ${CALL[k][1]}</b><div>${_md(b)}</div></div>`;
    try { const j = JSON.parse(b); return `<div class="dm">${rMsg(k === 'card' ? { layout: Array.isArray(j) ? j : [j] } : j)}</div>`; }
    catch (err) { return `<pre>Invalid ${k} block: ${E(err.message)}</pre>`; }
  });
};
// docs editor: toolbar + live preview
const _de = docEditor;
window.docEditor = function (id) {
  _de(id);
  const ta = $('db'); if (!ta) return;
  const T = {
    embed: '```embed\n{"cmd":"/warn @Member spam","title":"Member warned","description":"{user} was warned.","color":"#f5b84a","fields":[{"name":"Case","value":"#14","inline":true},{"name":"Reason","value":"spam","inline":true}],"footer":{"text":"Arcane"},"buttons":[{"label":"Open dashboard","url":"https://example.com"}]}\n```',
    card: '```card\n[{"type":17,"accent_color":"#8fdcff","components":[{"type":10,"content":"# Title\\nSome **text**"},{"type":14,"divider":true},{"type":9,"components":[{"type":10,"content":"Text beside a picture"}],"accessory":{"type":11,"media":{"url":"https://example.com/a.png"}}}]}]\n```',
    note: '```note\nSomething worth knowing.\n```', tip: '```tip\nA handy shortcut.\n```', warn: '```warn\nBe careful with this one.\n```',
  };
  ta.insertAdjacentHTML('beforebegin', `<div class="qe" id="dtb">${Object.keys(T).map((k) => `<button type="button" class="btn s" data-i="${k}" style="width:auto;height:auto">＋ ${k}</button>`).join('')}<a class="btn s" href="#/embeds" target="_blank">Open embed builder ↗</a></div>`);
  ta.insertAdjacentHTML('afterend', '<p class="cap" style="margin:14px 0 6px">Live preview</p><article class="md card" id="dpv" style="padding:18px"></article>');
  const pv = () => { $('dpv').innerHTML = md(ta.value); }; ta.addEventListener('input', pv); pv();
  $('dtb').onclick = (e) => { const b = e.target.closest('[data-i]'); if (!b) return; const p = ta.selectionStart; ta.setRangeText('\n\n' + T[b.dataset.i] + '\n\n', p, ta.selectionEnd, 'end'); pv(); };
};

// ── Embed builder ──
let B = { mode: 'embed', content: '', e: { title: '', url: '', description: '', color: '#8fdcff', author: { name: '', icon: '', url: '' }, thumbnail: '', image: '', footer: { text: '', icon: '' }, timestamp: false, fields: [] }, buttons: [], card: { accent: '#8fdcff', blocks: [] } };
const blank = () => JSON.parse(JSON.stringify({ e: { title: '', url: '', description: '', color: '#8fdcff', author: { name: '', icon: '', url: '' }, thumbnail: '', image: '', footer: { text: '', icon: '' }, timestamp: false, fields: [] }, buttons: [], card: { accent: '#8fdcff', blocks: [] }, content: '' }));
const TPL = {
  Welcome: { e: { title: 'Welcome to {server}!', description: 'Welcome {user}, you are our **{ordinal}** member.\nRead the rules and say hi!', color: '#8fdcff', footer: { text: '{count} members' }, thumbnail: '', fields: [] } },
  Rules: { e: { title: '📜 Server rules', description: 'Keep it friendly, keep it fun.', color: '#f5b84a', fields: [{ name: '1 · Respect', value: 'No harassment or hate.', inline: false }, { name: '2 · No spam', value: 'No ads, invites or flooding.', inline: false }, { name: '3 · Staff decide', value: 'Follow staff instructions.', inline: false }], footer: { text: 'Breaking rules can lead to a warn, timeout or ban' } } },
  Announcement: { content: '@everyone', e: { title: '📢 Update', description: 'Write your news here. **Bold**, *italics*, __underline__ and [links](https://example.com) work.', color: '#8fdcff', author: { name: 'Staff team' }, timestamp: true, fields: [] }, buttons: [{ label: 'Read more', url: 'https://example.com' }] },
  Support: { e: { title: '🎫 Need help?', description: 'Open a ticket and a staff member will reply soon.', color: '#2ecc71', fields: [{ name: 'Hours', value: 'Most replies within a few hours', inline: true }, { name: 'Before you ask', value: 'Check #faq', inline: true }] }, buttons: [{ label: 'FAQ', url: 'https://example.com' }] },
  'Card: server': { mode: 'card', card: { accent: '#8fdcff', blocks: [{ t: 'text', v: '# Your Server\nA friendly place to hang out.' }, { t: 'sep', divider: true }, { t: 'section', v: '**Events**\nWeekly game night every Friday', img: '' }, { t: 'sep', divider: false }, { t: 'buttons', items: [{ label: 'Rules', url: 'https://example.com' }, { label: 'Invite friends', url: 'https://example.com' }] }] } },
};
const setP = (o, p, v) => { const k = p.split('.'); k.slice(0, -1).forEach((x) => (o = o[x] ??= {})); o[k.at(-1)] = v; };
const getP = (o, p) => p.split('.').reduce((a, k) => (a == null ? a : a[k]), o);
const strip = (o) => { if (Array.isArray(o)) return o.map(strip).filter((x) => x !== undefined); if (o && typeof o == 'object') { const r = {}; for (const [k, v] of Object.entries(o)) { const c = strip(v); if (c !== undefined && c !== '' && c !== false && !(Array.isArray(c) && !c.length) && !(typeof c == 'object' && !Array.isArray(c) && !Object.keys(c).length)) r[k] = c; } return r; } return o; };
const toLayout = () => {
  const comps = B.card.blocks.map((b) => {
    if (b.t == 'text') return { type: 10, content: b.v || ' ' };
    if (b.t == 'sep') return { type: 14, divider: b.divider !== false, spacing: b.large ? 2 : 1 };
    if (b.t == 'section') return /^https:\/\//.test(b.img || '') ? { type: 9, components: [{ type: 10, content: b.v || ' ' }], accessory: { type: 11, media: { url: b.img } } } : { type: 10, content: b.v || ' ' };
    if (b.t == 'gallery') { const u = (b.urls || '').split('\n').map((s) => s.trim()).filter((s) => /^https:\/\//.test(s)).slice(0, 10); return u.length ? { type: 12, items: u.map((x) => ({ media: { url: x } })) } : null; }
    if (b.t == 'buttons') { const i = (b.items || []).filter((x) => x.label && /^https:\/\//.test(x.url || '')).slice(0, 5); return i.length ? { type: 'row', components: i.map((x) => ({ type: 'button', style: 'link', label: x.label.slice(0, 80), url: x.url })) } : null; }
  }).filter(Boolean);
  return [{ type: 17, accent_color: parseInt(String(B.card.accent).replace('#', ''), 16) || 0x8fdcff, components: comps }];
};
const toCode = () => {
  if (B.mode == 'card') return JSON.stringify({ layout: toLayout() });
  const e = strip(B.e); const o = {}; if (B.content) o.content = B.content; if (Object.keys(e).length) o.embeds = [e];
  const bt = (B.buttons || []).filter((x) => x.label && /^https:\/\//.test(x.url || '')); if (bt.length) o.buttons = bt;
  return JSON.stringify(o);
};
const fromCode = (txt) => {
  const j = JSON.parse(txt); B = { ...blank(), mode: 'embed' };
  if (Array.isArray(j.layout)) {
    B.mode = 'card'; const c = j.layout[0] || {}; B.card.accent = col(c.accent_color ?? '#8fdcff');
    B.card.blocks = (c.components || []).map((x) => x.type == 10 ? { t: 'text', v: x.content } : x.type == 14 ? { t: 'sep', divider: x.divider !== false, large: x.spacing == 2 } : x.type == 9 ? { t: 'section', v: (x.components || []).map((y) => y.content).join('\n'), img: x.accessory && x.accessory.media ? x.accessory.media.url : '' } : x.type == 12 ? { t: 'gallery', urls: (x.items || []).map((i) => i.media.url).join('\n') } : { t: 'buttons', items: (x.components || []).map((b) => ({ label: b.label, url: b.url })) });
  } else { B.content = j.content || ''; Object.assign(B.e, (j.embeds && j.embeds[0]) || j.embed || {}); B.e.author = { name: '', icon: '', url: '', ...(B.e.author || {}) }; B.e.footer = typeof B.e.footer == 'string' ? { text: B.e.footer } : { text: '', icon: '', ...(B.e.footer || {}) }; B.e.fields ||= []; B.buttons = j.buttons || []; }
};

async function builder() {
  const inp = (p, l, ph = '') => `<label class="fld"><span><b>${l}</b></span><input data-p="${p}" value="${E(getP(B, p) ?? '')}" placeholder="${E(ph)}"></label>`;
  const ta = (p, l, r = 4, ph = '') => `<label class="fld"><span><b>${l}</b></span><textarea data-p="${p}" rows="${r}" placeholder="${E(ph)}">${E(getP(B, p) ?? '')}</textarea></label>`;
  const SW = ['#8fdcff', '#2ecc71', '#f5b84a', '#ef6b73', '#e91e8c', '#b79cff', '#5865f2', '#ffffff'];
  const colorRow = (p) => `<div class="fld"><span><b>Accent color</b></span><div class="sws"><input data-p="${p}" maxlength="7" value="${E(getP(B, p))}" style="max-width:130px">${SW.map((x) => `<button type="button" class="swc" data-sw="${p}|${x}" style="background:${x}" aria-label="${x}"></button>`).join('')}<input type="color" data-cp="${p}" value="${E(col(getP(B, p)))}"></div></div>`;
  const formEmbed = () => `${ta('content', 'Message text', 2, 'Optional text above the embed, e.g. @everyone')}
<div class="vsec"><h4>Author</h4></div><div class="fg">${inp('e.author.name', 'Name')}${inp('e.author.icon', 'Icon URL', 'https://…')}${inp('e.author.url', 'Link')}</div>
<div class="vsec"><h4>Body</h4></div>${inp('e.title', 'Title', 'Max 256 characters')}${inp('e.url', 'Title link', 'https://…')}${ta('e.description', 'Description', 6, 'Supports **bold**, *italic*, __underline__, ~~strike~~, `code`, [links](https://…) and {user} {username} {server} {count} {ordinal}')}${colorRow('e.color')}
<div class="vsec"><h4>Pictures</h4></div><div class="fg">${inp('e.thumbnail', 'Thumbnail (small, right)', 'https://…')}${inp('e.image', 'Large image', 'https://…')}</div>
<div class="vsec"><h4>Fields (${B.e.fields.length}/25)</h4><button type="button" class="btn s" data-add="field">＋ Add field</button></div>
${B.e.fields.map((f, i) => `<div class="mr"><div class="fg">${inp(`e.fields.${i}.name`, 'Name')}${inp(`e.fields.${i}.value`, 'Value')}</div><div class="acts" style="margin-top:6px"><label style="display:flex;gap:8px;align-items:center"><input type="checkbox" class="sw" data-p="e.fields.${i}.inline" ${f.inline ? 'checked' : ''}> Inline</label><button type="button" class="btn s" data-mv="field|${i}|-1">↑</button><button type="button" class="btn s" data-mv="field|${i}|1">↓</button><button type="button" class="btn s" data-del="field|${i}">Remove</button></div></div>`).join('')}
<div class="vsec"><h4>Footer</h4></div><div class="fg">${inp('e.footer.text', 'Text')}${inp('e.footer.icon', 'Icon URL')}</div><label style="display:flex;gap:10px;align-items:center;margin:6px 0"><input type="checkbox" class="sw" data-p="e.timestamp" ${B.e.timestamp ? 'checked' : ''}> Show timestamp</label>
<div class="vsec"><h4>Link buttons (${B.buttons.length}/5)</h4><button type="button" class="btn s" data-add="button">＋ Add button</button></div>
${B.buttons.map((b, i) => `<div class="mr"><div class="fg">${inp(`buttons.${i}.label`, 'Label')}${inp(`buttons.${i}.url`, 'https link')}</div><button type="button" class="btn s" data-del="button|${i}">Remove</button></div>`).join('')}`;
  const BT = { text: 'Text', section: 'Text + picture', sep: 'Separator', gallery: 'Gallery', buttons: 'Link buttons' };
  const formCard = () => `${colorRow('card.accent')}<div class="vsec"><h4>Blocks (${B.card.blocks.length}/20)</h4><div class="chips" style="margin:0">${Object.entries(BT).map(([k, v]) => `<button type="button" class="chip" data-add="blk|${k}">＋ ${v}</button>`).join('')}</div></div>
${B.card.blocks.map((b, i) => { const P = `card.blocks.${i}`; return `<div class="mr"><div class="mrh"><b>${BT[b.t]}</b><span class="acts" style="margin:0"><button type="button" class="btn s" data-mv="blk|${i}|-1">↑</button><button type="button" class="btn s" data-mv="blk|${i}|1">↓</button><button type="button" class="btn s" data-del="blk|${i}">✕</button></span></div>${b.t == 'text' ? ta(`${P}.v`, 'Markdown', 4) : b.t == 'section' ? ta(`${P}.v`, 'Text', 3) + inp(`${P}.img`, 'Picture beside it (https)') : b.t == 'sep' ? `<label style="display:flex;gap:10px;align-items:center"><input type="checkbox" class="sw" data-p="${P}.divider" ${b.divider !== false ? 'checked' : ''}> Show line</label><label style="display:flex;gap:10px;align-items:center;margin-top:8px"><input type="checkbox" class="sw" data-p="${P}.large" ${b.large ? 'checked' : ''}> Large spacing</label>` : b.t == 'gallery' ? ta(`${P}.urls`, 'Picture URLs, one per line (max 10)', 3) : (b.items || []).map((x, j) => `<div class="fg">${inp(`${P}.items.${j}.label`, 'Label')}${inp(`${P}.items.${j}.url`, 'https link')}</div>`).join('') + `<button type="button" class="btn s" data-add="bi|${i}">＋ Button</button>`}</div>`; }).join('')}`;
  const form = () => { $('bf').innerHTML = B.mode == 'card' ? formCard() : formEmbed(); bindF(); out(); };
  const out = () => {
    const code = toCode(); $('bpv').innerHTML = rMsg(B.mode == 'card' ? { layout: toLayout() } : { content: B.content, embeds: [B.e], buttons: B.buttons });
    $('bco').textContent = code; $('bcs').textContent = `${code.length} characters`;
    const w = []; if (B.mode == 'embed') { if ((B.e.title || '').length > 256) w.push('Title is over 256 characters'); if ((B.e.description || '').length > 4096) w.push('Description is over 4096 characters'); if (B.e.fields.length > 25) w.push('Max 25 fields'); } else if (B.card.blocks.length > 20) w.push('Keep a card under 20 blocks');
    $('bwn').textContent = w.join(' · ');
  };
  const bindF = () => {
    document.querySelectorAll('#bf [data-p]').forEach((el) => { const h = () => { setP(B, el.dataset.p, el.type == 'checkbox' ? el.checked : el.value); out(); }; el.addEventListener('input', h); el.addEventListener('change', h); });
    document.querySelectorAll('#bf [data-cp]').forEach((el) => el.oninput = () => { setP(B, el.dataset.cp, el.value); form(); });
  };
  app.innerHTML = `<h2 class="t">Embed builder</h2><p class="c">Build a message or card, copy the code, and send it with <code>/sendembed</code>. No login needed.</p>
<div class="chips" style="justify-content:center" id="bm"><button class="chip" data-m="embed">Normal message</button><button class="chip" data-m="card">Cards (Components V2)</button><button class="chip" data-m="imp">I already have a script</button></div>
<div class="chips" style="justify-content:center;margin-top:0" id="bt"><span class="cap" style="margin:6px 8px 0 0">Templates:</span>${Object.keys(TPL).map((k) => `<button class="chip" data-t="${E(k)}">${E(k)}</button>`).join('')}<button class="chip" data-t="__clear">Clear</button></div>
<div class="bg"><div class="card" id="bf" style="padding:20px"></div><div style="position:sticky;top:90px;align-self:start"><div class="card" style="padding:18px"><p class="cap" style="margin:0 0 10px">Live preview · Yapin’ may space things slightly differently</p><div id="bpv"></div></div>
<div class="card" style="padding:18px;margin-top:14px"><div class="vsec" style="margin:0 0 10px"><h4>Code <span class="cap" id="bcs"></span></h4><div class="chips" style="margin:0"><button class="chip" id="cc">Copy code</button><button class="chip" id="cm">Copy command</button><button class="chip" id="cd">Copy docs block</button></div></div><pre class="bco" id="bco"></pre><p class="cap" id="bwn" style="color:#ef6b73"></p><p class="cap">In your server run <code>/sendembed &lt;code&gt;</code> (mods only). {user} {username} {server} {count} {ordinal} are filled in automatically.</p></div></div></div>
<div id="bi" class="card" style="display:none;margin-top:16px"><b>Paste an existing script</b><textarea id="bit" rows="5" style="margin-top:8px" placeholder='{"embeds":[{"title":"Hi"}]}'></textarea><div class="acts"><button class="btn p s" id="bok">Open it</button><span id="ber" class="cap" style="color:#ef6b73"></span></div></div>`;
  const chipsOn = () => document.querySelectorAll('#bm .chip').forEach((b) => b.classList.toggle('on', b.dataset.m == B.mode));
  $('bm').onclick = (e) => { const b = e.target.closest('[data-m]'); if (!b) return; if (b.dataset.m == 'imp') { $('bi').style.display = 'block'; return; } B.mode = b.dataset.m; chipsOn(); form(); };
  $('bt').onclick = (e) => { const b = e.target.closest('[data-t]'); if (!b) return; const t = b.dataset.t; const m = t == '__clear' ? {} : JSON.parse(JSON.stringify(TPL[t])); B = { ...blank(), ...m, mode: m.mode || 'embed' }; if (m.e) B.e = { ...blank().e, ...m.e, author: { name: '', icon: '', url: '', ...(m.e.author || {}) }, footer: { text: '', icon: '', ...(m.e.footer || {}) } }; chipsOn(); form(); };
  $('bok').onclick = () => { try { fromCode($('bit').value.trim()); $('ber').textContent = ''; chipsOn(); form(); } catch (e) { $('ber').textContent = 'Not valid JSON: ' + e.message; } };
  $('bf').onclick = (e) => {
    const sw = e.target.closest('[data-sw]'), ad = e.target.closest('[data-add]'), dl = e.target.closest('[data-del]'), mv = e.target.closest('[data-mv]');
    if (sw) { const [p, c] = sw.dataset.sw.split('|'); setP(B, p, c); form(); }
    else if (ad) { const [k, x] = ad.dataset.add.split('|');
      if (k == 'field' && B.e.fields.length < 25) B.e.fields.push({ name: '', value: '', inline: true });
      else if (k == 'button' && B.buttons.length < 5) B.buttons.push({ label: '', url: '' });
      else if (k == 'blk' && B.card.blocks.length < 20) B.card.blocks.push({ text: { t: 'text', v: '' }, section: { t: 'section', v: '', img: '' }, sep: { t: 'sep', divider: true }, gallery: { t: 'gallery', urls: '' }, buttons: { t: 'buttons', items: [{ label: '', url: '' }] } }[x]);
      else if (k == 'bi') { const it = B.card.blocks[+x].items; if (it.length < 5) it.push({ label: '', url: '' }); }
      form(); }
    else if (dl) { const [k, i] = dl.dataset.del.split('|'); (k == 'field' ? B.e.fields : k == 'button' ? B.buttons : B.card.blocks).splice(+i, 1); form(); }
    else if (mv) { const [k, i, d] = mv.dataset.mv.split('|'), a = k == 'field' ? B.e.fields : B.card.blocks, j = +i + +d; if (j >= 0 && j < a.length) { [a[i], a[j]] = [a[j], a[i]]; form(); } }
  };
  const cp = (t, m) => navigator.clipboard.writeText(t).then(() => toast(m), () => toast('Copy failed, select the code and copy it'));
  $('cc').onclick = () => cp(toCode(), 'Code copied');
  $('cm').onclick = () => cp('/sendembed ' + toCode(), 'Command copied');
  $('cd').onclick = () => cp(B.mode == 'card' ? '```card\n' + JSON.stringify(toLayout(), null, 1) + '\n```' : '```embed\n' + JSON.stringify({ content: B.content || undefined, ...strip(B.e), buttons: strip(B.buttons) }, null, 1) + '\n```', 'Docs block copied. Paste it into a docs page');
  chipsOn(); form();
}

// ── Status + legal ──
window.statusPage = async function () {
  app.innerHTML = '<h2 class="t">Status</h2><p class="c">Live from the Arcane API.</p><div class="grid" id="sg" style="margin-top:20px"></div>';
  const t = Date.now(); let st = null, rg = []; try { st = await api('stats'); } catch {} const ms = Date.now() - t; try { rg = await api('registry'); } catch {}
  const k = (b, s, ok) => `<div class="card"><small style="color:var(--mu)">${s}</small><h3 style="font-size:28px;margin:4px 0">${b}</h3>${ok === undefined ? '' : `<span class="pill ${ok ? 'ok' : ''}">${ok ? 'Operational' : 'Unreachable'}</span>`}</div>`;
  $('sg').innerHTML = k(st ? 'Online' : 'Down', 'Website & API', !!st) + k(ms + ' ms', 'API response') + k(fmt(st && st.servers), 'Servers') + k(fmt(st && st.members), 'Members') + k(fmt(rg.length), 'Commands');
};
const LEGAL = {
  privacy: ['Privacy', '# Privacy\nArcane is an independent bot for Yapin’.\n\n## What we store\n- Server settings you choose in the dashboard\n- Per-server XP, coins, warnings and moderation cases\n- Your Yapin’ user ID, name and avatar when you log in (kept in a signed cookie for 7 days)\n\n## What we do not do\n- We do not sell data\n- We do not read messages beyond what commands, automod and leveling need\n\n## Removing data\nAsk a server owner to remove Arcane, or contact us in the support server.'],
  terms: ['Terms', '# Terms\nBy adding Arcane you agree to these terms.\n\n- Use Arcane in line with Yapin’s own rules\n- Do not abuse commands to harass others or overload the bot\n- Features can change or stop without notice, the bot is provided as is\n- We may remove Arcane from servers that abuse it\n\nArcane is not made, endorsed or run by Yapin’.'],
};
window.legalPage = async function (p) { app.innerHTML = `<article class="md" style="max-width:760px;margin:auto">${md(LEGAL[p][1])}</article>`; };

// ═════════ v2: pages modelled on notgreed (commands, discover, leaderboard, docs, custom bots, embeds start screen) ═════════
const SUP = 'https://www.yapin.gg/invite/Arcane';
const CB = { enabled: false, price: null, sale: null, support: SUP }; // set enabled:true and a price once you actually sell custom bots

// nav + footer
(function chrome() {
  const add = $('add');
  if (add) { document.querySelectorAll('nav a.l').forEach((a) => a.remove()); add.insertAdjacentHTML('beforebegin', [['commands', 'Commands'], ['discover', 'Discover'], ['docs', 'Docs'], ['embeds', 'Embeds'], ['custom-bots', 'Custom bots']].map(([h, t]) => `<a class="l" href="#/${h}">${t}</a>`).join('')); }
  const ft = document.querySelector('.ft'); if (!ft) return;
  ft.classList.add('f5');
  const col = (h, l) => `<div><h5>${h}</h5>${l.map(([t, u, x]) => `<a href="${u}"${x ? ' target="_blank" rel="noopener"' : ''}>${t}</a>`).join('')}</div>`;
  ft.innerHTML = `<div><a class="brand" href="#/">${LOGO}Arcane</a><p>Yapin’s moderation, utility, leveling and fun bot, all set up from a web page.</p></div>`
    + col('PRODUCT', [['Commands', '#/commands'], ['Discover', '#/discover'], ['Embed builder', '#/embeds'], ['Custom bots', '#/custom-bots'], ['Status', '#/status'], ['Changelog', '#/changelog'], ['Dashboard', '#/dashboard'], ['Add to Yapin’', ADD_URL]])
    + col('DOCUMENTATION', [['Getting started', '#/docs/getting-started'], ['Permissions', '#/docs/permissions'], ['Moderation', '#/docs/moderation'], ['Automod', '#/docs/automod'], ['Levels', '#/docs/levels'], ['Verification', '#/docs/verification'], ['Embeds', '#/docs/embeds']])
    + col('SUPPORT', [['Support server ↗', SUP, 1], ['FAQ', '#/docs/faq'], ['Yapin’ developers ↗', 'https://www.yapin.gg/developers', 1]])
    + col('LEGAL', [['Privacy', '#/privacy'], ['Terms', '#/terms']]);
})();

// ── Commands ──
window.commands = async function () {
  app.innerHTML = `<h2 class="t">Commands</h2><p class="c" id="cn">Every Arcane command, with its arguments and who can use it.</p><p class="c" style="margin-top:-14px">The default prefix is <code>/</code>, and <code>!</code> always works too.</p>
<div class="cf"><input id="cq" placeholder="Search commands, aliases…" aria-label="Search commands"><select id="cs" aria-label="Sort"><option value="az">Name A–Z</option><option value="za">Name Z–A</option><option value="cat">Category</option></select></div><div class="chips" id="cch"></div><p class="cap" id="crs"></p><div class="cgrid" id="cl"></div><div style="text-align:center;margin-top:18px" id="cm"></div>`;
  let list = []; try { list = await api('registry'); } catch {}
  list = list.map((c) => { const m = /^(.*?):\s*[\/!]\S+\s*(.*)$/.exec(c.description || ''); return { ...c, d: m ? m[1] : c.description || '', args: m ? m[2] : '', al: c.alias || [] }; });
  $('cn').textContent = list.length ? `Every one of Arcane’s ${fmt(list.length)} commands, with the arguments and permissions each one needs.` : 'The bot publishes its command list when it starts.';
  let cat = 'All', q = '', sort = 'az', lim = 36;
  const counts = {}; list.forEach((c) => (counts[c.category] = (counts[c.category] || 0) + 1));
  const draw = () => {
    $('cch').innerHTML = [['All', list.length], ...Object.entries(counts)].map(([c, n]) => `<button class="chip ${c == cat ? 'on' : ''}" data-c="${E(c)}">${E(c)} <span class="cn">${n}</span></button>`).join('');
    let r = list.filter((c) => (cat == 'All' || c.category == cat) && (c.name + ' ' + c.description + ' ' + c.al.join(' ')).toLowerCase().includes(q));
    r.sort((a, b) => sort == 'za' ? b.name.localeCompare(a.name) : sort == 'cat' ? a.category.localeCompare(b.category) || a.name.localeCompare(b.name) : a.name.localeCompare(b.name));
    $('crs').textContent = `${fmt(r.length)} result${r.length == 1 ? '' : 's'}`;
    $('cl').innerHTML = r.slice(0, lim).map((c) => `<div class="cc"><div class="cch"><b>${E(c.name)}</b><span class="cmeta">${E(c.category)}, prefix</span></div><p>${E(c.d)}</p><dl><dt>arguments</dt><dd>${c.args ? `<code>${E(c.args)}</code>` : 'none'}</dd><dt>permissions</dt><dd>${c.mod ? 'Mod role' : 'none'}</dd><dt>aliases</dt><dd>${c.al.length ? c.al.map((a) => `<code>${E(a)}</code>`).join(' ') : 'none'}</dd></dl></div>`).join('') || '<div class="card"><p>No commands match.</p></div>';
    $('cm').innerHTML = r.length > lim ? `<button class="btn" id="cmb">Show more (${fmt(r.length - lim)} left)</button>` : '';
    if ($('cmb')) $('cmb').onclick = () => { lim += 36; draw(); };
  };
  $('cch').onclick = (e) => { const b = e.target.closest('[data-c]'); if (b) { cat = b.dataset.c; lim = 36; draw(); } };
  $('cq').oninput = (e) => { q = e.target.value.toLowerCase(); lim = 36; draw(); };
  $('cs').onchange = (e) => { sort = e.target.value; draw(); };
  draw();
};

// ── Discover (spotlight, banners, leaderboard links) + public leaderboard ──
const sCard = (s) => { const d = s.d || {}, inv = /^https:\/\//.test(d.invite || '');
  return `<div class="card dc ${s.spot ? 'sp' : ''}"><div class="dbn">${U(d.banner) ? `<img src="${U(d.banner)}" alt="" onerror="this.remove()">` : ''}</div><div class="dbd"><div class="ico dic">${s.icon && /^https?:/.test(s.icon) ? `<img src="${E(s.icon)}" alt="">` : E((s.name || '?')[0])}</div><b class="dnm">${E(s.name)}</b><small style="color:var(--mu)">${fmt(s.member_count)} members</small>${d.description ? `<p style="margin:10px 0 0">${E(d.description)}</p>` : ''}<div class="acts" style="margin-top:14px">${inv ? `<a class="btn s p" href="${E(d.invite)}" target="_blank" rel="noopener">Join</a>` : ''}<a class="btn s" href="#/leaderboard/${E(s.server_id)}">Leaderboard</a></div></div></div>`; };
window.discover = async function () {
  app.innerHTML = '<h2 class="t">Discover</h2><p class="c">Servers that run Arcane and chose to be listed. Owners can list theirs with <code>!discover on</code>.</p><input id="q" placeholder="Search servers…" aria-label="Search servers"><div id="ls" style="margin-top:10px"></div>';
  let tm;
  const load = async () => {
    let r = []; try { r = await api('discover?q=' + encodeURIComponent($('q').value)); } catch {}
    const sp = r.filter((s) => s.spot), rest = r.filter((s) => !s.spot);
    $('ls').innerHTML = (sp.length ? `<h3 class="dh">⭐ Spotlight</h3><div class="grid dg">${sp.map(sCard).join('')}</div>` : '') + (rest.length ? `<h3 class="dh">${sp.length ? 'Everyone else' : 'Servers'}</h3><div class="grid dg">${rest.map(sCard).join('')}</div>` : '') || '<div class="card" style="margin-top:20px"><p>No servers found yet. Be the first: run <code>!discover on</code> in your server.</p></div>';
  };
  $('q').oninput = () => { clearTimeout(tm); tm = setTimeout(load, 250); }; load();
};
window.leaderboardPage = async function (id) {
  let r; try { r = await api('leaderboard/' + encodeURIComponent(id)); } catch { app.innerHTML = '<section class="hero"><h1><b>Not found</b></h1><p class="sub">This server is not listed, or its leaderboard is not published yet. Listed servers update every 10 minutes.</p><a class="btn" href="#/discover">Back to Discover</a></section>'; return; }
  const g = r.guild, d = g.d || {}, rows = r.rows || [], top = rows[0] ? rows[0].xp : 1;
  app.innerHTML = `<a href="#/discover" style="color:var(--mu)">← Discover</a><div class="card dc" style="margin:14px 0 22px"><div class="dbn">${U(d.banner) ? `<img src="${U(d.banner)}" alt="" onerror="this.remove()">` : ''}</div><div class="dbd"><div class="ico dic">${g.icon && /^https?:/.test(g.icon) ? `<img src="${E(g.icon)}" alt="">` : E((g.name || '?')[0])}</div><b class="dnm" style="font-size:26px">${E(g.name)}</b><small style="color:var(--mu)">${fmt(g.member_count)} members · Leaderboard</small></div></div>
<div class="card" style="padding:0">${rows.map((u, i) => `<div class="lr"><span class="lk">${i < 3 ? ['🥇', '🥈', '🥉'][i] : '#' + (i + 1)}</span><div class="lm"><b>${E(u.name || 'Member ' + String(u.id).slice(0, 6))}</b><div class="lb"><i style="width:${Math.max(3, Math.round(100 * u.xp / top))}%"></i></div></div><span class="lv">Level ${fmt(u.level)}<small>${fmt(u.xp)} XP</small></span></div>`).join('') || '<div class="cmd"><span>Nobody has XP here yet.</span></div>'}</div>`;
};

// ── Custom bots ──
window.customBotsPage = async function () {
  const buy = CB.enabled ? `Get one${CB.price ? ` for €${CB.price}/month` : ''}` : 'Join the waitlist';
  app.innerHTML = `<section class="hero" style="padding-bottom:0"><p class="eb">Custom bots</p>${CB.enabled ? '' : '<p><span class="pill mid">Coming soon</span></p>'}<h1 style="font-size:clamp(34px,6vw,64px)"><em>Arcane,</em> <b>under your name.</b></h1><p class="sub">Your own bot account on Yapin’ with every Arcane feature: your name, your avatar, your colour. Arcane hosts and updates it, so there is nothing to run or code.</p><a class="btn p" href="${CB.support}" target="_blank" rel="noopener">${buy}</a> <a class="btn" href="#/dashboard">Your dashboard</a>${CB.enabled && CB.price ? `<p class="cap" style="margin-top:14px">${CB.sale ? `€${CB.sale} a month while the offer lasts, then €${CB.price}.` : `€${CB.price} a month.`} You pay through a ticket in the support server.</p>` : ''}</section>
<div style="max-width:560px;margin:34px auto 0"><div class="yp"><div class="yc" style="margin-left:0">${mn('@yakazt')} used <b>/ban</b></div><div class="ym"><div class="ya">${LOGO}</div><div class="yb"><div class="yn">Your Bot<i>BOT</i><time>Today at 21:04</time></div><div class="yt">✅ <b>@yakazt</b>: Banned <b>spammer</b> · raiding</div></div></div></div></div>
<h2 class="t" style="margin-top:70px">What you can change</h2><div class="grid" style="margin-top:20px">${[['Name and bio', 'The name in member lists and on every message, and the “About me” on its profile.'], ['Avatar and banner', 'Upload them on the dashboard. Until you do, it uses Arcane’s.'], ['Status and activity', 'Online, idle or do not disturb, and a “Playing …” line under its name.'], ['Embed colour', 'Every embed it sends gets your colour instead of the default blue.'], ['Managers', 'Let people, or everyone with a role in your server, edit the bot with you.'], ['Every feature', 'Moderation, levels, verification, economy and the rest. Same dashboard, same settings.']].map(([t, d]) => `<div class="card"><h3>${t}</h3><p>${d}</p></div>`).join('')}</div>
<h2 class="t" style="margin-top:70px">How it works</h2><ol class="cbs">${[['Make a bot on Yapin’', 'In Yapin’, open Settings → Developer and create a bot. Give it a name. You do not need to write any code.'], ['Get it activated', 'Ask in the support server and a ticket opens for you.'], ['Paste its token', 'Copy the bot’s token from Yapin’ and paste it on the dashboard. It is stored encrypted and never shown again.'], ['Add it to your server', 'Invite your bot like any other. It starts within a minute and keeps every setting your server already had.']].map(([t, d], i) => `<li><i>${i + 1}</i><div><b>${t}</b><p>${d}</p></div></li>`).join('')}</ol>
<div class="card dsp"><b>⭐ Discover spotlight included</b><p>While your custom bot is active, your server is listed first on <a href="#/discover" style="color:var(--a)">Discover</a> with a yellow border.</p></div>
<h2 class="t" style="margin-top:70px">Questions</h2><div class="faq">${[['What happens in a server that has both?', 'Your bot answers and Arcane stays quiet, so nobody gets two replies. If your bot stops, Arcane takes over again.'], ['How do I cancel?', 'Just do not renew. It keeps running until the last day you paid for, then goes offline.'], ['Do I lose my settings if it lapses?', 'No. Settings belong to your server, not the bot.'], ['Can it do things Arcane can not?', 'No, and Arcane can not do anything Yapin’ does not allow bots to do. Every bot on Yapin’ has the same limits.'], ['Is my token safe?', 'It is encrypted at rest and never sent back to anyone. If you think it leaked, reset it in Yapin’ and paste the new one.']].map(([q, a]) => `<details><summary>${q}</summary><p>${a}</p></details>`).join('')}</div>
<div class="card" style="text-align:center;margin-top:50px;padding:34px"><h3 style="font-size:24px">Questions first?</h3><p style="margin:8px 0 18px">Ask in the support server.</p><a class="btn p" href="${CB.support}" target="_blank" rel="noopener">Support server</a></div>`;
};

// ── Embeds: start screen, then the builder ──
let picked = false;
window.embedsPage = async function () {
  if (picked) return builder();
  app.innerHTML = `<h2 class="t">Embeds</h2><p class="c">Build an embed or a card, then copy the code into <code>/sendembed</code> or anything else that takes a message.</p><h3 class="dh" style="text-align:center">What are you building?</h3><div class="grid" style="margin-top:20px;max-width:900px;margin-left:auto;margin-right:auto">${[['embed', '💬', 'Normal message', 'An embed with a title, text, fields, pictures and link buttons. Works everywhere.'], ['card', '🧩', 'Cards (Components V2)', 'Yapin’s newer layout: text, a picture beside a line, galleries and separators.'], ['imp', '📥', 'I already have a script', 'Paste code you made before and keep editing it.']].map(([k, i, t, d]) => `<button class="card pick" data-k="${k}"><div class="ic">${i}</div><h3>${t}</h3><p>${d}</p></button>`).join('')}</div>`;
  document.querySelectorAll('.pick').forEach((b) => (b.onclick = async () => { picked = true; if (b.dataset.k != 'imp') B.mode = b.dataset.k; await builder(); if (b.dataset.k == 'imp') { $('bi').style.display = 'block'; $('bit').focus(); } }));
};

// ── Docs: real default pages + previous/next ──
const _docs = docs;
window.docs = async function (id) {
  await _docs(id);
  const art = document.querySelector('article.md'); if (!art || !DOCS) return;
  const i = Math.max(0, DOCS.findIndex((d) => d.id == id)), p = DOCS[i - 1], n = DOCS[i + 1];
  art.insertAdjacentHTML('beforeend', `<div class="dnx">${p ? `<a href="#/docs/${p.id}">← ${E(p.title)}</a>` : '<span></span>'}${n ? `<a href="#/docs/${n.id}">Next: ${E(n.title)} →</a>` : ''}</div>`);
};

DOCS_D.length = 0;
DOCS_D.push(...[{"id": "getting-started", "title": "Getting started", "category": "Basics", "body": "# Getting started\nAdd Arcane to your server and set it up in a few minutes.\n\n## 1. Add the bot\nOn Yapin’, bots are added from the server: open **Server Settings → Bots**, find **Arcane** and add it.\n\n## 2. Give it permissions\nArcane acts through its role. Give that role the permissions for what you want it to do: **Ban**, **Kick**, **Timeout**, **Manage roles**, **Manage channels** and **Manage messages**. Put its role **above** the roles it should manage.\n\n```warn\nIf a command says it cannot give a role, move Arcane’s role higher in your role list.\n```\n\n## 3. Decide who can use what\nThe server owner and administrators can use every command. To let your moderators use `/warn`, `/timeout`, `/kick` and `/ban`, pick their roles in **Dashboard → General → Mod roles**, or run:\n\n```\n/config modrole add @Mods\n```\n\nSee [Permissions](#/docs/permissions).\n\n## 4. Open the dashboard\nOpen the [dashboard](#/dashboard) and press **Login with Yapin’**, then authorize. Arcane only sees your username and avatar. Pick your server and everything you change goes live within 15 seconds.\n\n## Prefixes\nCommands work with `/` or `!`. Run `/help` to see them all, or browse the [command list](#/commands)."}, {"id": "permissions", "title": "Permissions", "category": "Basics", "body": "# Permissions\nTwo things decide whether a command works: what **you** are allowed to do, and what **Arcane** is allowed to do.\n\n## What you need\n- **Everyone** can use fun, economy, leveling and utility commands.\n- **Mod roles** can use moderation commands (marked **MOD** on the [command list](#/commands)).\n- **Administrators and the server owner** always count as mods, and are the only ones who can change mod roles and verification settings.\n\n```tip\nSet mod roles in **Dashboard → General → Mod roles**. Pick as many as you like, a search box appears when you have many roles.\n```\n\n## What Arcane needs\n```embed\n{\"title\": \"Missing permissions\", \"description\": \"I can not do that. Give my role **Manage roles** and move it above the role you want me to manage.\", \"color\": \"#ef6b73\", \"footer\": {\"text\": \"Arcane\"}}\n```\n- Ban, Kick, Timeout for the moderation commands\n- Manage roles for verification, auto-role and level rewards\n- Manage channels for `/lock`, `/unlock` and `/slowmode`\n- Manage messages for `/purge` and automod\n\n## Bot owners\nPeople listed in the `BOT_OWNER_IDS` variable can open every server’s dashboard and edit the site’s docs, changelog and command list."}, {"id": "moderation", "title": "Moderation", "category": "Features", "body": "# Moderation\nWarn, timeout, kick and ban from chat. Every action gets a **case number** you can look up later.\n\n```embed\n{\"cmd\": \"/warn @Member spam\", \"title\": \"⚠️ Member warned\", \"description\": \"{user} has been warned.\", \"color\": \"#f5b84a\", \"fields\": [{\"name\": \"Reason\", \"value\": \"spam\"}, {\"name\": \"Warnings\", \"value\": \"1/5\", \"inline\": true}, {\"name\": \"Case\", \"value\": \"#14\", \"inline\": true}], \"footer\": {\"text\": \"Requested by YourMod\"}}\n```\n\n## Commands\n- `/warn @user [reason]` · `/warnings @user` · `/delwarn @user <number>` · `/clearwarns @user`\n- `/timeout @user 10m [reason]` · `/untimeout @user`\n- `/kick @user [reason]` · `/ban @user [reason]` · `/unban <user id>` · `/softban @user`\n- `/history @user` and `/case <number>`\n- `/purge 25 [@user]` · `/slowmode 10` · `/lock` · `/unlock`\n\n## Automatic punishments\n- **3 warnings:** 1 hour timeout\n- **5 warnings:** kick\n\n## Mod log\nEvery action is posted as a case card in your mod log channel. Set it in **Dashboard → General** or with `/config modlog #channel`.\n\n```note\nDurations accept minutes, hours and days: `30`, `10m`, `2h`, `1d`.\n```"}, {"id": "automod", "title": "Automod", "category": "Features", "body": "# Automod\nKeep chat clean without lifting a finger. Turn each filter on or off in **Dashboard → Automod**.\n\n```embed\n{\"title\": \"🛡️ Automod\", \"description\": \"{user}, invite links are not allowed here.\", \"color\": \"#f1c40f\"}\n```\n\n## Filters\n- **Spam:** 6 messages in 5 seconds gets a short timeout\n- **Links** and **Invites**\n- **Caps:** mostly capital letters\n- **Mentions:** mass-pinging people\n- **Banned words:** your own list, one comma-separated box in the dashboard\n\nMods are never touched by automod. Every automod action goes to your mod log.\n\n```tip\nAdd banned words in **Dashboard → Automod**, or `/config badword add <word>`.\n```"}, {"id": "levels", "title": "Levels", "category": "Features", "body": "# Levels\nMembers earn XP for chatting (once a minute), climb levels and unlock role rewards.\n\n```embed\n{\"title\": \"🎉 Level up!\", \"description\": \"{user} just reached **level 7**\", \"color\": \"#f5b942\", \"fields\": [{\"name\": \"Progress\", \"value\": \"▰▰▰▰▰▰▱▱▱▱▱▱ 1,840/2,100 XP\"}, {\"name\": \"Total XP\", \"value\": \"1,840\", \"inline\": true}, {\"name\": \"Rank\", \"value\": \"#3\", \"inline\": true}, {\"name\": \"Reward\", \"value\": \"Veteran\", \"inline\": true}], \"footer\": {\"text\": \"Keep yapping!\"}}\n```\n\n## Commands\n- `/rank [@user]` your level card\n- `/leaderboard` the top 10\n- `/levelrole add 10 Veteran` give a role at level 10\n- `/levelchannel set #channel` where level-ups go\n\n## Dashboard\nTurn XP on or off, pick the level-up channel and set the XP multiplier from **0.5 to 5** in **Dashboard → General**.\n\n```note\nServers listed on [Discover](#/discover) also get a public leaderboard page.\n```"}, {"id": "verification", "title": "Verification", "category": "Features", "body": "# Verification\nHold new members at the door until they click a button.\n\n## Set it up\n- Open **Dashboard → Verification**\n- Choose the verified role and a channel\n- Edit the embed and watch the preview update\n- Click **Save & post panel**\n\n```embed\n{\"title\": \"✦ WELCOME TO THE COMMUNITY\", \"description\": \"We’re glad to have you here! Before accessing the server, please complete verification.\", \"color\": \"#74c9f4\", \"fields\": [{\"name\": \"✧ HOW TO VERIFY\", \"value\": \"`01` · Read the server rules.\\n`02` · Click the verification button below.\\n`03` · Enjoy your stay!\"}, {\"name\": \"🔒 Secure Verification\", \"value\": \"Your verification helps keep the server safe and free from bots.\"}], \"footer\": {\"text\": \"Secure verification · one click\"}, \"buttons\": [{\"label\": \"✅ Verify\", \"url\": \"https://example.com\"}]}\n```\n\n## In chat\n- `/verify` shows help and setup commands\n- `/verify set role <role>` sets the verified role\n- `/verification [#channel]` posts the panel\n\n```warn\nMake sure Arcane’s role sits **above** the verified role, and hide your other channels from @everyone.\n```"}, {"id": "welcome", "title": "Welcome & goodbye", "category": "Features", "body": "# Welcome & goodbye\nGreet new members with a custom card. Set it up in **Dashboard → Welcome**.\n\n```embed\n{\"title\": \"Welcome to {server}!\", \"description\": \"Welcome {user}, you are our **{ordinal}** member.\\nRead the rules and say hi!\", \"color\": \"#8fdcff\", \"footer\": {\"text\": \"{count} members | Powered by Arcane\"}}\n```\n\n## Placeholders\n`{user}` `{username}` `{count}` `{ordinal}` `{server}` `{bot}`\n\n## In chat\n`/welcome set #channel`, then `title`, `message`, `image`, `footer`, `color`, `test` and `reset`. `/goodbye` works the same way.\n\n```tip\nWant something fancier? Build it in the [embed builder](#/embeds).\n```"}, {"id": "economy", "title": "Economy", "category": "Features", "body": "# Economy\nCoins to earn, spend and gamble.\n\n```embed\n{\"cmd\": \"/daily\", \"title\": \"🎁 Daily reward\", \"description\": \"You claimed your daily bonus!\", \"color\": \"#f5b942\", \"fields\": [{\"name\": \"XP\", \"value\": \"+142\", \"inline\": true}, {\"name\": \"Coins\", \"value\": \"+🪙 250\", \"inline\": true}, {\"name\": \"Streak\", \"value\": \"🔥 4 days\", \"inline\": true}]}\n```\n\n- `/daily` once a day, keep your streak for bigger rewards\n- `/work` once an hour\n- `/balance`, `/pay @user <amount>`, `/richest`\n- `/slots [bet]` and `/gamble <amount>`\n\n```note\nKeep your streak by claiming within 48 hours of the last daily.\n```"}, {"id": "embeds", "title": "Embed scripts", "category": "Features", "body": "# Embed scripts\nBuild a message in the [embed builder](#/embeds), copy the code and send it with `/sendembed`. No login needed.\n\n```embed\n{\"cmd\": \"/sendembed\", \"title\": \"📢 Server update\", \"description\": \"Embeds support **bold**, *italics*, __underline__, ~~strike~~, `code` and [links](https://example.com).\", \"color\": \"#8fdcff\", \"author\": {\"name\": \"Staff team\"}, \"fields\": [{\"name\": \"Starts\", \"value\": \"Friday 8pm\", \"inline\": true}, {\"name\": \"Where\", \"value\": \"#events\", \"inline\": true}], \"footer\": {\"text\": \"Arcane embeds\"}, \"timestamp\": true, \"buttons\": [{\"label\": \"Open the builder\", \"url\": \"https://example.com\"}]}\n```\n\n## Cards (Components V2)\nCards add text blocks, separators, a picture beside text, galleries and link buttons.\n\n```card\n[{\"type\": 17, \"accent_color\": \"#8fdcff\", \"components\": [{\"type\": 10, \"content\": \"# Cards\\nText, separators and buttons in one layout.\"}, {\"type\": 14, \"divider\": true}, {\"type\": 10, \"content\": \"Pick **Cards** in the builder.\"}, {\"type\": \"row\", \"components\": [{\"type\": \"button\", \"style\": \"link\", \"label\": \"Open the builder\", \"url\": \"https://example.com\"}]}]}]\n```\n\n## Placeholders\n`{user}` `{username}` `{server}` `{count}` `{ordinal}` are filled in when the message is sent.\n\n```tip\nDocs pages can show embeds too: paste the builder’s **Copy docs block** output into a page.\n```"}, {"id": "discover", "title": "Discover", "category": "Features", "body": "# Discover\nList your server on the public [Discover page](#/discover) with its icon and banner, plus a public leaderboard.\n\n- `!discover on` list your server\n- `!discover description <text>`\n- `!discover banner <https image>`\n- `!discover invite <https link>`\n- `!discover off` remove it\n\n```tip\nYou can also edit all of this in **Dashboard → Discover**. The leaderboard updates every 10 minutes.\n```"}, {"id": "faq", "title": "FAQ", "category": "Help", "body": "# FAQ\n## Commands do nothing\nCheck that Arcane can see and send in the channel, and that its role is above the roles it manages.\n\n## My dashboard changes did not apply\nThey reach the bot within 15 seconds. Refresh and check again.\n\n## Why do I not see my server in the dashboard?\nOnly the server owner (or a bot owner) can open its dashboard. Give Arcane a minute after joining.\n\n## Can I use `!` instead of `/`?\nYes, both work.\n\n## How do I get my server on Discover?\nRun `!discover on` in your server."}]);
})();
