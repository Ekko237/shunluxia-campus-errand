// 全校顺路地图：路网、楼门口、按路面寻路。坐标系 1600 x 900，和底图 campus-map-v1.webp 一一对应。
// 路是一张网格：竖路 x = 100/420/740/1060/1380，横路 y = 90/324/558/792，路宽 40。
// 每栋楼都有一个门口，门口用一小段人行道接到最近的路中线上。所有路线只沿路中线和这些人行道走。
export const MAP_W = 1600
export const MAP_H = 900
export const XS = [100, 420, 740, 1060, 1380]
export const YS = [90, 324, 558, 792]

// 楼：门口坐标（door）、门口接到的路（axis: 'h' 横路 y / 'v' 竖路 x）、楼在图上的范围（box）
export const PLACES = {
  zhu3: { door: [260, 306], road: ['h', 324], box: [150, 135, 370, 306], kind: 'dorm' },
  yan: { door: [580, 306], road: ['h', 324], box: [470, 135, 690, 306], kind: 'dorm' },
  canteen1: { door: [900, 306], road: ['h', 324], box: [790, 144, 1010, 306], kind: 'canteen' },
  jiao1: { door: [1310, 306], road: ['h', 324], box: [1100, 126, 1340, 306], kind: 'teach' },
  mei5: { door: [260, 342], road: ['h', 324], box: [150, 342, 370, 513], kind: 'dorm' },
  lib: { door: [580, 342], road: ['h', 324], box: [460, 342, 700, 522], kind: 'library' },
  hall: { door: [900, 342], road: ['h', 324], box: [790, 342, 1010, 504], kind: 'hall' },
  cainiao: { door: [1150, 342], road: ['h', 324], box: [1100, 342, 1300, 486], kind: 'station' },
  tao2: { door: [260, 576], road: ['h', 558], box: [150, 576, 370, 747], kind: 'dorm' },
  lan1: { door: [580, 576], road: ['h', 558], box: [470, 576, 690, 747], kind: 'dorm' },
  canteen2: { door: [900, 576], road: ['h', 558], box: [790, 576, 1010, 738], kind: 'canteen' },
  market: { door: [1220, 576], road: ['h', 558], box: [1100, 576, 1340, 720], kind: 'shop' },
  gate: { door: [740, 72], road: ['h', 90], box: [700, 18, 780, 72], kind: 'gate' },
  sf: { door: [580, 810], road: ['h', 792], box: [530, 810, 630, 864], kind: 'kiosk' },
  jd: { door: [1220, 810], road: ['h', 792], box: [1170, 810, 1270, 864], kind: 'kiosk' },
  gym: { door: [1400, 441], road: ['v', 1380], box: [1400, 360, 1580, 522], kind: 'gym' },
}

// 门口在路中线上的落脚点
const foot = (id) => {
  const { door, road } = PLACES[id]
  return road[0] === 'h' ? [door[0], road[1]] : [road[1], door[1]]
}

// 建图：网格交叉口 + 每个门口的落脚点，沿同一条路相邻的点连边
function buildGraph() {
  const nodes = new Map()
  const key = (p) => `${p[0]},${p[1]}`
  const add = (p) => { const k = key(p); if (!nodes.has(k)) nodes.set(k, { p, e: [] }); return k }
  XS.forEach((x) => YS.forEach((y) => add([x, y])))
  // 横路、竖路贯穿全图：加上边界端点，地图四边的路也能走
  Object.keys(PLACES).forEach((id) => add(foot(id)))
  const link = (a, b) => {
    const A = nodes.get(a), Bn = nodes.get(b)
    const d = Math.abs(A.p[0] - Bn.p[0]) + Math.abs(A.p[1] - Bn.p[1])
    A.e.push([b, d]); Bn.e.push([a, d])
  }
  const all = [...nodes.keys()]
  YS.forEach((y) => {
    const row = all.filter((k) => nodes.get(k).p[1] === y && nodes.get(k).p[0] >= XS[0] && nodes.get(k).p[0] <= XS[XS.length - 1]).sort((a, b) => nodes.get(a).p[0] - nodes.get(b).p[0])
    row.slice(1).forEach((k, i) => link(row[i], k))
  })
  XS.forEach((x) => {
    const col = all.filter((k) => nodes.get(k).p[0] === x && nodes.get(k).p[1] >= YS[0] && nodes.get(k).p[1] <= YS[YS.length - 1]).sort((a, b) => nodes.get(a).p[1] - nodes.get(b).p[1])
    col.slice(1).forEach((k, i) => link(col[i], k))
  })
  return { nodes, key }
}
const G = buildGraph()

// Dijkstra：两个门口之间沿路的最短路径（含两头的人行道）
const cache = new Map()
export function routePath(a, b) {
  const ck = `${a}>${b}`
  if (cache.has(ck)) return cache.get(ck)
  if (a === b) { const r = { pts: [PLACES[a].door], len: 0 }; cache.set(ck, r); return r }
  const s = G.key(foot(a)), t = G.key(foot(b))
  const dist = new Map([[s, 0]]), prev = new Map(), done = new Set()
  while (true) {
    let u = null, best = Infinity
    for (const [k, d] of dist) if (!done.has(k) && d < best) { best = d; u = k }
    if (u === null || u === t) break
    done.add(u)
    for (const [v, w] of G.nodes.get(u).e) {
      const nd = best + w
      if (nd < (dist.get(v) ?? Infinity)) { dist.set(v, nd); prev.set(v, u) }
    }
  }
  const chain = [t]
  while (chain[0] !== s) chain.unshift(prev.get(chain[0]))
  const pts = [PLACES[a].door, ...chain.map((k) => G.nodes.get(k).p), PLACES[b].door]
  const spur = (id) => Math.abs(PLACES[id].door[0] - foot(id)[0]) + Math.abs(PLACES[id].door[1] - foot(id)[1])
  const r = { pts, len: (dist.get(t) ?? 0) + spur(a) + spur(b) }
  cache.set(ck, r)
  return r
}

// 捎上一单要多走的米数：A → 取件 → 送达 → B，减去 A → B（1 个单位 = 1 米）
// 进楼取件 / 送进楼里要多走的路（进出一趟）：驿站找货架、图书馆上三楼、宿舍爬楼……亭子和校门在路边，不用进去
const INSIDE = { station: 50, library: 120, hall: 90, canteen: 80, shop: 60, teach: 60, gym: 60, dorm: 40, gate: 0, kiosk: 0 }
export function detourMetersMap(A, Bid, t) {
  const via = routePath(A, t.from).len + (t.from !== t.to ? routePath(t.from, t.to).len : 0) + routePath(t.to, Bid).len
  // 送到的地方就是自己要去的楼，送进去不算多走
  const inside = INSIDE[PLACES[t.from]?.kind] ?? 0
  const drop = t.to !== Bid && t.to !== t.from ? INSIDE[PLACES[t.to]?.kind] ?? 0 : 0
  return Math.max(0, Math.round((via - routePath(A, Bid).len + inside + drop) / 10) * 10)
}
