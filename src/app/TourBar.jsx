import { useEffect, useRef, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence, useReducedMotion } from 'motion/react'
import { X, ArrowRight } from '@phosphor-icons/react'
import { useStore } from '../store'
import { gi } from '../ui'
const Confetti = gi('confetti')


// 每一大步要点几下（和指引圈出的目标一一对应，一共 21 下；减少动态效果时没有放款动画，第 7 步少一下「继续」）
const SUB = [3, 3, 2, 1, 3, 2, 3, 3]
// 每一步为什么要点它：导览条第二行，12 个字以内
const WHY = ['赏金先冻结，送到才放款', '认证过的同学才能接单', '接单后才看得到取件码', '取到了，发单人那边会看到', '当面核对送达码，防冒领', '确认收货后，钱才放出去', '好评差评都记进信用', '两边互评，信用是双向的']

// 根据演示任务的真实状态推出「下一步该谁做什么」
export function tourStep(state) {
  const { tour, accounts } = state
  if (!tour.active) return null
  const t = state.tasks.find((x) => x.id === tour.taskId)
  if (!t) return { n: 1, who: 'poster', text: '发布一个任务', to: '/app/publish?tour=1', cta: '去发布' }
  if (t.status === 'open') {
    if (!accounts.runner.verified) return { n: 2, who: 'runner', text: '切到跑腿人阿远：先做校园认证', to: `/app/verify?back=/app/task/${t.id}`, cta: '去认证' }
    return { n: 3, who: 'runner', text: '切到跑腿人：接下这一单', to: `/app/task/${t.id}`, cta: '去接单' }
  }
  if (t.status === 'ongoing' && !t.picked) return { n: 4, who: 'runner', text: '跑腿人：取到后点「我已取到」', to: `/app/task/${t.id}`, cta: '去取件' }
  if (t.status === 'ongoing') return { n: 5, who: 'runner', text: '跑腿人：送到后提交送达凭证', to: `/app/task/${t.id}`, cta: '去送达' }
  if (t.status === 'delivered') return { n: 6, who: 'poster', text: '切回发单人：确认放款', to: `/app/task/${t.id}`, cta: '去确认' }
  if (t.status === 'completed' && !t.ratingByPoster) return { n: 7, who: 'poster', text: '发单人：给跑腿人打分', to: `/app/task/${t.id}`, cta: '去评价' }
  if (t.status === 'completed' && !t.ratingByRunner) return { n: 8, who: 'runner', text: '切换身份去互评：也给对方打分', to: `/app/task/${t.id}`, cta: '去互评' }
  if (t.status === 'completed') return { n: 9, who: 'runner', text: '看信用和收入', to: '/app/me', cta: '去看看', final: true }
  return { n: 9, who: null, text: '这单走了申诉或取消分支，演示结束', to: '/app/orders', cta: '看订单', final: true }
}

// 导览要找的按钮在哪一块：电脑版右边开着一单时在详情栏，否则在主内容区
const root = () => document.querySelector('[data-tour-root]') || document.querySelector('main') || document.body

