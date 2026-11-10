import { useRef, useState } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { seedTasks, detourMin, detourMeters } from '../data'
import { routePath, PLACES } from '../campusMap'
import CampusMap, { SHORT, along } from './CampusMap'

// 首页「同一时间」和下课提醒用的三条路线；选一条路，地图和地铁线列出这条路上多走 5 分钟以内的单
export const ROUTES = [
  { from: 'jiao1', to: 'mei5', label: '一教下课回梅园', short: '一教→梅园', lock: '还有 5 分钟下课', time: '17:45', verb: '下课顺手捎上' },
  { from: 'tao2', to: 'jiao1', label: '桃园去上课', short: '桃园→一教', lock: '还有 15 分钟上课', time: '07:45', verb: '去上课顺手捎上' },
  { from: 'mei5', to: 'market', label: '梅园去超市', short: '梅园→超市', lock: '晚饭后，去超市', time: '19:30', verb: '去超市顺手捎上' },
]

// 这条路上多走不超过 5 分钟的单，按多走的分钟数排
export const routeHits = (R) => seedTasks().map((t) => ({ ...t, m: detourMin(R.from, R.to, t), dm: detourMeters(R.from, R.to, t) })).filter((t) => t.m <= 5).sort((a, b) => a.m - b.m)

export function CampusRoutes() {
  const reduce = useReducedMotion()
  const box = useRef(null)
  // 不自动换路线：正在看的清单不会在手底下被换掉，只由上面的路线按钮切
  const [ri, setRi] = useState(0)
  const R = ROUTES[ri]
  const hits = routeHits(R)
  const pick = (i) => setRi(i)
  return (
    <div>
      <div className="no-scrollbar -mx-4 -my-1 flex gap-1.5 overflow-x-auto px-4 py-1 md:gap-2 md:mx-0 md:flex-wrap md:overflow-visible md:px-0" role="group" aria-label="选一条你正要走的路">
        {ROUTES.map((x, i) => (
          <button key={x.label} onClick={() => pick(i)} aria-pressed={i === ri}
            className={`relative h-11 shrink-0 whitespace-nowrap rounded-full px-3 text-[14px] md:px-4 md:text-[15px] font-semibold transition-colors ${i === ri ? 'text-bg' : 'bg-surface text-ink ring-1 ring-line'}`}>
            {i === ri && <span className="absolute inset-0 rounded-full bg-ink" />}
            <span className="relative">{x.label}</span>
          </button>
        ))}
      </div>
      <p className="mt-4 max-w-[40ch] text-lg leading-relaxed text-muted md:text-xl" aria-live="polite">
        此刻 {seedTasks().length} 单里，有 <b className="text-accent">{hits.length} 单</b>顺路，<span className="whitespace-nowrap">{!hits.length ? '' : '每单'}多走 {!hits.length ? 0 : hits[0].m === hits[hits.length - 1].m ? hits[0].m : `${hits[0].m} 到 ${hits[hits.length - 1].m}`} 分钟</span>。
      </p>
      <div className="mt-6 lg:grid lg:grid-cols-12 lg:items-start lg:gap-8">
        <div ref={box} className="lg:col-span-8"><CampusMap R={R} hits={hits} reduce={reduce} legend /></div>
        <div className="lg:col-span-4"><SubwayLine R={R} hits={hits} reduce={reduce} /></div>
      </div>
    </div>
  )
}

// 手机上的顺路：把你的路画成一根竖着的地铁线，顺路的单按在路上的先后挂成站点
function SubwayLine({ R, hits, reduce }) {
  const mine = routePath(R.from, R.to).pts
  // 按在路上的先后排，和地图上从出发到到达的顺序一致
  const stops = [...hits].sort((p, q) => along(mine, PLACES[p.from].door) - along(mine, PLACES[q.from].door))
  const end = (name, sub) => (
    <li className="relative flex items-center gap-3 py-1">
      <span className="z-10 grid size-6 shrink-0 place-items-center rounded-full bg-ink ring-4 ring-bg"><span className="size-2 rounded-full bg-bg" /></span>
      <span className="text-[15px] font-bold">{name}</span><span className="text-sm text-muted">{sub}</span>
    </li>
  )
  return (
    <div className="mt-3 rounded-[24px] bg-surface p-4 ring-1 ring-line md:hidden lg:mt-0 lg:block">
      <ol key={R.label} className="relative space-y-3">
        <span aria-hidden="true" className="absolute bottom-4 left-[11px] top-4 w-[3px] rounded-full bg-ink/80" />
        {end(SHORT[R.from], '出发')}
        {stops.map((t, i) => (
          <motion.li key={t.id} initial={reduce ? false : { opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ type: 'spring', stiffness: 420, damping: 30, delay: 0.15 + i * 0.12 }}
            className="relative flex items-center gap-3">
            <span className="tnum z-10 -ml-px grid size-[26px] shrink-0 place-items-center rounded-full bg-accent text-[13px] font-bold text-on-accent ring-4 ring-bg">{i + 1}</span>
            <span className="min-w-0 flex-1 rounded-2xl bg-accent-soft px-3 py-2">
              <span className="flex items-start justify-between gap-2"><span className="text-[15px] font-semibold leading-snug">{t.title}</span><span className="tnum shrink-0 font-bold text-accent">¥{t.reward}</span></span>
              <span className="tnum mt-0.5 flex flex-wrap gap-x-2 text-sm text-accent"><span className="whitespace-nowrap">{t.dm ? `多走 ${t.m} 分钟（${t.dm} 米）` : '就在路上'}</span><span className="whitespace-nowrap">在{SHORT[t.from]}顺手{{ express: '取', buy: '买', seat: '占', food: '拿', other: '带' }[t.type] || '带'}</span></span>
            </span>
          </motion.li>
        ))}
        {end(SHORT[R.to], '到达')}
      </ol>
      {/* 汇总：这条路上的单全捎上能拿多少 */}
      {stops.length > 0 && (
        <p className="tnum mt-4 flex items-baseline justify-between gap-3 border-t border-line pt-3 text-[15px]">
          <span className="text-muted">{stops.length} 单全捎上</span>
          <span className="font-semibold">赏金合计 <b className="text-xl text-accent">¥{stops.reduce((a, t) => a + t.reward, 0)}</b></span>
        </p>
      )}
    </div>
  )
}
