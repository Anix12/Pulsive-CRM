/* Lead Views for the agent (user) dashboard.
 * Vanilla port of the CRM's Lead Views + manual-dial calling session, using the same API:
 *   /api/v1/lead-views, /api/v1/contacts?viewId=, /api/v1/calls/session, /api/v1/calls/:id/outcome
 * Nothing here dials automatically: the agent presses "Call now" on every lead, their own
 * mobile rings first, and disposing a lead never blocks the agent from calling another one.
 */
(function () {
  'use strict';

  const STAGES = ['NEW', 'CONTACTED', 'QUALIFIED', 'PROPERTY_SHARED', 'VISIT_SCHEDULED', 'VISIT_DONE', 'NEGOTIATION', 'BOOKING', 'CLOSED_WON', 'CLOSED_LOST'];
  const STATUS = { uncontacted: 'Uncontacted', in_progress: 'In progress', follow_up: 'Follow-up', not_connected: 'Not connected' };
  const SORTS = [['newest', 'Newest first (default)'], ['oldest', 'Oldest first'], ['name', 'Name A-Z'], ['score', 'Highest score']];
  // Retries shown next to a reason are informational only - nothing in the API enforces them yet.
  const REASONS = [
    { l: 'No Answer', r: 7 }, { l: 'Busy in another call', r: 3 }, { l: 'User disconnected the call', r: 1 },
    { l: 'Switch off', r: 1 }, { l: 'Out of Coverage area / Network issue', r: 1 }, { l: 'Call not connected / can not be completed', r: 1 },
    { l: 'Other reason', r: 1 }, { l: 'Incorrect / Invalid number' }, { l: 'Incoming calls not available' },
    { l: 'Number not in use / does not exists / out of service' },
  ];
  const FOLLOW = [{ k: '1h', l: '1 hour', ms: 3600e3 }, { k: '6h', l: '6 hours', ms: 6 * 3600e3 }, { k: '1d', l: '1 day', ms: 24 * 3600e3 }];
  const FAILED_TEXT = { FAILED: 'The call could not be placed', BUSY: 'The lead was busy', NO_ANSWER: 'Nobody answered', CANCELLED: 'The call was cancelled' };
  const TERMINAL = ['COMPLETED', 'FAILED', 'BUSY', 'NO_ANSWER', 'CANCELLED'];

  const STYLE = {
    'system:all': { ic: 'layers', tint: '#EDE9FE', fg: '#6D28D9', bar: 'linear-gradient(90deg,#8B5CF6,#D946EF)' },
    'system:uncontacted': { ic: 'phoneoff', tint: '#E0F2FE', fg: '#0369A1', bar: 'linear-gradient(90deg,#0EA5E9,#22D3EE)' },
    'system:in-progress': { ic: 'spark', tint: '#FEF3C7', fg: '#B45309', bar: 'linear-gradient(90deg,#F59E0B,#FB923C)' },
    'system:follow-up': { ic: 'clock', tint: '#D1FAE5', fg: '#047857', bar: 'linear-gradient(90deg,#10B981,#2DD4BF)' },
    'system:not-connected': { ic: 'phonemiss', tint: '#FFE4E6', fg: '#BE123C', bar: 'linear-gradient(90deg,#F43F5E,#F472B6)' },
  };
  const CUSTOM = { ic: 'layers', tint: '#EDE9FE', fg: '#6D28D9', bar: 'linear-gradient(90deg,#7C3AED,#6366F1)' };

  const P = {
    layers: '<path d="m12 2 9 5-9 5-9-5 9-5Z"/><path d="m3 12 9 5 9-5"/><path d="m3 17 9 5 9-5"/>',
    phone: '<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2Z"/>',
    phoneoff: '<path d="M10.7 13.3a16 16 0 0 0 3 2.3l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2v3a2 2 0 0 1-2.2 2A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8"/><path d="m2 2 20 20"/>',
    phonemiss: '<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2Z"/><path d="m16 2 6 6"/><path d="m22 2-6 6"/>',
    spark: '<path d="M12 3v3m0 12v3M3 12h3m12 0h3M5.6 5.6l2.1 2.1m8.6 8.6 2.1 2.1m0-12.8-2.1 2.1m-8.6 8.6-2.1 2.1"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    pencil: '<path d="M17 3a2.8 2.8 0 0 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>',
    trash: '<path d="M3 6h18"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
    clipboard: '<rect x="6" y="4" width="12" height="16" rx="2"/><path d="M9 4V3a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1"/><path d="M9 10h6M9 14h6"/>',
    eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    back: '<path d="m12 19-7-7 7-7"/><path d="M19 12H5"/>',
    up: '<path d="m18 15-6-6-6 6"/>',
    lock: '<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
    minus: '<path d="M5 12h14"/>',
    alert: '<path d="M12 3 2 20h20L12 3Z"/><path d="M12 10v4M12 17.5v.01"/>',
    hangup: '<path d="M10.7 13.3a16 16 0 0 0 3 2.3l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2v3a2 2 0 0 1-2.2 2A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7"/><path d="m2 2 20 20"/>',
    megaphone: '<path d="m3 11 18-5v12L3 14v-3z"/><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"/>',
    workflow: '<rect x="3" y="3" width="8" height="8" rx="2"/><path d="M7 11v4a2 2 0 0 0 2 2h4"/><rect x="13" y="13" width="8" height="8" rx="2"/>',
    flag: '<path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><path d="M4 22v-7"/>',
    cal: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
    sliders: '<path d="M4 6h16M7 12h10M10 18h4"/>',
    chevdown: '<path d="m6 9 6 6 6-6"/>',
    whatsapp: '<path d="M20.5 3.5a10.5 10.5 0 0 0-17.9 10L2 21l7.7-.6a10.5 10.5 0 0 0 15-15Z"/><path d="M8.5 8a1 1 0 0 1 1-1h.7a1 1 0 0 1 .9.6l.8 1.8a1 1 0 0 1-.2 1.1l-.7.7a6 6 0 0 0 3 3l.7-.7a1 1 0 0 1 1.1-.2l1.8.8a1 1 0 0 1 .6.9v.7a1 1 0 0 1-1 1c-4.4 0-8-3.6-8-8Z"/>',
    mic: '<rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10a7 7 0 0 0 14 0"/><path d="M12 19v3"/>',
    x: '<path d="M18 6 6 18M6 6l12 12"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>',
  };
  const ic = (n, s) => `<svg width="${s || 16}" height="${s || 16}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">${P[n] || ''}</svg>`;
  const esc = (v) => String(v == null ? '' : v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const clock = (t) => `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`;
  const initials = (n) => String(n || '?').split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase();
  const fmtDate = (d) => { try { return new Date(d).toLocaleString(undefined, { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }); } catch (e) { return ''; } };

  // ── state ─────────────────────────────────────────────────────────────────────
  const S = {
    views: null, loading: false, error: '',
    route: 'grid', // grid | list | session
    list: null, // { viewId, name, items, loading }
    modal: null, f: null, campaigns: null, modalError: '', saving: false,
    deleting: null, delError: '', starting: null,
    ses: null, call: null, lead: null, tab: 'info', d: null, dErr: '', dSaving: false,
    loadingNext: false, finished: false, needPhone: false, phone: '', callErr: '', calling: false, hanging: false, sendingMsg: false,
    flt: null, fd: null, fopen: null, q: '', allOpen: false, ad: null, at: 'Lead Details', opts: null, optsLoading: false,
    inited: false,
  };
  const LS = 'lv-session';
  const saveSes = () => { try { S.ses ? localStorage.setItem(LS, JSON.stringify(S.ses)) : localStorage.removeItem(LS); } catch (e) {} };
  const newDispose = () => ({ connected: null, reason: '', follow: null, custom: '', remark: '', reassign: false, copyCampaign: false, moveCampaign: false, msg: 'idle', stage: 'OPEN', answers: {} });
  const redraw = () => { if (typeof render === 'function') render(); };

  // ── api ───────────────────────────────────────────────────────────────────────
  async function refreshToken() {
    const rt = localStorage.getItem('refreshToken');
    if (!rt) return false;
    try {
      const r = await fetch('/api/v1/auth/refresh', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ refreshToken: rt }) });
      const j = await r.json();
      if (!r.ok || !j.data) return false;
      localStorage.setItem('accessToken', j.data.accessToken);
      localStorage.setItem('refreshToken', j.data.refreshToken);
      return true;
    } catch (e) { return false; }
  }
  async function api(path, method, body, retried) {
    const token = localStorage.getItem('accessToken');
    try {
      const res = await fetch('/api/v1' + path, {
        method: method || 'GET',
        headers: Object.assign({ 'Content-Type': 'application/json' }, token ? { Authorization: 'Bearer ' + token } : {}),
        body: body ? JSON.stringify(body) : undefined,
      });
      if (res.status === 401 && !retried && (await refreshToken())) return api(path, method, body, true);
      const j = await res.json().catch(() => ({}));
      if (!res.ok || j.success === false) return { ok: false, code: j.error && j.error.code, message: (j.error && j.error.message) || 'Request failed' };
      return { ok: true, data: j.data, meta: j.meta };
    } catch (e) { return { ok: false, message: 'Network error. Check your connection.' }; }
  }

  // ── call stage / timer ────────────────────────────────────────────────────────
  function stage() {
    if (!S.ses || !S.ses.callId) return 'none';
    const c = S.call;
    if (!c) return 'ringing-agent';
    if (['FAILED', 'BUSY', 'NO_ANSWER', 'CANCELLED'].includes(c.status)) return 'failed';
    if (c.status === 'COMPLETED') return 'ended';
    if (c.answeredAt) return 'live';
    if (c.status === 'IN_PROGRESS') return 'dialling-lead';
    return 'ringing-agent';
  }
  function seconds() {
    const c = S.call;
    if (!c || !c.answeredAt) return 0;
    if (!TERMINAL.includes(c.status)) return Math.max(0, Math.floor((Date.now() - new Date(c.answeredAt).getTime()) / 1000));
    if (c.duration != null) return c.duration;
    if (c.endedAt) return Math.max(0, Math.floor((new Date(c.endedAt).getTime() - new Date(c.answeredAt).getTime()) / 1000));
    return 0;
  }
  let pollT = null, tickT = null;
  function timers() {
    const on = !!(S.ses && S.ses.callId && !(S.call && TERMINAL.includes(S.call.status)));
    if (on && !pollT) { pollT = setInterval(poll, 2000); tickT = setInterval(tick, 1000); poll(); }
    if (!on && pollT) { clearInterval(pollT); clearInterval(tickT); pollT = tickT = null; }
  }
  function tick() {
    const t = clock(seconds());
    ['lv-timer', 'lv-bar-timer'].forEach((id) => { const el = document.getElementById(id); if (el) el.textContent = t; });
  }
  async function poll() {
    if (!S.ses || !S.ses.callId) return;
    const before = stage();
    const r = await api('/calls/' + S.ses.callId);
    if (!r.ok || !S.ses) return;
    S.call = r.data;
    if (TERMINAL.includes(r.data.status)) {
      S.ses.phase = 'disposing'; S.tab = 'dispose'; saveSes(); redraw();
    } else if (stage() !== before) redraw();
    else tick();
  }

  // ── data loading ──────────────────────────────────────────────────────────────
  async function loadViews() {
    S.loading = true; S.error = '';
    const r = await api('/lead-views');
    S.loading = false;
    if (r.ok) S.views = r.data; else S.error = r.message;
    redraw();
  }
  async function loadLead(id) {
    if (S.lead && S.lead.id === id) return;
    S.lead = { id, loading: true };
    const r = await api('/contacts/' + id);
    S.lead = r.ok ? r.data : { id, name: 'Lead unavailable', phone: '' };
    redraw();
  }
  async function init() {
    if (S.inited) return;
    S.inited = true;
    try { const raw = localStorage.getItem(LS); if (raw) S.ses = JSON.parse(raw); } catch (e) {}
    // An undisposed call (reload, other device) must not be lost.
    const r = await api('/calls/session/pending');
    if (r.ok && r.data && r.data.contactId && !(S.ses && S.ses.callId === r.data.id)) {
      S.ses = { viewId: null, viewName: 'Pending disposition', queue: [r.data.contactId], index: 0, callId: r.data.id, phase: 'disposing', minimized: true };
      S.tab = 'dispose'; S.d = newDispose(); saveSes();
    }
    if (S.ses && S.ses.callId) { const c = await api('/calls/' + S.ses.callId); if (c.ok) S.call = c.data; }
    redraw();
  }

  // ── grid ──────────────────────────────────────────────────────────────────────
  function card(v) {
    const st = v.isSystemDefault ? STYLE[v.id] || CUSTOM : CUSTOM;
    const onBreak = typeof state !== 'undefined' && state.brk && state.brk.onBreak;
    const dis = onBreak || (!v.isSystemDefault && v.leadCount === 0);
    return `<article class="lv-card">
      <div class="lv-bar" style="background:${st.bar}"></div>
      <div class="lv-card-body">
        <div class="lv-card-head">
          <div class="lv-ico" style="background:${st.tint};color:${st.fg}">${ic(st.ic, 20)}</div>
          <div style="min-width:0;flex:1"><h3 title="${esc(v.name)}">${esc(v.name)}</h3>
            <span class="lv-count" style="background:${st.tint};color:${st.fg}">${v.leadCount} ${v.leadCount === 1 ? 'lead' : 'leads'}</span></div>
          ${v.isSystemDefault ? '' : `<div class="lv-card-tools">
            <button class="lv-tool edit" aria-label="Edit" onclick="LV.edit('${v.id}')">${ic('pencil')}</button>
            <button class="lv-tool del" aria-label="Delete" onclick="LV.askDelete('${v.id}')">${ic('trash')}</button></div>`}
        </div>
        <p class="lv-desc">${v.isSystemDefault ? esc(v.description) : `<b>Filters:</b> ${esc(v.filtersSummary)}`}</p>
      </div>
      <div class="lv-card-foot">
        <button class="lv-btn lv-btn-soft" onclick="LV.open('${v.id}')">${ic('eye')} View</button>
        <span class="lv-tip"><button class="lv-btn lv-btn-outline" ${dis || S.starting ? 'disabled' : ''} onclick="LV.start('${v.id}')">${ic('phone')} ${S.starting === v.id ? 'Loading…' : 'Start calling'}</button>
          ${dis ? `<span class="lv-tt">${onBreak ? "You're on break" : 'No leads match this view'}</span>` : ''}</span>
      </div></article>`;
  }
  function skeleton() {
    return '<div class="lv-grid">' + Array.from({ length: 6 }, () => `<div class="lv-skel"><i style="height:6px;border-radius:0"></i><div style="padding:18px 20px"><i style="height:40px;width:40px;border-radius:12px"></i><i style="height:12px;margin-top:16px"></i><i style="height:12px;width:70%;margin-top:8px"></i></div><div style="padding:14px 20px;border-top:1px solid #F0F0F5;display:flex;gap:12px"><i style="height:32px;flex:1;border-radius:99px"></i><i style="height:32px;flex:1;border-radius:99px"></i></div></div>`).join('') + '</div>';
  }
  function gridHtml() {
    if (!S.views && !S.loading && !S.error) setTimeout(loadViews, 0);
    const sys = (S.views || []).filter((v) => v.isSystemDefault), cus = (S.views || []).filter((v) => !v.isSystemDefault);
    const resume = S.ses ? `<button class="lv-btn lv-btn-ghost" onclick="LV.resume()">${ic('phone')} Resume calling</button>` : '';
    return `<div class="lv-hero"><div style="position:relative"><h1>Lead views</h1>
      <p>Open a slice of your leads, or start calling it. You dial every lead yourself and dispose each call before the next one.</p></div>
      <div class="lv-actions">${resume}<button class="lv-btn lv-btn-white" onclick="LV.newView()">${ic('plus')} New view</button></div></div>
      ${S.error ? `<div class="lv-error">${esc(S.error)}</div>` : ''}
      ${!S.views && S.loading ? skeleton() : S.views ? `
        <div class="lv-section"><h2>System views</h2><span>Built in and always up to date</span></div>
        <div class="lv-grid">${sys.map(card).join('')}</div>
        <div class="lv-section"><h2>My views</h2><span>Filters you saved</span></div>
        ${cus.length ? `<div class="lv-grid">${cus.map(card).join('')}</div>` : `<div class="lv-empty"><div class="lv-ico">${ic('layers', 24)}</div>
          <h3>No custom views yet</h3><p>Save a combination of campaign, stage, status and date filters once, then open or start calling it in one click.</p>
          <button class="lv-btn lv-btn-solid" onclick="LV.newView()">${ic('plus')} Create your first view</button></div>`}` : ''}
      ${modalHtml()}${deleteHtml()}`;
  }

  // ── view lead list ────────────────────────────────────────────────────────────
  function listHtml() {
    const l = S.list;
    return `<div class="lv-listhead"><button class="lv-back" style="margin:0" onclick="LV.backToGrid()">${ic('back')} ${esc(l.name)}</button>
      <div class="lv-listtools"><button class="lv-btn lv-btn-solid" ${l.items && l.items.length ? '' : 'disabled'} onclick="LV.start('${esc(l.viewId)}')">${ic('phone')} Start calling</button>
        <label class="lv-search">${ic('search', 16)}<input placeholder="Search by name or number" value="${esc(S.q)}" onkeydown="if(event.key==='Enter')LV.search(this.value)"></label></div></div>
      ${filterBar()}
      <div class="lv-table">${l.loading ? '<div class="lv-wait"><div class="lv-spin"></div>Loading leads…</div>'
        : l.error ? `<div class="lv-error" style="margin:14px">${esc(l.error)}</div>`
        : !l.items.length ? '<div class="lv-wait">No leads match this view.</div>'
        : l.items.map((c, i) => `<div class="lv-tr"><span class="n">${i + 1}</span>
          <div class="avatar" style="background:${typeof colorFor === 'function' ? colorFor(c.name) : '#4F46E5'};width:34px;height:34px;font-size:12px">${esc(initials(c.name))}</div>
          <div style="flex:1;min-width:0"><div class="nm">${esc(c.name)}</div><div class="sb">${esc(c.company || '')} ${c.company ? '·' : ''} ${esc(c.phone)}</div></div>
          <span class="pill pill-neutral">${esc(c.status)}</span></div>`).join('')}</div>${allFiltersHtml()}`;
  }

  // ── lead list filters (Campaigns, Stages & Tags, Lead Status, Creation Date, All Filters) ──
  const EMPTY = () => ({ campaignIds: [], stagesTags: [], leadStatuses: [], datePreset: '', dateFrom: '', dateTo: '', name: '', phone: '', email: '', custom: {}, assignedToIds: [], followUp: '', includeClosed: false, viaSearch: false });
  const DATE_PRESETS = [['today', 'Today'], ['yesterday', 'Yesterday'], ['last7', 'Last 7 Days'], ['last30', 'Last 30 Days'], ['custom', 'Custom Date']];
  const FOLLOW_OPTS = [['today', 'Due today'], ['overdue', 'Overdue'], ['upcoming', 'Upcoming'], ['none', 'No follow-up scheduled']];
  const AF_TABS = ['Lead Details', 'Campaign', 'Assigned to', 'Follow-Up', 'Lead Status', 'Creation Date', 'Stages & Tags'];
  const pretty = (s) => (/^[A-Z_]+$/.test(s) ? s.toLowerCase().replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase()) : s);
  const fcount = (f) => (f.campaignIds.length ? 1 : 0) + (f.stagesTags.length ? 1 : 0) + (f.leadStatuses.length ? 1 : 0) + (f.datePreset ? 1 : 0)
    + (f.name || f.phone || f.email ? 1 : 0) + (Object.values(f.custom).some(Boolean) ? 1 : 0) + (f.assignedToIds.length ? 1 : 0) + (f.followUp ? 1 : 0);

  function fquery(f) {
    const q = [];
    const add = (k, v) => { if (v) q.push(k + '=' + encodeURIComponent(v)); };
    add('campaignIds', f.campaignIds.join(',')); add('stagesTags', f.stagesTags.join(',')); add('leadStatuses', f.leadStatuses.join(','));
    add('datePreset', f.datePreset);
    if (f.datePreset === 'custom') { add('dateFrom', f.dateFrom); add('dateTo', f.dateTo); }
    add('name', f.name); add('phone', f.phone); add('email', f.email);
    if (Object.values(f.custom).some(Boolean)) add('custom', JSON.stringify(f.custom));
    add('assignedToIds', f.assignedToIds.join(',')); add('followUp', f.followUp);
    if (f.viaSearch && !f.includeClosed) q.push('includeClosed=false'); // only the All Filters search hides converted and lost leads
    if (S.q) add('search', S.q);
    return q.join('&');
  }

  // option lists, keyed by the filter field they edit
  function optsFor(field) {
    const o = S.opts || { campaigns: [], users: [], stagesTags: [], customFields: [] };
    if (field === 'campaignIds') return o.campaigns.map((c) => [c.id, c.name]);
    if (field === 'assignedToIds') return [['unassigned', 'Unassigned']].concat(o.users.map((u) => [u.id, (u.firstName + ' ' + u.lastName).trim()]));
    if (field === 'stagesTags') return o.stagesTags.map((v) => [v, pretty(v)]);
    if (field === 'leadStatuses') return Object.keys(STATUS).map((k) => [k, k === 'in_progress' ? 'In-Progress' : STATUS[k]]);
    if (field === 'datePreset') return DATE_PRESETS;
    if (field === 'followUp') return FOLLOW_OPTS;
    return [];
  }
  async function loadOpts() {
    if (S.opts || S.optsLoading) return;
    S.optsLoading = true;
    const [c, u, o] = await Promise.all([api('/campaigns?limit=100'), api('/tenants/me/users'), api('/contacts/filter-options')]);
    S.opts = { campaigns: c.ok ? c.data : [], users: u.ok ? u.data : [], stagesTags: o.ok ? o.data.stages.concat(o.data.tags) : [], customFields: o.ok ? o.data.customFields : [] };
    S.optsLoading = false; redraw();
  }
  function optRows(field, draft, single) {
    const rows = optsFor(field);
    if (!rows.length) return '<div class="lv-wait" style="padding:24px 0">Nothing to choose from yet</div>';
    return '<div class="lv-opts">' + rows.map((r, i) => {
      const on = single ? draft[field] === r[0] : draft[field].includes(r[0]);
      return `<button type="button" class="lv-opt" onclick="LV.pick('${field}',${i},${single ? 1 : 0})"><span class="lv-${single ? 'rd' : 'cb'} ${on ? 'on' : ''}"></span><span class="${on ? 'sel' : ''}">${esc(r[1])}</span></button>`;
    }).join('') + '</div>';
  }
  const dateExtra = (d) => (d.datePreset === 'custom' ? `<div class="lv-row2" style="padding:8px 4px 0"><input type="date" class="lv-in" value="${esc(d.dateFrom)}" onchange="LV.setF('dateFrom',this.value)"><input type="date" class="lv-in" value="${esc(d.dateTo)}" onchange="LV.setF('dateTo',this.value)"></div>` : '');

  function dropdown(key, label, icon, count, field, single, extra) {
    const open = S.fopen === key;
    return `<div class="lv-fdd"><button type="button" class="lv-fbtn ${count || open ? 'act' : ''}" onclick="LV.toggleDD('${key}')">${ic(icon, 18)}<span>${label}</span>${count ? `<em>${count}</em>` : ''}${ic('chevdown', 15)}</button>
      ${open ? `<div class="lv-pop">${optRows(field, S.fd, single)}${extra ? extra(S.fd) : ''}<div class="lv-pop-foot"><button type="button" class="lv-btn lv-btn-solid" style="padding:8px 22px" onclick="LV.updateDD()">Update</button></div></div>` : ''}</div>`;
  }
  function filterBar() {
    if (!S.flt) S.flt = EMPTY();
    if (!S.opts) setTimeout(loadOpts, 0);
    const f = S.flt, total = fcount(f);
    return `<div class="lv-fbar">
      ${dropdown('campaigns', 'Campaigns', 'megaphone', f.campaignIds.length, 'campaignIds', false)}
      ${dropdown('stages', 'Stages & Tags', 'workflow', f.stagesTags.length, 'stagesTags', false)}
      ${dropdown('status', 'Lead Status', 'flag', f.leadStatuses.length, 'leadStatuses', false)}
      ${dropdown('date', 'Creation Date', 'cal', f.datePreset ? 1 : 0, 'datePreset', true, dateExtra)}
      <button type="button" class="lv-fbtn ${total ? 'act' : ''}" onclick="LV.openAll()">${ic('sliders', 18)}<span>All Filters</span>${total ? `<em>${total}</em>` : ''}</button>
      ${total ? '<button type="button" class="lv-clear" onclick="LV.clearFilters()">Clear filters</button>' : ''}</div>`;
  }

  function allFiltersHtml() {
    if (!S.allOpen) return '';
    const d = S.ad, t = S.at, filled = fcount(d) > 0;
    let body = '';
    if (t === 'Lead Details') {
      const cf = (S.opts && S.opts.customFields) || [];
      body = `<p class="lv-q">Basic Details</p>
        <input class="lv-in" placeholder="Contact Name" value="${esc(d.name)}" oninput="LV.ad.name=this.value;LV.afRefresh()" style="margin-bottom:12px">
        <input class="lv-in" placeholder="Contact Number" value="${esc(d.phone)}" oninput="LV.ad.phone=this.value;LV.afRefresh()" style="margin-bottom:12px">
        <input class="lv-in" placeholder="Email" value="${esc(d.email)}" oninput="LV.ad.email=this.value;LV.afRefresh()">
        ${cf.length ? `<p class="lv-q" style="margin-top:20px">Custom Contact Property</p>${cf.map((k, i) => `<input class="lv-in" placeholder="${esc(k)}" value="${esc(d.custom[k] || '')}" oninput="LV.setCustom(${i},this.value)" style="margin-bottom:12px">`).join('')}` : ''}`;
    } else if (t === 'Campaign') body = optRows('campaignIds', d, false);
    else if (t === 'Assigned to') body = optRows('assignedToIds', d, false);
    else if (t === 'Follow-Up') body = optRows('followUp', d, true);
    else if (t === 'Lead Status') body = optRows('leadStatuses', d, false);
    else if (t === 'Creation Date') body = optRows('datePreset', d, true) + dateExtra(d);
    else body = optRows('stagesTags', d, false);
    return `<div class="lv-overlay" onclick="if(event.target===this)LV.closeAll()"><div class="lv-modal lv-af">
      <div class="lv-af-head"><h2 style="color:var(--lv-purple)">Search</h2></div>
      <div class="lv-af-body"><nav class="lv-af-tabs">${AF_TABS.map((x, i) => `<button type="button" class="${t === x ? 'on' : ''}" onclick="LV.afTab(${i})">${x}</button>`).join('')}</nav><div class="lv-af-pane">${body}</div></div>
      <div class="lv-af-foot"><label class="lv-af-inc"><input type="checkbox" ${d.includeClosed ? 'checked' : ''} onchange="LV.ad.includeClosed=this.checked;LV.afRefresh()"><span class="lv-cb ${d.includeClosed ? 'on' : ''}"></span>Do you want to include converted and lost leads in your search?</label>
        <div style="display:flex;gap:10px"><button type="button" id="lv-af-reset" class="lv-btn lv-btn-plain" style="background:#F0F0F6" ${filled ? '' : 'disabled'} onclick="LV.afReset()">Reset</button>
        <button type="button" class="lv-btn lv-btn-outline" style="color:#14151A" onclick="LV.closeAll()">Cancel</button>
        <button type="button" id="lv-af-go" class="lv-btn lv-btn-solid" ${filled ? '' : 'disabled'} onclick="LV.afSearch()">Search</button></div></div></div></div>`;
  }

  function reloadList() {
    const l = S.list;
    if (!l) return;
    l.loading = true; l.error = ''; redraw();
    const id = l.viewId;
    api('/contacts?limit=100&viewId=' + encodeURIComponent(id) + '&' + fquery(S.flt || EMPTY())).then((r) => {
      if (!S.list || S.list.viewId !== id) return;
      S.list.loading = false; r.ok ? (S.list.items = r.data) : (S.list.error = r.message); redraw();
    });
  }
  document.addEventListener('mousedown', (e) => {
    if (S.fopen && !(e.target.closest && e.target.closest('.lv-fdd'))) { S.fopen = null; redraw(); }
  });

  // ── engagement form (shown on Yes Connected, editable via a small builder) ──────
  const EF_STAGES = ['OPEN', 'IN PROGRESS', 'INTERESTED', 'NOT INTERESTED', 'CONVERTED', 'LOST'];
  const EF_FIELD_TYPES = [['text', 'Short text'], ['radio', 'Multiple choice'], ['date', 'Date']];
  const efUid = () => Math.random().toString(36).slice(2, 10);
  const efNewSection = () => ({ id: efUid(), title: 'Untitled section', description: '', fields: [] });
  const efNewField = (type) => ({ id: efUid(), type, label: type === 'text' ? 'Question' : type === 'radio' ? 'Choose one' : 'Pick a date', options: type === 'radio' ? ['Option 1', 'Option 2'] : undefined, required: false });

  async function loadEngagementForm(campaignId) {
    const key = campaignId || '';
    if (S.ef && S.ef.key === key) return;
    S.ef = { key, loading: true, form: null };
    const r = await api('/engagement-forms/resolve' + (campaignId ? '?campaignId=' + encodeURIComponent(campaignId) : ''));
    if (S.ef.key !== key) return;
    S.ef.loading = false; S.ef.form = r.ok ? r.data : null;
    redraw();
  }

  function efFieldHtml(f, answers) {
    const v = answers[f.id];
    if (f.type === 'text') return `<input class="lv-in" placeholder="${esc(f.label)}" value="${esc(v || '')}" oninput="LV.setAnswer('${f.id}',this.value)">`;
    if (f.type === 'date') return `<input type="date" class="lv-in" value="${esc(v || '')}" onchange="LV.setAnswer('${f.id}',this.value)">`;
    return `<div class="lv-disp-reasons">${(f.options || []).map((o) => `<label class="lv-disp-radio" onclick="LV.setAnswer('${f.id}','${esc(o).replace(/'/g, "\\'")}')"><span class="rd ${v === o ? 'on' : ''}"></span><span>${esc(o)}</span></label>`).join('')}</div>`;
  }

  function engagementFormHtml(contactId) {
    if (!S.ef) return '';
    if (S.ef.loading) return '<div class="lv-wait" style="padding:24px 0"><div class="lv-spin"></div></div>';
    const form = S.ef.form;
    if (!form) {
      return `<p style="font-size:13px;color:#9497A3">No engagement form set up yet for this campaign. <button type="button" onclick="LV.openBuilder()" style="border:0;background:none;color:var(--lv-purple);font-weight:700;cursor:pointer;padding:0">Create one</button></p>`;
    }
    return form.schema.sections.map((sec) => `<div style="border:1px solid var(--border);border-radius:12px;overflow:hidden;margin-bottom:14px">
      ${sec.title ? `<div style="background:var(--lv-purple);color:#fff;padding:9px 14px;font-size:13px;font-weight:700">${esc(sec.title)}</div>` : ''}
      <div style="padding:14px;display:flex;flex-direction:column;gap:14px">
        ${sec.description ? `<p style="font-size:13px;color:#4B4E5B;margin:0">${esc(sec.description)}</p>` : ''}
        ${sec.fields.map((f) => `<div><label style="display:block;font-size:13px;color:#4B4E5B;margin-bottom:6px">${esc(f.label)}${f.required ? ' <span style="color:#F43F5E">*</span>' : ''}</label>${efFieldHtml(f, S.d.answers)}</div>`).join('')}
        ${sec.sendMessage && sec.sendMessage.enabled ? `<div><button class="lv-sendmsg" ${S.sendingEfMsg ? 'disabled' : ''} onclick="LV.sendEngagementMessage('${esc(sec.sendMessage.body || '').replace(/'/g, "\\'")}')">${ic('whatsapp', 15)} ${S.sendingEfMsg ? 'Sending…' : 'Send Message'}</button>${S.efMsg === 'sent' ? '<p class="lv-disp-note ok">Notification sent successfully.</p>' : S.efMsg === 'error' ? '<p class="lv-disp-note err">Could not send the message.</p>' : ''}</div>` : ''}
      </div></div>`).join('');
  }

  function engagementSectionHtml(contactId, campaignId) {
    loadEngagementForm(campaignId || null);
    const open = S.efOpen !== false;
    return `<div class="lv-disp-card" style="padding:0;overflow:hidden">
      <button type="button" onclick="LV.toggleEfOpen()" style="width:100%;display:flex;align-items:center;gap:8px;border:0;background:#fff;padding:16px 22px;text-align:left;font-size:14px;font-weight:700;color:#14151A;cursor:pointer;border-bottom:${open ? '1px solid #F0F0F5' : '0'}">
        ${ic('clipboard', 16)} Engagement Form
        <span onclick="event.stopPropagation();LV.openBuilder()" style="margin-left:auto;color:#9497A3;padding:4px;border-radius:8px" title="Edit engagement form">${ic('pencil', 15)}</span>
      </button>
      ${open ? `<div style="padding:18px 22px">
        ${engagementFormHtml(contactId)}
        <label style="display:block;font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#6B6E7B;margin:14px 0 6px">Stage <span style="color:#F43F5E">*</span></label>
        <select class="lv-in" onchange="LV.d.stage=this.value">${EF_STAGES.map((s) => `<option value="${s}" ${S.d.stage === s ? 'selected' : ''}>${s}</option>`).join('')}</select>
      </div>` : ''}
    </div>`;
  }

  // ── builder modal ────────────────────────────────────────────────────────────
  function builderHtml() {
    if (!S.efBuilder) return '';
    const b = S.efBuilder;
    const campaigns = (S.opts && S.opts.campaigns) || [];
    return `<div class="lv-overlay" onclick="if(event.target===this)LV.closeBuilder()"><div class="lv-modal" style="max-width:680px">
      <h2>Engagement form builder</h2><p class="sub">Shown to the agent on a Yes Connected call. Each section can also send a WhatsApp message.</p>
      <div class="lv-row2" style="margin-bottom:14px">
        <div class="lv-f"><label>Form name</label><input class="lv-in" value="${esc(b.name)}" oninput="LV.efSetName(this.value)"></div>
        <div class="lv-f"><label>Applies to</label><select class="lv-in" onchange="LV.efSetCampaign(this.value)">
          <option value="" ${!b.campaignId ? 'selected' : ''}>Tenant default (all campaigns without one of their own)</option>
          ${campaigns.map((c) => `<option value="${c.id}" ${b.campaignId === c.id ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}
        </select></div>
      </div>
      <div style="max-height:50vh;overflow-y:auto">
        ${b.schema.sections.map((sec, si) => `<div style="border:1px solid var(--border);border-radius:12px;overflow:hidden;margin-bottom:14px">
          <div style="display:flex;align-items:center;gap:8px;background:var(--lv-purple);padding:9px 14px">
            <input value="${esc(sec.title)}" oninput="LV.efSectionField(${si},'title',this.value)" placeholder="Untitled section" style="flex:1;border:0;background:transparent;color:#fff;font-size:13px;font-weight:700;outline:none">
            <button type="button" onclick="LV.efRemoveSection(${si})" style="border:0;background:none;color:rgba(255,255,255,.7);cursor:pointer">${ic('trash', 15)}</button>
          </div>
          <div style="padding:14px;display:flex;flex-direction:column;gap:12px">
            <textarea class="lv-in" rows="2" style="resize:none" placeholder="Script: Hello, my name is {{your_name}}. Thank you for your time!" oninput="LV.efSectionField(${si},'description',this.value)">${esc(sec.description || '')}</textarea>
            ${sec.fields.map((f, fi) => `<div style="border:1px solid #F0F0F5;background:#F9F9FB;border-radius:10px;padding:10px">
              <div style="display:flex;align-items:center;gap:8px">
                <select onchange="LV.efFieldType(${si},${fi},this.value)" style="width:150px;border:1px solid var(--border);border-radius:8px;padding:6px;font-size:12px">${EF_FIELD_TYPES.map((t) => `<option value="${t[0]}" ${f.type === t[0] ? 'selected' : ''}>${t[1]}</option>`).join('')}</select>
                <input value="${esc(f.label)}" oninput="LV.efFieldField(${si},${fi},'label',this.value)" placeholder="Question label" style="flex:1;border:1px solid var(--border);border-radius:8px;padding:6px 10px;font-size:13px">
                <label style="display:flex;align-items:center;gap:5px;font-size:11px;color:#6B6E7B;white-space:nowrap"><input type="checkbox" ${f.required ? 'checked' : ''} onchange="LV.efFieldField(${si},${fi},'required',this.checked)"> Required</label>
                <button type="button" onclick="LV.efRemoveField(${si},${fi})" style="border:0;background:none;color:#9497A3;cursor:pointer">${ic('trash', 14)}</button>
              </div>
              ${f.type === 'radio' ? `<div style="margin-top:8px;padding-left:8px;display:flex;flex-direction:column;gap:6px">
                ${(f.options || []).map((o, oi) => `<div style="display:flex;align-items:center;gap:8px"><span style="width:6px;height:6px;border-radius:50%;border:1px solid #9497A3"></span><input value="${esc(o)}" oninput="LV.efOption(${si},${fi},${oi},this.value)" style="flex:1;border:1px solid var(--border);border-radius:6px;padding:4px 8px;font-size:12px"><button type="button" onclick="LV.efRemoveOption(${si},${fi},${oi})" style="border:0;background:none;color:#D1D2DA;cursor:pointer">${ic('x', 11)}</button></div>`).join('')}
                <button type="button" onclick="LV.efAddOption(${si},${fi})" style="border:0;background:none;color:var(--lv-purple);font-size:12px;font-weight:700;cursor:pointer;text-align:left;padding-left:14px">+ Add option</button>
              </div>` : ''}
            </div>`).join('')}
            <div style="display:flex;flex-wrap:wrap;gap:8px">${EF_FIELD_TYPES.map((t) => `<button type="button" onclick="LV.efAddField(${si},'${t[0]}')" class="lv-chip">+ ${t[1]}</button>`).join('')}</div>
            <div style="border:1px solid #F0F0F5;background:#F9F9FB;border-radius:10px;padding:10px">
              <label style="display:flex;align-items:center;gap:8px;font-size:13px;font-weight:600;color:#3B3D49"><input type="checkbox" ${sec.sendMessage && sec.sendMessage.enabled ? 'checked' : ''} onchange="LV.efToggleSendMessage(${si},this.checked)"> ${ic('whatsapp', 15)} Show a "Send Message" button on this section</label>
              ${sec.sendMessage && sec.sendMessage.enabled ? `<input class="lv-in" style="margin-top:8px" placeholder="WhatsApp message to send" value="${esc(sec.sendMessage.body || '')}" oninput="LV.efSendMessageBody(${si},this.value)">` : ''}
            </div>
          </div></div>`).join('')}
        <button type="button" onclick="LV.efAddSection()" style="width:100%;border:2px dashed var(--border-strong);border-radius:12px;padding:12px;background:none;color:#6B6E7B;font-size:13px;font-weight:700;cursor:pointer">+ Add section</button>
      </div>
      ${b.err ? `<div class="lv-msg" style="margin-top:12px">${esc(b.err)}</div>` : ''}
      <div class="lv-modal-foot"><button class="lv-btn lv-btn-plain" onclick="LV.closeBuilder()">Cancel</button>
        <button class="lv-btn lv-btn-solid" ${b.saving ? 'disabled' : ''} onclick="LV.saveBuilder()">${b.saving ? 'Saving…' : 'Save'}</button></div>
    </div></div>`;
  }

  // ── create / edit modal ───────────────────────────────────────────────────────
  function modalHtml() {
    if (!S.modal) return '';
    const f = S.f;
    if (!S.campaigns) { S.campaigns = []; api('/campaigns?limit=100').then((r) => { S.campaigns = r.ok ? r.data : []; redraw(); }); }
    return `<div class="lv-overlay" onclick="if(event.target===this)LV.closeModal()"><div class="lv-modal">
      <h2>${S.modal.id ? 'Edit view' : 'Create a new view'}</h2><p class="sub">Choose the filters this view should apply. You can change them any time.</p>
      <div class="lv-f"><label>View name</label><input class="lv-in" maxlength="60" placeholder="e.g. Hot leads from IVR" value="${esc(f.name)}" oninput="LV.f.name=this.value"></div>
      <div class="lv-row2"><div class="lv-f"><label>Campaign</label><select class="lv-in" onchange="LV.f.campaignId=this.value">
        <option value="">All campaigns</option>${S.campaigns.map((c) => `<option value="${esc(c.id)}" ${f.campaignId === c.id ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}</select></div>
      <div class="lv-f"><label>Lead status</label><select class="lv-in" onchange="LV.f.leadStatus=this.value">
        <option value="">Any status</option>${Object.keys(STATUS).map((k) => `<option value="${k}" ${f.leadStatus === k ? 'selected' : ''}>${STATUS[k]}</option>`).join('')}</select></div></div>
      <div class="lv-f"><label>Stages</label><div class="lv-chips">${STAGES.map((s) => `<button type="button" class="lv-chip ${f.stages.includes(s) ? 'on' : ''}" onclick="LV.toggleStage('${s}')">${esc(s.toLowerCase().replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase()))}</button>`).join('')}</div></div>
      <div class="lv-f"><label>Tags</label><input class="lv-in" placeholder="Comma separated, e.g. b2b, tech" value="${esc(f.tags)}" oninput="LV.f.tags=this.value"></div>
      <div class="lv-row3"><div class="lv-f"><label>Created from</label><input type="date" class="lv-in" value="${esc(f.from)}" onchange="LV.f.from=this.value"></div>
        <div class="lv-f"><label>Created to</label><input type="date" class="lv-in" value="${esc(f.to)}" onchange="LV.f.to=this.value"></div>
        <div class="lv-f"><label>Sorting</label><select class="lv-in" onchange="LV.f.sortOrder=this.value">${SORTS.map((s) => `<option value="${s[0]}" ${f.sortOrder === s[0] ? 'selected' : ''}>${s[1]}</option>`).join('')}</select></div></div>
      ${S.modalError ? `<div class="lv-msg">${esc(S.modalError)}</div>` : ''}
      <div class="lv-modal-foot"><button class="lv-btn lv-btn-plain" onclick="LV.closeModal()">Cancel</button>
        <button class="lv-btn lv-btn-solid" ${S.saving ? 'disabled' : ''} onclick="LV.save()">${S.saving ? 'Saving…' : S.modal.id ? 'Save changes' : 'Create view'}</button></div>
    </div></div>`;
  }
  function deleteHtml() {
    if (!S.deleting) return '';
    return `<div class="lv-overlay" onclick="if(event.target===this)LV.cancelDelete()"><div class="lv-modal sm">
      <h2>Delete this view?</h2><p class="sub" style="margin-top:8px"><b>${esc(S.deleting.name)}</b> will be removed for everyone in your workspace. Your leads are not affected.</p>
      ${S.delError ? `<div class="lv-msg">${esc(S.delError)}</div>` : ''}
      <div class="lv-modal-foot" style="border:0;padding-top:0"><button class="lv-btn lv-btn-plain" onclick="LV.cancelDelete()">Cancel</button>
        <button class="lv-btn lv-btn-danger" onclick="LV.confirmDelete()">Delete view</button></div></div></div>`;
  }

  // ── session ───────────────────────────────────────────────────────────────────
  function heroHtml(lead) {
    const st = stage(), active = ['ringing-agent', 'dialling-lead', 'live'].includes(st), must = S.ses.phase === 'disposing';
    const text = st === 'ringing-agent' ? 'Ringing your mobile - pick up to connect' : st === 'dialling-lead' ? `Connecting you to ${esc(lead.name || 'the lead')}…`
      : st === 'live' ? 'Live conversation' : st === 'ended' ? 'Call ended' : st === 'failed' ? FAILED_TEXT[S.call && S.call.status] || 'Call not connected' : 'Ready when you are';
    const lead1 = [lead.jobTitle, lead.company].filter(Boolean).join(' · ') || 'No company on file';
    return `<section class="lv-callhero"><div class="lv-ch-top">
        <div class="lv-who"><div class="lv-av">${esc(initials(lead.name))}</div><div style="min-width:0"><div class="k">Now calling</div><h2>${esc(lead.name || '…')}</h2><div class="c">${esc(lead1)}</div></div></div>
        <div><div class="lv-timer" id="lv-timer">${clock(seconds())}</div>
          <div class="lv-status">${st === 'live' ? '<span class="lv-dot"></span>' : ['ringing-agent', 'dialling-lead'].includes(st) ? '<span class="lv-spin"></span>' : ''}${text}</div></div></div>
      <div class="lv-dial"><div class="num"><div class="k">Lead number</div><div class="v">${esc(lead.phone || '-')}</div>
        ${st === 'none' ? '<div class="h">We ring your mobile first, then connect the lead.</div>' : ''}</div>
        ${S.needPhone && st === 'none' ? `<input placeholder="Your mobile, e.g. +919876543210" value="${esc(LV.phone)}" oninput="LV.phone=this.value">` : ''}
        ${active ? `<button class="lv-btn lv-btn-danger" style="padding:13px 24px" ${S.hanging ? 'disabled' : ''} onclick="LV.hangup()">${ic('hangup')} ${S.hanging ? 'Ending…' : 'End call'}</button>`
          : `<button class="lv-btn lv-btn-white" style="padding:13px 24px" ${S.calling || st !== 'none' ? 'disabled' : ''} onclick="LV.call()">${ic('phone')} ${S.calling ? 'Calling your mobile…' : st === 'none' ? 'Call now' : 'Call finished'}</button>`}</div>
      ${S.callErr ? `<div class="lv-callerr">${esc(S.callErr)}</div>` : ''}</section>`;
  }
  const kv = (k, v) => `<div class="lv-kv"><span>${k}</span><b>${v ? esc(v) : '-'}</b></div>`;
  function infoTab(l) {
    return `<div class="lv-info"><div class="lv-box"><h4>About</h4>${kv('Name', l.name)}${kv('Mobile', l.phone)}${kv('Email', l.email)}${kv('Company', l.company)}${kv('Job title', l.jobTitle)}${kv('Created', l.createdAt && fmtDate(l.createdAt))}</div>
      <div class="lv-box"><h4>Lead progress</h4>${kv('Status', l.status)}${kv('Temperature', l.temperature)}${kv('Score', l.score)}${kv('Source', l.source)}${kv('Assigned to', l.assignedTo && l.assignedTo.firstName + ' ' + l.assignedTo.lastName)}${kv('Tags', (l.tags || []).join(', '))}</div></div>`;
  }
  function activityTab(l) {
    const a = l.activities || [];
    return a.length ? `<ul class="lv-tl" style="padding-left:20px;margin:0">${a.map((x) => `<li><b>${esc(x.subject)}</b>${x.body ? `<span>${esc(x.body)}</span><br>` : ''}<small>${fmtDate(x.occurredAt)}</small></li>`).join('')}</ul>` : '<div class="lv-wait">No activity yet for this lead.</div>';
  }
  function disposeHtml(elapsed, campaignId) {
    const d = S.d || (S.d = newDispose());
    const valid = d.connected !== null && (d.connected || d.reason) && (d.follow !== 'custom' || d.custom);
    return `<div class="lv-disp">
      <p class="lv-disp-timer">Time elapsed <span>${clock(elapsed)}</span></p>

      <div class="lv-disp-card">
        <p class="lv-disp-q">Was call connected?</p>
        <div class="lv-yn2">
          <button class="no ${d.connected === false ? 'on' : ''}" onclick="LV.setConn(false)">Not Connected</button>
          <button class="yes ${d.connected === true ? 'on' : ''}" onclick="LV.setConn(true)">Yes Connected</button>
        </div>
      </div>

      ${d.connected === false ? `<div class="lv-disp-card">
        <div style="display:flex;justify-content:center;margin-bottom:18px">
          <button class="lv-sendmsg" ${S.sendingMsg ? 'disabled' : ''} onclick="LV.sendMessage()">${ic('whatsapp', 15)} ${S.sendingMsg ? 'Sending…' : 'Send Message'}</button>
        </div>
        ${d.msg === 'sent' ? '<p class="lv-disp-note ok">Notification sent successfully.</p>' : ''}
        ${d.msg === 'error' ? '<p class="lv-disp-note err">Could not send the message.</p>' : ''}
        <p class="lv-disp-label">Please specify the reason? <span style="color:#F43F5E">*</span></p>
        <div class="lv-disp-reasons">${REASONS.map((r, i) => `<label class="lv-disp-radio" onclick="LV.setReason(${i})"><span class="rd ${d.reason === r.l ? 'on' : ''}"></span><span>${esc(r.l)}</span>${r.r != null ? `<em>(Retries left: ${r.r})</em>` : ''}</label>`).join('')}</div>
      </div>` : ''}

      ${d.connected === true ? engagementSectionHtml(S.ses.queue[S.ses.index], campaignId) : ''}

      ${d.connected !== null ? `<div class="lv-disp-card">
        <p class="lv-disp-label" style="font-weight:700;color:#14151A">Select next action:</p>
        <p class="lv-disp-label">Next follow-up in:</p>
        <div class="lv-chips" style="margin-bottom:${d.follow === 'custom' ? 10 : 16}px">${FOLLOW.concat([{ k: 'custom', l: 'Pick date & time' }]).map((f) => `<button class="lv-chip ${d.follow === f.k ? 'fu-on' : ''}" onclick="LV.setFollow('${f.k}')">${f.l}${d.follow === f.k ? ic('x', 12) : ''}</button>`).join('')}</div>
        ${d.follow === 'custom' ? `<input type="datetime-local" class="lv-in" style="max-width:260px;margin-bottom:16px" value="${esc(d.custom)}" onchange="LV.setDisposeCustom(this.value)">` : ''}
        <div class="lv-disp-checks">
          <label class="lv-disp-check" onclick="LV.toggleFlag('reassign')"><span class="lv-cb ${d.reassign ? 'on' : ''}"></span>Re-assign this lead?</label>
          <label class="lv-disp-check" onclick="LV.toggleFlag('copyCampaign')"><span class="lv-cb ${d.copyCampaign ? 'on' : ''}"></span>Copy lead to other campaign?</label>
          <label class="lv-disp-check" onclick="LV.toggleFlag('moveCampaign')"><span class="lv-cb ${d.moveCampaign ? 'on' : ''}"></span>Move lead to other campaign?</label>
        </div>
        <p class="lv-disp-label">Dispose Remark</p>
        <div style="position:relative"><input class="lv-in" style="padding-right:38px" placeholder="Enter remarks here" value="${esc(d.remark)}" oninput="LV.d.remark=this.value.slice(0,1500)">
          <span style="position:absolute;right:12px;top:50%;transform:translateY(-50%);color:#9497A3">${ic('mic', 16)}</span></div>
        <p style="text-align:right;font-size:12px;color:#9497A3;margin-top:4px">${d.remark.length}/1500</p>
      </div>` : ''}

      ${S.dErr ? `<div class="lv-msg" style="margin-top:4px">${esc(S.dErr)}</div>` : ''}
      <div style="display:flex;justify-content:center"><button class="lv-btn lv-btn-solid" style="padding:12px 40px" ${!valid || S.dSaving ? 'disabled' : ''} onclick="LV.submit()">${S.dSaving ? 'Saving…' : 'Submit'}</button></div>
    </div>`;
  }
  // Same global `state` the page's inline script owns - lead-views.js is a plain script
  // tag, not a module, so it shares that scope. Calling and the queue both stop here.
  function breakBlockHtml() {
    const endsAt = (typeof wdBrkEndsAt === 'function') ? wdBrkEndsAt() : null;
    const label = state.brk.presence && state.brk.presence.currentBreakLabel;
    return `<div class="lv-done">
      <div class="lv-ico" style="margin:0 auto;width:60px;height:60px;background:#FEF3C7;color:#B45309">${ic('alert', 28)}</div>
      <h1>You're on a break</h1>
      <p>${label ? esc(label) + ' &middot; ' : ''}Calling and your queue are paused until you're back.</p>
      ${endsAt ? `<p style="font-size:26px;font-weight:800;color:#B45309;margin:10px 0" id="wd-brk-clock-2">${wdBrkClock(endsAt - Date.now())}</p>` : ''}
      <button class="lv-btn lv-btn-solid" onclick="endBreak()">End break now and resume</button>
    </div>`;
  }
  function sessionHtml() {
    if (typeof state !== 'undefined' && state.brk && state.brk.onBreak) return breakBlockHtml();
    if (S.finished) return `<div class="lv-done"><div class="lv-ico" style="margin:0 auto;width:60px;height:60px;background:#D1FAE5;color:#047857">${ic('layers', 28)}</div><h1>Queue complete</h1><p>Every lead in this view has been called and disposed.</p><button class="lv-btn lv-btn-solid" onclick="LV.backToGrid()">Back to lead views</button></div>`;
    const ses = S.ses;
    const leadId = ses.queue[ses.index];
    loadLead(leadId);
    const lead = S.lead && S.lead.id === leadId ? S.lead : { id: leadId };
    const total = ses.queue.length, pct = Math.round((ses.index / total) * 100), must = ses.phase === 'disposing';
    const tabs = [['info', 'Lead information', false], ['dispose', 'Dispose lead', false], ['activity', 'Activity', false]];
    const body = S.loadingNext ? '<div class="lv-wait"><div class="lv-spin"></div>Loading next lead…</div>'
      : S.tab === 'info' ? infoTab(lead) : S.tab === 'activity' ? activityTab(lead)
      : disposeHtml(seconds(), lead.campaignId); // no call is required first - a lead can be disposed on its own at any time
    return `<div class="lv-ses"><aside class="lv-rail">
      <div class="lv-panel"><div class="lv-kicker">Calling from</div><h3 style="font-size:17px;color:var(--lv-purple);margin:4px 0 16px">${esc(ses.viewName)}</h3>
        <div style="display:flex;gap:14px;align-items:center"><div class="lv-ring" style="background:conic-gradient(#7C3AED ${pct * 3.6}deg,#EDE9FE 0deg)"><div>${pct}%</div></div>
        <div><div style="font-size:22px;font-weight:800">Lead ${ses.index + 1}<span style="font-size:14px;font-weight:500;color:#9497A3"> of ${total}</span></div><div style="font-size:12px;color:#6B6E7B">${ses.index} done · ${total - ses.index - 1} to go</div></div></div></div>
      <div class="lv-rule"><b>${ic('alert')} Manual dialling</b>Nothing is dialled for you. Call each lead yourself, then record the outcome whenever you are ready - disposing never blocks your next call.</div>
      <button class="lv-btn" style="width:100%;box-shadow:inset 0 0 0 1px var(--border-strong);background:#fff;color:#4B4E5B" onclick="LV.minimize()">${ic('minus')} Minimize</button></aside>
      <div style="min-width:0;display:flex;flex-direction:column;gap:20px">${heroHtml(lead)}
        <div class="lv-panel" style="padding:10px"><div class="lv-tabs">${tabs.map((t) => `<button class="lv-tab ${S.tab === t[0] ? 'on' : ''}" ${t[2] ? 'disabled' : ''} onclick="LV.setTab('${t[0]}')">${t[2] ? ic('lock', 13) : ''}${t[1]}${t[0] === 'dispose' && must ? '<span class="al"></span>' : ''}</button>`).join('')}</div>
        <div class="lv-tabbody">${body}</div></div></div></div>`;
  }

  // ── minimized bar ─────────────────────────────────────────────────────────────
  function bar() {
    init();
    if (!S.ses || !S.ses.minimized) return '';
    const st = stage(), live = st === 'live', must = S.ses.phase === 'disposing';
    return `<div class="lv-minibar"><button onclick="LV.maximize()">
      <span class="pi ${['ringing-agent', 'dialling-lead', 'live'].includes(st) ? 'ping' : ''}">${ic('phone', 19)}</span>
      <span class="tx"><b>Maximize to go back to calling</b><small>Lead ${S.ses.index + 1} of ${S.ses.queue.length}${live ? ` · Live <span id="lv-bar-timer">${clock(seconds())}</span>` : ''}${must ? ' · Not disposed yet' : ''}</small></span>
      <span class="up">${ic('up', 19)}</span></button></div>`;
  }

  // ── public api (inline handlers) ──────────────────────────────────────────────
  const LV = window.LV = {
    f: null, d: null, phone: '',
    render() {
      init();
      let html;
      if (S.ses && S.route === 'session' && !S.ses.minimized) html = sessionHtml();
      else if (S.route === 'list' && S.list) html = listHtml();
      else html = gridHtml();
      setTimeout(timers, 0);
      return html + builderHtml();
    },
    bar,
    open(id) {
      const v = (S.views || []).find((x) => x.id === id);
      S.list = { viewId: id, name: v ? v.name : 'Leads', items: [], loading: true };
      S.flt = EMPTY(); S.q = ''; S.fopen = null; S.allOpen = false;
      S.route = 'list'; reloadList();
    },
    // list filters
    get ad() { return S.ad; },
    toggleDD(key) {
      if (S.fopen === key) { S.fopen = null; return redraw(); }
      S.fopen = key; S.fd = JSON.parse(JSON.stringify(S.flt || EMPTY())); redraw();
    },
    pick(field, i, single) {
      const v = optsFor(field)[i][0], d = S.allOpen ? S.ad : S.fd;
      if (single) d[field] = d[field] === v ? '' : v;
      else { const a = d[field]; a.includes(v) ? a.splice(a.indexOf(v), 1) : a.push(v); }
      redraw();
    },
    setF(k, v) { (S.allOpen ? S.ad : S.fd)[k] = v; },
    updateDD() { S.flt = S.fd; S.fopen = null; reloadList(); },
    clearFilters() { S.flt = EMPTY(); S.q = ''; reloadList(); },
    search(v) { S.q = v.trim(); reloadList(); },
    openAll() { S.fopen = null; S.allOpen = true; S.at = 'Lead Details'; S.ad = JSON.parse(JSON.stringify(S.flt || EMPTY())); redraw(); },
    closeAll() { S.allOpen = false; redraw(); },
    afTab(i) { S.at = AF_TABS[i]; redraw(); },
    setCustom(i, v) { const k = S.opts.customFields[i]; S.ad.custom[k] = v; LV.afRefresh(); },
    // typing must not re-render (it would drop focus), so only the two buttons are toggled
    afRefresh() {
      const on = fcount(S.ad) > 0;
      ['lv-af-go', 'lv-af-reset'].forEach((id) => { const b = document.getElementById(id); if (b) b.disabled = !on; });
    },
    afReset() { S.ad = EMPTY(); redraw(); },
    afSearch() { S.ad.viaSearch = true; S.flt = S.ad; S.allOpen = false; reloadList(); },
    setAnswer(id, v) { S.d.answers[id] = v; redraw(); },
    toggleEfOpen() { S.efOpen = S.efOpen === false ? true : false; redraw(); },
    async sendEngagementMessage(body) {
      const contactId = S.ses.queue[S.ses.index];
      S.sendingEfMsg = true; redraw();
      const r = await api('/messages', 'POST', { contactId, channel: 'WHATSAPP', body: body || 'Thanks for your time!' });
      S.sendingEfMsg = false; S.efMsg = r.ok ? 'sent' : 'error'; redraw();
    },
    openBuilder() {
      const form = S.ef && S.ef.form;
      S.efBuilder = {
        id: form ? form.id : undefined,
        name: form ? form.name : 'Engagement form',
        campaignId: form ? form.campaignId : null,
        schema: form ? JSON.parse(JSON.stringify(form.schema)) : { sections: [efNewSection()] },
        err: '', saving: false,
      };
      if (!S.opts) loadOpts(); else redraw();
    },
    closeBuilder() { S.efBuilder = null; redraw(); },
    efSetName(v) { S.efBuilder.name = v; },
    efSetCampaign(v) { S.efBuilder.campaignId = v || null; },
    efSectionField(si, key, v) { S.efBuilder.schema.sections[si][key] = v; },
    efAddSection() { S.efBuilder.schema.sections.push(efNewSection()); redraw(); },
    efRemoveSection(si) { S.efBuilder.schema.sections.splice(si, 1); redraw(); },
    efAddField(si, type) { S.efBuilder.schema.sections[si].fields.push(efNewField(type)); redraw(); },
    efRemoveField(si, fi) { S.efBuilder.schema.sections[si].fields.splice(fi, 1); redraw(); },
    efFieldType(si, fi, type) {
      const f = S.efBuilder.schema.sections[si].fields[fi];
      f.type = type; f.options = type === 'radio' ? (f.options || ['Option 1', 'Option 2']) : undefined;
      redraw();
    },
    efFieldField(si, fi, key, v) { S.efBuilder.schema.sections[si].fields[fi][key] = v; },
    efOption(si, fi, oi, v) { S.efBuilder.schema.sections[si].fields[fi].options[oi] = v; },
    efAddOption(si, fi) { const f = S.efBuilder.schema.sections[si].fields[fi]; f.options = (f.options || []).concat(`Option ${(f.options || []).length + 1}`); redraw(); },
    efRemoveOption(si, fi, oi) { S.efBuilder.schema.sections[si].fields[fi].options.splice(oi, 1); redraw(); },
    efToggleSendMessage(si, on) { S.efBuilder.schema.sections[si].sendMessage = { enabled: on, body: (S.efBuilder.schema.sections[si].sendMessage || {}).body }; redraw(); },
    efSendMessageBody(si, v) { S.efBuilder.schema.sections[si].sendMessage.body = v; },
    async saveBuilder() {
      const b = S.efBuilder;
      if (!b.name.trim()) { b.err = 'Give the form a name'; return redraw(); }
      b.err = ''; b.saving = true; redraw();
      const body = { name: b.name.trim(), campaignId: b.campaignId, schema: b.schema };
      const r = b.id ? await api('/engagement-forms/' + b.id, 'PATCH', body) : await api('/engagement-forms', 'POST', body);
      b.saving = false;
      if (!r.ok) { b.err = r.message; return redraw(); }
      S.efBuilder = null; S.ef = null; redraw();
    },
    backToGrid() { S.route = 'grid'; S.list = null; S.finished = false; if (S.views) S.views = null; redraw(); },
    async start(id) {
      S.error = '';
      if (typeof state !== 'undefined' && state.brk && state.brk.onBreak) { S.error = "You're on break - end it to start calling"; return redraw(); }
      if (S.ses) return LV.resume();
      S.starting = id; redraw();
      const r = await api('/lead-views/' + encodeURIComponent(id) + '/queue');
      S.starting = null;
      if (!r.ok) { S.error = r.message; return redraw(); }
      if (!r.data.leadIds.length) { S.error = 'No leads match this view'; return redraw(); }
      S.ses = { viewId: id, viewName: r.data.viewName, queue: r.data.leadIds, index: 0, callId: null, phase: 'idle', minimized: false };
      S.call = null; S.lead = null; S.tab = 'info'; S.d = newDispose(); S.finished = false; S.callErr = ''; S.needPhone = false;
      saveSes(); S.route = 'session'; redraw();
    },
    // Same session mechanics as start(), but for a queue built elsewhere (e.g. a
    // campaign's leads) instead of a Lead View's resolved queue.
    startQueue(viewId, viewName, leadIds) {
      S.error = '';
      if (S.ses) return LV.resume();
      if (!leadIds.length) return false;
      S.ses = { viewId, viewName, queue: leadIds, index: 0, callId: null, phase: 'idle', minimized: false };
      S.call = null; S.lead = null; S.tab = 'info'; S.d = newDispose(); S.finished = false; S.callErr = ''; S.needPhone = false;
      saveSes(); S.route = 'session'; if (typeof state !== 'undefined') state.view = 'leads'; redraw();
      return true;
    },
    resume() { if (!S.ses) return; S.ses.minimized = false; S.route = 'session'; saveSes(); if (typeof state !== 'undefined') state.view = 'leads'; redraw(); },
    maximize() { LV.resume(); },
    hasActiveSession() { return !!S.ses; },
    minimize() { S.ses.minimized = true; S.route = 'grid'; saveSes(); redraw(); },
    // Called from the header's Take a Break button. No End Session mid-queue any more -
    // a break is the only thing that steps the agent out of an active calling queue.
    pauseForBreak() { if (S.ses) { S.ses.minimized = true; S.route = 'grid'; saveSes(); redraw(); } },
    endSession() { if (S.ses && S.ses.phase === 'idle') { S.ses = null; S.call = null; saveSes(); S.route = 'grid'; redraw(); } },
    setTab(t) { S.tab = t; redraw(); },
    // manual dial: the only thing that ever places a call
    async call() {
      S.callErr = ''; S.calling = true; redraw();
      const r = await api('/calls/session', 'POST', { contactId: S.ses.queue[S.ses.index], agentPhone: (LV.phone || '').trim() || undefined });
      S.calling = false;
      if (r.ok) { S.needPhone = false; S.ses.callId = r.data.id; S.ses.phase = 'calling'; S.call = r.data; saveSes(); return redraw(); }
      if (r.code === 'AGENT_PHONE_REQUIRED') S.needPhone = true;
      S.callErr = r.message; redraw();
    },
    async hangup() {
      S.hanging = true; redraw();
      const r = await api('/calls/' + S.ses.callId + '/hangup', 'POST');
      S.hanging = false; if (!r.ok) S.callErr = r.message; redraw(); poll();
    },
    setConn(v) { S.d.connected = v; S.d.reason = ''; redraw(); },
    setReason(i) { S.d.reason = REASONS[i].l; redraw(); },
    setFollow(k) { S.d.follow = S.d.follow === k ? null : k; redraw(); },
    setDisposeCustom(v) { S.d.custom = v; redraw(); },
    toggleFlag(k) { S.d[k] = !S.d[k]; redraw(); },
    async sendMessage() {
      const contactId = S.ses.queue[S.ses.index];
      S.sendingMsg = true; redraw();
      const r = await api('/messages', 'POST', { contactId, channel: 'WHATSAPP', body: 'Hi, we tried reaching you on call. Please call us back or reply here.' });
      S.sendingMsg = false; S.d.msg = r.ok ? 'sent' : 'error'; redraw();
    },
    async submit() {
      const d = S.d; let at;
      if (d.follow === 'custom' && d.custom) at = new Date(d.custom).toISOString();
      else { const p = FOLLOW.find((f) => f.k === d.follow); if (p) at = new Date(Date.now() + p.ms).toISOString(); }
      S.dErr = ''; S.dSaving = true; redraw();
      const body = {
        connected: d.connected, reason: d.connected ? undefined : d.reason, remark: (d.remark || '').trim() || undefined, followUpAt: at,
        stage: d.connected ? d.stage : undefined,
        engagementFormId: d.connected && S.ef && S.ef.form ? S.ef.form.id : undefined,
        answers: d.connected && Object.keys(d.answers).length ? d.answers : undefined,
      };
      // No call placed for this lead yet -> dispose it directly by contact id.
      const r = S.ses.callId ? await api('/calls/' + S.ses.callId + '/outcome', 'POST', body)
        : await api('/calls/session/dispose', 'POST', Object.assign({ contactId: S.ses.queue[S.ses.index] }, body));
      S.dSaving = false;
      if (!r.ok) { S.dErr = r.message; return redraw(); }
      S.views = null; // counts changed
      const last = S.ses.index + 1 >= S.ses.queue.length;
      S.loadingNext = true; redraw();
      setTimeout(() => {
        S.loadingNext = false; S.call = null; S.d = newDispose(); S.tab = 'info'; S.lead = null; S.callErr = ''; S.ef = null; S.efOpen = true;
        if (last) { S.ses = null; S.finished = true; } else { S.ses.index += 1; S.ses.callId = null; S.ses.phase = 'idle'; }
        saveSes(); redraw();
      }, 700);
    },
    // create / edit
    newView() { S.modal = {}; S.f = LV.f = { name: '', campaignId: '', leadStatus: '', stages: [], tags: '', from: '', to: '', sortOrder: 'newest' }; S.modalError = ''; redraw(); },
    edit(id) {
      const v = S.views.find((x) => x.id === id), f = v.filters || {};
      S.modal = { id }; S.modalError = '';
      S.f = LV.f = { name: v.name, campaignId: f.campaignId || '', leadStatus: f.leadStatus || '', stages: (f.stagesAndTags && f.stagesAndTags.stages) || [], tags: ((f.stagesAndTags && f.stagesAndTags.tags) || []).join(', '),
        from: (f.creationDateRange && f.creationDateRange.from || '').slice(0, 10), to: (f.creationDateRange && f.creationDateRange.to || '').slice(0, 10), sortOrder: f.sortOrder || 'newest' };
      redraw();
    },
    toggleStage(s) { const a = S.f.stages; a.includes(s) ? a.splice(a.indexOf(s), 1) : a.push(s); redraw(); },
    closeModal() { S.modal = null; redraw(); },
    async save() {
      const f = S.f;
      if (!f.name.trim()) { S.modalError = 'Give your view a name'; return redraw(); }
      S.saving = true; S.modalError = ''; redraw();
      const body = { name: f.name.trim(), filters: { campaignId: f.campaignId || null, leadStatus: f.leadStatus || null,
        stagesAndTags: { stages: f.stages, tags: f.tags.split(',').map((t) => t.trim()).filter(Boolean) },
        creationDateRange: { from: f.from ? new Date(f.from).toISOString() : null, to: f.to ? new Date(f.to + 'T23:59:59').toISOString() : null }, sortOrder: f.sortOrder } };
      const r = S.modal.id ? await api('/lead-views/' + S.modal.id, 'PATCH', body) : await api('/lead-views', 'POST', body);
      S.saving = false;
      if (!r.ok) { S.modalError = r.message; return redraw(); }
      S.modal = null; S.views = null; redraw();
    },
    askDelete(id) { S.deleting = S.views.find((v) => v.id === id); S.delError = ''; redraw(); },
    cancelDelete() { S.deleting = null; redraw(); },
    async confirmDelete() {
      const r = await api('/lead-views/' + S.deleting.id, 'DELETE');
      if (!r.ok) { S.delError = r.message; return redraw(); }
      S.deleting = null; S.views = null; redraw();
    },
  };
  Object.defineProperty(LV, 'd', { get() { return S.d; } });
})();
