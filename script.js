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
    // A shared receiver layer makes every surface, image and glyph receive
    // the same cast shadows, rather than lighting each card in isolation.
    const svgNS = 'http://www.w3.org/2000/svg';
    const shadowScene = document.createElementNS(svgNS, 'svg');
    shadowScene.classList.add('scene-shadows');
    shadowScene.setAttribute('aria-hidden', 'true');
    shadowScene.setAttribute('focusable', 'false');
    const casters = [...document.querySelectorAll('.project-card, .theme-toggle')];
    const shadowPaths = casters.map(element => {
        const path = document.createElementNS(svgNS, 'path');
        path.setAttribute('fill-rule', 'evenodd');
        path.classList.add(element.matches('.project-card') ? 'card-shadow' : 'control-shadow');
        shadowScene.append(path);
        return path;
    });
    document.body.append(shadowScene);
    // Convex silhouette of a rounded face and its perspective projection.
    // Subtract only the caster itself: other cards must remain receivers.
    function castShadow(box, radius, light) {
        const points = [];
        for (const [cx, cy, start] of [
            [box.right-radius, box.top+radius, -90],
            [box.right-radius, box.bottom-radius, 0],
            [box.left+radius, box.bottom-radius, 90],
            [box.left+radius, box.top+radius, 180]
        ]) {
            for (let i=0; i<=6; i++) {
                const angle = (start+i*15)*Math.PI/180;
                points.push([cx+radius*Math.cos(angle), cy+radius*Math.sin(angle)]);
            }
        }
        const projected = points.map(([x,y]) => [x+(x-light.x)*3.5, y+(y-light.y)*3.5]);
        const sorted = [...points, ...projected].sort((a,b) => a[0]-b[0] || a[1]-b[1]);
        const cross = (o,a,b) => (a[0]-o[0])*(b[1]-o[1])-(a[1]-o[1])*(b[0]-o[0]);
        const half = list => {
            const hull = [];
            for (const point of list) {
                while (hull.length>1 && cross(hull[hull.length-2],hull[hull.length-1],point)<=0) hull.pop();
                hull.push(point);
            }
            return hull.slice(0,-1);
        };
        const outline = [...half(sorted), ...half([...sorted].reverse())];
        const path = list => `M${list.map(p => p.map(n => n.toFixed(1)).join(',')).join('L')}Z`;
        return path(outline)+path(points);
    }
    // One frame per pointer update; shadows are cast away from the light.
    const finePointer = matchMedia('(hover: hover) and (pointer: fine)');
    const surfaces = [...document.querySelectorAll('.project-card, .project-preview, .intro-copy, .logo-banner, .theme-toggle')];
    let pointer;
    const reset = () => {
        cancelAnimationFrame(frameRequest);
        frameRequest = 0;
        pointer = undefined;
        root.removeAttribute('data-pointer-light');
        const offset = document.querySelector('#val-depth feOffset');
        offset.setAttribute('dx', '3');
        offset.setAttribute('dy', '4');
        for (const surface of surfaces) {
            for (const name of ['--light-dx', '--light-dy', '--light-hx', '--light-hy']) surface.style.removeProperty(name);
        }
    };
    function paintLight() {
        frameRequest = 0;
        if (!pointer) return;
        root.dataset.pointerLight = '';
        shadowScene.setAttribute('viewBox', `0 0 ${innerWidth} ${innerHeight}`);
        // Read all bounds before writing styles; no per-surface layout flushes.
        const bounds = new Map(surfaces.map(element => [element, element.getBoundingClientRect()]));
        casters.forEach((element, i) => {
            const box = bounds.get(element);
            shadowPaths[i].setAttribute('d', castShadow(box, element.matches('.theme-toggle') ? box.width/2 : 22, pointer));
        });
        for (const surface of surfaces) {
            const box = bounds.get(surface);
            const dx = (box.left + box.width / 2 - pointer.x) / 36;
            const dy = (box.top + box.height / 2 - pointer.y) / 36;
            const distance = Math.hypot(dx, dy);
            const scale = 17 / Math.max(17, distance);
            surface.style.setProperty('--light-dx', `${(dx * scale).toFixed(2)}px`);
            surface.style.setProperty('--light-dy', `${(dy * scale).toFixed(2)}px`);
            surface.style.setProperty('--light-hx', `${(-dx * scale).toFixed(2)}px`);
            surface.style.setProperty('--light-hy', `${(-dy * scale).toFixed(2)}px`);
        }
        const logo = document.querySelector('.logo-banner');
        const dx = parseFloat(logo.style.getPropertyValue('--light-dx'));
        const dy = parseFloat(logo.style.getPropertyValue('--light-dy'));
        const offset = document.querySelector('#val-depth feOffset');
        offset.setAttribute('dx', (-dx * .55).toFixed(2));
        offset.setAttribute('dy', (-dy * .55).toFixed(2));
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
