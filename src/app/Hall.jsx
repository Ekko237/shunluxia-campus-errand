import { createPortal } from 'react-dom'
import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useOpenTaskId } from './openTask'
import { motion, AnimatePresence, useReducedMotion } from 'motion/react'
import { ROUTES } from '../landing/RouteHero'
import CampusMap, { along } from '../landing/CampusMap'
import { routePath, PLACES } from '../campusMap'
import { CaretDown, MagnifyingGlass, ArrowRight } from '@phosphor-icons/react'
import { useStore } from '../store'
import { TYPES, TYPE_KEYS, B, BUILDINGS, dist, fmtDist, detourMin, detourMeters, RUNNER_HOME, levelOf, minCreditFor, POSTER_WARN } from '../data'
import { TypeTag, UrgentTag, Panel, Empty, Btn, left, spring, gi } from '../ui'
const MapPin = gi('pin')
const Clock = gi('clock')
const LockSimple = gi('lock')
const WarningOctagon = gi('alert')
const ShieldCheck = gi('shield-check')
const Lightning = gi('bolt')

const SORTS = [['route', '顺我路'], ['dist', '距离最近'], ['reward', '赏金最高'], ['deadline', '截止最早']]
let loadedOnce = false

export function TaskCard({ t, me, role, route, n = 0 }) {
  // 电脑版右边开着这一单时，列表里它亮起来
  const open = useOpenTaskId()
  const here = useLocation().pathname === `/app/task/${t.id}` || open === t.id
  const d = dist(RUNNER_HOME, t.from)
  const need = minCreditFor(t.reward)
  const locked = role === 'runner' && me.verified && t.posterId !== 'poster' && (me.credit ?? 0) < need
  return (
    <Link to={`/app/task/${t.id}`} className={`block rounded-2xl p-4 ring-1 transition active:scale-[0.99] hover:ring-accent/50 ${here ? 'bg-accent-soft ring-2 ring-accent' : 'bg-surface ring-line'}`}>
      <div className="flex items-center gap-2">
        <TypeTag type={t.type} />
        {t.urgent && <UrgentTag />}
        <span className="tnum ml-auto text-2xl font-bold tracking-tight">¥{t.reward}</span>
      </div>
      <h3 className="mt-3 text-[17px] font-semibold leading-snug">{t.title}</h3>
      {t.from !== t.to ? (
        <p className="mt-2.5 flex items-center gap-2 text-[15px] text-muted" aria-label={`${B[t.from]?.name} 到 ${B[t.to]?.name}`}>
          <span className="size-2.5 shrink-0 rounded-full bg-ink" />
          <span className="shrink-0 whitespace-nowrap">{B[t.from]?.name.replace(/（.*?）/, '')}</span>
          <span aria-hidden="true" className="h-0 min-w-6 flex-1 border-t-2 border-dashed border-line" />
          <span className="shrink-0 whitespace-nowrap">{B[t.to]?.name}</span>
          <span className="size-2.5 shrink-0 rounded-full bg-accent" />
        </p>
      ) : (
        <p className="mt-2.5 flex items-center gap-2 text-[15px] text-muted"><span className="size-2.5 shrink-0 rounded-full bg-accent ring-4 ring-accent-soft" />{B[t.from]?.name}</p>
      )}
      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted">
        <span className="inline-flex items-center gap-1"><Clock size={16} />{left(t.deadline)}</span>
        {route ? (() => {
          const m = detourMin(route.from, route.to, t)
          return <span className={`tnum inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 font-semibold ${m <= 5 ? 'bg-accent-soft text-accent' : 'bg-sunken text-ink'}`}>{n > 0 && <span className="grid size-[18px] place-items-center rounded-full bg-accent text-[11px] font-bold text-on-accent">{n}</span>}{m <= 5 ? '顺路 · ' : ''}多走 {m} 分钟</span>
        })() : (role === 'runner' ? <span className="tnum">距你 {fmtDist(d)}</span> : null)}
        <span className="basis-full">{t.posterId === 'poster' ? (role === 'poster' ? '我发布的' : `${t.posterName} · 信用 ${t.posterCredit}`) : `${t.posterName} · 信用 ${t.posterCredit}`}</span>
      </div>
      {t.posterId !== 'poster' && t.posterCredit < POSTER_WARN && (
        <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-danger-soft px-3 py-1.5 text-sm font-medium text-danger">
          <WarningOctagon size={16} weight="fill" />发单人信用偏低（{t.posterCredit}）
        </p>
      )}
      {locked && (
        <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-sunken px-3 py-1.5 text-sm font-medium text-muted">
          <LockSimple size={16} weight="bold" />需信用 ≥ {need} 才能接（你 {me.credit}）
        </p>
      )}
    </Link>
  )
}

