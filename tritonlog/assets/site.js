(() => {
  'use strict';
  // Apply before the stylesheet loads to avoid a light flash on dark visits.
  const themeRoot = document.documentElement;
  const themeKey = 'tritonlog-website-theme';
  let savedTheme;
  try { savedTheme = localStorage.getItem(themeKey); } catch (_) { /* Private/storage-restricted browsing. */ }
  function applyTheme(theme) {
    themeRoot.dataset.theme = theme;
    // Swap authentic captures in place: keep carousel nodes and geometry intact.
    document.querySelectorAll('img[data-light-src][data-dark-src]').forEach(image => {
      const source = theme === 'dark' ? image.dataset.darkSrc : image.dataset.lightSrc;
      if (image.getAttribute('src') !== source) image.src = source;
    });
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.content = theme === 'dark' ? '#101113' : '#f5f5f7';
    const toggle = document.querySelector('#theme-toggle');
    if (toggle) {
      toggle.setAttribute('aria-pressed', String(theme === 'dark'));
      toggle.setAttribute('aria-label', `Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`);
    }
  }
  applyTheme(savedTheme === 'light' ? 'light' : 'dark');
  document.addEventListener('DOMContentLoaded', () => {
  applyTheme(themeRoot.dataset.theme);
  document.querySelector('#theme-toggle').addEventListener('click', () => {
    const theme = themeRoot.dataset.theme === 'dark' ? 'light' : 'dark';
    applyTheme(theme);
    try { localStorage.setItem(themeKey, theme); } catch (_) { /* The toggle still works without persistence. */ }
  });
  // Rotate the real screenshots through the existing three-screen composition.
  const hero = document.querySelector('.hero-art');
  const heroScreens = [...hero.querySelectorAll('img')];
  const heroNames = ['Dining', 'Home', 'Workouts'];
  let heroIndex = 1;
  const heroControls = document.createElement('div');
  heroControls.className = 'hero-controls';
  heroControls.setAttribute('role', 'group');
  heroControls.setAttribute('aria-label', 'Choose front-page screenshot');
  const heroStatus = document.createElement('span');
  heroStatus.className = 'visually-hidden';
  heroStatus.setAttribute('aria-live', 'polite');
  heroStatus.setAttribute('aria-atomic', 'true');
  function selectHero(index) {
    heroIndex = (index + heroScreens.length) % heroScreens.length;
    heroScreens.forEach((screen, i) => {
      const position = (i - heroIndex + 3) % 3;
      screen.className = position === 0 ? 'hero-main' : `hero-side hero-${position === 1 ? 'right' : 'left'}`;
    });
    [...heroControls.querySelectorAll('button')].forEach((button, i) => button.setAttribute('aria-pressed', String(i === heroIndex)));
    heroStatus.textContent = `${heroNames[heroIndex]} screenshot, ${heroIndex + 1} of 3`;
  }
  heroNames.forEach((name, i) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.setAttribute('aria-label', `Show ${name} screenshot`);
    button.addEventListener('click', () => selectHero(i));
    heroControls.append(button);
  });
  hero.after(heroControls);
  heroControls.append(heroStatus);
  selectHero(1);
  heroScreens.forEach((screen, i) => {
    screen.draggable = false;
    screen.addEventListener('click', () => { if (!suppressClick) selectHero(i); });
  });
  let gesture = null;
  let suppressClick = false;
  hero.addEventListener('pointerdown', event => {
    if (!event.isPrimary || event.button !== 0) return;
    suppressClick = false;
    gesture = { x: event.clientX, y: event.clientY, id: event.pointerId };
    // Touch uses native vertical scrolling; mouse drags can finish outside the image.
    if (event.pointerType === 'mouse') hero.setPointerCapture(event.pointerId);
  });
  hero.addEventListener('pointerup', event => {
    if (!gesture || gesture.id !== event.pointerId) return;
    const dx = event.clientX - gesture.x;
    const dy = event.clientY - gesture.y;
    gesture = null;
    suppressClick = Math.abs(dx) > 12 || Math.abs(dy) > 12;
    if (Math.abs(dx) >= 40 && Math.abs(dx) > Math.abs(dy) * 1.3) selectHero(heroIndex + (dx < 0 ? 1 : -1));
  });
  hero.addEventListener('pointercancel', () => { gesture = null; suppressClick = true; });
  hero.addEventListener('keydown', event => {
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault();
      selectHero(heroIndex + (event.key === 'ArrowRight' ? 1 : -1));
    }
  });
  const track = document.querySelector('.gallery-track');
  const slides = [...document.querySelectorAll('.gallery-slide')];
  const tabs = [...document.querySelectorAll('[data-slide]')];
  const names = ['Home', 'Dining', 'Portions', 'Workouts', 'Log', 'Stats'];
  const previous = document.querySelector('#previous-slide');
  const next = document.querySelector('#next-slide');
  const status = document.querySelector('#gallery-status');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let selected = -1;
  function update(index) {
    if (selected === index) return;
    selected = index;
    slides.forEach((slide, i) => slide.classList.toggle('is-selected', i === index));
    tabs.forEach((tab, i) => tab.setAttribute('aria-pressed', String(i === index)));
    previous.disabled = index === 0;
    next.disabled = index === slides.length - 1;
    status.textContent = `${names[index]} · ${index + 1} of ${slides.length}`;
  }
  function go(index) {
    index = Math.max(0, Math.min(slides.length - 1, index));
    const slide = slides[index];
    track.scrollTo({ left: slide.offsetLeft - track.offsetLeft - (track.clientWidth - slide.clientWidth) / 2, behavior: reducedMotion.matches ? 'instant' : 'smooth' });
    update(index);
  }
  tabs.forEach((tab, index) => tab.addEventListener('click', () => go(index)));
  previous.addEventListener('click', () => go(selected - 1));
  next.addEventListener('click', () => go(selected + 1));
  track.addEventListener('keydown', event => {
    if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
      event.preventDefault();
      go(selected + (event.key === 'ArrowRight' ? 1 : -1));
    }
    if (event.key === 'Home' || event.key === 'End') {
      event.preventDefault();
      go(event.key === 'Home' ? 0 : slides.length - 1);
    }
  });
  let frame = 0;
  track.addEventListener('scroll', () => {
    if (frame) return;
    frame = requestAnimationFrame(() => {
      frame = 0;
      const rect = track.getBoundingClientRect();
      const center = rect.left + rect.width / 2;
      let closest = 0;
      let distance = Infinity;
      slides.forEach((slide, index) => {
        const box = slide.getBoundingClientRect();
        const delta = Math.abs(box.left + box.width / 2 - center);
        if (delta < distance) { distance = delta; closest = index; }
      });
      // At the ends, show the actual first/last item rather than a middle card.
      if (track.scrollLeft < 2) closest = 0;
      if (track.scrollLeft >= track.scrollWidth - track.clientWidth - 2) closest = slides.length - 1;
      update(closest);
    });
  }, { passive: true });
  update(0);
  // Progressive enhancement: never hide content unless observers are available.
  const root = document.documentElement;
  const textGroups = document.querySelectorAll('.hero-copy, .intro .content, .chapter-copy, .portion-story .narrow, .gallery-heading, .closing .content');
  textGroups.forEach(group => [...group.children].forEach((element, index) => {
    if (element.matches('.reveal, .image-note')) return;
    element.classList.add('reveal');
    element.style.setProperty('--reveal-delay', `${Math.min(index, 3) * 85}ms`);
  }));
  if ('IntersectionObserver' in window) {
    root.classList.add('motion-ready');
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    }), { threshold: 0.12 });
    document.querySelectorAll('.reveal').forEach(element => observer.observe(element));
  }
  // Only visible scenes participate; one animation frame per scroll, no timers.
  const scenes = [...document.querySelectorAll('.hero, .dining, .portion-story, .training')];
  const activeScenes = new Set();
  let motionFrame = 0;
  function paintMotion() {
    motionFrame = 0;
    if (reducedMotion.matches || document.hidden) return;
    // Read all geometry before any style writes: no read/write layout thrashing.
    const updates = [...activeScenes].map(scene => {
      const box = scene.getBoundingClientRect();
      return [scene, Math.max(0, Math.min(1, (innerHeight - box.top) / (innerHeight + box.height))).toFixed(4)];
    });
    updates.forEach(([scene, progress]) => {
      // Scope the variable to moving images, not the entire inherited subtree.
      scene.querySelectorAll('.hero-art img, .dining-art img, .training-art img, .portion-detail img').forEach(image => {
        if (image.style.getPropertyValue('--scene') !== progress) image.style.setProperty('--scene', progress);
      });
    });
    root.classList.toggle('has-scrolled', scrollY > 24);
  }
  function queueMotion() {
    if (!motionFrame && !reducedMotion.matches) motionFrame = requestAnimationFrame(paintMotion);
  }
  if ('IntersectionObserver' in window) {
    const sceneObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) activeScenes.add(entry.target);
        else activeScenes.delete(entry.target);
        entry.target.classList.toggle('scene-active', entry.isIntersecting && !reducedMotion.matches);
      });
      queueMotion();
    });
    scenes.forEach(scene => sceneObserver.observe(scene));
    window.addEventListener('scroll', queueMotion, { passive: true });
    window.addEventListener('resize', queueMotion, { passive: true });
    document.addEventListener('visibilitychange', queueMotion);
  }
  function motionPreference() {
    root.classList.toggle('motion-enabled', !reducedMotion.matches);
    if (reducedMotion.matches) {
      cancelAnimationFrame(motionFrame);
      motionFrame = 0;
      scenes.forEach(scene => {
        scene.classList.remove('scene-active');
        scene.querySelectorAll('img').forEach(image => image.style.removeProperty('--scene'));
      });
    } else {
      activeScenes.forEach(scene => scene.classList.add('scene-active'));
      queueMotion();
    }
  }
  reducedMotion.addEventListener('change', motionPreference);
  motionPreference();
  });
})();
