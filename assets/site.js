/* ============================================================
   YA HSIU — shared behaviour
   ============================================================ */

/* --- apply persisted font pairing ASAP (before reveal) --- */
(function applyFonts() {
  try {
    var raw = localStorage.getItem('yahsiu.tweaks');
    if (!raw) return;
    var t = JSON.parse(raw);
    var r = document.documentElement.style;
    if (t.fontDisplay) r.setProperty('--font-display', t.fontDisplay);
    if (t.fontBody) r.setProperty('--font-body', t.fontBody);
  } catch (e) {}
})();

/* --- lazy-load the Tweaks panel (React + Babel) so it never blocks
   navigation / interaction. Loads during browser idle, or immediately
   if the host activates edit mode. Font choice is applied above without
   needing any of this. --- */
(function lazyTweaks() {
  var started = false;
  function inject(src, integrity) {
    return new Promise(function (res, rej) {
      var s = document.createElement('script');
      s.src = src;
      if (integrity) { s.integrity = integrity; s.crossOrigin = 'anonymous'; }
      s.onload = res; s.onerror = rej;
      document.head.appendChild(s);
    });
  }
  function load() {
    if (started) return; started = true;
    if (!document.getElementById('tweaks-root')) return;
    inject('https://unpkg.com/react@18.3.1/umd/react.development.js',
           'sha384-hD6/rw4ppMLGNu3tX5cjIb+uRZ7UkRJ6BPkLpg4hAu/6onKUg4lLsHAs9EBPT82L')
      .then(function () { return inject('https://unpkg.com/react-dom@18.3.1/umd/react-dom.development.js',
           'sha384-u6aeetuaXnQ38mYT8rp6sbXaQe3NL9t+IBXmnYxwkUI2Hw4bsp2Wvmx4yRQF1uAm'); })
      .then(function () { return inject('https://unpkg.com/@babel/standalone@7.29.0/babel.min.js',
           'sha384-m08KidiNqLdpJqLq95G/LEi8Qvjl/xUYll3QILypMoQ65QorJ9Lvtp2RXYGBFj1y'); })
      .then(function () {
        ['assets/tweaks-panel.jsx', 'assets/tweaks-bootstrap.jsx'].forEach(function (src) {
          var s = document.createElement('script');
          s.type = 'text/babel'; s.setAttribute('data-presets', 'react'); s.src = src;
          document.body.appendChild(s);
        });
        if (window.Babel && window.Babel.transformScriptTags) window.Babel.transformScriptTags();
      })
      .catch(function () {});
  }
  window.addEventListener('message', function (e) {
    if (e && e.data && e.data.type === '__activate_edit_mode') load();
  });
  if ('requestIdleCallback' in window) requestIdleCallback(load, { timeout: 3000 });
  else setTimeout(load, 1500);
})();