function Skeleton() {
  return (
    <div className="space-y-3" aria-label="加载中">
      {[0, 1, 2].map((i) => (
        <div key={i} className="animate-pulse rounded-2xl bg-surface p-4 ring-1 ring-line">
          <div className="flex gap-2"><div className="h-7 w-16 rounded-full bg-sunken" /><div className="ml-auto h-7 w-12 rounded-full bg-sunken" /></div>
          <div className="mt-3 h-5 w-3/4 rounded-full bg-sunken" />
          <div className="mt-3 h-4 w-1/2 rounded-full bg-sunken" />
        </div>
      ))}
    </div>
  )
}

function RoleBanner() {
  const { state, act } = useStore()
  const me = state.accounts.runner
  const nav = useNavigate()
  // 第一次进来已经问过要不要指引，顶栏也一直有「新手指引」：大厅顶上不再放第二个入口，拒绝了就不打扰
  if (state.role === 'poster') {
    // 发单人也看得到顺路：常从哪寄到哪，路过的同学有几条
    const mine = state.tasks.filter((t) => t.posterId === 'poster')
    const from = mine[0]?.from || 'cainiao', to = mine[0]?.to || 'mei5'
    const passing = ROUTES.filter((r) => detourMin(r.from, r.to, { from, to }) <= 5)
    return (
      <Panel className="flex items-center gap-3 p-4">
        <span className="flex shrink-0 -space-x-2" aria-hidden="true">
          {(passing.length ? passing : [0]).slice(0, 3).map((_, k) => <img key={k} src={`${import.meta.env.BASE_URL}icons/avatar-runner-v2.webp`} width={30} height={30} alt="" className={`size-[30px] rounded-full bg-surface ring-2 ring-surface ${passing.length ? '' : 'opacity-40 grayscale'}`} />)}
        </span>
        <p className="flex-1 text-[15px] leading-snug text-muted">从<b className="whitespace-nowrap text-ink">{B[from].name.replace(/（.*?）/, '')}</b>到<b className="whitespace-nowrap text-ink">{B[to].name}</b>，有 <b className="text-accent">{passing.length} 条</b>同学常走的路正好经过</p>
        <Btn size="sm" onClick={() => nav('/app/publish')} className="relative before:absolute before:inset-x-0 before:-inset-y-1 before:content-['']">发一单</Btn>
      </Panel>
    )
  }
  if (!me.verified) {
    return (
      <Panel className="flex items-center gap-3 p-4">
        <ShieldCheck size={28} className="shrink-0 text-accent" />
        <p className="flex-1 text-[15px] leading-snug">未认证只能浏览。用学号或校园邮箱认证后才能接单。</p>
        <Btn size="sm" onClick={() => nav(state.tour.active && state.tour.taskId ? `/app/verify?back=/app/task/${state.tour.taskId}` : '/app/verify')}>去认证</Btn>
      </Panel>
    )
  }
  const lv = levelOf(me.credit)
  return (
    <Link to="/app/credit" className="flex items-center gap-3 rounded-2xl bg-accent-soft p-4">
      <span className="tnum text-3xl font-bold text-accent">{me.credit}</span>
      <p className="flex-1 text-[15px] leading-snug">信用等级<b>「{lv.name}」</b>：{lv.desc}</p>
      <ArrowRight size={18} className="text-accent" />
    </Link>
  )
}

