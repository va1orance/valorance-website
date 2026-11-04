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
    let fillVelocity = 0;
    let lastFillTime = 0;
    // Finish at 65% of the page; damp only while catching up to the scroll.
    const fillScrollSpan = 0.65;
    root.dataset.scrollFill = '';
    function paintFill(time = performance.now()) {
        fillFrame = 0;
        const range = root.scrollHeight - root.clientHeight;
        const target = range > 0 ? clamp(window.scrollY / (range * fillScrollSpan)) : 0;
        const elapsed = lastFillTime ? Math.min(64, Math.max(0, time - lastFillTime)) : 16.67;
        lastFillTime = time;
        if (displayedFill === undefined || reducedMotion.matches) {
            displayedFill = target;
            fillVelocity = 0;
        } else {
            // Critically damped spring: carry velocity through scroll changes,
            // easing into motion as well as coasting gently into the target.
            const dt = elapsed / 1000;
            const frequency = 7;
            const offset = displayedFill - target;
            const impulse = fillVelocity + frequency * offset;
            const decay = Math.exp(-frequency * dt);
            displayedFill = target + (offset + impulse * dt) * decay;
            fillVelocity = (fillVelocity - frequency * impulse * dt) * decay;
            displayedFill = clamp(displayedFill);
        }
        if (Math.abs(target - displayedFill) < 0.0001 && Math.abs(fillVelocity) < 0.001) {
            displayedFill = target;
            fillVelocity = 0;
        }
        const progress = displayedFill;
        if (progress !== target) fillFrame = requestAnimationFrame(paintFill);
        else lastFillTime = 0;
        root.style.setProperty('--val-fill-x', `${-25 + 1130 * progress}px`);
        // The dot fills over a short interval as the leading edge reaches the A.
        const dot = clamp((progress - 0.475) / 0.025);
        root.style.setProperty('--val-dot-scale', `${dot * dot * (3 - 2 * dot)}`);
        if (progress >= 0.18) root.dataset.greetingRaised = '';
    }
    function scheduleFill() {
        if (!fillFrame) fillFrame = requestAnimationFrame(paintFill);
    }
    window.addEventListener('scroll', scheduleFill, {passive: true});
    window.addEventListener('resize', scheduleFill, {passive: true});
    window.addEventListener('pageshow', scheduleFill);
    new ResizeObserver(scheduleFill).observe(document.body);
    paintFill();
    // One frame per pointer update; shadows are cast away from the light.
    const finePointer = matchMedia('(hover: hover) and (pointer: fine)');
    const surfaces = [...document.querySelectorAll('.project-card, .logo-banner, .theme-toggle')];
    let pointer;
    const reset = () => {
        cancelAnimationFrame(frameRequest);
        frameRequest = 0;
        pointer = undefined;
        root.removeAttribute('data-pointer-light');
        for (const surface of surfaces) {
            for (const name of ['--light-dx', '--light-dy', '--light-hx', '--light-hy']) surface.style.removeProperty(name);
        }
    };
    function paintLight() {
        frameRequest = 0;
        if (!pointer) return;
        root.dataset.pointerLight = '';
        root.style.setProperty('--light-x', `${pointer.x}px`);
        root.style.setProperty('--light-y', `${pointer.y}px`);
        for (const surface of surfaces) {
            const box = surface.getBoundingClientRect();
            const dx = (box.left + box.width / 2 - pointer.x) / 36;
            const dy = (box.top + box.height / 2 - pointer.y) / 36;
            const distance = Math.hypot(dx, dy);
            const scale = 10 / Math.max(10, distance);
            surface.style.setProperty('--light-dx', `${(dx * scale).toFixed(2)}px`);
            surface.style.setProperty('--light-dy', `${(dy * scale).toFixed(2)}px`);
            surface.style.setProperty('--light-hx', `${(-dx * scale).toFixed(2)}px`);
            surface.style.setProperty('--light-hy', `${(-dy * scale).toFixed(2)}px`);
        }
    }
    function scheduleLight() {
        if (pointer && !frameRequest) frameRequest = requestAnimationFrame(paintLight);
    }
    document.addEventListener('pointermove', event => {
        if (event.pointerType !== 'mouse' || reducedMotion.matches || !finePointer.matches) return;
        pointer = {x: event.clientX, y: event.clientY};
        scheduleLight();
    }, {passive: true});
    document.documentElement.addEventListener('pointerleave', reset);
    window.addEventListener('blur', reset);
    window.addEventListener('scroll', scheduleLight, {passive: true});
    window.addEventListener('resize', scheduleLight, {passive: true});
    document.addEventListener('visibilitychange', () => { if (document.hidden) reset(); });
    reducedMotion.addEventListener('change', reset);
    finePointer.addEventListener('change', reset);
})();
