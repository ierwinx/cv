(() => {
  'use strict';

  const CAREER_START = 2013;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(pointer: fine)').matches;
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const escapeHTML = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  // Runs `fn` only while `el` is on screen; returns a getter for that state.
  function whileVisible(el, onChange) {
    let visible = false;
    new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (onChange) onChange(visible);
    }, { threshold: 0.15 }).observe(el);
    return () => visible;
  }

  /* ── Basics ─────────────────────────────────────────── */

  $('#year').textContent = new Date().getFullYear();
  $$('[data-years]').forEach(el => { el.dataset.count = new Date().getFullYear() - CAREER_START; });
  $$('.hero-title .word').forEach((w, i) => w.style.setProperty('--i', i));
  requestAnimationFrame(() => document.body.classList.add('loaded'));

  /* ── Nav + scroll progress ──────────────────────────── */

  const nav = $('#nav');
  const progress = $('.progress');
  let ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      const max = document.documentElement.scrollHeight - innerHeight;
      progress.style.transform = `scaleX(${max > 0 ? scrollY / max : 0})`;
      nav.classList.toggle('scrolled', scrollY > 30);
      ticking = false;
    });
  }
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ── Apps dropdown: close after choosing ─────────────── */

  const dd = $('.dd');
  $$('.dd-panel a', dd).forEach(link => link.addEventListener('click', () => {
    link.blur();
    dd.classList.add('closing');
    setTimeout(() => dd.classList.remove('closing'), 600);
  }));

  /* ── Cursor spotlight + hero orbit parallax ─────────── */

  const orbit = $('#orbit');
  if (finePointer && !reduceMotion) {
    addEventListener('pointermove', e => {
      document.documentElement.style.setProperty('--mx', e.clientX + 'px');
      document.documentElement.style.setProperty('--my', e.clientY + 'px');
      if (scrollY < innerHeight) {
        const x = e.clientX / innerWidth - 0.5;
        const y = e.clientY / innerHeight - 0.5;
        orbit.style.transform = `rotateX(${y * -18}deg) rotateY(${x * 22}deg)`;
      }
    }, { passive: true });
  }

  /* ── Reveal on scroll (staggered among siblings) ────── */

  $$('.reveal').forEach(el => {
    const siblings = Array.from(el.parentElement.children).filter(c => c.classList.contains('reveal'));
    el.style.setProperty('--delay', Math.min(siblings.indexOf(el) * 80, 480) + 'ms');
  });

  const revealObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('in');
      revealObserver.unobserve(entry.target);
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
  $$('.reveal').forEach(el => revealObserver.observe(el));

  /* ── Animated counters ──────────────────────────────── */

  function animateCount(el) {
    const target = parseFloat(el.dataset.count);
    const decimals = parseInt(el.dataset.decimals || '0', 10);
    const prefix = el.dataset.prefix || '';
    const suffix = el.dataset.suffix || '';
    const format = v => prefix + v.toLocaleString('es-MX', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }) + suffix;
    if (reduceMotion) { el.textContent = format(target); return; }
    const duration = 1800;
    const start = performance.now();
    (function frame(now) {
      const t = Math.min((now - start) / duration, 1);
      const eased = t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
      el.textContent = format(target * eased);
      if (t < 1) requestAnimationFrame(frame);
    })(start);
  }

  const countObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      animateCount(entry.target);
      countObserver.unobserve(entry.target);
    });
  }, { threshold: 0.6 });
  $$('[data-count]').forEach(el => countObserver.observe(el));

  /* ── Hero word rotator ──────────────────────────────── */

  const rotator = $('#rotator');
  const words = ['Mac.', 'iPhone.', 'iPad.', 'Apple Watch.', 'CarPlay.', 'terminal.', 'música.', 'mascota.'];
  if (!reduceMotion) {
    let w = 0;
    setInterval(() => {
      rotator.classList.add('out');
      setTimeout(() => {
        w = (w + 1) % words.length;
        rotator.textContent = words[w];
        rotator.classList.remove('out');
      }, 350);
    }, 2200);
  }

  /* ── Section accent → ambient glow colour ───────────── */

  const accentObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) document.documentElement.style.setProperty('--glow', entry.target.dataset.accent);
    });
  }, { threshold: 0.35 });
  $$('[data-accent]').forEach(el => accentObserver.observe(el));

  /* ── 3D tilt + glare ────────────────────────────────── */

  if (finePointer && !reduceMotion) {
    $$('.tilt').forEach(card => {
      card.addEventListener('pointermove', e => {
        if (!card.classList.contains('in')) return;
        const r = card.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width;
        const y = (e.clientY - r.top) / r.height;
        card.style.transition = 'transform 0.15s ease-out, box-shadow 0.5s, border-color 0.4s';
        card.style.transform = `perspective(900px) rotateX(${(0.5 - y) * 10}deg) rotateY(${(x - 0.5) * 12}deg) scale(1.015)`;
        card.style.setProperty('--gx', x * 100 + '%');
        card.style.setProperty('--gy', y * 100 + '%');
      });
      card.addEventListener('pointerleave', () => {
        card.style.transition = '';
        card.style.transform = '';
      });
    });

    /* Magnetic buttons */
    $$('.magnetic').forEach(btn => {
      btn.addEventListener('pointermove', e => {
        const r = btn.getBoundingClientRect();
        const dx = e.clientX - (r.left + r.width / 2);
        const dy = e.clientY - (r.top + r.height / 2);
        btn.style.transform = `translate(${dx * 0.22}px, ${dy * 0.32}px)`;
      });
      btn.addEventListener('pointerleave', () => { btn.style.transform = ''; });
    });
  }

  /* ── Nuevas: tabs for iPlist · iJson · iCSV ─────────── */

  const trio = $('#nuevas');
  const tabList = $('.tabs', trio);
  const tabs = $$('.tab', trio);
  const panels = $$('.spot--panel', trio);
  const TAB_NAMES = tabs.map(t => t.dataset.tab);
  const TAB_TIME = 9000;
  let currentTab = TAB_NAMES[0];
  let tabTimer = null;
  let tabsPaused = reduceMotion;
  if (tabsPaused) tabList.classList.add('paused');
  tabList.style.setProperty('--tab-time', TAB_TIME + 'ms');

  function scheduleNextTab() {
    clearTimeout(tabTimer);
    if (tabsPaused || !trioVisible()) return;
    tabTimer = setTimeout(() => {
      activateTab(TAB_NAMES[(TAB_NAMES.indexOf(currentTab) + 1) % TAB_NAMES.length]);
    }, TAB_TIME);
  }

  function activateTab(name, byUser = false) {
    currentTab = name;
    tabs.forEach(t => {
      const on = t.dataset.tab === name;
      t.classList.toggle('active', on);
      t.setAttribute('aria-selected', on);
      t.tabIndex = on ? 0 : -1;
      if (on) {
        // Restart the progress bar so it stays in sync with the timer
        const bar = $('.tab-progress', t);
        bar.style.animation = 'none';
        void bar.offsetWidth;
        bar.style.animation = '';
      }
    });
    panels.forEach(p => {
      const on = p.id === name;
      p.hidden = !on;
      p.classList.toggle('active', on);
      if (on && trioVisible()) document.documentElement.style.setProperty('--glow', p.dataset.accent);
    });
    if (byUser) {
      tabsPaused = true;
      tabList.classList.add('paused');
    }
    scheduleNextTab();
  }

  const trioVisible = whileVisible(trio, visible => {
    if (visible) activateTab(currentTab);
    else clearTimeout(tabTimer);
  });

  tabs.forEach(t => t.addEventListener('click', () => activateTab(t.dataset.tab, true)));
  tabList.addEventListener('keydown', e => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    const step = e.key === 'ArrowRight' ? 1 : -1;
    const next = TAB_NAMES[(TAB_NAMES.indexOf(currentTab) + step + TAB_NAMES.length) % TAB_NAMES.length];
    activateTab(next, true);
    $(`.tab[data-tab="${next}"]`, tabList).focus();
  });

  // Links to #iplist / #ijson / #icsv (menu, bento, dock) open the right tab.
  function openTabFromHash(name, smooth) {
    activateTab(name, true);
    trio.scrollIntoView({ behavior: smooth && !reduceMotion ? 'smooth' : 'auto' });
  }
  document.addEventListener('click', e => {
    const link = e.target.closest('a[href^="#"]');
    const name = link && link.getAttribute('href').slice(1);
    if (!TAB_NAMES.includes(name)) return;
    e.preventDefault();
    history.replaceState(null, '', '#' + name);
    openTabFromHash(name, true);
  });
  if (TAB_NAMES.includes(location.hash.slice(1))) openTabFromHash(location.hash.slice(1), false);

  const panelRunning = id => () => trioVisible() && currentTab === id;
  const waitWhile = async (isRunning, ms) => {
    await sleep(ms);
    while (!isRunning()) await sleep(250);
  };

  /* iPlist: editing a property list */

  const plistRows = $('#plistRows');
  const plistSeg = $$('#plistSeg b');
  const plistFoot = $('#plistFoot');
  const plistState = $('#plistState');
  const plistData = [
    { k: 'Root', t: 'Dictionary', v: '9 elementos', lvl: 0, tw: '▼', muted: true },
    { k: 'CFBundleIdentifier', t: 'String', v: 'com.ierwinx.iPlist', lvl: 1 },
    { k: 'CFBundleName', t: 'String', v: 'iPlist', lvl: 1 },
    { k: 'CFBundleShortVersionString', t: 'String', v: '1.0', lvl: 1 },
    { k: 'CFBundleVersion', t: 'Integer', v: '42', lvl: 1 },
    { k: 'LSMinimumSystemVersion', t: 'String', v: '27.0', lvl: 1 },
    { k: 'CFBundleDocumentTypes', t: 'Array', v: '2 elementos', lvl: 1, tw: '▶', muted: true },
    { k: 'NSHighResolutionCapable', t: 'Boolean', bool: true, lvl: 1 },
    { k: 'LSApplicationCategoryType', t: 'String', v: 'public.app-category.developer-tools', lvl: 1 }
  ];
  const plistChildren = [
    { k: 'Item 0', t: 'Dictionary', v: '4 elementos', lvl: 2, tw: '▶', muted: true },
    { k: 'Item 1', t: 'Dictionary', v: '4 elementos', lvl: 2, tw: '▶', muted: true }
  ];

  function renderPlist(rows, sel, caret) {
    plistRows.innerHTML = rows.map((r, i) => {
      const value = r.bool !== undefined
        ? `<span class="bool${r.bool ? '' : ' off'}"><i></i>${r.bool ? 'YES' : 'NO'}</span>`
        : `<span class="v${r.muted ? ' n' : ''}">${escapeHTML(r.v)}${caret && i === sel ? '<span class="caret"></span>' : ''}</span>`;
      return `<li class="${i === sel ? 'sel' : ''}"><span class="k" style="--lvl:${r.lvl};--tw:'${r.tw || ''}'">${r.k}</span><span class="t">${r.t}</span>${value}</li>`;
    }).join('');
  }

  async function typeValue(rows, i, text, isRunning) {
    while (rows[i].v.length) {
      rows[i].v = rows[i].v.slice(0, -1);
      renderPlist(rows, i, true);
      await waitWhile(isRunning, 70);
    }
    for (const ch of text) {
      rows[i].v += ch;
      renderPlist(rows, i, true);
      await waitWhile(isRunning, 110);
    }
  }

  function setSeg(segs, index) { segs.forEach((b, i) => b.classList.toggle('on', i === index)); }

  async function runPlist(isRunning) {
    while (true) {
      const rows = plistData.map(r => ({ ...r }));
      setSeg(plistSeg, 0);
      plistState.textContent = 'Abierto';
      plistFoot.textContent = '⌘Z deshace cualquier cambio';
      renderPlist(rows, -1);
      await waitWhile(isRunning, 900);

      for (let i = 1; i <= 3; i++) { renderPlist(rows, i); await waitWhile(isRunning, 380); }
      plistState.textContent = 'Editado';
      plistFoot.textContent = 'Editando CFBundleShortVersionString…';
      await typeValue(rows, 3, '1.1', isRunning);
      renderPlist(rows, 4);
      await waitWhile(isRunning, 400);
      plistFoot.textContent = 'Integer se queda Integer';
      await typeValue(rows, 4, '43', isRunning);
      await waitWhile(isRunning, 500);

      renderPlist(rows, 6);
      await waitWhile(isRunning, 450);
      rows[6].tw = '▼';
      rows.splice(7, 0, ...plistChildren.map(r => ({ ...r })));
      plistFoot.textContent = 'Solo se crean los nodos que ves';
      renderPlist(rows, 6);
      await waitWhile(isRunning, 1200);

      const boolRow = rows.findIndex(r => r.bool !== undefined);
      renderPlist(rows, boolRow);
      await waitWhile(isRunning, 400);
      rows[boolRow].bool = false;
      renderPlist(rows, boolRow);
      await waitWhile(isRunning, 900);

      setSeg(plistSeg, 1);
      plistState.textContent = 'Guardado';
      plistFoot.textContent = 'Guardado como binario';
      await waitWhile(isRunning, 1800);

      plistFoot.textContent = '⌘Z ×4 · todo como estaba';
      setSeg(plistSeg, 0);
      renderPlist(plistData.map(r => ({ ...r })), -1);
      await waitWhile(isRunning, 2400);
    }
  }

  /* iJson: tree ⇄ text */

  const jsonViews = $('.json-views');
  const jsonTree = $('#jsonTree');
  const jsonSeg = $$('#jsonSeg b');
  const s = (cls, t) => `<span class="${cls}">${escapeHTML(t)}</span>`;
  $('#jsonText').innerHTML = [
    s('jv-p', '{'),
    `  ${s('jv-k', '"id"')}${s('jv-p', ':')} ${s('jv-n', '1042')}${s('jv-p', ',')}`,
    `  ${s('jv-k', '"cliente"')}${s('jv-p', ':')} ${s('jv-s', '"Ana López"')}${s('jv-p', ',')}`,
    `  ${s('jv-k', '"total"')}${s('jv-p', ':')} ${s('jv-n', '1.0')}${s('jv-p', ',')}`,
    `  ${s('jv-k', '"pagado"')}${s('jv-p', ':')} ${s('jv-b', 'true')}${s('jv-p', ',')}`,
    `  ${s('jv-k', '"items"')}${s('jv-p', ': [')}`,
    `    ${s('jv-p', '{')} ${s('jv-k', '"sku"')}${s('jv-p', ':')} ${s('jv-s', '"IJ-01"')}${s('jv-p', ',')} ${s('jv-k', '"cant"')}${s('jv-p', ':')} ${s('jv-n', '2')} ${s('jv-p', '},')}`,
    `    ${s('jv-p', '{')} ${s('jv-k', '"sku"')}${s('jv-p', ':')} ${s('jv-s', '"IP-07"')}${s('jv-p', ',')} ${s('jv-k', '"cant"')}${s('jv-p', ':')} ${s('jv-n', '1')} ${s('jv-p', '}')}`,
    `  ${s('jv-p', '],')}`,
    `  ${s('jv-k', '"notas"')}${s('jv-p', ':')} ${s('jv-z', 'null')}`,
    s('jv-p', '}')
  ].join('\n');

  const jsonBase = [
    { lvl: 0, tw: '▼', key: 'raíz', cnt: '{6}' },
    { lvl: 1, key: 'id', val: ['jv-n', '1042'] },
    { lvl: 1, key: 'cliente', val: ['jv-s', '"Ana López"'] },
    { lvl: 1, key: 'total', val: ['jv-n', '1.0'] },
    { lvl: 1, key: 'pagado', val: ['jv-b', 'true'] },
    { lvl: 1, tw: '▼', key: 'items', cnt: '[2]' },
    { lvl: 2, tw: '▶', key: '0', cnt: '{2}' },
    { lvl: 2, tw: '▶', key: '1', cnt: '{2}' },
    { lvl: 1, key: 'notas', val: ['jv-z', 'null'] }
  ];

  function renderJsonTree(rows, sel) {
    jsonTree.innerHTML = rows.map((r, i) => `
      <li class="${i === sel ? 'sel' : ''}" style="--lvl:${r.lvl}">
        <span class="tw">${r.tw || ''}</span><span class="key">${escapeHTML(r.key)}</span>
        ${r.val ? s(r.val[0], r.val[1]) : `<span class="cnt">${r.cnt}</span>`}
      </li>`).join('');
  }

  async function runJson(isRunning) {
    while (true) {
      const rows = jsonBase.map(r => ({ ...r }));
      jsonViews.classList.remove('text');
      setSeg(jsonSeg, 0);
      renderJsonTree(rows, -1);
      await waitWhile(isRunning, 700);
      for (let i = 1; i <= 6; i++) { renderJsonTree(rows, i); await waitWhile(isRunning, 420); }
      rows[6].tw = '▼';
      rows.splice(7, 0, { lvl: 3, key: 'sku', val: ['jv-s', '"IJ-01"'] }, { lvl: 3, key: 'cant', val: ['jv-n', '2'] });
      renderJsonTree(rows, 6);
      await waitWhile(isRunning, 900);
      renderJsonTree(rows, 3);
      await waitWhile(isRunning, 1100);
      jsonViews.classList.add('text');
      setSeg(jsonSeg, 1);
      await waitWhile(isRunning, 3800);
    }
  }

  /* iCSV: scrolling 10M rows without blinking */

  const csvGrid = $('#csvGrid');
  const csvFoot = $('#csvFoot');
  const TOTAL_ROWS = 10000000;
  const VISIBLE_ROWS = 9;
  const names = ['Ana López', 'Luis Pérez', 'Sofía Ramos', 'Diego Torres', 'Valeria Cruz', 'Mateo Díaz', 'Camila Ortiz', 'Javier Ruiz', 'Lucía Méndez', 'Emilio Vega'];
  const cities = ['CDMX', 'Monterrey', 'Guadalajara', 'Puebla', 'Mérida', 'Querétaro', 'Toluca', 'Oaxaca'];
  const zips = ['06720', '01000', '03100', '04510', '06600', '09000', '07300', '05120'];
  const fmt = n => n.toLocaleString('en-US').replace(/,/g, ' ');

  function csvRow(n) {
    const h = (n * 2654435761) >>> 0;
    return [fmt(n), names[h % names.length], cities[(h >>> 5) % cities.length], zips[(h >>> 9) % zips.length], ((h % 900000) / 100 + 10).toFixed(2)];
  }

  function renderCsv(top, selRow = -1, selCol = -1) {
    const head = `<div class="csv-row csv-row--head"><span>#</span><span>cliente</span><span>ciudad</span><span>código_postal</span><span>importe</span></div>`;
    let body = '';
    for (let r = 0; r < VISIBLE_ROWS; r++) {
      const cells = csvRow(top + r);
      body += '<div class="csv-row">' + cells.map((c, ci) => {
        const cls = [ci === 3 ? 'zip' : '', ci === 4 ? 'num' : '', r === selRow && ci === selCol ? 'cell-sel' : ''].join(' ').trim();
        return `<span${cls ? ` class="${cls}"` : ''}>${escapeHTML(c)}</span>`;
      }).join('') + '</div>';
    }
    csvGrid.innerHTML = head + body;
  }

  async function runCsv(isRunning) {
    while (true) {
      renderCsv(1);
      csvFoot.textContent = `Fila 1 de ${fmt(TOTAL_ROWS)}`;
      await waitWhile(isRunning, 1200);

      csvGrid.classList.add('scrolling');
      let top = 1;
      const target = 4812337;
      for (let i = 1; i <= 24; i++) {
        top = Math.round(1 + (target - 1) * (1 - Math.pow(1 - i / 24, 3)));
        renderCsv(top);
        csvFoot.textContent = `Fila ${fmt(top)} de ${fmt(TOTAL_ROWS)}`;
        await waitWhile(isRunning, 55);
      }
      csvGrid.classList.remove('scrolling');

      const path = [[2, 1], [2, 2], [3, 2], [3, 3], [4, 3], [4, 4]];
      for (const [r, c] of path) {
        renderCsv(top, r, c);
        const value = csvRow(top + r)[c];
        csvFoot.textContent = c === 3 ? `código_postal = ${value} · sin ceros perdidos` : `Fila ${fmt(top + r)} de ${fmt(TOTAL_ROWS)}`;
        await waitWhile(isRunning, 650);
      }
      await waitWhile(isRunning, 2200);
    }
  }

  if (reduceMotion) {
    renderPlist(plistData, -1);
    renderJsonTree(jsonBase, -1);
    renderCsv(1);
  } else {
    runPlist(panelRunning('iplist'));
    runJson(panelRunning('ijson'));
    runCsv(panelRunning('icsv'));
  }

  /* ── iRar: formats orbiting the icon ────────────────── */

  const irar = $('#irarVisual');
  const formats = $$('.formats span', irar);
  formats.forEach((f, i) => {
    const angle = (i / formats.length) * Math.PI * 2 - Math.PI / 2;
    f.style.setProperty('--x', (Math.cos(angle) * 40).toFixed(2) + '%');
    f.style.setProperty('--y', (Math.sin(angle) * 40).toFixed(2) + '%');
    f.style.setProperty('--d', i * 60 + 'ms');
  });
  new IntersectionObserver(([entry], obs) => {
    if (!entry.isIntersecting) return;
    irar.classList.add('in');
    obs.disconnect();
  }, { threshold: 0.3 }).observe(irar);

  if (!reduceMotion) {
    const irarVisible = whileVisible(irar);
    setInterval(() => {
      if (!irarVisible()) return;
      const f = formats[Math.floor(Math.random() * formats.length)];
      f.classList.remove('pulse');
      void f.offsetWidth;
      f.classList.add('pulse');
    }, 700);
  }

  /* ── iGit: scripted terminal session ────────────────── */

  const term = $('#term');
  const termScript = [
    { cmd: 'igit' },
    { out: '<span class="h">iGit</span>  <span class="d">main ↑1 · ~/Developer/iGit</span>' },
    { out: '' },
    { out: '<span class="h">Cambios</span> <span class="d">(3 archivos)</span>', wait: 250 },
    { out: ' <span class="g">☑</span> Sources/App/Sync.swift       <span class="g">+12</span> <span class="r">-3</span>', wait: 180 },
    { out: ' <span class="g">☑</span> Sources/UI/DiffView.swift    <span class="g">+8</span>', wait: 180 },
    { out: ' <span class="d">☐</span> Tests/SyncTests.swift        <span class="g">+21</span>', wait: 400 },
    { out: '' },
    { out: '<span class="d">  12 │</span> <span class="g">+ let result = try await git.push()</span>', wait: 200 },
    { out: '<span class="d">  13 │</span> <span class="r">- print("debug:", result)</span>  <span class="d">← fuera</span>', wait: 700 },
    { out: '' },
    { prompt: '<span class="a">commit ›</span> ', cmd: 'feat: sincroniza con un clic' },
    { out: '<span class="g">✓</span> Commit <span class="v">82bbc32</span> · 2 archivos', wait: 450 },
    { out: '<span class="g">✓</span> Push a origin/main · <span class="v">82 ms</span>', wait: 450 },
    { out: '<span class="d">PR #42 · CI</span>  <span class="g">✓ build</span>  <span class="g">✓ tests</span>  <span class="a">● deploy</span>', wait: 3200 }
  ];

  function renderTerm(lines, caret) {
    term.innerHTML = lines.join('\n') + (caret ? '<span class="caret"></span>' : '');
  }

  async function runTerminal(isVisible) {
    while (true) {
      const lines = [];
      for (const step of termScript) {
        while (!isVisible()) await sleep(300);
        if (step.cmd !== undefined) {
          const prefix = step.prompt || '<span class="p">❯</span> ';
          lines.push(prefix);
          for (const ch of step.cmd) {
            lines[lines.length - 1] += escapeHTML(ch);
            renderTerm(lines, true);
            await sleep(45 + Math.random() * 70);
          }
          await sleep(350);
        } else {
          lines.push(step.out);
          renderTerm(lines, true);
          await sleep(step.wait || 120);
        }
      }
    }
  }

  if (reduceMotion) {
    renderTerm(termScript.map(s => s.cmd !== undefined ? (s.prompt || '<span class="p">❯</span> ') + escapeHTML(s.cmd) : s.out), false);
  } else {
    runTerminal(whileVisible(term));
  }

  /* ── iSpecter: live spectrogram ─────────────────────── */

  const canvas = $('#spectrogram');
  const ctx = canvas.getContext('2d');
  const W = canvas.width;
  const H = canvas.height;
  const cutoffEl = $('#specCutoff');
  const verdict = $('#specVerdict');
  const NYQUIST = 22.05;
  const FAKE_CUT = 16;

  // Inferno-like colour map, sampled as a 256-entry lookup table.
  const stops = [[0, 0, 0, 4], [0.15, 31, 12, 72], [0.3, 85, 15, 109], [0.45, 136, 34, 106], [0.6, 186, 54, 85], [0.72, 227, 89, 51], [0.85, 249, 140, 10], [0.94, 249, 201, 50], [1, 252, 255, 164]];
  const lut = [];
  for (let i = 0; i < 256; i++) {
    const t = i / 255;
    let k = 0;
    while (k < stops.length - 2 && t > stops[k + 1][0]) k++;
    const [t0, r0, g0, b0] = stops[k];
    const [t1, r1, g1, b1] = stops[k + 1];
    const u = (t - t0) / (t1 - t0);
    lut.push([r0 + (r1 - r0) * u, g0 + (g1 - g0) * u, b0 + (b1 - b0) * u]);
  }

  let fake = false;
  let tick = 0;
  const COL = 2;
  const column = ctx.createImageData(COL, H);

  function drawColumn() {
    tick++;
    const beat = Math.pow(Math.max(0, Math.sin(tick * 0.09)), 6);
    const melody = 0.12 + 0.06 * Math.sin(tick * 0.013) + 0.04 * Math.sin(tick * 0.031);
    for (let y = 0; y < H; y++) {
      const f = 1 - y / H; // 0 = 0 Hz (bottom), 1 = Nyquist (top)
      let e = Math.pow(1 - f, 1.6) * (0.55 + 0.35 * Math.random());
      e += beat * 0.45 * Math.pow(1 - f, 0.6) * Math.random();
      for (let h = 1; h <= 6; h++) {
        const d = Math.abs(f - melody * h);
        if (d < 0.006) e += (0.9 / h) * (1 - d / 0.006);
      }
      e += 0.08 * Math.random();
      if (fake && f * NYQUIST > FAKE_CUT) e *= 0.015;
      const c = lut[Math.max(0, Math.min(255, Math.floor(e * 255)))];
      for (let x = 0; x < COL; x++) {
        const i = (y * COL + x) * 4;
        column.data[i] = c[0];
        column.data[i + 1] = c[1];
        column.data[i + 2] = c[2];
        column.data[i + 3] = 255;
      }
    }
    ctx.drawImage(canvas, -COL, 0);
    ctx.putImageData(column, W - COL, 0);
  }

  function setMode(isFake) {
    fake = isFake;
    const top = canvas.offsetTop + canvas.clientHeight * (1 - FAKE_CUT / NYQUIST);
    cutoffEl.style.setProperty('--cut', top + 'px');
    cutoffEl.classList.toggle('hide', !isFake);
    verdict.className = 'spec-verdict ' + (isFake ? 'bad' : 'ok');
    verdict.querySelector('span').textContent = isFake
      ? 'Veredicto: MP3 disfrazado · corte en 16 kHz'
      : 'Veredicto: lossless real · 24 bits · 96 kHz';
  }

  ctx.fillStyle = '#000004';
  ctx.fillRect(0, 0, W, H);
  setMode(false);
  addEventListener('resize', () => setMode(fake));

  // Pre-fill so the canvas is never seen empty
  for (let i = 0; i < W / COL; i++) drawColumn();

  if (!reduceMotion) {
    const specVisible = whileVisible(canvas);
    let last = 0;
    let modeTimer = 0;
    (function loop(now) {
      requestAnimationFrame(loop);
      if (!specVisible()) return;
      if (now - last < 1000 / 60) return;
      last = now;
      drawColumn();
      if (++modeTimer > 330) { modeTimer = 0; setMode(!fake); }
    })(0);
  }

  /* ── iConverter: same demo as the app's own page (/musica/) ── */

  const icLog = $('#icLog');
  const icFill = $('#icFill');
  const icCount = $('#icCount');
  const icState = $('#icState');
  const icGo = $('#icGo');
  const icSegs = $$('#icSeg span');
  const icBit = $('#icBit');
  const IC_SONGS = ['Amanecer', 'Ondas', 'Neón', 'Gravedad', 'Marea Alta', 'Satélite', 'Eco', 'Prisma', 'Medianoche', 'Órbita', 'Ondas (Reprise)', 'Despedida'];
  const IC_TOTAL = 14;
  const IC_PLAY = '<svg width="14" height="14" viewBox="0 0 24 24" fill="#fff"><path d="M6 4l14 8-14 8z"/></svg>Iniciar';

  function icAdd(text) {
    const line = document.createElement('div');
    line.textContent = text;
    icLog.appendChild(line);
    while (icLog.children.length > 8) icLog.firstChild.remove();
  }

  function icProgress(done) {
    icCount.textContent = `${done} / ${IC_TOTAL}`;
    icFill.style.width = (done / IC_TOTAL) * 100 + '%';
  }

  async function runConverter(isVisible) {
    while (true) {
      while (!isVisible()) await sleep(300);
      icLog.innerHTML = '';
      icProgress(0);
      icState.textContent = 'Listo para convertir';
      icGo.innerHTML = IC_PLAY;
      const pick = [3, 2, 3][Math.floor(Math.random() * 3)];
      icSegs.forEach((seg, i) => seg.classList.toggle('on', i === pick));
      icBit.textContent = icSegs[pick].textContent + ' kbps';
      await sleep(1400);

      icGo.style.transform = 'scale(.96)';
      await sleep(140);
      icGo.style.transform = '';
      icGo.innerHTML = '<span class="ic-spin"></span>Convirtiendo…';

      let done = 0;
      for (const f of ['01 Bonus.mp3', '02 Live.mp3']) {
        icAdd(`📋 Copiado: ${f}`);
        icProgress(++done);
        await sleep(260);
      }
      for (let i = 0; i < IC_SONGS.length; i++) {
        while (!isVisible()) await sleep(300);
        const n = String(i + 1).padStart(2, '0');
        icState.textContent = `🎧 Convirtiendo: ${n} ${IC_SONGS[i]}`;
        await sleep(380 + Math.random() * 260);
        icAdd(`✅ ${n} ${IC_SONGS[i]}.m4a`);
        icProgress(++done);
      }
      icAdd('🏁 Conversión finalizada');
      icState.textContent = '✅ Conversión completada';
      icGo.innerHTML = IC_PLAY;
      await sleep(4200);
    }
  }

  if (reduceMotion) {
    IC_SONGS.slice(-7).forEach((name, i) => icAdd(`✅ ${String(i + 6).padStart(2, '0')} ${name}.m4a`));
    icAdd('🏁 Conversión finalizada');
    icProgress(IC_TOTAL);
    icState.textContent = '✅ Conversión completada';
  } else {
    runConverter(whileVisible($('.ic-mac')));
  }

  /* ── Super Pets: screenshot carousel ────────────────── */

  const shots = $$('#phoneScreen img');
  if (!reduceMotion) {
    let s = 0;
    setInterval(() => {
      shots[s].classList.remove('on');
      s = (s + 1) % shots.length;
      shots[s].classList.add('on');
    }, 3200);
  }

  /* ── Academia: typed Python ─────────────────────────── */

  const codeEl = $('#code');
  const pySource = [
    'from fastapi import FastAPI',
    '',
    'app = FastAPI()',
    '',
    '@app.get("/suite")',
    'def suite():',
    '    # Toda la suite ierwinx, como JSON',
    '    return ["iRar", "iGit", "iSpecter",',
    '            "iConverter", "Super Pets"]',
    ''
  ].join('\n');
  const pyOutput = '\n<span class="c">$ uvicorn main:app</span>\n<span class="o">✓ Listo en http://127.0.0.1:8000</span>';

  // Single-pass tokenizer, so markup inserted for one token is never re-matched by another.
  function highlightPython(src) {
    const token = /(#[^\n]*)|("[^"\n]*"?)|\b(from|import|def|return)\b|(@app\.get|FastAPI(?=\())/g;
    let html = '';
    let last = 0;
    let m;
    while ((m = token.exec(src))) {
      html += escapeHTML(src.slice(last, m.index));
      const cls = m[1] ? 'c' : m[2] ? 's' : m[3] ? 'k' : 'f';
      html += `<span class="${cls}">${escapeHTML(m[0])}</span>`;
      last = token.lastIndex;
    }
    return html + escapeHTML(src.slice(last));
  }

  async function runCode(isVisible) {
    while (true) {
      for (let i = 0; i <= pySource.length; i++) {
        while (!isVisible()) await sleep(300);
        codeEl.innerHTML = highlightPython(pySource.slice(0, i)) + '<span class="caret"></span>';
        const ch = pySource[i - 1];
        await sleep(ch === '\n' ? 160 : 28 + Math.random() * 40);
      }
      await sleep(500);
      codeEl.innerHTML = highlightPython(pySource) + pyOutput + '<span class="caret"></span>';
      await sleep(4500);
    }
  }

  if (reduceMotion) {
    codeEl.innerHTML = highlightPython(pySource) + pyOutput;
  } else {
    runCode(whileVisible(codeEl));
  }

  /* ── Dock magnification ─────────────────────────────── */

  const dock = $('#dock');
  const dockItems = $$('a', dock);
  if (finePointer && !reduceMotion) {
    dock.addEventListener('pointermove', e => {
      dockItems.forEach(item => {
        const r = item.getBoundingClientRect();
        const d = Math.abs(e.clientX - (r.left + r.width / 2));
        item.style.setProperty('--s', (1 + 0.55 * Math.max(0, 1 - d / 140)).toFixed(3));
      });
    });
    dock.addEventListener('pointerleave', () => dockItems.forEach(item => item.style.setProperty('--s', 1)));
  }
})();
