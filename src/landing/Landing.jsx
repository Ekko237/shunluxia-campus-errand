import { CampusRoutes, ROUTES, routeHits } from './RouteHero'
import OneTake from './OneTake'
import { SceneMap, RouteBand } from './SceneMaps'
import Walkway from './Walkway'
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  motion, AnimatePresence, useReducedMotion, useScroll, useTransform, useSpring, useMotionValue, useInView, animate, useMotionValueEvent,
} from 'motion/react'
import { ArrowRight, ArrowLeft } from '@phosphor-icons/react'
import { findBanned } from '../data'
import { useNavigate } from 'react-router-dom'
import { routePath } from '../campusMap'
import { EN, tr } from '../i18n'
import LangSwitch from '../LangSwitch'

const ease = [0.16, 1, 0.3, 1]
const img = (name) => `${import.meta.env.BASE_URL}images/${name}.webp`
const icon = (name) => `${import.meta.env.BASE_URL}icons/${name}.webp`
function Reveal({ children, className = '', delay = 0, as = 'div', y = 12 }) {
  const reduce = useReducedMotion()
  const M = motion[as]
  return (
    <M className={className} initial={reduce ? false : { opacity: 0.4, y }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0, margin: '0px 0px 40% 0px' }} transition={{ duration: 0.3, delay: Math.min(delay, 0.05), ease }}>
      {children}
    </M>
  )
}

// 磁吸：按钮轻轻跟随指针，给「可点」一个手感；触屏和减弱动效时不启用
function Magnetic({ children, strength = 0.28 }) {
  const reduce = useReducedMotion()
  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const sx = useSpring(x, { stiffness: 220, damping: 16 })
  const sy = useSpring(y, { stiffness: 220, damping: 16 })
  const move = (e) => {
    if (reduce || e.pointerType !== 'mouse') return
    const r = e.currentTarget.getBoundingClientRect()
    x.set((e.clientX - (r.left + r.width / 2)) * strength)
    y.set((e.clientY - (r.top + r.height / 2)) * strength)
  }
  const leave = () => { x.set(0); y.set(0) }
  return <motion.div onPointerMove={move} onPointerLeave={leave} style={{ x: sx, y: sy }} className="inline-block">{children}</motion.div>
}

function Cta({ size = 'lg', className = '' }) {
  const big = size === 'lg'
  return (
    <Magnetic strength={big ? 0.28 : 0.15}>
      <Link to="/app/start" className={`group relative inline-flex items-center justify-center gap-2 overflow-hidden whitespace-nowrap rounded-full bg-accent font-semibold text-on-accent shadow-[0_10px_30px_-12px_rgba(11,122,85,0.7)] transition active:scale-[0.97] ${big ? 'h-14 px-7 text-[17px]' : 'h-11 px-4 text-[15px]'} ${className}`}>
        <span aria-hidden="true" className="absolute inset-0 -translate-x-full bg-ink/15 transition-transform duration-500 ease-out group-hover:translate-x-0" />
        {EN && !big ? <><span className="relative md:hidden">Try it</span><span className="relative max-md:hidden">Try the prototype</span></> : <span className="relative">{tr('体验原型', 'Try the prototype')}</span>}
        <ArrowRight size={big ? 20 : 16} weight="bold" className={`relative transition-transform duration-300 group-hover:translate-x-1 ${EN && !big ? 'max-md:hidden' : ''}`} />
      </Link>
    </Magnetic>
  )
}

function Anchor({ to, children, onClick, ...p }) {
  const go = (e) => {
    e.preventDefault()
    onClick?.()
    document.getElementById(to)?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' })
  }
  return <a href="#/" onClick={go} {...p}>{children}</a>
}

const H2 = ({ children, className = '' }) => (
  <h2 className={`font-display text-balance text-[34px] leading-[1.12] md:text-[44px] xl:text-[50px] ${className}`}>{children}</h2>
)
const Lead = ({ children, className = '' }) => <p className={`mt-5 max-w-[38ch] text-lg leading-relaxed text-muted md:text-xl ${className}`}>{children}</p>

function ScrollProgress() {
  const { scrollYProgress } = useScroll()
  const scaleX = useSpring(scrollYProgress, { stiffness: 140, damping: 26 })
  return <motion.div aria-hidden="true" style={{ scaleX }} className="fixed inset-x-0 top-0 z-50 h-[3px] origin-left bg-accent" />
}

