import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Receipt as PhReceipt, Megaphone as PhMegaphone } from '@phosphor-icons/react'
import { Routes, Route, NavLink, Link, useLocation } from 'react-router-dom'
import { motion, AnimatePresence, useReducedMotion } from 'motion/react'
import { ListMagnifyingGlass, PlusCircle, UserCircle, Compass } from '@phosphor-icons/react'
import { StoreProvider, useStore } from '../store'
import { ViewHost, ViewToggle, EMBED, HomeLink } from './ViewMode'
import { OpenTaskCtx } from './openTask'
import { Sheet, Btn, spring, gi, pi } from '../ui'
import Hall from './Hall'
import Publish from './Publish'
import TaskDetail from './TaskDetail'
import Orders from './Orders'
import Me from './Me'
import Verify from './Verify'
import CreditRules from './CreditRules'
import Wallet from './Wallet'
import TourBar from './TourBar'
import Coach from './Coach'
import DemoPanel from './DemoPanel'
import CampusMap from '../landing/CampusMap'
import { B, myRoute, detourMin, detourMeters } from '../data'
const Receipt = pi(PhReceipt)
const CheckCircle = gi('check')
const WarningCircle = gi('alert')
const Megaphone = pi(PhMegaphone)
const PersonSimpleRun = gi('runner')
const SealCheck = gi('seal')

export default function AppRoot() {
  // 框里的原型（?embed=）直接是 App；最外层先由 ViewHost 决定铺开还是放进框里
  const app = <StoreProvider><Shell /></StoreProvider>
  return EMBED ? app : <ViewHost>{app}</ViewHost>
}

function RoleSwitch() {
  const { state, act } = useStore()
  const { pathname } = useLocation()
  // 订单页切身份：页面换成另一方能做的事，回到顶上，免得主按钮躲在吸顶栏后面
  // 指引进行中不回顶部：下一步要点的按钮由指引自己（只在看不见时）滚出来，免得先上再下滚两趟
  const pick = (k) => { act('role', { role: k }); if (pathname.startsWith('/app/task/') && !state.tour.active) window.scrollTo({ top: 0, behavior: 'smooth' }) }
  const opts = [['poster', '发单人'], ['runner', '跑腿人']]
  return (
    <div className="relative grid grid-cols-2 rounded-full bg-sunken p-1" role="tablist" aria-label="切换角色">
      {/* 滑块用 CSS 位移，不跟页面布局联动：换页、滚动时不会从别处飞过来 */}
      <span aria-hidden="true" className={`absolute inset-y-1 left-1 w-[calc(50%-4px)] rounded-full bg-accent transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${state.role === 'runner' ? 'translate-x-full' : ''}`} />
      {opts.map(([k, label]) => (
        <button key={k} role="tab" aria-selected={state.role === k} onClick={() => pick(k)}
          className={`relative z-10 h-10 whitespace-nowrap rounded-full px-3 text-[15px] font-semibold transition-colors before:absolute before:inset-x-0 before:-inset-y-1 before:content-[''] ${state.role === k ? 'text-on-accent' : 'text-muted'}`}>
          <span className="max-[440px]:hidden">我是</span>{label}
        </button>
      ))}
    </div>
  )
}

