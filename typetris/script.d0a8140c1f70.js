(() => {
  "use strict";
  const $ = (id) => document.getElementById(id),
    colors = [
      "#61e5dd",
      "#b9a0ff",
      "#f1d66c",
      "#f6a06a",
      "#7eb5fc",
      "#92dca2",
      "#fc7b8b",
    ];
  let game = null,
    screen = "menu",
    dialog = "",
    last = performance.now(),
    started = false,
    previousInput = "",
    lastFocus = null,
    audio = null,
    toastTimer = null;
  const defaults = { sound: false, motion: true };
  let settings = { ...defaults },
    best = 0;
  try {
    const stored = JSON.parse(
      localStorage.getItem("typetris-settings") || "{}",
    );
    if (stored && typeof stored === "object" && !Array.isArray(stored)) {
      for (const key of ["sound", "motion"])
        if (typeof stored[key] === "boolean") settings[key] = stored[key];
    }
  } catch {}
  try {
    const storedBest = Number(localStorage.getItem("typetris-best"));
    if (Number.isFinite(storedBest) && storedBest >= 0) best = storedBest;
  } catch {}
  function save() {
    try {
      localStorage.setItem("typetris-settings", JSON.stringify(settings));
      localStorage.setItem("typetris-best", String(best));
    } catch {}
  }
  function saveBest() {
    if (game && game.score > best) {
      best = game.score;
      save();
    }
  }
  function apply() {
    document.body.classList.toggle("low-motion", !settings.motion);
    $("sound-toggle").textContent = settings.sound ? "SOUND ON" : "SOUND OFF";
    $("sound-toggle").setAttribute("aria-pressed", String(settings.sound));
    $("personal-best").textContent = best ? best.toLocaleString() : "—";
    $("equipped-opener").textContent = "ANY WORD · SAME-COLUMN ATTACKS";
  }
  function sound(freq = 420, duration = 0.08) {
    if (!settings.sound) return;
    try {
      audio ??= new (window.AudioContext || window.webkitAudioContext)();
      audio.resume();
      const o = audio.createOscillator(),
        v = audio.createGain();
      o.type = "triangle";
      o.frequency.setValueAtTime(freq, audio.currentTime);
      o.frequency.exponentialRampToValueAtTime(
        freq / 2,
        audio.currentTime + duration,
      );
      v.gain.setValueAtTime(0.06, audio.currentTime);
      v.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + duration);
      o.connect(v);
      v.connect(audio.destination);
      o.start();
      o.stop(audio.currentTime + duration);
    } catch {}
  }
  function reduced() {
    return (
      !settings.motion || matchMedia("(prefers-reduced-motion: reduce)").matches
    );
  }
  function animate(node, frames, options) {
    if (reduced()) {
      node.remove();
      return;
    }
    node
      .animate(frames, options)
      .finished.then(() => node.remove())
      .catch(() => node.remove());
  }
  function particles(x, y, color, count = 18) {
    if (reduced()) return;
    for (let i = 0; i < count; i++) {
      const n = document.createElement("i");
      n.className = "particle";
      n.style.cssText = `left:${x}px;top:${y}px;background:${color}`;
      $("effects").append(n);
      const a = Math.random() * Math.PI * 2,
        d = 25 + Math.random() * 110;
      animate(
        n,
        [
          { transform: "translate(0,0) rotate(0)", opacity: 1 },
          {
            transform: `translate(${Math.cos(a) * d}px,${Math.sin(a) * d + 40}px) rotate(${Math.random() * 360}deg)`,
            opacity: 0,
          },
        ],
        {
          duration: 450 + Math.random() * 450,
          easing: "cubic-bezier(.1,.6,.2,1)",
        },
      );
    }
  }
  function flash(id) {
    const n = $(id);
    n.classList.remove("flash");
    void n.offsetWidth;
    n.classList.add("flash");
  }
  function attackEffect(e) {
    if (game.practice) {
      const r = $("player-well").getBoundingClientRect();
      particles(r.x + r.width / 2, r.y + r.height * 0.55, colors[0], 24);
      flash("player-well");
      sound(180, 0.25);
      $("event-label").textContent =
        `${e.power} POWER RELEASED${e.blocked ? " / " + e.blocked + " BLOCKED" : ""}`;
      return;
    }
    const from = $(
        e.side === "player" ? "player-well" : "cpu-well",
      ).getBoundingClientRect(),
      to = $(
        e.side === "player" ? "cpu-well" : "player-well",
      ).getBoundingClientRect();
    const sx = from.x + from.width * ((e.columns?.[0] ?? 2) + .5) / 5,
      sy = from.y + from.height * 0.55,
      tx = to.x + to.width * ((e.columns?.[0] ?? 2) + .5) / 5,
      ty = to.y + to.height * 0.6,
      color = e.side === "player" ? colors[0] : colors[6];
    particles(sx, sy, color, 24);
    if (!reduced()) {
      const n = document.createElement("div");
      n.className = "attack-beam";
      const distance = Math.hypot(tx - sx, ty - sy),
        angle = Math.atan2(ty - sy, tx - sx);
      n.style.cssText = `left:${sx}px;top:${sy}px;width:${distance}px;background:${color};transform:rotate(${angle}rad)`;
      $("effects").append(n);
      animate(
        n,
        [
          { opacity: 0, scale: "0 1" },
          { opacity: 1, scale: "1 1", offset: 0.35 },
          { opacity: 0, scale: "1 0" },
        ],
        { duration: 650, easing: "ease-out" },
      );
      const ring = document.createElement("i");
      ring.className = "impact-ring";
      ring.style.cssText = `left:${tx - 35}px;top:${ty - 35}px;border-color:${color}`;
      $("effects").append(ring);
      animate(
        ring,
        [
          { transform: "scale(.2)", opacity: 1 },
          { transform: "scale(3)", opacity: 0 },
        ],
        { duration: 700 },
      );
    }
    particles(tx, ty, color, 28);
    flash(e.side === "player" ? "cpu-well" : "player-well");
    sound(e.side === "player" ? 180 : 90, 0.25);
    $("event-label").textContent =
      e.side === "player"
        ? `${e.sent} SENT · COLUMN ${[...new Set(e.columns)].map(c=>c+1).join(", ")}`
        : `INCOMING +${e.sent}`;
  }
  function events() {
    for (const e of game.events.splice(0)) {
      if (e.type === "attack") attackEffect(e);
      if (e.type === 'technique' && e.side === 'player') {
        const detail = `${e.name} +${e.bonus} · HEIGHT ${e.height} · ×${e.multiplier}`;
        $("event-label").textContent = detail;
        $("reward-feedback").textContent = detail;
        $("reward-feedback").dataset.reward = e.id;
        $("combo-toast").textContent = e.name.toUpperCase();
        const r = $("player-well").getBoundingClientRect();
        particles(r.x + r.width * ((e.column ?? 2) + .5) / 5, r.bottom - 40, colors[e.column ?? 0], 30);
        sound(620, .22);
        if (!reduced()) $("reward-feedback").animate([{opacity:.3,transform:'translateY(8px)'},{opacity:1,transform:'translateY(0)'}],{duration:500,easing:'ease-out'});
        clearTimeout(toastTimer);
        toastTimer = setTimeout(() => { $("combo-toast").textContent = ''; }, 1800);
      }
      if (e.type === "combo") {
        sound(350 + e.value * 20);
        $("combo").classList.remove("combo-pop");
        void $("combo").offsetWidth;
        $("combo").classList.add("combo-pop");
        if (e.value % 5 === 0) {
          clearTimeout(toastTimer);
          $("combo-toast").textContent =
            e.value >= 20
              ? "UNSTOPPABLE"
              : e.value >= 10
                ? "ON FIRE"
                : "FLOW STATE";
          if (!reduced())
            $("combo-toast").animate(
              [
                { opacity: 0, transform: "translateY(15px) scale(.8)" },
                {
                  opacity: 1,
                  transform: "translateY(0) scale(1)",
                  offset: 0.2,
                },
                { opacity: 0, transform: "translateY(-20px) scale(1.05)" },
              ],
              { duration: 1200, fill: "forwards" },
            );
          toastTimer = setTimeout(
            () => ($("combo-toast").textContent = ""),
            1250,
          );
        }
      }
      if (e.type === "clear") {
        const r = $(e.side + "-well").getBoundingClientRect();
        particles(
          r.x + r.width / 2,
          r.bottom - 35,
          e.side === "player" ? colors[0] : colors[1],
          25,
        );
      }
      if (e.type === "mistake") {
        $("typing").parentElement.classList.remove("mistake");
        void $("typing").offsetWidth;
        $("typing").parentElement.classList.add("mistake");
        sound(90, 0.12);
        $("event-label").textContent = "Typo. Combo reset; banked tiles kept.";
      }
      if (e.type === "fullclear") { flash(e.side + "-well"); sound(880,.4); }
      if (e.type === "end") finish();
    }
  }
  function board(id, b) {
    const root = $(id),
      positions = new Map([...$(id).querySelectorAll('[data-word]')]
        .filter(n => n.dataset.word)
        .map(n => [n.dataset.word, n.getBoundingClientRect().top])),
      frag = document.createDocumentFragment();
    for (let i = 0; i < Math.min(b.words.length, 40); i += 5) {
      const row = document.createElement("div");
      row.className = "word-row";
      for (let j = i; j < Math.min(i + 5, b.words.length); j++) {
        const cell = document.createElement("span");
        cell.className =
          "word-cell" +
          (b.phase !== 'upstack' && b.words[j] && previousInput && b.words[j].startsWith(previousInput) ? " active" : "") +
          (!b.words[j] ? " empty" : "") +
          (j >= 20 ? " garbage" : "");
        cell.style.setProperty(
          "--tile",
          colors[j % 5],
        );
        cell.dataset.word = b.words[j] || "";
        cell.dataset.slot = j;

        if (id === "player-stack" && b.phase !== "upstack" && b.words[j] && b.words[j].startsWith(previousInput) && previousInput) {
          const typed = document.createElement("span");
          typed.className = "typed";
          typed.textContent = previousInput;
          cell.append(
            typed,
            document.createTextNode(b.words[j].slice(previousInput.length)),
          );
        } else cell.textContent = b.words[j] || "";
        row.append(cell);
      }
      frag.append(row);
    }
    root.replaceChildren(frag);
    if (!reduced()) {
      const falls = [...root.querySelectorAll('[data-word]')].map(node => ({
        node, delta: positions.has(node.dataset.word)
          ? positions.get(node.dataset.word) - node.getBoundingClientRect().top : 0,
      }));
      for (const {node, delta} of falls) if (Math.abs(delta) > .5) {
        node.animate([{transform:`translateY(${delta}px)`},{transform:'translateY(0)'}],
          {duration:320,easing:'cubic-bezier(.4,0,.85,.6)'});
      }
    }
  }
  function stats() {
    $("score").textContent = String(game.score).padStart(6, "0");
    $("wpm").textContent = game.wpm;
    $("accuracy").textContent = game.accuracy + "%";
    $("lines").textContent = game.player.lines;
    $("combo").textContent = game.player.combo;
    const c = game.player.combo;
    $("multiplier").textContent =
      `×${Typetris.comboMultiplier(game.player.combo)} BONUS`;
    $("attack-power").textContent = game.player.pending.length + " READY";
    $("cpu-speed").textContent = game.practice ? "—" : game.cpuWpm + " WPM";
    $("cpu-threat").textContent = game.practice ? "NO INCOMING ATTACKS" : "SAME COLUMN RULES";
    $("banked-bonus").textContent = game.player.pending.length;
    $("stack-height").textContent = Math.max(...Array.from({length:5},(_,c)=>game.player.words.filter((w,i)=>w&&i%5===c).length));
    $("charge").style.width = Math.min(100, (c / 20) * 100) + "%";
    $("time").textContent =
      Math.floor(game.elapsed / 60) +
      ":" +
      String(Math.floor(game.elapsed % 60)).padStart(2, "0");
    $("player-height").textContent =
      game.player.words.filter(Boolean).length + " WORDS LEFT";
    $("cpu-height").textContent = game.practice
      ? "∞"
      : game.cpu.words.filter(Boolean).length + " WORDS LEFT";
  }
  function render() {
    saveBest();
    board("player-stack", game.player);
    if (!game.practice) board("cpu-stack", game.cpu);
    stats();
    events();
    renderSetup();
    renderGhosts();
  }
  function renderGhosts() {
    const b = game.player, up = b.phase === 'upstack';
    $("arena").classList.toggle('upstack-mode', up);
    $("ghost-bank").hidden = !up;
    $("ghost-silhouette").hidden = !up;
    $("typing").setAttribute('aria-label', up ? 'Type a matching ghost bank word' : 'Type any word on your board');
    $("typing").placeholder = up ? 'match a vowel in the left bank...' : 'type any word on your board...';
    document.querySelector('.route-hint').textContent = up ? 'Two matching words → one tile · restore four tiles per column' : 'Any word · Space to clear · completed columns send automatically';
    if (!up) return;
    const columns = document.createDocumentFragment();
    for (const ghost of b.ghosts) {
      const section = document.createElement('section'); section.className = 'ghost-column';
      section.style.setProperty('--tile', colors[ghost.column]);
      const title = document.createElement('h3'); title.textContent = ghost.vowel.toUpperCase();
      title.setAttribute('aria-label', `Column ${ghost.column+1}: vowel ${ghost.vowel}`);
      const count = document.createElement('small'); count.textContent = `${b.restored?.[ghost.column] || 0} / 4 tiles`;
      section.append(title,count);
      // Sort all choices alike: the model's solution/decoy ordering is not a hint.
      for (const word of [...ghost.words].sort()) {
        const n = document.createElement('span'); n.className = 'ghost-word'; n.dataset.word = word; n.textContent = word;
        const used = word.includes(ghost.vowel) && !ghost.remaining.includes(word);
        n.classList.toggle('used', used);
        n.classList.toggle('active', !used && !!previousInput && word.startsWith(previousInput));
        section.append(n);
      }
      const progress = document.createElement('small'); progress.textContent = ghost.words.length ? `${2-ghost.remaining.length} / 2 words` : 'RESTORED'; section.append(progress);
      columns.append(section);
    }
    $("ghost-columns").replaceChildren(columns);
    $("ghost-progress").textContent = `${(b.restored || []).reduce((a,v)=>a+v,0)} / 20 tiles restored`;
    const silhouette = document.createDocumentFragment();
    for (let row=0;row<4;row++) {
      const line=document.createElement('div'); line.className='word-row';
      for(let col=0;col<5;col++) { const n=document.createElement('i'); n.className='word-cell'+(b.words[row*5+col]?' filled':''); line.append(n); }
      silhouette.append(line);
    }
    $("ghost-silhouette").replaceChildren(silhouette);
  }
  function renderSetup() {
    const up = game.player.phase === 'upstack';
    $("setup-state").textContent = up ? 'UPSTACK' : 'DOWNSTACK';
    $("setup-name").textContent = up ? 'Match the column vowel to rebuild' : 'Clear columns. Level the whole stack.';
    $("route-preview").textContent = up ? 'Two matching words build one tile. Ignore decoys.' : 'Any board word · Space to clear · Enter to send early';
  }
  function bonusRules() {
    return 'Column base = ceil(peak column height / 2). Level base = 2; restored-column base = 2; Full clear and Rebuild base = 8. Multiply the base by the combo multiplier: 1× at combo 0–4, 2× at 5–9, 3× at 10+ (capped). Live feedback shows actual height, multiplier and bonus.';
  }
  function playbook() {
    const rewards = [
      ['column','Column clear','Empty a column while downstacking, or restore a column while upstacking. Its bonus stays in that column.'],
      ['level','Level','Bring all five columns to the same nonzero height after an uneven stack. This earns a level bonus.'],
      ['fullclear','Full clear','Clear every board word. Earn a bonus and enter upstack: the round continues.'],
      ['rebuild','Rebuild','Restore all five columns to the starting height. Earn a bonus and return to downstack.']
    ];
    showDialog('Gravity playbook', `<p>Downstack → full clear → upstack → rebuild. Repeat until a board tops out.</p><div class="reward-library">${rewards.map(([id,name,description]) => `<article class="reward-card" data-reward="${id}"><h3>${name}</h3><div class="reward-diagram ${id}" aria-hidden="true">${Array.from({length:20},(_,i)=>`<i style="--tile:${colors[i%5]}"></i>`).join('')}</div><p>${description}</p></article>`).join('')}</div><div class="guide-step"><b>↓</b><div><h3>Downstack</h3><p>Type any word on your board and Space. Words above it fall down. Every clear banks a tile in its original column; an empty column sends automatically. Enter sends banked tiles early, never the word in your input. Column and level rewards are based on board state, not a memorized route.</p></div></div><div class="guide-step"><b>↑</b><div><h3>Upstack</h3><p>The left word bank has five vowel-labelled columns. Find the two words that contain each column’s vowel and type each with Space to build one tile. Decoys do not count. The bank refreshes after each tile. Board words cannot be cleared during upstack. Restore every column to return to downstack.</p></div></div><p>Incoming attacks still land in the same column in either phase. Eight tiles fit; a ninth causes topout. Full clears and rebuilds do not end a match. Practice repeats the same cycle without an opponent or incoming attacks. The CPU follows the same rules at your live WPM +20.</p><p id="bonus-formula">${bonusRules()}</p><button class="action" data-command="practice">TRY IN PRACTICE</button><button class="action secondary" data-command="play">CPU BATTLE</button>`, 'playbook');
  }
  function start(practice = false) {
    saveBest();
    hideDialog();
    game = new Typetris.Match({ practice });
    screen = "game";
    started = false;
    previousInput = "";
    $("typing").value = "";
    $("menu").hidden = true;
    $("arena").hidden = false;
    $("arena").classList.toggle("practice-mode", practice);
    $("mode-label").textContent = practice
      ? "SOLO / PRACTICE"
      : "SOLO / CPU BATTLE";
    $("opponent-name").textContent = practice ? "FREE PLAY" : "CPU";
    $("cpu-description").textContent = practice
      ? "NO CPU · NO INCOMING ATTACKS"
      : "YOUR WPM + 20";
    $("cpu-stack").replaceChildren();
    $("event-label").textContent = "Type any word. Clear columns to send them.";
    $("combo-toast").textContent = "";
    $("reward-feedback").textContent = "";
    $("footer-hint").textContent = "ESC TO PAUSE";
    render();
    last = performance.now();
    $("typing").focus();
  }
  function menu() {
    saveBest();
    hideDialog();
    screen = "menu";
    game = null;
    started = false;
    $("arena").hidden = true;
    $("menu").hidden = false;
    $("command").value = "";
    $("command").focus();
    $("footer-hint").textContent = "KEYBOARD FIRST. ALWAYS.";
    apply();
  }
  function showDialog(title, content, kind) {
    $("effects").replaceChildren();
    lastFocus = document.activeElement;
    dialog = kind;
    $("overlay-title").textContent = title;
    $("overlay-content").innerHTML = content;
    $("overlay").hidden = false;
    const first = $("overlay-content").querySelector("button");
    (kind === "playbook" ? $("close-overlay") : first || $("close-overlay")).focus({preventScroll:true});
    $("overlay").querySelector('.dialog').scrollTop = 0;
  }
  function hideDialog() {
    dialog = "";
    $("overlay").hidden = true;
    lastFocus?.focus();
  }
  function guide() {
    showDialog(
      "How to play",
      `<div class="guide-step"><b>↓</b><div><h3>Downstack: clear any board word</h3><p>Type a word on YOUR board and Space. Prefixes highlight targets; Space locks the exact word. Gravity drops words within their columns. Each word banks one attack tile. Empty columns send automatically; Enter sends early without submitting your input. Column clears and equalizing all five column heights earn bonuses.</p></div></div><div class="guide-step"><b>↑</b><div><h3>Full clear begins upstack</h3><p>A full clear earns a bonus, not a victory. The left bank shows five columns and their required vowels. Type the two words containing each vowel, with Space after each, to build one tile. Ignore decoys. New choices arrive after each tile. Board words are not targets during upstack. Complete every column to earn Rebuild and return to downstack.</p></div></div><div class="guide-step"><b>↵</b><div><h3>Keep cycling. Avoid topout.</h3><p>Incoming tiles land in the same column in either phase. Eight tiles fit in a column; a ninth causes topout. Practice cycles without incoming attacks. The CPU uses your live WPM +20 and follows the same rules. Typos reset your combo, never your banked tiles.</p></div></div><div class="guide-step"><b>ESC</b><div><h3>Stay at the keyboard</h3><p>Escape pauses or resumes. Menu navigation uses hjkl; Enter selects and i returns to typing. In-game Alt + hjkl navigates controls. The playbook explains all four conceptual rewards.</p></div></div><button class="action" data-command="play">PLAY NOW</button>`,
      "guide",
    );
  }
  function settingsDialog() {
    showDialog(
      "Settings",
      `<div class="setting"><span>Arcade sound</span><button id="audio-setting">${settings.sound ? "ON" : "OFF"}</button></div><div class="setting"><span>Animated effects</span><button id="motion-setting">${settings.motion ? "ON" : "OFF"}</button></div><p style="margin-top:22px">The CPU tracks your live WPM +20, with character-based timing. The clock starts on your first keystroke.<br>Your settings and personal best stay on this device. System reduced-motion preference is always respected.</p>`,
      "settings",
    );
    $("audio-setting").onclick = (e) => {
      settings.sound = !settings.sound;
      e.target.textContent = settings.sound ? "ON" : "OFF";
      apply();
      save();
      sound();
    };
    $("motion-setting").onclick = (e) => {
      settings.motion = !settings.motion;
      e.target.textContent = settings.motion ? "ON" : "OFF";
      apply();
      save();
    };
  }
  function pause() {
    if (!game) return;
    if (game.status === "paused") {
      game.status = "playing";
      hideDialog();
      last = performance.now();
      $("typing").focus();
      return;
    }
    if (game.status !== "playing") return;
    game.status = "paused";
    showDialog(
      "Paused",
      `<p>Your stack can wait.</p><button class="action" id="resume-btn">RESUME ↵</button><button class="action secondary" id="retry-btn">RESTART</button><button class="action secondary" id="menu-btn">Return to menu</button>`,
      "pause",
    );
    $("resume-btn").onclick = pause;
    $("retry-btn").onclick = () => start(game.practice);
    $("menu-btn").onclick = menu;
  }
  function finish() {
    saveBest();
    const won = game.status === "won";
    showDialog(
      game.endReason === "fullclear" ? (won ? "FULL CLEAR!" : "CPU FULL CLEAR") : won ? "Stack conquered." : "Topped out.",
      `<p>${won ? "Clean typing. Heavy hits. Well played." : "One more run. Find your rhythm."}</p><div class="results"><div><span>SCORE</span><strong>${game.score.toLocaleString()}</strong></div><div><span>BEST COMBO</span><strong>${game.bestCombo}</strong></div><div><span>WPM</span><strong>${game.wpm}</strong></div><div><span>ACCURACY</span><strong>${game.accuracy}%</strong></div></div><button class="action" id="retry-btn">PLAY AGAIN ↵</button><button class="action secondary" id="menu-btn">Return to menu</button>`,
      "result",
    );
    $("retry-btn").onclick = () => start(game.practice);
    $("menu-btn").onclick = menu;
  }
  function command(value) {
    if (value === "play") start();
    else if (value === "practice") start(true);
    else if (value === "guide") guide();
    else if (value === "settings") settingsDialog();
    else if (value === "playbook") playbook();
    else
      $("command-hint").textContent = "Try play, practice, guide, settings, or playbook.";
  }
  document.addEventListener("click", (e) => {
    const b = e.target.closest("[data-command]");
    if (b) command(b.dataset.command);
  });
  $("command-form").onsubmit = (e) => {
    e.preventDefault();
    command($("command").value.trim().toLowerCase());
  };
  $("command").oninput = () => {
    const value = $("command").value.trim().toLowerCase();
    document
      .querySelectorAll("[data-command]")
      .forEach((b) =>
        b.classList.toggle(
          "selected",
          value.length > 0 && b.dataset.command.startsWith(value),
        ),
      );
    $("command-hint").textContent = "Type a word above, then press Enter.";
  };
  $("typing").addEventListener("input", (e) => {
    if (!game || game.status !== "playing" || e.isComposing) return;
    started = true;
    const v = $("typing").value;
    game.keystrokes += Math.max(0, v.length - previousInput.length);
    const result = game.submit(v);
    if (result === "complete") {
      previousInput = "";
      $("typing").value = "";
    } else if (result === "mistake") {
      game.mistake();
      previousInput = "";
      $("typing").value = "";
    } else previousInput = v;
    render();
  });
  $("typing").addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (game?.status === "playing") {
        game.attack();
        render();
      }
    }
  });
  $("typing").addEventListener("paste", (e) => e.preventDefault());
  $("attack-btn").onclick = () => {
    if (game?.status === "playing") {
      game.attack();
      render();
      $("typing").focus();
    }
  };
  $("pause-btn").onclick = pause;
  $("player-well").onclick = () => $("typing").focus();
  $("sound-toggle").onclick = () => {
    settings.sound = !settings.sound;
    apply();
    save();
    sound();
  };
  $("close-overlay").onclick = () => {
    if (dialog === "pause") pause();
    else if (dialog === "result") menu();
    else {
      hideDialog();
      $("command").focus();
    }
  };
  document.addEventListener("keydown", (e) => {
    if (e.isComposing || e.keyCode === 229) return;
    if (e.key === "Escape") {
      e.preventDefault();
      if (dialog === "pause") pause();
      else if (dialog === "result") menu();
      else if (dialog) {
        hideDialog();
        $("command").focus();
      } else if (screen === "game") pause();
      return;
    }
    if (dialog && e.key === "Tab") {
      const list = [...$("overlay").querySelectorAll("button,input,a")].filter(
        (n) => !n.disabled,
      );
      const first = list[0],
        end = list[list.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        end.focus();
      } else if (!e.shiftKey && document.activeElement === end) {
        e.preventDefault();
        first.focus();
      }
    }
    if (
      screen === "menu" &&
      !dialog &&
      e.key.length === 1 &&
      !e.ctrlKey &&
      !e.metaKey &&
      !e.altKey &&
      document.activeElement !== $("command") &&
      !(
        e.key === " " &&
        e.target.closest(
          'button,input,select,textarea,a[href],[role="button"],[contenteditable]',
        )
      )
    ) {
      $("command").focus();
    }
  });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden && game?.status === "playing") pause();
  });
  setInterval(() => {
    const now = performance.now(),
      dt = Math.min((now - last) / 1000, 0.25);
    last = now;
    if (game?.status === "playing" && started) {
      const cpuState = JSON.stringify([game.cpu.phase, game.cpu.words, game.cpu.ghosts]);
      game.tick(dt);
      if (cpuState !== JSON.stringify([game.cpu.phase, game.cpu.words, game.cpu.ghosts]) || game.events.length) render();
      else stats();
    }
  }, 100);
  apply();
  $("command").focus();
})();
