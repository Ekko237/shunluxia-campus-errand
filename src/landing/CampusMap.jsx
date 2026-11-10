import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence, animate, useInView } from 'motion/react'
import { MAP_W, MAP_H, PLACES, routePath } from '../campusMap'
import { EN, tr } from '../i18n'

const icon = (name) => `${import.meta.env.BASE_URL}icons/${name}.webp`
// 手机上名牌放在点旁边时用的更短的名字
const TINY = EN
  ? { market: 'Store', canteen1: 'Dining 1', canteen2: 'Dining 2', hall: 'Hall', cainiao: 'Station', lib: 'Library', gate: 'N. gate', jd: 'JD', sf: 'SF', gym: 'Gym', yan: 'Grad dorm' }
  : { market: '超市', canteen1: '一食', canteen2: '二食', hall: '报告厅', cainiao: '驿站', lib: '图书馆', gate: '北门', jd: '京东', sf: '顺丰', gym: '体育馆', yan: '研究生楼' }
export const SHORT = EN
  ? { cainiao: 'Parcel station', sf: 'SF Express', jd: 'JD locker', canteen1: 'Dining hall 1', canteen2: 'Dining hall 2', market: 'Campus store', gate: 'North gate', lib: 'Library', jiao1: 'Teaching Bldg 1', hall: 'Lecture hall', gym: 'Gym', zhu3: 'Bamboo Court', mei5: 'Plum Court', tao2: 'Peach Court', lan1: 'Orchid Court', yan: 'Grad housing' }
  : { cainiao: '菜鸟驿站', sf: '顺丰点', jd: '京东柜', canteen1: '一食堂', canteen2: '二食堂', market: '教育超市', gate: '北门', lib: '图书馆', jiao1: '一教', hall: '学术报告厅', gym: '体育馆', zhu3: '竹园', mei5: '梅园', tao2: '桃园', lan1: '兰园', yan: '研究生公寓' }

