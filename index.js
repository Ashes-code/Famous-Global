// ============================================================
//  Famous Global — Main site initialization
// ============================================================

// Mobile menu toggle
(function () {
  var btn = document.getElementById('menuBtn');
  var menu = document.getElementById('mobileMenu');
  var open = document.getElementById('iconOpen');
  var close = document.getElementById('iconClose');
  if (!btn || !menu) return;
  btn.addEventListener('click', function () {
    var willOpen = menu.classList.contains('hidden');
    menu.classList.toggle('hidden');
    open.classList.toggle('hidden', willOpen);
    close.classList.toggle('hidden', !willOpen);
    btn.setAttribute('aria-expanded', String(willOpen));
  });
  menu.querySelectorAll('a').forEach(function (a) {
    a.addEventListener('click', function (event) {
      var href = a.getAttribute('href');
      var target = href && href.charAt(0) === '#' ? document.getElementById(href.slice(1)) : null;
      menu.classList.add('hidden');
      open.classList.remove('hidden');
      close.classList.add('hidden');
      btn.setAttribute('aria-expanded', 'false');
      if (!target) return;

      event.preventDefault();
      if (window.location.hash !== href) window.history.pushState(null, '', href);
      window.requestAnimationFrame(function () {
        var top = Math.max(0, target.getBoundingClientRect().top + window.scrollY - 112);
        var reducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        window.scrollTo({ top: top, behavior: reducedMotion ? 'auto' : 'smooth' });
      });
    });
  });
})();

// Scroll reveal animations
(function () {
  var items = document.querySelectorAll('[data-reveal]');
  if (!('IntersectionObserver' in window)) {
    items.forEach(function (el) { el.classList.add('is-visible'); });
    return;
  }
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
  items.forEach(function (el) { io.observe(el); });
})();

// Full-size image + video lightbox
(function () {
  var lb = document.getElementById('lightbox');
  var lbImg = document.getElementById('lightboxImg');
  var lbFrame = document.getElementById('lightboxFrame');
  var lbLoading = document.getElementById('lightboxLoading');
  var closeBtn = document.getElementById('lightboxClose');
  if (!lb || !lbImg || !lbFrame || !lbLoading) return;
  var activeVideoRatio = '16:9';

  function hideVideoLoading() {
    lbLoading.classList.add('hidden');
    lbLoading.classList.remove('flex');
  }

  function fitVideoFrame() {
    var isPortrait = activeVideoRatio === '9:16';
    var widthPerHeight = isPortrait ? 9 / 16 : 16 / 9;
    var heightPerWidth = isPortrait ? 16 / 9 : 9 / 16;
    var maxWidth = Math.min(window.innerWidth * 0.92, isPortrait ? 460 : 1100);
    var maxHeight = window.innerHeight * 0.82;
    var width = Math.min(maxWidth, maxHeight * widthPerHeight);
    lbFrame.style.width = width + 'px';
    lbFrame.style.height = (width * heightPerWidth) + 'px';
  }

  lbFrame.addEventListener('load', hideVideoLoading);
  window.addEventListener('resize', fitVideoFrame);

  function show() {
    lb.classList.remove('hidden');
    lb.classList.add('flex');
    document.body.style.overflow = 'hidden';
  }
  function openImage(src, alt) {
    hideVideoLoading();
    lbFrame.classList.add('hidden');
    lbFrame.removeAttribute('src');
    lbImg.classList.remove('hidden');
    lbImg.src = src;
    lbImg.alt = alt || '';
    show();
  }
  function openVideo(embedUrl, ratio) {
    lbImg.classList.add('hidden');
    lbImg.removeAttribute('src');
    lbFrame.classList.remove('hidden');
    activeVideoRatio = ratio === '9:16' ? '9:16' : '16:9';
    lbLoading.classList.remove('hidden');
    lbLoading.classList.add('flex');
    fitVideoFrame();
    show();
    lbFrame.src = embedUrl;
  }
  function close() {
    lb.classList.add('hidden');
    lb.classList.remove('flex');
    hideVideoLoading();
    lbImg.removeAttribute('src');
    lbFrame.removeAttribute('src');
    document.body.style.overflow = '';
  }

  window.FGLightbox = { openImage: openImage, openVideo: openVideo, close: close };

  document.querySelectorAll('[data-src]').forEach(function (el) {
    el.addEventListener('click', function () {
      var img = el.querySelector('img');
      openImage(el.getAttribute('data-src'), img ? img.alt : '');
    });
  });
  closeBtn.addEventListener('click', close);
  lb.addEventListener('click', function (e) { if (e.target === lb) close(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });
})();