(() => {
  'use strict';
  const visible = node => !!node && !node.closest('[hidden],[inert]') &&
    node.getClientRects().length > 0 && getComputedStyle(node).visibility === 'visible';
  const controls = selector => [...document.querySelectorAll(selector)]
    .filter(node => visible(node) && !node.disabled && node.tabIndex >= 0);
  const editing = node => node instanceof Element &&
    (node.matches('input,textarea,select') || node.isContentEditable);
  const consume = event => {
    event.preventDefault();
    event.stopImmediatePropagation();
  };
  const move = (event, list) => {
    if (!list.length) return;
    const index = list.indexOf(document.activeElement);
    const backward = event.key === 'h' || event.key === 'k';
    const next = index < 0 ? (backward ? list.length - 1 : 0) :
      (index + (backward ? -1 : 1) + list.length) % list.length;
    consume(event);
    list[next].focus();
  };
  document.addEventListener('keydown', event => {
    if (event.isComposing || event.keyCode === 229 || event.ctrlKey ||
        event.metaKey || event.shiftKey) return;
    const overlayVisible = visible(document.getElementById('overlay'));
    if (visible(document.getElementById('arena')) && !overlayVisible) {
      if (event.altKey && /^[hjkl]$/.test(event.key)) {
        move(event, controls('header button,#arena button'));
      } else if (!event.altKey && event.key === 'i' && !editing(event.target)) {
        const typing = document.getElementById('typing');
        if (visible(typing)) { consume(event); typing.focus(); }
      }
      return;
    }
    if (event.altKey) return;
    if (overlayVisible) {
      if (!editing(event.target) && /^[hjkl]$/.test(event.key)) {
        move(event, controls('#overlay button'));
      }
      return;
    }
    if (!visible(document.getElementById('menu'))) return;
    const command = document.getElementById('command');
    if (event.key === 'Escape' && document.activeElement === command) {
      const buttons = controls('#menu button');
      const selected = buttons.find(button => button.classList.contains('selected')) || buttons[0];
      if (selected) { consume(event); selected.focus(); }
      return;
    }
    if (!editing(event.target) && (event.key === '/' || event.key === 'i')) {
      consume(event);
      command?.focus();
      return;
    }
    if (!editing(event.target) && /^[hjkl]$/.test(event.key)) {
      move(event, controls('header button,header a[href],#menu button,#menu a[href]'));
    }
  }, true);
})();
