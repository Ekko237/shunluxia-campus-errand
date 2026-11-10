import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { DeviceMobile, Desktop, ArrowLeft, ArrowsHorizontal } from '@phosphor-icons/react'

// 同一个 App、同一份数据，两种界面：手机版、电脑版。顶部一个切换，任何设备上都能切。
// 合适的那种直接铺满屏幕；不合适的那种放进一个框里（电脑上看手机版：居中的手机外框；手机上看电脑版：缩小的整页），
// 框里是同一个原型（iframe，地址带 ?embed=），切换时带上正在看的那一页，数据都在同一份本地存储里，不会丢。
const BASE = import.meta.env.BASE_URL
export const EMBED = (() => { try { const v = new URLSearchParams(window.location.search).get('embed'); return v === 'phone' || v === 'desk' ? v : null } catch { return null } })()
const Ctx = createContext({ view: null, pick: () => {} })
export const useView = () => useContext(Ctx)

const wideNow = (q) => typeof window !== 'undefined' && window.matchMedia(q).matches
function useMedia(q) {
  const [m, setM] = useState(() => wideNow(q))
  useEffect(() => { const mm = window.matchMedia(q); const f = () => setM(mm.matches); mm.addEventListener('change', f); return () => mm.removeEventListener('change', f) }, [q])
  return m
}

// 回首页的链接：在框里（?embed=）时要让最外层整页跳回首页，不在小框里打开首页
export function HomeLink({ children, onClick, ...p }) {
  if (!EMBED) return <Link to="/" onClick={onClick} {...p}>{children}</Link>
  return <a href={`${import.meta.env.BASE_URL}#/`} target="_top" onClick={onClick} {...p}>{children}</a>
}

// 顶栏里的「手机版 / 电脑版」：两个小图标按钮
export function ViewToggle({ inner = false }) {
  const { view, pick } = useView()
  if (inner && EMBED) return null
  const cur = EMBED || view
  const opts = [['phone', '手机版', DeviceMobile], ['desk', '电脑版', Desktop]]
  // 第一次进原型：在切换旁边冒一句，告诉他这里能换界面；点了或 6 秒后收起，同一次访问不再出现
  // 欢迎说明还开着时不冒，免得叠在它上面；框里那一份也不冒（外层已经有）
  const [hint, setHint] = useState(() => { try { return !EMBED && !sessionStorage.getItem('shunluxia:viewhint') && (() => { const st = JSON.parse(localStorage.getItem('shunluxia:v3') || 'null'); return !!st?.onboarded && !st?.tour?.active })() } catch { return false } })
  useEffect(() => { if (!hint) return; try { sessionStorage.setItem('shunluxia:viewhint', '1') } catch { /* 无痕模式 */ } const id = setTimeout(() => setHint(false), 6000); return () => clearTimeout(id) }, [hint])
  return (
    <div className="relative flex shrink-0 rounded-full bg-sunken p-1" role="group" aria-label="切换界面">
      {hint && (
        <button onClick={() => setHint(false)} className="absolute right-0 top-full z-40 mt-2 whitespace-nowrap rounded-xl bg-ink px-3 py-2 text-[13px] font-semibold text-bg shadow-lg">
          现在是{cur === 'desk' ? '电脑版' : '手机版'}，这里能换成{cur === 'desk' ? '手机版' : '电脑版'}
          <span aria-hidden="true" className="absolute -top-1 right-6 size-2.5 rotate-45 bg-ink" />
        </button>
      )}
      {opts.map(([k, label, I]) => (
        // 按钮本身 44px 高（上下用负边距抵回去，外框不变高），看得见的白色滑块还是原来的大小
        <button key={k} onClick={() => (EMBED ? embedPick(k) : pick(k))} aria-pressed={cur === k} title={label} aria-label={label}
          className={`group -my-1.5 grid h-11 place-items-center px-1 transition-colors ${cur === k ? 'text-ink' : 'text-muted hover:text-ink'}`}>
          <span className={`grid h-8 w-9 place-items-center rounded-full sm:w-auto sm:gap-1 sm:px-2.5 sm:[grid-auto-flow:column] ${cur === k ? 'bg-surface shadow-sm' : ''}`}>
            <I size={17} weight={cur === k ? 'fill' : 'regular'} /><span className="hidden text-[13px] font-semibold sm:inline">{label}</span>
          </span>
        </button>
      ))}
    </div>
  )
}

