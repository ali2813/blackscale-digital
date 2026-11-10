(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const consoleEl = $('#console');
  if (!consoleEl) return;

  const screen = $('#screen');
  const viewport = $('.viewport');
  const cursor = $('#cursor');
  const log = $('#log');
  const finding = $('#finding');
  const avatar = $('#avatarLive');
  const eyes = $('#eyes');
  const timerEl = $('#runTimer');
  const statusEl = $('#agentStatus');
  const stepCount = $('#stepCount');
  const tabs = [...document.querySelectorAll('.tabs button')];
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const v = (key) => screen.querySelector(`[data-v="${key}"]`);
  const t = (key) => screen.querySelector(`[data-t="${key}"]`);

  const evRow = (time, code, text, flag = false) =>
    `<div class="ev${flag ? ' flag' : ''}"><span>${time}</span><span>${code}</span><span class="p">${text}</span></div>`;

  const MODES = {
    qa: {
      name: 'Probe',
      role: 'Reliability QA',
      url: 'staging.ledgerline.app/settings/billing',
      screen: `
        <div class="app">
          <div class="app-side">
            <div class="app-logo">Ledgerline</div>
            <span>Overview</span><span>Invoices</span><span class="on">Billing</span><span>Team</span>
          </div>
          <div class="app-main">
            <h4>Plan and billing</h4>
            <div class="plans">
              <div class="plan sel" data-t="starter"><b>Starter</b><small>$12 / seat / mo</small></div>
              <div class="plan" data-t="team"><b>Team</b><small>$24 / seat / mo</small></div>
            </div>
            <div class="row2">
              <div class="field">Seats<div class="input" data-t="seats" data-v="seats">8</div></div>
              <div class="field">Coupon<div class="input" data-t="coupon" data-v="coupon"></div></div>
            </div>
            <div class="summary" data-t="summary"><span>Due today (prorated)</span><b data-v="total">$48.00</b></div>
            <div class="app-btn" data-t="confirm">Confirm upgrade</div>
          </div>
        </div>`,
      steps: [
        { k: 'info', msg: 'Sign in as owner@acme-test.dev (seeded test account)' },
        { k: 'ok', msg: 'Billing page loaded in 412 ms, 0 console errors' },
        { k: 'act', to: 'team', msg: 'Select plan Team ($24 / seat)', act() {
          t('starter').classList.remove('sel'); t('team').classList.add('sel'); v('total').textContent = '$96.00';
        } },
        { k: 'act', to: 'coupon', msg: 'Apply coupon LAUNCH20', act() {
          v('coupon').innerHTML = 'LAUNCH20<span class="chip-coupon" data-v="chip">−20%</span>'; v('total').textContent = '$76.80';
        } },
        { k: 'ok', to: 'summary', msg: '8 seats × $24, 15 of 30 days left, 20% off = $76.80. Matches.' },
        { k: 'act', to: 'seats', msg: 'Change seats from 8 to 12', act() {
          v('seats').textContent = '12'; v('total').textContent = '$144.00'; v('chip')?.classList.add('gone');
        } },
        { k: 'fail', to: 'summary', msg: 'Due today shows $144.00, expected $115.20. Coupon dropped after the seat change.' },
        { k: 'act', to: 'confirm', msg: 'Confirm upgrade. POST /api/subscription → 200' },
        { k: 'fail', msg: 'Invoice INV-2291 charged $144.00. Customer overbilled by $28.80.' },
        { k: 'info', msg: 'Bisected: passes on 7e02b1f, fails on a41c9e2' },
      ],
      done: 'Finding filed',
      finding: `
        <div class="finding-title">
          <span class="sev sev-med">Medium · regression</span>
          <h3>Coupon is removed when the seat count changes before an upgrade</h3>
          <div class="finding-meta"><span>Deploy a41c9e2</span><span>Last good 7e02b1f</span><span>Video trace 0:38</span></div>
        </div>
        <div>
          <ol>
            <li>Sign in as an owner on the Starter plan</li>
            <li>Select Team and apply coupon LAUNCH20</li>
            <li>Change seats from 8 to 12</li>
            <li>Due today shows $144.00 instead of $115.20</li>
          </ol>
        </div>`,
    },

    red: {
      name: 'Breach',
      role: 'Red team',
      url: 'staging.ledgerline.app/api  ·  authorized run BSC-114',
      screen: `
        <div class="req">
          <div class="req-scope"><span>scope: staging.ledgerline.app</span><span>window 02:00–04:00 UTC</span><span>auth BSC-114</span></div>
          <div class="req-box" data-t="req">
            <div><span class="m" data-v="method">GET</span><span data-v="path">/api/session</span></div>
            <div class="dim">Authorization: Bearer ‹tenant A session›</div>
          </div>
          <div class="req-box" data-t="resp">
            <div>Response <span class="code" data-v="code">—</span></div>
            <pre class="resp-body" data-v="body">waiting for request</pre>
          </div>
        </div>`,
      steps: [
        { k: 'info', msg: 'Loaded scope BSC-114: staging only, tenants A and B are test accounts' },
        { k: 'act', to: 'req', msg: 'Send 11 logins with a wrong password', act() {
          req('POST', '/api/login', 429, true, '{ "error": "too_many_attempts",\n  "retry_after": 60 }');
        } },
        { k: 'ok', to: 'resp', msg: 'Rate limit holds: 429 after 10 attempts' },
        { k: 'act', to: 'req', msg: 'Request own invoice INV-2291 as tenant A', act() {
          req('GET', '/api/invoices/INV-2291', 200, true, '{ "id": "INV-2291",\n  "tenant": "acme-test",\n  "total": "144.00" }');
        } },
        { k: 'ok', to: 'resp', msg: '200, invoice owner matches the session' },
        { k: 'act', to: 'req', msg: 'Change the id to INV-2290, keep the same session', act() {
          req('GET', '/api/invoices/INV-2290', 200, false,
            '{ "id": "INV-2290",\n  "tenant": "<span class="leak">globex-test</span>",\n  "email": "<span class="leak">billing@globex-test.dev</span>",\n  "card_last4": "<span class="leak">4242</span>" }');
        } },
        { k: 'fail', to: 'resp', msg: 'Tenant A can read tenant B\'s invoice. Object-level authorization is missing.' },
        { k: 'act', to: 'req', msg: 'Set company name to a script tag payload', act() {
          req('PATCH', '/api/company', 200, true, '{ "name": "&lt;script&gt;alert(1)&lt;/script&gt;" }');
        } },
        { k: 'ok', to: 'resp', msg: 'Payload is escaped on every page that renders it' },
        { k: 'info', msg: 'Stopped at proof. Response kept as evidence, no data retained.' },
      ],
      done: 'Finding filed',
      finding: `
        <div class="finding-title">
          <span class="sev sev-high">High · tenant isolation</span>
          <h3>Invoice API returns other tenants' invoices when the id is changed</h3>
          <div class="finding-meta"><span>CWE-639</span><span>OWASP API1:2023</span><span>Found 02:14 UTC</span></div>
        </div>
        <div class="fix">
          <p><b>Fix:</b> look up invoices by id and the tenant from the session, never by id alone.</p>
          <p style="margin-top:8px">Sent to Warden to build a detection for this pattern.</p>
        </div>`,
    },

    blue: {
      name: 'Warden',
      role: 'Blue team',
      url: 'logs · ledgerline-staging · api-gateway',
      screen: `
        <div class="events">
          <div class="ev-table" data-t="table" data-v="rows">
            ${evRow('02:13:58', '200', 'GET /api/session · tenant=acme-test')}
            ${evRow('02:14:02', '200', 'GET /api/invoices/INV-2291 · tenant=acme-test')}
          </div>
          <div class="rule-label">Detection draft</div>
          <div class="rule" data-t="rule" data-v="rule">// waiting for a pattern worth a rule</div>
        </div>`,
      steps: [
        { k: 'info', msg: 'Tailing auth, API and gateway logs' },
        { k: 'act', to: 'table', msg: 'New event from 203.0.113.24', act() {
          v('rows').insertAdjacentHTML('beforeend', evRow('02:14:07', '200', 'GET /api/invoices/INV-2290 · tenant=acme-test · owner=globex-test', true));
        } },
        { k: 'warn', to: 'table', msg: 'Session for acme-test read an invoice owned by globex-test' },
        { k: 'ok', msg: 'Matched to Breach run BSC-114 inside its window. Logged, nobody paged.' },
        { k: 'act', to: 'rule', msg: 'Draft rule: invoice tenant differs from session tenant', act() {
          v('rule').innerHTML =
`<span class="k">when</span> path matches "/api/invoices/*"
 <span class="k">and</span> status = 200
 <span class="k">and</span> invoice.tenant != session.tenant
<span class="k">then</span> alert severity=high route=#sec-oncall`;
        } },
        { k: 'ok', to: 'rule', msg: 'Backtest on 30 days of logs: 1 hit (this run), 0 false positives' },
        { k: 'ok', msg: 'Rule DET-031 is live. Alerts route to #sec-oncall' },
      ],
      done: 'Detection shipped',
      finding: `
        <div class="finding-title">
          <span class="sev sev-ok">Detection added</span>
          <h3>Cross-tenant invoice reads now page on-call</h3>
          <div class="finding-meta"><span>Rule DET-031</span><span>From Breach BSC-114</span><span>Backtested 30 days</span></div>
        </div>
        <div class="fix">
          <p>If this request had come from a real attacker, on-call would have been paged within a minute.</p>
        </div>`,
    },
  };

  function req(method, path, code, ok, body) {
    v('method').textContent = method;
    v('path').textContent = path;
    const c = v('code');
    c.textContent = code;
    c.className = 'code ' + (ok ? 'ok' : 'bad');
    v('body').innerHTML = body;
  }

  const TAGS = { info: 'INFO', act: 'ACT', ok: 'PASS', warn: 'WARN', fail: 'FAIL' };
  const ORDER = ['qa', 'red', 'blue'];

  let mode = 'qa';
  let i = 0;
  let t0 = 0;
  let timers = [];
  let tick = null;
  let autoAdvance = !reduced;

  const later = (fn, ms) => timers.push(setTimeout(fn, ms));
  const clearAll = () => { timers.forEach(clearTimeout); timers = []; clearInterval(tick); };
  const fmt = (ms) => {
    const s = ms / 1000;
    return `${String(Math.floor(s / 60)).padStart(2, '0')}:${(s % 60).toFixed(1).padStart(4, '0')}`;
  };

  function lookAt(x, y) {
    const r = avatar.getBoundingClientRect();
    const dx = Math.max(-1, Math.min(1, (x - (r.left + r.width / 2)) / 260));
    const dy = Math.max(-1, Math.min(1, (y - (r.top + r.height / 2)) / 260));
    eyes.style.transform = `translate(${dx * 6}px, ${dy * 4}px)`;
  }

  function moveCursorTo(el) {
    const vr = viewport.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    const x = r.left - vr.left + Math.min(r.width * 0.6, 120);
    const y = r.top - vr.top + r.height * 0.55;
    cursor.style.transform = `translate(${x}px, ${y}px)`;
    lookAt(vr.left + x, vr.top + y);
  }

  function addLine(step, elapsed) {
    log.querySelector('.cur')?.classList.remove('cur');
    const li = document.createElement('li');
    li.className = `l-${step.k} cur`;
    li.innerHTML = `<span class="ts">${fmt(elapsed)}</span><span class="tag">${TAGS[step.k]}</span><span class="msg"></span>`;
    li.querySelector('.msg').textContent = step.msg;
    log.appendChild(li);
    log.scrollTop = log.scrollHeight;
    stepCount.textContent = `${log.children.length} / ${MODES[mode].steps.length}`;
  }

  function talk(isAlarm) {
    avatar.classList.add('talk');
    if (isAlarm) avatar.classList.add('alarm');
    later(() => avatar.classList.remove('talk', 'alarm'), 900);
  }

  function setMode(m) {
    mode = m;
    const cfg = MODES[m];
    consoleEl.dataset.mode = m;
    consoleEl.classList.remove('done');
    tabs.forEach((b) => {
      const on = b.dataset.mode === m;
      b.setAttribute('aria-selected', on);
      b.tabIndex = on ? 0 : -1;
    });
    $('#agentName').textContent = cfg.name;
    $('#agentRole').textContent = cfg.role;
    $('#vpUrl').textContent = cfg.url;
    screen.innerHTML = cfg.screen;
    log.innerHTML = '';
    finding.hidden = true;
    finding.innerHTML = cfg.finding;
    statusEl.textContent = 'Running';
    stepCount.textContent = `0 / ${cfg.steps.length}`;
    timerEl.textContent = fmt(0);
    eyes.style.transform = '';
  }

  function finish() {
    const cfg = MODES[mode];
    log.querySelector('.cur')?.classList.remove('cur');
    consoleEl.classList.add('done');
    statusEl.textContent = cfg.done;
    finding.hidden = false;
    clearInterval(tick);
    lookAt(window.innerWidth / 2, window.innerHeight);
    if (autoAdvance) {
      later(() => run(ORDER[(ORDER.indexOf(mode) + 1) % ORDER.length]), 7000);
    }
  }

  function runStep() {
    const cfg = MODES[mode];
    const step = cfg.steps[i];
    const el = step.to ? t(step.to) : null;
    const go = () => {
      screen.querySelectorAll('.hot').forEach((n) => n.classList.remove('hot'));
      if (el) {
        el.classList.add('hot');
        cursor.classList.remove('click'); void cursor.offsetWidth;
        if (step.k === 'act') cursor.classList.add('click');
      } else {
        const lr = log.getBoundingClientRect();
        lookAt(lr.left + lr.width / 2, lr.bottom);
      }
      step.act?.();
      addLine(step, performance.now() - t0);
      talk(step.k === 'fail' || step.k === 'warn');
      i += 1;
      if (i < cfg.steps.length) later(runStep, step.k === 'fail' ? 1700 : 1150);
      else later(finish, 900);
    };
    if (el) { moveCursorTo(el); later(go, 700); } else go();
  }

  function run(m) {
    clearAll();
    setMode(m);
    if (reduced) {
      MODES[m].steps.forEach((s, n) => { s.act?.(); addLine(s, n * 1200); });
      finish();
      return;
    }
    i = 0;
    t0 = performance.now();
    tick = setInterval(() => { timerEl.textContent = fmt(performance.now() - t0); }, 100);
    later(runStep, 500);
  }

  tabs.forEach((b, idx) => {
    b.addEventListener('click', () => { autoAdvance = false; run(b.dataset.mode); });
    b.addEventListener('keydown', (e) => {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      const next = tabs[(idx + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length];
      next.focus(); next.click();
    });
  });

  run('qa');
})();
