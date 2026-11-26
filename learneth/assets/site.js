"use strict";
// Theme switcher (Light / Dark) — swaps palette and theme-matched screenshots and figures.
(() => {
  const buttons = [...document.querySelectorAll('.theme-btn[data-theme-choice]')];
  const VALID = new Set(['dark', 'light']);
  function applyTheme(theme) {
    if (!VALID.has(theme)) theme = 'light';
    document.documentElement.setAttribute('data-theme', theme);
    buttons.forEach(btn => btn.setAttribute('aria-pressed', String(btn.dataset.themeChoice === theme)));
    document.querySelectorAll('img[data-dark-src][data-light-src]').forEach(img => {
      const target = theme === 'light' ? img.dataset.lightSrc : img.dataset.darkSrc;
      if (target && img.getAttribute('src') !== target) img.src = target;
    });
  }
  const urlTheme = new URLSearchParams(location.search).get('theme');
  let initial = 'light';
  if (urlTheme && VALID.has(urlTheme)) {
    initial = urlTheme;
  } else {
    try {
      const saved = localStorage.getItem('learneth-site-theme');
      if (saved && VALID.has(saved)) initial = saved;
    } catch {}
  }
  applyTheme(initial);
  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      const next = btn.dataset.themeChoice;
      applyTheme(next);
      try { localStorage.setItem('learneth-site-theme', next); } catch {}
    });
  });
})();

