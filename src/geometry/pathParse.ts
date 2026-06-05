import type { Point } from "../core/viewport/Viewport";
import type { Anchor, SubPath } from "./path";

/**
 * Parse an SVG path `d` string into the sub-path/anchor model. Supports
 * M/L/H/V/C/S/Q/T/Z (absolute and relative); quadratics are promoted to cubics
 * and arcs (A) fall back to a straight line to their endpoint. This subset
 * covers everything CraftScape emits plus the overwhelming majority of imports.
 */
interface State {
  subs: SubPath[];
  sub: SubPath | null;
  cur: Point;
  start: Point;
  cubicCtrl: Point | null;
  quadCtrl: Point | null;
}

type Token = string | number;

function tokenize(d: string): Token[] {
  const re = /([astvzqmhlcASTVZQMHLC])|(-?\d*\.?\d+(?:[eE][-+]?\d+)?)/g;
  const out: Token[] = [];
  for (let m = re.exec(d); m; m = re.exec(d)) out.push(m[1] ? m[1] : Number(m[2]));
  return out;
}

function pair(st: State, n: Token[], p: number, rel: boolean): Point {
  return { x: (rel ? st.cur.x : 0) + Number(n[p]), y: (rel ? st.cur.y : 0) + Number(n[p + 1]) };
}

function ensureSub(st: State) {
  if (!st.sub) {
    st.sub = { closed: false, anchors: [{ point: { ...st.cur } }] };
    st.subs.push(st.sub);
    st.start = { ...st.cur };
  }
}

function pushAnchor(st: State, anchor: Anchor) {
  ensureSub(st);
  st.sub!.anchors.push(anchor);
  st.cur = anchor.point;
}

function setOut(st: State, control: Point) {
  ensureSub(st);
  st.sub!.anchors[st.sub!.anchors.length - 1].out = control;
}

function reflect(ctrl: Point | null, about: Point): Point {
  return ctrl ? { x: 2 * about.x - ctrl.x, y: 2 * about.y - ctrl.y } : { ...about };
}

function quadToCubic(p0: Point, c: Point, p1: Point) {
  return {
    c1: { x: p0.x + (2 / 3) * (c.x - p0.x), y: p0.y + (2 / 3) * (c.y - p0.y) },
    c2: { x: p1.x + (2 / 3) * (c.x - p1.x), y: p1.y + (2 / 3) * (c.y - p1.y) },
  };
}

function clearCtrl(st: State) {
  st.cubicCtrl = null;
  st.quadCtrl = null;
}

const HANDLERS: Record<string, (st: State, n: Token[], p: number, rel: boolean) => number> = {
  m: (st, n, p, rel) => {
    const point = pair(st, n, p, rel);
    st.sub = { closed: false, anchors: [{ point }] };
    st.subs.push(st.sub);
    st.cur = point;
    st.start = point;
    clearCtrl(st);
    return p + 2;
  },
  l: (st, n, p, rel) => (pushAnchor(st, { point: pair(st, n, p, rel) }), clearCtrl(st), p + 2),
  h: (st, n, p, rel) => {
    pushAnchor(st, { point: { x: (rel ? st.cur.x : 0) + Number(n[p]), y: st.cur.y } });
    clearCtrl(st);
    return p + 1;
  },
  v: (st, n, p, rel) => {
    pushAnchor(st, { point: { x: st.cur.x, y: (rel ? st.cur.y : 0) + Number(n[p]) } });
    clearCtrl(st);
    return p + 1;
  },
  c: (st, n, p, rel) => {
    setOut(st, pair(st, n, p, rel));
    const c2 = pair(st, n, p + 2, rel);
    pushAnchor(st, { point: pair(st, n, p + 4, rel), in: c2 });
    st.cubicCtrl = c2;
    st.quadCtrl = null;
    return p + 6;
  },
  s: (st, n, p, rel) => {
    setOut(st, reflect(st.cubicCtrl, st.cur));
    const c2 = pair(st, n, p, rel);
    pushAnchor(st, { point: pair(st, n, p + 2, rel), in: c2 });
    st.cubicCtrl = c2;
    st.quadCtrl = null;
    return p + 4;
  },
  q: (st, n, p, rel) => {
    const c = pair(st, n, p, rel);
    const end = pair(st, n, p + 2, rel);
    const { c1, c2 } = quadToCubic(st.cur, c, end);
    setOut(st, c1);
    pushAnchor(st, { point: end, in: c2 });
    st.quadCtrl = c;
    st.cubicCtrl = null;
    return p + 4;
  },
  t: (st, n, p, rel) => {
    const c = reflect(st.quadCtrl, st.cur);
    const end = pair(st, n, p, rel);
    const { c1, c2 } = quadToCubic(st.cur, c, end);
    setOut(st, c1);
    pushAnchor(st, { point: end, in: c2 });
    st.quadCtrl = c;
    st.cubicCtrl = null;
    return p + 2;
  },
  a: (st, n, p, rel) => (pushAnchor(st, { point: pair(st, n, p + 5, rel) }), clearCtrl(st), p + 7),
};

export function parsePath(d: string): SubPath[] {
  const tokens = tokenize(d);
  const st: State = { subs: [], sub: null, cur: { x: 0, y: 0 }, start: { x: 0, y: 0 }, cubicCtrl: null, quadCtrl: null };
  let cmd = "";
  let p = 0;
  while (p < tokens.length) {
    const token = tokens[p];
    if (typeof token === "string") {
      cmd = token;
      p++;
      if (cmd === "Z" || cmd === "z") {
        if (st.sub) st.sub.closed = true;
        st.cur = { ...st.start };
      }
      continue;
    }
    const handler = HANDLERS[cmd.toLowerCase()];
    if (!handler) {
      p++;
      continue;
    }
    p = handler(st, tokens, p, cmd === cmd.toLowerCase());
    if (cmd === "M") cmd = "L";
    else if (cmd === "m") cmd = "l";
  }
  return st.subs;
}