const NAV_LINKS = [['story', tr('一单怎么走', 'How it works')], ['routes', tr('顺路地图', 'Route map')], ['safety', tr('发不出去', 'Blocked')], ['final', tr('下课提醒', 'Reminders')]]
const SECTIONS = [...NAV_LINKS]
function Nav({ page }) {
  const { scrollY } = useScroll()
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)
  const [cur, setCur] = useState(null)
  // 换页（首页 ↔ 产品思考）时目录一定先收起，不带到新页面
  useEffect(() => { setOpen(false) }, [page])
  // 目录打开时按 Esc 收起
  useEffect(() => { if (!open) return; const f = (e) => { if (e.key === 'Escape') setOpen(false) }; window.addEventListener('keydown', f); return () => window.removeEventListener('keydown', f) }, [open])
  // 桌面顶栏标出现在读到哪一节
  const [here, setHere] = useState(null)
  // 用原生滚动事件算（不依赖动画帧，后台标签页、低帧率时也准）；没进顶栏的两节（拦截、结尾）滚到时不亮任何一项
  useEffect(() => {
    const f = () => {
      setScrolled(window.scrollY > 420)
      setHere([...SECTIONS].reverse().find(([k]) => (document.getElementById(k)?.getBoundingClientRect().top ?? 1e9) < window.innerHeight * 0.35)?.[0] ?? null)
    }
    f(); window.addEventListener('scroll', f, { passive: true }); return () => window.removeEventListener('scroll', f)
  }, [page])
  const home = page !== 'thinking'
  const linkCls = 'group relative -my-2 py-3 transition-colors hover:text-ink'
  const under = (on) => <span className={`absolute inset-x-0 bottom-1.5 h-px origin-left bg-ink transition-transform duration-300 group-hover:scale-x-100 ${on ? 'scale-x-100' : 'scale-x-0'}`} />
  return (
    <header className={`sticky top-0 z-30 transition-[background-color,border-color,box-shadow] duration-300 ${scrolled || !home ? 'border-b border-line bg-bg shadow-[0_1px_0_rgba(0,0,0,0.02)]' : 'border-b border-transparent bg-bg/80 backdrop-blur-md'}`}>
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 md:px-8">
        {home ? (
          <Anchor to="top" className="flex min-h-11 items-center gap-2.5 text-lg font-bold tracking-tight">
            <img src={`${import.meta.env.BASE_URL}brand/logo-v2.png`} width={36} height={36} alt={tr('顺路侠标志：背着书包、夹着包裹奔跑的小人', 'Shunluxia logo: a kid with a backpack running with a parcel')} className="size-9" />{tr('顺路侠', 'Shunluxia')}
          </Anchor>
        ) : (
          <Link to="/" className="flex min-h-11 items-center gap-2.5 text-lg font-bold tracking-tight">
            <img src={`${import.meta.env.BASE_URL}brand/logo-v2.png`} width={36} height={36} alt={tr('顺路侠标志：背着书包、夹着包裹奔跑的小人', 'Shunluxia logo: a kid with a backpack running with a parcel')} className="size-9" />{tr('顺路侠', 'Shunluxia')}
          </Link>
        )}
        <nav className={`hidden items-center text-[15px] font-medium text-muted lg:flex ${EN ? 'gap-6 xl:gap-8' : 'gap-8'}`} aria-label={tr('页面导航', 'Page navigation')}>
          {home && NAV_LINKS.map(([to, l]) => <Anchor key={to} to={to} aria-current={here === to ? 'location' : undefined} className={`${linkCls} ${here === to ? 'text-ink' : ''}`}>{l}{under(here === to)}</Anchor>)}
          {home && <Link to="/thinking" className={linkCls}>{tr('产品思考', 'Product thinking')}{under(false)}</Link>}
        </nav>
        <div className="flex items-center gap-2">
          <div className={`transition-opacity duration-300 ${(scrolled || !home) && !open ? '' : 'max-md:pointer-events-none max-md:invisible max-md:opacity-0'}`}><Cta size="sm" /></div>
          {/* 手机顶栏放不下，语言切换在手机上放进目录里 */}
          <LangSwitch className="max-md:hidden" />
          {!home && <Link to="/" aria-label={tr('回首页', 'Back to home')} className="inline-flex h-11 items-center gap-1.5 rounded-full bg-sunken px-3 text-[15px] font-semibold active:scale-[0.97] md:px-4"><ArrowLeft size={16} weight="bold" />{EN ? <span><span className="max-md:hidden">Back </span>Home</span> : <span><span className="max-md:hidden">回</span>首页</span>}</Link>}
          {home && (
            <button onClick={() => { setCur(scrollY + innerHeight >= document.documentElement.scrollHeight - 4 ? SECTIONS[SECTIONS.length - 1][0] : [...SECTIONS].reverse().find(([id]) => (document.getElementById(id)?.getBoundingClientRect().top ?? 1e9) < innerHeight * 0.35)?.[0]); setOpen((v) => !v) }} aria-expanded={open} aria-controls="mnav" className="grid h-11 place-items-center rounded-full bg-sunken px-4 text-[15px] font-semibold active:scale-[0.97] lg:hidden">{open ? tr('收起', 'Close') : tr('目录', 'Menu')}</button>
          )}
        </div>
      </div>
      <AnimatePresence>
        {open && <motion.button key="scrim" aria-label={tr('关闭目录', 'Close menu')} onClick={() => setOpen(false)} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-x-0 bottom-0 top-16 bg-ink/40 lg:hidden" />}
        {open && (
          <motion.nav key="menu" id="mnav" aria-label={tr('页面目录', 'Page contents')} initial={{ y: -8 }} animate={{ y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}
            className="absolute inset-x-0 top-16 border-b border-line bg-bg px-4 pb-4 shadow-[0_20px_30px_-24px_rgba(17,40,30,0.35)] lg:hidden">
            <ol className="grid gap-1">
              {SECTIONS.map(([to, l], i) => (
                <li key={to}><Anchor to={to} onClick={() => setOpen(false)} aria-current={cur === to ? 'location' : undefined} className={`flex h-12 items-center gap-3 rounded-xl px-2 text-[17px] active:bg-sunken ${cur === to ? 'bg-accent-soft font-bold text-accent' : 'font-semibold'}`}><span className="tnum w-5 text-sm opacity-60">{i + 1}</span>{l}{cur === to && <span className="ml-auto text-sm font-semibold">{tr('你在这里', "You're here")}</span>}</Anchor></li>
              ))}
              <li className="mt-1 border-t border-line pt-1"><Link to="/thinking" onClick={() => setOpen(false)} className="flex h-12 items-center gap-3 rounded-xl px-2 text-[17px] font-semibold active:bg-sunken"><span className="w-5" />{tr('产品思考', 'Product thinking')}<ArrowRight size={16} weight="bold" className="ml-auto text-muted" /></Link></li>
              <li className="flex h-12 items-center gap-3 px-2 text-[17px] font-semibold"><span className="w-5" />{tr('语言', 'Language')}<LangSwitch className="ml-auto" /></li>
              <li className="pt-2"><Link to="/app/start" onClick={() => setOpen(false)} className="flex h-12 items-center justify-center gap-2 rounded-full bg-accent text-[17px] font-semibold text-on-accent active:scale-[0.98]">{tr('体验原型', 'Try the prototype')}<ArrowRight size={18} weight="bold" /></Link></li>
            </ol>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  )
}

const SCENES = EN ? [
  {
    key: 'express', tab: 'The long line at the parcel station', short: 'Station line', route: ['Cainiao parcel station', 'Plum Court Bldg 5', 'Students heading from Teaching Bldg 1 back to Plum Court, 1 extra min'], img: 'scene-express-v3', alt: 'A campus parcel station at dusk, shelves piled with packages and a long line at the door',
    who: 'Xiaohe, a junior with a packed schedule',
    pain: "The parcel station has a 20 minute line in the evening. My last class ends at 17:50 and it closes at 18:00. Three parcels have been sitting there for three days. Asking my roommates means owing favors, and with strangers I worry about my pickup code being misused.",
    fix: 'Post an order for ¥5. The pickup code shows only after someone accepts. On delivery you check the delivery code face to face, and only then is the payment released.',
  },
  {
    key: 'seat', tab: 'A library seat before 8 a.m.', short: 'Early seat', route: ['Bamboo Court', 'Library', 'Students walking from Bamboo Court to Teaching Bldg 1 pass the Library'], img: 'scene-seat-v4', alt: 'The library in the early morning, clay figure Yuan putting a book on an empty window seat to save it',
    who: 'Zhou Yan, grad exam prep, lives far away',
    pain: "My dorm is a kilometer from the library, and the window seats are gone by 7:40 every day. Someone who lives next door could save one on the way, but I don't know who's reliable.",
    fix: "Runners' credit scores are public. Accept an order and don't show up, and you lose 5 points on the spot, so you can take fewer orders next time.",
  },
  {
    key: 'handoff', tab: 'Hand-off at the dorm door', short: 'Door hand-off', route: ['North Gate', 'Peach Court Bldg 2', 'Students coming in the North Gate back to Peach Court, 3 extra min'], img: 'scene-handoff-v4', alt: 'A dorm entrance at dusk, clay figure Yuan handing a takeout bag to a student at the door',
    who: 'Xu Yizhou, buried in homework',
    pain: "Takeout gets left at the North Gate pickup spot, and walking it up to the 6th floor takes ten minutes. Someone heading back to the dorm could bring it up, but we're strangers, and I don't want to give a stranger my room number.",
    fix: 'The order board shows this order first to people heading back to that dorm. The room number appears only after someone accepts, and hides again when the order ends.',
  },
] : [
  {
    key: 'express', tab: '排长队的快递驿站', short: '驿站排队', route: ['菜鸟驿站', '梅园 5 号楼', '一教下课回梅园的同学，多走 1 分钟'], img: 'scene-express-v3', alt: '傍晚的校园快递驿站，货架上堆满包裹，门口排着长队',
    who: '大三，课排满的小禾',
    pain: '驿站傍晚要排二十分钟，我 17:50 才下课，18:00 就关门。三个快递放了三天，找室友要欠人情，找陌生人又怕取件码被乱用。',
    fix: '发一单 ¥5。取件码只在有人接单后才给对方看，送到后当面核验送达码，钱才放出去。',
  },
  {
    key: 'seat', tab: '早八前的图书馆座位', short: '早八占座', route: ['竹园', '图书馆', '从竹园去一教、路过图书馆的同学，就在路上'], img: 'scene-seat-v4', alt: '清晨的图书馆，黏土小人阿远把一本书放在靠窗的空位上占座',
    who: '考研，住得远的周砚',
    pain: '宿舍离图书馆一公里，每天 7:40 靠窗位就没了。住在旁边的同学顺手就能占，但不知道谁靠谱。',
    fix: '跑腿人的信用分公开可见。接了不去算爽约，直接扣 5 分，下次能接的单就变少。',
  },
  {
    key: 'handoff', tab: '宿舍楼下的交接', short: '楼下交接', route: ['北门', '桃园 2 号楼', '从北门进校回桃园的同学，多走 3 分钟'], img: 'scene-handoff-v4', alt: '傍晚的宿舍楼门口，黏土小人阿远把外卖纸袋递给站在门口的同学',
    who: '赶作业下不了楼的许一舟',
    pain: '外卖放在北门取餐点，走回 6 楼要十分钟。正好回宿舍的同学顺手就能捎上来，可彼此不认识，也不想把宿舍号给陌生人。',
    fix: '大厅把这单优先推给顺路回宿舍的同学，顺路回宿舍的人最先看到；宿舍号接单后才显示，订单结束自动隐藏。',
  },
]

// 拦截演示：一张真实的发布表单，备注里自己打出「代签到」，输入框变红、拦截卡弹出、发布按钮变灰
const BAN_DEMO = EN ? ['Bring breakfast to Teaching Bldg 1', 'Sign in for me this afternoon', 'Save a seat on Library 3F', 'Do my homework, name your price'] : ['帮忙带份早饭到一教', '下午帮我代签到一下', '图书馆三楼占个座', '帮我代写作业，价格好说']
const BAN_CHIPS = EN ? ['take my exam', 'sit my exam', 'sign in for me', 'answer roll call', 'do my homework', 'do my online course'] : ['代考', '替考', '代签到', '代点名', '代写作业', '代刷网课']
const BANNED_EN = [...BAN_CHIPS, 'sign me in', 'take the exam for me', 'write my essay', 'write my paper', 'exam answers', 'cheat']
const findBannedAny = (text) => (EN ? [...BANNED_EN.filter((w) => text.toLowerCase().includes(w)), ...findBanned(text)] : findBanned(text))
function BanDemo() {
  const reduce = useReducedMotion()
  const nav = useNavigate()
  const ref = useRef(null)
  const on = useInView(ref, { amount: 0.4 })
  const [i, setI] = useState(1)
  const [n, setN] = useState(reduce ? BAN_DEMO[1].length : 0)
  // 用户一点输入框，自动打字就停下、清空，换成他自己打的字
  const [own, setOwn] = useState(null)
  const text = BAN_DEMO[i]
  useEffect(() => {
    if (reduce || !on || own !== null) return
    if (n < text.length) { const id = setTimeout(() => setN(n + 1), 120); return () => clearTimeout(id) }
    const id = setTimeout(() => { setI((i + 1) % BAN_DEMO.length); setN(0) }, 3400)
    return () => clearTimeout(id)
  }, [n, text, on, reduce, i, own])
  const typed = own ?? text.slice(0, n)
  const hit = findBannedAny(typed)[0] ? [findBannedAny(typed)[0]] : null
  return (
    <div ref={ref} className="rounded-[24px] bg-surface p-5 text-ink shadow-[0_30px_60px_-30px_rgba(0,0,0,0.6)]" aria-label={tr('发布表单拦截演示', 'Post form blocking demo')}>
      <p className="text-[15px] font-semibold">{tr('备注（选填）', 'Note (optional)')}</p>
      <div className="relative mt-2">
        <input value={typed} onFocus={() => setOwn((v) => v ?? '')} onChange={(e) => setOwn(e.target.value)} maxLength={40} aria-label={tr('备注（选填），可以自己打字试试', 'Note (optional), try typing your own')}
          placeholder={tr('比如：帮我代签到', 'e.g. sign in for me')} aria-invalid={!!hit}
          className={`h-12 w-full rounded-xl px-3.5 text-base text-ink ring-1 transition-colors placeholder:text-muted focus:outline-none ${hit ? 'bg-danger-soft ring-2 ring-danger focus:ring-danger' : 'bg-bg ring-line focus:ring-2 focus:ring-accent'}`} />
        {own === null && (EN ? (
          <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center whitespace-pre text-base"><span className="invisible">{typed}</span><span className="ml-px h-5 w-0.5 animate-pulse bg-ink motion-reduce:animate-none" /></span>
        ) : <span aria-hidden="true" className="pointer-events-none absolute top-1/2 h-5 w-0.5 -translate-y-1/2 animate-pulse bg-ink motion-reduce:animate-none" style={{ left: `calc(16px + ${typed.length}em)` }} />)}
      </div>
      {/* 提示区固定高度：拦截卡只淡入淡出，下面的按钮不跟着跳 */}
      <div className="relative mt-3 h-[96px] md:h-[80px]">
        <AnimatePresence initial={false} mode="wait">
          {hit ? (
            <motion.div key="ban" initial={reduce ? false : { opacity: 0, y: -4 }} animate={reduce ? { opacity: 1, y: 0 } : { opacity: 1, y: 0, x: [0, -6, 6, -3, 0] }} exit={{ opacity: 0, transition: { duration: 0.1 } }} transition={{ duration: 0.18, x: { duration: 0.36, delay: 0.12 } }}
              className="absolute inset-0 flex items-center gap-3 rounded-2xl bg-danger-soft p-3 ring-1 ring-danger/30">
              <img src={icon('blocked-v1')} width={48} height={48} alt="" className="size-12 shrink-0 object-contain" />
              <p className="text-[15px] font-semibold leading-snug text-danger">{EN ? <>Blocked: "{hit[0]}". Shunluxia is for helping, not cheating.</> : <>检测到「{hit[0]}」。这类任务发不出去，顺路侠是互助，不帮人作弊。</>}</p>
            </motion.div>
          ) : (
            <motion.p key="ok" initial={reduce ? false : { opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: 0.1 } }} transition={{ duration: 0.18 }}
              className="absolute inset-0 flex items-center rounded-2xl px-1 text-[15px] text-muted">{tr('一边打字一边检查，没问题就能发布。', "We check as you type. If it's fine, you can post.")}</motion.p>
          )}
        </AnimatePresence>
      </div>
      {/* 真按钮：合规时带着这句备注去原型的发布页；被拦时变灰不能点 */}
      <button type="button" disabled={!!hit} onClick={() => { try { sessionStorage.setItem('shunluxia:draft-note', typed) } catch { /* 存不了就空着进 */ } nav('/app/publish?as=poster') }}
        className={`mt-3 grid h-12 w-full place-items-center rounded-full text-[15px] font-semibold active:scale-[0.98] disabled:cursor-not-allowed ${hit ? 'bg-sunken text-muted' : 'bg-accent text-on-accent'}`}>{hit ? tr('不能发布', "Can't post") : tr('带着这句去原型里发布 →', 'Post this in the prototype →')}</button>
      <p className="mt-4 text-[14px] font-semibold text-muted">{tr('会被拦下的词（点一个试试）', 'Blocked phrases (tap one to try)')}</p>
      <ul className="mt-2 flex flex-wrap gap-1.5">
        {BAN_CHIPS.map((w) => (
          <li key={w}><button type="button" onClick={() => setOwn(tr(`帮我${w}一下`, `Can you ${w}?`))} className={`h-11 rounded-full px-3 text-[14px] font-semibold transition-colors active:scale-[0.96] md:h-9 ${hit && hit[0] === w ? 'bg-danger text-on-accent' : 'bg-sunken text-ink/75 hover:bg-line'}`}>{w}</button></li>
        ))}
      </ul>
    </div>
  )
}

function Safety() {
  const reduce = useReducedMotion()
  return (
    <section id="safety" className="mx-auto max-w-7xl scroll-mt-16 px-4 pb-6 pt-6 md:px-8 md:pb-8 md:pt-8">
      <Reveal className="relative overflow-hidden rounded-[32px] bg-accent-ink md:rounded-[40px]">
        <div className="relative grid gap-10 px-6 py-14 text-bg md:px-14 md:py-20 lg:grid-cols-12 lg:items-center">
          <div className="lg:col-span-6">
            <h2 className="font-display text-[44px] font-bold leading-[1.05] tracking-[-0.03em] md:text-7xl">{EN ? <>These orders <br className="md:hidden" />get blocked</> : <>这些单<br className="md:hidden" /><span className="max-md:hidden">，</span>发不出去</>}</h2>
            <p className="mt-5 max-w-[34ch] text-lg leading-relaxed opacity-85 md:text-xl">{tr('互助不等于帮人作弊。发布时自动识别关键词并拦截，被举报核实的账号直接封禁。', "Helping out doesn't mean helping someone cheat. Flagged keywords are blocked as you post, and accounts confirmed through reports get banned.")}</p>

          </div>
          <div className="lg:col-span-5 lg:col-start-8"><BanDemo /></div>
        </div>
      </Reveal>
    </section>
  )
}

// 北极星：100 个点里 97 个按时（绿），3 个没按时（空心），进入视口时一个个点亮
function DotMatrix() {
  const reduce = useReducedMotion()
  const ref = useRef(null)
  const on = useInView(ref, { once: true, amount: 0.5 })
  // 100 条小路线：97 条按时送到（实线），3 条没按时（红色虚线）
  return (
    <div ref={ref} className="mx-auto grid w-full max-w-[260px] md:mx-0 min-w-0 grid-cols-10 gap-x-1 gap-y-2.5 md:w-max md:max-w-none md:gap-x-2" aria-hidden="true">
      {Array.from({ length: 100 }, (_, i) => {
        const bad = i === 23 || i === 58 || i === 86
        return (
          <motion.span key={i} className="flex items-center" initial={reduce ? false : { opacity: 0.12 }} animate={on ? { opacity: 1 } : {}}
            transition={{ duration: 0.2, delay: reduce ? 0 : (i % 10) * 0.025 + Math.floor(i / 10) * 0.05 }}>
            <span className={`size-1.5 rounded-full ${bad ? 'bg-[#f07a6c]' : 'bg-on-accent'}`} />
            <span className={`h-0 w-2 border-t-2 md:w-4 ${bad ? 'border-dashed border-[#f07a6c]' : 'border-on-accent/80'}`} />
            <span className={`size-1.5 rounded-full ${bad ? 'bg-[#f07a6c]' : 'bg-on-accent'}`} />
          </motion.span>
        )
      })}
    </div>
  )
}

function Metrics() {
  return (
    <section id="metrics" className="scroll-mt-16">
      <div className="mx-auto max-w-7xl px-4 pb-12 pt-8 md:px-8 md:pb-16 md:pt-10">
        <div className="max-w-4xl"><Reveal><H2>{EN ? <>Three numbers<span className="sr-only"> </span><br />tell you if it's healthy</> : <>看三个数<span className="sr-only">，</span><br />就知道平台健不健康</>}</H2></Reveal></div>
        <div className="mt-14 grid grid-cols-[minmax(0,1fr)] gap-3 md:grid-cols-2 lg:grid-cols-3 lg:grid-rows-2">
          <Reveal className="flex flex-col justify-between rounded-2xl bg-accent-deep p-6 text-on-accent md:col-span-2 md:p-10 lg:row-span-2">
            <div>
              <p className="flex items-center gap-2 text-lg font-semibold"><span className="opacity-80">{tr('北极星指标：履约率', 'North star: fulfillment rate')}</span><span className="rounded-full bg-on-accent/15 px-2 py-0.5 text-[13px]">{tr('目标', 'Target')}</span></p>
              <div className="mt-6 grid gap-8 md:grid-cols-[auto_1fr] md:items-end">
                <DotMatrix />
                <div>
                  <p className="text-7xl font-bold tracking-[-0.04em] md:text-[112px] md:leading-none">97%</p>
                  <p className="mt-2 text-lg font-semibold">{tr('每 100 趟顺路，至少 97 趟按时送到', 'Out of every 100 trips, at least 97 arrive on time')}</p>
                </div>
              </div>
            </div>
            <p className="mt-10 max-w-[44ch] text-lg leading-relaxed opacity-90">{tr('按时送达且无申诉的单 ÷ 被接的单。大家敢用，靠的就是接了就送到。这个数掉了，别的指标再好也没用。', 'On-time orders with no disputes ÷ accepted orders. People trust it because accepted orders get delivered. If this number drops, nothing else matters.')}</p>
          </Reveal>
          <Reveal delay={0.05} className="rounded-2xl bg-bg p-6 ring-1 ring-line">
            <p className="flex items-center gap-2 text-lg font-semibold">{tr('接单率', 'Acceptance rate')}<span className="rounded-full bg-sunken px-2 py-0.5 text-[13px] text-muted">{tr('目标', 'Target')}</span></p>
            <p className="mt-1 text-5xl font-bold tracking-tight text-accent"><span className="mr-2 align-middle text-base font-semibold tracking-normal opacity-80">{tr('至少', 'At least')}</span> 85%</p>
            <p className="mt-4 text-[15px] leading-relaxed text-muted">{tr('24 小时内被接的单 ÷ 发布的单。低了说明供给不够或定价偏低。', 'Orders accepted within 24 hours ÷ orders posted. If it drops, there are too few runners or prices are too low.')}</p>
          </Reveal>
          <Reveal delay={0.1} className="rounded-2xl bg-bg p-6 ring-1 ring-line">
            <div>
              <p className="flex items-center gap-2 text-lg font-semibold">{tr('接单时长中位数', 'Median time to accept')}<span className="rounded-full bg-sunken px-2 py-0.5 text-[13px] text-muted">{tr('目标', 'Target')}</span></p>
              <p className="mt-1 text-5xl font-bold tracking-tight text-accent"><span className="mr-2 align-middle text-base font-semibold tracking-normal opacity-80">{tr('不超过', 'At most')}</span> {tr('10 分钟', '10 min')}</p>
              <p className="mt-4 text-[15px] leading-relaxed text-muted">{tr('发布到被接的中位时间。跑腿要的是快，超过 10 分钟用户就会自己去。', 'Median time from posting to acceptance. Errands need to be fast. After 10 minutes, people just go themselves.')}</p>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  )
}

const ROADMAP = EN ? [
  { when: 'Now', t: 'On-your-way orders + after-class reminders', d: 'Pick "I\'m heading from Teaching Bldg 1 to Plum Court" and the order board sorts orders by how many extra minutes each one adds. Anything within 5 minutes is marked on your way. 5 minutes before class ends, you get the orders on that route.' },
  { when: 'Next month', t: 'Routes from your timetable', d: "Import your class schedule and it learns when you walk and between which buildings each day, so you don't have to set your usual routes." },
  { when: 'Next semester', t: 'Dorm leaders vouch', d: 'Dorm leaders and club heads can vouch for new users, so they get started faster.' },
  { when: 'Next semester', t: 'WeChat mini program', d: 'Post, accept, and get reminders right inside WeChat, no browser needed.' },
  { when: 'Within a year', t: 'Schools across a city', d: 'Schools in the same city share credit, with secondhand swaps and group buys added.' },
] : [
  { when: '现在', t: '顺路接单 + 下课提醒', d: '选好「我正要从一教回梅园」，大厅就按捎上每单要多走几分钟排序，5 分钟以内标为顺路；下课前 5 分钟把这条路上的单推给你。' },
  { when: '下个月', t: '课表自动认路', d: '导入课表，自动认出你每天几点、从哪栋楼走回哪栋楼，不用自己设常走的路。' },
  { when: '下学期', t: '楼长担保', d: '宿舍楼长、社团负责人做担保人，新人起步更快。' },
  { when: '下学期', t: '上线小程序', d: '不用打开网页，微信里就能发单、接单和收提醒。' },
  { when: '一年内', t: '同城多校', d: '同城多校共享信用，开放二手互助和拼单。' },
]

function Roadmap() {
  return (
    <section id="roadmap" className="mx-auto max-w-7xl scroll-mt-16 px-4 pb-12 pt-8 md:px-8 md:pb-16 md:pt-10 lg:pb-20">
      <Reveal><H2>{tr('接下来做什么', "What's next")}</H2></Reveal>
      <ol className="relative mt-12 grid gap-8 lg:grid-cols-5 lg:gap-6">
        <span aria-hidden="true" className="absolute bottom-2 left-[7px] top-2 w-0.5 border-l-2 border-dashed border-line lg:bottom-auto lg:left-2 lg:right-0 lg:top-[7px] lg:h-0.5 lg:w-auto lg:border-l-0 lg:border-t-2" />
        <span aria-hidden="true" className="absolute left-[6px] top-2 h-24 w-1 rounded-full bg-accent lg:left-2 lg:top-[6px] lg:h-1 lg:w-[18%]" />
        {ROADMAP.map((r, i) => (
          <Reveal as="li" key={r.t} delay={i * 0.06} className="relative pl-10 lg:pl-0 lg:pt-10">
            <span aria-hidden="true" className={`absolute left-0 top-1 size-4 rounded-full ring-4 ring-bg lg:top-0 ${i === 0 ? 'bg-accent' : 'bg-surface ring-offset-0 [box-shadow:inset_0_0_0_2px_var(--line)]'}`} />
            <p className={`text-[15px] font-semibold ${i === 0 ? 'text-accent' : 'text-muted'}`}>{r.when}</p>
            <p className="mt-2 text-2xl font-bold tracking-tight md:text-3xl lg:text-2xl">{r.t}</p>
            <p className="mt-3 max-w-[30ch] text-base leading-relaxed text-muted">{r.d}</p>
          </Reveal>
        ))}
      </ol>
    </section>
  )
}

// 首屏之后第二段：从「一条路」放大到「整个校园」
function Routes() {
  return (
    // 一单讲完，纸色的一页从深绿上盖上来：圆角顶边压住叙事的最后一屏
    <section id="routes" className="relative z-10 -mt-16 scroll-mt-16 rounded-t-[40px] bg-bg shadow-[0_-30px_60px_-30px_rgba(10,79,57,0.55)] md:rounded-t-[56px]">
      <div className="mx-auto max-w-7xl px-4 pb-16 pt-20 md:px-8 md:pb-20 md:pt-28 lg:pb-24">
        <div className="grid gap-6 lg:grid-cols-12 lg:items-end">
          <Reveal className="lg:col-span-7"><h2 className="font-display text-[clamp(38px,4.6vw,64px)] leading-[1.08]">{EN ? <>Right now,<span className="sr-only"> </span><br />people are on their way all over campus</> : <>同一时间<span className="sr-only">，</span><br />校园里到处有人顺路</>}</h2></Reveal>
          <Reveal delay={0.05} className="lg:col-span-5"><p className="max-w-[34ch] text-[17px] leading-[1.7] text-ink/80 md:text-lg">{tr('阿远那一单只是其中一条。选一条路，看看此刻这条路上还有几单，顺手能捎上多少。', "Yuan's order is just one of them. Pick a route to see how many orders are on it right now, and how much you could pick up on the way.")}</p></Reveal>
        </div>
        <div className="mt-8"><CampusRoutes /></div>
      </div>
    </section>
  )
}

// 结尾：选你下课常走的路，当场算出此刻有几单顺路；带着这条路进原型（大厅按它排序）
function Final({ page }) {
  const nav = useNavigate()
  // 结尾让人真的选一条自己的路：锁屏推送、单数、按钮带进原型的路线都跟着换
  const [ri, setRi] = useState(0)
  const R = ROUTES[ri]
  const reduce = useReducedMotion()
  const hits = routeHits(R)
  const n = hits.length
  const go = () => { try { localStorage.setItem('shunluxia:myroute', JSON.stringify({ from: R.from, to: R.to })) } catch { /* 存不了就用默认路线 */ } nav('/app?from=remind') }
  // 锁屏壁纸就是校园地图：选哪条路，镜头平移到那条路的终点，亮绿的线沿路重画到终点
  const lockPts = routePath(R.from, R.to).pts
  const lockD = lockPts.map(([x, y], i) => `${i ? 'L' : 'M'}${x} ${y}`).join(' ')
  const lockEnd = lockPts[lockPts.length - 1]
  const lockVx = Math.max(0, Math.min(1600 - 420, lockEnd[0] - 210))
  // 终点放在时间和推送之间的空当（壁纸 32% 高处）；那条路在图的下半边、放不上去时，放到推送下面（84%）
  const lockVy = Math.max(0, Math.min(200, lockEnd[1] - 224 > 200 ? lockEnd[1] - 588 : lockEnd[1] - 224))
  const goBtn = (
    <button onClick={go} className="group relative inline-flex h-14 items-center gap-2 overflow-hidden whitespace-nowrap rounded-full bg-accent px-7 text-[17px] font-semibold text-on-accent shadow-[0_10px_30px_-12px_rgba(11,122,85,0.7)] transition active:scale-[0.97]">
      <span className="relative">{tr('带着这条路去看看', 'Try it with this route')}</span><ArrowRight size={20} weight="bold" className="relative transition-transform duration-300 group-hover:translate-x-1" />
    </button>
  )
  return (
    <section id="final" className={`scroll-mt-16 ${page === 'thinking' ? 'border-t border-line' : ''}`}>
      {page === 'thinking' ? (
        <div className="mx-auto max-w-3xl px-4 py-20 text-center md:py-28">
          <Reveal><h2 className="font-display text-balance text-[40px] leading-[1.08] md:text-6xl">{EN ? <>That's the idea.<br />Now try it</> : <>想法讲完了<br />点一遍看看</>}</h2></Reveal>
          <Reveal delay={0.05}><p className="mx-auto mt-5 max-w-[32ch] text-lg text-muted">{EN ? <>In the prototype you play both the requester and the runner. One order takes about 2 minutes.</> : <>原型里一个人就能分别扮演发单人和<span className="whitespace-nowrap">跑腿人</span>，大约 2 分钟走完一单。</>}</p></Reveal>
          <Reveal delay={0.1} className="mt-8"><Cta /></Reveal>
        </div>
      ) : (
      <div className="mx-auto grid max-w-7xl gap-10 px-4 pb-16 pt-8 md:px-8 md:pb-24 md:pt-10 lg:grid-cols-12 lg:items-center lg:gap-12">
        <div className="lg:col-span-5">
          <Reveal><h2 className="font-display text-balance text-[40px] font-bold leading-[1.08] tracking-[-0.035em] md:text-7xl">{EN ? <>Which way do you<br />walk after class?</> : <>你下课<br />常走哪条路？</>}</h2></Reveal>
          <Reveal delay={0.05}>
            <div className="mt-8 flex flex-wrap gap-1.5 md:gap-2" role="group" aria-label={tr('选你常走的路', 'Pick the route you usually walk')}>
              {ROUTES.map((x, i) => (
                <button key={x.label} onClick={() => setRi(i)} aria-pressed={i === ri}
                  className={`h-11 whitespace-nowrap rounded-full px-3 text-[14px] font-semibold transition-colors active:scale-[0.97] md:px-4 md:text-[15px] ${i === ri ? 'bg-ink text-bg' : 'bg-surface text-ink ring-1 ring-line'}`}>{x.label}</button>
              ))}
            </div>
          </Reveal>
          <Reveal delay={0.1}>
            <p className="mt-8 text-lg text-muted md:text-xl" aria-live="polite">{tr('此刻路上有', 'Right now')} <AnimatePresence mode="wait" initial={false}><motion.b key={n} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.18 }} className="tnum inline-block text-3xl text-accent md:text-4xl">{n}</motion.b></AnimatePresence> {EN ? <>{n === 1 ? 'order is' : 'orders are'} on your way, each within 5 extra minutes</> : <>单顺路，<span className="whitespace-nowrap">捎上都在 5 分钟以内</span></>}</p>
            <p className="mt-3 max-w-[34ch] text-[15px] text-muted">{tr('在原型「我的」里打开下课提醒，下课前 5 分钟把这条路上的单推给你。', 'Turn on the after-class reminder under "Me" in the prototype, and you\'ll get the orders on this route 5 minutes before class ends.')}</p>
          </Reveal>
          <Reveal delay={0.15} className="mt-10 flex max-lg:hidden">
            <Magnetic>{goBtn}</Magnetic>
          </Reveal>
        </div>
        {/* 收尾是一块手机锁屏：17:45 下课，顺路提醒弹进来；选哪条路，推送就跟着换。点推送就进原型 */}
        <Reveal delay={0.1} className="flex justify-center lg:col-span-7">
          <div className="relative aspect-[9/15] w-full max-w-[300px] overflow-hidden rounded-[44px] bg-ink p-2.5 shadow-[0_40px_80px_-40px_rgba(17,40,30,0.6)] md:max-w-[340px]">
            <div className="relative size-full overflow-hidden rounded-[36px]">
              <motion.svg aria-hidden="true" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 size-full" initial={false} animate={{ viewBox: `${lockVx} ${lockVy} 420 700` }} transition={{ duration: reduce ? 0 : 0.7, ease: [0.16, 1, 0.3, 1] }}>
                <image href={`${import.meta.env.BASE_URL}images/campus-map-v3.webp`} width="1600" height="900" style={{ filter: 'blur(3px) brightness(0.55)' }} />
                <motion.path key={ri} d={lockD} fill="none" stroke="var(--accent-glow)" strokeWidth="12" strokeLinecap="round" strokeLinejoin="round"
                  initial={reduce ? false : { pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.1, delay: 0.25, ease: [0.16, 1, 0.3, 1] }} />
                <circle cx={lockPts[0][0]} cy={lockPts[0][1]} r="13" fill="var(--accent-glow)" />
                <circle cx={lockEnd[0]} cy={lockEnd[1]} r="16" fill="var(--ink)" stroke="var(--accent-glow)" strokeWidth="7" />
              </motion.svg>
              <div className="relative flex h-full flex-col items-center px-3 pt-12 text-bg">
                <p className="text-sm font-semibold opacity-80">{R.lock}</p>
                <p className="tnum mt-1 text-[64px] font-light leading-none tracking-[-0.03em] md:text-[72px]">{R.time}</p>
                <div className="mt-10 w-full space-y-2">
                  <AnimatePresence mode="popLayout" initial={false}>
                    <motion.button key={ri} onClick={go} layout initial={reduce ? false : { opacity: 0, y: -24, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }} transition={{ type: 'spring', stiffness: 380, damping: 28 }}
                      className="flex w-full gap-2.5 rounded-[20px] bg-surface/95 p-3 text-left text-ink shadow-lg backdrop-blur-md active:scale-[0.98]">
                      <img src={`${import.meta.env.BASE_URL}brand/logo-v2.png`} width={36} height={36} alt="" className="size-9 shrink-0 rounded-[10px]" />
                      <span className="min-w-0 flex-1 text-[14px]">
                        <span className="flex justify-between gap-2 font-semibold"><span>{tr('顺路提醒', 'On-your-way alert')}</span><span className="font-normal text-ink/70">{tr('现在', 'now')}</span></span>
                        <span className="mt-0.5 block leading-snug">{EN ? <>{R.short.replace('→', ' → ')}: <b className="text-accent">{n} {n === 1 ? 'order' : 'orders'}</b> on your way. {R.verb}.</> : <>{R.short.replace('→', ' → ')} 上有 <b className="text-accent">{n} 单</b>顺路，<span className="whitespace-nowrap">{R.verb}</span></>}</span>
                      </span>
                    </motion.button>
                  </AnimatePresence>
                  <div className="flex gap-2.5 rounded-[20px] bg-surface/95 p-3 text-left text-[14px] text-ink backdrop-blur-md" aria-hidden="true">
                    <img src={`${import.meta.env.BASE_URL}brand/logo-v2.png`} width={36} height={36} alt="" className="size-9 shrink-0 rounded-[10px] opacity-80" />
                    <span className="min-w-0 flex-1"><span className="flex justify-between gap-2 font-semibold"><span>{tr('托管已放款', 'Payment released')}</span><span className="font-normal text-ink/70">{tr('昨天', 'yesterday')}</span></span><span className="mt-0.5 block leading-snug">{EN ? <>Xiaoman confirmed. ¥5 received, credit +2</> : <>小满确认收到，¥5 到账，<span className="whitespace-nowrap">信用 +2</span></>}</span></span>
                  </div>
                </div>
                <p className="mt-auto pb-6 text-[14px] font-semibold opacity-80">{tr('轻点推送，看看这条路上的单', 'Tap the alert to see orders on this route')}</p>
              </div>
            </div>
          </div>
        </Reveal>
        <div className="flex justify-center lg:hidden">{goBtn}</div>
      </div>
      )}
      {page !== 'thinking' && <Finale />}
      <footer className="border-t border-line">
        <div className="mx-auto grid max-w-7xl gap-6 px-4 py-10 text-sm text-muted md:grid-cols-[1fr_auto] md:items-center md:px-8">
          <div>
            <span className="flex items-center gap-2 text-[15px] font-semibold text-ink"><img src={`${import.meta.env.BASE_URL}brand/logo-v2.png`} width={28} height={28} alt="" aria-hidden="true" className="size-7" />{tr('顺路侠 · 本来就要经过，顺手捎一下', "Shunluxia · You're walking past anyway. Grab it on the way.")}</span>
            <p className="mt-2">{tr('校园跑腿互助平台产品原型。页面中的人名、任务、金额和指标均为示例。', 'A product prototype for campus errand sharing. All names, orders, amounts, and metrics on this page are examples.')}</p>
          </div>
          <div className="grid gap-4 md:justify-items-end">
            {/* 页脚也放语言切换：手机上产品思考页没有「目录」菜单，这里是它唯一的入口 */}
            <span className="flex items-center gap-3">{tr('语言', 'Language')}<LangSwitch /></span>
            {/* 「体验原型」先到选择页挑手机版还是电脑版；这里也能再回去选 */}<Link to="/app/start" className="-my-3 inline-flex min-h-11 items-center font-semibold text-ink underline-offset-4 hover:underline">{tr('选手机版 / 电脑版', 'Pick Phone or Desktop')}</Link>{page !== 'thinking' ? <Link to="/thinking" className="-my-3 inline-flex min-h-11 items-center font-semibold text-ink underline-offset-4 hover:underline">{tr('产品思考', 'Product thinking')}</Link> : <Link to="/" className="-my-3 inline-flex min-h-11 items-center font-semibold text-ink underline-offset-4 hover:underline">{tr('回首页', 'Back to home')}</Link>}
            <p>{tr('演示数据只存在这台设备的浏览器里', 'Demo data lives only in this browser')} · <button onClick={() => { if (window.confirm(tr('把原型里的演示数据恢复成刚打开时的样子？', 'Reset the demo data in the prototype to how it was when you first opened it?'))) { try { Object.keys(localStorage).filter((k) => k.startsWith('shunluxia:')).forEach((k) => localStorage.removeItem(k)) } catch { /* 无痕模式下没有本地存储 */ } } }}
              className="-my-3 inline-flex min-h-11 items-center font-semibold text-ink underline-offset-4 hover:underline">{tr('重置演示数据', 'Reset demo data')}</button></p>
          </div>
        </div>
      </footer>
    </section>
  )
}

// 结尾：阿远从左边走进来（立绘左右翻过来，朝右），沿着点线往右走，经过按钮正下方时按钮外圈亮起一圈光，走过的那段点线变成实线，然后他从右边走出画面；
// 和段与段之间的小路同一个方向，读法和进度条一样；按钮一直是白底实心，随时能点
function Finale() {
  const reduce = useReducedMotion()
  const ref = useRef(null)
  const seen = useInView(ref, { once: true, amount: 0.5 })
  const f = useMotionValue(0)
  const [lit, setLit] = useState(false)
  const [walking, setWalking] = useState(false)
  useEffect(() => {
    if (!seen || reduce) return
    setWalking(true)
    const c = animate(f, 1, { duration: 3.4, ease: 'linear' })
    c.then(() => setWalking(false))
    return () => c.stop()
  }, [seen, reduce, f])
  // 阿远的中心从 -12% 走到 112%；走到一半正好在按钮下面
  useMotionValueEvent(f, 'change', (v) => { if (v >= 0.5) setLit(true) })
  const left = useTransform(f, [0, 1], ['-12%', '112%'])
  const trail = useTransform(f, [12 / 124, 112 / 124], [0, 1])
  const on = lit || reduce
  return (
    <section ref={ref} aria-label={tr('结尾', 'Finale')} className="relative flex min-h-[86svh] flex-col justify-center overflow-hidden bg-accent text-on-accent">
      <div className="relative z-10 mx-auto w-full max-w-7xl px-4 pb-40 pt-24 text-center md:px-8 md:pb-48">
        <Reveal><h2 className="font-display text-[clamp(52px,8vw,120px)] leading-[1.02]">{EN ? <>After class tomorrow,<span className="sr-only"> </span><br />grab one on the way</> : <>明天下课<span className="sr-only">，</span><br />顺手捎一单</>}</h2></Reveal>
        <Reveal delay={0.06}><p className="mx-auto mt-6 max-w-[30ch] text-[18px] leading-relaxed md:text-xl">{tr('本来就要走的那条路，多走一两分钟，帮同学把快递带回去。', 'The walk you were taking anyway. A minute or two more, and a classmate gets their parcel.')}</p></Reveal>
        <Reveal delay={0.12} className="mt-10 flex justify-center">
          <Link to="/app/start" className={`group relative inline-flex h-14 items-center gap-2 whitespace-nowrap rounded-full bg-bg px-8 text-[17px] font-semibold text-accent-deep transition-shadow duration-500 active:scale-[0.97] ${on ? 'shadow-[0_0_0_8px_rgba(246,251,248,0.2),0_18px_40px_-18px_rgba(0,0,0,0.45)]' : 'shadow-[0_18px_40px_-18px_rgba(0,0,0,0.45)]'}`}>
            {lit && !reduce && <motion.span aria-hidden="true" className="pointer-events-none absolute inset-0 rounded-full border-2 border-bg" initial={{ scale: 1, opacity: 0.9 }} animate={{ scale: 1.45, opacity: 0 }} transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }} />}
            {tr('体验原型', 'Try the prototype')}<ArrowRight size={20} weight="bold" className="transition-transform duration-300 group-hover:translate-x-1" />
          </Link>
        </Reveal>
      </div>
      <div aria-hidden="true" className="absolute inset-x-0 bottom-14 h-24 md:bottom-16 md:h-32">
        <span className="absolute inset-x-0 bottom-3 border-t-[6px] border-dotted border-on-accent/35" />
        <motion.span className="absolute inset-x-0 bottom-3 h-[6px] origin-left rounded-full bg-on-accent/70" style={{ scaleX: reduce ? 1 : trail }} />
        {reduce ? (
          <img src={`${import.meta.env.BASE_URL}brand/runner-v1.webp`} width={169} height={240} alt="" className="absolute bottom-3 left-[62%] h-full w-auto max-w-none -translate-x-1/2 -scale-x-100 drop-shadow-[0_12px_10px_rgba(0,0,0,0.25)]" />
        ) : (
          <motion.div className="absolute bottom-3 h-full -translate-x-1/2" style={{ left }}>
            <motion.img src={`${import.meta.env.BASE_URL}brand/runner-v1.webp`} width={169} height={240} alt="" className="h-full w-auto max-w-none drop-shadow-[0_12px_10px_rgba(0,0,0,0.25)]" style={{ scaleX: -1 }}
              animate={walking ? { y: [0, -6, 0] } : { y: 0 }} transition={walking ? { duration: 0.42, repeat: Infinity, ease: 'easeInOut' } : { duration: 0.2 }} />
          </motion.div>
        )}
      </div>
    </section>
  )
}

