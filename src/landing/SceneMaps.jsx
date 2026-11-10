import { motion, useReducedMotion } from 'motion/react'
import { routePath, PLACES } from '../campusMap'
import { tr } from '../i18n'

// 不止取快递：同一张校园地图上裁两块，各画一条顺路的路线；一大一小两张，和首屏是同一个世界
const BASE = import.meta.env.BASE_URL
const ease = [0.16, 1, 0.3, 1]

const MAPS = {
  seat: { from: 'zhu3', to: 'lib', box: [110, 150, 640, 470], label: [tr('竹园', 'Bamboo Court'), tr('图书馆', 'Library')], dy: [-46, 46], runner: 0.55, sprite: 'runner-free-v1' },
  handoff: { from: 'gate', to: 'tao2', box: [170, 30, 700, 640], label: [tr('北门', 'North Gate'), tr('桃园 2 号楼', 'Peach Court Bldg 2')], dy: [52, -64], runner: 0.62, sprite: 'runner-v1' },
}

function along(pts, f) {
  const segs = pts.slice(1).map((p, k) => Math.hypot(p[0] - pts[k][0], p[1] - pts[k][1]))
  let t = f * segs.reduce((a, b) => a + b, 0)
  for (let k = 0; k < segs.length; k++) {
    if (t <= segs[k] || k === segs.length - 1) { const u = segs[k] ? Math.min(1, t / segs[k]) : 0; return [pts[k][0] + (pts[k + 1][0] - pts[k][0]) * u, pts[k][1] + (pts[k + 1][1] - pts[k][1]) * u] }
    t -= segs[k]
  }
  return pts[pts.length - 1]
}

// mini：嵌在场景插画角上的小地图，只画路线和两头的点，名牌和小人都不放（小人已经在插画里）
export function SceneMap({ k, mini = false }) {
  const reduce = useReducedMotion()
  const m = MAPS[k]
  const [x0, y0, w, h] = m.box
  const pts = routePath(m.from, m.to).pts
  const d = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x - x0} ${y - y0}`).join(' ')
  const pct = ([x, y]) => ({ left: `${((x - x0) / w) * 100}%`, top: `${((y - y0) / h) * 100}%` })
  const r = along(pts, m.runner)
  const [a, b] = [pts[0], pts[pts.length - 1]]
  return (
    <div className={`relative overflow-hidden ${mini ? '' : 'rounded-[24px] ring-1 ring-line'}`} style={{ aspectRatio: `${w} / ${h}` }} aria-hidden="true">
      <svg viewBox={`0 0 ${w} ${h}`} className="absolute inset-0 size-full">
        <image href={`${BASE}images/campus-map-v3.webp`} x={-x0} y={-y0} width="1600" height="900" />
        <motion.path d={d} fill="none" stroke="var(--accent)" strokeWidth={mini ? 16 : 9} strokeLinecap="round" strokeLinejoin="round"
          initial={reduce ? false : { pathLength: 0 }} whileInView={{ pathLength: 1 }} viewport={{ once: true, amount: 0.6 }} transition={{ duration: 1.2, ease }} />
        {mini && <><circle cx={a[0] - x0} cy={a[1] - y0} r="18" fill="var(--ink)" stroke="var(--surface)" strokeWidth="6" /><circle cx={b[0] - x0} cy={b[1] - y0} r="18" fill="var(--accent)" stroke="var(--surface)" strokeWidth="6" /></>}
      </svg>
      {!mini && [m.from, m.to].map((id, i) => (
        <span key={id} className="absolute -translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded-full bg-surface px-2.5 py-1 text-[14px] font-semibold shadow-sm ring-1 ring-line"
          style={pct([PLACES[id].door[0] + (id === 'gate' ? -96 : id === 'tao2' ? 40 : 0), PLACES[id].door[1] + m.dy[i]])}>{m.label[i]}</span>
      ))}
      {!mini && <img src={`${BASE}brand/${m.sprite}.webp`} width={169} height={240} alt="" className="absolute h-[22%] w-auto max-w-none -translate-x-1/2 -translate-y-[88%] drop-shadow-[0_8px_8px_rgba(17,40,30,0.25)]" style={pct(r)} />}
    </div>
  )
}

// 带状地图：裁出一教到梅园那一条路，阿远夹着快递走在路上；产品思考页的页头用它接上首页的世界
// 电脑上是一条宽带子（约 280px 高），手机上整条路装进一块 7:4 的图里，小人跟着缩小
const BAND_L = [150, 186, 1200, 276]
const BAND_S = [230, 20, 1110, 647]
function Band({ box, runnerH, labels }) {
  const reduce = useReducedMotion()
  const [x0, y0, w, h] = box
  const pts = routePath('jiao1', 'mei5').pts
  const need = routePath('cainiao', 'mei5').pts
  const d = (p) => p.map(([x, y], i) => `${i ? 'L' : 'M'}${x - x0} ${y - y0}`).join(' ')
  const pct = ([x, y]) => ({ left: `${((x - x0) / w) * 100}%`, top: `${((y - y0) / h) * 100}%` })
  const r = along(pts, 0.6)
  return (
    <div className="relative overflow-hidden rounded-[24px] ring-1 ring-line" style={{ aspectRatio: `${w} / ${h}` }} aria-hidden="true">
      <svg viewBox={`0 0 ${w} ${h}`} className="absolute inset-0 size-full">
        <image href={`${BASE}images/campus-map-v3.webp`} x={-x0} y={-y0} width="1600" height="900" />
        <path d={d(pts)} fill="none" stroke="var(--ink)" strokeOpacity="0.85" strokeWidth="8" strokeDasharray="1 15" strokeLinecap="round" />
        <motion.path d={d(need)} fill="none" stroke="var(--accent)" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round"
          initial={reduce ? false : { pathLength: 0 }} whileInView={{ pathLength: 1 }} viewport={{ once: true, amount: 0.6 }} transition={{ duration: 1.4, ease }} />
      </svg>
      {labels && [[tr('一教', 'Teaching Bldg 1'), [PLACES.jiao1.door[0] - 50, PLACES.jiao1.door[1]], -44], [tr('菜鸟驿站', 'Parcel station'), PLACES.cainiao.door, 66], [tr('梅园', 'Plum Court'), PLACES.mei5.door, 66]].map(([l, p, dy]) => (
        <span key={l} className="absolute -translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded-full bg-surface px-2.5 py-1 text-[14px] font-semibold shadow-sm ring-1 ring-line" style={pct([p[0], p[1] + dy])}>{l}</span>
      ))}
      <img src={`${BASE}brand/runner-v1.webp`} width={169} height={240} alt="" className={`absolute ${runnerH} w-auto max-w-none -translate-x-1/2 -translate-y-[90%] drop-shadow-[0_8px_8px_rgba(17,40,30,0.25)]`} style={pct(r)} />
    </div>
  )
}
export function RouteBand() {
  return (
    <>
      <div className="md:hidden"><Band box={BAND_S} runnerH="h-[24%]" /></div>
      <div className="max-md:hidden"><Band box={BAND_L} runnerH="h-[46%]" labels /></div>
    </>
  )
}