const form = document.querySelector("#sample-form");
const answer = document.querySelector("#sample-answer");
const response = document.querySelector("#response");
const reset = document.querySelector("#reset");
if (form && answer && response && reset) {
  let streamToken = 0;
  let streamTimer = null;
  let liveController = null;
  const liveProxyUrl = (() => {
    const raw = (form.dataset.liveExampleUrl || "").trim();
    if (!raw) return "";
    try {
      const u = new URL(raw);
      return u.protocol === "https:" ? u.href : "";
    } catch {
      return "";
    }
  })();
  const modeNote = document.querySelector("#sample-mode-note");
  const DEFAULT_LIVE_NOTE = "Free public demo model · do not enter private info";
  if (liveProxyUrl && modeNote) {
    modeNote.textContent = DEFAULT_LIVE_NOTE;
  }

  async function fetchLiveDemoReply(text, token) {
    if (!liveProxyUrl) return { reply: null, reason: "" };
    if (liveController) liveController.abort();
    const ctrl = new AbortController();
    liveController = ctrl;
    const timeoutId = setTimeout(() => ctrl.abort(), 12000);
    try {
      const res = await fetch(liveProxyUrl, {
        method: "POST",
        mode: "cors",
        credentials: "omit",
        cache: "no-store",
        redirect: "error",
        referrerPolicy: "no-referrer",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answer: text.slice(0, 600) }),
        signal: ctrl.signal,
      });
      if (token !== streamToken) return { reply: null, reason: "" };
      if (res.status === 429) return { reply: null, reason: "rate-limit" };
      if (!res.ok) return { reply: null, reason: "unavailable" };
      const data = await res.json();
      if (!data || !data.ok || typeof data.body !== "string" || !data.body.trim()) {
        return { reply: null, reason: "unavailable" };
      }
      return {
        reply: {
          correct: true,
          badge: "↳ FREE DEMO MODEL · NOT PRIVATE",
          heading: typeof data.heading === "string" && data.heading.trim() ? data.heading.trim() : "Tutor feedback on your reasoning.",
          body: data.body.trim(),
        },
        reason: "",
      };
    } catch {
      return { reply: null, reason: "unavailable" };
    } finally {
      clearTimeout(timeoutId);
      if (liveController === ctrl) liveController = null;
    }
  }

  function chooseScriptedReply(text) {
    const lower = text.toLowerCase();
    const mentionsDirection = /\b(direction|turn|bend|curve|circle|circular|inward|toward)\b/.test(lower);
    const saysNo = /^\s*(no\b|not\b|nope\b)/.test(lower) || /\b(not accelerating|isn't accelerating|isnt accelerating|no acceleration)\b/.test(lower);
    if (mentionsDirection && !saysNo) {
      return {
        correct: true,
        badge: "↳ SCRIPTED PREVIEW · THAT’S THE KEY",
        heading: "You caught what the speedometer misses.",
        body: "Even at a steady 20 m/s, the car’s direction changes at every point around the bend. Because velocity includes direction, velocity is changing—which means the car is accelerating inward toward the centre. A live Learneth session would follow up on your exact wording; this preview uses a scripted note."
      };
    }
    if (saysNo) {
      return {
        correct: false,
        badge: "↳ SCRIPTED PREVIEW · CHECK DIRECTION",
        heading: "Speed stayed constant—velocity didn’t.",
        body: "The speedometer only reads magnitude (20 m/s). Around a circular track, the car’s direction changes continuously, so its velocity vector is always changing. Any change in velocity—speed or direction—is acceleration. A live Learneth session would respond to your specific reasoning; this preview uses a scripted note."
      };
    }
    return {
      correct: false,
      badge: "↳ SCRIPTED PREVIEW · NOT A GRADE",
      heading: "Look at what changes—not just the speedometer.",
      body: "That sideways pull is a real clue: around a circular track, the car’s direction keeps changing even at a steady 20 m/s. Since velocity includes direction, changing direction means changing velocity—so the car is accelerating inward. A live Learneth session would respond to your particular reasoning; this preview uses a scripted note."
    };
  }

  function typeText(el, fullText, token, onDone, onBeforeComplete) {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      if (onBeforeComplete) onBeforeComplete();
      el.textContent = fullText;
      onDone();
      return;
    }
    const caret = document.createElement("span");
    caret.className = "stream-caret";
    caret.setAttribute("aria-hidden", "true");
    const node = document.createTextNode("");
    el.replaceChildren(node, caret);
    let pos = 0;
    function step() {
      if (token !== streamToken) return;
      if (document.hidden) {
        streamTimer = setTimeout(step, 200);
        return;
      }
      const chunk = fullText.slice(pos, pos + 2);
      const nextPos = pos + chunk.length;
      const finished = nextPos >= fullText.length;
      if (finished && onBeforeComplete) onBeforeComplete();
      pos = nextPos;
      node.nodeValue = fullText.slice(0, pos);
      if (finished) {
        caret.remove();
        onDone();
        return;
      }
      const lastChar = chunk[chunk.length - 1];
      const delay = /[.!?—]/.test(lastChar) ? 140 : /[,;:]/.test(lastChar) ? 75 : 22;
      streamTimer = setTimeout(step, delay);
    }
    streamTimer = setTimeout(step, 90);
  }

  async function runScriptedTurn(text) {
    streamToken++;
    clearTimeout(streamTimer);
    if (liveController) { liveController.abort(); liveController = null; }
    const myToken = streamToken;
    const fallbackReply = chooseScriptedReply(text);

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
    label.textContent = liveProxyUrl ? "↳ LEARNETH · thinking…" : "↳ LEARNETH · writing…";
    const heading = document.createElement("h4");
    const explanation = document.createElement("p");
    feedback.append(label, heading, explanation);

    response.setAttribute("aria-live", "off");
    if (liveProxyUrl && modeNote) modeNote.textContent = DEFAULT_LIVE_NOTE;
    response.replaceChildren(quote, feedback);
    form.hidden = true;
    reset.hidden = false;
    reset.focus({preventScroll: true});
    response.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth",
      block: "nearest"
    });

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const finishWith = reply => {
      if (myToken !== streamToken) return;
      const restoreLive = () => {
        if (myToken === streamToken) response.setAttribute("aria-live", "polite");
      };
      feedback.className = reply.correct ? "feedback correct" : "feedback";
      label.textContent = reply.badge;
      if (reduced) restoreLive();
      typeText(heading, reply.heading, myToken, () => {
        if (myToken !== streamToken) return;
        typeText(explanation, reply.body, myToken, () => {}, restoreLive);
      });
    };

    if (liveProxyUrl) {
      const { reply: liveReply, reason } = await fetchLiveDemoReply(text, myToken);
      if (myToken !== streamToken) return;
      if (!liveReply && modeNote) {
        modeNote.textContent = reason === "rate-limit"
          ? "Free demo model is temporarily busy (429) — showing scripted preview."
          : DEFAULT_LIVE_NOTE;
      }
      finishWith(liveReply || fallbackReply);
      return;
    }

    if (reduced) finishWith(fallbackReply);
    else streamTimer = setTimeout(() => finishWith(fallbackReply), 320);
  }

  answer.addEventListener("keydown", event => {
    if (event.key === "Enter" && (event.metaKey || event.ctrlKey) && !event.isComposing) {
      event.preventDefault();
      form.requestSubmit();
    }
  });

  form.addEventListener("submit", event => {
    event.preventDefault();
    const text = answer.value.trim();
    if (!text) { answer.focus(); return; }
    runScriptedTurn(text);
  });

  reset.addEventListener("click", () => {
    streamToken++;
    clearTimeout(streamTimer);
    if (liveController) { liveController.abort(); liveController = null; }
    response.setAttribute("aria-live", "polite");
    if (liveProxyUrl && modeNote) modeNote.textContent = DEFAULT_LIVE_NOTE;
    response.replaceChildren();
    form.hidden = false;
    reset.hidden = true;
    answer.value = "";
    answer.focus();
  });
}