const COMPARE = EN ? [
  ['Who holds the money', ['Paid upfront', 'The platform', 'Escrow until delivery']],
  ['Can you trust them', ['Luck', 'Unknown courier', 'Real name + credit']],
  ['If something goes wrong', ['On your own', 'Support line', 'Proof + disputes']],
  ['Price per order', ['Whatever', 'From ¥8', 'From ¥3']],
  ['Who sees your room no.', ['The whole group', 'The courier', 'Just the runner']],
] : [
  ['钱谁先拿', ['先转账', '平台扣', '托管到送达']],
  ['人靠不靠谱', ['看运气', '骑手不认识', '实名 + 信用分']],
  ['出了事找谁', ['自己找', '平台客服', '凭证 + 申诉']],
  ['一单多少钱', ['随口说', '¥8 起', '顺路 ¥3 起']],
  ['宿舍号谁能看', ['全群', '骑手', '接单的同学']],
]

// 推理是一段路：往下读，翠绿从第一站往下铺，铺到哪一站，哪一站亮起来
const REASONS = EN ? [
  ['Who uses it', 'Students whose time is chopped up by class schedules and who care about privacy. Small needs, often, and a fear of getting burned.'],
  ["Why no one does it well yet", "Delivery apps don't go into dorms. Campus group chats have no escrow and no credit, so people only trust friends."],
  ['What on your way fixes', "The runner is walking that way anyway. With 5 extra minutes or less, even a small reward is worth it, so runners show up on their own."],
] : [
  ['谁在用', '时间被课表切碎、又在意隐私的在校生。需求小、频次高、怕被坑。'],
  ['为什么现在没人做好', '外卖平台不进宿舍楼，校园群接龙没有托管和信用，熟人才敢托付。'],
  ['顺路解决什么', '跑腿人本来就要走这条路，多走 5 分钟以内，赏金低也愿意接，供给自然就有。'],
]
function ReasonRoad() {
  const reduce = useReducedMotion()
  const ref = useRef(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start 0.75', 'end 0.6'] })
  const fill = useSpring(scrollYProgress, { stiffness: 160, damping: 30 })
  const [lit, setLit] = useState(reduce ? 3 : 0)
  useMotionValueEvent(fill, 'change', (v) => setLit(v > 0.97 ? 3 : v > 0.47 ? 2 : v > 0.02 ? 1 : 0))
  const on = (i) => reduce || i < lit
  return (
    <ol ref={ref} className="relative max-w-3xl space-y-10">
      <span aria-hidden="true" className="absolute bottom-3 left-[7px] top-3 border-l-2 border-dashed border-line" />
      <motion.span aria-hidden="true" className="absolute bottom-3 left-[6px] top-3 w-1 origin-top rounded-full bg-accent" style={{ scaleY: reduce ? 1 : fill }} />
      {REASONS.map(([t, d], i) => (
        <Reveal as="li" key={t} delay={0.05 * i} className="relative pl-10">
          <span aria-hidden="true" className={`absolute left-0 top-1.5 size-4 rounded-full ring-4 ring-bg transition-colors duration-300 ${on(i) ? 'bg-accent' : 'bg-surface [box-shadow:inset_0_0_0_2px_var(--line)]'}`}>
            {on(i) && !reduce && <motion.span className="absolute inset-0 rounded-full bg-accent" initial={{ opacity: 0.6, scale: 1 }} animate={{ opacity: 0, scale: 2.6 }} transition={{ duration: 0.8, ease: 'easeOut' }} />}
          </span>
          <p className={`text-[15px] font-semibold transition-colors duration-300 ${on(i) ? 'text-accent' : 'text-muted'}`}>{t}</p>
          <p className="mt-1.5 text-xl leading-relaxed md:text-2xl">{d}</p>
        </Reveal>
      ))}
    </ol>
  )
}

function ThinkingIntro() {
  return (
    <section className="mx-auto max-w-7xl px-4 pb-16 pt-14 md:px-8 md:pt-20">
      <Reveal><p className="text-[15px] font-semibold text-accent">{tr('产品思考', 'Product thinking')}</p></Reveal>
      <Reveal delay={0.05}><h1 className="mt-3 font-display text-balance text-[44px] leading-[1.08] md:text-7xl">{EN ? <>Why "on your way"</> : <>为什么是<span className="whitespace-nowrap">「顺路」</span></>}</h1></Reveal>
      <Reveal delay={0.1} className="mt-10"><RouteBand /></Reveal>
      <div className="mt-14 grid gap-12 lg:grid-cols-12 lg:gap-16">
      <div className="lg:col-span-7">
      {/* 一条推理，画成一段路：三站走下来，结论放大 */}
      <ReasonRoad />
      <Reveal className="mt-14 max-w-3xl border-l-4 border-accent pl-6">
        <p className="font-display text-[30px] leading-[1.2] md:text-[44px]">{EN ? <>Don't find more people to run errands.<span className="sr-only"> </span><br />Let people already walking help on the way.</> : <>不是多找人跑腿<span className="sr-only">，</span><br />是让本来就要走的人顺手。</>}</p>
      </Reveal>
      </div>
      {/* 同一件事，现在的三种办法摆在一起比 */}
      <Reveal delay={0.1} className="lg:col-span-5">
        <div className="rounded-[24px] bg-surface p-5 ring-1 ring-line md:p-6 lg:sticky lg:top-28">
          <p className="text-[15px] font-semibold text-muted">{tr('托人取个快递，现在有三种办法', 'Three ways to get a parcel picked up today')}</p>
          {/* 手机上四列放不下：每一行拆成一小块，三种办法横着并排 */}
          <p className="mt-4 grid grid-cols-3 gap-2 border-b border-line pb-2 text-[14px] font-semibold text-muted sm:hidden" aria-hidden="true"><span>{tr('群接龙', 'Group chat')}</span><span>{tr('外卖跑腿', 'Delivery app')}</span><span className="text-accent">{tr('顺路侠', 'Shunluxia')}</span></p>
          <dl className="divide-y divide-line sm:hidden">
            {COMPARE.map(([k, v]) => (
              <div key={k} className="py-3">
                <dt className="text-sm font-semibold text-muted">{k}</dt>
                <dd className="mt-1.5 grid grid-cols-3 gap-2 text-[15px]">
                  {v.map((x, i) => <span key={i} className={i === 2 ? 'font-bold text-accent' : 'text-ink/80'}><span className="sr-only">{EN ? `${['Group chat', 'Delivery app', 'Shunluxia'][i]}: ` : `${['群接龙', '外卖跑腿', '顺路侠'][i]}：`}</span>{x}</span>)}
                </dd>
              </div>
            ))}
          </dl>
          <table className="mt-4 w-full text-left text-[15px] max-sm:hidden">
            <thead>
              <tr className="text-sm text-muted"><th className="pb-2 font-semibold" /><th className="pb-2 font-semibold">{tr('群接龙', 'Group chat')}</th><th className="pb-2 font-semibold">{tr('外卖跑腿', 'Delivery app')}</th><th className="pb-2 font-bold text-accent">{tr('顺路侠', 'Shunluxia')}</th></tr>
            </thead>
            <tbody className="divide-y divide-line">
              {COMPARE.map(([k, v]) => (
                <tr key={k}>
                  <th scope="row" className="py-3 pr-2 text-sm font-semibold text-muted">{k}</th>
                  {v.map((x, i) => <td key={i} className={`py-3 pr-2 ${i === 2 ? 'font-bold text-accent' : 'text-ink/80'}`}>{x}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-4 text-sm text-muted">{tr('示意对比，按校园里常见的做法整理。', 'Illustrative, based on what students commonly do on campus.')}</p>
        </div>
      </Reveal>
      </div>
    </section>
  )
}


// 一单讲完以后：同一套规则，不止取快递（占座、楼下交接两张场景图）
function MoreScenes() {
  return (
    <section className="mx-auto max-w-7xl px-4 pb-10 pt-8 md:px-8 md:pb-14 md:pt-10">
      <Reveal><H2>{tr('不止取快递', 'More than parcels')}</H2></Reveal>
      <Reveal delay={0.05}><Lead>{tr('同一套托管、隐私和信用，换成早八占座、楼下交接，一样适用。', 'The same escrow, privacy, and credit work for saving a seat before 8 a.m. or a hand-off at the dorm door.')}</Lead></Reveal>
      {/* 两张一样大的黏土场景图，阿远就在画面里；标题旁边一块小地图，是同一张校园图上这一单走的那条路 */}
      <div className="mt-10 grid gap-10 md:grid-cols-2 md:gap-6 lg:gap-8">
        {SCENES.filter((x) => x.key !== 'express').map((x, k) => (
          <Reveal key={x.key} delay={0.05 * k} className="h-full">
            <figure className="flex h-full flex-col">
              <img src={img(x.img)} width={1600} height={1200} alt={x.alt} loading="lazy" className="aspect-[4/3] w-full rounded-[24px] object-cover ring-1 ring-line" />
              <figcaption className="flex flex-1 flex-col px-1 pt-5">
                <div className="flex items-start gap-4">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-accent">{x.route[0]} → {x.route[1]} · <span className={EN ? '' : 'whitespace-nowrap'}>{x.who}</span></p>
                    <p className="mt-2 text-xl font-bold md:text-2xl">{x.tab}</p>
                  </div>
                  <div className="w-20 shrink-0 overflow-hidden rounded-xl ring-1 ring-line md:w-32"><SceneMap k={x.key} mini /></div>
                </div>
                <p className="mt-3 text-[15px] leading-relaxed text-muted md:text-base">{x.pain}</p>
                <p className="mt-3 border-l-[3px] border-accent pl-3 text-[15px] leading-relaxed md:text-base">{x.fix}</p>
              </figcaption>
            </figure>
          </Reveal>
        ))}
      </div>
    </section>
  )
}

export default function Landing({ page }) {
  // 首页和产品思考页之间切换：都从顶上开始看
  useEffect(() => { window.scrollTo(0, 0) }, [page])
  // 预加载原型分包：首页停一会儿就把原型的代码取下来，点「体验原型」不再先看骨架屏
  useEffect(() => { const id = setTimeout(() => { import('../app/AppRoot') }, 400); return () => clearTimeout(id) }, [])
  return (
    <div className="min-h-[100dvh] bg-bg text-ink">
      <ScrollProgress />
      <Nav page={page} />
      {page === 'thinking' ? (
        <main>
          <ThinkingIntro />
          <Walkway next={tr('看哪三个数', "Three numbers to watch")} />
          <Metrics />
          <Walkway next={tr('接下来做什么', "What's next")} />
          <Roadmap />
          <Final page={page} />
        </main>
      ) : (
        <main>
          <OneTake Cta={Cta} Anchor={Anchor} />
          <Routes />
          <Walkway next={tr('不止取快递', "More than parcels")} />
          <MoreScenes />
          <Walkway next={tr('发不出去的单', "Orders we block")} />
          <Safety />
          <Walkway next={tr('你下课的路', "Your route after class")} />
          <Final />
        </main>
      )}
    </div>
  )
}
