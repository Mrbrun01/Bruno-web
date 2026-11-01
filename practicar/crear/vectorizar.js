'use strict';
/* =========================================================
   VECTORIZADOR DE ICONOS
   Convierte trazos a mano alzada (listas de puntos) en trazos SVG limpios:
     · las rectas salen rectas y se ajustan a 0°, 45° y 90° si van casi alineadas
     · las esquinas se calculan como cruce de rectas (quedan afiladas y exactas)
     · los círculos, elipses y rectángulos se reconocen y se dibujan perfectos
     · las curvas se ajustan a arcos de circunferencia o a curvas Bézier suaves
     · los extremos que casi se tocan se unen
   No usa el DOM: recibe puntos y devuelve datos, así que se puede probar aparte.

   vectorizeIcon(strokes, opts) → { paths, canvasPaths, scale, strokeWidth }
     strokes   [[{x,y}, …], …] en cualquier escala (se usa tal cual)
     opts      { strength 0..1, size, shapes, join }
     paths         «d» de cada trazo, ya centrados y escalados al icono de 24×24
     canvasPaths   los mismos trazos en las coordenadas del dibujo (para superponerlos)
   ========================================================= */
const vectorizeIcon = (() => {
  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const sub = (a, b) => ({ x: a.x - b.x, y: a.y - b.y });
  const add = (a, b) => ({ x: a.x + b.x, y: a.y + b.y });
  const mul = (a, k) => ({ x: a.x * k, y: a.y * k });
  const dot = (a, b) => a.x * b.x + a.y * b.y;
  const cross = (a, b) => a.x * b.y - a.y * b.x;
  const unit = (a) => { const l = Math.hypot(a.x, a.y) || 1; return { x: a.x / l, y: a.y / l }; };
  const deg = (r) => r * 180 / Math.PI;
  const rad = (d) => d * Math.PI / 180;
  const clone = (p) => ({ x: p.x, y: p.y });

  /* ---------- Preparación del trazo ---------- */
  function dedupe(pts, minD) {
    const out = [pts[0]];
    for (let i = 1; i < pts.length; i++) if (dist(pts[i], out[out.length - 1]) >= minD) out.push(pts[i]);
    if (out.length === 1 && pts.length > 1) out.push(pts[pts.length - 1]);
    return out;
  }
  function pathLength(pts) { let s = 0; for (let i = 1; i < pts.length; i++) s += dist(pts[i - 1], pts[i]); return s; }
  function resample(pts, step) {
    const out = [clone(pts[0])];
    let carry = 0;
    for (let i = 1; i < pts.length; i++) {
      let a = pts[i - 1]; const b = pts[i];
      let d = dist(a, b);
      while (carry + d >= step) {
        const t = (step - carry) / d;
        a = { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
        out.push(a); d = dist(a, b); carry = 0;
      }
      carry += d;
    }
    const last = pts[pts.length - 1];
    if (dist(out[out.length - 1], last) > step * 0.4) out.push(clone(last)); else out[out.length - 1] = clone(last);
    return out;
  }
  function smooth(pts, passes) {
    let cur = pts;
    for (let p = 0; p < passes; p++) {
      cur = cur.map((q, i) => (i === 0 || i === cur.length - 1) ? q : { x: (cur[i - 1].x + 2 * q.x + cur[i + 1].x) / 4, y: (cur[i - 1].y + 2 * q.y + cur[i + 1].y) / 4 });
    }
    return cur;
  }
  const bbox = (pts) => {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    pts.forEach((p) => { x0 = Math.min(x0, p.x); y0 = Math.min(y0, p.y); x1 = Math.max(x1, p.x); y1 = Math.max(y1, p.y); });
    return { x0, y0, x1, y1, w: x1 - x0, h: y1 - y0 };
  };

  /* ---------- Ajustes de rectas y círculos ---------- */
  function lineFit(pts) {
    let cx = 0, cy = 0; pts.forEach((p) => { cx += p.x; cy += p.y; }); cx /= pts.length; cy /= pts.length;
    let sxx = 0, syy = 0, sxy = 0;
    pts.forEach((p) => { const dx = p.x - cx, dy = p.y - cy; sxx += dx * dx; syy += dy * dy; sxy += dx * dy; });
    const th = 0.5 * Math.atan2(2 * sxy, sxx - syy);
    return { c: { x: cx, y: cy }, d: { x: Math.cos(th), y: Math.sin(th) } };
  }
  const lineDev = (pts, a, b) => {
    const L = dist(a, b); if (L < 1e-6) return 0;
    const n = { x: -(b.y - a.y) / L, y: (b.x - a.x) / L };
    let m = 0; pts.forEach((p) => { m = Math.max(m, Math.abs(dot(sub(p, a), n))); }); return m;
  };
  const project = (p, line) => add(line.c, mul(line.d, dot(sub(p, line.c), line.d)));
  function intersect(l1, l2) {
    const den = cross(l1.d, l2.d);
    if (Math.abs(den) < 0.2) return null;                        // casi paralelas (< ~11°)
    const t = cross(sub(l2.c, l1.c), l2.d) / den;
    return add(l1.c, mul(l1.d, t));
  }
  function circleFit(pts) {
    let sx = 0, sy = 0, sxx = 0, syy = 0, sxy = 0, sz = 0, sxz = 0, syz = 0; const n = pts.length;
    pts.forEach((p) => { const z = p.x * p.x + p.y * p.y; sx += p.x; sy += p.y; sxx += p.x * p.x; syy += p.y * p.y; sxy += p.x * p.y; sz += z; sxz += p.x * z; syz += p.y * z; });
    const M = [[sxx, sxy, sx], [sxy, syy, sy], [sx, sy, n]], B = [-sxz, -syz, -sz];
    const det3 = (m) => m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1]) - m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0]) + m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0]);
    const D = det3(M); if (Math.abs(D) < 1e-9) return null;
    const rep = (k) => M.map((row, i) => row.map((v, j) => (j === k ? B[i] : v)));
    const A = det3(rep(0)) / D, Bc = det3(rep(1)) / D, C = det3(rep(2)) / D;
    const cx = -A / 2, cy = -Bc / 2, r2 = cx * cx + cy * cy - C;
    if (!(r2 > 0)) return null;
    return { cx, cy, r: Math.sqrt(r2) };
  }

  /* ---------- Ajuste de curvas Bézier (Schneider, «Graphics Gems») ---------- */
  const bez = (b, t) => { const u = 1 - t; return { x: u * u * u * b[0].x + 3 * u * u * t * b[1].x + 3 * u * t * t * b[2].x + t * t * t * b[3].x, y: u * u * u * b[0].y + 3 * u * u * t * b[1].y + 3 * u * t * t * b[2].y + t * t * t * b[3].y }; };
  const bez1 = (b, t) => { const u = 1 - t; return { x: 3 * u * u * (b[1].x - b[0].x) + 6 * u * t * (b[2].x - b[1].x) + 3 * t * t * (b[3].x - b[2].x), y: 3 * u * u * (b[1].y - b[0].y) + 6 * u * t * (b[2].y - b[1].y) + 3 * t * t * (b[3].y - b[2].y) }; };
  const bez2 = (b, t) => { const u = 1 - t; return { x: 6 * u * (b[2].x - 2 * b[1].x + b[0].x) + 6 * t * (b[3].x - 2 * b[2].x + b[1].x), y: 6 * u * (b[2].y - 2 * b[1].y + b[0].y) + 6 * t * (b[3].y - 2 * b[2].y + b[1].y) }; };
  function chordParams(d) {
    const u = [0]; for (let i = 1; i < d.length; i++) u.push(u[i - 1] + dist(d[i], d[i - 1]));
    const L = u[u.length - 1] || 1; return u.map((v) => v / L);
  }
  function genBezier(d, u, t1, t2) {
    const p0 = d[0], p3 = d[d.length - 1];
    let c00 = 0, c01 = 0, c11 = 0, x0 = 0, x1 = 0;
    for (let i = 0; i < d.length; i++) {
      const t = u[i], m = 1 - t, b0 = m * m * m, b1 = 3 * t * m * m, b2 = 3 * t * t * m, b3 = t * t * t;
      const a0 = mul(t1, b1), a1 = mul(t2, b2);
      c00 += dot(a0, a0); c01 += dot(a0, a1); c11 += dot(a1, a1);
      const tmp = sub(d[i], add(mul(p0, b0 + b1), mul(p3, b2 + b3)));
      x0 += dot(a0, tmp); x1 += dot(a1, tmp);
    }
    const det = c00 * c11 - c01 * c01;
    const al = det === 0 ? 0 : (x0 * c11 - x1 * c01) / det, ar = det === 0 ? 0 : (c00 * x1 - c01 * x0) / det;
    const seg = dist(p0, p3), eps = 1e-6 * seg;
    if (al < eps || ar < eps) { const k = seg / 3; return [p0, add(p0, mul(t1, k)), add(p3, mul(t2, k)), p3]; }
    return [p0, add(p0, mul(t1, al)), add(p3, mul(t2, ar)), p3];
  }
  function reparam(b, d, u) {
    return u.map((t, i) => {
      const q = bez(b, t), q1 = bez1(b, t), q2 = bez2(b, t), df = sub(q, d[i]);
      const num = dot(df, q1), den = dot(q1, q1) + dot(df, q2);
      return den === 0 ? t : Math.min(1, Math.max(0, t - num / den));
    });
  }
  function maxErr(d, b, u) {
    let m = 0, at = Math.floor(d.length / 2);
    for (let i = 1; i < d.length - 1; i++) { const e = dist(bez(b, u[i]), d[i]); if (e > m) { m = e; at = i; } }
    return { m, at };
  }
  function fitCubic(d, t1, t2, err, out, depth) {
    if (d.length === 2) { const k = dist(d[0], d[1]) / 3; out.push([d[0], add(d[0], mul(t1, k)), add(d[1], mul(t2, k)), d[1]]); return; }
    let u = chordParams(d), b = genBezier(d, u, t1, t2), e = maxErr(d, b, u);
    if (e.m < err) { out.push(b); return; }
    if (e.m < err * 4) {
      for (let i = 0; i < 4; i++) {
        u = reparam(b, d, u); b = genBezier(d, u, t1, t2); e = maxErr(d, b, u);
        if (e.m < err) { out.push(b); return; }
      }
    }
    if (depth > 12) { out.push(b); return; }
    const at = Math.min(d.length - 2, Math.max(1, e.at));
    const tc = unit(sub(d[at - 1], d[at + 1]));
    fitCubic(d.slice(0, at + 1), t1, tc, err, out, depth + 1);
    fitCubic(d.slice(at), mul(tc, -1), t2, err, out, depth + 1);
  }
  function fitBezierChain(pts, err, tStart, tEnd) {
    const k = Math.min(4, pts.length - 1);
    const t1 = tStart || unit(sub(pts[k], pts[0]));
    const t2 = tEnd || unit(sub(pts[pts.length - 1 - k], pts[pts.length - 1]));
    const out = []; fitCubic(pts, t1, t2, err, out, 0);
    return out.map((c) => ({ t: 'C', a: c[0], c1: c[1], c2: c[2], b: c[3] }));
  }

  /* ---------- Esquinas ---------- */
  function angleBetween(a, b) {
    const la = Math.hypot(a.x, a.y), lb = Math.hypot(b.x, b.y); if (!la || !lb) return 0;
    return deg(Math.acos(Math.max(-1, Math.min(1, dot(a, b) / (la * lb)))));
  }
  /* Una esquina concentra el giro en poco recorrido: el ángulo con una ventana corta se parece al
     de la ventana larga. En una curva suave el giro crece con la ventana (la corta mide ~la mitad). */
  function findCorners(pts, closed, w, thr, ratio) {
    const n = pts.length, m = closed ? n - 1 : n, ws = Math.max(2, Math.round(w * 0.5));
    const at = (i) => (closed ? pts[((i % m) + m) % m] : pts[Math.max(0, Math.min(n - 1, i))]);
    const turn = (i, k) => angleBetween(sub(at(i), at(i - k)), sub(at(i + k), at(i)));
    const ang = new Array(m).fill(0);
    for (let i = 0; i < m; i++) {
      if (!closed && (i < w || i > n - 1 - w)) continue;
      const big = turn(i, w);
      if (big >= thr && turn(i, ws) >= big * ratio) ang[i] = big;
    }
    const cand = [];
    for (let i = 0; i < m; i++) {
      if (ang[i] <= 0) continue;
      let best = true;
      for (let k = -w; k <= w; k++) {
        const j = closed ? ((i + k) % m + m) % m : i + k;
        if (j < 0 || j >= m || j === i) continue;
        if (ang[j] > ang[i] || (ang[j] === ang[i] && k < 0)) { best = false; break; }
      }
      if (best) cand.push(i);
    }
    return cand;
  }

  /* ---------- Construcción de un trazo ---------- */
  const snapAngle = (th, tol) => { const k = Math.round(th / 45) * 45; return Math.abs(th - k) <= tol ? k : th; };
  const foldDeg = (th) => { let t = th % 180; if (t > 90) t -= 180; if (t <= -90) t += 180; return t; };

  function buildStroke(raw, P) {
    let pts = dedupe(raw, 0.8);
    if (pts.length < 2) return null;
    const len0 = pathLength(pts);
    const bb0 = bbox(pts);
    if (len0 < P.dotLen || Math.hypot(bb0.w, bb0.h) < P.dotLen) {
      const c = { x: (bb0.x0 + bb0.x1) / 2, y: (bb0.y0 + bb0.y1) / 2 };
      return { kind: 'dot', p: c };
    }
    pts = smooth(resample(pts, P.step), P.smoothPasses);
    if (pts.length < 3) return { kind: 'path', closed: false, segs: [{ t: 'L', a: pts[0], b: pts[pts.length - 1] }] };

    const len = pathLength(pts), gap = dist(pts[0], pts[pts.length - 1]);
    const closed = pts.length >= 10 && gap <= Math.max(P.closeGap, len * 0.07) && len > gap * 3;
    if (closed) pts[pts.length - 1] = clone(pts[0]);

    /* Formas cerradas: elipse o círculo */
    if (closed && P.shapes) {
      const b = bbox(pts), rx = b.w / 2, ry = b.h / 2;
      if (rx > P.dotLen && ry > P.dotLen) {
        const cx = (b.x0 + b.x1) / 2, cy = (b.y0 + b.y1) / 2;
        let mean = 0, mx = 0; const angs = [];
        pts.forEach((p) => { const q = Math.hypot((p.x - cx) / rx, (p.y - cy) / ry); const e = Math.abs(q - 1); mean += e; mx = Math.max(mx, e); angs.push(Math.atan2(p.y - cy, p.x - cx)); });
        mean /= pts.length;
        angs.sort((p, q) => p - q);
        let gapA = 2 * Math.PI - (angs[angs.length - 1] - angs[0]);
        for (let i = 1; i < angs.length; i++) gapA = Math.max(gapA, angs[i] - angs[i - 1]);
        if (mean <= P.ellMean && mx <= P.ellMax && gapA < rad(40)) {
          const round = Math.abs(rx - ry) / Math.max(rx, ry) <= P.circleTol;
          const r = (rx + ry) / 2;
          return { kind: 'ellipse', cx, cy, rx: round ? r : rx, ry: round ? r : ry };
        }
      }
    }

    /* Esquinas y segmentos */
    /* La ventana de análisis se adapta al tamaño del trazo (una puerta pequeña dentro de una casa grande) */
    const own = Math.max(bb0.w, bb0.h) * P.cornerWinK;
    const w = Math.max(2, Math.min(Math.round(Math.min(P.cornerWin, Math.max(8, own)) / P.step), pts.length >> 2));
    let work = pts, bounds, smoothRing = false;
    const corners = findCorners(pts, closed, w, P.cornerDeg, P.cornerRatio);
    if (!closed) {
      bounds = [0, ...corners, pts.length - 1];
    } else if (!corners.length) {
      bounds = [0, pts.length - 1]; smoothRing = true;
    } else {
      const m = pts.length - 1, c0 = corners[0];
      work = []; for (let k = 0; k <= m; k++) work.push(pts[(c0 + k) % m]);
      bounds = [0, ...corners.slice(1).map((c) => (c - c0 + m) % m), m];
    }
    const segsRaw = [];
    for (let i = 0; i < bounds.length - 1; i++) {
      const sp = work.slice(bounds[i], bounds[i + 1] + 1);
      const a = sp[0], b = sp[sp.length - 1], L = dist(a, b);
      const isLine = !smoothRing && (sp.length < 4 || (L > 1e-6 && lineDev(sp, a, b) <= Math.max(L * P.lineRatio, P.lineAbs)));
      segsRaw.push({ pts: sp, isLine, line: null });
    }

    /* Rectas: dirección por mínimos cuadrados y ajuste de ángulo */
    for (let i = 0; i < segsRaw.length - 1 && segsRaw.length > (closed ? 2 : 1);) {            // dos curvas que caben en una sola Bézier no tenían esquina de verdad
      const s1 = segsRaw[i], s2 = segsRaw[i + 1];
      if (!s1.isLine && !s2.isLine) {
        const mp = s1.pts.concat(s2.pts.slice(1));
        if (mp.length >= 6 && fitBezierChain(mp, P.bezErr * 1.2).length === 1) { segsRaw.splice(i, 2, { pts: mp, isLine: false, line: null }); continue; }
      }
      i++;
    }
    for (let i = 0; i < segsRaw.length - 1 && segsRaw.length > (closed ? 3 : 1);) {            // una esquina entre dos rectas que juntas son una recta no es esquina
      const s1 = segsRaw[i], s2 = segsRaw[i + 1];
      if (s1.isLine && s2.isLine) {
        const mp = s1.pts.concat(s2.pts.slice(1)), a0 = mp[0], b0 = mp[mp.length - 1], L0 = dist(a0, b0);
        if (L0 > 1e-6 && lineDev(mp, a0, b0) <= Math.max(L0 * P.lineRatio * 0.5, P.lineAbs * 0.6)) { segsRaw.splice(i, 2, { pts: mp, isLine: true, line: null }); continue; }
      }
      i++;
    }
    segsRaw.forEach((s) => {
      if (!s.isLine) return;
      const f = lineFit(s.pts); let d = f.d;
      if (dot(d, sub(s.pts[s.pts.length - 1], s.pts[0])) < 0) d = mul(d, -1);
      s.theta = deg(Math.atan2(d.y, d.x)); s.c = f.c;
    });
    const allLines = segsRaw.every((s) => s.isLine);
    if (closed && allLines && segsRaw.length === 4) {            // ¿rectángulo (o rombo girado)?
      let sx = 0, sy = 0, okRight = true;
      segsRaw.forEach((s, i) => {
        const nx = segsRaw[(i + 1) % 4];
        let dlt = Math.abs(foldDeg(nx.theta - s.theta)); if (Math.abs(dlt - 90) > P.rectTol) okRight = false;
        sx += Math.cos(rad(4 * s.theta)); sy += Math.sin(rad(4 * s.theta));
      });
      if (okRight) {
        let phi = deg(Math.atan2(sy, sx)) / 4; phi = snapAngle(phi, P.snapDeg);
        segsRaw.forEach((s) => { s.theta = phi + 90 * Math.round((s.theta - phi) / 90); });
      }
    }
    segsRaw.forEach((s) => {
      if (!s.isLine) return;
      if (P.snap) s.theta = snapAngle(s.theta, P.snapDeg);
      s.line = { c: s.c, d: { x: Math.cos(rad(s.theta)), y: Math.sin(rad(s.theta)) } };
    });

    /* Vértices: cruce de rectas contiguas (si una es curva, el punto se proyecta sobre la recta) */
    const nS = segsRaw.length;
    const joint = (prev, next, orig) => {
      if (prev && next && prev.line && next.line) {
        const x = intersect(prev.line, next.line);
        return x && dist(x, orig) <= P.maxShift ? x : project(orig, prev.line);
      }
      if (prev && prev.line) return project(orig, prev.line);
      if (next && next.line) return project(orig, next.line);
      return clone(orig);
    };
    const V = [];
    if (closed) {
      for (let i = 0; i < nS; i++) V.push(joint(segsRaw[(i - 1 + nS) % nS], segsRaw[i], segsRaw[i].pts[0]));
      V.push(V[0]);
    } else {
      for (let i = 0; i <= nS; i++) {
        const prev = i > 0 ? segsRaw[i - 1] : null, next = i < nS ? segsRaw[i] : null;
        V.push(joint(prev, next, prev ? prev.pts[prev.pts.length - 1] : next.pts[0]));
      }
    }

    /* Segmentos finales */
    const segs = [];
    segsRaw.forEach((s, i) => {
      const a = V[i], b = V[i + 1];
      if (s.isLine) { segs.push({ t: 'L', a, b }); return; }
      const data = s.pts.slice(); data[0] = a; data[data.length - 1] = b;
      if (!smoothRing && P.arcs) { const arc = tryArc(data, P); if (arc) { segs.push(arc); return; } }
      let t1 = null, t2 = null;
      if (smoothRing) {
        const m = data.length - 1, k = Math.max(2, Math.min(4, m >> 2));
        t1 = unit(sub(data[k], data[m - k])); t2 = mul(t1, -1);
      }
      fitBezierChain(data, P.bezErr, t1, t2).forEach((c) => segs.push(c));
    });
    return { kind: 'path', closed, segs };
  }

  function tryArc(data, P) {
    if (data.length < 6) return null;
    const c = circleFit(data); if (!c) return null;
    if (c.r < P.dotLen * 1.5 || c.r > P.ref * 5) return null;
    let me = 0; data.forEach((p) => { me = Math.max(me, Math.abs(Math.hypot(p.x - c.cx, p.y - c.cy) - c.r)); });
    if (me > P.arcErr) return null;
    let tot = 0, prev = Math.atan2(data[0].y - c.cy, data[0].x - c.cx);
    for (let i = 1; i < data.length; i++) {
      const a = Math.atan2(data[i].y - c.cy, data[i].x - c.cx); let d = a - prev;
      while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI;
      tot += d; prev = a;
    }
    if (Math.abs(tot) < rad(25) || Math.abs(tot) > rad(340)) return null;
    return { t: 'A', a: data[0], b: data[data.length - 1], r: c.r, large: Math.abs(tot) > Math.PI ? 1 : 0, sweep: tot > 0 ? 1 : 0 };
  }

  /* ---------- Unión de extremos entre trazos ---------- */
  function weld(strokes, P) {
    const open = strokes.filter((s) => s.kind === 'path' && !s.closed);
    const ends = [];
    open.forEach((s) => { ends.push({ s, which: 'start', p: s.segs[0].a }); ends.push({ s, which: 'end', p: s.segs[s.segs.length - 1].b }); });
    const used = new Set();
    const move = (e, np) => {
      const seg = e.which === 'start' ? e.s.segs[0] : e.s.segs[e.s.segs.length - 1];
      const key = e.which === 'start' ? 'a' : 'b', dlt = sub(np, seg[key]);
      seg[key] = clone(np);
      if (seg.t === 'C') { const c = e.which === 'start' ? 'c1' : 'c2'; seg[c] = add(seg[c], dlt); }
      e.p = seg[key];
    };
    ends.forEach((e, i) => {
      if (used.has(i)) return;
      const group = [i];
      ends.forEach((o, j) => { if (j > i && !used.has(j) && o.s !== e.s && dist(o.p, e.p) <= P.weld) group.push(j); });
      if (group.length > 1) {
        let cx = 0, cy = 0; group.forEach((g) => { cx += ends[g].p.x; cy += ends[g].p.y; });
        const c = { x: cx / group.length, y: cy / group.length };
        group.forEach((g) => { used.add(g); move(ends[g], c); });
      }
    });
    ends.forEach((e, i) => {                                       // extremos suelto → vértice o recta cercana de otro trazo
      if (used.has(i)) return;
      let best = null, bd = P.weld;
      strokes.forEach((o) => {
        if (o === e.s || o.kind !== 'path') return;
        o.segs.forEach((sg, k) => {
          [sg.a, sg.b].forEach((v) => { const d = dist(v, e.p); if (d < bd) { bd = d; best = v; } });
          if (sg.t === 'L') {
            const ab = sub(sg.b, sg.a), L2 = dot(ab, ab); if (L2 < 1e-6) return;
            const t = dot(sub(e.p, sg.a), ab) / L2; if (t < 0.02 || t > 0.98) return;
            const q = add(sg.a, mul(ab, t)), d = dist(q, e.p); if (d < bd * 0.999) { bd = d; best = q; }
          }
        });
      });
      if (best) move(e, best);
    });
    strokes.forEach((s) => { if (s.kind === 'path') for (let i = 1; i < s.segs.length; i++) s.segs[i].a = s.segs[i - 1].b; });
  }

  /* ---------- Geometría de salida ---------- */
  function sampleBounds(prims) {
    const pts = [];
    prims.forEach((s) => {
      if (s.kind === 'dot') pts.push(s.p);
      else if (s.kind === 'ellipse') { pts.push({ x: s.cx - s.rx, y: s.cy - s.ry }, { x: s.cx + s.rx, y: s.cy + s.ry }); }
      else s.segs.forEach((g) => {
        pts.push(g.a, g.b);
        if (g.t === 'C') for (let t = 0.1; t < 1; t += 0.1) pts.push(bez([g.a, g.c1, g.c2, g.b], t));
        if (g.t === 'A') {                                          // puntos del arco
          const ch = sub(g.b, g.a), L = Math.hypot(ch.x, ch.y) || 1, r = Math.max(g.r, L / 2);
          const h = Math.sqrt(Math.max(0, r * r - L * L / 4)), mid = mul(add(g.a, g.b), 0.5), nrm = { x: -ch.y / L, y: ch.x / L };
          const sign = (g.large ? 1 : -1) * (g.sweep ? 1 : -1);
          const c = add(mid, mul(nrm, h * sign));
          const a0 = Math.atan2(g.a.y - c.y, g.a.x - c.x); let d = Math.atan2(g.b.y - c.y, g.b.x - c.x) - a0;
          if (g.sweep && d < 0) d += 2 * Math.PI; if (!g.sweep && d > 0) d -= 2 * Math.PI;
          if (g.large && Math.abs(d) < Math.PI) d += g.sweep ? 2 * Math.PI : -2 * Math.PI;
          for (let k = 1; k < 12; k++) { const a = a0 + d * k / 12; pts.push({ x: c.x + r * Math.cos(a), y: c.y + r * Math.sin(a) }); }
        }
      });
    });
    return bbox(pts);
  }
  const fmt = (n) => { const r = Math.round(n * 100) / 100; return Object.is(r, -0) ? '0' : String(r); };
  function emit(s, T) {
    const X = (p) => fmt((p.x - T.cx) * T.k + T.ox) + ' ' + fmt((p.y - T.cy) * T.k + T.oy);
    if (s.kind === 'dot') return 'M' + X(s.p) + 'h.01';
    if (s.kind === 'ellipse') {
      const rx = fmt(s.rx * T.k), ry = fmt(s.ry * T.k);
      return 'M' + X({ x: s.cx - s.rx, y: s.cy }) + 'A' + rx + ' ' + ry + ' 0 1 0 ' + X({ x: s.cx + s.rx, y: s.cy }) + 'A' + rx + ' ' + ry + ' 0 1 0 ' + X({ x: s.cx - s.rx, y: s.cy }) + 'Z';
    }
    let d = 'M' + X(s.segs[0].a);
    s.segs.forEach((g) => {
      if (g.t === 'L') d += 'L' + X(g.b);
      else if (g.t === 'C') d += 'C' + X(g.c1) + ' ' + X(g.c2) + ' ' + X(g.b);
      else d += 'A' + fmt(g.r * T.k) + ' ' + fmt(g.r * T.k) + ' 0 ' + g.large + ' ' + g.sweep + ' ' + X(g.b);
    });
    return d + (s.closed ? 'Z' : '');
  }

  /* ---------- Entrada principal ---------- */
  return function vectorizeIcon(strokes, opts) {
    const o = Object.assign({ strength: 0.5, size: 400, shapes: true, join: true, snap: true }, opts || {});
    const s = Math.max(0, Math.min(1, o.strength));
    const valid = (strokes || []).filter((st) => st && st.length >= 2);
    const all = [].concat(...valid);
    if (!all.length) return { paths: [], canvasPaths: [], scale: 1, strokeWidth: 1.8 };
    const bb = bbox(all);
    const ref = Math.max(Math.max(bb.w, bb.h), o.size * 0.3);
    const P = {
      ref, step: Math.max(1.2, ref / 70), dotLen: Math.max(3, ref * 0.03),
      closeGap: ref * 0.09, cornerWinK: 0.2, cornerDeg: 40 - 4 * s,
      lineRatio: 0.03 + 0.07 * s, lineAbs: ref * (0.008 + 0.01 * s),
      snapDeg: 3 + 9 * s, snap: o.snap, rectTol: 14 + 14 * s, maxShift: ref * 0.14,
      bezErr: ref * (0.008 + 0.018 * s), arcErr: ref * (0.008 + 0.014 * s), arcs: true,
      ellMean: 0.05 + 0.06 * s, ellMax: 0.17 + 0.1 * s, circleTol: 0.06 + 0.08 * s,
      shapes: o.shapes, weld: ref * (0.015 + 0.055 * s), smoothPasses: 2, cornerRatio: 0.7
    };
    if (o.tune) Object.assign(P, o.tune);
    P.cornerWin = Math.max(8, ref * P.cornerWinK);
    const prims = valid.map((st) => buildStroke(st, P)).filter(Boolean);
    if (o.join && prims.length > 1) weld(prims, P);

    const b = sampleBounds(prims);
    const pad = 3, box = 24 - 2 * pad;
    const k = (b.w < 1e-6 && b.h < 1e-6) ? 1 : Math.min(box / Math.max(b.w, 1e-6), box / Math.max(b.h, 1e-6));
    const T = { cx: (b.x0 + b.x1) / 2, cy: (b.y0 + b.y1) / 2, k, ox: 12, oy: 12 };
    const T0 = { cx: 0, cy: 0, k: 1, ox: 0, oy: 0 };
    return { paths: prims.map((p) => emit(p, T)), canvasPaths: prims.map((p) => emit(p, T0)), scale: k, strokeWidth: 1.8 };
  };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = { vectorizeIcon };
