(() => {
  'use strict';

  /* ------------------------------------------------------------------
   * Config
   * ---------------------------------------------------------------- */
  const FRAME_COUNT = 96;
  const FRAME_PATH = (i) => `frames/frame_${String(i).padStart(4, '0')}.jpg`;

  const heroSection = document.getElementById('hero');
  const canvas = document.getElementById('frameCanvas');
  const ctx = canvas.getContext('2d');
  const preloader = document.getElementById('preloader');
  const preloaderBar = document.getElementById('preloaderBarFill');
  const preloaderPct = document.getElementById('preloaderPct');
  const scrollHint = document.getElementById('scrollHint');
  const captions = Array.from(document.querySelectorAll('.caption'));
  const floatingCard = document.getElementById('floatingCard');
  const floatingIndex = document.getElementById('floatingCardIndex');
  const floatingTitle = document.getElementById('floatingCardTitle');
  const floatingDesc = document.getElementById('floatingCardDesc');
  const floatingProgressFill = document.getElementById('floatingCardProgressFill');
  const footer = document.querySelector('.site-footer');

  const images = new Array(FRAME_COUNT);
  let loadedCount = 0;
  let lastDrawnFrame = -1;
  let dpr = Math.min(window.devicePixelRatio || 1, 2);

  /* Stage copy synced to hero scroll progress (0..1) */
  const STAGES = [
    { from: 0, to: 0.16 },
    { from: 0.16, to: 0.42 },
    { from: 0.42, to: 0.7 },
    { from: 0.7, to: 1.001 },
  ];

  const FLOATING_STAGES = [
    { from: 0, to: 0.3, index: '01 · 生長週期', title: '八秒之間', desc: '這段動畫凝結了數月的自然歷程，一節一節，未曾停歇。' },
    { from: 0.3, to: 0.65, index: '02 · 純淨來源', title: '不施干預', desc: '沒有人工催化，只留給時間與光線，在原始林地間自行生長。' },
    { from: 0.65, to: 1.001, index: '03 · 匠心臻選', title: '生命的形態', desc: '我們只留下最具生命力的一株，成為 HBB 每件作品的原型。' },
  ];

  /* ------------------------------------------------------------------
   * Preload frames
   * ---------------------------------------------------------------- */
  function preloadFrames() {
    return new Promise((resolve) => {
      let settled = 0;
      const onSettle = () => {
        settled += 1;
        loadedCount = settled;
        const pct = Math.round((settled / FRAME_COUNT) * 100);
        if (preloaderBar) preloaderBar.style.width = `${pct}%`;
        if (preloaderPct) preloaderPct.textContent = `${pct}%`;
        if (settled >= FRAME_COUNT) resolve();
      };

      for (let i = 1; i <= FRAME_COUNT; i++) {
        const img = new Image();
        img.decoding = 'async';
        img.onload = onSettle;
        img.onerror = onSettle;
        img.src = FRAME_PATH(i);
        images[i - 1] = img;
      }
    });
  }

  /* ------------------------------------------------------------------
   * Canvas sizing + cover-fit draw
   * ---------------------------------------------------------------- */
  function resizeCanvas() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = window.innerWidth;
    const h = window.innerHeight;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    lastDrawnFrame = -1;
    drawFrame(currentFrameIndex, true);
  }

  function drawCover(img) {
    const cw = window.innerWidth;
    const ch = window.innerHeight;
    const ir = img.naturalWidth / img.naturalHeight;
    const cr = cw / ch;
    let sx, sy, sw, sh;
    if (cr > ir) {
      sw = img.naturalWidth;
      sh = sw / cr;
      sx = 0;
      sy = (img.naturalHeight - sh) / 2;
    } else {
      sh = img.naturalHeight;
      sw = sh * cr;
      sy = 0;
      sx = (img.naturalWidth - sw) / 2;
    }
    ctx.clearRect(0, 0, cw, ch);
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, cw, ch);
  }

  let currentFrameIndex = 0;
  function drawFrame(index, force) {
    const clamped = Math.max(0, Math.min(FRAME_COUNT - 1, index));
    currentFrameIndex = clamped;
    if (!force && clamped === lastDrawnFrame) return;
    const img = images[clamped];
    if (!img || !img.complete || img.naturalWidth === 0) return;
    drawCover(img);
    lastDrawnFrame = clamped;
  }

  /* ------------------------------------------------------------------
   * Hero height — sized so scroll distance maps comfortably to 96 frames
   * ---------------------------------------------------------------- */
  function setHeroHeight() {
    const multiplier = window.innerWidth < 720 ? 3.2 : 5.5;
    heroSection.style.height = `${multiplier * 100}vh`;
  }

  /* ------------------------------------------------------------------
   * Scroll-driven updates
   * ---------------------------------------------------------------- */
  let heroTop = 0;
  let heroScrollRange = 1;

  function measureHero() {
    heroTop = heroSection.offsetTop;
    heroScrollRange = Math.max(1, heroSection.offsetHeight - window.innerHeight);
  }

  function easeInOut(t) {
    return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  }

  function updateCaptions(progress) {
    STAGES.forEach((stage, i) => {
      const active = progress >= stage.from && progress < stage.to;
      if (captions[i]) captions[i].classList.toggle('is-active', active);
    });
  }

  function updateFloatingCard(progress) {
    const stage = FLOATING_STAGES.find((s) => progress >= s.from && progress < s.to) || FLOATING_STAGES[0];
    if (floatingIndex && floatingIndex.dataset.current !== stage.title) {
      floatingIndex.textContent = stage.index;
      floatingTitle.textContent = stage.title;
      floatingDesc.textContent = stage.desc;
      floatingIndex.dataset.current = stage.title;
    }
    if (floatingProgressFill) floatingProgressFill.style.width = `${Math.round(progress * 100)}%`;
  }

  function onScroll() {
    const scrollY = window.scrollY || window.pageYOffset;
    const rawProgress = (scrollY - heroTop) / heroScrollRange;
    const progress = Math.max(0, Math.min(1, rawProgress));
    const eased = easeInOut(progress);
    const frameIndex = Math.round(eased * (FRAME_COUNT - 1));

    drawFrame(frameIndex);
    updateCaptions(progress);
    updateFloatingCard(progress);

    if (scrollHint) {
      scrollHint.style.opacity = progress > 0.02 ? '0' : '1';
    }

    if (floatingCard) {
      const pastIntro = scrollY > heroTop + 40;
      const withinHero = scrollY < heroTop + heroScrollRange - window.innerHeight * 0.15;
      floatingCard.classList.toggle('is-visible', pastIntro && withinHero);
      floatingCard.classList.toggle('is-hidden', !(pastIntro && withinHero));
    }
  }

  let ticking = false;
  function onScrollThrottled() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      onScroll();
      ticking = false;
    });
  }

  /* ------------------------------------------------------------------
   * Scroll-reveal for content below the hero
   * ---------------------------------------------------------------- */
  function initReveal() {
    const targets = document.querySelectorAll('.reveal');
    if (!('IntersectionObserver' in window)) {
      targets.forEach((el) => el.classList.add('in-view'));
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('in-view');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: '0px 0px -60px 0px' }
    );
    targets.forEach((el) => observer.observe(el));
  }

  /* ------------------------------------------------------------------
   * Init
   * ---------------------------------------------------------------- */
  async function init() {
    document.body.classList.add('no-scroll');
    setHeroHeight();
    resizeCanvas();

    await preloadFrames();

    setHeroHeight();
    measureHero();
    resizeCanvas();
    drawFrame(0, true);

    document.body.classList.remove('no-scroll');
    if (preloader) preloader.classList.add('hidden');

    onScroll();
    initReveal();

    window.addEventListener('scroll', onScrollThrottled, { passive: true });
    window.addEventListener('resize', () => {
      setHeroHeight();
      measureHero();
      resizeCanvas();
      onScroll();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
