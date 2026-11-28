'use strict';
(() => {
  const SVG_NS = 'http://www.w3.org/2000/svg';
  const MATH_NS = 'http://www.w3.org/1998/Math/MathML';
  const MAX_CHART_SERIES = 6;
  const MAX_CHART_POINTS = 24;
  const MAX_MATH_DEPTH = 24;
  const PALETTE = ['var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)', 'var(--chart-4)', 'var(--chart-5)', 'var(--chart-6)'];
  const ALLOWED_SVG_TAGS = new Set([
    'svg', 'g', 'path', 'line', 'rect', 'circle', 'ellipse',
    'polygon', 'polyline', 'text', 'tspan', 'defs', 'marker',
    'title', 'desc', 'lineargradient', 'radialgradient', 'stop',
  ]);
  const ALLOWED_SVG_ATTRS = new Set([
    'viewbox', 'width', 'height', 'x', 'y', 'x1', 'y1', 'x2', 'y2',
    'cx', 'cy', 'r', 'rx', 'ry', 'd', 'points', 'fill', 'fill-opacity',
    'stroke', 'stroke-width', 'stroke-dasharray', 'stroke-linecap',
    'stroke-linejoin', 'opacity', 'transform', 'text-anchor',
    'dominant-baseline', 'font-size', 'font-weight', 'font-family',
    'id', 'marker-end', 'marker-start', 'markerwidth', 'markerheight',
    'refx', 'refy', 'orient', 'offset', 'stop-color', 'stop-opacity',
    'preserveaspectratio', 'role', 'aria-label', 'dx', 'dy',
  ]);

  function svgEl(tag, attrs = {}, text = '') {
    const el = document.createElementNS(SVG_NS, tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (v !== undefined && v !== null) el.setAttribute(k, String(v));
    }
    if (text) el.textContent = text;
    return el;
  }

  function mathEl(tag, attrs = {}, text = '') {
    const el = document.createElementNS(MATH_NS, tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (v !== undefined && v !== null) el.setAttribute(k, String(v));
    }
    if (text) el.textContent = text;
    return el;
  }

  function wrapMrow(nodes) {
    if (!nodes || nodes.length === 0) return mathEl('mrow');
    if (nodes.length === 1) return nodes[0];
    const row = mathEl('mrow');
    nodes.forEach(n => row.append(n));
    return row;
  }

  const GREEK_MAP = {
    alpha: 'α', beta: 'β', gamma: 'γ', delta: 'δ', epsilon: 'ϵ', varepsilon: 'ε',
    zeta: 'ζ', eta: 'η', theta: 'θ', vartheta: 'ϑ', iota: 'ι', kappa: 'κ',
    lambda: 'λ', mu: 'μ', nu: 'ν', xi: 'ξ', pi: 'π', varpi: 'ϖ',
    rho: 'ρ', varrho: 'ϱ', sigma: 'σ', varsigma: 'ς', tau: 'τ', upsilon: 'υ',
    phi: 'ϕ', varphi: 'φ', chi: 'χ', psi: 'ψ', omega: 'ω',
    Gamma: 'Γ', Delta: 'Δ', Theta: 'Θ', Lambda: 'Λ', Xi: 'Ξ', Pi: 'Π',
    Sigma: 'Σ', Upsilon: 'Υ', Phi: 'Φ', Psi: 'Ψ', Omega: 'Ω',
    infty: '∞', partial: '∂', nabla: '∇', hbar: 'ℏ', ell: 'ℓ',
    emptyset: '∅', varnothing: '∅', aleph: 'ℵ',
  };

  const OP_MAP = {
    times: '×', cdot: '·', div: '÷', pm: '±', mp: '∓', ast: '∗', star: '⋆',
    circ: '∘', bullet: '•', oplus: '⊕', otimes: '⊗',
    leq: '≤', le: '≤', geq: '≥', ge: '≥', neq: '≠', ne: '≠',
    approx: '≈', equiv: '≡', sim: '∼', simeq: '≃', cong: '≅', propto: '∝',
    ll: '≪', gg: '≫', subset: '⊂', subseteq: '⊆', supset: '⊃', supseteq: '⊇',
    in: '∈', notin: '∉', ni: '∋', cup: '∪', cap: '∩', setminus: '∖',
    forall: '∀', exists: '∃', neg: '¬', lnot: '¬', land: '∧', lor: '∨',
    to: '→', rightarrow: '→', leftarrow: '←', leftrightarrow: '↔',
    Rightarrow: '⇒', Leftarrow: '⇐', Leftrightarrow: '⇔', mapsto: '↦',
    uparrow: '↑', downarrow: '↓',
    dots: '…', ldots: '…', cdots: '⋯', vdots: '⋮', ddots: '⋱',
    prime: '′', angle: '∠', perp: '⊥', parallel: '∥', therefore: '∴', because: '∵',
    degree: '°', mid: '∣',
  };

  const BIG_OPS = {
    sum: '∑', prod: '∏', coprod: '∐',
    int: '∫', iint: '∬', iiint: '∭', oint: '∮',
    bigcup: '⋃', bigcap: '⋂', bigvee: '⋁', bigwedge: '⋀', bigoplus: '⨁',
  };

  const FUNC_NAMES = new Set([
    'sin', 'cos', 'tan', 'sec', 'csc', 'cot', 'arcsin', 'arccos', 'arctan',
    'sinh', 'cosh', 'tanh', 'log', 'ln', 'lg', 'exp', 'lim', 'limsup', 'liminf',
    'max', 'min', 'sup', 'inf', 'arg', 'det', 'dim', 'gcd', 'deg', 'mod', 'bmod',
  ]);

  const ACCENT_MAP = {
    vec: '→', hat: '^', bar: '¯', overline: '¯', tilde: '~', widetilde: '˜',
    widehat: '^', dot: '˙', ddot: '¨',
  };

  const BB_MAP = { R: 'ℝ', N: 'ℕ', Z: 'ℤ', Q: 'ℚ', C: 'ℂ', E: '𝔼', P: 'ℙ' };

  function parseLatexToMathML(source, displayMode = false) {
    const src = String(source || '').trim();
    const root = mathEl('math', { xmlns: MATH_NS, ...(displayMode ? { display: 'block' } : {}) });
    if (!src) return root;

    let pos = 0;

    function skipSpace() {
      while (pos < src.length && /\s/.test(src[pos])) pos++;
    }

    function readRawBraced() {
      skipSpace();
      if (src[pos] !== '{') return null;
      pos++;
      let depth = 1;
      let out = '';
      while (pos < src.length && depth > 0) {
        const ch = src[pos++];
        if (ch === '{') { depth++; out += ch; }
        else if (ch === '}') {
          depth--;
          if (depth > 0) out += ch;
        } else if (ch === '\\' && pos < src.length && (src[pos] === '{' || src[pos] === '}' || src[pos] === '\\')) {
          out += ch + src[pos++];
        } else {
          out += ch;
        }
      }
      return out;
    }

    function readDelimToken() {
      skipSpace();
      if (pos >= src.length) return '';
      if (src[pos] === '\\') {
        const rest = src.slice(pos);
        const cm = rest.match(/^\\([a-zA-Z]+|.)/);
        if (cm) {
          pos += cm[0].length;
          if (cm[1] === '{') return '{';
          if (cm[1] === '}') return '}';
          if (cm[1] === '|' || cm[1] === 'Vert') return '‖';
          if (cm[1] === 'langle') return '⟨';
          if (cm[1] === 'rangle') return '⟩';
          if (cm[1] === 'lfloor') return '⌊';
          if (cm[1] === 'rfloor') return '⌋';
          if (cm[1] === 'lceil') return '⌈';
          if (cm[1] === 'rceil') return '⌉';
          return OP_MAP[cm[1]] || cm[1];
        }
      }
      const ch = src[pos++];
      return ch === '.' ? '' : ch;
    }

    function readTextVariant(raw, variant) {
      const clean = String(raw || '').replace(/\\([%${}_&])/g, '$1').trim();
      if (!variant) return mathEl('mtext', {}, clean || '\u00a0');
      if (variant === 'double-struck') {
        const mapped = clean.split('').map(c => BB_MAP[c] || c).join('');
        return mathEl('mi', { mathvariant: 'double-struck' }, mapped);
      }
      return mathEl('mi', { mathvariant: variant }, clean);
    }

    function parseMatrixBody(body, envName) {
      const rowStrs = [];
      let cur = '', braceDepth = 0;
      for (let i = 0; i < body.length; i++) {
        const ch = body[i];
        if (ch === '{') braceDepth++;
        else if (ch === '}' && braceDepth > 0) braceDepth--;
        if (braceDepth === 0 && ch === '\\' && body[i + 1] === '\\') {
          rowStrs.push(cur);
          cur = '';
          i++;
          continue;
        }
        cur += ch;
      }
      if (cur.trim()) rowStrs.push(cur);

      const table = mathEl('mtable');
      if (envName === 'cases') table.setAttribute('columnalign', 'left left');
      for (const rStr of rowStrs) {
        const cells = [];
        let cBuf = '', cDepth = 0;
        for (let i = 0; i < rStr.length; i++) {
          const ch = rStr[i];
          if (ch === '{') cDepth++;
          else if (ch === '}' && cDepth > 0) cDepth--;
          if (cDepth === 0 && ch === '&') {
            cells.push(cBuf.trim());
            cBuf = '';
            continue;
          }
          cBuf += ch;
        }
        cells.push(cBuf.trim());
        const mtr = mathEl('mtr');
        for (const cell of cells) {
          const mtd = mathEl('mtd');
          const sub = parseLatexFragment(cell, 1);
          sub.forEach(n => mtd.append(n));
          mtr.append(mtd);
        }
        table.append(mtr);
      }
      const fences = {
        pmatrix: ['(', ')'],
        bmatrix: ['[', ']'],
        Bmatrix: ['{', '}'],
        vmatrix: ['|', '|'],
        Vmatrix: ['‖', '‖'],
        cases: ['{', ''],
      };
      const pair = fences[envName];
      if (!pair) return table;
      const row = mathEl('mrow');
      if (pair[0]) row.append(mathEl('mo', { stretchy: 'true' }, pair[0]));
      row.append(table);
      if (pair[1]) row.append(mathEl('mo', { stretchy: 'true' }, pair[1]));
      return row;
    }

    function parseAtom(depth) {
      skipSpace();
      if (pos >= src.length || depth > MAX_MATH_DEPTH) return null;
      const ch = src[pos];

      if (ch === '}') return null;
      if (ch === '{') {
        pos++;
        const inner = parseSequence(depth + 1, () => src[pos] === '}');
        if (src[pos] === '}') pos++;
        return wrapMrow(inner);
      }

      if (ch === '\\') {
        const after = src.slice(pos + 1);
        const envStart = after.match(/^begin\{([a-zA-Z*]+)\}/);
        if (envStart) {
          const envName = envStart[1];
          const endTag = `\\end{${envName}}`;
          const bodyStart = pos + 1 + envStart[0].length;
          const endIdx = src.indexOf(endTag, bodyStart);
          if (endIdx !== -1) {
            const body = src.slice(bodyStart, endIdx);
            pos = endIdx + endTag.length;
            return parseMatrixBody(body, envName.replace(/\*$/, ''));
          }
        }

        const cmdMatch = src.slice(pos).match(/^\\([a-zA-Z]+|[^a-zA-Z\s])/);
        if (!cmdMatch) { pos++; return mathEl('mo', {}, '\\'); }
        const cmd = cmdMatch[1];
        pos += cmdMatch[0].length;

        if (cmd === 'left') {
          const openSym = readDelimToken();
          const inner = parseSequence(depth + 1, () => src.slice(pos).trimStart().startsWith('\\right'));
          let closeSym = '';
          skipSpace();
          if (src.slice(pos).startsWith('\\right')) {
            pos += 6;
            closeSym = readDelimToken();
          }
          const row = mathEl('mrow');
          if (openSym) row.append(mathEl('mo', { stretchy: 'true' }, openSym));
          inner.forEach(n => row.append(n));
          if (closeSym) row.append(mathEl('mo', { stretchy: 'true' }, closeSym));
          return row;
        }
        if (cmd === 'right') return null;

        if (cmd === 'frac' || cmd === 'dfrac' || cmd === 'tfrac') {
          const num = parseArg(depth + 1);
          const den = parseArg(depth + 1);
          const mfrac = mathEl('mfrac');
          mfrac.append(num, den);
          return mfrac;
        }
        if (cmd === 'binom') {
          const top = parseArg(depth + 1);
          const bot = parseArg(depth + 1);
          const mfrac = mathEl('mfrac', { linethickness: '0' });
          mfrac.append(top, bot);
          return wrapMrow([mathEl('mo', { stretchy: 'true' }, '('), mfrac, mathEl('mo', { stretchy: 'true' }, ')')]);
        }
        if (cmd === 'sqrt') {
          skipSpace();
          let indexNode = null;
          if (src[pos] === '[') {
            pos++;
            const idxSeq = parseSequence(depth + 1, () => src[pos] === ']');
            if (src[pos] === ']') pos++;
            indexNode = wrapMrow(idxSeq);
          }
          const baseNode = parseArg(depth + 1);
          if (indexNode) {
            const mroot = mathEl('mroot');
            mroot.append(baseNode, indexNode);
            return mroot;
          }
          const msqrt = mathEl('msqrt');
          msqrt.append(baseNode);
          return msqrt;
        }
        if (cmd === 'text' || cmd === 'textrm' || cmd === 'mbox' || cmd === 'textbf' || cmd === 'textit') {
          const raw = readRawBraced();
          return mathEl('mtext', {}, raw !== null ? raw : '');
        }
        if (cmd === 'mathrm' || cmd === 'operatorname' || cmd === 'rm') {
          const raw = readRawBraced();
          return readTextVariant(raw !== null ? raw : '', 'normal');
        }
        if (cmd === 'mathbf' || cmd === 'boldsymbol' || cmd === 'bf') {
          const raw = readRawBraced();
          return readTextVariant(raw !== null ? raw : '', 'bold');
        }
        if (cmd === 'mathbb') {
          const raw = readRawBraced();
          return readTextVariant(raw !== null ? raw : '', 'double-struck');
        }
        if (cmd === 'underline') {
          const base = parseArg(depth + 1);
          const munder = mathEl('munder', { accentunder: 'true' });
          munder.append(base, mathEl('mo', { stretchy: 'true' }, '_'));
          return munder;
        }
        if (ACCENT_MAP[cmd]) {
          const base = parseArg(depth + 1);
          const mover = mathEl('mover', { accent: 'true' });
          mover.append(base, mathEl('mo', { stretchy: cmd.length > 3 ? 'true' : 'false' }, ACCENT_MAP[cmd]));
          return mover;
        }
        if (cmd === ',' || cmd === ':' || cmd === ';' || cmd === ' ') return mathEl('mspace', { width: '0.18em' });
        if (cmd === '!') return mathEl('mspace', { width: '-0.16em' });
        if (cmd === 'quad') return mathEl('mspace', { width: '1em' });
        if (cmd === 'qquad') return mathEl('mspace', { width: '2em' });
        if (cmd === '{' || cmd === '}' || cmd === '%' || cmd === '$' || cmd === '&' || cmd === '_') return mathEl('mo', {}, cmd);
        if (cmd === '|' || cmd === 'Vert') return mathEl('mo', {}, '‖');
        if (cmd === '\\') return mathEl('mspace', { linebreak: 'newline' });
        if (GREEK_MAP[cmd]) return mathEl('mi', {}, GREEK_MAP[cmd]);
        if (BIG_OPS[cmd]) {
          const op = mathEl('mo', { largeop: 'true', movablelimits: cmd.includes('int') ? 'false' : 'true' }, BIG_OPS[cmd]);
          op.dataset.bigOp = cmd.includes('int') ? 'int' : 'sum';
          return op;
        }
        if (OP_MAP[cmd]) return mathEl('mo', {}, OP_MAP[cmd]);
        if (FUNC_NAMES.has(cmd)) return mathEl('mi', { mathvariant: 'normal' }, cmd);
        return mathEl('mi', { mathvariant: 'normal' }, cmd);
      }

      if (/[0-9]/.test(ch) || (ch === '.' && /[0-9]/.test(src[pos + 1] || ''))) {
        const nm = src.slice(pos).match(/^[0-9]+(?:\.[0-9]+)?/);
        pos += nm[0].length;
        return mathEl('mn', {}, nm[0]);
      }

      if (/[a-zA-Z]/.test(ch)) {
        pos++;
        return mathEl('mi', {}, ch);
      }

      pos++;
      const pretty = ch === '-' ? '−' : ch === "'" ? '′' : ch;
      return mathEl('mo', {}, pretty);
    }

    function parseArg(depth) {
      const atom = parseAtom(depth);
      return atom || mathEl('mrow');
    }

    function parseWithScripts(depth) {
      const base = parseAtom(depth);
      if (!base) return null;
      let sub = null, sup = null;
      while (pos < src.length) {
        skipSpace();
        const op = src[pos];
        if (op === '_' && !sub) {
          pos++;
          sub = parseArg(depth + 1);
        } else if (op === '^' && !sup) {
          pos++;
          sup = parseArg(depth + 1);
        } else {
          break;
        }
      }
      if (!sub && !sup) return base;
      const useOverUnder = displayMode && base.dataset && base.dataset.bigOp === 'sum';
      if (sub && sup) {
        const el = mathEl(useOverUnder ? 'munderover' : 'msubsup');
        el.append(base, sub, sup);
        return el;
      }
      if (sub) {
        const el = mathEl(useOverUnder ? 'munder' : 'msub');
        el.append(base, sub);
        return el;
      }
      const el = mathEl(useOverUnder ? 'mover' : 'msup');
      el.append(base, sup);
      return el;
    }

    function parseSequence(depth, stopPred) {
      const items = [];
      let safety = 0;
      while (pos < src.length && safety++ < 600) {
        skipSpace();
        if (pos >= src.length || (stopPred && stopPred())) break;
        const startPos = pos;
        const node = parseWithScripts(depth);
        if (node) {
          if (node.dataset && node.dataset.bigOp) delete node.dataset.bigOp;
          items.push(node);
        } else if (pos === startPos) {
          pos++;
        }
      }
      return items;
    }

    function parseLatexFragment(fragment, depth) {
      const savedSrc = src;
      void savedSrc;
      const inner = parseLatexToMathMLFragment(fragment, depth);
      return inner;
    }

    const seq = parseSequence(0, null);
    seq.forEach(n => root.append(n));
    return root;
  }

  function parseLatexToMathMLFragment(fragment, depth) {
    if (depth > MAX_MATH_DEPTH) return [document.createTextNode(String(fragment || ''))];
    const tmp = parseLatexToMathML(fragment, false);
    return [...tmp.childNodes];
  }

  function createMathBlockEl(tex) {
    const wrap = document.createElement('div');
    wrap.className = 'demo-math-block';
    wrap.append(parseLatexToMathML(tex, true));
    return wrap;
  }

  function createInlineMathEl(tex) {
    const span = document.createElement('span');
    span.className = 'demo-math';
    span.append(parseLatexToMathML(tex, false));
    return span;
  }

  function unquote(raw) {
    const t = String(raw || '').trim();
    if ((t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'"))) {
      return t.slice(1, -1).trim();
    }
    return t;
  }

  function wrapLines(text, maxChars = 24) {
    const words = String(text || '').replace(/\s+/g, ' ').trim().split(' ');
    if (!words.length || !words[0]) return [''];
    const out = [];
    let cur = '';
    for (const w of words) {
      if (!cur) cur = w;
      else if (cur.length + 1 + w.length <= maxChars) cur += ' ' + w;
      else { out.push(cur); cur = w; }
    }
    if (cur) out.push(cur);
    return out.slice(0, 4);
  }

  function parseNodeToken(rawToken) {
    const tok = String(rawToken || '').trim();
    if (!tok) return null;
    const patterns = [
      [/^([A-Za-z0-9_.-]+)\(\[([\s\S]+?)\]\)$/, 'stadium'],
      [/^([A-Za-z0-9_.-]+)\[\(([\s\S]+?)\)\]$/, 'rect'],
      [/^([A-Za-z0-9_.-]+)\(\(([\s\S]+?)\)\)$/, 'circle'],
      [/^([A-Za-z0-9_.-]+)\[\[([\s\S]+?)\]\]$/, 'rect'],
      [/^([A-Za-z0-9_.-]+)\[([\s\S]+?)\]$/, 'rect'],
      [/^([A-Za-z0-9_.-]+)\(([\s\S]+?)\)$/, 'round'],
      [/^([A-Za-z0-9_.-]+)\{([\s\S]+?)\}$/, 'diamond'],
      [/^([A-Za-z0-9_.-]+)$/, 'rect'],
    ];
    for (const [re, shape] of patterns) {
      const m = tok.match(re);
      if (m) return { id: m[1], ...(m[2] !== undefined ? { label: unquote(m[2]), shape } : {}) };
    }
    return null;
  }

  function splitTopLevelNodes(segment) {
    const out = [];
    let cur = '', depth = 0, quote = null;
    for (let i = 0; i < segment.length; i++) {
      const ch = segment[i];
      if (quote) { cur += ch; if (ch === quote && segment[i - 1] !== '\\') quote = null; continue; }
      if (ch === '"' || ch === "'") { quote = ch; cur += ch; continue; }
      if (ch === '[' || ch === '(' || ch === '{') depth += 1;
      else if ((ch === ']' || ch === ')' || ch === '}') && depth > 0) depth -= 1;
      if (ch === '&' && depth === 0) { if (cur.trim()) out.push(cur.trim()); cur = ''; continue; }
      cur += ch;
    }
    if (cur.trim()) out.push(cur.trim());
    return out;
  }

  function findNextEdgeOp(line, from) {
    let depth = 0, quote = null;
    for (let i = from; i < line.length; i++) {
      const ch = line[i];
      if (quote) { if (ch === quote && line[i - 1] !== '\\') quote = null; continue; }
      if (ch === '"' || ch === "'") { quote = ch; continue; }
      if (ch === '[' || ch === '(' || ch === '{') { depth += 1; continue; }
      if ((ch === ']' || ch === ')' || ch === '}') && depth > 0) { depth -= 1; continue; }
      if (depth > 0) continue;
      const rest = line.slice(i);
      const ld = rest.match(/^--\s+([^->]+?)\s+-->/);
      if (ld) return { start: i, end: i + ld[0].length, dashed: false, thick: false, arrow: true, label: unquote(ld[1]) };
      const ldt = rest.match(/^-\.\s+([^->]+?)\s+\.->/);
      if (ldt) return { start: i, end: i + ldt[0].length, dashed: true, thick: false, arrow: true, label: unquote(ldt[1]) };
      const lt = rest.match(/^==\s+([^=>]+?)\s+==>/);
      if (lt) return { start: i, end: i + lt[0].length, dashed: false, thick: true, arrow: true, label: unquote(lt[1]) };
      const pe = rest.match(/^(?:<-->|<==>|<-.->|-->|==>|-.->|---|\.-|===)\s*\|([^|]+)\|/);
      if (pe) return { start: i, end: i + pe[0].length, dashed: pe[0].includes('.'), thick: pe[0].includes('='), arrow: pe[0].includes('>'), label: unquote(pe[1]) };
      const pl = rest.match(/^(?:<-->|<==>|<-.->|-->|==>|-.->|---|===|-\.-)/);
      if (pl) return { start: i, end: i + pl[0].length, dashed: pl[0].includes('.'), thick: pl[0].includes('='), arrow: pl[0].includes('>') };
    }
    return null;
  }

  function buildFlowSvg(nodes, edges, subgraphs, direction) {
    const nodeMap = new Map(nodes.map(n => [n.id, n]));
    const adj = new Map(nodes.map(n => [n.id, []]));
    const inDeg = new Map(nodes.map(n => [n.id, 0]));
    const rank = new Map(nodes.map(n => [n.id, 0]));
    for (const e of edges) {
      if (nodeMap.has(e.from) && nodeMap.has(e.to) && e.from !== e.to) {
        adj.get(e.from).push(e.to);
        inDeg.set(e.to, inDeg.get(e.to) + 1);
      }
    }
    const q = nodes.filter(n => inDeg.get(n.id) === 0).map(n => n.id);
    const seen = new Map();
    for (let h = 0; h < q.length && h < nodes.length * 6; h++) {
      const u = q[h], ur = rank.get(u) || 0;
      for (const v of adj.get(u) || []) {
        const s = seen.get(v) || 0;
        if (s > nodes.length) continue;
        if ((rank.get(v) || 0) < ur + 1) rank.set(v, ur + 1);
        seen.set(v, s + 1);
        inDeg.set(v, inDeg.get(v) - 1);
        if (inDeg.get(v) <= 0 || s < 2) q.push(v);
      }
    }
    const maxRank = Math.max(0, ...rank.values());
    const layers = Array.from({ length: maxRank + 1 }, () => []);
    for (const n of nodes) layers[rank.get(n.id) || 0].push(n);

    const dims = new Map();
    for (const n of nodes) {
      const lines = wrapLines(n.label, n.shape === 'diamond' ? 18 : 26);
      const longest = lines.reduce((m, l) => Math.max(m, l.length), 1);
      let w = Math.max(104, Math.min(256, longest * 7.4 + 32));
      let h = Math.max(38, lines.length * 17 + 18);
      if (n.shape === 'diamond') { w = Math.max(w + 26, 124); h = Math.max(h + 18, 64); }
      else if (n.shape === 'circle') { const d = Math.max(w, h, 70); w = d; h = d; }
      dims.set(n.id, { w: Math.round(w), h: Math.round(h), lines });
    }

    const posMap = new Map();
    layers.forEach(l => l.forEach((n, idx) => posMap.set(n.id, idx)));
    for (let r = 1; r < layers.length; r++) {
      layers[r].sort((a, b) => {
        const pa = edges.filter(e => e.to === a.id).map(e => posMap.get(e.from) || 0);
        const pb = edges.filter(e => e.to === b.id).map(e => posMap.get(e.from) || 0);
        const aa = pa.length ? pa.reduce((x, y) => x + y, 0) / pa.length : 0;
        const ab = pb.length ? pb.reduce((x, y) => x + y, 0) / pb.length : 0;
        return aa - ab;
      });
      layers[r].forEach((n, idx) => posMap.set(n.id, idx));
    }

    const horiz = direction === 'LR' || direction === 'RL';
    const rev = direction === 'BT' || direction === 'RL';
    const pad = 28, lGap = horiz ? 66 : 52, sGap = 24;
    const pSizes = layers.map(l => Math.max(44, ...l.map(n => (horiz ? dims.get(n.id).w : dims.get(n.id).h))));
    const cSizes = layers.map(l => l.reduce((s, n) => s + (horiz ? dims.get(n.id).h : dims.get(n.id).w), 0) + Math.max(0, l.length - 1) * sGap);
    const maxCross = Math.max(180, ...cSizes);
    const totPrim = pSizes.reduce((s, v) => s + v, 0) + Math.max(0, layers.length - 1) * lGap;
    const svgW = Math.round((horiz ? totPrim : maxCross) + pad * 2);
    const svgH = Math.round((horiz ? maxCross : totPrim) + pad * 2);

    const boxes = new Map();
    const order = layers.map((_, i) => i);
    if (rev) order.reverse();
    let pCur = pad;
    for (const r of order) {
      let cCur = pad + (maxCross - cSizes[r]) / 2;
      for (const n of layers[r]) {
        const d = dims.get(n.id);
        const x = horiz ? pCur + (pSizes[r] - d.w) / 2 : cCur;
        const y = horiz ? cCur : pCur + (pSizes[r] - d.h) / 2;
        boxes.set(n.id, { x, y, w: d.w, h: d.h, cx: x + d.w / 2, cy: y + d.h / 2 });
        cCur += (horiz ? d.h : d.w) + sGap;
      }
      pCur += pSizes[r] + lGap;
    }

    const svg = svgEl('svg', { viewBox: `0 0 ${svgW} ${svgH}`, width: svgW, height: svgH, role: 'img', 'aria-label': 'Mermaid flowchart' });
    const defs = svgEl('defs');
    const marker = svgEl('marker', { id: 'demo-m-arrow', viewBox: '0 0 10 10', refX: 9, refY: 5, markerWidth: 7, markerHeight: 7, orient: 'auto-start-reverse' });
    marker.append(svgEl('path', { d: 'M 0 1 L 10 5 L 0 9 z', fill: 'var(--diagram-accent)' }));
    defs.append(marker);
    svg.append(defs);

    for (const sg of subgraphs) {
      const mem = nodes.filter(n => n.subgraph === sg.id).map(n => boxes.get(n.id)).filter(Boolean);
      if (!mem.length) continue;
      const x0 = Math.min(...mem.map(m => m.x)) - 14, y0 = Math.min(...mem.map(m => m.y)) - 26;
      const x1 = Math.max(...mem.map(m => m.x + m.w)) + 14, y1 = Math.max(...mem.map(m => m.y + m.h)) + 12;
      svg.append(svgEl('rect', { x: x0, y: y0, width: x1 - x0, height: y1 - y0, rx: 12, fill: 'none', stroke: 'currentColor', 'stroke-opacity': '0.3', 'stroke-dasharray': '5 3', 'stroke-width': '1.2' }));
      svg.append(svgEl('text', { x: x0 + 10, y: y0 + 16, fill: 'currentColor', 'font-size': 11, 'font-weight': '600', opacity: '0.75' }, sg.title));
    }

    for (const e of edges) {
      const a = boxes.get(e.from), b = boxes.get(e.to);
      if (!a || !b) continue;
      let x1 = a.cx, y1 = a.cy, x2 = b.cx, y2 = b.cy, dAttr = '';
      if (e.from === e.to) {
        dAttr = `M ${a.x + a.w} ${a.cy - 6} C ${a.x + a.w + 36} ${a.cy - 28}, ${a.x + a.w + 36} ${a.cy + 28}, ${a.x + a.w} ${a.cy + 6}`;
        x1 = a.x + a.w + 26; x2 = x1;
      } else if (horiz) {
        const right = b.cx >= a.cx;
        x1 = right ? a.x + a.w : a.x; x2 = right ? b.x : b.x + b.w;
        const mx = (x1 + x2) / 2;
        dAttr = `M ${x1} ${y1} C ${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}`;
      } else {
        const down = b.cy >= a.cy;
        y1 = down ? a.y + a.h : a.y; y2 = down ? b.y : b.y + b.h;
        const my = (y1 + y2) / 2;
        dAttr = `M ${x1} ${y1} C ${x1} ${my}, ${x2} ${my}, ${x2} ${y2}`;
      }
      svg.append(svgEl('path', {
        d: dAttr, fill: 'none', stroke: 'var(--diagram-accent)', 'stroke-width': e.thick ? '2.6' : '1.6',
        'stroke-linecap': 'round', 'stroke-linejoin': 'round',
        ...(e.dashed ? { 'stroke-dasharray': '5 4' } : {}),
        ...(e.arrow ? { 'marker-end': 'url(#demo-m-arrow)' } : {}),
      }));
      if (e.label) {
        const lx = (x1 + x2) / 2, ly = (y1 + y2) / 2, lw = Math.max(36, e.label.length * 6.8 + 14);
        svg.append(svgEl('rect', { x: lx - lw / 2, y: ly - 10, width: lw, height: 20, rx: 6, fill: 'var(--surface)', stroke: 'var(--line-strong)', 'stroke-width': 1 }));
        svg.append(svgEl('text', { x: lx, y: ly + 4, 'text-anchor': 'middle', fill: 'var(--ink-strong)', 'font-size': 11 }, e.label));
      }
    }

    for (const n of nodes) {
      const b = boxes.get(n.id), d = dims.get(n.id);
      const g = svgEl('g');
      if (n.shape === 'diamond') {
        g.append(svgEl('polygon', { points: `${b.cx},${b.y} ${b.x + b.w},${b.cy} ${b.cx},${b.y + b.h} ${b.x},${b.cy}`, fill: 'currentColor', 'fill-opacity': '0.06', stroke: 'var(--diagram-accent)', 'stroke-width': '1.5', 'stroke-linejoin': 'round' }));
      } else if (n.shape === 'circle') {
        g.append(svgEl('circle', { cx: b.cx, cy: b.cy, r: Math.min(b.w, b.h) / 2, fill: 'currentColor', 'fill-opacity': '0.06', stroke: 'var(--diagram-accent)', 'stroke-width': '1.5' }));
      } else {
        const rx = n.shape === 'stadium' ? b.h / 2 : n.shape === 'round' ? 12 : 8;
        g.append(svgEl('rect', { x: b.x, y: b.y, width: b.w, height: b.h, rx, fill: 'currentColor', 'fill-opacity': '0.05', stroke: 'currentColor', 'stroke-opacity': '0.32', 'stroke-width': '1.4' }));
      }
      const txt = svgEl('text', { 'text-anchor': 'middle', fill: 'currentColor', 'font-size': 12 });
      const lh = 16, y0 = b.cy - ((d.lines.length - 1) * lh) / 2 + 4;
      d.lines.forEach((line, i) => txt.append(svgEl('tspan', { x: b.cx, y: y0 + i * lh }, line)));
      g.append(txt);
      svg.append(g);
    }
    return svg;
  }

  function parseArrayTokenList(rawList) {
    return String(rawList || '')
      .split(',')
      .map(s => unquote(s.trim()))
      .filter(s => s.length > 0);
  }

  function buildPieChartSvg(title, labels, values, isDonut) {
    const clean = labels
      .map((lbl, idx) => ({ label: String(lbl || `Item ${idx + 1}`).slice(0, 24), value: Number(values[idx]) }))
      .filter(item => Number.isFinite(item.value) && item.value > 0);
    const total = clean.reduce((s, x) => s + x.value, 0);
    if (!clean.length || total <= 0) return null;

    const svgW = 480, svgH = Math.max(210, (title ? 46 : 24) + clean.length * 24 + 24);
    const svg = svgEl('svg', { viewBox: `0 0 ${svgW} ${svgH}`, width: svgW, height: svgH, role: 'img', 'aria-label': title || 'Pie chart' });
    if (title) svg.append(svgEl('text', { x: 16, y: 26, fill: 'currentColor', 'font-size': 13, 'font-weight': '600' }, title));

    let angle = -Math.PI / 2;
    const cx = 115, cy = title ? 124 : 104, rOut = 76, rIn = isDonut ? 42 : 0;
    clean.forEach((s, idx) => {
      const frac = s.value / total, sweep = frac * Math.PI * 2, fill = PALETTE[idx % PALETTE.length];
      if (clean.length === 1 && !isDonut) {
        svg.append(svgEl('circle', { cx, cy, r: rOut, fill }));
      } else if (clean.length === 1 && isDonut) {
        svg.append(svgEl('circle', { cx, cy, r: (rOut + rIn) / 2, fill: 'none', stroke: fill, 'stroke-width': rOut - rIn }));
      } else {
        const x1 = cx + rOut * Math.cos(angle), y1 = cy + rOut * Math.sin(angle);
        const x2 = cx + rOut * Math.cos(angle + sweep), y2 = cy + rOut * Math.sin(angle + sweep);
        const large = sweep > Math.PI ? 1 : 0;
        let d;
        if (isDonut) {
          const ix2 = cx + rIn * Math.cos(angle + sweep), iy2 = cy + rIn * Math.sin(angle + sweep);
          const ix1 = cx + rIn * Math.cos(angle), iy1 = cy + rIn * Math.sin(angle);
          d = `M ${x1.toFixed(2)} ${y1.toFixed(2)} A ${rOut} ${rOut} 0 ${large} 1 ${x2.toFixed(2)} ${y2.toFixed(2)} L ${ix2.toFixed(2)} ${iy2.toFixed(2)} A ${rIn} ${rIn} 0 ${large} 0 ${ix1.toFixed(2)} ${iy1.toFixed(2)} Z`;
        } else {
          d = `M ${cx} ${cy} L ${x1.toFixed(2)} ${y1.toFixed(2)} A ${rOut} ${rOut} 0 ${large} 1 ${x2.toFixed(2)} ${y2.toFixed(2)} Z`;
        }
        svg.append(svgEl('path', { d, fill }));
      }
      angle += sweep;
      const ly = (title ? 52 : 32) + idx * 24;
      svg.append(svgEl('rect', { x: 222, y: ly - 10, width: 12, height: 12, rx: 3, fill }));
      svg.append(svgEl('text', { x: 242, y: ly, fill: 'currentColor', 'font-size': 12 }, `${s.label} (${(frac * 100).toFixed(1)}%)`));
    });
    return svg;
  }

  function normalizeChartSpec(raw) {
    if (!raw || typeof raw !== 'object') return null;
    const nested = raw.data && typeof raw.data === 'object' && !Array.isArray(raw.data) ? raw.data : null;
    const optsTitle = raw.options?.plugins?.title?.text;
    const title = String(raw.title || raw.name || optsTitle || '').slice(0, 80);
    const xLabel = String(raw.xLabel || raw.xlabel || raw.options?.scales?.x?.title?.text || '').slice(0, 40);
    const yLabel = String(raw.yLabel || raw.ylabel || raw.options?.scales?.y?.title?.text || '').slice(0, 40);
    let type = String(raw.type || 'bar').toLowerCase();
    if (type === 'doughnut') type = 'donut';

    let labels = [];
    let series = [];

    const datasets = Array.isArray(nested?.datasets) ? nested.datasets
      : Array.isArray(raw.datasets) ? raw.datasets : null;

    if (datasets) {
      const rawLabels = Array.isArray(nested?.labels) ? nested.labels : Array.isArray(raw.labels) ? raw.labels : [];
      labels = rawLabels.slice(0, MAX_CHART_POINTS).map(String);
      series = datasets.slice(0, MAX_CHART_SERIES).map((ds, idx) => ({
        name: String(ds?.label || ds?.name || `Series ${idx + 1}`).slice(0, 40),
        type: ds?.type ? String(ds.type).toLowerCase() : type,
        data: (Array.isArray(ds?.data) ? ds.data : []).slice(0, MAX_CHART_POINTS),
      }));
    } else if (Array.isArray(raw.series)) {
      labels = (Array.isArray(raw.labels) ? raw.labels : Array.isArray(raw.x) ? raw.x : []).slice(0, MAX_CHART_POINTS).map(String);
      series = raw.series.slice(0, MAX_CHART_SERIES).map((s, idx) => ({
        name: String(s?.name || s?.label || `Series ${idx + 1}`).slice(0, 40),
        type: s?.type ? String(s.type).toLowerCase() : type,
        data: (Array.isArray(s?.data) ? s.data : Array.isArray(s?.values) ? s.values : []).slice(0, MAX_CHART_POINTS),
      }));
    } else if (Array.isArray(raw.data) && raw.data.every(r => r && typeof r === 'object')) {
      const rows = raw.data.slice(0, MAX_CHART_POINTS);
      const hasXY = rows.every(r => r.x !== undefined && r.y !== undefined && Number.isFinite(Number(r.x)) && Number.isFinite(Number(r.y)));
      if (type === 'scatter' && hasXY) {
        series = [{ name: title || 'Points', type: 'scatter', data: rows.map(r => ({ x: Number(r.x), y: Number(r.y) })) }];
        labels = rows.map(r => String(r.x));
      } else {
        labels = rows.map((r, i) => String(r.label ?? r.name ?? r.category ?? r.x ?? i + 1));
        series = [{ name: title || 'Value', type, data: rows.map(r => Number(r.value ?? r.y ?? r.count)) }];
      }
    } else if (Array.isArray(raw.values)) {
      labels = (Array.isArray(raw.labels) ? raw.labels : Array.isArray(raw.x) ? raw.x : []).slice(0, MAX_CHART_POINTS).map(String);
      series = [{ name: title || 'Value', type, data: raw.values.slice(0, MAX_CHART_POINTS) }];
    } else if (Array.isArray(raw.y) && Array.isArray(raw.x)) {
      labels = raw.x.slice(0, MAX_CHART_POINTS).map(String);
      series = [{ name: title || 'Value', type, data: raw.y.slice(0, MAX_CHART_POINTS) }];
    }

    if (!series.length) return null;
    if (type === 'scatter') {
      const normalizedScatter = series.map(s => {
        const pts = s.data.map((pt, idx) => {
          if (pt && typeof pt === 'object' && pt.x !== undefined && pt.y !== undefined) {
            return { x: Number(pt.x), y: Number(pt.y) };
          }
          const xNum = Number(labels[idx]);
          return { x: Number.isFinite(xNum) ? xNum : idx + 1, y: Number(pt) };
        }).filter(p => Number.isFinite(p.x) && Number.isFinite(p.y));
        return { ...s, pts };
      }).filter(s => s.pts.length > 0);
      if (!normalizedScatter.length) return null;
      return { title, type: 'scatter', xLabel, yLabel, series: normalizedScatter };
    }

    const cleanSeries = series.map(s => ({
      name: s.name,
      type: s.type === 'area' ? 'area' : s.type === 'line' ? 'line' : 'bar',
      data: s.data.slice(0, labels.length || MAX_CHART_POINTS).map(Number),
    })).filter(s => s.data.length > 0 && s.data.every(Number.isFinite));

    if (!cleanSeries.length) return null;
    if (!labels.length) labels = cleanSeries[0].data.map((_, i) => String(i + 1));
    return { title, type, xLabel, yLabel, labels, series: cleanSeries };
  }

  function isChartSpec(obj) {
    if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return false;
    return Boolean(normalizeChartSpec(obj));
  }

  function buildScatterSvg(norm) {
    const allX = norm.series.flatMap(s => s.pts.map(p => p.x));
    const allY = norm.series.flatMap(s => s.pts.map(p => p.y));
    const minX = Math.min(...allX), maxX = Math.max(...allX);
    const minY = Math.min(0, ...allY), maxY = Math.max(1, ...allY, 0);
    const spanX = maxX - minX || 1;
    const spanY = maxY - minY || 1;
    const hasLegend = norm.series.length > 1;
    const svgW = 540, padL = norm.yLabel ? 58 : 48, padR = 24, padT = hasLegend ? 42 : 24, padB = norm.xLabel ? 56 : 42;
    const svgH = 264 + (hasLegend ? 16 : 0) + (norm.xLabel ? 14 : 0);
    const plotW = svgW - padL - padR, plotH = svgH - padT - padB;
    const svg = svgEl('svg', { viewBox: `0 0 ${svgW} ${svgH}`, width: svgW, height: svgH, role: 'img', 'aria-label': norm.title || 'Scatter chart' });

    for (let g = 0; g <= 4; g++) {
      const yVal = minY + (spanY * g) / 4;
      const y = padT + plotH - (plotH * g) / 4;
      svg.append(svgEl('line', { x1: padL, y1: y, x2: svgW - padR, y2: y, stroke: 'currentColor', 'stroke-opacity': '0.14' }));
      svg.append(svgEl('text', { x: padL - 6, y: y + 4, 'text-anchor': 'end', fill: 'currentColor', opacity: '0.68', 'font-size': 10 }, String(Number(yVal.toFixed(2)))));

      const xVal = minX + (spanX * g) / 4;
      const x = padL + (plotW * g) / 4;
      svg.append(svgEl('line', { x1: x, y1: padT, x2: x, y2: padT + plotH, stroke: 'currentColor', 'stroke-opacity': '0.1' }));
      svg.append(svgEl('text', { x, y: padT + plotH + 17, 'text-anchor': 'middle', fill: 'currentColor', opacity: '0.72', 'font-size': 10 }, String(Number(xVal.toFixed(2)))));
    }
    svg.append(svgEl('line', { x1: padL, y1: padT, x2: padL, y2: padT + plotH, stroke: 'currentColor', 'stroke-opacity': '0.45' }));
    svg.append(svgEl('line', { x1: padL, y1: padT + plotH, x2: svgW - padR, y2: padT + plotH, stroke: 'currentColor', 'stroke-opacity': '0.45' }));

    const xOf = v => padL + ((v - minX) / spanX) * plotW;
    const yOf = v => padT + plotH - ((v - minY) / spanY) * plotH;

    if (hasLegend) {
      let lx = padL;
      norm.series.forEach((ser, idx) => {
        const c = PALETTE[idx % PALETTE.length];
        svg.append(svgEl('circle', { cx: lx + 5, cy: 16, r: 4.5, fill: c }));
        svg.append(svgEl('text', { x: lx + 14, y: 20, fill: 'currentColor', 'font-size': 11, opacity: '0.88' }, ser.name));
        lx += Math.max(70, ser.name.length * 7 + 26);
      });
    }

    norm.series.forEach((ser, sIdx) => {
      const color = PALETTE[sIdx % PALETTE.length];
      ser.pts.forEach(pt => {
        svg.append(svgEl('circle', { cx: xOf(pt.x), cy: yOf(pt.y), r: 4.5, fill: color, stroke: 'var(--panel)', 'stroke-width': '1.5' }));
      });
    });

    if (norm.xLabel) svg.append(svgEl('text', { x: padL + plotW / 2, y: svgH - 8, 'text-anchor': 'middle', fill: 'currentColor', opacity: '0.72', 'font-size': 11 }, norm.xLabel));
    if (norm.yLabel) svg.append(svgEl('text', { x: 14, y: padT + plotH / 2, 'text-anchor': 'middle', fill: 'currentColor', opacity: '0.72', 'font-size': 11, transform: `rotate(-90 14 ${padT + plotH / 2})` }, norm.yLabel));
    return svg;
  }

  function buildChartSvg(spec) {
    const norm = normalizeChartSpec(spec);
    if (!norm) return null;

    if (norm.type === 'pie' || norm.type === 'donut') {
      return buildPieChartSvg(norm.title, norm.labels, norm.series[0].data, norm.type === 'donut');
    }
    if (norm.type === 'scatter') {
      return buildScatterSvg(norm);
    }

    const labels = norm.labels;
    const normalizedSeries = norm.series;
    const allVals = normalizedSeries.flatMap(s => s.data);
    const maxV = Math.max(1, ...allVals, 0);
    const minV = Math.min(0, ...allVals);
    const span = maxV - minV || 1;
    const hasLegend = normalizedSeries.length > 1;
    const svgW = 540;
    const padL = norm.yLabel ? 58 : 48, padR = 20, padT = hasLegend ? 44 : 26, padB = norm.xLabel ? 58 : 46;
    const svgH = 260 + (hasLegend ? 18 : 0) + (norm.xLabel ? 12 : 0);
    const plotW = svgW - padL - padR, plotH = svgH - padT - padB;
    const svg = svgEl('svg', { viewBox: `0 0 ${svgW} ${svgH}`, width: svgW, height: svgH, role: 'img', 'aria-label': norm.title || 'Chart' });

    for (let g = 0; g <= 4; g++) {
      const val = minV + (span * g) / 4;
      const y = padT + plotH - (plotH * g) / 4;
      svg.append(svgEl('line', { x1: padL, y1: y, x2: svgW - padR, y2: y, stroke: 'currentColor', 'stroke-opacity': '0.16' }));
      svg.append(svgEl('text', { x: padL - 6, y: y + 4, 'text-anchor': 'end', fill: 'currentColor', opacity: '0.68', 'font-size': 10 }, String(Number(val.toFixed(1)))));
    }
    svg.append(svgEl('line', { x1: padL, y1: padT, x2: padL, y2: padT + plotH, stroke: 'currentColor', 'stroke-opacity': '0.45' }));
    svg.append(svgEl('line', { x1: padL, y1: padT + plotH, x2: svgW - padR, y2: padT + plotH, stroke: 'currentColor', 'stroke-opacity': '0.45' }));

    const slotW = plotW / labels.length;
    labels.forEach((lbl, idx) => {
      const cx = padL + slotW * idx + slotW / 2;
      svg.append(svgEl('text', { x: cx, y: padT + plotH + 18, 'text-anchor': 'middle', fill: 'currentColor', opacity: '0.78', 'font-size': 11 }, lbl.slice(0, 14)));
    });

    if (hasLegend) {
      let lx = padL;
      normalizedSeries.forEach((ser, sIdx) => {
        const c = PALETTE[sIdx % PALETTE.length];
        svg.append(svgEl('rect', { x: lx, y: 11, width: 10, height: 10, rx: 3, fill: c }));
        svg.append(svgEl('text', { x: lx + 15, y: 20, fill: 'currentColor', opacity: '0.88', 'font-size': 11 }, ser.name));
        lx += Math.max(72, ser.name.length * 6.8 + 28);
      });
    }

    const yOf = v => padT + plotH - ((v - minV) / span) * plotH;
    const barSeries = normalizedSeries.filter(s => s.type === 'bar');
    normalizedSeries.forEach((ser, sIdx) => {
      const color = PALETTE[sIdx % PALETTE.length];
      if (ser.type === 'line' || ser.type === 'area') {
        const coords = ser.data.map((v, i) => [padL + slotW * i + slotW / 2, yOf(v)]);
        if (ser.type === 'area' && coords.length >= 2) {
          const baseLineY = yOf(Math.max(0, minV));
          const areaD = `M ${coords[0][0].toFixed(1)} ${baseLineY.toFixed(1)} ` +
            coords.map(([x, y]) => `L ${x.toFixed(1)} ${y.toFixed(1)}`).join(' ') +
            ` L ${coords.at(-1)[0].toFixed(1)} ${baseLineY.toFixed(1)} Z`;
          svg.append(svgEl('path', { d: areaD, fill: color, 'fill-opacity': '0.14' }));
        }
        const pts = coords.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
        svg.append(svgEl('polyline', { points: pts, fill: 'none', stroke: color, 'stroke-width': '2.2', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }));
        coords.forEach(([x, y]) => {
          svg.append(svgEl('circle', { cx: x, cy: y, r: 3.8, fill: color, stroke: 'var(--panel)', 'stroke-width': '1.2' }));
        });
      } else {
        const bIdx = Math.max(0, barSeries.indexOf(ser));
        const bCount = Math.max(1, barSeries.length);
        const zeroY = yOf(0);
        const bw = Math.max(8, Math.min(34, (slotW * 0.72) / bCount));
        const startOff = -(bw * bCount) / 2;
        ser.data.forEach((v, i) => {
          const cx = padL + slotW * i + slotW / 2;
          const vy = yOf(v);
          svg.append(svgEl('rect', {
            x: cx + startOff + bIdx * bw, y: Math.min(vy, zeroY),
            width: Math.max(4, bw - 2), height: Math.max(1, Math.abs(zeroY - vy)),
            rx: 4, fill: color,
          }));
          if (normalizedSeries.length === 1 && labels.length <= 10) {
            svg.append(svgEl('text', { x: cx, y: Math.min(vy, zeroY) - 5, 'text-anchor': 'middle', fill: 'currentColor', opacity: '0.72', 'font-size': 10 }, String(Number(v.toFixed(1)))));
          }
        });
      }
    });

    if (norm.xLabel) svg.append(svgEl('text', { x: padL + plotW / 2, y: svgH - 8, 'text-anchor': 'middle', fill: 'currentColor', opacity: '0.72', 'font-size': 11 }, norm.xLabel));
    if (norm.yLabel) svg.append(svgEl('text', { x: 14, y: padT + plotH / 2, 'text-anchor': 'middle', fill: 'currentColor', opacity: '0.72', 'font-size': 11, transform: `rotate(-90 14 ${padT + plotH / 2})` }, norm.yLabel));
    return svg;
  }

  function renderMermaidToElement(source) {
    const lines = String(source || '').split(/\r?\n/).map(l => l.trimEnd()).filter(l => l.trim() && !l.trim().startsWith('%%'));
    if (!lines.length) return { title: 'Mermaid diagram', svg: null, error: 'Empty Mermaid block.' };
    const first = lines[0].trim();

    if (/^(?:graph|flowchart)\b/i.test(first)) {
      const dm = first.match(/^(?:graph|flowchart)\s+(TD|TB|BT|LR|RL)\b/i);
      const rawDir = (dm ? dm[1] : 'TD').toUpperCase();
      const dir = rawDir === 'TB' ? 'TD' : rawDir;
      const nodes = new Map(), edges = [], subgraphs = [], subStack = [];
      const ensure = spec => {
        const ex = nodes.get(spec.id), sg = subStack.at(-1);
        if (!ex) nodes.set(spec.id, { id: spec.id, label: spec.label || spec.id, shape: spec.shape || 'rect', ...(sg ? { subgraph: sg } : {}) });
        else {
          if (spec.label && ex.label === ex.id) ex.label = spec.label;
          if (spec.shape && ex.shape === 'rect') ex.shape = spec.shape;
        }
      };
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim().replace(/;\s*$/, '').trim();
        if (/^(?:style|classDef|class|linkStyle|click|direction|accTitle|accDescr)\b/i.test(line)) continue;
        if (/^subgraph\b/i.test(line)) {
          const rest = line.replace(/^subgraph\s+/i, '').trim();
          const bm = rest.match(/^([A-Za-z0-9_.-]+)\s*\[([\s\S]+)\]$/);
          const sid = bm ? bm[1] : `sg_${subgraphs.length + 1}`;
          subgraphs.push({ id: sid, title: unquote(bm ? bm[2] : rest) || sid });
          subStack.push(sid);
          continue;
        }
        if (/^end$/i.test(line)) { subStack.pop(); continue; }
        const firstOp = findNextEdgeOp(line, 0);
        if (!firstOp) {
          splitTopLevelNodes(line).forEach(t => { const p = parseNodeToken(t); if (p) ensure(p); });
          continue;
        }
        let cursor = 0;
        for (;;) {
          const op = findNextEdgeOp(line, cursor);
          const left = op ? line.slice(cursor, op.start).trim() : line.slice(cursor).trim();
          const srcs = [];
          splitTopLevelNodes(left).forEach(t => { const p = parseNodeToken(t); if (p) { ensure(p); srcs.push(p.id); } });
          if (!op) break;
          const nextOp = findNextEdgeOp(line, op.end);
          const right = nextOp ? line.slice(op.end, nextOp.start).trim() : line.slice(op.end).trim();
          const dsts = [];
          splitTopLevelNodes(right).forEach(t => { const p = parseNodeToken(t); if (p) { ensure(p); dsts.push(p.id); } });
          for (const s of srcs) for (const d of dsts) edges.push({ from: s, to: d, label: op.label, dashed: op.dashed, thick: op.thick, arrow: op.arrow });
          cursor = op.end;
        }
      }
      if (!nodes.size) return { title: 'Mermaid · Flowchart', svg: null, error: 'No nodes parsed.' };
      return { title: 'Mermaid · Flowchart', svg: buildFlowSvg([...nodes.values()], edges, subgraphs, dir) };
    }

    if (/^sequenceDiagram\b/i.test(first)) {
      const parts = [], pSet = new Set(), msgs = [];
      const addP = (id, label) => {
        if (!id) return;
        if (!pSet.has(id)) { pSet.add(id); parts.push({ id, label: unquote(label || id) }); }
        else if (label) { const x = parts.find(p => p.id === id); if (x) x.label = unquote(label); }
      };
      for (let i = 1; i < lines.length; i++) {
        const l = lines[i].trim();
        const pm = l.match(/^(?:participant|actor)\s+([A-Za-z0-9_.-]+)(?:\s+as\s+(.+))?$/i);
        if (pm) { addP(pm[1], pm[2]); continue; }
        const mm = l.match(/^([A-Za-z0-9_.-]+)\s*(-->>|->>|-->|->|--x|-x)\s*\+?-?([A-Za-z0-9_.-]+)\s*:\s*(.*)$/);
        if (mm) { addP(mm[1]); addP(mm[3]); msgs.push({ from: mm[1], to: mm[3], text: mm[4].trim(), dashed: mm[2].startsWith('--') }); }
      }
      if (!parts.length) return { title: 'Mermaid · Sequence', svg: null, error: 'No sequence participants parsed.' };
      const colW = 152, pad = 24, rowH = 44, boxH = 32;
      const svgW = Math.max(300, parts.length * colW + pad * 2);
      const svgH = Math.max(170, boxH + 28 + msgs.length * rowH + boxH + pad * 2);
      const xOf = new Map(parts.map((p, idx) => [p.id, pad + colW * idx + colW / 2]));
      const svg = svgEl('svg', { viewBox: `0 0 ${svgW} ${svgH}`, width: svgW, height: svgH, role: 'img', 'aria-label': 'Mermaid sequence diagram' });
      const defs = svgEl('defs'), mk = svgEl('marker', { id: 'demo-s-arrow', viewBox: '0 0 10 10', refX: 9, refY: 5, markerWidth: 7, markerHeight: 7, orient: 'auto' });
      mk.append(svgEl('path', { d: 'M 0 1 L 10 5 L 0 9 z', fill: 'var(--diagram-accent)' }));
      defs.append(mk); svg.append(defs);
      const top = pad + boxH, bot = svgH - pad - boxH;
      for (const p of parts) {
        const cx = xOf.get(p.id), bw = Math.min(colW - 16, Math.max(76, p.label.length * 7.2 + 22));
        svg.append(svgEl('line', { x1: cx, y1: top, x2: cx, y2: bot, stroke: 'currentColor', 'stroke-opacity': '0.3', 'stroke-dasharray': '4 4' }));
        for (const y of [pad, bot]) {
          svg.append(svgEl('rect', { x: cx - bw / 2, y, width: bw, height: boxH, rx: 8, fill: 'currentColor', 'fill-opacity': '0.06', stroke: 'currentColor', 'stroke-opacity': '0.32' }));
          svg.append(svgEl('text', { x: cx, y: y + 20, 'text-anchor': 'middle', fill: 'currentColor', 'font-size': 12 }, p.label));
        }
      }
      msgs.forEach((m, i) => {
        const x1 = xOf.get(m.from), x2 = xOf.get(m.to), y = top + 30 + i * rowH;
        svg.append(svgEl('line', { x1, y1: y, x2, y2: y, stroke: 'var(--diagram-accent)', 'stroke-width': '1.6', 'stroke-linecap': 'round', ...(m.dashed ? { 'stroke-dasharray': '5 3' } : {}), 'marker-end': 'url(#demo-s-arrow)' }));
        svg.append(svgEl('text', { x: (x1 + x2) / 2, y: y - 7, 'text-anchor': 'middle', fill: 'currentColor', 'font-size': 11 }, m.text));
      });
      return { title: 'Mermaid · Sequence diagram', svg };
    }

    if (/^stateDiagram(?:-v2)?\b/i.test(first)) {
      const nodes = new Map(), edges = [];
      let sc = 0, ec = 0;
      const ensure = (id, label, shape = 'round') => { if (!nodes.has(id)) nodes.set(id, { id, label: label || id, shape }); };
      for (let i = 1; i < lines.length; i++) {
        const l = lines[i].trim();
        const dm = l.match(/^state\s+"([^"]+)"\s+as\s+([A-Za-z0-9_.-]+)/i);
        if (dm) { ensure(dm[2], dm[1]); continue; }
        const em = l.match(/^(\[\*\]|[A-Za-z0-9_.-]+)\s*-->\s*(\[\*\]|[A-Za-z0-9_.-]+)(?:\s*:\s*(.*))?$/);
        if (em) {
          let s = em[1], d = em[2];
          if (s === '[*]') { s = `__s${++sc}`; ensure(s, 'Start', 'circle'); } else ensure(s);
          if (d === '[*]') { d = `__e${++ec}`; ensure(d, 'End', 'circle'); } else ensure(d);
          edges.push({ from: s, to: d, label: em[3]?.trim() || undefined, dashed: false, thick: false, arrow: true });
        }
      }
      if (!nodes.size) return { title: 'Mermaid · State diagram', svg: null, error: 'No states parsed.' };
      return { title: 'Mermaid · State diagram', svg: buildFlowSvg([...nodes.values()], edges, [], 'TD') };
    }

    if (/^pie\b/i.test(first)) {
      const tm = first.match(/^pie(?:\s+showData)?(?:\s+title\s+(.+))?$/i);
      let title = tm && tm[1] ? unquote(tm[1].trim()) : '';
      const labels = [], values = [];
      for (let i = 1; i < lines.length; i++) {
        const l = lines[i].trim();
        const tl = l.match(/^title\s+(.+)$/i);
        if (tl) { title = unquote(tl[1].trim()); continue; }
        const sm = l.match(/^"([^"]+)"\s*:\s*([0-9]+(?:\.[0-9]+)?)$/);
        if (sm) {
          const v = Number(sm[2]);
          if (Number.isFinite(v) && v > 0) { labels.push(sm[1]); values.push(v); }
        }
      }
      const svg = buildPieChartSvg(title, labels, values, false);
      if (!svg) return { title: 'Mermaid · Pie chart', svg: null, error: 'No slices parsed.' };
      return { title: title ? `Mermaid · ${title}` : 'Mermaid · Pie chart', svg };
    }

    if (/^xychart(?:-beta)?\b/i.test(first)) {
      let title = '', xLabel = '', yLabel = '';
      let xLabels = [];
      const series = [];
      for (let i = 1; i < lines.length; i++) {
        const l = lines[i].trim();
        const tm = l.match(/^title\s+(.+)$/i);
        if (tm) { title = unquote(tm[1]); continue; }
        const xm = l.match(/^x-axis\s+(?:"([^"]+)"\s*)?\[([^\]]+)\]/i);
        if (xm) {
          if (xm[1]) xLabel = xm[1].trim();
          xLabels = parseArrayTokenList(xm[2]);
          continue;
        }
        const ym = l.match(/^y-axis\s+(?:"([^"]+)"\s*)?/i);
        if (ym) {
          if (ym[1]) yLabel = ym[1].trim();
          continue;
        }
        const sm = l.match(/^(bar|line)\s+(?:"([^"]+)"\s*)?\[([^\]]+)\]/i);
        if (sm) {
          const vals = parseArrayTokenList(sm[3]).map(Number);
          series.push({ name: sm[2] || `Series ${series.length + 1}`, type: sm[1].toLowerCase(), data: vals });
        }
      }
      const svg = buildChartSvg({ title, xLabel, yLabel, labels: xLabels, series });
      if (!svg) return { title: 'Mermaid · XY Chart', svg: null, error: 'No XY chart data parsed.' };
      return { title: title || 'Mermaid · XY Chart', svg };
    }

    return { title: `Mermaid · ${first.split(/\s+/)[0]}`, svg: null, error: `Unsupported Mermaid diagram type "${first.split(/\s+/)[0]}". Showing source.` };
  }

  function sanitizeSvgNode(src) {
    const tag = src.localName ? src.localName.toLowerCase() : '';
    if (!ALLOWED_SVG_TAGS.has(tag)) return null;
    const out = document.createElementNS(SVG_NS, src.localName);
    for (const attr of [...src.attributes]) {
      if (ALLOWED_SVG_ATTRS.has(attr.name.toLowerCase())) {
        out.setAttribute(attr.name, attr.value);
      }
    }
    for (const child of [...src.childNodes]) {
      if (child.nodeType === Node.TEXT_NODE) {
        if (child.nodeValue) out.append(document.createTextNode(child.nodeValue));
      } else if (child.nodeType === Node.ELEMENT_NODE) {
        const safeChild = sanitizeSvgNode(child);
        if (safeChild) out.append(safeChild);
      }
    }
    return out;
  }

  function extractSafeSvg(htmlOrSvg) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(String(htmlOrSvg || ''), 'text/html');
    const found = doc.querySelector('svg');
    if (!found) return null;
    return sanitizeSvgNode(found);
  }

  function makeDiagramCard(title, contentEl, rawSource, errorNote) {
    const card = document.createElement('section');
    card.className = 'demo-diagram';

    const bar = document.createElement('div');
    bar.className = 'demo-diagram-bar';
    const titleSpan = document.createElement('span');
    titleSpan.className = 'demo-diagram-title';
    titleSpan.textContent = title;

    const actions = document.createElement('div');
    actions.className = 'demo-diagram-actions';
    const paperBtn = document.createElement('button');
    paperBtn.type = 'button';
    paperBtn.className = 'demo-diagram-btn';
    paperBtn.textContent = 'Paper';
    paperBtn.setAttribute('aria-pressed', 'false');
    paperBtn.addEventListener('click', () => {
      const next = !card.classList.contains('is-paper');
      card.classList.toggle('is-paper', next);
      paperBtn.setAttribute('aria-pressed', String(next));
    });

    const srcPre = document.createElement('pre');
    srcPre.className = 'demo-diagram-src';
    const srcCode = document.createElement('code');
    srcCode.textContent = rawSource;
    srcPre.append(srcCode);

    const srcBtn = document.createElement('button');
    srcBtn.type = 'button';
    srcBtn.className = 'demo-diagram-btn';
    srcBtn.setAttribute('aria-expanded', contentEl ? 'false' : 'true');
    srcBtn.textContent = contentEl ? 'Source' : 'Hide source';
    if (contentEl) srcPre.hidden = true;
    srcBtn.addEventListener('click', () => {
      const open = srcPre.hidden;
      srcPre.hidden = !open;
      srcBtn.setAttribute('aria-expanded', String(open));
      srcBtn.textContent = open ? 'Hide source' : 'Source';
    });

    actions.append(paperBtn, srcBtn);
    bar.append(titleSpan, actions);
    card.append(bar);

    if (contentEl) {
      const body = document.createElement('div');
      body.className = 'demo-diagram-body';
      body.append(contentEl);
      card.append(body);
    } else if (errorNote) {
      const note = document.createElement('p');
      note.className = 'demo-diagram-note';
      note.textContent = errorNote;
      card.append(note);
    }
    card.append(srcPre);
    return card;
  }

  function renderDiagramFence(lang, rawBody) {
    const trimmed = String(rawBody || '').trim();
    if (lang === 'mermaid') {
      const m = renderMermaidToElement(trimmed);
      return makeDiagramCard(m.title, m.svg, trimmed, m.error);
    }
    if (lang === 'learneth-chart' || lang === 'chart' || lang === 'chartjs') {
      try {
        const spec = JSON.parse(trimmed);
        const svg = buildChartSvg(spec || {});
        if (svg) return makeDiagramCard(spec.title || spec.options?.plugins?.title?.text || 'Chart', svg, trimmed);
      } catch {}
      return makeDiagramCard('Chart', null, trimmed, 'Invalid chart JSON; showing source.');
    }
    if (trimmed.startsWith('{')) {
      try {
        const obj = JSON.parse(trimmed);
        if (obj && typeof obj === 'object') {
          if (isChartSpec(obj)) {
            const chartSvg = buildChartSvg(obj);
            if (chartSvg) return makeDiagramCard(String(obj.title || obj.options?.plugins?.title?.text || 'Chart'), chartSvg, trimmed);
          }
          if (typeof obj.html === 'string') {
            const safeSvg = extractSafeSvg(obj.html);
            if (safeSvg) return makeDiagramCard(String(obj.title || 'Diagram'), safeSvg, trimmed);
            const fallbackP = document.createElement('p');
            fallbackP.className = 'demo-diagram-note';
            fallbackP.textContent = String(obj.html).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() || 'Diagram markup omitted for safety.';
            return makeDiagramCard(String(obj.title || 'Diagram'), fallbackP, trimmed);
          }
        }
      } catch {}
    }
    if (/^<svg[\s>]/i.test(trimmed)) {
      const safeSvg = extractSafeSvg(trimmed);
      if (safeSvg) return makeDiagramCard('Diagram', safeSvg, trimmed);
    }
    return makeDiagramCard('Diagram', null, trimmed, 'Diagram could not be parsed safely; showing source.');
  }

  function looksLikeCurrencyPair(rawInner, nextChar) {
    if (/[0-9]/.test(nextChar || '')) return true;
    const t = rawInner.trim();
    if (/^[0-9][0-9.,]*\s+(?:[a-z]{2,}|and|or|to)\b/i.test(t) && !/[\\^_={}]/.test(t)) return true;
    return false;
  }

  function appendInlineText(parent, text, allowEmphasis = true) {
    const str = String(text || '');
    let pos = 0;

    while (pos < str.length) {
      const ch = str[pos];

      if (ch === '`') {
        const end = str.indexOf('`', pos + 1);
        if (end !== -1 && !str.slice(pos + 1, end).includes('\n')) {
          const code = document.createElement('code');
          code.textContent = str.slice(pos + 1, end);
          parent.append(code);
          pos = end + 1;
          continue;
        }
      }

      if (ch === '$' && str[pos + 1] === '$' && str[pos - 1] !== '\\') {
        const end = str.indexOf('$$', pos + 2);
        if (end !== -1 && str.slice(pos + 2, end).trim()) {
          parent.append(createInlineMathEl(str.slice(pos + 2, end)));
          pos = end + 2;
          continue;
        }
      }

      if (ch === '\\' && str[pos + 1] === '(') {
        const end = str.indexOf('\\)', pos + 2);
        if (end !== -1 && str.slice(pos + 2, end).trim()) {
          parent.append(createInlineMathEl(str.slice(pos + 2, end)));
          pos = end + 2;
          continue;
        }
      }

      if (ch === '$' && str[pos - 1] !== '\\' && str[pos + 1] !== '$' && str[pos + 1] && !/\s/.test(str[pos + 1])) {
        let closeIdx = -1;
        for (let j = pos + 1; j < str.length; j++) {
          if (str[j] === '\n') break;
          if (str[j] === '$' && str[j - 1] !== '\\') {
            if (!/\s/.test(str[j - 1]) && !looksLikeCurrencyPair(str.slice(pos + 1, j), str[j + 1])) {
              closeIdx = j;
            }
            break;
          }
        }
        if (closeIdx !== -1 && str.slice(pos + 1, closeIdx).trim()) {
          parent.append(createInlineMathEl(str.slice(pos + 1, closeIdx)));
          pos = closeIdx + 1;
          continue;
        }
      }

      if (allowEmphasis && ch === '*' && str[pos + 1] === '*') {
        const end = str.indexOf('**', pos + 2);
        if (end > pos + 2 && !str.slice(pos + 2, end).includes('\n')) {
          const strong = document.createElement('strong');
          appendInlineText(strong, str.slice(pos + 2, end), false);
          parent.append(strong);
          pos = end + 2;
          continue;
        }
      }

      if (allowEmphasis && ch === '*' && str[pos + 1] !== '*' && str[pos + 1] && !/\s/.test(str[pos + 1])) {
        const end = str.indexOf('*', pos + 1);
        if (end > pos + 1 && str[end - 1] && !/\s/.test(str[end - 1]) && !str.slice(pos + 1, end).includes('\n')) {
          const em = document.createElement('em');
          appendInlineText(em, str.slice(pos + 1, end), false);
          parent.append(em);
          pos = end + 1;
          continue;
        }
      }

      let next = pos + 1;
      while (next < str.length) {
        const c = str[next];
        if (c === '`' || c === '$' || (c === '\\' && str[next + 1] === '(') || (allowEmphasis && c === '*')) break;
        next++;
      }
      parent.append(document.createTextNode(str.slice(pos, next)));
      pos = next;
    }
  }

  function renderTableBlock(lines) {
    const parseRow = l => l.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map(c => c.trim());
    const headers = parseRow(lines[0]);
    const table = document.createElement('table');
    table.className = 'demo-table';
    const thead = document.createElement('thead');
    const hr = document.createElement('tr');
    headers.forEach(h => {
      const th = document.createElement('th');
      appendInlineText(th, h);
      hr.append(th);
    });
    thead.append(hr);
    table.append(thead);
    const tbody = document.createElement('tbody');
    for (let i = 2; i < lines.length; i++) {
      const tr = document.createElement('tr');
      parseRow(lines[i]).forEach(cell => {
        const td = document.createElement('td');
        appendInlineText(td, cell);
        tr.append(td);
      });
      tbody.append(tr);
    }
    table.append(tbody);
    return table;
  }

  function isDisplayMathLine(trimmed) {
    return trimmed.startsWith('$$') || trimmed.startsWith('\\[');
  }

  function renderRichMarkdown(text) {
    const root = document.createElement('div');
    root.className = 'demo-md';
    const lines = String(text || '').replace(/\r\n/g, '\n').split('\n');
    let i = 0;

    while (i < lines.length) {
      const line = lines[i];
      const trimmed = line.trim();
      if (!trimmed) { i++; continue; }

      const fenceMatch = line.match(/^\s{0,3}(`{3,}|~{3,})(.*)$/);
      if (fenceMatch) {
        const fChar = fenceMatch[1][0], fLen = fenceMatch[1].length;
        const lang = fenceMatch[2].trim().split(/\s+/)[0].toLowerCase();
        const buf = [];
        i++;
        while (i < lines.length) {
          const close = lines[i].match(/^\s{0,3}(`+|~+)\s*$/);
          if (close && close[1][0] === fChar && close[1].length >= fLen) { i++; break; }
          buf.push(lines[i]);
          i++;
        }
        const rawCode = buf.join('\n');
        if (lang === 'math' || lang === 'latex' || lang === 'tex') {
          root.append(createMathBlockEl(rawCode));
        } else if (
          lang === 'mermaid' || lang === 'learneth-diagram' || lang === 'learneth-chart' ||
          lang === 'chart' || lang === 'chartjs' || lang === 'svg' || lang === 'learneth-svg'
        ) {
          root.append(renderDiagramFence(lang, rawCode));
        } else if (lang === 'json') {
          let renderedChart = null;
          try {
            const parsed = JSON.parse(rawCode.trim());
            if (isChartSpec(parsed)) renderedChart = renderDiagramFence('learneth-chart', rawCode);
          } catch {}
          if (renderedChart) {
            root.append(renderedChart);
          } else {
            const pre = document.createElement('pre');
            pre.className = 'demo-code';
            const code = document.createElement('code');
            code.textContent = rawCode;
            pre.append(code);
            root.append(pre);
          }
        } else {
          const pre = document.createElement('pre');
          pre.className = 'demo-code';
          const code = document.createElement('code');
          code.textContent = rawCode;
          pre.append(code);
          root.append(pre);
        }
        continue;
      }

      if (trimmed.startsWith('$$')) {
        const single = trimmed.match(/^\$\$(.+?)\$\$$/);
        if (single && trimmed.length > 4) {
          root.append(createMathBlockEl(single[1]));
          i++;
          continue;
        }
        const buf = [];
        const afterOpen = trimmed.slice(2).trim();
        if (afterOpen) buf.push(afterOpen);
        i++;
        while (i < lines.length) {
          const curTrim = lines[i].trim();
          const closeIdx = curTrim.indexOf('$$');
          if (closeIdx !== -1) {
            const before = curTrim.slice(0, closeIdx).trim();
            if (before) buf.push(before);
            i++;
            break;
          }
          buf.push(lines[i]);
          i++;
        }
        root.append(createMathBlockEl(buf.join('\n')));
        continue;
      }

      if (trimmed.startsWith('\\[')) {
        const single = trimmed.match(/^\\\[(.+?)\\\]$/);
        if (single) {
          root.append(createMathBlockEl(single[1]));
          i++;
          continue;
        }
        const buf = [];
        const afterOpen = trimmed.slice(2).trim();
        if (afterOpen) buf.push(afterOpen);
        i++;
        while (i < lines.length) {
          const curTrim = lines[i].trim();
          const closeIdx = curTrim.indexOf('\\]');
          if (closeIdx !== -1) {
            const before = curTrim.slice(0, closeIdx).trim();
            if (before) buf.push(before);
            i++;
            break;
          }
          buf.push(lines[i]);
          i++;
        }
        root.append(createMathBlockEl(buf.join('\n')));
        continue;
      }

      if (line.includes('|') && i + 1 < lines.length && /^\s*\|?\s*:?-{3,}:?(?:\s*\|\s*:?-{3,}:?)*\s*\|?\s*$/.test(lines[i + 1])) {
        const tbl = [line, lines[i + 1]];
        i += 2;
        while (i < lines.length && lines[i].includes('|') && lines[i].trim()) { tbl.push(lines[i]); i++; }
        root.append(renderTableBlock(tbl));
        continue;
      }

      const hd = line.match(/^(#{1,4})\s+(.+)$/);
      if (hd) {
        const tag = hd[1].length <= 2 ? 'h4' : 'h5';
        const el = document.createElement(tag);
        el.className = 'demo-md-heading';
        appendInlineText(el, hd[2]);
        root.append(el);
        i++;
        continue;
      }

      if (/^\s*(?:-{3,}|\*{3,})\s*$/.test(line)) {
        root.append(document.createElement('hr'));
        i++;
        continue;
      }

      if (line.trimStart().startsWith('>')) {
        const q = document.createElement('blockquote');
        q.className = 'demo-quote';
        const parts = [];
        while (i < lines.length && lines[i].trimStart().startsWith('>')) {
          parts.push(lines[i].replace(/^\s*>\s?/, ''));
          i++;
        }
        const p = document.createElement('p');
        appendInlineText(p, parts.join(' '));
        q.append(p);
        root.append(q);
        continue;
      }

      if (/^\s*[-*]\s+/.test(line)) {
        const ul = document.createElement('ul');
        while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) {
          const li = document.createElement('li');
          appendInlineText(li, lines[i].replace(/^\s*[-*]\s+/, ''));
          ul.append(li);
          i++;
        }
        root.append(ul);
        continue;
      }

      if (/^\s*\d+\.\s+/.test(line)) {
        const ol = document.createElement('ol');
        while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
          const li = document.createElement('li');
          appendInlineText(li, lines[i].replace(/^\s*\d+\.\s+/, ''));
          ol.append(li);
          i++;
        }
        root.append(ol);
        continue;
      }

      const paraLines = [];
      while (
        i < lines.length &&
        lines[i].trim() &&
        !/^\s{0,3}(`{3,}|~{3,})/.test(lines[i]) &&
        !isDisplayMathLine(lines[i].trim()) &&
        !/^#{1,4}\s+/.test(lines[i]) &&
        !/^\s*[-*]\s+/.test(lines[i]) &&
        !/^\s*\d+\.\s+/.test(lines[i]) &&
        !lines[i].trimStart().startsWith('>')
      ) {
        paraLines.push(lines[i]);
        i++;
      }
      const p = document.createElement('p');
      appendInlineText(p, paraLines.join('\n'));
      root.append(p);
    }

    return root;
  }

  window.LearnethRender = { renderRichMarkdown };
})();
