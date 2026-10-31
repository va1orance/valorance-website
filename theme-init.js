// Apply before CSS to avoid a flash of the wrong theme. Storage may be blocked.
(() => {
    let saved;
    try { saved = localStorage.getItem('theme'); } catch (_) { /* System preference still works. */ }
    const theme = saved === 'light' || saved === 'dark'
        ? saved : (matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
    document.documentElement.dataset.theme = theme;
})();
