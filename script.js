(() => {
    'use strict';
    const root = document.documentElement;
    const toggle = document.getElementById('theme-toggle');
    const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
    const systemTheme = matchMedia('(prefers-color-scheme: light)');
    let userSelected = false;
    try { userSelected = ['light', 'dark'].includes(localStorage.getItem('theme')); } catch (_) {}
    let frameRequest = 0;

    function applyTheme(theme) {
        root.dataset.theme = theme;
        toggle.setAttribute('aria-label', `Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`);
        document.querySelector('meta[name="theme-color"]').content = theme === 'dark' ? '#202020' : '#e8e7e3';
    }
    toggle.hidden = false;
    applyTheme(root.dataset.theme || (systemTheme.matches ? 'light' : 'dark'));
    toggle.addEventListener('click', () => {
        const theme = root.dataset.theme === 'dark' ? 'light' : 'dark';
        userSelected = true;
        try { localStorage.setItem('theme', theme); } catch (_) {}
        applyTheme(theme);
    });
    systemTheme.addEventListener('change', event => {
        if (!userSelected) applyTheme(event.matches ? 'light' : 'dark');
    });
    document.addEventListener('visibilitychange', () => root.toggleAttribute('data-page-hidden', document.hidden));
    // Scroll position is the sole fill clock, including restored scroll on reload.
    const clamp = value => Math.min(1, Math.max(0, value));
    let fillFrame = 0;
    let displayedFill;
    let filteredScroll;
    let carriedFill;
    let lastFillTime = null;
    // Finish at 65% of the page; damp only while catching up to the scroll.
    const fillScrollSpan = 0.65;
    const flow = document.querySelector('.logo-flow');
    const dotFill = document.querySelector('.val-dot-fill');
    let fillRange = Math.max(0, root.scrollHeight - root.clientHeight);
    root.dataset.scrollFill = '';
    function paintFill(time = performance.now()) {
        fillFrame = 0;
        const target = fillRange > 0 ? clamp(window.scrollY / (fillRange * fillScrollSpan)) : 0;
        const elapsed = lastFillTime === null ? 0 : Math.min(100, Math.max(0, time - lastFillTime));
        lastFillTime = time;
        if (displayedFill === undefined || reducedMotion.matches) {
            displayedFill = filteredScroll = carriedFill = target;
        } else {
            // Exact three-stage low-pass integration. Scroll steps first ease
            // the input, then the velocity, then the visible liquid: continuous
            // acceleration even with sparse wheel ticks or batched touch events.
            // Analytic integration gives the same response at 30/60/120 Hz.
            const k = 8 * elapsed / 1000;
            const decay = Math.exp(-k);
            const input = filteredScroll - target;
            const carry = carriedFill - target;
            const position = displayedFill - target;
            filteredScroll = target + input * decay;
            carriedFill = target + (carry + k * input) * decay;
            displayedFill = clamp(target + (position + k * carry + k * k * input / 2) * decay);
        }
        if (Math.max(Math.abs(target - displayedFill), Math.abs(target - filteredScroll), Math.abs(target - carriedFill)) < 0.0001) {
            displayedFill = filteredScroll = carriedFill = target;
        }
        const progress = displayedFill;
        if (progress !== target) fillFrame = requestAnimationFrame(paintFill);
        else lastFillTime = null;
        // Local transforms avoid invalidating inherited styles across the page.
        flow.style.transform = `translate(${-25 + 1130 * progress}px, 0)`;
        // The dot fills over a short interval as the leading edge reaches the A.
        const dot = clamp((progress - 0.475) / 0.025);
        dotFill.style.transform = `scale(${dot * dot * (3 - 2 * dot)})`;
        if (progress >= 0.18 && !root.hasAttribute('data-greeting-raised')) root.dataset.greetingRaised = '';
    }
    function scheduleFill() {
        if (!fillFrame && !document.hidden) {
            lastFillTime = performance.now();
            fillFrame = requestAnimationFrame(paintFill);
        }
    }
    function measureFill() {
        fillRange = Math.max(0, root.scrollHeight - root.clientHeight);
        scheduleFill();
    }
    window.addEventListener('scroll', measureFill, {passive: true});
    // The greeting's transform can change document overflow without resizing
    // the body. Refresh once it reaches its resting position as well.
    document.addEventListener('animationend', measureFill);
    window.addEventListener('resize', measureFill, {passive: true});
    window.addEventListener('pageshow', measureFill);
    new ResizeObserver(measureFill).observe(document.body);
    reducedMotion.addEventListener('change', scheduleFill);
    document.addEventListener('visibilitychange', () => {
        cancelAnimationFrame(fillFrame);
        fillFrame = 0;
        lastFillTime = null;
        if (!document.hidden) measureFill();
    });
    paintFill();
    // A shallow gravity well pulls each surface gently toward the pointer.
    const well = document.createElement('div');
    well.className = 'cursor-well';
    well.setAttribute('aria-hidden', 'true');
    document.body.append(well);
    const finePointer = matchMedia('(hover: hover) and (pointer: fine)');
    const surfaces = [...document.querySelectorAll('.project-card, .logo-banner, .intro-copy, .theme-toggle')]
        .map(element => ({element, x: 0, y: 0, box: null}));
    let pointer, lastGravityTime = null, geometryDirty = true;
    let wellX = 0, wellY = 0;
    const reset = () => {
        cancelAnimationFrame(frameRequest);
        frameRequest = 0;
        lastGravityTime = null;
        pointer = undefined;
        geometryDirty = true;
        root.removeAttribute('data-pointer-gravity');
        for (const surface of surfaces) {
            surface.x = surface.y = 0;
            surface.element.style.removeProperty('--gravity-x');
            surface.element.style.removeProperty('--gravity-y');
        }
    };
    function paintGravity(time) {
        frameRequest = 0;
        if (!pointer) return;
        const dt = lastGravityTime === null ? 16 : Math.min(50, time - lastGravityTime);
        lastGravityTime = time;
        const ease = 1 - Math.exp(-dt / 145);
        wellX += (pointer.x - wellX) * ease;
        wellY += (pointer.y - wellY) * ease;
        well.style.transform = `translate3d(${wellX - 56}px, ${wellY - 56}px, 0)`;
        // Read geometry only on input/scroll, before writing any surface offsets.
        if (geometryDirty) {
            for (const surface of surfaces) {
                const box = surface.element.getBoundingClientRect();
                surface.box = {x: box.x + box.width / 2 - surface.x, y: box.y + box.height / 2 - surface.y};
            }
            geometryDirty = false;
        }
        let moving = Math.hypot(pointer.x - wellX, pointer.y - wellY) > 0.05;
        for (const surface of surfaces) {
            const dx = pointer.x - surface.box.x, dy = pointer.y - surface.box.y;
            const distance = Math.hypot(dx, dy);
            // Smooth bounded attraction, strongest near the well; never chase
            // the translated position or displace a click target substantially.
            const force = 12 * Math.exp(-distance / 650) / Math.max(90, distance);
            const x = dx * force, y = dy * force;
            surface.x += (x - surface.x) * ease;
            surface.y += (y - surface.y) * ease;
            moving ||= Math.hypot(x - surface.x, y - surface.y) > 0.015;
            surface.element.style.setProperty('--gravity-x', `${surface.x.toFixed(3)}px`);
            surface.element.style.setProperty('--gravity-y', `${surface.y.toFixed(3)}px`);
        }
        if (moving) frameRequest = requestAnimationFrame(paintGravity);
        else lastGravityTime = null;
    }
    function scheduleGravity() {
        if (pointer && !frameRequest) frameRequest = requestAnimationFrame(paintGravity);
    }
    document.addEventListener('pointermove', event => {
        if (event.pointerType !== 'mouse' || reducedMotion.matches || !finePointer.matches) return;
        if (!pointer) { wellX = event.clientX; wellY = event.clientY; }
        pointer = {x: event.clientX, y: event.clientY};
        root.dataset.pointerGravity = '';
        geometryDirty = true;
        scheduleGravity();
    }, {passive: true});
    document.documentElement.addEventListener('pointerleave', reset);
    window.addEventListener('blur', reset);
    const refreshGravity = () => { geometryDirty = true; scheduleGravity(); };
    window.addEventListener('scroll', refreshGravity, {passive: true});
    window.addEventListener('resize', refreshGravity, {passive: true});
    document.addEventListener('animationend', refreshGravity);
    document.addEventListener('visibilitychange', () => { if (document.hidden) reset(); });
    reducedMotion.addEventListener('change', reset);
    finePointer.addEventListener('change', reset);
})();