// Decorative typing is hidden from assistive technology; the full phrase stays readable.
(() => {
  const word = document.querySelector('.type-text');
  if (!word) return;
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const words = ['textbooks', 'documents', 'notes', 'learning'];
  let index = 0, deleting = true, timer;
  function tick() {
    if (motion.matches || document.hidden) return;
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
    if (!motion.matches && !document.hidden) timer = setTimeout(tick, 1700);
  }
  document.addEventListener('visibilitychange', () => {
    clearTimeout(timer);
    if (!document.hidden && !motion.matches) timer = setTimeout(tick, 400);
  });
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
    window.dispatchEvent(new CustomEvent('learneth-example-mode', { detail: { fullscreen: true } }));
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
    window.dispatchEvent(new CustomEvent('learneth-example-mode', { detail: { fullscreen: false } }));
    returnFocus.focus({preventScroll:true});
  });
  function openFromLocation() {
    if (new URLSearchParams(location.search).get('example') === 'fullscreen' || location.hash === '#example-fullscreen') showExample();
  }
  window.addEventListener('hashchange', openFromLocation);
  window.addEventListener('popstate', openFromLocation);
  openFromLocation();
})();

// Scripted session playback: animate learner request -> thinking popup -> lesson streaming in.
// Plays on first load on both the homepage (brisk pace) and the fullscreen example page (slower, realistic pauses).
(() => {
  const article = document.querySelector('#lesson-top');
  const scroller = document.querySelector('.doc-scroll');
  const promptBlock = document.querySelector('#session-prompt');
  const thinking = document.querySelector('#tutor-thinking');
  const replayBtn = document.querySelector('#replay-script');
  const skipBtn = document.querySelector('#skip-script');
  const dialog = document.querySelector('#example-fullscreen');
  if (!article || !scroller || !promptBlock || !thinking || !replayBtn || !skipBtn) return;

  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const DOTS = ['·', '··', '···'];
  const spinEl = thinking.querySelector('.think-spin');
  const labelEl = thinking.querySelector('.think-label');
  const timeEl = thinking.querySelector('.think-time');
  const promptTextEl = promptBlock.querySelector('p');
  const promptFullText = promptTextEl ? promptTextEl.textContent : '';

  const PACING = {
    home: {
      promptSpeed: 18,
      thinkPlanMs: 1050,
      thinkCheckMs: 750,
      learnerBeforePause: 260,
      learnerSpeed: 18,
      tutorSpeed: 14,
      chunkSize: 2,
      sentencePause: 95,
      commaPause: 50,
      beatPause: 230,
      planPause: 450,
      figurePause: 420,
      afterFeedbackPause: 520,
    },
    example: {
      promptSpeed: 38,
      thinkPlanMs: 2200,
      thinkCheckMs: 1650,
      learnerBeforePause: 950,
      learnerSpeed: 36,
      tutorSpeed: 26,
      chunkSize: 1,
      sentencePause: 200,
      commaPause: 95,
      beatPause: 680,
      planPause: 1350,
      figurePause: 1200,
      afterFeedbackPause: 1300,
    },
  };

  function isFullscreenExample() {
    return Boolean(dialog && dialog.open) ||
      new URLSearchParams(location.search).get('example') === 'fullscreen' ||
      location.hash === '#example-fullscreen';
  }

  // Collect lesson blocks after the thinking indicator (excluding dynamic response/reset/noscript).
  const allChildren = [...article.children];
  const thinkIdx = allChildren.indexOf(thinking);
  const lessonNodes = allChildren
    .slice(thinkIdx + 1)
    .filter(el => el.id !== 'response' && el.id !== 'reset' && el.tagName !== 'NOSCRIPT');

  // Snapshot original DOM subtrees of every text block we animate (preserving <strong>/<em> safely).
  const streamTargets = new Map();
  lessonNodes.forEach(node => {
    let els = [];
    let role = 'tutor';
    if (node.classList.contains('learner')) {
      els = [...node.querySelectorAll('p')];
      role = 'learner';
    } else if (node.classList.contains('tutor-note')) {
      els = [...node.querySelectorAll('p')];
      role = 'tutor';
    } else if (node.classList.contains('feedback')) {
      els = [...node.querySelectorAll('h4, p')];
      role = 'tutor';
    }
    if (els.length) {
      streamTargets.set(node, {
        role,
        items: els.map(el => ({ el, snapshot: [...el.childNodes].map(n => n.cloneNode(true)) })),
      });
    }
  });

  let runId = 0;
  let timers = [];
  let spinInterval = null;
  let isGenerating = false;
  let userScrolled = false;
  let lastScrollTop = 0;
  let touchStartY = null;
  let hasAutoPlayed = false;

  function pinToBottom() {
    if (!isGenerating || userScrolled || motion.matches) return;
    const maxScroll = Math.max(0, scroller.scrollHeight - scroller.clientHeight);
    scroller.scrollTop = maxScroll;
    lastScrollTop = scroller.scrollTop;
  }

  function pinToBottomSoon() {
    pinToBottom();
    requestAnimationFrame(pinToBottom);
  }

  scroller.addEventListener('wheel', event => {
    if (!isGenerating) return;
    if (event.deltaY < 0 && scroller.scrollTop > 0) {
      userScrolled = true;
    } else if (event.deltaY > 0 && scroller.scrollHeight - scroller.scrollTop - scroller.clientHeight <= 28) {
      userScrolled = false;
      pinToBottom();
    }
  }, { passive: true });

  scroller.addEventListener('touchstart', event => {
    touchStartY = event.touches[0] ? event.touches[0].clientY : null;
  }, { passive: true });

  scroller.addEventListener('touchmove', event => {
    if (!isGenerating || touchStartY === null || !event.touches[0]) return;
    if (event.touches[0].clientY - touchStartY > 14 && scroller.scrollTop > 0) {
      userScrolled = true;
    }
  }, { passive: true });

  scroller.addEventListener('scroll', () => {
    if (!isGenerating) {
      lastScrollTop = scroller.scrollTop;
      return;
    }
    const distFromBottom = scroller.scrollHeight - scroller.scrollTop - scroller.clientHeight;
    if (scroller.scrollTop < lastScrollTop - 8 && distFromBottom > 36) {
      userScrolled = true;
    } else if (distFromBottom <= 24) {
      userScrolled = false;
    }
    lastScrollTop = scroller.scrollTop;
  }, { passive: true });

  article.querySelectorAll('.physics-figure img').forEach(img => {
    img.addEventListener('load', () => {
      if (isGenerating && !userScrolled) pinToBottomSoon();
    });
  });

  function clearTimers() {
    timers.forEach(id => clearTimeout(id));
    timers = [];
    if (spinInterval) { clearInterval(spinInterval); spinInterval = null; }
  }

  function wait(ms, myRun) {
    return new Promise(resolve => {
      const id = setTimeout(() => resolve(myRun === runId), ms);
      timers.push(id);
    });
  }

  function typeTextIntoNode(textNode, fullText, caret, containerEl, myRun, speedMs, pace) {
    return new Promise(resolve => {
      let pos = 0;
      const stepSize = pace.chunkSize;
      function step() {
        if (myRun !== runId) { resolve(false); return; }
        if (document.hidden) {
          timers.push(setTimeout(step, 200));
          return;
        }
        const chunk = fullText.slice(pos, pos + stepSize);
        pos += chunk.length;
        textNode.nodeValue = fullText.slice(0, pos);
        pinToBottom();
        if (pos >= fullText.length) {
          resolve(true);
          return;
        }
        const ch = chunk[chunk.length - 1];
        const delay = /[.!?—]/.test(ch) ? pace.sentencePause : /[,;:]/.test(ch) ? pace.commaPause : speedMs;
        timers.push(setTimeout(step, delay));
      }
      timers.push(setTimeout(step, speedMs));
    });
  }

  async function typeRichElement(el, snapshotNodes, myRun, speedMs, pace) {
    const caret = document.createElement('span');
    caret.className = 'stream-caret';
    caret.setAttribute('aria-hidden', 'true');
    el.replaceChildren(caret);

    async function walk(nodes, parent, isRoot) {
      for (const src of nodes) {
        if (myRun !== runId) return false;
        if (src.nodeType === Node.TEXT_NODE) {
          const text = src.nodeValue || '';
          const live = document.createTextNode('');
          if (isRoot) parent.insertBefore(live, caret);
          else parent.appendChild(live);
          const ok = await typeTextIntoNode(live, text, caret, el, myRun, speedMs, pace);
          if (!ok) return false;
        } else if (src.nodeType === Node.ELEMENT_NODE) {
          const clone = src.cloneNode(false);
          if (isRoot) parent.insertBefore(clone, caret);
          else parent.appendChild(clone);
          const ok = await walk([...src.childNodes], clone, false);
          if (!ok) return false;
        }
      }
      return true;
    }

    const ok = await walk(snapshotNodes, el, true);
    caret.remove();
    return ok;
  }

  async function showThinking(label, durationMs, anchorAfter, myRun) {
    if (myRun !== runId) return false;
    if (anchorAfter) anchorAfter.after(thinking);
    labelEl.textContent = label;
    thinking.hidden = false;
    thinking.classList.add('script-reveal');
    pinToBottomSoon();
    const t0 = Date.now();
    spinEl.textContent = DOTS[0];
    timeEl.textContent = '0.0s';
    if (spinInterval) clearInterval(spinInterval);
    spinInterval = setInterval(() => {
      if (myRun !== runId) { clearInterval(spinInterval); spinInterval = null; return; }
      const elapsed = Date.now() - t0;
      spinEl.textContent = DOTS[Math.floor(elapsed / 240) % DOTS.length];
      timeEl.textContent = (elapsed / 1000).toFixed(1) + 's';
    }, 90);
    const ok = await wait(durationMs, myRun);
    if (spinInterval) { clearInterval(spinInterval); spinInterval = null; }
    if (!ok) return false;
    thinking.hidden = true;
    return true;
  }

  function restoreSnapshots() {
    if (promptTextEl) promptTextEl.textContent = promptFullText;
    lessonNodes.forEach(node => {
      const target = streamTargets.get(node);
      if (target) {
        target.items.forEach(({ el, snapshot }) => {
          el.replaceChildren(...snapshot.map(n => n.cloneNode(true)));
        });
      }
    });
  }

  function preparePendingPlayback() {
    lessonNodes.forEach(node => {
      node.classList.add('script-hidden');
      node.classList.remove('script-reveal');
    });
    promptBlock.classList.remove('script-hidden');
    skipBtn.hidden = false;
    replayBtn.hidden = true;
  }

  function showAllImmediately() {
    runId++;
    hasAutoPlayed = true;
    isGenerating = false;
    clearTimers();
    thinking.hidden = true;
    promptBlock.after(thinking);
    promptBlock.classList.remove('script-hidden');
    restoreSnapshots();
    lessonNodes.forEach(node => {
      node.classList.remove('script-hidden', 'script-reveal');
    });
    skipBtn.hidden = true;
    replayBtn.hidden = false;
  }

  async function playScript({ forceAnimate = false, mode = isFullscreenExample() ? 'example' : 'home' } = {}) {
    if (!forceAnimate && motion.matches) {
      showAllImmediately();
      return;
    }
    const pace = PACING[mode] || PACING.home;
    runId++;
    const myRun = runId;
    clearTimers();
    hasAutoPlayed = true;
    isGenerating = true;
    userScrolled = false;
    lastScrollTop = 0;
    scroller.scrollTop = 0;
    replayBtn.hidden = true;
    skipBtn.hidden = false;
    thinking.hidden = true;
    promptBlock.after(thinking);

    // Hide lesson nodes until the tutor streams them in.
    lessonNodes.forEach(node => {
      node.classList.add('script-hidden');
      node.classList.remove('script-reveal');
    });
    promptBlock.classList.remove('script-hidden');
    promptBlock.classList.add('script-reveal');

    try {
      // 1. User asks Learneth to teach mechanics.
      if (promptTextEl) {
        const promptSnap = [document.createTextNode(promptFullText)];
        if (!(await typeRichElement(promptTextEl, promptSnap, myRun, pace.promptSpeed, pace))) return;
        if (!(await wait(mode === 'example' ? 500 : 180, myRun))) return;
      }

      // 2. "Learneth is thinking…" popup while building the lesson plan.
      if (!(await showThinking('Learneth is thinking… planning from your Physics notes', pace.thinkPlanMs, promptBlock, myRun))) return;

      // 3. Stream the lesson blocks onto the page in natural beats while holding scroll at the bottom.
      for (let i = 0; i < lessonNodes.length; i++) {
        if (myRun !== runId) return;
        const node = lessonNodes[i];
        const isFeedback = node.classList.contains('feedback');
        const isLearner = node.classList.contains('learner');
        if (isLearner) {
          if (!(await wait(pace.learnerBeforePause, myRun))) return;
        }
        if (isFeedback) {
          const prev = lessonNodes[i - 1];
          if (!(await showThinking('Learneth is thinking… checking your reasoning', pace.thinkCheckMs, prev, myRun))) return;
        }

        const target = streamTargets.get(node);
        if (target) {
          target.items.forEach(({ el }) => el.replaceChildren());
        }
        node.classList.remove('script-hidden');
        node.classList.add('script-reveal');
        pinToBottomSoon();

        if (target) {
          const speed = target.role === 'learner' ? pace.learnerSpeed : pace.tutorSpeed;
          for (let j = 0; j < target.items.length; j++) {
            const { el, snapshot } = target.items[j];
            if (!(await typeRichElement(el, snapshot, myRun, speed, pace))) return;
            pinToBottom();
            if (j < target.items.length - 1) {
              if (!(await wait(mode === 'example' ? 420 : 140, myRun))) return;
            }
          }
          const afterPause = isFeedback ? pace.afterFeedbackPause : pace.beatPause;
          if (!(await wait(afterPause, myRun))) return;
        } else {
          const pause = node.tagName === 'FIGURE'
            ? pace.figurePause
            : node.classList.contains('plan')
              ? pace.planPause
              : pace.beatPause;
          if (!(await wait(pause, myRun))) return;
        }
      }
      pinToBottomSoon();
    } finally {
      if (myRun === runId) {
        isGenerating = false;
        skipBtn.hidden = true;
        replayBtn.hidden = false;
      }
    }
  }

  replayBtn.hidden = false;
  replayBtn.addEventListener('click', () => playScript({ forceAnimate: true }));
  skipBtn.addEventListener('click', showAllImmediately);
  motion.addEventListener('change', () => { if (motion.matches) showAllImmediately(); });
  window.addEventListener('learneth-example-mode', event => {
    if (event.detail && event.detail.fullscreen) {
      playScript({ forceAnimate: false, mode: 'example' });
    }
  });
  window.addEventListener('learneth-preview-revealed', () => {
    if (!hasAutoPlayed && !motion.matches) {
      playScript({ forceAnimate: false, mode: isFullscreenExample() ? 'example' : 'home' });
    }
  });

  // Start immediately for reduced motion, fullscreen example, or when page-streaming is inactive;
  // otherwise wait until the user scrolls into #preview so they watch it stream and hold scroll at the bottom.
  if (motion.matches) {
    showAllImmediately();
  } else if (isFullscreenExample()) {
    playScript({ forceAnimate: false, mode: 'example' });
  } else {
    const previewSec = document.querySelector('#preview[data-stream-section]');
    const deferUntilReveal = Boolean(previewSec && !document.querySelector('#page-thinking.is-done') && document.querySelector('#page-thinking'));
    if (deferUntilReveal) {
      preparePendingPlayback();
    } else {
      playScript({ forceAnimate: false, mode: 'home' });
    }
  }
})();