document.addEventListener('DOMContentLoaded', function () {
  /* header shadow on scroll */
  var header = document.querySelector('.site-header');
  function onScroll() {
    if (!header) return;
    header.classList.toggle('scrolled', window.scrollY > 8);
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* mobile nav toggle */
  var toggle = document.querySelector('.nav-toggle');
  var links = document.querySelector('.nav-links');
  if (toggle && links) {
    toggle.addEventListener('click', function () {
      links.classList.toggle('open');
    });
    links.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', function () { links.classList.remove('open'); });
    });
  }

  /* scroll reveal + count-up — scroll-position based (robust everywhere) */
  var reveals = Array.prototype.slice.call(document.querySelectorAll('.reveal'));
  var counters = Array.prototype.slice.call(document.querySelectorAll('.num[data-count], .big[data-count]'));
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  // guarantee numbers are visible immediately (animation is only an enhancement)
  counters.forEach(function (el) {
    var t = parseInt(el.getAttribute('data-count'), 10) || 0;
    var suffix = el.querySelector('small') ? el.querySelector('small').outerHTML : '';
    el.setAttribute('data-final', t + suffix);
    el.innerHTML = t + suffix;
  });

  function inView(el, ratio) {
    var r = el.getBoundingClientRect();
    var vh = window.innerHeight || document.documentElement.clientHeight;
    if (r.height === 0 && r.width === 0) return false;
    var trigger = vh * (1 - (ratio || 0.08));
    return r.top < trigger && r.bottom > 0;
  }

  function checkReveals() {
    reveals = reveals.filter(function (el) {
      if (inView(el, 0.08)) {
        el.classList.add('in');
        // safety: force the resting visible state after the transition would
        // have completed, in case the renderer never advances the transition.
        setTimeout(function () { el.classList.add('reveal-final'); }, 1100);
        return false;
      }
      return true;
    });
    counters = counters.filter(function (el) {
      if (inView(el, 0.3)) { countUp(el); return false; }
      return true;
    });
    if (!reveals.length && !counters.length) {
      window.removeEventListener('scroll', checkReveals);
      window.removeEventListener('resize', checkReveals);
    }
  }

  function countUp(el) {
    var finalHTML = el.getAttribute('data-final');
    if (reduceMotion) { if (finalHTML != null) el.innerHTML = finalHTML; return; }
    var target = parseInt(el.getAttribute('data-count'), 10) || 0;
    var dur = 1100, start = null;
    var suffix = el.querySelector('small') ? el.querySelector('small').outerHTML : '';
    if (finalHTML == null) finalHTML = target + suffix;
    function step(ts) {
      if (start === null) start = ts;
      var p = Math.min((ts - start) / dur, 1);
      var eased = 1 - Math.pow(1 - p, 3);
      el.innerHTML = Math.round(target * eased) + suffix;
      if (p < 1) requestAnimationFrame(step);
      else el.innerHTML = finalHTML;
    }
    requestAnimationFrame(step);
    // safety: force the final value even if rAF stalls
    setTimeout(function () { el.innerHTML = finalHTML; }, dur + 400);
  }

  window.addEventListener('scroll', checkReveals, { passive: true });
  window.addEventListener('resize', checkReveals);
  // initial passes (cover late layout / font load)
  requestAnimationFrame(checkReveals);
  setTimeout(checkReveals, 120);
  setTimeout(checkReveals, 600);

  /* active section highlight in nav (anchor pages) */
  var navAnchors = Array.prototype.slice.call(
    document.querySelectorAll('.nav-links a[data-section]'));
  if (navAnchors.length) {
    var sections = [];
    navAnchors.forEach(function (a) {
      var sec = document.getElementById(a.getAttribute('data-section'));
      if (sec) sections.push({ a: a, sec: sec });
    });
    function spyScroll() {
      var probe = window.scrollY + window.innerHeight * 0.4;
      var current = null;
      sections.forEach(function (o) {
        if (o.sec.offsetTop <= probe) current = o;
      });
      navAnchors.forEach(function (a) { a.classList.remove('active'); });
      if (current) current.a.classList.add('active');
    }
    window.addEventListener('scroll', spyScroll, { passive: true });
    spyScroll();
  }

  /* ---------- reading UX: progress bar + back-to-top ---------- */
  var progress = document.createElement('div');
  progress.className = 'scroll-progress';
  progress.setAttribute('aria-hidden', 'true');
  document.body.appendChild(progress);

  var toTop = document.createElement('button');
  toTop.className = 'to-top';
  toTop.setAttribute('aria-label', 'Back to top');
  toTop.innerHTML = '\u2191';
  toTop.addEventListener('click', function () {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
  document.body.appendChild(toTop);

  function onReadScroll() {
    var doc = document.documentElement;
    var max = (doc.scrollHeight - window.innerHeight) || 1;
    var pct = Math.min(Math.max(window.scrollY / max, 0), 1);
    progress.style.width = (pct * 100) + '%';
    toTop.classList.toggle('show', window.scrollY > 640);
  }
  window.addEventListener('scroll', onReadScroll, { passive: true });
  onReadScroll();

  /* ---------- section rail (scrollspy) for long case studies ---------- */
  var caseSections = Array.prototype.slice.call(document.querySelectorAll('.case-section'));
  if (caseSections.length >= 4) {
    var rail = document.createElement('nav');
    rail.className = 'section-rail';
    rail.setAttribute('aria-label', 'Sections');
    var railItems = [];

    caseSections.forEach(function (sec, i) {
      var titleEl = sec.querySelector('.section-title');
      if (!titleEl) return;
      if (!sec.id) sec.id = 'sec-' + (i + 1);
      var label = titleEl.textContent.trim();
      var a = document.createElement('a');
      a.href = '#' + sec.id;
      a.innerHTML = '<span class="rail-label">' + label + '</span><span class="rail-dot"></span>';
      a.addEventListener('click', function (e) {
        e.preventDefault();
        var y = sec.getBoundingClientRect().top + window.scrollY - 96;
        window.scrollTo({ top: y, behavior: 'smooth' });
      });
      rail.appendChild(a);
      railItems.push({ a: a, sec: sec });
    });

    document.body.appendChild(rail);

    function railScroll() {
      rail.classList.toggle('show', window.scrollY > 560);
      var probe = window.scrollY + window.innerHeight * 0.35;
      var cur = null;
      railItems.forEach(function (o) {
        if (o.sec.offsetTop - 120 <= probe) cur = o;
      });
      railItems.forEach(function (o) { o.a.classList.remove('active'); });
      if (cur) cur.a.classList.add('active');
    }
    window.addEventListener('scroll', railScroll, { passive: true });
    railScroll();
  }

  /* ---------- skill tabs (about page) ---------- */
  var skillTabs = Array.prototype.slice.call(document.querySelectorAll('.skill-tab'));
  if (skillTabs.length) {
    skillTabs.forEach(function (tab) {
      tab.addEventListener('click', function () {
        var target = tab.getAttribute('data-panel');
        skillTabs.forEach(function (t) { t.classList.toggle('active', t === tab); });
        document.querySelectorAll('.skill-panel').forEach(function (p) {
          p.classList.toggle('active', p.getAttribute('data-panel') === target);
        });
      });
    });
  }

  /* ---------- timeline fill + dot activation (about page) ---------- */
  var timeline = document.querySelector('.timeline');
  if (timeline) {
    var fill = timeline.querySelector('.timeline-line .fill');
    var tlItems = Array.prototype.slice.call(timeline.querySelectorAll('.tl-item'));
    function timelineScroll() {
      var rect = timeline.getBoundingClientRect();
      var vhMid = window.innerHeight * 0.5;
      var prog = (vhMid - rect.top) / (rect.height || 1);
      prog = Math.min(Math.max(prog, 0), 1);
      if (fill) fill.style.height = (prog * 100) + '%';
      tlItems.forEach(function (it) {
        var d = it.querySelector('.tl-dot');
        if (!d) return;
        var dr = d.getBoundingClientRect();
        it.classList.toggle('in', dr.top <= vhMid + 8);
      });
    }
    window.addEventListener('scroll', timelineScroll, { passive: true });
    window.addEventListener('resize', timelineScroll);
    timelineScroll();
    setTimeout(timelineScroll, 300);
  }

  /* ---------- contact form (validation + success + mailto) ---------- */
  var form = document.querySelector('.contact-form');
  if (form) {
    var TO = form.getAttribute('data-to') || '';
    function setError(field, on) { field.classList.toggle('invalid', !!on); }
    function emailOk(v) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v); }

    function validateField(field) {
      var input = field.querySelector('input, textarea');
      if (!input) return true;
      var v = input.value.trim();
      var ok = true;
      if (input.required && !v) ok = false;
      if (ok && input.type === 'email' && v && !emailOk(v)) ok = false;
      setError(field, !ok);
      return ok;
    }

    form.querySelectorAll('.field input, .field textarea').forEach(function (input) {
      input.addEventListener('blur', function () { validateField(input.closest('.field')); });
      input.addEventListener('input', function () {
        var f = input.closest('.field');
        if (f.classList.contains('invalid')) validateField(f);
      });
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var fields = Array.prototype.slice.call(form.querySelectorAll('.field'));
      var allOk = true; var firstBad = null;
      fields.forEach(function (f) {
        var ok = validateField(f);
        if (!ok && !firstBad) firstBad = f;
        if (!ok) allOk = false;
      });
      if (!allOk) {
        if (firstBad) { var i = firstBad.querySelector('input, textarea'); if (i) i.focus(); }
        return;
      }
      var name = form.querySelector('[name="name"]') ? form.querySelector('[name="name"]').value.trim() : '';
      var formData = new FormData(form);
      var btn = form.querySelector('.btn-submit');
      if (btn) btn.disabled = true;
      fetch('https://api.web3forms.com/submit', { method: 'POST', body: formData })
        .then(function (res) { return res.json(); })
        .then(function () {
          var success = document.querySelector('.form-success');
          var fieldsWrap = form.querySelector('.form-fields');
          if (fieldsWrap) fieldsWrap.style.display = 'none';
          if (success) {
            success.classList.add('show');
            var nm = success.querySelector('[data-success-name]');
            if (nm) nm.textContent = name ? name.split(' ')[0] : '';
          }
        })
        .catch(function () {
          if (btn) btn.disabled = false;
          alert('送出失敗，請稍後再試。');
        });
    });
  }

  /* ---------- youtube facade ---------- */
  document.querySelectorAll('.yt-facade').forEach(function (facade) {
    function activate(e) {
      e.stopPropagation();
      var id = facade.getAttribute('data-yt-id');
      var start = facade.getAttribute('data-yt-start') || '0';
      var src = 'https://www.youtube.com/embed/' + id + '?autoplay=1&rel=0' + (start !== '0' ? '&start=' + start : '');
      var iframe = document.createElement('iframe');
      iframe.setAttribute('src', src);
      iframe.setAttribute('title', (facade.querySelector('img') || {}).alt || '');
      iframe.setAttribute('allow', 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share');
      iframe.setAttribute('allowfullscreen', '');
      iframe.setAttribute('loading', 'eager');
      iframe.style.cssText = 'width:100%;height:100%;display:block;border:0;';
      facade.innerHTML = '';
      facade.appendChild(iframe);
      facade.classList.add('playing');
    }
    facade.addEventListener('click', activate);
    facade.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') activate(e); });
  });

  /* ---------- lightbox ---------- */
  var lbOverlay = document.createElement('div');
  lbOverlay.className = 'lb-overlay';
  lbOverlay.setAttribute('aria-modal', 'true');
  lbOverlay.setAttribute('role', 'dialog');
  var lbImg = document.createElement('img');
  var lbClose = document.createElement('button');
  lbClose.className = 'lb-close';
  lbClose.setAttribute('aria-label', 'Close');
  lbClose.innerHTML = '&times;';
  lbOverlay.appendChild(lbImg);
  lbOverlay.appendChild(lbClose);
  document.body.appendChild(lbOverlay);

  function openLb(src, alt) {
    lbImg.src = src; lbImg.alt = alt || '';
    lbOverlay.classList.add('open');
    document.body.style.overflow = 'hidden';
  }
  function closeLb() {
    lbOverlay.classList.remove('open');
    document.body.style.overflow = '';
  }
  lbClose.addEventListener('click', closeLb);
  lbOverlay.addEventListener('click', function (e) { if (e.target === lbOverlay) closeLb(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeLb(); });

  document.querySelectorAll('main img').forEach(function (img) {
    if (img.closest('.yt-facade') || img.closest('.yt-thumb') || img.closest('.card') || img.closest('.lcard')) return;
    img.addEventListener('click', function () { openLb(img.src, img.alt); });
  });

  /* ---------- projects filter (projects page) ---------- */
  var filterBar = document.querySelector('.filter-bar');
  if (filterBar) {
    var chips = Array.prototype.slice.call(filterBar.querySelectorAll('.filter-chip'));
    var cards = Array.prototype.slice.call(document.querySelectorAll('.proj-grid .card'));
    var empty = document.querySelector('.proj-empty');
    chips.forEach(function (chip) {
      chip.addEventListener('click', function () {
        var f = chip.getAttribute('data-filter');
        chips.forEach(function (c) { c.classList.toggle('active', c === chip); });
        var shown = 0;
        cards.forEach(function (card) {
          var cats = (card.getAttribute('data-cats') || '').split(/\s+/);
          var match = (f === 'all') || cats.indexOf(f) !== -1;
          card.classList.toggle('is-hidden', !match);
          if (match) shown++;
        });
        if (empty) empty.classList.toggle('show', shown === 0);
      });
    });
  }
});
