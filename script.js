/* ============ Edexcel IAL Chemistry — Study Hub interactions ============ */

(function () {
  'use strict';

  var root = document.documentElement;
  var store = {
    get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  };

  /* ---------- Theme toggle ---------- */
  var themeBtn = document.getElementById('themeToggle');
  themeBtn.addEventListener('click', function () {
    var next = (root.getAttribute('data-theme') || 'light') === 'dark' ? 'light' : 'dark';
    root.setAttribute('data-theme', next);
    store.set('ial-chem-theme', next);
  });

  /* ---------- Section registry ---------- */
  var sections = Array.prototype.slice.call(document.querySelectorAll('section.sp'));
  var spById = {};
  sections.forEach(function (s) { spById[s.id] = s; });

  function topicOf(sec) {
    return sec.closest('#topic8') ? 'topic8' : 'topic7';
  }
  function shortLabel(sec) {
    var num = sec.querySelector('.sp-num');
    var title = sec.querySelector('.sp-title');
    var t = title ? title.textContent.replace(num ? num.textContent : '', '').trim() : '';
    return (num ? num.textContent + ' · ' : '') + t.split('—')[0].split(':')[0];
  }

  /* ---------- Accordion behaviour ---------- */
  function isOpen(sec) { return sec.classList.contains('open'); }

  function setOpen(sec, open, opts) {
    opts = opts || {};
    var body = sec.querySelector('.sp-body');
    var btn = sec.querySelector('.sp-toggle');
    if (!body || !btn) return;
    sec.classList.toggle('open', open);
    btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    // measure for smooth height animation
    if (open) {
      body.style.maxHeight = body.scrollHeight + 'px';
      // after transition, release so inner content can reflow (tables etc.)
      window.setTimeout(function () {
        if (isOpen(sec)) body.style.maxHeight = 'none';
      }, 450);
    } else {
      if (body.style.maxHeight === 'none') body.style.maxHeight = body.scrollHeight + 'px';
      // force reflow then collapse
      void body.offsetHeight;
      body.style.maxHeight = '0px';
    }
    if (open) markRead(sec);
    if (opts.scroll) {
      window.setTimeout(function () {
        var y = sec.getBoundingClientRect().top + window.scrollY - 92;
        window.scrollTo({ top: y, behavior: prefersReduced() ? 'auto' : 'smooth' });
      }, 60);
    }
  }

  function prefersReduced() {
    return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  sections.forEach(function (sec) {
    var btn = sec.querySelector('.sp-toggle');
    if (!btn) return;
    btn.addEventListener('click', function () {
      if (focusMode()) {
        // in focus mode clicking just toggles current
        setOpen(sec, !isOpen(sec));
      } else {
        setOpen(sec, !isOpen(sec));
      }
    });
    // start collapsed unless saved state says otherwise
    var body = sec.querySelector('.sp-body');
    if (body) body.style.maxHeight = '0px';
  });

  /* ---------- View modes: compact | expanded (+ focus via data-mode) ---------- */
  var viewButtons = Array.prototype.slice.call(document.querySelectorAll('.cb-btn[data-view]'));

  function applyView(view, opts) {
    opts = opts || {};
    store.set('ial-chem-view', view);
    viewButtons.forEach(function (b) { b.classList.toggle('active', b.dataset.view === view); });
    if (view === 'expanded') {
      sections.forEach(function (s) { setOpen(s, true); });
    } else if (view === 'compact' && !focusMode()) {
      if (opts.collapseAll !== false) sections.forEach(function (s) { setOpen(s, false); });
    }
  }

  viewButtons.forEach(function (b) {
    b.addEventListener('click', function () {
      exitFocus();
      applyView(b.dataset.view);
    });
  });

  /* ---------- Focus mode (one section at a time) ---------- */
  var focusActive = false;
  var focusIndex = 0;

  function focusMode() { return focusActive; }

  var modeBtns = [document.getElementById('modeToggle'), document.getElementById('modeToggleHero'), document.getElementById('focusBtnTop')];

  function enterFocus(i) {
    focusActive = true;
    root.setAttribute('data-mode', 'study');
    store.set('ial-chem-mode', 'study');
    if (typeof i !== 'number') i = 0;
    focusIndex = Math.max(0, Math.min(i, sections.length - 1));
    showFocusSection();
    modeBtns.forEach(function (b) { if (b) b.classList.add('on'); });
    var mt = document.getElementById('modeToggle');
    if (mt) mt.setAttribute('aria-pressed', 'true');
  }

  function exitFocus() {
    focusActive = false;
    root.removeAttribute('data-mode');
    store.set('ial-chem-mode', 'browse');
    modeBtns.forEach(function (b) { if (b) b.classList.remove('on'); });
    var mt = document.getElementById('modeToggle');
    if (mt) mt.setAttribute('aria-pressed', 'false');
    var view = store.get('ial-chem-view') || 'compact';
    applyView(view, { collapseAll: view === 'compact' });
  }

  function showFocusSection() {
    sections.forEach(function (s, idx) {
      s.classList.toggle('focus-current', idx === focusIndex);
      setOpen(s, idx === focusIndex);
    });
    var cur = sections[focusIndex];
    if (cur) {
      updateSectionNav(cur);
      window.setTimeout(function () {
        var y = cur.getBoundingClientRect().top + window.scrollY - 100;
        window.scrollTo({ top: y, behavior: prefersReduced() ? 'auto' : 'smooth' });
      }, 30);
    }
  }

  function stepFocus(delta) {
    if (!focusActive) return;
    var next = Math.max(0, Math.min(focusIndex + delta, sections.length - 1));
    if (next !== focusIndex) { focusIndex = next; showFocusSection(); }
  }

  function toggleFocus() {
    if (focusActive) exitFocus(); else enterFocus(0);
  }

  modeBtns.forEach(function (b) {
    if (b) b.addEventListener('click', toggleFocus);
  });

  document.addEventListener('keydown', function (e) {
    if (e.target.matches('input, textarea')) return;
    if (e.key === 'm' || e.key === 'M') { toggleFocus(); }
    if (focusActive) {
      if (e.key === 'ArrowRight') { stepFocus(1); e.preventDefault(); }
      if (e.key === 'ArrowLeft') { stepFocus(-1); e.preventDefault(); }
      if (e.key === 'Escape') exitFocus();
    }
  });

  /* ---------- Prev / Next buttons inside each card ---------- */
  sections.forEach(function (sec, idx) {
    var nav = sec.querySelector('.sp-nav');
    if (!nav) return;
    var prevBtn = nav.querySelector('.btn-prev');
    var nextBtn = nav.querySelector('.btn-next');
    if (idx === 0) prevBtn.style.visibility = 'hidden';
    if (idx === sections.length - 1) nextBtn.textContent = 'Finish ✓';
    prevBtn.addEventListener('click', function () { goInSection(idx - 1); });
    nextBtn.addEventListener('click', function () {
      if (idx === sections.length - 1) { window.location.hash = '#top'; return; }
      goInSection(idx + 1);
    });
  });

  function goInSection(idx) {
    if (idx < 0 || idx >= sections.length) return;
    if (focusActive) { focusIndex = idx; showFocusSection(); return; }
    // browse mode: close current, open target and scroll
    sections.forEach(function (s, i) { setOpen(s, i === idx); });
    var sec = sections[idx];
    window.setTimeout(function () {
      var y = sec.getBoundingClientRect().top + window.scrollY - 92;
      window.scrollTo({ top: y, behavior: prefersReduced() ? 'auto' : 'smooth' });
    }, 60);
    updateSectionNav(sec);
  }

  /* ---------- Expand-all buttons on hero cards ---------- */
  Array.prototype.slice.call(document.querySelectorAll('.expand-all-btn')).forEach(function (b) {
    b.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      var topicId = b.dataset.expand;
      var topicEl = document.getElementById(topicId);
      topicEl.querySelectorAll('section.sp').forEach(function (s) { setOpen(s, true); });
      window.location.hash = '#' + topicId;
    });
  });

  /* ---------- Reading progress ("sections read") ---------- */
  var readSet = {};
  try { readSet = JSON.parse(store.get('ial-chem-read') || '{}'); } catch (e) { readSet = {}; }

  var progressText = document.getElementById('progressText');
  var readBarFill = document.getElementById('readBarFill');

  function renderProgress() {
    var n = Object.keys(readSet).length;
    progressText.textContent = n + ' of ' + sections.length + ' sections opened';
    readBarFill.style.width = (n / sections.length * 100) + '%';
    sections.forEach(function (s) { s.classList.toggle('read', !!readSet[s.id]); });
  }

  function markRead(sec) {
    if (!readSet[sec.id]) {
      readSet[sec.id] = 1;
      store.set('ial-chem-read', JSON.stringify(readSet));
      renderProgress();
    }
  }

  var resetBtn = document.createElement('button');
  resetBtn.className = 'cb-reset';
  resetBtn.type = 'button';
  resetBtn.textContent = '↺ Reset progress';
  resetBtn.title = 'Clear your “sections opened” progress';
  resetBtn.addEventListener('click', function () {
    readSet = {};
    store.set('ial-chem-read', '{}');
    renderProgress();
  });
  document.getElementById('controlsBar').appendChild(resetBtn);

  renderProgress();

  /* ---------- Mobile sticky section navigator ---------- */
  var snPrev = document.getElementById('snPrev');
  var snNext = document.getElementById('snNext');
  var snCurrent = document.getElementById('snCurrent');
  var snExpand = document.getElementById('snExpand');
  var sectionNav = document.getElementById('sectionNav');
  var currentSec = null;

  function updateSectionNav(sec) {
    currentSec = sec;
    var idx = sections.indexOf(sec);
    snCurrent.textContent = shortLabel(sec);
    snCurrent.title = shortLabel(sec);
    snPrev.disabled = idx <= 0;
    snNext.disabled = idx >= sections.length - 1;
    snExpand.textContent = isOpen(sec) ? '▴' : '▾';
  }

  snPrev.addEventListener('click', function () {
    if (!currentSec) return;
    goInSection(sections.indexOf(currentSec) - 1);
  });
  snNext.addEventListener('click', function () {
    if (!currentSec) return;
    goInSection(sections.indexOf(currentSec) + 1);
  });
  snExpand.addEventListener('click', function () {
    if (!currentSec) return;
    setOpen(currentSec, !isOpen(currentSec), { scroll: true });
    snExpand.textContent = isOpen(currentSec) ? '▴' : '▾';
  });

  /* ---------- Scroll spy: which section is current ---------- */
  var toc = document.getElementById('tocNav');
  var tocLinks = Array.prototype.slice.call(toc.querySelectorAll('a[href^="#sp-"]'));
  var linkMap = {};
  tocLinks.forEach(function (a) { linkMap[a.getAttribute('href').slice(1)] = a; });

  function setActiveLink(id) {
    tocLinks.forEach(function (a) { a.classList.remove('active'); });
    if (linkMap[id]) {
      linkMap[id].classList.add('active');
      var el = linkMap[id], box = toc.getBoundingClientRect(), r = el.getBoundingClientRect();
      if (r.top < box.top + 40 || r.bottom > box.bottom - 40) el.scrollIntoView({ block: 'nearest' });
    }
  }

  if ('IntersectionObserver' in window) {
    var visibleSet = new Set();
    var order = sections.map(function (s) { return s.id; });

    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          visibleSet.add(entry.target.id);
          entry.target.classList.add('visible');
        } else {
          visibleSet.delete(entry.target.id);
        }
      });
      for (var i = 0; i < order.length; i++) {
        if (visibleSet.has(order[i])) {
          setActiveLink(order[i]);
          updateSectionNav(spById[order[i]]);
          break;
        }
      }
      toc.classList.toggle('show', visibleSet.size > 0);
      sectionNav.classList.toggle('show', visibleSet.size > 0);
    }, { threshold: 0.02, rootMargin: '-80px 0px -30% 0px' });

    sections.forEach(function (s) { spy.observe(s); });

    var reveal = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          reveal.unobserve(entry.target);
        }
      });
    }, { threshold: 0.06, rootMargin: '0px 0px -40px 0px' });
    sections.forEach(function (s) { reveal.observe(s); });
  } else {
    sections.forEach(function (s) { s.classList.add('visible'); });
  }

  /* ---------- TOC links also open their target section ---------- */
  tocLinks.concat(Array.prototype.slice.call(document.querySelectorAll('.ov-steps a')))
    .forEach(function (a) {
      a.addEventListener('click', function () {
        var id = a.getAttribute('href').slice(1);
        var sec = spById[id];
        if (!sec) return;
        if (focusActive) {
          focusIndex = sections.indexOf(sec);
          showFocusSection();
        } else {
          setOpen(sec, true);
        }
      });
    });

  /* ---------- Progress bar & back-to-top ---------- */
  var progressBar = document.getElementById('progressBar');
  var backToTop = document.getElementById('backToTop');

  function updateProgress() {
    var doc = document.documentElement;
    var max = doc.scrollHeight - window.innerHeight;
    var pct = max > 0 ? (window.scrollY / max) * 100 : 0;
    progressBar.style.width = Math.min(100, Math.max(0, pct)) + '%';
    backToTop.classList.toggle('show', window.scrollY > 600);
  }

  var ticking = false;
  window.addEventListener('scroll', function () {
    if (!ticking) {
      window.requestAnimationFrame(function () { updateProgress(); ticking = false; });
      ticking = true;
    }
  }, { passive: true });
  window.addEventListener('resize', updateProgress);
  updateProgress();

  /* ---------- Initial state ---------- */
  var savedMode = store.get('ial-chem-mode');
  var savedView = store.get('ial-chem-view') || 'compact';
  if (savedMode === 'study') {
    enterFocus(0);
  } else {
    applyView(savedView, { collapseAll: false });
    // In compact view keep everything closed; in expanded open all
    if (savedView === 'expanded') sections.forEach(function (s) { setOpen(s, true); });
  }

  // Deep-link support: opening #sp-x directly expands that section
  function handleHash() {
    var id = location.hash.replace('#', '');
    var sec = spById[id];
    if (sec) {
      if (focusActive) { focusIndex = sections.indexOf(sec); showFocusSection(); }
      else setOpen(sec, true);
    }
  }
  window.addEventListener('hashchange', handleHash);
  handleHash();
})();