// 最外层：决定这一次是直接铺开，还是放进框里
export function ViewHost({ children }) {
  const wide = useMedia('(min-width: 1280px)')
  const roomy = useMedia('(min-width: 768px)')
  const [view, setView] = useState(() => { try { const v = sessionStorage.getItem('shunluxia:view'); if (v === 'phone' || v === 'desk') return v } catch { /* 无痕模式 */ } return wideNow('(min-width: 1024px)') ? 'desk' : 'phone' })
  const nav = useNavigate()
  const loc = useLocation()
  const frame = useRef(null)
  const pick = (v, path) => {
    try { sessionStorage.setItem('shunluxia:view', v) } catch { /* 存不了不影响 */ }
    if (path) nav(path, { replace: true })
    setView(v)
  }
  // 框里的原型点了切换：带着它正在看的那一页回来
  useEffect(() => {
    const f = (e) => { if (e.origin === window.location.origin && e.data?.type === 'shunluxia:view') pick(e.data.view, e.data.path) }
    window.addEventListener('message', f)
    return () => window.removeEventListener('message', f)
  }) // eslint-disable-line react-hooks/exhaustive-deps
  // #/app/phone、#/app/desk：可以单独分享的入口，进来就按这个界面打开大厅
  const entry = loc.pathname === '/app/phone' ? 'phone' : loc.pathname === '/app/desk' ? 'desk' : null
  useEffect(() => { if (entry) pick(entry, '/app') }, [entry]) // eslint-disable-line react-hooks/exhaustive-deps
  if (loc.pathname === '/app/start') return <Choose pick={(v) => pick(v, '/app')} />
  if (entry) return null
  const direct = (view === 'phone' && !roomy) || (view === 'desk' && wide)
  if (direct) return <Ctx.Provider value={{ view, pick: (v) => pick(v) }}>{children}</Ctx.Provider>
  const src = `${BASE}?embed=${view}#${loc.pathname}${loc.search}`
  return <Framed view={view} src={src} frame={frame} />
}