// Live page-generation feel: brisk hero readiness and deliberate scroll reveal.
(() => {
  const thinkingEl = document.querySelector('#page-thinking');
  const skipBtn = document.querySelector('#page-skip');
  const sections = [...document.querySelectorAll('[data-stream-section]')];
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const DOTS = ['·', '··', '···'];

  if (!thinkingEl || !sections.length || motion.matches) return;

  const spinEl = thinkingEl.querySelector('.think-spin');
  const labelEl = thinkingEl.querySelector('.think-label');
  const pending = new Set(sections);
  const activeTimers = [];
  const restorers = [];
  let finishedAll = false;
  let previewSignaled = false;

  function signalPreviewRevealed(immediate) {
    if (previewSignaled) return;
    previewSignaled = true;
    window.dispatchEvent(new CustomEvent('learneth-preview-revealed', { detail: { immediate } }));
  }

  document.documentElement.classList.add('js-page-stream');
  sections.forEach(sec => sec.classList.add('stream-pending'));
  if (skipBtn) skipBtn.hidden = false;

  function revealElements(elements, stepMs, afterEach) {
    return new Promise(resolve => {
      if (!elements.length || finishedAll) {
        elements.forEach(el => el.classList.remove('type-wait'));
        resolve();
        return;
      }
      let remaining = elements.length;
      elements.forEach((el, i) => {
        const tid = setTimeout(() => {
          el.classList.remove('type-wait');
          if (afterEach) afterEach(el);
          if (--remaining === 0) resolve();
        }, i * stepMs);
        activeTimers.push(() => clearTimeout(tid));
      });
    });
  }

  async function typeHeroSection(sec) {
    const eyebrow = sec.querySelector('.hero-eyebrow');
    const h1 = sec.querySelector('h1');
    const lead = sec.querySelector('.hero-lead');
    const extras = [
      eyebrow,
      h1,
      lead,
      sec.querySelector('.hero-actions'),
      sec.querySelector('.hero-trust'),
      sec.querySelector('.hero-status'),
    ].filter(Boolean);

    extras.forEach(el => { el.classList.add('type-slot', 'type-wait'); });
    sec.classList.remove('stream-pending');
    await revealElements(extras, 70);
  }

  async function typeContentSection(sec) {
    const h2 = sec.querySelector('h2');
    const introP = sec.querySelector('.section-intro > p, .section-head > p:last-child');
    const bodyBlocks = [...sec.children].filter(
      el => !el.classList.contains('section-think') && !el.classList.contains('section-intro') && !el.classList.contains('section-head')
    );

    const sequence = [h2, introP, ...bodyBlocks].filter(Boolean);
    sequence.forEach(el => el.classList.add('type-slot', 'type-wait'));
    sec.classList.remove('stream-pending');

    await revealElements(sequence, 95, el => {
      if (sec.id === 'preview' && el.classList.contains('workspace')) {
        signalPreviewRevealed(false);
      }
    });
  }

  function revealSection(sec, immediate) {
    if (!pending.has(sec)) return;
    pending.delete(sec);
    const bar = sec.querySelector('.section-think');
    const barSpin = bar ? bar.querySelector('.think-spin') : null;
    const barText = bar ? bar.querySelector('.section-think-text') : null;
    const originalText = barText ? barText.textContent : '';

    if (immediate) {
      sec.classList.remove('stream-pending');
      sec.querySelectorAll('.type-wait').forEach(el => el.classList.remove('type-wait'));
      if (bar) { bar.classList.remove('is-thinking'); bar.classList.add('is-done'); }
      if (barSpin) barSpin.textContent = '✓';
      if (barText && originalText) barText.textContent = originalText;
      if (sec.id === 'preview') signalPreviewRevealed(true);
      if (pending.size === 0 && skipBtn) skipBtn.hidden = true;
      return;
    }

    if (sec.dataset.streamSection === 'hero') {
      typeHeroSection(sec).then(() => {
        if (pending.size === 0 && skipBtn) skipBtn.hidden = true;
      });
      return;
    }

    if (!bar || !barSpin || !barText) {
      typeContentSection(sec);
      return;
    }

    bar.classList.add('is-thinking');
    const draftStart = performance.now();
    barSpin.textContent = DOTS[0];
    barText.textContent = 'Preparing section… 0.0s';
    const iv = setInterval(() => {
      const elapsedMs = performance.now() - draftStart;
      barSpin.textContent = DOTS[Math.floor(elapsedMs / 180) % DOTS.length];
      barText.textContent = `Preparing section… ${(elapsedMs / 1000).toFixed(1)}s`;
    }, 80);
    let thinkingDone = false;
    function restoreThinking() {
      if (thinkingDone) return;
      thinkingDone = true;
      clearInterval(iv);
      bar.classList.remove('is-thinking');
      bar.classList.add('is-done');
      barSpin.textContent = '✓';
      barText.textContent = originalText;
    }
    restorers.push(restoreThinking);
    const tid = setTimeout(() => {
      restoreThinking();
      typeContentSection(sec).then(() => {
        if (pending.size === 0 && skipBtn) skipBtn.hidden = true;
      });
    }, 450);
    activeTimers.push(() => { clearInterval(iv); clearTimeout(tid); });
  }

  function finishAll() {
    finishedAll = true;
    while (activeTimers.length) activeTimers.pop()();
    while (restorers.length) restorers.pop()();
    [...pending].forEach(sec => revealSection(sec, true));
    sections.forEach(sec => {
      sec.classList.remove('stream-pending');
      sec.querySelectorAll('.type-wait').forEach(el => el.classList.remove('type-wait'));
    });
    signalPreviewRevealed(true);
    thinkingEl.classList.add('is-done');
    if (spinEl) spinEl.textContent = '✓';
    if (labelEl) labelEl.textContent = 'Interactive preview · scroll to explore';
    if (skipBtn) skipBtn.hidden = true;
  }

  if (skipBtn) skipBtn.addEventListener('click', finishAll);
  motion.addEventListener('change', () => { if (motion.matches) finishAll(); });

  function beginGeneration() {
    if (motion.matches || pending.size === 0 || finishedAll) { finishAll(); return; }
    const tStart = performance.now();
    if (spinEl) spinEl.textContent = DOTS[0];
    if (labelEl) labelEl.textContent = 'Preparing workspace…';
    const introIv = setInterval(() => {
      const elapsedMs = performance.now() - tStart;
      if (spinEl) spinEl.textContent = DOTS[Math.floor(elapsedMs / 160) % DOTS.length];
    }, 80);
    const introTid = setTimeout(() => {
      clearInterval(introIv);
      thinkingEl.classList.add('is-done');
      if (spinEl) spinEl.textContent = '✓';
      if (labelEl) labelEl.textContent = 'Interactive preview · scroll to explore';
      const hero = sections.find(s => s.dataset.streamSection === 'hero');
      if (hero) revealSection(hero, false);
    }, 280);
    activeTimers.push(() => { clearInterval(introIv); clearTimeout(introTid); });

    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver(entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            io.unobserve(entry.target);
            revealSection(entry.target, false);
          }
        });
      }, { rootMargin: '0px 0px -36% 0px', threshold: 0.01 });
      sections.forEach(sec => {
        if (sec.dataset.streamSection !== 'hero') io.observe(sec);
      });

      const revealTargetHash = rawHash => {
        const id = (rawHash || '').replace(/^#/, '');
        if (!id) return;
        const target = document.getElementById(id);
        const sec = target ? target.closest('[data-stream-section]') : null;
        if (sec && pending.has(sec)) {
          io.unobserve(sec);
          revealSection(sec, false);
        }
      };

      const onScrollBottomCheck = () => {
        if (finishedAll || pending.size === 0) return;
        const nearBottom = window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 60;
        if (!nearBottom) return;
        [...pending].forEach(sec => {
          if (sec.dataset.streamSection === 'hero') return;
          const rect = sec.getBoundingClientRect();
          if (rect.top < window.innerHeight - 16) {
            io.unobserve(sec);
            revealSection(sec, false);
          }
        });
      };

      const onHashChange = () => revealTargetHash(location.hash);
      const onAnchorClick = event => {
        const link = event.target.closest && event.target.closest('a[href^="#"]');
        if (link) revealTargetHash(link.getAttribute('href'));
      };

      window.addEventListener('scroll', onScrollBottomCheck, { passive: true });
      window.addEventListener('hashchange', onHashChange);
      document.addEventListener('click', onAnchorClick);
      activeTimers.push(() => {
        io.disconnect();
        window.removeEventListener('scroll', onScrollBottomCheck);
        window.removeEventListener('hashchange', onHashChange);
        document.removeEventListener('click', onAnchorClick);
      });
      if (location.hash) revealTargetHash(location.hash);
    } else {
      finishAll();
    }
  }

  // Wait until the page (and fonts) have fully loaded and painted before starting reveal choreography.
  function scheduleAfterFullLoad() {
    const fontsReady = document.fonts && document.fonts.ready
      ? Promise.race([document.fonts.ready, new Promise(r => setTimeout(r, 600))])
      : Promise.resolve();
    fontsReady.then(() => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          const waitTid = setTimeout(beginGeneration, 80);
          activeTimers.push(() => clearTimeout(waitTid));
        });
      });
    });
  }

  if (spinEl) spinEl.textContent = DOTS[0];
  if (labelEl) labelEl.textContent = 'Preparing workspace…';
  if (document.readyState === 'complete') {
    scheduleAfterFullLoad();
  } else {
    window.addEventListener('load', scheduleAfterFullLoad, { once: true });
  }
})();
