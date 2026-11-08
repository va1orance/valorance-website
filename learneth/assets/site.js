"use strict";
const form = document.querySelector("#sample-form");
const answer = document.querySelector("#sample-answer");
const response = document.querySelector("#response");
const reset = document.querySelector("#reset");
form.addEventListener("submit", event => {
  event.preventDefault();
  const text = answer.value.trim();
  if (!text) { answer.focus(); return; }
  const quote = document.createElement("blockquote");
  quote.className = "learner";
  const speaker = document.createElement("span");
  speaker.className = "speaker";
  speaker.textContent = "YOU · PREVIEW RESPONSE";
  const paragraph = document.createElement("p");
  paragraph.textContent = text;
  quote.append(speaker, paragraph);
  const feedback = document.createElement("div");
  feedback.className = "feedback";
  const label = document.createElement("span");
  label.className = "feedback-label";
  label.textContent = "↳ A SCRIPTED TEACHING NOTE · NOT A GRADE";
  const heading = document.createElement("h4");
  heading.textContent = "Look at what changes—not just the speedometer.";
  const explanation = document.createElement("p");
  explanation.textContent = "On a circular track, the car’s direction keeps changing. Its velocity changes even at constant speed, so it is accelerating. A live Learneth session would respond to your particular reasoning; this preview adds the same example note for everyone.";
  feedback.append(label, heading, explanation);
  response.replaceChildren(quote, feedback);
  form.hidden = true;
  reset.hidden = false;
  reset.focus({preventScroll:true});
  response.scrollIntoView({behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth", block:"nearest"});
});
reset.addEventListener("click", () => {
  response.replaceChildren();
  form.hidden = false;
  reset.hidden = true;
  answer.value = "";
  answer.focus();
});

// Decorative typing is hidden from assistive technology; the full phrase stays readable.
(() => {
  const word = document.querySelector('.type-text');
  if (!word) return;
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const words = ['textbooks', 'documents', 'notes', 'learning'];
  let index = 0, deleting = true, timer;
  function tick() {
    if (motion.matches) return;
    if (document.hidden) { timer = setTimeout(tick, 300); return; }
    const current = word.textContent;
    word.textContent = deleting ? current.slice(0, -1) : words[index].slice(0, current.length + 1);
    let delay = deleting ? 80 : 120;
    if (deleting && !word.textContent) {
      deleting = false;
      index = (index + 1) % words.length;
      delay = 280;
    } else if (!deleting && word.textContent === words[index]) {
      deleting = true;
      delay = 1700;
    }
    timer = setTimeout(tick, delay);
  }
  function restart() {
    clearTimeout(timer);
    index = 0;
    deleting = true;
    word.textContent = words[0];
    if (!motion.matches) timer = setTimeout(tick, 1700);
  }
  motion.addEventListener('change', restart);
  restart();
})();

// Enlarge the same document, never a second copy with duplicate controls or state.
(() => {
  const dialog = document.querySelector('#example-fullscreen');
  const workspace = document.querySelector('#preview .workspace');
  const open = document.querySelector('#example-open');
  const close = document.querySelector('#example-close');
  if (!dialog || !workspace || !open || !close) return;
  const marker = document.createComment('Embedded example position');
  workspace.before(marker);
  let returnFocus = open;
  function showExample() {
    if (dialog.open) return;
    returnFocus = document.activeElement === document.body ? open : document.activeElement;
    dialog.append(workspace);
    dialog.showModal();
    document.documentElement.classList.add('example-is-open');
  }
  open.hidden = false;
  open.addEventListener('click', showExample);
  close.addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', () => {
    marker.after(workspace);
    document.documentElement.classList.remove('example-is-open');
    const url = new URL(location.href);
    if (url.searchParams.get('example') === 'fullscreen') url.searchParams.delete('example');
    if (url.hash === '#example-fullscreen') url.hash = 'preview';
    history.replaceState(history.state, '', url);
    returnFocus.focus({preventScroll:true});
  });
  function openFromLocation() {
    if (new URLSearchParams(location.search).get('example') === 'fullscreen' || location.hash === '#example-fullscreen') showExample();
  }
  window.addEventListener('hashchange', openFromLocation);
  window.addEventListener('popstate', openFromLocation);
  openFromLocation();
})();