// 自动滚动一律瞬移：平滑滚动那一两秒里按钮还在动，伸手去点容易点到旁边的「申诉」
export default function TourBar({ wide = false }) {
  const { state, act } = useStore()
  const nav = useNavigate()
  const reduce = useReducedMotion()
  const loc = useLocation()
  const step = tourStep(state)
  // 身份对不对：不对的时候由「指哪点哪」圈顶上的身份切换，导览条不再自己替他切
  const roleOk = !step?.who || step.who === state.role
  // 订单页自己有「切到跑腿人 / 切回发单人去确认」这类按钮，导览条就不再放第二颗
  const samePage = step && loc.pathname === step.to.split('?')[0]
  const onTask = step && loc.pathname === `/app/task/${state.tour.taskId}`
  // 第 2 步在订单页上：页面自己有「切到跑腿人」和「认证后才能接单」，一路点下去就到认证页
  const here = step && !step.final && roleOk && (samePage || (onTask && step.n === 2))
  // 已经是这个身份了，就不再说「切到跑腿人」
  const text0 = step && step.who === state.role ? step.text.replace(/^((切(到|回))?(跑腿人|发单人)(阿远)?|切换身份去互评)[，：]?/, '') : step?.text
  const arrived = step?.final && loc.pathname === step.to
  // 已经到了「我的」，就不再叫人「去我的看看」
  // 窄屏时「指哪点哪」把「点这里：××」交给导览条显示（不在页面上浮气泡，免得压住说明）
  const [coach, setCoach] = useState('')
  useEffect(() => { const f = (e) => setCoach(e.detail || ''); window.addEventListener('coach-text', f); return () => window.removeEventListener('coach-text', f) }, [])
  const text = arrived ? '导览完成' : coach || text0
  // 细进度线：每一大步要点几下和指引圈出的目标一一对应；同一大步里每换一个「点这里」就往前走一格，不会点了三下还停在原地
  const seen = useRef({ n: 0, set: new Set() })
  if (step && seen.current.n !== step.n) seen.current = { n: step.n, set: new Set() }
  if (step && coach) seen.current.set.add(coach)
  const sub = step && !step.final ? SUB[step.n - 1] - (step.n === 7 && reduce ? 1 : 0) : 1
  const progress = !step ? 0 : step.final ? 1 : (step.n - 1 + Math.min(Math.max(seen.current.set.size - 1, 0), sub - 1) / sub) / 8
  // 每到一步：给该点的那个东西加一圈会呼吸的描边；它被顶栏或底部导航挡住时才滚动，只滚到刚好露出来
  useEffect(() => {
    if (!here) return
    let el = null
    let wait = 0
    // 量三次：图片（比如送达照片）加载完会把按钮往下推，0.6 秒、1.3 秒后各补一次
    // 按钮已经完整看得见就一点不滚；看不全才平滑地挪到刚好露出来为止（顶栏、导览条、底部导航让开的距离写在 .tour-focus 的 scroll-margin 里）
    const reveal = () => {
      if (!el || touched) return
      const head = (document.querySelector('[data-tour-bar]') || document.querySelector('header'))?.getBoundingClientRect().bottom ?? 64
      const navTop = document.querySelector('nav[aria-label="主导航"]')?.getBoundingClientRect().top ?? innerHeight
      const floor = navTop > innerHeight / 2 ? navTop : innerHeight
      const r = el.getBoundingClientRect()
      if (r.top >= head + 4 && r.bottom <= floor - 4) return
      // 自己算要滚多少：按钮其实在视口里、只是被底部导航压着时，scrollIntoView 的 nearest 会认为「看得见」一点不滚
      const m = getComputedStyle(el)
      const dy = r.top < head + 4 ? r.top - parseFloat(m.scrollMarginTop) : r.bottom + parseFloat(m.scrollMarginBottom) - innerHeight
      window.scrollBy({ top: dy, behavior: reduce ? 'auto' : 'smooth' })
    }
    // 刚发生的「奖励时刻」（取件码揭晓、托管放款）：先把那张卡停在视线里 1.6 秒，再去找下一个按钮
    const timers = []
    // 用户自己动了（点、滑、按键）就不再自动滚：免得他伸手去点按钮时页面被滚走、点空
    let touched = false
    const hands = () => { touched = true }
    const evs = ['pointerdown', 'wheel', 'touchstart', 'keydown']
    evs.forEach((e) => window.addEventListener(e, hands, { passive: true, capture: true }))
    const id = setTimeout(() => {
      // 只在刚发布（下一步认证）、刚接单（下一步取件）和刚放款（下一步打分）这三步停
      // 接单那一下先把取件码卡停在视线里（接单后才看得到，是这一单的高光）；取件后不停：地图就在按钮上面，停半秒只像卡住了
      const moment = [2, 4, 7].includes(step?.n) ? root().querySelector('[data-tour-moment]') : null
      if (moment) {
        const head = document.querySelector('header')?.getBoundingClientRect().bottom ?? 64
        const mr = moment.getBoundingClientRect()
        // 订单标题和这张卡能一起放下，就从标题开始露，免得标题正好藏在顶栏下面、看不出是哪一单
        const tr = root().querySelector('h1')?.getBoundingClientRect()
        const from = tr && tr.top < mr.top && mr.bottom - tr.top <= innerHeight - head - 96 ? tr.top : mr.top
        // 卡片看不全才挪，只挪到刚好露出来，平滑滚
        if (!touched && (mr.top < head + 16 || mr.bottom > innerHeight - 80)) window.scrollBy({ top: mr.top < head + 16 ? from - head - 16 : Math.min(mr.bottom - (innerHeight - 80), mr.top - head - 16), behavior: reduce ? 'auto' : 'smooth' })
        // 放款那条「¥5 从小满流到阿远」要播约 2.3 秒，取件码揭晓短一些
        wait = step.n === 7 ? 2600 : 1100
      }
      timers.push(setTimeout(() => {
        el = root().querySelector('[data-tour-target]') || [...root().querySelectorAll('button')].find((x) => x.classList.contains('bg-accent') && !x.disabled && x.offsetParent && !x.closest('[inert]'))
        if (!el) return
        el.classList.add('tour-focus')
        reveal()
        timers.push(setTimeout(reveal, 600), setTimeout(reveal, 1300))
      }, moment ? wait : 0))
    }, 350)
    return () => { clearTimeout(id); timers.forEach(clearTimeout); evs.forEach((e) => window.removeEventListener(e, hands, { capture: true })); el?.classList.remove('tour-focus') }
  }, [here, step?.n, loc.pathname, reduce, state.role])
  // 走完后导览条要收起：等用户自己滑动页面时再收，不在他伸手点东西的时候突然抽走一行、让页面往上跳
  useEffect(() => {
    if (!arrived) return
    const end = () => act('tour', { tour: { active: false, done: true } })
    const evs = ['wheel', 'touchmove', 'keydown']
    evs.forEach((e) => window.addEventListener(e, end, { passive: true, once: true }))
    return () => evs.forEach((e) => window.removeEventListener(e, end))
  }, [arrived, act])
  const go = () => {
    if (step.who) act('role', { role: step.who })
    if (step.final) act('tour', { tour: { active: false, done: true } })
    nav(step.to)
  }
  const showGo = !here && roleOk && !arrived && !loc.pathname.startsWith('/app/verify') && (step?.final || !['/app/publish', '/app/orders', '/app/me'].includes(step?.to.split('?')[0]))
  // 导览条是顶栏下面的一行细条，在页面流里，不浮在内容上，也就不会挡住任何按钮
  return (
    <AnimatePresence initial={false}>
      {step && (
        <motion.div key="bar" initial={reduce ? false : { opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}
          className="relative border-t border-line bg-ink text-bg">
          <motion.span aria-hidden="true" className="absolute bottom-0 left-0 h-[3px] w-full origin-left bg-accent" initial={false} animate={{ scaleX: progress }} transition={{ duration: reduce ? 0 : 0.35, ease: [0.16, 1, 0.3, 1] }} />
          <div data-tour-bar className={`mx-auto flex min-h-12 items-center gap-3 py-1.5 max-sm:min-h-14 ${wide ? 'max-w-[1440px] px-6' : 'max-w-xl px-4 xl:max-w-[66rem]'}`}>
            <span className="inline-flex shrink-0 items-center gap-1 text-xs font-bold opacity-70">{step.final ? <><Confetti size={18} weight="fill" className="text-accent" />走完了</> : <span className="tnum whitespace-nowrap rounded-full bg-bg/15 px-2 py-0.5"><span className="max-sm:hidden">第 {step.n} 步 / 共 8 步</span><span className="sm:hidden" aria-label={`第 ${step.n} 步，共 8 步`}>{step.n}/8</span></span>}</span>
            {/* 文字和订单状态同一帧换，不等旧文字淡出；第二行写这一步为什么要点（右边有「带我去」按钮时窄屏放不下，只留第一行） */}
            <motion.p key={text} initial={reduce ? false : { opacity: 0.4 }} animate={{ opacity: 1 }} transition={{ duration: 0.15 }}
              className={`min-w-0 flex-1 text-[14px] font-semibold leading-snug md:text-[15px] ${coach ? 'text-accent-soft' : ''}`}>
              {text}
              {!step.final && !arrived && <span className={`block text-[14px] font-normal text-bg/75 ${showGo ? 'max-sm:hidden' : ''}`}>{WHY[step.n - 1]}</span>}
            </motion.p>
            {showGo && <button data-tour-go onClick={go} className="inline-flex h-11 shrink-0 items-center gap-1 whitespace-nowrap rounded-full bg-accent px-3.5 text-[14px] font-semibold text-on-accent active:scale-[0.98]">
              {step.cta}<ArrowRight size={14} weight="bold" />
            </button>}
            <button onClick={() => act('tour', { tour: { active: false, dismissed: true } })} aria-label="退出指引" className="-mx-1.5 -my-1.5 grid size-11 shrink-0 place-items-center rounded-full opacity-70 hover:opacity-100"><X size={16} weight="bold" /></button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
