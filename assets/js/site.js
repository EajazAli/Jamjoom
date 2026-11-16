/* ==========================================================================
   Jamjoom Printing & Packaging — motion engine
   GSAP + ScrollTrigger + SplitText + Lenis (loaded from the jsDelivr CDN)
   ========================================================================== */
(function () {
  'use strict';

  var root = document.documentElement;
  var body = document.body;
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var hasLibs = !!(window.gsap && window.ScrollTrigger && window.SplitText);

  var menuTl = null, menuOpen = false;
  var isRTL = root.getAttribute('dir') === 'rtl';
  var isArabic = (root.getAttribute('lang') || '').indexOf('ar') === 0;
  var I18N = window.JPP_I18N || {};

  /* Language toggle: remember the choice so the head script opens the right version next time */
  document.addEventListener('click', function (e) {
    var a = e.target.closest ? e.target.closest('[data-set-lang]') : null;
    if (!a) return;
    try { localStorage.setItem('jpp-lang', a.getAttribute('data-set-lang')); } catch (err) { /* private mode */ }
  }, true);

  function bail() { root.classList.remove('js', 'is-preloading', 'is-entering'); }
  window.__jppReady = true;

  /* ---------- Things that work with or without the motion libraries ---------- */
  initClock();
  initVideos();
  initLightbox();

  if (!hasLibs || reduced) {
    bail();
    initVideos('.chapter video');
    initMenuBasic();
    return;
  }

  gsap.registerPlugin(ScrollTrigger, SplitText);
  gsap.defaults({ ease: 'expo.out', duration: 1.2 });
  ScrollTrigger.config({ ignoreMobileResize: true });

  /* ---------- Smooth scroll ---------- */
  var lenis = null;
  if (window.Lenis) {
    lenis = new Lenis({
      duration: 1.15,
      easing: function (t) { return Math.min(1, 1.001 - Math.pow(2, -10 * t)); },
      smoothWheel: true,
      autoRaf: false
    });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(function (t) { lenis.raf(t * 1000); });
    gsap.ticker.lagSmoothing(0);
  }
  function lockScroll(on) { if (lenis) { on ? lenis.stop() : lenis.start(); } body.style.overflow = on ? 'hidden' : ''; }
  function scrollToTarget(target, immediate) {
    var el = typeof target === 'string' ? $(target) : target;
    if (!el && target !== 0) return;
    if (lenis) lenis.scrollTo(target === 0 ? 0 : el, { offset: target === 0 ? 0 : -90, duration: 1.6, immediate: !!immediate });
    else (target === 0 ? window.scrollTo({ top: 0, behavior: 'smooth' }) : el.scrollIntoView({ behavior: 'smooth' }));
  }

  /* ---------- Boot sequence ---------- */
  var fontsReady = (document.fonts && document.fonts.ready) ? document.fonts.ready : Promise.resolve();
  var fontsOrTimeout = Promise.race([fontsReady, new Promise(function (r) { setTimeout(r, 1800); })]);

  initCursor();
  initMenu();
  initHeader();
  initLinks();

  var boot = root.classList.contains('is-preloading') ? runPreloader : runEnter;
  fontsOrTimeout.then(function () {
    boot(function () {
      initScrollMotion();
      if (location.hash && $(location.hash)) {
        setTimeout(function () { ScrollTrigger.refresh(); scrollToTarget(location.hash, true); }, 60);
      }
    });
  });

  window.addEventListener('load', function () { ScrollTrigger.refresh(); });
  window.addEventListener('pageshow', function (e) {
    if (!e.persisted) return;
    var t = $('.transition');
    if (t) { t.classList.remove('is-active'); gsap.set($$('.transition__sheet', t), { yPercent: 0, y: '101%' }); }
    root.classList.remove('is-entering', 'is-preloading');
  });

  /* ======================================================================
     Preloader — four plates ink up, then the separations peel away
     ====================================================================== */
  function runPreloader(done) {
    var pre = $('.preloader');
    if (!pre) { root.classList.remove('is-preloading'); done(); return; }
    var count = $('.preloader__count', pre);
    var bars = $$('.preloader__bars span', pre);
    var words = $$('.preloader__word span', pre);
    var state = { v: 0 };
    lockScroll(true);
    window.scrollTo(0, 0);

    var tl = gsap.timeline({
      onComplete: function () {
        root.classList.remove('is-preloading');
        lockScroll(false);
        try { sessionStorage.setItem('jpp-seen', '1'); } catch (e) { /* private mode */ }
      }
    });
    tl.from(words, { yPercent: 110, duration: 1.1, stagger: .08 }, .1)
      .from([$('.preloader__top', pre), $('.preloader__bottom', pre)], { opacity: 0, duration: .8, ease: 'power2.out' }, .2)
      .to(state, {
        v: 100, duration: 2.1, ease: 'power2.inOut',
        onUpdate: function () {
          var v = state.v;
          count.textContent = ('00' + Math.round(v)).slice(-3);
          bars.forEach(function (b, i) {
            var p = Math.max(0, Math.min(1, (v - i * 12) / (100 - i * 12)));
            b.style.setProperty('--p', p.toFixed(3));
          });
        }
      }, .2)
      .to(words, { yPercent: -110, duration: .8, ease: 'expo.in', stagger: .05 }, '>-.1')
      .to([$('.preloader__top', pre), $('.preloader__bottom', pre)], { opacity: 0, duration: .4, ease: 'power2.in' }, '<')
      .add(function () { done(); })
      .to($$('.preloader__sheet', pre).reverse().concat(), { yPercent: -101, duration: 1.15, ease: 'expo.inOut', stagger: .1 }, '>-.05')
      .to($('.preloader__inner', pre), { yPercent: -101, duration: 1.15, ease: 'expo.inOut' }, '<');
  }

  /* Arriving from another page: peel the sheets that covered the last page */
  function runEnter(done) {
    var t = $('.transition');
    if (!t) { root.classList.remove('is-entering'); done(); return; }
    var sheets = $$('.transition__sheet', t);
    var label = $('.transition__label span', t);
    if (label) label.textContent = body.getAttribute('data-page') || '';
    gsap.set(sheets, { y: 0, yPercent: 0 });
    root.classList.remove('is-entering');
    t.classList.add('is-active');
    gsap.timeline({ onComplete: function () { t.classList.remove('is-active'); gsap.set(sheets, { yPercent: 0, y: '101%' }); } })
      .fromTo(label, { yPercent: 0 }, { yPercent: -110, duration: .6, ease: 'expo.in' }, .15)
      .add(function () { done(); }, .55)
      .to(sheets.slice().reverse(), { yPercent: -101, duration: 1.05, ease: 'expo.inOut', stagger: .09 }, .5);
  }

  function leaveTo(url, name) {
    var t = $('.transition');
    if (!t) { location.href = url; return; }
    var sheets = $$('.transition__sheet', t);
    var label = $('.transition__label span', t);
    if (label) label.textContent = name || '';
    t.classList.add('is-active');
    lockScroll(true);
    gsap.set(sheets, { y: 0, yPercent: 101 });
    gsap.timeline({ onComplete: function () { location.href = url; } })
      .to(sheets, { yPercent: 0, duration: .95, ease: 'expo.inOut', stagger: .085 })
      .fromTo(label, { yPercent: 110 }, { yPercent: 0, duration: .8 }, .55);
  }

  /* ---------- Internal links → page transition ---------- */
  function initLinks() {
    var names = I18N.names || { 'index.html': 'Home', '': 'Home', 'process.html': 'Process', 'solution.html': 'Solutions', 'color.html': 'Colours', 'about.html': 'About' };
    document.addEventListener('click', function (e) {
      var a = e.target.closest ? e.target.closest('a[href]') : null;
      if (!a || e.defaultPrevented) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
      if (a.target === '_blank' || a.hasAttribute('download')) return;
      var href = a.getAttribute('href');
      if (!href || /^(mailto:|tel:|javascript:)/i.test(href)) return;
      var url;
      try { url = new URL(a.href, location.href); } catch (err) { return; }
      if (url.origin !== location.origin) return;

      var samePage = url.pathname === location.pathname;
      if (samePage && url.hash) {
        var target = $(url.hash);
        if (!target) return;
        e.preventDefault();
        closeMenu(function () { scrollToTarget(target); });
        history.replaceState(null, '', url.hash);
        return;
      }
      if (samePage && !url.hash) {
        e.preventDefault();
        closeMenu(function () { scrollToTarget(0); });
        return;
      }
      e.preventDefault();
      var file = url.pathname.split('/').pop();
      var name = a.getAttribute('data-label') || (url.hash === '#contact' ? (I18N.contact || 'Contact') : (names[file] || ''));
      leaveTo(url.href, name);
    });

    $$('[data-top]').forEach(function (b) { b.addEventListener('click', function () { scrollToTarget(0); }); });
  }

  /* ======================================================================
     Scroll-driven motion (created once the curtain lifts)
     ====================================================================== */
  function initScrollMotion() {
    initSplits();
    initReveals();
    initHero();
    initStatement();
    initChapters();
    initHorizontal();
    initMarquees();
    initCounters();
    initParallax();
    initFooter();
    initColourNav();
    initHoverFx();
    /* lazy images change the page height — keep trigger positions honest */
    var refreshTimer = null;
    $$('img').forEach(function (img) {
      if (img.complete) return;
      img.addEventListener('load', function () { clearTimeout(refreshTimer); refreshTimer = setTimeout(function () { ScrollTrigger.refresh(); }, 250); }, { once: true });
    });
    gsap.to('.progress', { scaleX: 1, ease: 'none', scrollTrigger: { start: 0, end: 'max', scrub: .3 } });
    ScrollTrigger.refresh();
  }

  /* Line splitter for Arabic. SplitText finds lines by x-position, which mixed right-to-left /
     left-to-right text (Arabic next to "JP&P" or "2018") defeats; this one groups whole words by
     their vertical position only, and never cuts inside a word, so letters stay joined. */
  var bidiSplits = [];
  function splitLinesBidi(el) {
    if (el.__src === undefined) el.__src = el.innerHTML;
    el.innerHTML = el.__src;
    var units = [];
    /* short accent phrases stay together; long ones may wrap inside their own line */
    $$('*', el).forEach(function (n) { if (n.tagName !== 'BR' && n.textContent.trim().split(/\s+/).length <= 2) n.style.whiteSpace = 'nowrap'; });
    Array.prototype.slice.call(el.childNodes).forEach(function (n) {
      if (n.nodeType === 3) {
        var frag = document.createDocumentFragment();
        n.textContent.split(/(\s+)/).forEach(function (part) {
          if (!part) return;
          if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(' ')); return; }
          var s = document.createElement('span'); s.textContent = part; s.__word = true; frag.appendChild(s); units.push(s);
        });
        el.replaceChild(frag, n);
      } else if (n.nodeType === 1) { units.push(n); }
    });
    var lh = parseFloat(getComputedStyle(el).lineHeight) || (parseFloat(getComputedStyle(el).fontSize) * 1.3);
    var groups = [], cur = null, top = 0;
    units.forEach(function (u) {
      if (u.tagName === 'BR') { cur = null; return; }
      var t = u.offsetTop;
      if (!cur || Math.abs(t - top) > lh * .5) { cur = []; groups.push(cur); top = t; }
      cur.push(u);
    });
    el.innerHTML = '';
    return groups.map(function (ws) {
      var mask = document.createElement('div'); mask.className = 'sl-mask';
      var line = document.createElement('div'); line.className = 'sl';
      ws.forEach(function (w, i) {
        if (i) line.appendChild(document.createTextNode(' '));
        line.appendChild(w.__word ? document.createTextNode(w.textContent) : w);
      });
      mask.appendChild(line); el.appendChild(mask);
      return line;
    });
  }
  var lastW = window.innerWidth, bidiTimer = null;
  window.addEventListener('resize', function () {
    if (!bidiSplits.length || window.innerWidth === lastW) return;
    lastW = window.innerWidth;
    clearTimeout(bidiTimer);
    bidiTimer = setTimeout(function () { bidiSplits.forEach(function (el) { gsap.killTweensOf($$('.sl', el)); splitLinesBidi(el); }); ScrollTrigger.refresh(); }, 250);
  });

  function initSplits() {
    $$('[data-split]').forEach(function (el) {
      var mode = el.getAttribute('data-split') || 'lines';
      if (isArabic) {
        var arLines = splitLinesBidi(el);
        el.classList.add('is-split');
        bidiSplits.push(el);
        gsap.from(arLines, { yPercent: 115, duration: 1.3, stagger: .1, delay: parseFloat(el.getAttribute('data-delay') || 0), scrollTrigger: { trigger: el, start: 'top 94%', once: true } });
        return;
      }
      var delay = parseFloat(el.getAttribute('data-delay') || 0);
      SplitText.create(el, {
        type: mode === 'chars' ? 'lines,chars' : 'lines',
        mask: 'lines',
        linesClass: 'sl',
        charsClass: 'sc',
        autoSplit: true,
        onSplit: function (self) {
          el.classList.add('is-split');
          var targets = mode === 'chars' ? self.chars : self.lines;
          return gsap.from(targets, {
            yPercent: 115,
            rotate: mode === 'chars' ? 0 : 1.5,
            duration: mode === 'chars' ? 1.25 : 1.3,
            stagger: mode === 'chars' ? .022 : .09,
            delay: delay,
            scrollTrigger: { trigger: el, start: 'top 92%', once: true }
          });
        }
      });
    });
  }

  function initReveals() {
    ScrollTrigger.batch('[data-reveal]', {
      start: 'top 98%', once: true,
      onEnter: function (batch) {
        gsap.to(batch, {
          opacity: 1, y: 0, duration: 1.3, stagger: .08, overwrite: true,
          delay: function (i, el) { return parseFloat(el.getAttribute('data-delay') || 0); },
          clearProps: 'transform'
        });
      }
    });
    $$('[data-rule]').forEach(function (el) {
      gsap.to(el, { scaleX: 1, duration: 1.6, ease: 'expo.inOut', scrollTrigger: { trigger: el, start: 'top 95%', once: true } });
    });
    $$('.img-reveal').forEach(function (el) {
      var inner = el.querySelector('img, video');
      var st = { trigger: el, start: 'top 88%', once: true };
      gsap.to(el, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.5, ease: 'expo.inOut', scrollTrigger: st });
      if (inner) gsap.to(inner, { scale: 1, duration: 2, ease: 'expo.out', scrollTrigger: st });
    });
  }

  function initParallax() {
    $$('[data-parallax]').forEach(function (el) {
      var inner = el.querySelector('img, video');
      if (!inner) return;
      var amt = parseFloat(el.getAttribute('data-parallax')) || 8;
      gsap.fromTo(inner, { yPercent: -amt }, { yPercent: amt, ease: 'none', scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: true } });
    });
    $$('[data-float]').forEach(function (el) {
      var amt = parseFloat(el.getAttribute('data-float')) || 60;
      gsap.fromTo(el, { y: amt }, { y: -amt, ease: 'none', scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: .6 } });
    });
  }

  function initHero() {
    var hero = $('.hero');
    if (!hero) return;
    var media = $('.hero__media', hero);
    var inner = media ? media.querySelector('video, img') : null;
    var content = $('.hero__content', hero);
    if (inner) gsap.fromTo(inner, { scale: 1.35 }, { scale: 1, duration: 2.6, ease: 'expo.out' });
    if (media) gsap.to(media, { yPercent: 16, ease: 'none', scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: true } });
    if (content) gsap.to(content, { yPercent: -22, opacity: 0, ease: 'none', scrollTrigger: { trigger: hero, start: 'top top', end: '70% top', scrub: true } });
  }

  function initStatement() {
    $$('[data-words]').forEach(function (el) {
      SplitText.create(el, {
        type: 'words', wordsClass: 'word', autoSplit: true,
        onSplit: function (self) {
          return gsap.fromTo(self.words, { opacity: .12 }, {
            opacity: 1, ease: 'none', stagger: .08, duration: .4,
            scrollTrigger: { trigger: el, start: 'top 82%', end: 'bottom 48%', scrub: .4 }
          });
        }
      });
    });
  }

  /* ---------- Chapters: pinned sequence, each film wipes over the last ---------- */
  function initChapters() {
    var sec = $('[data-chapters]');
    if (!sec) return;
    var chs = $$('.chapter', sec);
    var n = chs.length;
    var bar = $('.chapters__bar i', sec);
    var numCol = $$('.chapters__count b span', sec);
    var names = $$('.chapters__names span', sec);
    var HOLD = 1, MOVE = 1;
    var starts = [];
    var active = -1;
    sec.style.setProperty('--n', n);

    var parts = chs.map(function (ch, i) {
      ch.style.zIndex = i + 1;
      var title = $('.chapter__title', ch);
      var split = isArabic ? { lines: splitLinesBidi(title) } : SplitText.create(title, { type: 'lines', mask: 'lines', linesClass: 'sl' });
      var fades = $$('[data-ch]', ch);
      gsap.set(split.lines, { yPercent: 115 });
      gsap.set(fades, { opacity: 0, y: 30 });
      if (i > 0) gsap.set(ch, { clipPath: 'inset(100% 0% 0% 0%)' });
      return { lines: split.lines, fades: fades, video: $('video', ch) };
    });

    function setActive(idx) {
      if (idx === active) return;
      active = idx;
      if (idx < 0) return;
      var p = parts[idx];
      gsap.fromTo(p.lines, { yPercent: 115 }, { yPercent: 0, duration: 1.3, stagger: .1, overwrite: true });
      gsap.fromTo(p.fades, { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 1.2, stagger: .08, delay: .15, overwrite: true });
      numCol.forEach(function (s) { s.style.transform = 'translateY(' + (-100 * idx) + '%)'; });
      names.forEach(function (s, i) { s.classList.toggle('is-on', i === idx); });
      parts.forEach(function (q, i) {
        if (!q.video) return;
        if (i === idx || i === idx + 1) { var pr = q.video.play(); if (pr && pr.catch) pr.catch(function () {}); }
        else q.video.pause();
      });
    }

    var tl = gsap.timeline({
      defaults: { ease: 'none' },
      scrollTrigger: { trigger: sec, start: 'top top', end: 'bottom bottom', scrub: .5 },
      /* driven by the timeline itself so it stays true while the scrub eases to rest */
      onUpdate: function () {
        var t = tl.time(), idx = 0;
        if (bar) bar.style.transform = 'scaleX(' + tl.progress().toFixed(4) + ')';
        for (var i = 1; i < n; i++) if (t >= starts[i] + MOVE * .45) idx = i;
        if (active !== -1) setActive(idx);
      }
    });
    tl.to({}, { duration: HOLD });
    for (var i = 1; i < n; i++) {
      var at = tl.duration();
      starts[i] = at;
      var prev = chs[i - 1], cur = chs[i];
      tl.to(cur, { clipPath: 'inset(0% 0% 0% 0%)', duration: MOVE }, at)
        .fromTo($('.chapter__media', cur), { scale: 1.3 }, { scale: 1, duration: MOVE }, at)
        .to($('.chapter__media', prev), { yPercent: -14, scale: 1.06, duration: MOVE }, at)
        .to($('.chapter__body', prev), { yPercent: -24, opacity: 0, duration: MOVE * .55 }, at)
        .to({}, { duration: HOLD });
    }

    ScrollTrigger.create({
      trigger: sec, start: 'top 55%', end: 'bottom top',
      onEnter: function () { if (active < 0) { active = -2; setActive(0); } },
      onLeave: function () { parts.forEach(function (q) { if (q.video) q.video.pause(); }); },
      onLeaveBack: function () { parts.forEach(function (q) { if (q.video) q.video.pause(); }); },
      onEnterBack: function () { var a = active; active = -2; setActive(a < 0 ? n - 1 : a); }
    });
  }

  /* ---------- Horizontal process rail ---------- */
  function initHorizontal() {
    var sec = $('[data-hscroll]');
    if (!sec) return;
    var track = $('.hscroll__track', sec);
    var bar = $('.chapters__bar i', sec);
    var num = $('[data-hnum]', sec);
    var steps = $$('.step', sec);
    var mm = gsap.matchMedia();
    mm.add('(min-width: 901px) and (min-height: 560px)', function () {
      sec.classList.add('is-horizontal');
      var dist = function () { return Math.max(0, track.scrollWidth - window.innerWidth); };
      var tween = gsap.to(track, {
        x: function () { return isRTL ? dist() : -dist(); }, ease: 'none',
        scrollTrigger: {
          trigger: sec, start: 'top top', end: function () { return '+=' + dist(); },
          pin: true, scrub: .6, invalidateOnRefresh: true, anticipatePin: 1,
          onUpdate: function (self) {
            if (bar) bar.style.transform = 'scaleX(' + self.progress.toFixed(4) + ')';
            if (num) num.textContent = '0' + Math.min(steps.length, Math.floor(self.progress * steps.length * .999) + 1);
          }
        }
      });
      if (!isRTL) steps.forEach(function (step) {
        var img = $('.step__media img', step);
        if (img) gsap.fromTo(img, { xPercent: -7 }, { xPercent: 7, ease: 'none', scrollTrigger: { trigger: step, containerAnimation: tween, start: 'left right', end: 'right left', scrub: true } });
        var nEl = $('.step__n', step);
        if (nEl) gsap.fromTo(nEl, { xPercent: 30 }, { xPercent: -10, ease: 'none', scrollTrigger: { trigger: step, containerAnimation: tween, start: 'left right', end: 'right left', scrub: true } });
      });
      return function () { sec.classList.remove('is-horizontal'); gsap.set(track, { clearProps: 'all' }); };
    });
  }

  /* ---------- Marquees that lean on scroll velocity ---------- */
  function initMarquees() {
    $$('.marquee').forEach(function (mq) {
      var track = $('.marquee__track', mq);
      var first = track.children[0];
      if (!first) return;
      var copies = 0;
      while (track.scrollWidth < window.innerWidth * 2.4 && copies < 8) { var c = first.cloneNode(true); c.setAttribute('aria-hidden', 'true'); track.appendChild(c); copies++; }
      var dir = mq.getAttribute('data-dir') === 'right' ? 1 : -1;
      var x = 0, w = first.getBoundingClientRect().width, skew = 0;
      window.addEventListener('resize', function () { w = first.getBoundingClientRect().width; });
      var visible = true;
      if ('IntersectionObserver' in window) new IntersectionObserver(function (en) { visible = en[0].isIntersecting; }).observe(mq);
      gsap.ticker.add(function (time, dt) {
        if (!visible || !w) return;
        var v = lenis ? lenis.velocity : 0;
        var speed = (0.06 * dt) + Math.abs(v) * 1.1;
        var d = v < 0 ? -dir : dir;
        x += speed * d;
        if (x <= -w) x += w;
        if (x > 0) x -= w;
        skew += ((v * .25) - skew) * .1;
        track.style.transform = 'translate3d(' + x.toFixed(2) + 'px,0,0) skewX(' + Math.max(-8, Math.min(8, -skew)).toFixed(2) + 'deg)';
      });
    });
  }

  function initCounters() {
    $$('[data-count]').forEach(function (el) {
      var end = parseFloat(el.getAttribute('data-count'));
      var dec = parseInt(el.getAttribute('data-decimals') || 0, 10);
      var pad = parseInt(el.getAttribute('data-pad') || 0, 10);
      var o = { v: parseFloat(el.getAttribute('data-from') || 0) };
      var fmt = function (v) { var s = v.toFixed(dec); while (s.length < pad) s = '0' + s; return s; };
      el.textContent = fmt(o.v);
      gsap.to(o, { v: end, duration: 2.4, ease: 'expo.out', onUpdate: function () { el.textContent = fmt(o.v); }, scrollTrigger: { trigger: el, start: 'top 90%', once: true } });
    });
  }

  function initFooter() {
    var mark = $('.ftr__mark');
    if (!mark) return;
    gsap.from($$('span', mark), { yPercent: 105, duration: 1.6, stagger: .08, scrollTrigger: { trigger: mark, start: 'top 96%', once: true } });
  }

  function initColourNav() {
    var links = $$('.cm__nav a');
    if (!links.length) return;
    links.forEach(function (a) {
      var sec = $(a.getAttribute('href'));
      if (!sec) return;
      ScrollTrigger.create({
        trigger: sec, start: 'top 45%', end: 'bottom 45%',
        onToggle: function (self) { if (self.isActive) links.forEach(function (l) { l.classList.toggle('is-on', l === a); }); }
      });
    });
  }

  /* ---------- Pointer-driven details ---------- */
  function initHoverFx() {
    if (!finePointer) return;
    $$('[data-magnetic]').forEach(function (el) {
      var s = parseFloat(el.getAttribute('data-magnetic')) || .35;
      var xTo = gsap.quickTo(el, 'x', { duration: .9, ease: 'elastic.out(1, .45)' });
      var yTo = gsap.quickTo(el, 'y', { duration: .9, ease: 'elastic.out(1, .45)' });
      el.addEventListener('mousemove', function (e) {
        var r = el.getBoundingClientRect();
        xTo((e.clientX - (r.left + r.width / 2)) * s);
        yTo((e.clientY - (r.top + r.height / 2)) * s);
      });
      el.addEventListener('mouseleave', function () { xTo(0); yTo(0); });
    });
    $$('.card').forEach(function (el) {
      el.addEventListener('mousemove', function (e) {
        var r = el.getBoundingClientRect();
        el.style.setProperty('--mx', (e.clientX - r.left) + 'px');
        el.style.setProperty('--my', (e.clientY - r.top) + 'px');
      });
    });
    $$('[data-tilt]').forEach(function (el) {
      gsap.set(el, { transformPerspective: 900 });
      var rx = gsap.quickTo(el, 'rotationX', { duration: .8, ease: 'power3.out' });
      var ry = gsap.quickTo(el, 'rotationY', { duration: .8, ease: 'power3.out' });
      el.addEventListener('mousemove', function (e) {
        var r = el.getBoundingClientRect();
        ry(((e.clientX - r.left) / r.width - .5) * 10);
        rx(-((e.clientY - r.top) / r.height - .5) * 10);
      });
      el.addEventListener('mouseleave', function () { rx(0); ry(0); });
    });
  }

  function initCursor() {
    var cur = $('.cursor');
    if (!cur || !finePointer) return;
    root.classList.add('has-cursor');
    var ring = $('.cursor__ring', cur), dot = $('.cursor__dot', cur), label = $('.cursor__label', cur);
    gsap.set([ring, dot], { xPercent: -50, yPercent: -50 });
    var rx = gsap.quickTo(ring, 'x', { duration: .55, ease: 'power3.out' });
    var ry = gsap.quickTo(ring, 'y', { duration: .55, ease: 'power3.out' });
    var dx = gsap.quickTo(dot, 'x', { duration: .12, ease: 'power3.out' });
    var dy = gsap.quickTo(dot, 'y', { duration: .12, ease: 'power3.out' });
    cur.classList.add('is-hidden');
    window.addEventListener('mousemove', function (e) {
      cur.classList.remove('is-hidden');
      rx(e.clientX); ry(e.clientY); dx(e.clientX); dy(e.clientY);
    }, { passive: true });
    document.addEventListener('mouseleave', function () { cur.classList.add('is-hidden'); });
    window.addEventListener('mousedown', function () { cur.classList.add('is-down'); });
    window.addEventListener('mouseup', function () { cur.classList.remove('is-down'); });
    document.addEventListener('mouseover', function (e) {
      var t = e.target;
      if (!t.closest) return;
      var lab = t.closest('[data-cursor]');
      var frame = t.closest('iframe, .contact__map');
      var link = t.closest('a, button, [role="button"]');
      cur.classList.toggle('is-hidden', !!frame);
      cur.classList.toggle('is-label', !!lab);
      cur.classList.toggle('is-link', !lab && !!link);
      if (lab) label.textContent = lab.getAttribute('data-cursor');
    });
    gsap.to(ring, { rotation: 360, duration: 12, ease: 'none', repeat: -1 });
  }

  /* ---------- Header ---------- */
  function initHeader() {
    var hdr = $('.hdr');
    if (!hdr) return;
    var last = 0;
    function onScroll() {
      var y = window.pageYOffset;
      hdr.classList.toggle('is-scrolled', y > 40);
      if (!body.classList.contains('menu-open')) {
        if (y > 260 && y > last + 4) hdr.classList.add('is-hidden');
        else if (y < last - 4 || y <= 260) hdr.classList.remove('is-hidden');
      }
      last = y;
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  /* ---------- Fullscreen menu ---------- */
  function initMenu() {
    var menu = $('.menu'), btn = $('.menu-btn');
    if (!menu || !btn) return;
    var links = $$('.menu__link b', menu);
    var rows = $$('.menu__link', menu);
    var aside = $$('.menu__aside > *', menu);
    menuTl = gsap.timeline({ paused: true, onReverseComplete: function () { gsap.set(menu, { visibility: 'hidden' }); } })
      .set(menu, { visibility: 'visible' })
      .fromTo(menu, { clipPath: 'inset(0% 0% 100% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1, ease: 'expo.inOut' })
      .fromTo(links, { yPercent: 120 }, { yPercent: 0, duration: 1.1, stagger: .06 }, .35)
      .fromTo(rows, { borderBottomColor: 'rgba(239,233,221,0)' }, { borderBottomColor: 'rgba(239,233,221,.14)', duration: 1, stagger: .06 }, .4)
      .fromTo(aside, { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 1, stagger: .08 }, .55);
    btn.addEventListener('click', function () { menuOpen ? closeMenu() : openMenu(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && menuOpen) closeMenu(); });
  }
  function openMenu() {
    if (!menuTl) return;
    menuOpen = true;
    body.classList.add('menu-open');
    $('.hdr').classList.remove('is-hidden');
    var btn = $('.menu-btn');
    btn.setAttribute('aria-expanded', 'true');
    lockScroll(true);
    menuTl.timeScale(1).play();
  }
  function closeMenu(cb) {
    if (!menuOpen || !menuTl) { if (cb) cb(); return; }
    menuOpen = false;
    body.classList.remove('menu-open');
    $('.menu-btn').setAttribute('aria-expanded', 'false');
    lockScroll(false);
    menuTl.timeScale(1.7).reverse();
    if (cb) setTimeout(cb, 350);
  }
  /* Fallback (no libs / reduced motion): plain toggle */
  function initMenuBasic() {
    var menu = $('.menu'), btn = $('.menu-btn');
    if (!menu || !btn) return;
    function set(on) {
      menu.style.visibility = on ? 'visible' : 'hidden';
      menu.style.clipPath = on ? 'none' : '';
      body.classList.toggle('menu-open', on);
      body.style.overflow = on ? 'hidden' : '';
      btn.setAttribute('aria-expanded', on ? 'true' : 'false');
    }
    btn.addEventListener('click', function () { set(!body.classList.contains('menu-open')); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') set(false); });
    $$('a', menu).forEach(function (a) { a.addEventListener('click', function () { set(false); }); });
    $$('[data-top]').forEach(function (b) { b.addEventListener('click', function () { window.scrollTo(0, 0); }); });
  }

  /* ---------- Videos: only play what is on screen ---------- */
  function initVideos(sel) {
    var vids = $$(sel || 'video[data-auto]');
    if (!vids.length) return;
    vids.forEach(function (v) { v.muted = true; v.setAttribute('playsinline', ''); });
    if (!('IntersectionObserver' in window)) { vids.forEach(function (v) { v.play && v.play().catch(function () {}); }); return; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        var v = en.target;
        if (en.isIntersecting) { var p = v.play(); if (p && p.catch) p.catch(function () {}); }
        else v.pause();
      });
    }, { threshold: .15 });
    vids.forEach(function (v) { io.observe(v); });
  }

  /* ---------- Certificate lightbox ---------- */
  function initLightbox() {
    var lb = $('.lightbox');
    var all = $$('[data-lightbox]');
    if (!lb || !all.length) return;
    var img = $('img', lb), cap = $('[data-lb-cap]', lb), cnt = $('[data-lb-count]', lb);
    var items = all, i = 0;
    function show(n) {
      i = (n + items.length) % items.length;
      var it = items[i];
      img.style.opacity = 0;
      setTimeout(function () {
        img.src = it.getAttribute('data-lightbox');
        img.alt = it.getAttribute('data-name') || '';
        img.style.opacity = '';
      }, 160);
      cap.textContent = it.getAttribute('data-name') || '';
      cnt.textContent = ('0' + (i + 1)).slice(-2) + ' / ' + ('0' + items.length).slice(-2);
    }
    function open(n) { show(n); lb.classList.add('is-open'); lb.setAttribute('aria-hidden', 'false'); if (window.__lenisStop) window.__lenisStop(true); body.style.overflow = 'hidden'; }
    function close() { lb.classList.remove('is-open'); lb.setAttribute('aria-hidden', 'true'); if (window.__lenisStop) window.__lenisStop(false); body.style.overflow = ''; }
    /* each gallery / certificate grid pages through its own set */
    all.forEach(function (it) {
      it.addEventListener('click', function () {
        var group = it.closest('.gallery, .certs');
        items = group ? $$('[data-lightbox]', group) : all;
        open(items.indexOf(it));
      });
    });
    $('[data-lb-close]', lb).addEventListener('click', close);
    $('[data-lb-prev]', lb).addEventListener('click', function () { show(i - 1); });
    $('[data-lb-next]', lb).addEventListener('click', function () { show(i + 1); });
    lb.addEventListener('click', function (e) { if (e.target === lb || e.target.classList.contains('lightbox__stage')) close(); });
    document.addEventListener('keydown', function (e) {
      if (!lb.classList.contains('is-open')) return;
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowLeft') show(i - 1);
      if (e.key === 'ArrowRight') show(i + 1);
    });
  }
  window.__lenisStop = function (on) { if (lenis) { on ? lenis.stop() : lenis.start(); } };

  /* ---------- KAEC local time ---------- */
  function initClock() {
    var els = $$('[data-clock]');
    if (!els.length) return;
    function tick() {
      var t;
      try { t = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Riyadh' }).format(new Date()); }
      catch (e) { t = ''; }
      els.forEach(function (el) { el.textContent = t; });
    }
    tick();
    setInterval(tick, 15000);
  }
})();