// 提示条：只留一张，最近两条合在一起，放在顶栏下面，不叠、不挡顶栏
function Toasts() {
  const { state, act } = useStore()
  const { pathname } = useLocation()
  // 订单页上每一步的结果都直接画在页面里（进度、托管卡、收尾卡），不再弹提示条压内容
  const quiet = pathname.startsWith('/app/task/') || pathname.startsWith('/app/verify')
  // 换页就清掉上一页的提示，别把旧事实带到新页面
  useEffect(() => { state.toasts.forEach((t) => act('dismissToast', { tid: t.id })) }, [pathname]) // eslint-disable-line react-hooks/exhaustive-deps
  const reduce = useReducedMotion()
  const list = state.toasts.slice(-1)
  const last = list[list.length - 1]
  useEffect(() => {
    if (!last) return
    const id = setTimeout(() => list.forEach((t) => act('dismissToast', { tid: t.id })), 2200)
    return () => clearTimeout(id)
  }, [last?.id]) // eslint-disable-line react-hooks/exhaustive-deps
  const bad = list.some((t) => t.tone === 'bad')
  return (
    <div className={`pointer-events-none fixed inset-x-0 z-50 flex justify-center px-4 ${state.tour.active ? 'bottom-[calc(10.5rem+env(safe-area-inset-bottom))] xl:bottom-32' : 'bottom-[calc(4.75rem+env(safe-area-inset-bottom))] xl:bottom-6'} xl:-translate-x-20`} aria-live="polite">
      <AnimatePresence initial={false}>
        {last && !quiet && (
          <motion.div key="toast" layout initial={reduce ? false : { y: 12, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ opacity: 0, transition: { duration: 0.15 } }} transition={spring}
            className={`pointer-events-auto w-auto max-w-md space-y-1 rounded-full px-4 py-2.5 text-sm font-medium shadow-lg shadow-ink/10 ring-1 ${bad ? 'bg-danger-soft text-danger ring-danger/30' : 'bg-surface text-ink ring-line'}`}
            onClick={() => list.forEach((t) => act('dismissToast', { tid: t.id }))}>
            {list.map((t) => (
              <motion.p key={t.id} layout="position" initial={reduce ? false : { opacity: 0 }} animate={{ opacity: 1 }} className="flex items-start gap-2">
                {t.tone === 'bad' ? <WarningCircle size={20} weight="fill" className="mt-0.5 shrink-0" /> : <CheckCircle size={20} weight="fill" className="mt-0.5 shrink-0 text-accent" />}
                <span>{t.text}</span>
              </motion.p>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function Onboarding() {
  const { state, act } = useStore()
  // 从落地页的「顺路提醒」推送点进来：说好看这条路上的单，就直接以跑腿人身份进大厅，不先弹说明
  const fromPush = useLocation().search.includes('from=remind')
  useEffect(() => { if (fromPush) { act('role', { role: 'runner' }); if (!state.onboarded) act('onboarded'); try { localStorage.setItem('shunluxia:remind', '1') } catch { /* 存不了不影响 */ } } }, [fromPush]) // eslint-disable-line react-hooks/exhaustive-deps
  // 第一次进原型：先问一句要不要带着走；选了就开始「指哪点哪」，不选或关掉就正常用，记住选择不再问
  // 先让小窗收起来（约 0.3 秒），再出导览条和圈：不然导览条一出来会把正在收起的小窗往下推一截
  const go = () => { act('onboarded'); setTimeout(() => { act('tour', { tour: { active: true, taskId: null, done: false, dismissed: false } }); act('role', { role: 'poster' }) }, 320) }
  return (
    <Sheet open={!state.onboarded && !fromPush} onClose={() => act('onboarded')} title="第一次来？">
      <p className="text-[17px] leading-relaxed text-muted">跟着指引走完一单，约 2 分钟。一个人轮流扮演发单人和跑腿人，屏幕上会圈出每一步该点哪里。</p>
      <div className="mt-6 grid gap-2">
        <Btn size="lg" onClick={go}>带我走一遍</Btn>
        <Btn variant="ghost" onClick={() => act('onboarded')}>我自己逛逛</Btn>
      </div>
      <p className="mt-4 text-sm text-muted">以后想看，点顶栏的「新手指引」随时能重新开始。</p>
    </Sheet>
  )
}

// 顶栏里的「新手指引」：随时重新开始；上次没走完的那一单还在，就从那一步接着走
// 放在顶栏而不是浮在右下角：浮着会压住下面的内容（地图图例、星星、下拉框）
// 指引进行中只是隐藏（导览条上有退出），位置留着，身份切换不跟着挪
function GuideEntry() {
  const { state, act } = useStore()
  const t = state.tasks.find((x) => x.id === state.tour.taskId)
  const unfinished = t && !state.tour.done && !(t.status === 'completed' && t.ratingByPoster && t.ratingByRunner) && !['cancelled', 'refunded', 'disputed'].includes(t.status)
  const start = () => {
    if (unfinished) return act('tour', { tour: { active: true, dismissed: false } })
    act('tour', { tour: { active: true, taskId: null, done: false, dismissed: false } })
    act('role', { role: 'poster' })
  }
  const hidden = state.tour.active || !state.onboarded
  return (
    <button onClick={start} aria-label="新手指引" tabIndex={hidden ? -1 : undefined} className={`relative inline-flex h-10 min-w-11 shrink-0 items-center justify-center gap-1 rounded-full bg-sunken px-3 before:absolute before:inset-x-0 before:-inset-y-1 before:content-[''] text-[14px] font-semibold text-ink active:scale-[0.97] ${hidden ? 'invisible' : ''}`}>
      <Compass size={18} weight="bold" className="text-accent" /><span className={EMBED ? '' : 'max-xl:sr-only'}>新手指引</span>
    </button>
  )
}
const tabs = [
  ['/app', '大厅', 'nav-hall', true],
  ['/app/publish', '发布', 'nav-publish'],
  ['/app/orders', '订单', 'nav-orders'],
  ['/app/me', '我的', 'nav-me'],
]

// 页面转场：往里走（详情、钱包）从右边推进来，往回走从左边；底部标签之间按左右顺序滑
const TAB_ORDER = ['/app', '/app/publish', '/app/orders', '/app/me']
const depthOf = (p) => (TAB_ORDER.includes(p.replace(/\/$/, '') || '/app') ? 0 : 1)
function useDirection(pathname) {
  const prev = useRef(pathname)
  const dir = useRef(0)
  if (prev.current !== pathname) {
    const a = prev.current.replace(/\/$/, ''), b = pathname.replace(/\/$/, '')
    const da = depthOf(a), db = depthOf(b)
    dir.current = db !== da ? (db > da ? 1 : -1) : Math.sign(TAB_ORDER.indexOf(b) - TAB_ORDER.indexOf(a)) || 1
    prev.current = pathname
  }
  return dir.current
}

// 电脑版（≥1280）：网页的排法：左边导航，中间列表（大厅、订单、发布、我的），右边是点开的那一单；没点开时右边是演示面板
function useDesk() {
  const q = '(min-width: 1280px)'
  const [m, setM] = useState(() => typeof window !== 'undefined' && window.matchMedia(q).matches)
  useEffect(() => { const mm = window.matchMedia(q); const f = () => setM(mm.matches); mm.addEventListener('change', f); return () => mm.removeEventListener('change', f) }, [])
  return m
}

const LIST_ROUTES = (
  <>
    <Route index element={<Hall />} />
    <Route path="publish" element={<Publish />} />
    <Route path="orders" element={<Orders />} />
    <Route path="me" element={<Me />} />
    <Route path="verify" element={<Verify />} />
    <Route path="credit" element={<CreditRules />} />
    <Route path="wallet" element={<Wallet />} />
    <Route path="*" element={<Hall />} />
  </>
)

// 电脑版右栏在发布、订单、我的这些页：放一句用法，提示点开一单就在这里看
// 电脑版右栏没点开订单时：放「我常走的路」，同一张校园地图，这条路上此刻的顺路单，和这一周顺过几单
function RightHint() {
  const { state } = useStore()
  const reduce = useReducedMotion()
  const r = myRoute()
  const name = (id) => B[id]?.name.replace(/（.*?）/, '')
  const hits = state.tasks.filter((t) => t.status === 'open' && t.deadline > Date.now() && t.posterId !== 'runner' && detourMin(r.from, r.to, t) <= 5).map((t) => ({ ...t, dm: detourMeters(r.from, r.to, t) }))
  const done = state.tasks.filter((t) => t.status === 'completed' && (state.role === 'runner' ? t.runnerId === 'runner' : t.posterId === 'poster')).length
  const me = state.accounts[state.role]
  return (
    <div className="rounded-[24px] bg-accent-soft p-2 pb-4">
      <CampusMap R={r} hits={hits} reduce={reduce} pills={false} walker={false} compact legend />
      <div className="px-3 pt-3">
        <p className="text-[16px] font-bold">我常走的路 · {name(r.from)} → {name(r.to)}</p>
        <p className="mt-1 text-[14px] text-muted">此刻这条路上有 {hits.length} 单顺路，开了下课提醒就会推给你。</p>
        <dl className="mt-3 grid grid-cols-2 gap-2">
          <div className="rounded-xl bg-surface px-3 py-2.5"><dt className="text-[14px] text-muted">{state.role === 'runner' ? '顺路完成' : '发出的单走完'}</dt><dd className="tnum text-[22px] font-bold">{done} 单</dd></div>
          <div className="rounded-xl bg-surface px-3 py-2.5"><dt className="text-[14px] text-muted">我的信用</dt><dd className="tnum text-[22px] font-bold">{me.credit ?? '未认证'}</dd></div>
        </dl>
        <Link to={state.role === 'runner' ? '/app' : '/app/publish'} className="mt-3 inline-flex h-11 items-center gap-1.5 rounded-full bg-accent px-4 text-[15px] font-semibold text-on-accent active:scale-[0.97]">{state.role === 'runner' ? '去大厅接一单' : '再发一单'}</Link>
      </div>
    </div>
  )
}

function DeskShell({ sub, openTask }) {
  const { state } = useStore()
  const loc = useLocation()
  const { pathname } = loc
  const reduce = useReducedMotion()
  const taskOpen = pathname.startsWith('/app/task/')
  // 从某一单去认证：右栏留着那一单，认证完回去接着做
  const verifyBack = pathname.startsWith('/app/verify') ? (loc.search.match(/back=\/app\/task\/([^&]+)/) || [])[1] : null
  // 点开一单时，中间留着它所在的那张列表：自己发的、自己接的在「订单」，别人的在「大厅」
  const listPath = openTask && ((state.role === 'poster' && openTask.posterId === 'poster') || (state.role === 'runner' && openTask.runnerId === 'runner')) ? '/app/orders' : '/app'
  const top = state.tour.active ? 'top-[132px]' : 'top-20'
  // 自己会滚的栏：四周留 6px 再用负边距抵回去，卡片的描边和阴影不会被滚动框裁掉；吸顶位置也往上挪 6px，内容和别的栏对齐
  const topIn = state.tour.active ? 'top-[126px]' : 'top-[74px]'
  return (
    <div className="min-h-[100dvh] bg-bg">
      <header className="sticky top-0 z-30 border-b border-line bg-bg/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-[1440px] items-center justify-between gap-3 px-6">
          <HomeLink className="-m-1 flex shrink-0 items-center gap-2 rounded-xl p-1 text-lg font-bold tracking-tight">
            <img src={`${import.meta.env.BASE_URL}brand/logo-v2.png`} width={36} height={36} alt="顺路侠标志：背着书包、夹着包裹奔跑的小人" className="size-9" />
            顺路侠
          </HomeLink>
          <div className="flex items-center gap-2"><GuideEntry /><RoleSwitch /><ViewToggle inner /></div>
        </div>
        <TourBar wide />
      </header>
      <main className="mx-auto grid max-w-[1440px] grid-cols-[220px_minmax(0,1fr)_420px] 2xl:grid-cols-[260px_minmax(0,1fr)_480px] gap-6 px-6 pt-5">
        <nav className={`sticky ${top} self-start`} aria-label="主导航">
          <div className="grid gap-1">
            {tabs.map(([to, label, img, end]) => (
              <NavLink key={to} to={to} end={end} className={({ isActive: a0 }) => { const on = (taskOpen ? listPath : sub) ? to === (taskOpen ? listPath : sub) : a0; return `flex h-12 items-center gap-2.5 rounded-xl px-3 text-[15px] font-semibold transition-colors ${on ? 'bg-accent-soft text-accent' : 'text-muted hover:bg-sunken'}` }}>
                {({ isActive: a0 }) => { const on = (taskOpen ? listPath : sub) ? to === (taskOpen ? listPath : sub) : a0; return (<><img src={`${import.meta.env.BASE_URL}icons/${img}-v1.webp`} width={28} height={28} alt="" aria-hidden="true" className={`size-7 object-contain transition ${on ? '' : 'opacity-55 grayscale'}`} />{label}</>) }}
              </NavLink>
            ))}
          </div>
          {/* 演示面板放在导航下面：右栏留给地图和订单详情 */}
          <div className="-mx-1.5 mt-[18px] overflow-y-auto overscroll-contain p-1.5" style={{ maxHeight: `calc(100dvh - ${state.tour.active ? 148 : 96}px - 230px + 6px)` }}><DemoPanel /></div>
        </nav>
        <section aria-label="列表" className="min-w-0 pb-6" data-tour-root={taskOpen ? undefined : ''}>
          {taskOpen ? (
            // 右边开着一单：中间的列表自己滚，不跟着详情走，随时点另一单
            <div className={`sticky ${topIn} -m-1.5 overflow-y-auto overscroll-contain p-1.5`} style={{ maxHeight: `calc(100dvh - ${state.tour.active ? 148 : 96}px + 12px)` }}>
              <OpenTaskCtx.Provider value={pathname.split('/').pop()}><Routes location={{ ...loc, pathname: listPath, search: '' }}>{LIST_ROUTES}</Routes></OpenTaskCtx.Provider>
            </div>
          ) : (
            <div key={pathname} className={reduce ? '' : 'page-in'} style={{ '--dx': '8px' }}><Routes>{LIST_ROUTES}</Routes></div>
          )}
        </section>
        <aside aria-label={taskOpen ? '订单详情' : '演示面板'} className="min-w-0 pb-6" data-tour-root={taskOpen ? '' : undefined}>
          {taskOpen ? (
            <div key={pathname} className={reduce ? '' : 'page-in'} style={{ '--dx': '12px' }}>
              <Routes><Route path="task/:id" element={<TaskDetail />} /></Routes>
            </div>
          ) : (
            <div className={`sticky ${topIn} -m-1.5 space-y-5 overflow-y-auto overscroll-contain p-1.5`} style={{ maxHeight: `calc(100dvh - ${state.tour.active ? 148 : 96}px + 12px)` }}>
              {/* 大厅：跑腿人按「顺我路」排时，大厅把地图放进这一格；别的排法（发单人看大厅）这一格是空的，放「我常走的路」，右栏不空着 */}
              {(pathname === '/app' || pathname === '/app/') ? <><div id="desk-map-slot" className="peer" /><div className="hidden peer-empty:block"><RightHint /></div></>
                : pathname.startsWith('/app/publish') ? <div id="desk-side-slot" />
                : verifyBack ? <Routes location={{ ...loc, pathname: `/app/task/${verifyBack}`, search: '' }}><Route path="task/:id" element={<TaskDetail />} /></Routes>
                : <RightHint />}
            </div>
          )}
        </aside>
      </main>
      <Toasts />
      <Onboarding />
      <Coach />
    </div>
  )
}

function Shell() {
  const { state } = useStore()
  const { pathname, search } = useLocation()
  // 子页面亮它的来源标签：订单详情、从订单来的认证亮「订单」；钱包、信用规则、其他认证亮「我的」
  // 认证页从某个订单跳过来（back=/app/task/ID）时，按那一单算
  const backId = pathname.startsWith('/app/verify') ? (search.match(/back=\/app\/task\/([^&]+)/) || [])[1] : null
  const openTask = (pathname.startsWith('/app/task/') || backId) && state.tasks.find((x) => x.id === (backId || pathname.split('/').pop()))
  // 还没人接的单，是从大厅点进来的：亮「大厅」
  const sub = openTask && openTask.status === 'open' && openTask.posterId !== 'poster' ? '/app'
    : pathname.startsWith('/app/task') || (pathname.startsWith('/app/verify') && search.includes('back=/app/task')) ? '/app/orders'
    : ['/app/verify', '/app/wallet', '/app/credit'].some((p) => pathname.startsWith(p)) ? '/app/me' : null
  const reduce = useReducedMotion()
  const dir = useDirection(pathname)
  const desk = useDesk()
  useLayoutEffect(() => { window.scrollTo(0, 0) }, [pathname])
  if (desk) return <DeskShell sub={sub} openTask={openTask} />
  return (
    <div className="min-h-[100dvh] bg-bg">
      <header className="sticky top-0 z-30 border-b border-line bg-bg/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-xl items-center justify-between gap-3 px-4 xl:max-w-[66rem]">
          <HomeLink className="-m-1 flex shrink-0 items-center gap-2 rounded-xl p-1 text-lg font-bold tracking-tight">
            <img src={`${import.meta.env.BASE_URL}brand/logo-v2.png`} width={36} height={36} alt="顺路侠标志：背着书包、夹着包裹奔跑的小人" className="size-9" />
            <span className="max-[439px]:hidden">顺路侠</span>
          </HomeLink>
          <div className="flex items-center gap-2"><GuideEntry /><RoleSwitch /><ViewToggle inner /></div>
        </div>
        <TourBar />
      </header>
      <main className={`mx-auto max-w-xl overflow-x-clip px-4 pt-4 xl:-translate-x-20 pb-44`}>
        {/* 换页：CSS 动画（后台标签页里也会走完，不会停在半透明的中间帧） */}
        <div key={pathname} className={reduce || dir === 0 ? '' : 'page-in'} style={{ '--dx': `${12 * dir}px` }}>
        <Routes>
          <Route index element={<Hall />} />
          <Route path="publish" element={<Publish />} />
          <Route path="task/:id" element={<TaskDetail />} />
          <Route path="orders" element={<Orders />} />
          <Route path="me" element={<Me />} />
          <Route path="verify" element={<Verify />} />
          <Route path="credit" element={<CreditRules />} />
          <Route path="wallet" element={<Wallet />} />
          <Route path="*" element={<Hall />} />
        </Routes>
        </div>
      </main>
      <nav className={`fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/95 backdrop-blur xl:inset-x-auto xl:bottom-auto xl:left-[calc(50%-33rem)] ${state.tour.active ? 'xl:top-[132px]' : 'xl:top-20'} xl:w-36 xl:border-0 xl:bg-transparent xl:backdrop-blur-none`} aria-label="主导航">
        <div className="mx-auto grid max-w-xl grid-cols-4 pb-[env(safe-area-inset-bottom)] xl:grid-cols-1 xl:gap-1 xl:pb-0">
          {tabs.map(([to, label, img, end]) => (
            <NavLink key={to} to={to} end={end} className={({ isActive: a0 }) => { const isActive = sub ? to === sub : a0; return `relative flex h-16 flex-col items-center justify-center gap-0.5 text-[13px] font-semibold transition-colors xl:h-12 xl:flex-row xl:justify-start xl:gap-2.5 xl:rounded-xl xl:px-3 xl:text-[15px] ${isActive ? 'text-accent xl:bg-accent-soft' : 'text-muted xl:hover:bg-sunken'}` }}>
              {({ isActive: a0 }) => { const isActive = sub ? to === sub : a0; return (<><span aria-hidden="true" className={`absolute top-0 h-[3px] w-10 rounded-b-full bg-accent transition-[opacity,transform] duration-200 xl:hidden ${isActive ? 'opacity-100' : 'scale-x-0 opacity-0'}`} /><img src={`${import.meta.env.BASE_URL}icons/${img}-v1.webp`} width={28} height={28} alt="" aria-hidden="true" className={`size-7 object-contain transition ${isActive ? 'scale-110' : 'opacity-55 grayscale'}`} />{label}</>) }}
            </NavLink>
          ))}
        </div>
      </nav>
      <Toasts />
      <Onboarding />
      <Coach />
    </div>
  )
}