export default function Hall() {
  const { state, act, loadError } = useStore()
  const reduce = useReducedMotion()
  const [type, setType] = useState('all')
  const [sort, setSort] = useState('route')
  // 手机上地图默认收成一行，任务列表先露出来；桌面默认展开
  // 地图默认展开：「顺路」要一进大厅就看得到；可以收起
  const [showMap, setShowMap] = useState(true)
  const [route, setRoute] = useState(() => {
    try { const r = JSON.parse(localStorage.getItem('shunluxia:myroute')); if (B[r?.from] && B[r?.to]) return r } catch { /* 读不到就用默认路线 */ }
    return { from: 'jiao1', to: 'mei5' }
  })
  const setLeg = (k) => (e) => setRoute((r) => {
    const n = { ...r, [k]: e.target.value }
    if (n.from === n.to) return r
    try { localStorage.setItem('shunluxia:myroute', JSON.stringify(n)) } catch { /* 存不了不影响使用 */ }
    return n
  })
  const [urgentOnly, setUrgentOnly] = useState(false)
  const [goodPoster, setGoodPoster] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errDismissed, setErrDismissed] = useState(false)
  useEffect(() => {
    if (!loading) return
    const t = setTimeout(() => { loadedOnce = true; setLoading(false) }, 350)
    return () => clearTimeout(t)
  }, [loading])

  const me = state.role === 'runner' ? state.accounts.runner : state.accounts.poster
  const runnerView = state.role === 'runner'
  const sortBy = !runnerView && sort === 'route' ? 'dist' : sort
  const sorts = runnerView ? SORTS : SORTS.filter(([k]) => k !== 'route')
  const [editRoute, setEditRoute] = useState(false)
  const list = useMemo(() => {
    let l = state.tasks.filter((t) => t.status === 'open')
    if (type !== 'all') l = l.filter((t) => t.type === type)
    if (urgentOnly) l = l.filter((t) => t.urgent)
    if (goodPoster) l = l.filter((t) => t.posterId === 'poster' || t.posterCredit >= 85)
    // 顺我路：顺路的单按路上经过的先后排（和地图上的 1、2、3 一致），不顺路的按多走的米数排在后面
    const mine = routePath(route.from, route.to).pts
    const routeKey = (t) => (detourMin(route.from, route.to, t) <= 5 && PLACES[t.from] ? along(mine, PLACES[t.from].door) : 10 + detourMeters(route.from, route.to, t))
    const key = { route: routeKey, dist: (t) => dist(RUNNER_HOME, t.from), reward: (t) => -t.reward, deadline: (t) => t.deadline }[sortBy]
    const t0 = Date.now()
    return [...l].sort((a, b) => (a.deadline < t0) - (b.deadline < t0) || key(a) - key(b))
  }, [state.tasks, type, sortBy, urgentOnly, goodPoster, route])
  // 地图和列表用同一份筛选结果：筛到 0 单，地图上也是 0 单
  const routeHits = list.filter((t) => t.deadline > Date.now() && detourMin(route.from, route.to, t) <= 5).map((t) => ({ ...t, dm: detourMeters(route.from, route.to, t) }))
  // 和地图上一样的编号：没过期、顺路的单按路上先后 1、2、3
  const numbered = list.filter((t) => t.deadline > Date.now() && detourMin(route.from, route.to, t) <= 5).map((t) => t.id)

  // 电脑版：地图放到右栏（没点开订单时），中间第一屏就是订单
  // 电脑版右边开着一单时，中间只留列表，地图不挤进来
  const openId = useOpenTaskId()
  const [deskSlot, setDeskSlot] = useState(null)
  useEffect(() => { const el = document.getElementById('desk-map-slot'); setDeskSlot((p) => (p === el ? p : el)) })
  const mapBlock = (
        <div className="rounded-2xl bg-accent-soft p-2 pb-3">
          {showMap && <CampusMap R={route} reduce={reduce} pills={false} walker={false} compact={!!deskSlot} legend
            hits={routeHits} />}
          <div className="px-2 pt-3">
          <div className="flex items-center gap-3">
            <span aria-hidden="true" className="hidden shrink-0 items-center sm:flex"><span className="size-2.5 rounded-full bg-ink" /><span className="h-0.5 w-5 bg-ink" /><span className="size-2.5 rounded-full bg-accent ring-2 ring-accent-soft" /><span className="h-0.5 w-5 bg-ink" /><span className="size-2.5 rounded-full bg-ink" /></span>
            <p className="min-w-0 flex-1 text-[15px] font-semibold leading-snug"><span className="whitespace-nowrap">{B[route.from].name.replace(/（.*?）/, '')} → {B[route.to].name.replace(/（.*?）/, '')}</span> <span className="block whitespace-nowrap text-sm font-normal text-accent sm:inline">{routeHits.length} 单顺路</span></p>
            <button onClick={() => setShowMap((v) => !v)} aria-expanded={showMap} className="-my-3 inline-flex min-h-11 shrink-0 items-center text-sm font-semibold text-accent">{showMap ? '收起地图' : '看地图'}</button>
            <button onClick={() => setEditRoute((v) => !v)} aria-expanded={editRoute} className="-my-3 inline-flex min-h-11 shrink-0 items-center text-sm font-semibold text-accent">{editRoute ? '收起路线' : '换条路'}</button>
          </div>
          <AnimatePresence initial={false}>
            {editRoute && (
              <motion.div initial={reduce ? false : { height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }} className="overflow-hidden">
                <div className="grid grid-cols-[auto_1fr] items-center gap-x-3 gap-y-2 pt-3 text-[15px] sm:grid-cols-[auto_1fr_auto_1fr]">
                  <span className="text-muted">从</span>
                  <span className="relative"><select aria-label="出发地" value={route.from} onChange={setLeg('from')} className="h-10 w-full appearance-none rounded-full bg-surface pl-4 pr-10 text-[15px] font-semibold ring-1 ring-inset ring-line focus:outline-none focus:ring-2 focus:ring-accent">
                    {BUILDINGS.map((b) => <option key={b.id} value={b.id} disabled={b.id === route.to}>{b.name}{b.id === route.to ? '（已是目的地）' : ''}</option>)}
                  </select><CaretDown size={16} weight="bold" className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-muted" /></span>
                  <span className="text-muted">去</span>
                  <span className="relative"><select aria-label="目的地" value={route.to} onChange={setLeg('to')} className="h-10 w-full appearance-none rounded-full bg-surface pl-4 pr-10 text-[15px] font-semibold ring-1 ring-inset ring-line focus:outline-none focus:ring-2 focus:ring-accent">
                    {BUILDINGS.map((b) => <option key={b.id} value={b.id} disabled={b.id === route.from}>{b.name}{b.id === route.from ? '（已是出发地）' : ''}</option>)}
                  </select><CaretDown size={16} weight="bold" className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-muted" /></span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          <p className="mt-2 hidden text-sm text-muted sm:block">按捎上每单要多走几分钟排，5 分钟以内标为顺路，绿点就是路上的单。</p>
          </div>
        </div>
  )
  return (
    <div className="space-y-5">
      {loadError && !errDismissed && (
        <div role="alert" className="flex items-start gap-3 rounded-2xl bg-danger-soft p-4 text-danger ring-1 ring-danger/30">
          <WarningOctagon size={24} weight="fill" className="shrink-0" />
          <div className="flex-1 text-[15px]">
            <p className="font-semibold">{loadError}</p>
            <p className="mt-0.5">已自动恢复为初始示例数据，可以继续体验。</p>
          </div>
          <button onClick={() => setErrDismissed(true)} className="text-sm font-semibold underline">知道了</button>
        </div>
      )}
      <RoleBanner />

      <div className="flex items-end justify-between">
        <h1 className="font-display text-[28px] leading-tight">任务大厅</h1>
        <span className="text-sm text-muted">{list.filter((t) => t.deadline > Date.now()).length} 个待接</span>
      </div>

      <div className="no-scrollbar -mx-4 -mt-1 mb-4 flex gap-1.5 overflow-x-auto px-4 py-1 sm:-mx-1 sm:gap-2 sm:px-1" role="group" aria-label="按类型筛选">
        {[['all', '全部'], ...TYPE_KEYS.map((k) => [k, TYPES[k].label])].map(([k, label]) => {
          return (
            <button key={k} onClick={() => setType(k)} aria-pressed={type === k}
              className={`relative before:absolute before:inset-x-0 before:-inset-y-1 before:content-[''] inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full px-3 text-[14px] font-semibold transition sm:px-4 sm:text-[15px] ${type === k ? 'bg-ink text-bg' : 'bg-surface text-ink ring-1 ring-line'}`}>
{label}
            </button>
          )
        })}

      </div>

      <div className="grid rounded-full bg-sunken p-1" style={{ gridTemplateColumns: `repeat(${sorts.length}, minmax(0, 1fr))` }} role="group" aria-label="排序">
        {sorts.map(([k, label]) => (
          <button key={k} onClick={() => setSort(k)} aria-pressed={sortBy === k}
            className={`relative h-9 whitespace-nowrap rounded-full text-sm font-semibold transition before:absolute before:inset-x-0 before:-inset-y-1 before:content-[''] ${sortBy === k ? 'bg-surface text-ink shadow-sm' : 'text-muted'}`}>{label}</button>
        ))}
      </div>

      {/* 两个开关单独一行，不和类型挤在一起 */}
      <div className="-mt-1 flex flex-wrap items-center justify-end gap-2" role="group" aria-label="更多筛选">
        <button onClick={() => setUrgentOnly((v) => !v)} aria-pressed={urgentOnly}
          className={`relative before:absolute before:inset-x-0 before:-inset-y-1.5 before:content-[''] inline-flex h-9 shrink-0 items-center gap-1 rounded-full px-3.5 text-[15px] font-semibold transition ${urgentOnly ? 'bg-ink text-bg' : 'bg-surface text-ink ring-1 ring-line'}`}>
          <Lightning size={16} weight="fill" />加急
        </button>
        {runnerView && <button onClick={() => setGoodPoster((v) => !v)} aria-pressed={goodPoster}
          className={`relative before:absolute before:inset-x-0 before:-inset-y-1.5 before:content-[''] inline-flex h-9 shrink-0 items-center gap-1 rounded-full px-3.5 text-[15px] font-semibold transition ${goodPoster ? 'bg-ink text-bg' : 'bg-surface text-ink ring-1 ring-line'}`}>
          <ShieldCheck size={16} weight="fill" />信用 ≥ 85
        </button>}
      </div>

      {sortBy === 'route' && !openId && (deskSlot ? createPortal(mapBlock, deskSlot) : mapBlock)}

      {loading ? <Skeleton /> : list.length === 0 ? (
        <Empty img="empty-search" alt="空纸箱和放大镜" title="这个分类暂时没人发单" hint="换个分类看看，或者自己发一单，附近顺路的同学会看到。"
          action={<Btn variant="ghost" onClick={() => { setType('all'); setUrgentOnly(false); setGoodPoster(false) }}>看全部任务</Btn>} />
      ) : (
        <motion.div layout={!reduce} className="space-y-3">
          <AnimatePresence initial={false}>
            {list.map((t) => (
              <motion.div key={t.id} layout={!reduce} initial={reduce ? false : { opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={spring}>
                <TaskCard t={t} me={me} role={state.role} route={sortBy === 'route' ? route : null} n={sortBy === 'route' ? numbered.indexOf(t.id) + 1 : 0} />
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      )}
      {state.role === 'poster' && !loading && (
        <Btn className="w-full" variant="ink" onClick={() => act('role', { role: 'poster' })} as={Link} to="/app/publish">发布跑腿任务</Btn>
      )}
    </div>
  )
}