// 点「体验原型」先到这里：同一个 App 的两种界面，选一种进去；进去以后顶部还能随时换
function Choose({ pick }) {
  const cards = [
    ['phone', '手机版', '像用 App 一样走一单', 'preview-phone-v2', 640, 1385, '手机版顺路侠的任务大厅截图', DeviceMobile],
    ['desk', '电脑版', '在电脑上用网页版走一单', 'preview-desk-v3', 1600, 1000, '电脑版顺路侠的任务大厅截图：左侧导航、中间订单列表、右侧路线地图和演示面板', Desktop],
  ]
  return (
    <div className="min-h-[100dvh] bg-bg px-4 pb-12 text-ink md:px-8">
      <header className="mx-auto flex h-16 max-w-7xl items-center justify-between">
        <Link to="/" className="flex min-h-11 items-center gap-2.5 text-lg font-bold tracking-tight"><img src={`${BASE}brand/logo-v2.png`} width={36} height={36} alt="顺路侠标志：背着书包、夹着包裹奔跑的小人" className="size-9" />顺路侠</Link>
        <Link to="/" className="-my-3 inline-flex min-h-11 items-center gap-1.5 text-[15px] font-semibold text-muted hover:text-ink"><ArrowLeft size={16} weight="bold" />回首页</Link>
      </header>
      <main className="mx-auto max-w-7xl pt-2 md:pt-8">
        <h1 className="font-display text-[34px] leading-tight md:text-[48px]">用哪种界面走一单？</h1>
        <p className="mt-3 max-w-[40ch] text-lg leading-relaxed text-muted">同一个 App、同一份示例数据。进去以后顶部随时能换，发单人和跑腿人也随时能切。</p>
        <div className="mt-8 grid gap-5 md:grid-cols-[1fr_1.6fr]">
          {cards.map(([k, t, d, im, w, h, alt, I]) => (
            <button key={k} onClick={() => pick(k)} className={`group flex flex-col overflow-hidden rounded-[28px] bg-surface text-left ring-1 ring-line transition hover:-translate-y-0.5 hover:shadow-[0_24px_50px_-30px_rgba(17,40,30,0.5)] hover:ring-accent active:scale-[0.99]`}>
              {/* 预览：电脑上两张都是完整的缩略图；手机上手机版放大露出上半屏，大厅里的字看得清；手机版的「进入」在第一屏 */}
              <div className={`relative flex justify-center overflow-hidden bg-accent-soft px-6 pt-5 md:h-[300px] md:items-end lg:h-[380px] ${k === 'phone' ? 'h-[260px] items-start' : 'h-[210px] items-end'}`}>
                <img src={`${BASE}images/${im}.webp`} width={w} height={h} alt={alt} className={`rounded-t-2xl object-cover object-top shadow-[0_12px_30px_-18px_rgba(17,40,30,0.5)] ring-1 ring-line ${k === 'phone' ? 'w-[62%] md:h-full md:w-auto' : 'h-full w-auto max-w-full'}`} />
                {k === 'phone' && <span aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-accent-soft md:hidden" />}
              </div>
              <div className="flex items-center gap-3 p-5">
                <span className="grid size-11 shrink-0 place-items-center rounded-full bg-accent-soft text-accent"><I size={22} weight="fill" /></span>
                <span className="min-w-0 flex-1"><span className="block text-xl font-bold">{t}</span><span className="block text-[15px] text-muted">{d}</span></span>
                <span className="shrink-0 rounded-full bg-accent px-4 py-2 text-[15px] font-semibold text-on-accent">进入</span>
              </div>
            </button>
          ))}
        </div>
        <p className="mt-5 text-sm text-muted">在手机上看电脑版，按可读的比例显示、左右滑动看整页；电脑上看效果更好。</p>
      </main>
    </div>
  )
}

// 在框里时：顶栏的切换不能自己换，告诉外面那层，并带上当前页面
export function embedPick(v) {
  try { window.parent.postMessage({ type: 'shunluxia:view', view: v, path: window.location.hash.slice(1) || '/app' }, window.location.origin) } catch { /* 拿不到外层就算了 */ }
}

function Framed({ view, src, frame }) {
  const [box, setBox] = useState({ w: window.innerWidth, h: window.innerHeight })
  useEffect(() => { const f = () => setBox({ w: window.innerWidth, h: window.innerHeight }); window.addEventListener('resize', f); return () => window.removeEventListener('resize', f) }, [])
  const phone = view === 'phone'
  // 手机上看电脑版：不缩到看不清，按最小可读的比例（约 0.68）放，左右滑着看，高度铺满屏幕
  const W = phone ? 390 : 1280
  const s = phone ? Math.min(1, (box.h - 112) / (844 + 24)) : Math.min(1, Math.max(0.68, (box.w - 24) / W))
  const H = phone ? 844 : Math.max(820, Math.round((box.h - 72) / s))
  const pan = !phone && W * s > box.w - 24
  // 只在挂上的那一刻定地址：之后在框里点来点去，不让外层重新载入
  const [first] = useState(src)
  // 正在看某一单时切过来：横向直接停在右边的详情栏，不让人先看到列表、再去找
  const panBox = useRef(null)
  useEffect(() => { if (pan && /#\/app\/task\//.test(first) && panBox.current) panBox.current.scrollLeft = panBox.current.scrollWidth }, []) // eslint-disable-line react-hooks/exhaustive-deps
  // 第一次打开：画面自己往右滑一小段再滑回来，一看就知道能横着滑
  useEffect(() => {
    const b = panBox.current
    if (!pan || !b || /#\/app\/task\//.test(first) || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const t1 = setTimeout(() => b.scrollTo({ left: 72, behavior: 'smooth' }), 900)
    const t2 = setTimeout(() => b.scrollTo({ left: 0, behavior: 'smooth' }), 1700)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  // 导览要圈的东西在框外（手机上看电脑版，左右滑着看）：框里告诉外层目标在哪，外层把它滑到屏幕中间
  useEffect(() => {
    if (!pan) return
    const f = (e) => {
      const b = panBox.current
      if (e.origin !== window.location.origin || e.data?.type !== 'shunluxia:coach' || !b) return
      const x0 = 12 + e.data.x0 * W * s, x1 = 12 + e.data.x1 * W * s
      if (x0 >= b.scrollLeft && x1 <= b.scrollLeft + b.clientWidth) return
      b.scrollTo({ left: (x0 + x1) / 2 - b.clientWidth / 2, behavior: 'smooth' })
    }
    window.addEventListener('message', f)
    return () => window.removeEventListener('message', f)
  }, [pan, W, s])
  return (
    <div className="min-h-[100dvh] bg-sunken text-ink">
      <header className="flex h-14 items-center justify-between gap-3 px-4">
        <Link to="/" className="-my-3 inline-flex min-h-11 shrink-0 items-center gap-1.5 whitespace-nowrap text-[15px] font-semibold text-muted hover:text-ink"><ArrowLeft size={16} weight="bold" />回首页</Link>
        {!phone && (pan ? <p className="flex min-w-0 items-center gap-1.5 text-[14px] font-semibold text-accent"><ArrowsHorizontal size={16} weight="bold" className="shrink-0" /><span className="truncate">左右滑动看整页</span></p> : <p className="truncate text-[14px] text-muted">电脑版在电脑上看效果更好</p>)}
        <Ctx.Provider value={{ view, pick: (v) => { try { const h = frame.current.contentWindow.location.hash.slice(1) || '/app'; window.postMessage({ type: 'shunluxia:view', view: v, path: h }, window.location.origin) } catch { window.postMessage({ type: 'shunluxia:view', view: v }, window.location.origin) } } }}><ViewToggle /></Ctx.Provider>
      </header>
      <div ref={panBox} className={pan ? 'overflow-x-auto overscroll-x-contain px-3 pb-3' : 'flex justify-center pb-6'}>
        {phone ? (
          <div className="rounded-[52px] bg-ink p-3 shadow-[0_40px_80px_-40px_rgba(17,40,30,0.6)]" style={{ width: W * s + 24, height: H * s + 24 }}>
            <div className="relative overflow-hidden rounded-[40px] bg-bg" style={{ width: W * s, height: H * s }}>
              <span className="absolute inset-0 grid place-items-center text-sm font-semibold text-muted" aria-hidden="true">正在打开……</span>
              <iframe ref={frame} title="顺路侠手机版" src={first} className="absolute left-0 top-0 origin-top-left border-0" style={{ width: W, height: H, transform: `scale(${s})` }} />
            </div>
          </div>
        ) : (
          <div className="relative overflow-hidden rounded-xl bg-bg shadow-[0_24px_60px_-30px_rgba(17,40,30,0.5)] ring-1 ring-line" style={{ width: W * s, height: H * s }}>
            <span className="absolute inset-0 grid place-items-center text-sm font-semibold text-muted" aria-hidden="true">正在打开……</span>
            <iframe ref={frame} title="顺路侠电脑版" src={first} className="absolute left-0 top-0 origin-top-left border-0" style={{ width: W, height: H, transform: `scale(${s})` }} />
          </div>
        )}
      </div>
    </div>
  )
}
