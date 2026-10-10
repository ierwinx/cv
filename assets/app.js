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
    dd.classList.remove('open');
    dd.classList.add('closing');
    setTimeout(() => dd.classList.remove('closing'), 600);
  }));

  // Phones have no hover: the trigger toggles the panel instead of jumping to #suite
  const phone = window.matchMedia('(max-width: 680px)');
  const ddTrigger = $('.dd-trigger', dd);
  ddTrigger.setAttribute('aria-expanded', 'false');
  ddTrigger.addEventListener('click', e => {
    if (!phone.matches) return;
    e.preventDefault();
    ddTrigger.setAttribute('aria-expanded', String(dd.classList.toggle('open')));
  });
  document.addEventListener('click', e => {
    if (dd.classList.contains('open') && !dd.contains(e.target)) {
      dd.classList.remove('open');
      ddTrigger.setAttribute('aria-expanded', 'false');
    }
  });

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

  /* ── Nuevas: tabs for iPlist · iJson · iCSV · iXML ──── */

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

  // Links to #iplist / #ijson / #icsv / #ixml (menu, bento, dock) open the right tab.
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

  /* iXML: split view, tree and text in sync, plus ⇥ expansion */

  const xmlTree = $('#xmlTree');
  const xmlCode = $('#xmlCode');
  const xmlFoot = $('#xmlFoot');
  const xmlState = $('#xmlState');
  const tag = t => s('xv-t', t);
  const attr = (k, v) => `${s('xv-a', k)}${s('xv-p', '=')}${s('xv-v', `"${v}"`)}`;
  const xmlLines = [
    `${s('xv-p', '<?')}${s('xv-t', 'xml')} ${attr('version', '1.0')}${s('xv-p', '?>')}`,
    tag('<biblioteca>'),
    `  ${s('xv-c', '<!-- Clásicos -->')}`,
    `  ${tag('<libro')} ${attr('id', '1')}${tag('>')}`,
    `    ${tag('<titulo>')}Cien años de soledad${tag('</titulo>')}`,
    `    ${tag('<autor>')}García Márquez${tag('</autor>')}`,
    `    ${tag('<año>')}1967${tag('</año>')}`,
    `  ${tag('</libro>')}`
  ];
  const xmlClose = tag('</biblioteca>');
  const xmlTyped = 'libro[id=2 idioma]';
  const xmlExpanded = `  ${tag('<libro')} ${attr('id', '2')} ${s('xv-a', 'idioma')}${s('xv-p', '=')}${s('xv-v', '"')}<span class="caret"></span>${s('xv-v', '"')}${tag('></libro>')}`;
  const xmlNodes = [
    { name: 'biblioteca', color: '#b9a8ff', lvl: 0, line: 1 },
    { name: 'libro', color: '#ff9be9', lvl: 1, line: 3, at: 'id="1"' },
    { name: 'titulo', color: '#8fe9ff', lvl: 2, line: 4 },
    { name: 'autor', color: '#7dffc4', lvl: 2, line: 5 },
    { name: 'año', color: '#ffd98a', lvl: 2, line: 6 }
  ];
  const xmlNewNode = { name: 'libro', color: '#ff9be9', lvl: 1, line: 8, at: 'id="2" idioma=""', fresh: true };

  function renderXml(extra, nodes, sel = -1) {
    const lines = extra === null ? [...xmlLines, xmlClose] : [...xmlLines, extra, xmlClose];
    const selLine = sel >= 0 ? nodes[sel].line : -1;
    xmlCode.innerHTML = lines.map((l, i) =>
      `<span class="${i === selLine ? 'sel' : ''}"><span class="ln">${i + 1}</span>${l}</span>`).join('');
    xmlTree.innerHTML = nodes.map((n, i) => `
      <li class="${[i === sel ? 'sel' : '', n.fresh ? 'new' : ''].join(' ').trim()}" style="--lvl:${n.lvl}">
        <span class="ic" style="background:${n.color}">${n.name[0].toUpperCase()}</span><span>${n.name}</span>${n.at ? `<span class="at">${escapeHTML(n.at)}</span>` : ''}
      </li>`).join('');
  }

  async function runXml(isRunning) {
    while (true) {
      xmlState.textContent = 'Abierto';
      xmlFoot.textContent = 'Árbol y texto, sincronizados';
      renderXml(null, xmlNodes);
      await waitWhile(isRunning, 900);
      for (let i = 0; i < xmlNodes.length; i++) { renderXml(null, xmlNodes, i); await waitWhile(isRunning, 520); }

      xmlState.textContent = 'Editado';
      xmlFoot.textContent = 'Escribe la abreviatura…';
      for (let i = 0; i <= xmlTyped.length; i++) {
        renderXml(`  ${s('xv-g', xmlTyped.slice(0, i))}<span class="caret"></span>`, xmlNodes);
        await waitWhile(isRunning, 85);
      }
      renderXml(`  ${s('xv-g', xmlTyped)}<span class="caret"></span><span class="kc">⇥ Tab</span>`, xmlNodes);
      await waitWhile(isRunning, 700);
      const nodes = [...xmlNodes, xmlNewNode];
      xmlFoot.textContent = '…y la etiqueta se cierra sola';
      renderXml(xmlExpanded, nodes, nodes.length - 1);
      await waitWhile(isRunning, 2600);
      xmlFoot.textContent = '⌘Z deshace la expansión de una vez';
      await waitWhile(isRunning, 1600);
    }
  }

  if (reduceMotion) {
    renderPlist(plistData, -1);
    renderJsonTree(jsonBase, -1);
    renderCsv(1);
    renderXml(xmlExpanded, [...xmlNodes, xmlNewNode]);
  } else {
    runPlist(panelRunning('iplist'));
    runJson(panelRunning('ijson'));
    runCsv(panelRunning('icsv'));
    runXml(panelRunning('ixml'));
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

  /* ── iGit: recreación de la pantalla real (igual que /igit/) ── */

  const tui = $('#term');
  const keycast = $('#keycast');
  const TCOLS = 96;

  function fitTui() {
    const fs = Math.max(4, Math.min(14.5, tui.clientWidth / (TCOLS * 0.602)));
    tui.style.setProperty('--fs', `${fs}px`);
  }
  addEventListener('resize', fitTui);

  const swift = code => escapeHTML(code)
    .replace(/("[^"]*")/g, '<span class="str">$1</span>')
    .replace(/\b(package|static|let|var|func|return|guard|else|init|struct|enum|try|await|if|for|in|case)\b/g, '<span class="kw">$1</span>')
    .replace(/\b([a-z][A-Za-z]+)(?=\()/g, '<span class="fn">$1</span>');
  const middle = (s, n) => s.length <= n ? s : s.slice(0, Math.ceil((n - 1) * 0.35)) + '…' + s.slice(s.length - Math.floor((n - 1) * 0.65));

  const FILES = [
    { path: 'Sources/iGitUI/Keymap/Keymap.swift', kind: '◼', cls: 'c-mod', stats: '+4 −1', diff: [
      ['hunk', '', '', '@@ -12,6 +12,9 @@ package struct Keymap {'],
      ['ctx', 12, 12, '    package static let standard = Keymap()'],
      ['del', 13, '', '    static let bindings: [Binding] = defaults'],
      ['add', '', 13, '    let bindings: [Binding]'],
      ['add', '', 14, '    package init(overrides: [AppCommand: [KeyChord]]) {'],
      ['add', '', 15, '        print("debug keymap")'],
      ['add', '', 16, '        bindings = Self.merge(defaults, overrides)'],
      ['ctx', 14, 17, '    }']
    ] },
    { path: 'Sources/iGitCore/Rules/KeymapRules.swift', kind: '✚', cls: 'c-add', stats: '+6 −0', diff: [
      ['hunk', '', '', '@@ -0,0 +1,6 @@'],
      ['add', '', 1, '/// Valida el keymap.json del usuario.'],
      ['add', '', 2, 'package enum KeymapRules {'],
      ['add', '', 3, '    static func resolve(_ file: KeymapFile?) -> Resolved {'],
      ['add', '', 4, '        guard let file else { return Resolved() }'],
      ['add', '', 5, '        return Resolved(parsing: file)'],
      ['add', '', 6, '    }']
    ] },
    { path: 'Sources/iGitApp/Subcommands/CLI.swift', kind: '◼', cls: 'c-mod', stats: '+2 −1', diff: [
      ['hunk', '', '', '@@ -28,7 +28,8 @@ enum CLI {'],
      ['ctx', 28, 28, '        case "doctor":'],
      ['del', 29, '', '            return await doctor()'],
      ['add', '', 29, '            return await doctor(environment)'],
      ['add', '', 30, '        case "keymap": return keymap()'],
      ['ctx', 30, 31, '        default:']
    ] },
    { path: 'docs/decisions/ADR-0023.md', kind: '✚', cls: 'c-add', stats: '+3 −0', diff: [
      ['hunk', '', '', '@@ -0,0 +1,3 @@'],
      ['add', '', 1, '# ADR-0023 · Keymap configurable'],
      ['add', '', 2, ''],
      ['add', '', 3, '**Estado:** aceptada']
    ] },
    { path: 'Notas.md', kind: '✚', cls: 'c-new', stats: '+1 −0', diff: [
      ['hunk', '', '', '@@ -0,0 +1 @@'],
      ['add', '', 1, '- probar la galería en Terminal.app']
    ] }
  ];

  const SPIN = '⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏';
  let S;
  function freshState() {
    return {
      files: FILES.map((f, i) => ({ ...f, included: i !== 4, off: new Set() })),
      sel: 0, focus: 'files', cursor: -1,
      summary: '', typing: false, ready: false, press: false,
      sync: { icon: '↑', title: 'Push origin', sub: '1 commit por subir' }, busy: false, spin: 0,
      toast: ''
    };
  }

  function box(f) {
    if (!f.included) return '☐';
    const changes = f.diff.filter(l => l[0] === 'add' || l[0] === 'del').length;
    return f.off.size === 0 ? '☑' : f.off.size < changes ? '◪' : '☐';
  }

  function renderTui() {
    const f = S.files[S.sel];
    const included = S.files.filter(x => x.included).length;
    const all = included === S.files.length ? '☑' : included === 0 ? '☐' : '◪';
    const rows = S.files.map((x, i) => {
      const cls = ['row', 'file', i === S.sel ? 'sel' : '', i === S.sel && S.focus === 'files' ? 'focus' : ''].join(' ');
      return `<div class="${cls}"><span><span class="check">${box(x)}</span> ${escapeHTML(middle(x.path, 23))}</span><span class="k ${x.cls}">${x.kind}</span></div>`;
    }).join('');
    const diff = f ? f.diff.map((l, i) => {
      const [kind, o, n, text] = l;
      if (kind === 'hunk') return `<div class="dl hunk"><span class="check">${box(f)}</span> ${escapeHTML(text)}</div>`;
      const off = f.off.has(i) || !f.included;
      const mark = kind === 'ctx' ? ' ' : off ? '☐' : '☑';
      const sign = kind === 'add' ? '+' : kind === 'del' ? '−' : ' ';
      const cls = ['dl', kind === 'ctx' ? '' : kind, off && kind !== 'ctx' ? 'off' : '', S.focus === 'diff' && S.cursor === i ? 'cursor' : ''].join(' ');
      return `<div class="${cls}"><span class="check">${mark}</span> <span class="n">${String(o).padStart(2)} ${String(n).padStart(2)}</span><span class="t">${sign} ${swift(text)}</span></div>`;
    }).join('') : '';
    const btnLabel = included ? `Commit ${included} archivo${included === 1 ? '' : 's'} a main` : 'Commit a main';
    const hints = S.focus === 'summary'
      ? '<span><b>⌃S</b> commit · <b>Tab</b> panel · <b>Esc</b> volver</span>'
      : S.focus === 'diff'
        ? '<span><b>↑↓</b> mover · <b>Space</b> incluir · <b>x</b> hunk · <b>Esc</b> volver · <b>⌃P</b> comandos</span>'
        : '<span><b>Tab</b> panel · <b>Space</b> incluir · <b>c</b> mensaje · <b>s</b> sync · <b>/</b> filtrar · <b>⌃P</b> comandos · <b>?</b> ayuda</span>';
    tui.innerHTML = `
      <div class="tb">
        <div class="seg"><small>Repositorio actual</small>◇ iGit<span style="float:right">▾</span></div>
        <div class="seg"><small>Rama actual</small>⎇ main<span style="float:right">▾</span></div>
        <div class="seg ${S.busy ? 'busy' : ''}"><small>${S.busy ? 'Subiendo a origin…' : S.sync.sub}</small>${S.busy ? `<span class="spin">${SPIN[S.spin % SPIN.length]}</span> Push origin` : `${S.sync.icon} ${S.sync.title}`}</div>
      </div>
      <div class="tabs"><span class="on">Cambios ${S.files.length}</span><span>Historial</span></div>
      <div class="main">
        <div class="left">
          <div class="row hdr">⌕ Filtrar…</div>
          <div class="row hdr"><span class="check">${all}</span> ${S.files.length} archivos cambiados</div>
          <div class="files">${rows}</div>
          <div class="commit">
            <div class="summary ${S.typing ? 'typing' : ''}">${S.summary ? escapeHTML(middle(S.summary, 26)) + (S.typing ? '<span class="tcaret">▍</span>' : '') : '◔ Resumen (obligatorio)'}</div>
            <div class="desc">Descripción</div>
            <div class="commit-btn ${S.ready ? 'ready' : ''} ${S.press ? 'press' : ''}">${btnLabel}</div>
          </div>
        </div>
        <div class="right">
          <div class="diffhead"><span>${f ? escapeHTML(f.path) : ''}</span><span class="st"><span class="c-add">${f ? f.stats.split(' ')[0] : ''}</span> <span class="c-del">${f ? f.stats.split(' ')[1] : ''}</span></span></div>
          <div class="diff">${diff}</div>
        </div>
      </div>
      <div class="hints">${hints}<span>main · ${S.files.length} cambios</span></div>
      <div class="ttoast ${S.toast ? 'on' : ''}">${S.toast}</div>`.replace(/>\s*\n\s*</g, '><').trim();
  }

  function cast(k, label) {
    const el = document.createElement('span');
    el.innerHTML = `${escapeHTML(k)}${label ? `<em>${escapeHTML(label)}</em>` : ''}`;
    keycast.appendChild(el);
    setTimeout(() => el.remove(), 1400);
    while (keycast.children.length > 3) keycast.firstChild.remove();
  }

  // La demo solo corre mientras se ve (0 % de CPU fuera de pantalla, como iGit).
  const tuiVisible = whileVisible(tui);
  const twait = async ms => {
    await sleep(ms);
    while (!tuiVisible() || document.hidden) await sleep(250);
  };
  const press = async (k, label, fn, ms = 650) => {
    cast(k, label);
    if (fn) fn();
    renderTui();
    await twait(ms);
  };

  async function runTui() {
    for (;;) {
      S = freshState();
      fitTui();
      renderTui();
      await twait(1400);
      await press('↓', '', () => (S.sel = 1));
      await press('↓', '', () => (S.sel = 2));
      await press('↓', '', () => (S.sel = 3), 500);
      await press('Space', 'excluir', () => (S.files[3].included = false), 900);
      await press('Home', '', () => (S.sel = 0), 700);
      await press('⏎', 'al diff', () => { S.focus = 'diff'; S.cursor = 1; }, 500);
      for (const c of [2, 3, 4, 5]) await press('↓', '', () => (S.cursor = c), 280);
      await press('Space', 'quitar línea', () => S.files[0].off.add(5), 1000);
      await press('c', 'mensaje', () => { S.focus = 'summary'; S.typing = true; }, 400);
      for (const ch of 'Atajos configurables con keymap.json') {
        S.summary += ch;
        S.ready = true;
        renderTui();
        await twait(38 + Math.random() * 40);
      }
      await twait(500);
      await press('⌃S', 'commit', () => (S.press = true), 220);
      S.press = false; S.typing = false; S.focus = 'files';
      // Lo incluido se va; quedan la línea que no entró, el ADR excluido y Notas.md
      const kept = S.files.filter((x, i) => !x.included || x.off.size > 0 || i === 4);
      S.files = kept.map(x => x.path.endsWith('Keymap.swift')
        ? { ...x, included: true, off: new Set(), stats: '+1 −0', diff: [['hunk', '', '', '@@ -15,0 +15,1 @@'], ['add', '', 15, '        print("debug keymap")']] }
        : x);
      S.sel = 0; S.summary = ''; S.ready = false;
      S.sync = { icon: '↑', title: 'Push origin', sub: '2 commits por subir' };
      S.toast = '✓ Commit: «Atajos configurables con keymap.json»';
      renderTui();
      await twait(2200);
      S.toast = '';
      await press('s', 'sincronizar', () => (S.busy = true), 120);
      for (let i = 0; i < 16; i++) { S.spin++; renderTui(); await sleep(90); }
      S.busy = false;
      S.sync = { icon: '↻', title: 'Fetch origin', sub: 'hace un momento' };
      S.toast = '✓ Push hecho · GitHub CI ●';
      renderTui();
      await twait(2600);
      S.toast = '';
      renderTui();
      await twait(1200);
      tui.style.transition = 'opacity .5s';
      tui.style.opacity = '0';
      await sleep(550);
      tui.style.opacity = '1';
    }
  }

  if (reduceMotion) {
    S = freshState();
    fitTui();
    renderTui();
  } else {
    runTui();
  }

  /* ── iTunes: recreación de la pantalla real (igual que /itunes/) ── */

  const itTui = $('#itTui');
  if (itTui) {
    const T = {
      bg: '#14161C', surface: '#1C1F27', selection: '#2D3750', separator: '#2A2E37',
      text: '#C6CAD3', bright: '#FFFFFF', dim: '#878D99', accent: '#7AA2F7', track: '#3B4050'
    };
    const St = (fg, bg = T.bg, b = false) => ({ fg, bg, b });
    const W = 96, H = 26, CW = 10, CH = 5;
    const sec = t => { const [m, s] = t.split(':').map(Number); return m * 60 + s; };
    const fmt = s => { s = Math.max(0, Math.floor(s)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };

    // Carátula de 10×10 px: ruido suave sobre la paleta del álbum (igual que en /itunes/).
    const hash = s => { let h = 2166136261; for (const c of s) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
    const rng = seed => () => { seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    const hexToRgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
    const rgbToHex = c => '#' + c.map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
    function makeCover(seedText, palette) {
      const r = rng(hash(seedText)), g = 4, grid = Array.from({ length: g * g }, () => r());
      const cols = palette.map(hexToRgb), px = [];
      for (let y = 0; y < 10; y++) for (let x = 0; x < 10; x++) {
        const fx = (x / 9) * (g - 1), fy = (y / 9) * (g - 1);
        const x0 = Math.floor(fx), y0 = Math.floor(fy), x1 = Math.min(g - 1, x0 + 1), y1 = Math.min(g - 1, y0 + 1);
        const tx = fx - x0, ty = fy - y0;
        const v = (grid[y0 * g + x0] * (1 - tx) + grid[y0 * g + x1] * tx) * (1 - ty) + (grid[y1 * g + x0] * (1 - tx) + grid[y1 * g + x1] * tx) * ty;
        const p = Math.min(cols.length - 1.001, Math.max(0, (v + (r() - .5) * .35) * (cols.length - 1)));
        const i = Math.floor(p), f = p - i, a = cols[i], b = cols[i + 1];
        px.push(rgbToHex(a.map((c, k) => c + (b[k] - c) * f + (r() - .5) * 18)));
      }
      return px;
    }
    const album = (title, year, codec, palette, tracks) => ({
      title, year, codec, cover: makeCover('Insite' + title, palette),
      tracks: tracks.map(([t, d], i) => ({ n: i + 1, title: t, dur: sec(d) }))
    });
    const ALBUMS = [
      album('Otra Historia EP', 2004, 'FLAC', ['#f2f2f2', '#9a9a9a', '#4a4a4a', '#d0d0d0', '#1a1a1a'], [
        ['Sola', '4:01'], ['Otra Historia', '4:12'], ['Un Dia Mas Sin Ti', '3:21'], ['Quisiera Estar Lejos', '4:34'],
        ['Head Full of Terror', '3:42'], ['Tal Vez y Algun Dia', '4:25'], ['Rojo Azul', '5:48']]),
      album('Una Vida No Es Suficiente', 2007, 'FLAC', ['#5f7a8c', '#9fb2bd', '#c9c2a5', '#3d5566', '#7f97a3'], [
        ['Destrózame', '3:25'], ['Sola', '2:46'], ['Un Día Más Sin Ti', '3:55'], ['Discúlpame Me Rindo', '2:37'],
        ['Preguntas Si Te Amé', '3:27'], ['Contigo Hasta la Muerte', '3:32'], ['Siempre Me Dejas', '3:40'],
        ['Continuación', '5:08']]),
      album('M M X', 2010, 'FLAC', ['#0b1030', '#3d4f9f', '#c0c6e8', '#8a1f2c', '#06070f'], [
        ['Plainsong', '4:49'], ['Las Mismas Cosas', '3:14'], ['Siento Que', '4:08']])
    ];
    const ARTIST_ROWS = ['H', 'Hawthorne Heights', 'I', 'Ice Nine Kills', 'Insite', 'J', 'James Blunt', 'JerryC',
      'K', 'Killswitch Engage', 'Knocked Loose', 'L', 'Libra CL', 'M', 'Motionless In White', 'Muse', 'My Chemical Romance'];

    // Filas de la biblioteca: encabezado de álbum, pistas y relleno hasta la altura de la carátula.
    const rows = [];
    ALBUMS.forEach((alb, al) => {
      if (al > 0) rows.push({ type: 'spacer' });
      const start = rows.length;
      rows.push({ type: 'album', al, start });
      alb.tracks.forEach((_, t) => rows.push({ type: 'track', al, t, start }));
      for (let n = 1 + alb.tracks.length; n < CH; n++) rows.push({ type: 'filler', al, start });
    });
    const trackRows = rows.map((r, i) => r.type === 'track' ? i : -1).filter(i => i >= 0);

    const m = 2, aw = 22, lx = m + aw + 3, playerTop = H - 6, listH = playerTop - 4;
    const S = { cursor: trackRows[1], offset: 0, playing: { al: 0, t: 1 }, elapsed: 74, isPlaying: true, button: 'playPause' };

    class Buf {
      constructor() { this.cells = Array.from({ length: W * H }, () => ({ ch: ' ', ...St(T.text) })); }
      put(ch, x, y, s) { if (x >= 0 && y >= 0 && x < W && y < H) this.cells[y * W + x] = { ch, fg: s.fg, bg: s.bg, b: !!s.b }; }
      text(str, x, y, maxW, s) {
        let c = [...str];
        if (maxW <= 0) return 0;
        if (c.length > maxW) c = c.slice(0, Math.max(0, maxW - 1)).concat('…');
        c.forEach((ch, i) => this.put(ch, x + i, y, s));
        return c.length;
      }
      fill(x, y, w, s, ch = ' ') { for (let i = 0; i < w; i++) this.put(ch, x + i, y, s); }
    }
    const coverRow = (buf, px, row, x, y) => {
      for (let c = 0; c < CW; c++) buf.put('▀', x + c, y, { fg: px[row * 2 * CW + c], bg: px[(row * 2 + 1) * CW + c] });
    };

    function draw() {
      const buf = new Buf(), heading = on => St(on ? T.accent : T.dim, T.bg, true);
      const cur = ALBUMS[S.playing.al], tr = cur.tracks[S.playing.t];

      // Encabezado
      let x = m;
      x += buf.text('ılıl ', x, 0, 10, St(T.accent, T.bg, true));
      buf.text('iTunes', x, 0, 10, St(T.bright, T.bg, true));
      const info = '4280 canciones · 114 artistas';
      buf.text(info, W - m - info.length, 0, info.length, St(T.dim));
      buf.fill(m, 1, W - 2 * m, St(T.separator), '─');

      // Artistas
      buf.text('ARTISTAS', m, 2, aw, heading(false));
      buf.text('/ Buscar artista', m + 1, 3, aw, St(T.track));
      ARTIST_ROWS.slice(0, listH).forEach((name, i) => {
        const y = 4 + i;
        if (name.length === 1) { buf.text(name, m, y, aw, St(T.bright, T.bg, true)); return; }
        let s = St(name === 'Insite' ? T.accent : T.dim);
        if (name === 'Insite') { s = St(T.bright, T.surface); buf.fill(m, y, aw, s); }
        buf.text(name, m + 1, y, aw - 2, s);
      });

      // Biblioteca
      const lw = W - m - lx, listX = lx + CW + 2, listW = lw - CW - 2;
      buf.text('BIBLIOTECA · INSITE', lx, 2, lw, heading(true));
      if (S.cursor < S.offset) S.offset = S.cursor;
      if (S.cursor >= S.offset + listH) S.offset = S.cursor - listH + 1;
      for (let line = 0; line < listH; line++) {
        const row = S.offset + line, item = rows[row];
        if (!item) break;
        const y = 4 + line;
        if (item.type !== 'spacer' && row - item.start < CH) coverRow(buf, ALBUMS[item.al].cover, row - item.start, lx, y);
        const isCursor = row === S.cursor;
        const bs = isCursor ? St(T.bright, T.selection) : St(T.text);
        if (isCursor) buf.fill(listX, y, listW, bs);
        if (item.type === 'spacer') buf.fill(lx, y, lw, St(T.separator), '─');
        else if (item.type === 'album') {
          const alb = ALBUMS[item.al];
          const summary = `${alb.tracks.length} canciones · ${Math.floor(alb.tracks.reduce((s, t) => s + t.dur, 0) / 60)} min`;
          buf.text([alb.title.toUpperCase(), alb.year, alb.codec].join(' · '), listX + 1, y, listW - summary.length - 4, St(T.dim, bs.bg, true));
          buf.text(summary, listX + listW - summary.length - 1, y, summary.length + 1, St(T.dim, bs.bg));
        } else if (item.type === 'track') {
          const t = ALBUMS[item.al].tracks[item.t];
          const playing = S.playing.al === item.al && S.playing.t === item.t;
          if (playing) buf.put('▶', listX + 1, y, St(T.accent, bs.bg));
          buf.text(String(t.n).padStart(2, '0'), listX + 3, y, 2, St(T.dim, bs.bg));
          const dur = fmt(t.dur);
          buf.text(t.title, listX + 6, y, listW - 8 - dur.length, playing ? St(T.accent, bs.bg) : bs);
          buf.text(dur, listX + listW - dur.length - 1, y, dur.length + 1, St(T.dim, bs.bg));
        }
      }

      // Reproductor
      buf.fill(m, playerTop, W - 2 * m, St(T.separator), '─');
      for (let r = 0; r < CH; r++) coverRow(buf, cur.cover, r, m, playerTop + 1 + r);
      const ix = m + CW + 2, iw = W - m - ix;
      buf.text('Vol 100%', W - m - 8, playerTop + 1, 8, St(T.dim));
      buf.text('EQ Rock', W - m - 7, playerTop + 2, 7, St(T.accent));
      buf.text(tr.title, ix, playerTop + 1, iw - 10, St(T.bright, T.bg, true));
      buf.text(`Insite · ${cur.title} (${cur.year})`, ix, playerTop + 2, iw - 10, St(T.text));
      buf.text('FLAC · 44.1 kHz · 16 bit', ix, playerTop + 3, iw - 10, St(T.dim));
      let bx = Math.max(ix, Math.floor((W - 33) / 2));
      [['shuffle', '⇄', T.dim], ['previous', '◀◀', T.text], ['playPause', S.isPlaying ? '❚❚' : '▶', T.accent], ['next', '▶▶', T.text], ['repeat', '↻', T.dim]]
        .forEach(([id, label, fg]) => {
          const s = St(fg, S.button === id ? T.selection : T.bg, id === 'playPause');
          buf.fill(bx, playerTop + 4, 5, s);
          buf.text(label, bx + Math.floor((5 - [...label].length) / 2), playerTop + 4, 5, s);
          bx += 7;
        });
      const now = fmt(S.elapsed), tot = fmt(tr.dur), py = playerTop + 5;
      const barX = ix + tot.length + 1, barW = iw - 2 * (tot.length + 1);
      buf.text(now, barX - 1 - now.length, py, now.length, St(T.dim));
      buf.text(tot, barX + barW + 1, py, tot.length, St(T.dim));
      buf.fill(barX, py, barW, St(T.track), '━');
      buf.fill(barX, py, Math.round((S.elapsed / tr.dur) * barW), St(T.accent), '━');
      return buf;
    }

    const SOLO = new Set(['▶', '◀', '❚', '⇄', '↻', 'ı', '…', '·', '━', '─']);
    function renderIt() {
      const buf = draw(), out = [];
      for (let y = 0; y < H; y++) {
        let row = '<span class="r">', run = null;
        const flush = () => {
          if (!run) return;
          row += `<span style="width:${run.n * .6}em;color:${run.fg};background:${run.bg}">${run.b ? '<b>' + run.s + '</b>' : run.s}</span>`;
          run = null;
        };
        for (let x = 0; x < W; x++) {
          const c = buf.cells[y * W + x];
          if (c.ch === '▀') {
            flush();
            row += `<span style="width:.6em;background:linear-gradient(${c.fg} 50%,${c.bg} 50%)"> </span>`;
          } else if (SOLO.has(c.ch)) {
            flush();
            row += `<span style="width:.6em;text-align:center;color:${c.fg};background:${c.bg}">${c.b ? '<b>' + c.ch + '</b>' : c.ch}</span>`;
          } else if (run && run.fg === c.fg && run.bg === c.bg && run.b === c.b) { run.n++; run.s += escapeHTML(c.ch); }
          else { flush(); run = { fg: c.fg, bg: c.bg, b: c.b, n: 1, s: escapeHTML(c.ch) }; }
        }
        flush();
        out.push(row + '</span>');
      }
      itTui.innerHTML = out.join('');
    }

    function fitIt() {
      const cw = Math.max(3, Math.min(8, itTui.parentElement.clientWidth / W));
      itTui.style.setProperty('--cw', `${cw.toFixed(3)}px`);
    }
    addEventListener('resize', fitIt);
    fitIt();
    renderIt();

    if (!reduceMotion) {
      // Recorre la biblioteca y reproduce de vez en cuando, como alguien usando la app.
      const isVisible = whileVisible(itTui);
      let tick = 0, dir = 1;
      setInterval(() => {
        if (!isVisible()) return;
        tick++;
        const tr = ALBUMS[S.playing.al].tracks[S.playing.t];
        S.elapsed = Math.min(tr.dur - 1, S.elapsed + 0.5);
        if (tick % 3 === 0) {
          let i = trackRows.indexOf(S.cursor) + dir;
          if (i >= trackRows.length || i < 0) { dir = -dir; i += 2 * dir; }
          S.cursor = trackRows[i];
          if (tick % 15 === 0) {
            const item = rows[S.cursor];
            S.playing = { al: item.al, t: item.t };
            S.elapsed = 0;
          }
        }
        renderIt();
      }, 500);
    }
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

  /* ── iConverter: same demo as the app's own page (/iconverter/) ── */

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
    '    return ["iRar", "iGit", "iTunes", "iSpecter",',
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