// 地图上标点的位置：小亭子、校门标在正中，其他楼标在楼里取件的地方（从门口拐进去那段虚线的尽头）
// 楼里取件的位置：从门口往楼里走 70，离楼边至少 20
const inside = (id) => {
  const P = PLACES[id]
  const [x0, y0, x1, y1] = P.box
  return [Math.min(Math.max(P.door[0] + (P.road[0] === 'v' ? 70 : 0), x0 + 20), x1 - 20), Math.min(Math.max(P.door[1] + (P.road[0] === 'h' ? (P.door[1] > P.road[1] ? 70 : -70) : 0), y0 + 20), y1 - 20)]
}
const markAt = (id) => {
  const P = PLACES[id]
  if (P.kind !== 'kiosk' && P.kind !== 'gate') return inside(id)
  const [x0, y0, x1, y1] = P.box
  return [(x0 + x1) / 2, (y0 + y1) / 2]
}
const toD = (pts) => pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x} ${y}`).join(' ')
// 门口在路的上方还是下方：标签放在门口外侧，不压路
const outward = (id) => {
  const { door, road } = PLACES[id]
  return road[0] === 'h' ? (door[1] < road[1] ? 'up' : 'down') : 'right'
}

// 一条折线上，离某点最近的位置在整条线里占多少（0 到 1）
export function along(pts, p) {
  let total = 0
  const seg = pts.slice(1).map((q, i) => { const l = Math.hypot(q[0] - pts[i][0], q[1] - pts[i][1]); total += l; return l })
  let best = Infinity, at = 0, acc = 0
  seg.forEach((l, i) => {
    const [ax, ay] = pts[i], [bx, by] = pts[i + 1]
    const t = l ? Math.max(0, Math.min(1, ((p[0] - ax) * (bx - ax) + (p[1] - ay) * (by - ay)) / (l * l))) : 0
    const d = Math.hypot(ax + (bx - ax) * t - p[0], ay + (by - ay) * t - p[1])
    if (d < best) { best = d; at = acc + l * t }
    acc += l
  })
  return total ? at / total : 0
}
function pointAt(pts, f) {
  const seg = pts.slice(1).map((q, i) => Math.hypot(q[0] - pts[i][0], q[1] - pts[i][1]))
  let target = f * seg.reduce((a, b) => a + b, 0)
  for (let i = 0; i < seg.length; i++) {
    if (target <= seg[i] || i === seg.length - 1) { const t = seg[i] ? Math.min(1, target / seg[i]) : 0; return [pts[i][0] + (pts[i + 1][0] - pts[i][0]) * t, pts[i][1] + (pts[i + 1][1] - pts[i][1]) * t] }
    target -= seg[i]
  }
  return pts[pts.length - 1]
}

// 底图是按路网画的生成图，路线全部沿路走（src/campusMap.js 里寻路）；不缩放不旋转，画框和底图一样比例，四边不会露白
export default function CampusMap({ R, hits, reduce, pills = true, walker = true, endsOnly = false, legend = false, at = null, park = false, compact = false }) {
  // 画路线只画路面上的那段（去掉两头进门的小短线），起点终点的圆点就压在路上，不会偏开
  const full = routePath(R.from, R.to).pts
  const mine = full.length > 3 ? full.slice(1, -1) : full
  // 点在不在你的路上（离路线某一段 3 以内）
  const onMine = ([x, y]) => mine.some(([ax, ay], k) => {
    if (!k) return false
    const [bx, by] = mine[k - 1]
    return x >= Math.min(ax, bx) - 3 && x <= Math.max(ax, bx) + 3 && y >= Math.min(ay, by) - 3 && y <= Math.max(ay, by) + 3
  })
  // 从起点去取件点的路里，最后一个还在你路上的点开始，到门口再进楼
  const leaveFrom = (pts, deep) => { let k = 0; pts.forEach((q, n) => { if (onMine(q)) k = n }); return [...pts.slice(k), deep] }
  const marks = useMemo(() => hits.map((t) => ({ t, f: along(mine, PLACES[t.from].door) })).sort((a, b) => a.f - b.f), [hits, mine])
  const [p, setP] = useState(at ?? (reduce || !walker ? 1 : 0))
  // at：小人停在路上的某个位置（原型订单页按订单状态给），变了就沿路走过去
  useEffect(() => {
    if (at == null) return
    const c = animate(p, at, { duration: reduce ? 0 : 0.6, ease: [0.16, 1, 0.3, 1], onUpdate: setP })
    return () => c.stop()
  }, [at]) // eslint-disable-line react-hooks/exhaustive-deps
  // 手机上整张图太小：只裁这条路左右 1200 宽、4:3 的一块，放大约 1.3 倍，名牌和编号不挤
  // 起终点名牌自动避让：画完量一下，压到编号、送达点、价签、别的名牌，或者伸出画框，就换到上 / 下 / 左 / 右里压得最少的一边
  const box = useRef(null)
  // 小人第一次走：等地图滚进视野再走（页面一打开就走完，滚到这里只剩一条画好的线）；之后每换一条路，1.4 秒沿新路重走一遍
  const seen = useInView(box, { once: true, amount: 0.4 })
  const first = useRef(true)
  useEffect(() => {
    if (at != null) return
    if (reduce || !walker) { setP(1); return }
    setP(0)
    if (!seen) return
    const c = animate(0, 1, { duration: first.current ? 3 : 1.4, delay: first.current ? 0.3 : 0, ease: 'easeInOut', onUpdate: setP })
    first.current = false
    return () => c.stop()
  }, [R.from, R.to, reduce, walker, seen]) // eslint-disable-line react-hooks/exhaustive-deps
  const [force, setForce] = useState({})
  const [small, setSmall] = useState(() => typeof window !== 'undefined' && window.matchMedia('(max-width: 639px)').matches)
  useEffect(() => { const m = window.matchMedia('(max-width: 639px)'); const f = () => setSmall(m.matches); m.addEventListener('change', f); return () => m.removeEventListener('change', f) }, [])
  // 画框要装下路线、取件点和送达点，左右各留 90；三条路线都装得下 1320 宽，画框高度不随路线跳
  const pts = [...mine, ...marks.map(({ t }) => markAt(t.from)), ...marks.filter(({ t }) => PLACES[t.to]).map(({ t }) => PLACES[t.to].door)]
  const xs = pts.map((q) => q[0]), ys = pts.map((q) => q[1])
  const cx = (Math.min(...xs) + Math.max(...xs)) / 2, cy = (Math.min(...ys) + Math.max(...ys)) / 2
  const vw = Math.min(MAP_W, Math.max(1320, Math.max(...xs) - Math.min(...xs) + 180)), vh = Math.min(MAP_H, vw * 0.75)
  const V = small ? { X0: Math.max(0, Math.min(MAP_W - vw, cx - vw / 2)), VW: vw, Y0: Math.max(0, Math.min(MAP_H - vh, cy - vh / 2)), VH: vh } : { X0: 0, VW: MAP_W, Y0: 0, VH: MAP_H }
  const pct = ([x, y]) => ({ left: `${((x - V.X0) / V.VW) * 100}%`, top: `${((y - V.Y0) / V.VH) * 100}%` })
  // 小人头像比别的点大：走到画框边上时整颗收进框里，描边不被裁
  const pin = ([x, y]) => ({ left: `clamp(23px, ${((x - V.X0) / V.VW) * 100}%, calc(100% - 23px))`, top: `clamp(23px, ${((y - V.Y0) / V.VH) * 100}%, calc(100% - 23px))` })
  const me = pointAt(mine, p)
  const ends = [R.from, R.to]
  // 起终点旁边就有取件点时，名牌翻到另一边，不盖住编号
  const flip = (id) => { const e = id === R.from ? mine[0] : mine[mine.length - 1]; return marks.some(({ t }) => { const [x, y] = markAt(t.from); return Math.abs(x - e[0]) < 160 && Math.abs(y - e[1]) < 160 }) }
  // 起终点名牌在点的上面还是下面
  // 手机上价签都挂在编号下面：起终点名牌默认放上面，只有上面挨着取件点时才放下面
  // 起终点贴着画框上下边：名牌往画框里面放，不被裁掉
  const vEdge = (id) => { const f = ((id === R.from ? mine[0] : mine[mine.length - 1])[1] - V.Y0) / V.VH; return f < 0.18 ? 't' : f > 0.82 ? 'b' : null }
  const labelUp = (id) => {
    if (vEdge(id)) return vEdge(id) === 'b'
    if (!small) return (outward(id) === 'up') !== flip(id)
    const e = id === R.from ? mine[0] : mine[mine.length - 1]
    return !marks.some(({ t }) => { const [x, y] = markAt(t.from); return Math.abs(x - e[0]) < 380 && y < e[1] && y > e[1] - 250 })
  }
  // 离起终点名牌近的取件点：价签放到名牌的另一侧，而不是不放
  const nearId = (t) => ends.find((id) => { const e = id === R.from ? mine[0] : mine[mine.length - 1]; const [x, y] = markAt(t.from); return Math.abs(x - e[0]) < 220 && Math.abs(y - e[1]) < 200 })
  // 上下都挨着取件点（比如超市出发：1 号在下、2 号在上）：名牌放到点的旁边，手机上只写「出发 / 到达」
  const side = (id) => {
    const e = id === R.from ? mine[0] : mine[mine.length - 1]
    const near = (lo, hi) => marks.some(({ t }) => { const [x, y] = markAt(t.from); return Math.abs(x - e[0]) < 260 && y - e[1] > lo && y - e[1] < hi })
    return near(-200, -10) && near(10, 200) ? ((e[0] - V.X0) / V.VW > 0.75 ? 'left' : 'right') : null
  }
  // 起终点靠近画框左右边：名牌往里长，不被裁掉
  const edge = (id) => { const f = ((id === R.from ? mine[0] : mine[mine.length - 1])[0] - V.X0) / V.VW; return f < 0.15 ? 'l' : f > 0.85 ? 'r' : null }
  const pillUp = (t) => { const id = nearId(t); return id && !side(id) ? !labelUp(id) : outward(t.from) === 'up' }
  // 送达点的名牌：默认手机放圈的右下、电脑放圈的上方；压到终点黑点或别的名牌就换到圈的下方 / 上方
  const dropCls = (id) => force['d' + id] === 'below' ? 'left-1/2 top-[calc(100%+6px)] -translate-x-1/2' : force['d' + id] === 'above' ? 'bottom-[calc(100%+6px)] left-1/2 -translate-x-1/2' : 'bottom-[calc(100%+6px)] left-1/2 -translate-x-1/2 max-md:bottom-auto max-md:left-auto max-md:right-0 max-md:top-[calc(100%+6px)] max-md:translate-x-0'
  const defPlace = (id) => side(id) || (labelUp(id) ? 'up' : 'down')
  const placeCls = (id) => {
    const pl = force[id] || defPlace(id)
    if (pl === 'right') return 'left-3 -translate-y-1/2'
    if (pl === 'left') return 'right-3 -translate-y-1/2'
    return `${edge(id) === 'l' ? '-left-5' : edge(id) === 'r' ? '-right-5' : 'left-0 -translate-x-1/2'} ${pl === 'up' ? 'bottom-3.5' : 'top-3.5'}`
  }
  useEffect(() => { setForce({}) }, [R.from, R.to, small])
  useLayoutEffect(() => {
    const el = box.current
    if (!el) return
    const B = el.getBoundingClientRect()
    const obs = [...el.querySelectorAll('[data-ob]')].filter((o) => o.offsetParent).map((o) => ({ el: o, own: o.dataset.own, r: o.getBoundingClientRect() }))
    const next = { ...force }
    let changed = false
    for (const lab of el.querySelectorAll('[data-end]')) {
      const id = lab.dataset.end, a = lab.parentElement.getBoundingClientRect(), r0 = lab.getBoundingClientRect()
      const w = r0.width, h = r0.height, x = a.left, y = a.top
      const rect = { up: [x - w / 2, y - 14 - h, x + w / 2, y - 14], down: [x - w / 2, y + 14, x + w / 2, y + 14 + h], right: [x + 12, y - h / 2, x + 12 + w, y + h / 2], left: [x - 12 - w, y - h / 2, x - 12, y + h / 2] }
      const score = ([l, t, rr, b]) => obs.filter((o) => o.own !== id && o.r.left < rr - 2 && o.r.right > l + 2 && o.r.top < b - 2 && o.r.bottom > t + 2).length + (l < B.left || rr > B.right || t < B.top || b > B.bottom ? 1.5 : 0)
      const cur = force[id] || defPlace(id)
      // 现在的位置按实际量到的框算（有贴边收进来的偏移）
      const now = score([r0.left, r0.top, r0.right, r0.bottom])
      if (now === 0) continue
      const best = ['up', 'down', 'right', 'left'].filter((k) => k !== cur).map((k) => [k, score(rect[k])]).sort((m, n) => m[1] - n[1])[0]
      if (best && best[1] < now) { next[id] = best[0]; changed = true }
    }
    for (const lab of el.querySelectorAll('[data-drop]')) {
      const key = 'd' + lab.dataset.drop, r0 = lab.getBoundingClientRect(), c = lab.parentElement.getBoundingClientRect()
      const w = r0.width, h = r0.height, x = (c.left + c.right) / 2
      const hitN = ([l, t, rr, b]) => obs.filter((o) => o.el !== lab && o.el !== lab.parentElement && o.r.left < rr - 2 && o.r.right > l + 2 && o.r.top < b - 2 && o.r.bottom > t + 2).length + (l < B.left || rr > B.right || t < B.top || b > B.bottom ? 1.5 : 0)
      const now = hitN([r0.left, r0.top, r0.right, r0.bottom])
      if (now === 0) continue
      const cand = { below: [x - w / 2, c.bottom + 6, x + w / 2, c.bottom + 6 + h], above: [x - w / 2, c.top - 6 - h, x + w / 2, c.top - 6] }
      const best = Object.entries(cand).filter(([k]) => k !== force[key]).map(([k, r]) => [k, hitN(r)]).sort((m, n) => m[1] - n[1])[0]
      if (best && best[1] < now) { next[key] = best[0]; changed = true }
    }
    // 价签互相压住：后一个翻到编号的另一侧
    const pills = [...el.querySelectorAll('[data-pill]')].map((x) => ({ x, r: x.getBoundingClientRect() }))
    pills.forEach((a2, n) => pills.slice(0, n).forEach((b2) => {
      const q = a2.r, r = b2.r
      if (q.left < r.right - 2 && q.right > r.left + 2 && q.top < r.bottom - 2 && q.bottom > r.top + 2 && !next['p' + a2.x.dataset.pill]) { next['p' + a2.x.dataset.pill] = a2.x.dataset.up ? 'down' : 'up'; changed = true }
    }))
    if (changed) setForce(next)
  })
  return (
    <div>
    <div ref={box} style={{ aspectRatio: `${V.VW} / ${V.VH}` }} className="relative isolate w-full overflow-hidden rounded-[20px] bg-surface ring-1 ring-line md:rounded-[28px]"
      role="img" aria-label={tr(`示意地图：从${SHORT[R.from]}到${SHORT[R.to]}，沿路有 ${hits.length} 个顺路的单`, `Map: ${SHORT[R.from]} to ${SHORT[R.to]}, ${hits.length} ${hits.length === 1 ? 'order' : 'orders'} on the way`)}>
      <svg viewBox={`${V.X0} ${V.Y0} ${V.VW} ${V.VH}`} className="absolute inset-0 size-full" aria-hidden="true">
        <image href={`${import.meta.env.BASE_URL}images/campus-map-v3.webp`} x="0" y="0" width={MAP_W} height={MAP_H} />
        {/* 拐进楼里取件的那一小段：从路边进门、走进楼里，多走的分钟数大多花在这里 */}
        {marks.map(({ t, f }) => {
          const P = PLACES[t.from]
          if (!P || P.kind === 'kiosk' || P.kind === 'gate') return null
          const foot = P.road[0] === 'h' ? [P.door[0], P.road[1]] : [P.road[1], P.door[1]]
          const deep = inside(t.from)
          // 楼门口不在你走的这条路边（比如门朝另一条路）：虚线从你的路上分出来，沿路绕到门口，不让人以为要穿楼
          const walk = onMine(foot) ? [foot, P.door, deep] : leaveFrom(routePath(R.from, t.from).pts, deep)
          return <motion.path key={`in${R.from}${R.to}${t.id}`} d={toD(walk)} fill="none" stroke="var(--accent)" className="[stroke-dasharray:1_28] [stroke-width:20] md:[stroke-dasharray:1_15] md:[stroke-width:9]" strokeLinecap="round" strokeLinejoin="round"
            initial={false} animate={{ opacity: p >= f ? 1 : 0.35 }} transition={{ duration: 0.3 }} />
        })}
        {/* 你的路：整条先淡淡画着，小人走过的部分描深 */}
        <path d={toD(mine)} fill="none" stroke="var(--ink)" strokeOpacity="0.3" strokeWidth="10" strokeDasharray="4 18" strokeLinecap="round" strokeLinejoin="round" />
        <motion.path key={`${R.from}${R.to}`} d={toD(mine)} fill="none" stroke="var(--ink)" strokeOpacity="0.88" className="[stroke-width:18] md:[stroke-width:12]" strokeLinecap="round" strokeLinejoin="round"
          initial={false} style={{ pathLength: p }} />
        {/* 顺路的单：取件到送达那段路，小人经过取件点时亮起 */}
        {marks.filter(({ t }) => t.from !== t.to).map(({ t, f }) => (
          <path key={`c${R.from}${R.to}${t.id}`} d={toD(routePath(t.from, t.to).pts)} fill="none" stroke="var(--surface)" className="[stroke-width:28] md:[stroke-width:12]" strokeLinecap="round" strokeLinejoin="round" />
        ))}
        {marks.filter(({ t }) => t.from !== t.to).map(({ t, f }) => (
          <motion.path key={`${R.from}${R.to}${t.id}`} d={toD(routePath(t.from, t.to).pts)} fill="none" stroke="var(--accent)" className="[stroke-width:8] md:[stroke-width:5]" strokeLinecap="round" strokeLinejoin="round"
            initial={false} animate={{ opacity: p >= f ? 0.95 : 0.25 }} transition={{ duration: 0.3 }} />
        ))}
      </svg>
      {marks.map(({ t, f }, i) => (
        <span key={t.id} data-ob="" aria-hidden="true" className={`tnum absolute z-10 grid size-5 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full text-[12px] font-bold text-on-accent ring-[3px] ring-surface transition-colors md:size-7 md:text-[13px] ${p >= f ? 'bg-accent' : 'bg-muted'}`} style={pct(markAt(t.from))}>{i + 1}</span>
      ))}
      {/* 送达点：空心圈，和取件点的实心编号对应，看得出「取件到送达」是哪一段 */}
      {marks.filter(({ t }) => t.from !== t.to && PLACES[t.to] && !ends.includes(t.to)).map(({ t }) => (
        // 送达点也写上是哪儿，不然读的人看不出绿线最后拐去了哪
        <span key={`d${t.id}`} data-ob="" aria-hidden="true" className="absolute z-10 size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-surface ring-[3px] ring-accent md:size-4" style={pct(PLACES[t.to].door)}>
          <span data-ob="" data-drop={t.id} className={`absolute whitespace-nowrap rounded-full bg-surface px-1.5 ${dropCls(t.id)} text-[12px] font-bold leading-5 text-accent shadow-sm ring-1 ring-accent/40 md:px-2 md:text-[13px]`}>{EN ? `Drop: ${TINY[t.to] || SHORT[t.to]}` : `${TINY[t.to] || SHORT[t.to]} 送达`}</span>
        </span>
      ))}
      {marks.map(({ t }) => (
        <span key={`p${t.id}`} data-ob="" aria-hidden="true" className={`tnum absolute z-10 -translate-x-1/2 translate-y-[9px] whitespace-nowrap rounded-full bg-surface px-1 text-[12px] font-bold leading-4 text-accent shadow-sm md:hidden`} style={pct(markAt(t.from))}>{t.type === 'express' ? `${TINY[t.from] || SHORT[t.from]} ` : ''}¥{t.reward}</span>
      ))}
      {/* 原型订单页：小人还在起点附近时起点不标，到了终点就不再标「到达」，免得和小人叠在一起 */}
      {ends.filter((id) => !(at != null && !park && ((id === R.from && p < 0.15) || (id === R.to && p >= 0.99)))).map((id) => (
        <span key={id} className="absolute z-20" style={pct(id === R.from ? mine[0] : mine[mine.length - 1])}>
          {/* 收尾卡小人停在终点时，终点小黑点会正好盖在头像脸上：这时只留名牌 */}
          {!(park && id === R.to && p >= 0.97) && <span data-ob="" data-own={id} className="absolute left-0 top-0 block size-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-ink ring-[3px] ring-surface md:size-4" />}
          <span data-ob="" data-end={id} data-own={id} className={`absolute whitespace-nowrap rounded-full bg-ink px-2 py-0.5 text-[13px] font-semibold text-bg shadow-sm md:px-2.5 md:text-[13px] ${placeCls(id)}`}>{EN ? <>{id === R.from ? 'From ' : 'To '}{side(id) ? <><span className="max-md:hidden">{SHORT[id]}</span><span className="md:hidden">{TINY[id] || SHORT[id]}</span></> : SHORT[id]}</> : <>{side(id) ? <><span className="max-md:hidden">{SHORT[id]} </span><span className="md:hidden">{TINY[id] || SHORT[id]} </span></> : `${SHORT[id]} `}{id === R.from ? '出发' : '到达'}</>}</span>
        </span>
      ))}
      {!endsOnly && marks.filter(({ t }) => !ends.includes(t.from)).map(({ t }) => (
        <span key={`l${t.id}`} className="absolute z-10 hidden md:block" style={pct(markAt(t.from))}>
          <span data-ob="" className={`absolute left-0 -translate-x-1/2 whitespace-nowrap rounded-full bg-surface px-1.5 py-0.5 text-[12px] font-semibold md:px-2.5 md:text-[13px] text-ink shadow-sm ring-1 ring-line ${outward(t.from) === 'up' ? 'bottom-3.5' : 'top-3.5'}`}>
            {compact ? TINY[t.from] || SHORT[t.from] : SHORT[t.from]}
          </span>
        </span>
      ))}
      <AnimatePresence>
        {/* 价签：离起终点名牌近的放到名牌另一侧 */}
        {pills && marks.filter(({ f }) => p >= f).map(({ t }) => (
          <span key={`${R.from}${R.to}${t.id}`} className="absolute z-30 hidden md:block" style={pct(markAt(t.from))}>
            <motion.span initial={reduce ? false : { opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={{ type: 'spring', stiffness: 420, damping: 24 }}
              className={`tnum absolute left-0 -translate-x-1/2 whitespace-nowrap rounded-full bg-accent px-3 py-1 text-sm font-bold text-on-accent shadow-[0_8px_18px_-8px_rgba(11,122,85,0.7)] ${(force['p' + t.id] ? force['p' + t.id] === 'up' : pillUp(t)) ? 'bottom-10' : 'top-10'}`} data-pill={t.id} data-up={(force['p' + t.id] ? force['p' + t.id] === 'up' : pillUp(t)) ? '1' : ''}>
              ¥{t.reward} · {t.dm ? tr(`+${t.m ?? Math.max(1, Math.ceil(t.dm / 80))} 分钟`, `+${t.m ?? Math.max(1, Math.ceil(t.dm / 80))} min`) : tr('就在路上', 'On your route')}
            </motion.span>
          </span>
        ))}
      </AnimatePresence>
      {/* 落地页的小人只在路中间走：出发和到达那一下藏起来，不和起终点名牌叠；park（收尾卡）走到终点就停在那里 */}
      {((walker && !reduce && p > 0.06 && (p < 0.97 || park)) || (at != null && p > 0)) && (
        <span aria-hidden="true" className="absolute z-[5] grid size-7 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-surface shadow-[0_6px_16px_-6px_rgba(17,40,30,0.5)] ring-[3px] ring-ink md:size-10" style={pin(me)}>
          <img src={icon('avatar-runner-v2')} width={32} height={32} alt="" className="size-5 rounded-full md:size-8" />
        </span>
      )}
    </div>
    {legend && (
      <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[14px] text-ink/80">
        <span className="inline-flex items-center gap-1.5"><i className="h-1 w-5 rounded-full bg-ink/80" />{tr('你正要走的路', 'Your route')}</span>
        {/* 只有真有「取件到送达」那一段时才写这条图例（占座这类就地完成的单没有这段） */}
        {hits.some((t) => t.from !== t.to) && <span className="inline-flex items-center gap-1.5"><i className="h-1.5 w-5 rounded-full bg-accent ring-2 ring-surface" />{tr('顺手捎的那段（取件到送达）', 'Carried on the way (pickup to drop-off)')}</span>}
        <span className="inline-flex items-center gap-1.5 max-md:hidden"><i className="w-5 border-t-[3px] border-dotted border-accent" />{tr('拐进楼里取件（多走的路）', 'Into the building for pickup (extra walk)')}</span>
        {hits.some((t) => t.from !== t.to && PLACES[t.to] && t.to !== R.from && t.to !== R.to) && <span className="inline-flex items-center gap-1.5"><i className="size-2.5 rounded-full bg-surface ring-2 ring-accent" />{tr('送达点', 'Drop-off')}</span>}
        <span className="inline-flex items-center gap-1.5"><i className="size-2.5 rounded-full bg-accent" /><span>{tr(`取件点，按路上先后编号，走到就变绿，共 ${hits.length} 单`, `Pickups, numbered in route order, turn green as you pass. ${hits.length} ${hits.length === 1 ? 'order' : 'orders'}`)}</span></span>
      </p>
    )}
    </div>
  )
}
