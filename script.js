(() => {
    'use strict';
    const root = document.documentElement;
    const toggle = document.getElementById('theme-toggle');
    const video = document.getElementById('logo-video');
    const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
    const systemTheme = matchMedia('(prefers-color-scheme: light)');
    let userSelected = false;
    try { userSelected = ['light', 'dark'].includes(localStorage.getItem('theme')); } catch (_) {}
    let videoTheme;
    let frameRequest = 0;

    function updateVideo() {
        video.autoplay = !reducedMotion.matches;
        // A static supplied logo is preferable to downloading animation for reduced motion.
        if (reducedMotion.matches) {
            video.pause();
            video.removeAttribute('src');
            video.replaceChildren();
            video.load();
            videoTheme = undefined;
            return;
        }
        const theme = root.dataset.theme;
        if (videoTheme === theme) return;
        videoTheme = theme;
        video.replaceChildren();
        // Chromium can decode HEVC on some platforms but not its alpha channel.
        // Prefer WebM, with the original HEVC asset as Safari fallback.
        for (const [extension, mime] of [['webm', 'video/webm'], ['mp4', 'video/mp4; codecs="hvc1"']]) {
            const source = document.createElement('source');
            source.src = `media/val_logo_${extension === 'webm' ? 'chrome' : 'safari'}_${theme}.${extension}`;
            source.type = mime;
            video.append(source);
        }
        video.load();
        if (!document.hidden) video.play().catch(() => { /* Poster remains when autoplay is unavailable. */ });
    }

    function applyTheme(theme) {
        root.dataset.theme = theme;
        toggle.setAttribute('aria-label', `Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`);
        document.querySelector('meta[name="theme-color"]').content = theme === 'dark' ? '#202020' : '#e8e7e3';
        updateVideo();
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
    reducedMotion.addEventListener('change', updateVideo);
    document.addEventListener('visibilitychange', () => {
        if (document.hidden || reducedMotion.matches) video.pause();
        else video.play().catch(() => {});
    });
    // Retain the original pointer-lit feel, but only on the logo and only for mice.
    const well = document.querySelector('.logo-well');
    const reset = () => {
        cancelAnimationFrame(frameRequest);
        well.style.removeProperty('box-shadow');
    };
    well.addEventListener('pointermove', event => {
        if (event.pointerType !== 'mouse' || reducedMotion.matches) return;
        cancelAnimationFrame(frameRequest);
        frameRequest = requestAnimationFrame(() => {
            const box = well.getBoundingClientRect();
            const x = (event.clientX - box.left) / box.width;
            const y = (event.clientY - box.top) / box.height;
            well.style.boxShadow = `inset ${(x - .5) * -14}px ${(y - .5) * -14}px 18px var(--shade), inset ${(x - .5) * 14}px ${(y - .5) * 14}px 18px var(--highlight)`;
        });
    });
    well.addEventListener('pointerleave', reset);
    reducedMotion.addEventListener('change', reset);
})();
