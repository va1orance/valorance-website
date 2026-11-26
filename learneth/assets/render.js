'use strict';
(() => {
  const SVG_NS = 'http://www.w3.org/2000/svg';
  const MAX_CHART_SERIES = 6;
  const MAX_CHART_POINTS = 24;
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
        g.append(svgEl('rect', { x: b.x, y: b.y, width: b.w, height: b.h, rx, fill: 'currentColor', 'fill-opacity': '0.06', stroke: 'currentColor', 'stroke-opacity': '0.32', 'stroke-width': '1.4' }));
      }
      const txt = svgEl('text', { 'text-anchor': 'middle', fill: 'currentColor', 'font-size': 12 });
      const lh = 16, y0 = b.cy - ((d.lines.length - 1) * lh) / 2 + 4;
      d.lines.forEach((line, i) => txt.append(svgEl('tspan', { x: b.cx, y: y0 + i * lh }, line)));
      g.append(txt);
      svg.append(g);
    }
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
        svg.append(svgEl('line', { x1: cx, y1: top, x2: cx, y2: bot, stroke: 'currentColor', 'stroke-opacity': '0.28', 'stroke-dasharray': '4 4', 'stroke-linecap': 'round' }));
        for (const y of [pad, bot]) {
          svg.append(svgEl('rect', { x: cx - bw / 2, y, width: bw, height: boxH, rx: 8, fill: 'currentColor', 'fill-opacity': '0.06', stroke: 'currentColor', 'stroke-opacity': '0.32', 'stroke-width': '1.3' }));
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
      let title = tm && tm[1] ? tm[1].trim() : '';
      const slices = [];
      for (let i = 1; i < lines.length; i++) {
        const l = lines[i].trim();
        const tl = l.match(/^title\s+(.+)$/i);
        if (tl) { title = tl[1].trim(); continue; }
        const sm = l.match(/^"([^"]+)"\s*:\s*([0-9]+(?:\.[0-9]+)?)$/);
        if (sm) { const v = Number(sm[2]); if (Number.isFinite(v) && v > 0) slices.push({ label: sm[1], value: v }); }
      }
      const total = slices.reduce((s, x) => s + x.value, 0);
      if (!slices.length || total <= 0) return { title: 'Mermaid · Pie chart', svg: null, error: 'No slices parsed.' };
      const svgW = 460, svgH = Math.max(210, (title ? 44 : 24) + slices.length * 24 + 24);
      const svg = svgEl('svg', { viewBox: `0 0 ${svgW} ${svgH}`, width: svgW, height: svgH, role: 'img', 'aria-label': title || 'Pie chart' });
      if (title) svg.append(svgEl('text', { x: 16, y: 26, fill: 'currentColor', 'font-size': 13, 'font-weight': '600' }, title));
      let angle = -Math.PI / 2;
      const cx = 115, cy = title ? 124 : 104, r = 78;
      slices.forEach((s, idx) => {
        const frac = s.value / total, sweep = frac * Math.PI * 2, fill = PALETTE[idx % PALETTE.length];
        if (slices.length === 1) svg.append(svgEl('circle', { cx, cy, r, fill }));
        else {
          const x1 = cx + r * Math.cos(angle), y1 = cy + r * Math.sin(angle);
          const x2 = cx + r * Math.cos(angle + sweep), y2 = cy + r * Math.sin(angle + sweep);
          svg.append(svgEl('path', { d: `M ${cx} ${cy} L ${x1.toFixed(2)} ${y1.toFixed(2)} A ${r} ${r} 0 ${sweep > Math.PI ? 1 : 0} 1 ${x2.toFixed(2)} ${y2.toFixed(2)} Z`, fill }));
        }
        angle += sweep;
        const ly = (title ? 50 : 30) + idx * 24;
        svg.append(svgEl('rect', { x: 222, y: ly - 10, width: 12, height: 12, rx: 3, fill }));
        svg.append(svgEl('text', { x: 242, y: ly, fill: 'currentColor', 'font-size': 12 }, `${s.label} (${(frac * 100).toFixed(1)}%)`));
      });
      return { title: 'Mermaid · Pie chart', svg };
    }

    return { title: `Mermaid · ${first.split(/\s+/)[0]}`, svg: null, error: `Unsupported Mermaid diagram type "${first.split(/\s+/)[0]}". Showing source.` };
  }

  function buildChartSvg(spec) {
    const labels = Array.isArray(spec.labels) ? spec.labels.slice(0, MAX_CHART_POINTS).map(String) : [];
    const rawSeries = Array.isArray(spec.series)
      ? spec.series.slice(0, MAX_CHART_SERIES)
      : Array.isArray(spec.values)
        ? [{ name: spec.title || 'Value', data: spec.values }]
        : [];
    const normalizedSeries = rawSeries
      .map((s, idx) => ({
        name: String(s?.name || `Series ${idx + 1}`).slice(0, 40),
        data: (Array.isArray(s?.data) ? s.data : []).slice(0, labels.length || MAX_CHART_POINTS).map(Number),
      }))
      .filter(s => s.data.length > 0 && s.data.every(Number.isFinite));
    if (!labels.length || !normalizedSeries.length) return null;

    const allVals = normalizedSeries.flatMap(s => s.data);
    const maxV = Math.max(1, ...allVals, 0);
    const minV = Math.min(0, ...allVals);
    const span = maxV - minV || 1;
    const svgW = 540, svgH = 260, padL = 48, padR = 20, padT = 26, padB = 46;
    const plotW = svgW - padL - padR, plotH = svgH - padT - padB;
    const svg = svgEl('svg', { viewBox: `0 0 ${svgW} ${svgH}`, width: svgW, height: svgH, role: 'img', 'aria-label': spec.title || 'Chart' });

    for (let g = 0; g <= 4; g++) {
      const val = minV + (span * g) / 4;
      const y = padT + plotH - (plotH * g) / 4;
      svg.append(svgEl('line', { x1: padL, y1: y, x2: svgW - padR, y2: y, stroke: 'currentColor', 'stroke-opacity': '0.16' }));
      svg.append(svgEl('text', { x: padL - 6, y: y + 4, 'text-anchor': 'end', fill: 'currentColor', opacity: '0.68', 'font-size': 10 }, String(Number(val.toFixed(1)))));
    }
    svg.append(svgEl('line', { x1: padL, y1: padT, x2: padL, y2: padT + plotH, stroke: 'currentColor', 'stroke-opacity': '0.45' }));
    svg.append(svgEl('line', { x1: padL, y1: padT + plotH, x2: svgW - padR, y2: padT + plotH, stroke: 'currentColor', 'stroke-opacity': '0.45' }));

    const isLine = spec.type === 'line';
    const slotW = plotW / labels.length;
    labels.forEach((lbl, idx) => {
      const cx = padL + slotW * idx + slotW / 2;
      svg.append(svgEl('text', { x: cx, y: padT + plotH + 18, 'text-anchor': 'middle', fill: 'currentColor', opacity: '0.78', 'font-size': 11 }, lbl.slice(0, 14)));
    });

    const yOf = v => padT + plotH - ((v - minV) / span) * plotH;
    normalizedSeries.forEach((ser, sIdx) => {
      const color = PALETTE[sIdx % PALETTE.length];
      if (isLine) {
        const pts = ser.data.map((v, i) => `${(padL + slotW * i + slotW / 2).toFixed(1)},${yOf(v).toFixed(1)}`).join(' ');
        svg.append(svgEl('polyline', { points: pts, fill: 'none', stroke: color, 'stroke-width': '2.2', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }));
        ser.data.forEach((v, i) => {
          svg.append(svgEl('circle', { cx: padL + slotW * i + slotW / 2, cy: yOf(v), r: 3.5, fill: color }));
        });
      } else {
        const zeroY = yOf(0);
        const bw = Math.max(8, Math.min(34, (slotW * 0.72) / normalizedSeries.length));
        const startOff = -(bw * normalizedSeries.length) / 2;
        ser.data.forEach((v, i) => {
          const cx = padL + slotW * i + slotW / 2;
          const vy = yOf(v);
          svg.append(svgEl('rect', {
            x: cx + startOff + sIdx * bw, y: Math.min(vy, zeroY),
            width: Math.max(4, bw - 2), height: Math.max(1, Math.abs(zeroY - vy)),
            rx: 4, fill: color,
          }));
        });
      }
    });
    return svg;
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
    if (lang === 'learneth-chart') {
      try {
        const spec = JSON.parse(trimmed);
        const svg = buildChartSvg(spec || {});
        if (svg) return makeDiagramCard(spec.title || 'Chart', svg, trimmed);
      } catch {}
      return makeDiagramCard('Chart', null, trimmed, 'Invalid chart JSON; showing source.');
    }
    if (trimmed.startsWith('{')) {
      try {
        const obj = JSON.parse(trimmed);
        if (obj && typeof obj === 'object') {
          if (obj.type === 'bar' || obj.type === 'line' || Array.isArray(obj.series) || Array.isArray(obj.values)) {
            const chartSvg = buildChartSvg(obj);
            if (chartSvg) return makeDiagramCard(String(obj.title || 'Chart'), chartSvg, trimmed);
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

  function appendInlineText(parent, text) {
    const str = String(text || '');
    const re = /(`[^`\n]+`|\*\*[^*\n]+\*\*|\*[^*\n]+\*)/g;
    let last = 0;
    let m;
    while ((m = re.exec(str)) !== null) {
      if (m.index > last) parent.append(document.createTextNode(str.slice(last, m.index)));
      const tok = m[0];
      if (tok.startsWith('`')) {
        const el = document.createElement('code');
        el.textContent = tok.slice(1, -1);
        parent.append(el);
      } else if (tok.startsWith('**')) {
        const el = document.createElement('strong');
        el.textContent = tok.slice(2, -2);
        parent.append(el);
      } else {
        const el = document.createElement('em');
        el.textContent = tok.slice(1, -1);
        parent.append(el);
      }
      last = m.index + tok.length;
    }
    if (last < str.length) parent.append(document.createTextNode(str.slice(last)));
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

  function renderRichMarkdown(text) {
    const root = document.createElement('div');
    root.className = 'demo-md';
    const lines = String(text || '').replace(/\r\n/g, '\n').split('\n');
    let i = 0;

    while (i < lines.length) {
      const line = lines[i];
      if (!line.trim()) { i++; continue; }

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
        if (lang === 'mermaid' || lang === 'learneth-diagram' || lang === 'learneth-chart') {
          root.append(renderDiagramFence(lang, rawCode));
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
