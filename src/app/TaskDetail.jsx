import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Camera as PhCamera, LockKeyOpen as PhLockKeyOpen, Numpad as PhNumpad } from '@phosphor-icons/react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { motion, AnimatePresence, useIsPresent, useReducedMotion, useMotionValue, useTransform, animate } from 'motion/react'
import { ArrowLeft, Check, ArrowClockwise } from '@phosphor-icons/react'
import { useStore } from '../store'
import CampusMap, { along } from '../landing/CampusMap'
import { PLACES, routePath } from '../campusMap'
import { B, dist, fmtDist, RUNNER_HOME, minCreditFor, levelOf, nextLevel, detourMin, detourMeters, myRoute, onMyWay } from '../data'
import { Btn, Panel, TypeTag, UrgentTag, VerifiedBadge, Sheet, Stars, Empty, Field, inputCls, left, clock, ago, spring, gi, StatusTag, pi } from '../ui'
import { EN, tr } from '../i18n'
const MapPin = gi('pin')
const Clock = gi('clock')
const LockKey = gi('lock')
const LockKeyOpen = pi(PhLockKeyOpen)
const EyeSlash = gi('eye-off', 'v3')
const Phone = gi('phone', 'v2')
const Package = gi('parcel', 'v2')
const House = gi('door', 'v2')
const ShieldCheck = gi('shield-check')
const Camera = pi(PhCamera)
const Numpad = pi(PhNumpad)
const Scales = gi('scales')
const Warning = gi('alert')
const FileX = gi('doc-x')

const STEPS = EN ? ['Post', 'Taken', 'Pickup', 'Deliver', 'Confirm', 'Rate'] : ['发布', '接单', '进行中', '送达', '确认', '互评']
// 已完成的步数，也就是「当前该做的那一步」的下标：发布完等接单 = 1，双方互评完 = 6（全部打勾）
function stepIndex(t) {
  if (t.status === 'open') return 1
  if (t.status === 'ongoing') return t.picked ? 3 : 2
  if (t.status === 'delivered' || t.status === 'disputed') return 4
  if (t.status === 'completed') return t.ratingByPoster && t.ratingByRunner ? 6 : 5
  return 0
}
const STATUS_TEXT = EN
  ? { open: 'Open', ongoing: 'In progress', delivered: 'To confirm', completed: 'Done', disputed: 'Disputed', refunded: 'Refunded', cancelled: 'Cancelled' }
  : { open: '待接单', ongoing: '进行中', delivered: '待确认', completed: '已完成', disputed: '申诉中', refunded: '已退款', cancelled: '已取消' }
// 楼名去掉括号里的门牌（东门、南门这类），中英两种括号各认各的
const shortName = (id) => B[id]?.name.replace(EN ? /\s*\(.*?\)/ : /（.*?）/, '')

function Stepper({ t }) {
  const reduce = useReducedMotion()
  const idx = stepIndex(t)
  const off = t.status === 'cancelled' || t.status === 'refunded'
  return (
    <ol className="grid grid-cols-6 gap-1" aria-label={tr('订单进度', 'Order progress')}>
      {STEPS.map((s, i) => {
        const done = !off && i < idx
        const now = !off && i === idx
        return (
          <li key={s} className="flex flex-col items-center gap-1.5" aria-current={now ? 'step' : undefined}>
            <motion.span initial={false} animate={{ scale: now && !reduce ? [1, 1.2, 1] : 1 }} transition={{ duration: 0.4 }}
              className={`grid size-7 place-items-center rounded-full text-xs font-bold ${done ? 'bg-accent text-on-accent' : now ? 'bg-accent-soft text-accent ring-2 ring-accent' : 'bg-sunken text-muted'}`}>
              {done ? <Check size={14} weight="bold" /> : i + 1}
            </motion.span>
            <span className={`text-xs font-semibold ${done || now ? 'text-ink' : 'text-muted'}`}>{s}</span>
          </li>
        )
      })}
    </ol>
  )
}

function privacyMode(t, role) {
  if (role === 'poster' && t.posterId === 'poster') return ['completed', 'refunded', 'cancelled'].includes(t.status) ? 'hidden' : 'owner'
  if (role === 'runner' && t.runnerId === 'runner') {
    if (['ongoing', 'delivered', 'disputed'].includes(t.status)) return 'open'
    return 'hidden'
  }
  return 'locked'
}

function PrivateInfo({ t, role }) {
  const mode = privacyMode(t, role)
  const rows = [
    t.private?.code && [Package, tr('取件码', 'Pickup code'), t.private.code, t.private.code.replace(/\d/g, '*')],
    [House, tr('宿舍号', 'Room'), t.private?.room, (t.private?.room || '').replace(/\s*\d+\s*$/, ' ***')],
    [Phone, tr('联系电话', 'Phone'), tr(`${t.private?.phone}（虚拟号）`, `${t.private?.phone} (masked)`), '170 **** ****'],
  ].filter(Boolean)
  const [HIcon, htext] = {
    owner: [LockKey, tr('你填写的隐私信息，接单后才对跑腿人可见', 'Your private info. The runner sees it only after taking the order')],
    open: [LockKeyOpen, tr('已接单，以下信息对你可见。订单结束后自动隐藏', "You took the order, so you can see this. It's hidden when the order ends")],
    hidden: [EyeSlash, tr('订单已结束，隐私信息已自动隐藏', 'Order ended. Private info is hidden')],
    locked: [LockKey, tr('接单后才能看到取件码、宿舍号和电话', 'Take the order to see the pickup code, room and phone')],
  }[mode]
  const show = mode === 'owner' || mode === 'open'
  return (
    <Panel className="p-4">
      <p className="flex items-center gap-2 text-[15px] font-semibold"><HIcon size={20} className="text-accent" />{htext}</p>
      <dl className="mt-3 space-y-2.5">
        {rows.map(([Icon, k, v, masked]) => (
          <div key={k} className="flex items-center gap-3">
            <Icon size={20} className="shrink-0 text-muted" />
            <dt className={`${EN ? 'w-24' : 'w-16'} shrink-0 text-[15px] text-muted`}>{k}</dt>
            <dd className={`tnum text-[15px] font-semibold ${show ? '' : 'select-none text-muted'}`}>{show ? v : mode === 'hidden' ? tr('已收回', 'Hidden') : masked}</dd>
          </div>
        ))}
      </dl>
    </Panel>
  )
}

// 取件码揭晓：每一位先快速跳数，再从左到右依次定下来
function CodeReveal({ code, play }) {
  // 揭晓时没定下来的位先显示圆点，一位一位落定：不滚随机数字，免得截图或眼角看到一个「错号」
  const [shown, setShown] = useState(play ? code.replace(/\d/g, '•') : code)
  useEffect(() => {
    if (!play) return
    const t0 = performance.now()
    const id = setInterval(() => {
      const el = performance.now() - t0
      let k = 0
      const next = code.split('').map((ch) => {
        if (!/\d/.test(ch)) return ch
        const settled = el > 380 + k++ * 110
        return settled ? ch : '•'
      }).join('')
      setShown(next)
      if (next === code) clearInterval(id)
    }, 45)
    return () => clearInterval(id)
  }, [code, play])
  return <span aria-label={code}>{shown}</span>
}

// 接单后最要紧的信息：取件码放大、置顶，带复制按钮；刚接单的那一下锁打开、码一位位揭晓
// 正在收起的那块：不能点、导览也不去圈它（里面是收起前的旧按钮）
function Leaving({ children }) {
  const present = useIsPresent()
  return <div inert={!present || undefined}>{children}</div>
}

// 放款后地图、送达码这些块要收掉：平滑收起来，不让下面的内容一下子跳上去
function Collapse({ show, children }) {
  const reduce = useReducedMotion()
  return (
    <AnimatePresence initial={false}>
      {show && (
        <motion.div key="c" className="-m-0.5 overflow-hidden p-0.5" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: reduce ? 0 : 0.45, ease: [0.22, 1, 0.36, 1] }}>
          <Leaving>{children}</Leaving>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function PickupCard({ t }) {
  const reduce = useReducedMotion()
  const [fresh] = useState(() => !reduce && t.status === 'ongoing' && t.acceptedAt && Date.now() - t.acceptedAt < 4000)
  const sealed = t.status !== 'ongoing'
  const [open, setOpen] = useState(!fresh)
  useEffect(() => { if (!fresh) return; const id = setTimeout(() => setOpen(true), 350); return () => clearTimeout(id) }, [fresh])
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    try { await navigator.clipboard.writeText(t.private.code) } catch {}
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }
  return (
    <motion.section aria-label={tr('取件信息', 'Pickup info')} data-tour-moment={fresh ? '' : undefined} className="relative overflow-hidden rounded-2xl bg-ink p-4 text-bg"
      initial={fresh ? { opacity: 0.4, scale: 0.98 } : false} animate={{ opacity: 1, scale: 1 }} transition={{ type: 'spring', stiffness: 260, damping: 30 }}>
      {t.private?.code ? (
        <>
          <div className="flex items-start justify-between gap-2">
          <p className="flex items-center gap-1.5 text-sm font-semibold opacity-75">
            <motion.span key={open ? 'o' : 'c'} initial={fresh ? { rotate: -20, scale: 0.6 } : false} animate={{ rotate: 0, scale: 1 }} transition={{ type: 'spring', stiffness: 500, damping: 14 }} className="inline-flex">
              {open && !sealed && !t.picked ? <LockKeyOpen size={16} weight="bold" /> : <LockKey size={16} weight="bold" />}
            </motion.span>{sealed ? tr('已送达，取件码已收起', 'Delivered. Pickup code put away') : t.picked ? tr('已取到，取件码用完了', 'Picked up. Code used') : tr(`到${shortName(t.from)}报这个码`, `Show this code at ${shortName(t.from)}`)}
          </p>
          {fresh && !t.picked && !sealed && (
            <motion.span className="shrink-0 whitespace-nowrap rounded-full bg-accent px-2.5 py-0.5 text-xs font-bold text-on-accent"
              initial={{ scale: 0, rotate: -12 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 500, damping: 16, delay: 0.25 }}>{tr('刚刚接单', 'Just taken')}</motion.span>
          )}
          </div>
          <div className="mt-1 flex items-center justify-between gap-3">
            <p className="tnum text-4xl font-bold tracking-wide">{sealed || t.picked ? <span className="opacity-40">{t.private.code.replace(/\d/g, '•')}</span> : <CodeReveal code={t.private.code} play={fresh} />}</p>
            {!sealed && !t.picked && <button onClick={copy} className="h-10 shrink-0 whitespace-nowrap rounded-full bg-bg/15 px-4 text-sm font-semibold transition active:scale-95">{copied ? tr('已复制', 'Copied') : tr('复制', 'Copy')}</button>}
          </div>
        </>
      ) : (
        <p className="flex items-center gap-1.5 text-[15px] font-semibold"><LockKeyOpen size={18} weight="bold" />{EN ? `No pickup code needed. Head to ${B[t.from]?.name}` : <>不需要取件码，直接去{B[t.from]?.name}</>}</p>
      )}
      <dl className="mt-3 grid gap-1.5 border-t border-bg/15 pt-3 text-[15px]">
        <div className="flex gap-3"><dt className={`${EN ? 'w-12' : 'w-10'} shrink-0 opacity-70`}>{tr('送到', 'To')}</dt><dd className="font-semibold">{t.private?.room}</dd></div>
        <div className="flex gap-3"><dt className={`${EN ? 'w-12' : 'w-10'} shrink-0 opacity-70`}>{tr('电话', 'Phone')}</dt><dd className="tnum font-semibold">{EN ? `${t.private?.phone} (masked)` : <>{t.private?.phone}（虚拟号）</>}</dd></div>
      </dl>
      <p className="mt-2 text-xs opacity-60">{sealed ? tr('已送达，宿舍号和电话会在订单结束后自动隐藏', 'Delivered. Room and phone are hidden when the order ends') : tr('只在接单期间可见，订单结束后自动隐藏', 'Only visible while the order is active, hidden when it ends')}</p>
    </motion.section>
  )
}

function PayoutRail({ t, play }) {
  const { state } = useStore()
  const reduce = useReducedMotion()
  const anim = play && !reduce
  const runnerName = t.runnerId === 'runner' ? state.accounts.runner.name : tr('跑腿人', 'the runner')
  const posterName = t.posterId === 'poster' ? state.accounts.poster.name : t.posterName
  const ease = [0.16, 1, 0.3, 1]
  return (
    <div className="mt-4 border-t border-accent/15 pt-4" aria-label={tr(`¥${t.reward} 已从托管放给${runnerName}`, `¥${t.reward} released from escrow to ${runnerName}`)}>
      <div className="grid grid-cols-[auto_1fr_auto] items-center gap-3">
        <div className="text-center">
          <p className="text-sm text-muted">{EN ? `Paid by ${posterName}` : <>{posterName}付的</>}</p>
          <motion.p className="tnum text-lg font-bold" initial={anim ? { opacity: 1 } : false} animate={{ opacity: 0.35 }} transition={{ duration: 0.5, delay: anim ? 0.2 : 0 }}>¥{t.reward}</motion.p>
        </div>
        <div className="relative h-1.5 rounded-full bg-surface">
          <motion.div className="absolute inset-y-0 left-0 rounded-full bg-accent" initial={anim ? { width: '0%' } : false} animate={{ width: '100%' }} transition={{ duration: 0.9, ease, delay: 0.2 }} />
          {anim && (
            <motion.span className="absolute -top-[11px] grid size-7 place-items-center rounded-full bg-accent text-xs font-bold text-on-accent shadow-[0_4px_12px_rgba(11,122,85,0.35)]"
              initial={{ left: '0%', x: '-50%', scale: 0.6, opacity: 0 }} animate={{ left: '100%', scale: [0.6, 1.15, 1, 0.6], opacity: [0, 1, 1, 0] }} transition={{ duration: 1, ease, delay: 0.2 }}>¥</motion.span>
          )}
        </div>
        <div className="text-center">
          <p className="text-sm text-muted">{runnerName}</p>
          <motion.p className="tnum text-lg font-bold text-accent" initial={anim ? { scale: 0.8, opacity: 0 } : false} animate={{ scale: 1, opacity: 1 }} transition={{ ...spring, delay: anim ? 1.05 : 0 }}>+¥{t.reward}</motion.p>
        </div>
      </div>
      <motion.p className="mt-3 flex items-center justify-center gap-2 text-sm" initial={anim ? { opacity: 0, y: 6 } : false} animate={{ opacity: 1, y: 0 }} transition={{ ...spring, delay: anim ? 1.25 : 0 }}>
        <span className="text-muted">{tr('跑腿人信用', 'Runner credit')}</span>
        <span className={`rounded-full px-2.5 py-0.5 font-bold ${t.late ? 'bg-danger-soft text-danger' : 'bg-surface text-accent'}`}>{t.late ? tr('-3 超时', '-3 late') : tr('+2 按时完成', '+2 on time')}</span>
        {/* 发单人打完分，跑腿人信用的那一笔也列出来，和下面收尾卡的合计对得上 */}
        {t.ratingByPoster && (() => { const st = t.ratingByPoster.stars; const d = st >= 4 ? 1 : st <= 2 ? -4 : 0; return d ? <span className={`tnum rounded-full px-2.5 py-0.5 font-bold ${d > 0 ? 'bg-surface text-accent' : 'bg-danger-soft text-danger'}`}>{d > 0 ? tr('+1 好评', '+1 good rating') : tr('-4 差评', '-4 bad rating')}</span> : null })()}
      </motion.p>
    </div>
  )
}

// 放款那一下：深绿从托管卡铺满整屏，¥5 飞进阿远手里，再弹出到账和信用；停在这里，看清楚了点「继续」（或点屏幕任意处）再收起
function PayoutBurst({ t }) {
  const { state } = useStore()
  const [on, setOn] = useState(true)
  const btn = useRef(null)
  useEffect(() => { const id = setTimeout(() => btn.current?.focus({ preventScroll: true }), 1200); const k = (e) => { if (e.key === 'Escape') setOn(false) }; window.addEventListener('keydown', k); return () => { clearTimeout(id); window.removeEventListener('keydown', k) } }, [])
  const runnerName = t.runnerId === 'runner' ? state.accounts.runner.name : tr('跑腿人', 'the runner')
  const ease = [0.16, 1, 0.3, 1]
  return createPortal(
    <AnimatePresence>
      {on && (
        <motion.div key="burst" role="dialog" aria-modal="true" aria-label={tr(`¥${t.reward} 已到账`, `¥${t.reward} received`)} onClick={() => setOn(false)} className="fixed inset-0 z-[60] grid cursor-pointer place-items-center overflow-hidden"
          initial={{ clipPath: 'circle(0% at 50% 62%)' }} animate={{ clipPath: 'circle(150% at 50% 62%)' }} exit={{ opacity: 0 }}
          transition={{ clipPath: { duration: 0.5, ease: [0.65, 0, 0.35, 1] }, opacity: { duration: 0.28 } }} style={{ background: 'var(--accent-deep)' }}>
          <div className="relative flex flex-col items-center text-on-accent">
            {/* 脚下一条路：从小满那头（左）到阿远脚下，¥5 沿路飞过去，亮绿实线同时铺过去，和首页放款那一章同一个画法 */}
            <div aria-hidden="true" className="absolute left-1/2 top-[168px] w-[min(560px,80vw)] -translate-x-1/2 md:top-[216px]">
              <span className="absolute inset-x-0 top-0 border-t-[5px] border-dotted border-on-accent/30" />
              <motion.span className="absolute left-0 right-1/2 top-0 h-[5px] origin-left rounded-full bg-accent-glow" initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: 0.75, delay: 0.45, ease: 'easeInOut' }} />
              <span className="absolute left-0 top-0 size-4 -translate-x-1/2 -translate-y-[5px] rounded-full bg-on-accent ring-4 ring-accent-deep" />
              <span className="absolute left-0 top-4 -translate-x-1/2 whitespace-nowrap text-[14px] font-semibold opacity-80">{t.posterId === 'poster' ? state.accounts.poster.name : t.posterName}</span>
              <motion.span className="tnum absolute top-0 z-10 grid size-14 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-accent text-[18px] font-bold text-on-accent ring-4 ring-on-accent/80"
                initial={{ left: '0%', y: -30, scale: 0.6, opacity: 0 }} animate={{ left: ['0%', '28%', '50%'], y: [-30, -110, -70], scale: [0.6, 1.2, 0.7], opacity: [0, 1, 0] }}
                transition={{ duration: 0.75, delay: 0.45, ease: 'easeInOut', times: [0, 0.55, 1] }}>¥{t.reward}</motion.span>
            </div>
            <motion.img src={`${import.meta.env.BASE_URL}brand/runner-v1.webp`} width={169} height={240} alt="" className="relative h-44 w-auto max-w-none drop-shadow-[0_18px_16px_rgba(0,0,0,0.35)] md:h-56"
              initial={{ y: 30, opacity: 0, scale: 0.9 }} animate={{ y: 0, opacity: 1, scale: 1 }} transition={{ type: 'spring', stiffness: 300, damping: 18, delay: 0.25 }} />
            <motion.p className="tnum mt-4 font-display text-[64px] leading-none md:text-[88px]" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 1.05, ease }}>+¥{t.reward}</motion.p>
            <motion.p className="mt-2 text-[17px] font-semibold opacity-90" initial={{ opacity: 0 }} animate={{ opacity: 0.9 }} transition={{ duration: 0.3, delay: 1.15 }}>{EN ? `to ${runnerName}'s wallet` : <>到{runnerName}账上</>}</motion.p>
            <motion.span className={`mt-4 rounded-full px-3.5 py-1 text-[15px] font-bold ${t.late ? 'bg-danger-soft text-danger' : 'bg-accent-glow text-accent-ink'}`}
              initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: 'spring', stiffness: 420, damping: 18, delay: 1.25 }}>{EN ? `${runnerName}'s credit ${t.late ? '-3 late' : '+2 on time'}` : <>{runnerName}信用 {t.late ? '-3 超时' : '+2 按时完成'}</>}</motion.span>
            <motion.button ref={btn} type="button" onClick={() => setOn(false)} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.9 }}
              data-coach-next="" className="mt-8 inline-flex h-14 items-center rounded-full bg-bg px-10 text-[17px] font-bold text-accent-deep shadow-[0_18px_40px_-18px_rgba(0,0,0,0.5)] active:scale-[0.97]">{tr('继续', 'Continue')}</motion.button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  )
}

function Escrow({ t }) {
  // 确认放款时这块会换位置重新挂载：用「刚完成 4 秒内」判断要不要播放款动画
  const [play] = useState(() => t.status === 'completed' && !!t.completedAt && Date.now() - t.completedAt < 4000)
  const reduce = useReducedMotion()
  const map = (EN ? {
    open: ['Held', 'The reward is held until delivery is confirmed'],
    ongoing: ['Held', "The money stays on the platform until the runner's done"],
    delivered: ['Held', 'Released once the requester confirms'],
    disputed: ['Frozen', 'Dispute in review. Payment on hold'],
    completed: ['Released', 'The reward went to the runner'],
    refunded: ['Refunded', 'Dispute upheld. Reward returned to the requester'],
    cancelled: ['Refunded', 'Order cancelled, reward returned. If it was already taken, 30% goes to the runner first'],
  } : {
    open: ['托管中', '赏金已冻结，送达确认后才放款'],
    ongoing: ['托管中', '跑腿人完成前，钱不会离开平台'],
    delivered: ['托管中', '等发单人确认收货后放款'],
    disputed: ['冻结中', '申诉处理中，暂不放款'],
    completed: ['已放款', '赏金已转给跑腿人'],
    refunded: ['已退回', '申诉成立，赏金退回发单人'],
    cancelled: ['已退回', '任务取消，赏金退回发单人；接单后取消会先扣 30% 补偿跑腿人'],
  })[t.status]
  const held = ['open', 'ongoing', 'delivered'].includes(t.status)
  return (
    <div id="escrow" data-tour-moment={play ? '' : undefined} className="scroll-mt-24 rounded-2xl bg-accent-soft p-4">
      <div className="flex items-center gap-3">
        <img src={`${import.meta.env.BASE_URL}icons/trust-escrow-v1.webp`} width={40} height={40} alt={tr('护着硬币的盾牌', 'A shield guarding a coin')} className="size-10 shrink-0 object-contain" />
        <div className="flex-1">
          <p className="text-[15px] font-semibold">{held ? tr('赏金托管中', 'Reward in escrow') : tr(`赏金托管 · ${map[0]}`, `Escrow · ${map[0]}`)}</p>
          <p className="text-sm text-muted">{map[1]}</p>
        </div>
        <span className="tnum text-3xl font-bold">¥{t.reward}</span>
      </div>
      {t.status === 'completed' && <PayoutRail t={t} play={play} />}
      {play && !reduce && <PayoutBurst t={t} />}
    </div>
  )
}

// 送达照片（模拟）：右下角压一行拍摄时间和位置水印
function ProofPhoto({ t, at, className = '' }) {
  return (
    <div className={`relative mx-auto overflow-hidden rounded-2xl bg-sunken ${className}`}>
      <img src={`${import.meta.env.BASE_URL}images/proof-v1.webp`} width={800} height={450} alt={tr('送达照片（模拟）：宿舍门口放着的包裹', 'Delivery photo (simulated): a parcel left at a dorm door')} className="size-full object-cover" />
      <span className="tnum absolute bottom-2 right-2 rounded-md bg-ink/70 px-2 py-0.5 text-xs font-semibold text-bg">{clock(at)} · {shortName(t.to)}</span>
    </div>
  )
}

function DeliverSheet({ t, open, onClose }) {
  const { act, state } = useStore()
  const reduce = useReducedMotion()
  const posterName = t.posterId === 'poster' ? state.accounts.poster.name : t.posterName
  const [mode, setMode] = useState('code')
  // 跟着走一遍的时候，送达码替你填好
  // 导览里先填好前两位，后两位让人自己对着发单人的码补上：「当面核验」这一下是自己做的
  const [code, setCode] = useState(() => (state.tour.active && state.tour.taskId === t.id ? t.deliverCode.slice(0, 2) : ''))
  const [err, setErr] = useState(null)
  const [photo, setPhoto] = useState(false)
  const [shooting, setShooting] = useState(false)
  const [late, setLate] = useState(false)
  const submit = () => {
    if (mode === 'code') {
      if (code !== t.deliverCode) return setErr(code.length < 4 ? tr('请输入 4 位送达码', 'Enter the 4-digit delivery code') : tr('送达码不对，请当面向发单人确认', 'Wrong code. Check with the requester in person'))
      act('deliver', { id: t.id, proof: { kind: 'code' }, late })
    } else {
      if (!photo) return setErr(tr('请先拍一张放置位置的照片', 'Take a photo of where you left it first'))
      act('deliver', { id: t.id, proof: { kind: 'photo', seed: 'courier-desk-0', at: Date.now() }, late })
    }
    onClose()
  }
  const shoot = () => { setShooting(true); setErr(null); setTimeout(() => { setShooting(false); setPhoto(true) }, 700) }
  return (
    <Sheet open={open} onClose={onClose} title={tr('提交送达凭证', 'Submit proof of delivery')}>
      <div className="grid grid-cols-2 rounded-full bg-sunken p-1">
        {[['code', tr('当面核验送达码', 'Code in person'), Numpad], ['photo', tr('拍照放门口', 'Photo at door'), Camera]].map(([k, l, I]) => (
          <button key={k} onClick={() => { setMode(k); setErr(null) }} className={`inline-flex h-10 items-center justify-center gap-1.5 whitespace-nowrap rounded-full text-[15px] font-semibold ${mode === k ? 'bg-surface text-ink shadow-sm' : 'text-muted'}`}><I size={18} />{l}</button>
        ))}
      </div>
      {/* 两个页签内容一样高：切换时页签和按钮都不动，不会点错 */}
      <div className="min-h-[13.5rem]">
      {mode === 'code' ? (
        <div className="mt-5">
          {/* 当面核验：送达码在发单人自己的手机上，见面时给跑腿人看一眼；原型里一个人演两边，就把那块屏幕放在这里 */}
          <div data-deliver-code={t.deliverCode} className="mb-4 flex items-center gap-3 rounded-2xl bg-ink px-3.5 py-2.5 text-bg">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-bg/10"><Phone size={24} /></span>
            <span className="min-w-0 flex-1">
              <span className="block text-[13px] opacity-75">{EN ? `${posterName}'s phone, shown to you in person` : <>{posterName}的手机，见面时给你看</>}</span>
              <span className="tnum block text-[22px] font-bold leading-tight tracking-[0.28em]">{t.deliverCode}</span>
            </span>
          </div>
          <Field label={tr('输入这 4 位送达码', 'Enter the 4-digit delivery code')} error={err || (code.length === 4 && code !== t.deliverCode ? tr(`送达码不对，再对一下${posterName}手机上的码`, `Wrong code. Check ${posterName}'s phone again`) : null)} hint={code.length === 2 && t.deliverCode.startsWith(code) ? tr('前两位已经替你填好，补上后两位', 'First two digits are filled in. Add the last two.') : null}>
            {/* 四格送达码：真输入框透明盖在四个格子上，打一位亮一格，填满四位格子变绿；下面留出指引绿圈光晕的位置，提示字不被压住 */}
            <div className="relative mb-3">
              {/* 输错了四格一起晃一下；每换一个错码重晃一次 */}
              <motion.div key={code.length === 4 && code !== t.deliverCode ? code : 'ok'} className="grid grid-cols-4 gap-2" aria-hidden="true"
                animate={code.length === 4 && code !== t.deliverCode && !reduce ? { x: [0, -8, 8, -5, 5, 0] } : { x: 0 }} transition={{ duration: 0.38, ease: 'easeOut' }}>
                {[0, 1, 2, 3].map((k) => (
                  <span key={k} className={`tnum grid h-14 place-items-center rounded-xl text-2xl font-bold ring-1 transition-colors ${err || (code.length === 4 && code !== t.deliverCode) ? 'bg-danger-soft ring-2 ring-danger' : code.length === 4 ? 'bg-accent-soft ring-2 ring-accent text-accent' : k === code.length ? 'bg-surface ring-2 ring-ink' : 'bg-surface ring-line'}`}>
                    {code[k] ? <motion.span key={code[k] + k} initial={{ y: 6, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.15 }}>{code[k]}</motion.span> : ''}
                  </span>
                ))}
              </motion.div>
              <input autoFocus inputMode="numeric" maxLength={4} value={code} onChange={(e) => { setCode(e.target.value.replace(/\D/g, '').slice(0, 4)); setErr(null) }} className="absolute inset-0 size-full cursor-text opacity-0" aria-label={tr('4 位送达码', '4-digit delivery code')} aria-invalid={!!err} />
            </div>
          </Field>
        </div>
      ) : (
        <div className="mt-5">
          {photo ? (
            <ProofPhoto t={t} at={Date.now()} className="h-36" />
          ) : (
            <button onClick={shoot} className="grid h-36 w-full place-items-center rounded-2xl bg-sunken text-muted ring-1 ring-line">
              {shooting ? <span className="animate-pulse text-[15px] font-semibold">{tr('正在拍照……', 'Taking photo…')}</span> : <span className="flex flex-col items-center gap-2 text-[15px] font-semibold"><Camera size={36} />{tr('点击拍照（模拟）', 'Tap to take a photo (simulated)')}</span>}
            </button>
          )}
          {err && <p role="alert" className="mt-2 text-sm font-medium text-danger">{err}</p>}
          <p className="mt-2 text-sm text-muted">{tr('照片带拍摄时间和位置水印，作为纠纷时的凭证。', "The photo is stamped with the time and place, as proof if there's a dispute.")}</p>
        </div>
      )}
      </div>
      <label className="mt-5 flex min-h-12 cursor-pointer items-center gap-3 rounded-xl bg-sunken p-3 text-[15px]">
        <input type="checkbox" aria-label={tr('试试超时送达会怎样', 'See what a late delivery does')} checked={late} onChange={(e) => setLate(e.target.checked)} className="size-5 accent-[var(--accent)]" />
        <span>{tr('试试超时送达会怎样（信用 -3）', 'See what a late delivery does (credit -3)')}</span>
      </label>
      <Btn size="lg" className="mt-5 w-full" onClick={submit}>{tr('提交凭证', 'Submit proof')}</Btn>
    </Sheet>
  )
}

function RateBlock({ t, by }) {
  const { act, state } = useStore()
  const [stars, setStars] = useState(0)
  const submitRef = useRef(null)
  // 选完星，标签会展开把「提交评价」往下推：等它展开后，滚到刚好露在底部导航上面
  const revealSubmit = () => setTimeout(() => {
    const b = submitRef.current; if (!b) return
    const navTop = document.querySelector(`nav[aria-label="${tr('主导航', 'Main navigation')}"]`)?.getBoundingClientRect().top ?? innerHeight
    const limit = (navTop > innerHeight / 2 ? navTop : innerHeight) - 24
    const r = b.getBoundingClientRect()
    if (r.bottom > limit) window.scrollBy({ top: r.bottom - limit, behavior: 'smooth' })
  }, 80)
  const tagsGood = EN ? (by === 'poster' ? ['On time', 'Easy to talk to', 'Arrived intact'] : ['Accurate details', 'Quick to confirm', 'Friendly'])
    : by === 'poster' ? ['准时', '沟通顺畅', '物品完好'] : ['描述准确', '确认及时', '好说话']
  const tagsBad = EN ? (by === 'poster' ? ['Late', 'Item damaged', 'Rude'] : ['Not as described', 'Slow to confirm', 'Rude'])
    : by === 'poster' ? ['超时', '物品有损', '态度差'] : ['描述不符', '拖延确认', '态度差']
  const [tags, setTags] = useState([])
  const opts = stars >= 4 ? tagsGood : stars <= 2 ? tagsBad : [...tagsGood.slice(0, 2), tagsBad[0]]
  const effect = !stars ? '-' : stars >= 4 ? '+1' : stars <= 2 ? '-4' : tr('不变', 'no change')
  return (
    <Panel className="p-4" data-tour-target>
      <p className="text-[17px] font-semibold">{by === 'poster' ? tr('给跑腿人打分', 'Rate the runner') : tr('给发单人打分', 'Rate the requester')}</p>
      <p className="mt-0.5 text-sm text-muted">{stars ? (EN ? <>Their credit <b className="tnum">{effect}</b> · </> : <>对方信用 <b className="tnum">{effect}</b> · </>) : null}{tr('4 到 5 星 +1，1 到 2 星 -4', '4 to 5 stars +1, 1 to 2 stars -4')}</p>
      <div className="mt-3"><Stars value={stars} onChange={(n) => { setStars(n); setTags([]); revealSubmit() }} /></div>
      <div className="mt-3 flex min-h-10 flex-wrap gap-2">
        {/* 没选星时先放灰色标签占位，告诉你下一步会出现什么，不留一块空白 */}
        {stars === 0 && tagsGood.map((x) => <span key={x} className="grid h-10 place-items-center rounded-full bg-sunken px-4 text-[15px] font-semibold text-muted/60">{x}</span>)}
        {stars > 0 && opts.map((x) => (
          <button key={x} onClick={() => setTags((v) => (v.includes(x) ? v.filter((y) => y !== x) : [...v, x]))} aria-pressed={tags.includes(x)}
            className={`h-10 rounded-full px-4 text-[15px] font-semibold ${tags.includes(x) ? 'bg-accent text-on-accent' : 'bg-sunken text-ink'}`}>{x}</button>
        ))}
      </div>
      <Btn ref={submitRef} className="mt-4 w-full" disabled={!stars} onClick={() => { act('rate', { id: t.id, by, stars, tags }); if ((by === 'poster' ? t.ratingByRunner : t.ratingByPoster) && !state.tour.active) setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 60) }}>{stars ? tr('提交评价', 'Submit rating') : tr('先点星星打分', 'Tap a star first')}</Btn>
    </Panel>
  )
}

// 放款那一下要被看见：确认后把托管卡滚到屏幕中间，再播转账
// 导览进行中由导览条负责滚动，这里不再滚第二次
const REASONS = EN ? ["Didn't get it", 'Item damaged', 'Not as described'] : ['没收到东西', '物品损坏', '与描述不符']
const toEscrow = () => { if (document.querySelector('[data-tour-bar]')) return; setTimeout(() => document.getElementById('escrow')?.scrollIntoView({ block: 'center', behavior: 'smooth' }), 80) }

function Actions({ t }) {
  const { state, act } = useStore()
  const nav = useNavigate()
  const [deliver, setDeliver] = useState(false)
  const [abandon, setAbandon] = useState(false)
  const [disputeOpen, setDisputeOpen] = useState(false)
  const [reason, setReason] = useState(REASONS[0])
  const [pCancel, setPCancel] = useState(false)
  const [mismatch, setMismatch] = useState(false)
  const pickedAt = useRef(0)
  const role = state.role
  const runner = state.accounts.runner
  const own = t.posterId === 'poster'
  const mine = t.runnerId === 'runner'

  if (t.status === 'open') {
    if (role === 'poster') {
      return own ? (
        <div className="grid gap-2">
          <p className="text-center text-[15px] text-muted">{tr('等待同学接单。也可以切到跑腿人，自己接下这单。', 'Waiting for someone to take it. You can also switch to Runner and take it yourself.')}</p>
          <div className="grid grid-cols-2 gap-3">
            <Btn variant="ghost" onClick={() => act('cancel', { id: t.id })}>{tr('取消并退款', 'Cancel and refund')}</Btn>
            <Btn onClick={() => act('role', { role: 'runner' })}>{tr('切到跑腿人', 'Switch to Runner')}</Btn>
          </div>
        </div>
      ) : <Btn className="w-full" onClick={() => act('role', { role: 'runner' })}>{tr('切到跑腿人来接这单', 'Switch to Runner to take it')}</Btn>
    }
    if (!runner.verified) return <Btn size="lg" className="w-full" onClick={() => nav(`/app/verify?back=/app/task/${t.id}`)}><ShieldCheck size={20} weight="bold" />{tr('认证后才能接单', 'Get verified to take orders')}</Btn>
    const need = minCreditFor(t.reward)
    if (runner.credit < need) {
      return (
        <div className="text-center">
          <Btn size="lg" className="w-full" disabled><LockKey size={20} weight="bold" />{EN ? `Needs credit ≥ ${need}` : <>需信用 ≥ {need}</>}</Btn>
          <p className="mt-2 text-sm text-muted">{EN ? <>You have {runner.credit} ({levelOf(runner.credit).name}). Take smaller orders first to build credit. <Link to="/app/credit" className="font-semibold text-accent">See rules</Link></> : <>你现在 {runner.credit} 分（{levelOf(runner.credit).name}），先接小额单攒信用。<Link to="/app/credit" className="font-semibold text-accent">看规则</Link></>}</p>
        </div>
      )
    }
    if (t.deadline < Date.now()) return <Btn size="lg" className="w-full" disabled>{tr('已过截止时间，不能接了', "Past the deadline, can't take it")}</Btn>
    return <Btn size="lg" className="w-full" onClick={() => act('accept', { id: t.id })}>{tr('接单', 'Take order')}</Btn>
  }

  if (t.status === 'ongoing') {
    if (role === 'runner' && mine) {
      return (
        <div className="grid gap-2">
          {!t.picked ? <Btn size="lg" className="w-full" onClick={() => { pickedAt.current = Date.now(); act('pick', { id: t.id }) }}>{tr('我已取到，出发送达', 'Picked up, on my way')}</Btn>
            : <Btn size="lg" className="w-full" onClick={() => { if (Date.now() - pickedAt.current > 700) setDeliver(true) }}>{tr('提交送达凭证', 'Submit proof of delivery')}</Btn>}
          <div className="flex flex-wrap justify-center gap-x-4">
            {!t.picked && <Btn variant="plain" size="sm" className="text-danger!" onClick={() => setAbandon(true)}>{tr('放弃这单（信用 -5）', 'Drop this order (credit -5)')}</Btn>}
            <Btn variant="plain" size="sm" onClick={() => setMismatch(true)}>{tr('与描述不符，申诉', 'Not as described? Dispute')}</Btn>
          </div>
          <Sheet open={mismatch} onClose={() => setMismatch(false)} title={tr('任务与描述不符', 'Not as described')}>
            <p className="text-[15px] leading-relaxed text-muted">{tr('比如说好是小件，到了才发现是大件重物。申诉成立时不扣你的信用，发单人信用 -5，赏金的 30% 作为跑空补偿给你。', "Say it was listed as small, but it turns out big and heavy. If the dispute is upheld, your credit stays the same, the requester loses 5, and you get 30% of the reward for the wasted trip.")}</p>
            <p className="mt-3 rounded-xl bg-sunken p-3 text-sm text-muted">{tr('演示里平台会直接判定申诉成立。', 'In the demo, the dispute is upheld right away.')}</p>
            <Btn size="lg" className="mt-5 w-full" onClick={() => { act('mismatch', { id: t.id }); setMismatch(false) }}>{tr('提交申诉', 'Submit dispute')}</Btn>
          </Sheet>
          <DeliverSheet t={t} open={deliver} onClose={() => setDeliver(false)} />
          <Sheet open={abandon} onClose={() => setAbandon(false)} title={tr('确定放弃？', 'Drop this order?')}>
            <p className="text-[15px] leading-relaxed text-muted">{tr('接单后放弃算爽约，信用 -5，任务会重新开放给其他同学。', 'Dropping an order you took counts as a no-show: credit -5, and the order opens up to other students again.')}</p>
            <div className="mt-5 grid grid-cols-2 gap-2">
              <Btn variant="ghost" onClick={() => setAbandon(false)}>{tr('再想想', 'Go back')}</Btn>
              <Btn variant="danger" onClick={() => { act('abandon', { id: t.id }); setAbandon(false) }}>{tr('确定放弃', 'Drop it')}</Btn>
            </div>
          </Sheet>
        </div>
      )
    }
    return (
      <div className="grid gap-1 text-center">
        <p className="text-[15px] text-muted">{EN ? <>{t.picked ? 'The runner picked it up and is on the way' : 'The runner took the order and is heading to pick it up'}.{own && ' Give them the delivery code when they arrive.'}</> : <>{t.picked ? '跑腿人已取到，正在送达' : '跑腿人已接单，正在去取件'}。{own && '送达时把送达码告诉对方。'}</>}</p>
        {own && role === 'poster' && (
          <>
            <Btn variant="plain" size="sm" onClick={() => setPCancel(true)}>{tr('取消订单（信用 -5）', 'Cancel order (credit -5)')}</Btn>
            <Sheet open={pCancel} onClose={() => setPCancel(false)} title={tr('确定取消？', 'Cancel this order?')}>
              <p className="text-[15px] leading-relaxed text-muted">{EN ? `They already took it and are on the way. Cancelling now counts against you: credit -5, 30% of the reward (¥${Math.max(1, Math.round(t.reward * 0.3))}) goes to the runner, and the rest returns to your wallet.` : <>对方已经接单出发了。现在取消算发单人违约：你的信用 -5，赏金的 30%（¥{Math.max(1, Math.round(t.reward * 0.3))}）补偿给跑腿人，其余退回钱包。</>}</p>
              <div className="mt-5 grid grid-cols-2 gap-2">
                <Btn variant="ghost" onClick={() => setPCancel(false)}>{tr('再想想', 'Go back')}</Btn>
                <Btn variant="danger" onClick={() => { act('posterCancel', { id: t.id }); setPCancel(false) }}>{tr('确定取消', 'Cancel order')}</Btn>
              </div>
            </Sheet>
          </>
        )}
      </div>
    )
  }

  if (t.status === 'delivered') {
    if (role === 'poster' && own) {
      return (
        <div className="grid gap-2">
          <Btn size="lg" className="w-full" onClick={() => { act('confirm', { id: t.id }); toEscrow() }}>{EN ? `Confirm and release ¥${t.reward}` : <>确认送达，放款 ¥{t.reward}</>}</Btn>
          <p className="mt-2 text-center text-sm text-muted">{EN ? <>The delivery code proves they showed up. Check the item before you pay. Confirm within 2 hours for credit +1</> : <>送达码证明人到了，东西对不对要你看一眼再放钱；<span className="whitespace-nowrap">2 小时内确认</span>，<span className="whitespace-nowrap">你的信用 +1</span></>}</p>
          <Btn variant="plain" size="sm" onClick={() => setDisputeOpen(true)}>{tr('有问题，申诉', 'Something wrong? Dispute')}</Btn>
          <Sheet open={disputeOpen} onClose={() => setDisputeOpen(false)} title={tr('发起申诉', 'Open a dispute')}>
            <p className="text-[15px] text-muted">{tr('申诉期间赏金继续冻结，平台会核对送达凭证。凭证有效、申诉被驳回时，你的信用 -5。', 'The reward stays held while we check the proof of delivery. If the proof holds up and the dispute is rejected, your credit -5.')}</p>
            <div className="mt-4 grid gap-2">
              {REASONS.map((r) => (
                <button key={r} onClick={() => setReason(r)} aria-pressed={reason === r} className={`h-12 rounded-xl px-4 text-left text-[15px] font-semibold ring-1 ${reason === r ? 'bg-accent-soft text-ink ring-accent' : 'bg-surface ring-line'}`}>{r}</button>
              ))}
            </div>
            <Btn size="lg" className="mt-5 w-full" onClick={() => { act('dispute', { id: t.id, reason }); setDisputeOpen(false) }}>{tr('提交申诉', 'Submit dispute')}</Btn>
          </Sheet>
        </div>
      )
    }
    if (!own) {
      if (state.role === 'poster') return <p className="text-center text-[15px] text-muted">{EN ? `This is ${t.posterName}'s order. Waiting for ${t.posterName} to confirm.` : <>这是{t.posterName}发的单，正在等{t.posterName}确认收货。</>}</p>
      return (
        <div className="grid gap-2 text-center">
          <p className="text-[15px] text-muted">{EN ? `Waiting for ${t.posterName} to confirm. If they don't within 2 hours, the payment is released automatically.` : <>等待发单人{t.posterName}确认，2 小时内不确认将自动放款。</>}</p>
          <Btn variant="ghost" onClick={() => { act('confirm', { id: t.id, simulated: true }); toEscrow() }}>{tr('试一下：对方确认收货', 'Try it: they confirm')}</Btn>
          <Btn variant="plain" size="sm" onClick={() => act('confirm', { id: t.id, auto: true })}>{tr('试一下：对方 2 小时没确认（发单人 -2）', 'Try it: no reply in 2 hours (requester -2)')}</Btn>
        </div>
      )
    }
    return (
      <div className="grid gap-2 text-center">
        <p className="text-[15px] text-muted">{tr('已提交凭证，等发单人确认放款。2 小时不确认系统自动放款，发单人信用 -2。', "Proof submitted. Waiting for the requester to release the payment. After 2 hours it's released automatically and the requester's credit -2.")}</p>
        <Btn onClick={() => act('role', { role: 'poster' })}>{tr('切回发单人去确认', 'Switch to Requester to confirm')}</Btn>
        <Btn variant="plain" size="sm" onClick={() => act('confirm', { id: t.id, auto: true })}>{tr('试一下：发单人 2 小时没确认', 'Try it: requester waits 2 hours')}</Btn>
      </div>
    )
  }

  if (t.status === 'disputed') {
    return (
      <Panel className="p-4">
        <p className="flex items-center gap-2 text-[15px] font-semibold"><Scales size={20} className="text-accent" />{EN ? `Dispute in review: ${t.dispute?.reason}` : <>申诉处理中：{t.dispute?.reason}</>}</p>
        <p className="mt-1 text-sm text-muted">{tr('平台核对送达凭证和通话记录，通常 24 小时内给结果。演示里你可以直接选裁决结果：', 'We check the proof of delivery and call logs, usually within 24 hours. In the demo, pick the outcome:')}</p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <Btn variant="ghost" size="sm" onClick={() => act('resolve', { id: t.id, winner: 'runner' })}>{tr('凭证有效，放款', 'Proof holds, release')}</Btn>
          <Btn variant="danger" size="sm" onClick={() => act('resolve', { id: t.id, winner: 'poster' })}>{tr('申诉成立，退款', 'Upheld, refund')}</Btn>
        </div>
      </Panel>
    )
  }

  if (t.status === 'completed') {
    const blocks = []
    if (role === 'poster' && own && !t.ratingByPoster) blocks.push(<RateBlock key="p" t={t} by="poster" />)
    if (role === 'runner' && mine && !t.ratingByRunner) blocks.push(<RateBlock key="r" t={t} by="runner" />)
    if (blocks.length) return <div className="grid gap-3">{blocks}</div>
    if (t.ratingByPoster && t.ratingByRunner) return null
    const otherPending = (role === 'poster' && own && mine && !t.ratingByRunner) || (role === 'runner' && mine && own && !t.ratingByPoster)
    return (
      <div className="grid gap-2 text-center">
        <p className="text-[15px] text-muted">{EN ? `Order complete${t.ratingByPoster ? `, requester gave ${t.ratingByPoster.stars} ${t.ratingByPoster.stars === 1 ? 'star' : 'stars'}` : ''}${t.ratingByRunner ? `, runner gave ${t.ratingByRunner.stars} ${t.ratingByRunner.stars === 1 ? 'star' : 'stars'}` : ''}.` : <>订单已完成{t.ratingByPoster ? `，发单人评价 ${t.ratingByPoster.stars} 星` : ''}{t.ratingByRunner ? `，跑腿人评价 ${t.ratingByRunner.stars} 星` : ''}。</>}</p>
        {otherPending && <Btn data-switch-role="" onClick={() => act('role', { role: role === 'poster' ? 'runner' : 'poster' })}>{tr('切换身份去互评', 'Switch roles to rate back')}</Btn>}
        {mine && <Btn variant="plain" onClick={() => { act('role', { role: 'runner' }); nav('/app/me') }}>{role === 'runner' ? tr('看我的信用变化', 'See my credit changes') : tr('看跑腿人信用变化', "See the runner's credit")}</Btn>}
        {own && role === 'poster' && <Btn variant={otherPending ? 'plain' : undefined} onClick={() => nav(`/app/publish?again=${t.id}`)}><ArrowClockwise size={18} weight="bold" />{tr('同样的再来一单', 'Post the same again')}</Btn>}
      </div>
    )
  }
  if (['refunded', 'cancelled'].includes(t.status) && own && role === 'poster') {
    return <Btn variant="ghost" className="w-full" onClick={() => nav(`/app/publish?again=${t.id}`)}><ArrowClockwise size={18} weight="bold" />{tr('按这单重新发布', 'Repost this order')}</Btn>
  }
  return null
}

// 跑腿人决定接不接时，直接看到这单顺不顺「我常走的路」
function RouteFit({ t }) {
  const route = myRoute()
  const m = detourMin(route.from, route.to, t)
  const name = shortName
  // 中文短句不让断开；英文更长，允许换行免得撑出去
  const nw = EN ? '' : 'whitespace-nowrap '
  return (
    <span className={`tnum inline-flex flex-col rounded-2xl px-3 py-1.5 text-sm ${m <= 5 ? 'bg-accent-soft text-accent' : 'bg-sunken text-ink'}`}>
      <span className={`${nw}font-bold`}>{EN ? `${m <= 5 ? 'On your way' : 'Off your route'} · ${m} min extra` : <>{m <= 5 ? '顺路 · ' : '不顺路 · '}捎这单多走 {m} 分钟</>}</span>
      <span className={`${nw}font-medium opacity-80`}>{m <= 5 ? tr(`你常走的 ${name(route.from)} → ${name(route.to)} 正好经过`, `Right on your usual ${name(route.from)} → ${name(route.to)}`) : tr(`你常走 ${name(route.from)} → ${name(route.to)}`, `You usually walk ${name(route.from)} → ${name(route.to)}`)}</span>
    </span>
  )
}

function OnTheWay({ t }) {
  const mine = onMyWay(t) ? myRoute() : null
  const R = mine || { from: t.from, to: t.to }
  if (!PLACES[R.from] || !PLACES[R.to] || R.from === R.to) return null
  const hits = mine ? [{ ...t, m: detourMin(mine.from, mine.to, t), dm: detourMeters(mine.from, mine.to, t) }] : []
  // 小人在哪：刚接单在出发点，取到件在取件点，送到了在终点
  const pts = routePath(R.from, R.to).pts
  const pick = mine ? along(pts.length > 3 ? pts.slice(1, -1) : pts, PLACES[t.from].door) : 0
  // 送达中：小人走到取件点和终点之间，看得出正往那边送
  const at = t.status === 'delivered' ? 1 : t.picked ? (Math.max(pick, 0.02) + 1) / 2 : 0.02
  const name = shortName
  const cap = EN
    ? (t.status === 'delivered' ? `Delivered to ${name(t.to)}, waiting for the requester` : t.picked ? `Picked up, heading to ${name(t.to)}` : mine ? `Heading to ${name(t.from)} to pick up` : `Order taken, picking up at ${name(t.from)}`)
    : t.status === 'delivered' ? `已送到${name(t.to)}，等发单人确认` : t.picked ? `已取到，正往${name(t.to)}走` : mine ? `在去${name(t.from)}取件的路上` : `已接单，在${name(t.from)}取件`
  return (
    <div data-tour-map="">
    <Panel className="p-3">
      <p className="px-1 pb-2 text-sm font-semibold"><span className="block text-accent">{cap}</span>{mine && <span className={`block ${EN ? '' : 'whitespace-nowrap '}font-normal text-muted`}>{EN ? `On your way: ${name(mine.from)} → ${name(mine.to)}` : <>顺路：{name(mine.from)} → {name(mine.to)}</>}</span>}</p>
      <CampusMap R={R} hits={hits} pills={false} walker={false} at={at} />
    </Panel>
    </div>
  )
}

// 这一单的收尾：路线、硬币从发单人滑到跑腿人、两边信用跟着涨；刚互评完会完整播一遍
function Roll({ from, to, play }) {
  const mv = useMotionValue(play ? from : to)
  const out = useTransform(mv, (v) => Math.round(v))
  useEffect(() => { if (!play) return; const c = animate(mv, to, { duration: 1.2, delay: 1.1, ease: [0.16, 1, 0.3, 1] }); return () => c.stop() }, [play, to, mv])
  return <motion.span>{out}</motion.span>
}
// 走完一单趁热留个钩子：一键打开下课提醒，和「我的」页那个开关是同一个
function RemindAgain() {
  const [on, setOn] = useState(() => { try { return localStorage.getItem('shunluxia:remind') === '1' } catch { return false } })
  const turnOn = () => { try { localStorage.setItem('shunluxia:remind', '1') } catch { /* 存不了不影响 */ } setOn(true) }
  return (
    <button onClick={turnOn} disabled={on} aria-pressed={on}
      className="mt-3 flex min-h-11 w-full items-center justify-center gap-2 rounded-full border border-on-accent/30 px-4 text-[15px] font-semibold transition active:scale-[0.98] disabled:border-transparent disabled:bg-on-accent/10">
      {on ? <><Check size={16} weight="bold" />{tr('已开启，明天下课前提醒你', "On. We'll remind you before class ends tomorrow")}</> : tr('明天下课也提醒我顺路的单', 'Remind me after class tomorrow too')}
    </button>
  )
}
function WrapUp({ t }) {
  const { state, act } = useStore()
  const nav = useNavigate()
  const reduce = useReducedMotion()
  const { poster, runner } = state.accounts
  const lastAt = Math.max(...t.timeline.map((x) => x.at))
  const [play] = useState(() => !reduce && Date.now() - lastAt < 8000)
  const mineLog = (acc) => acc.creditLog.filter((l) => l.label.includes(t.title) && l.at >= (t.completedAt || 0) - 1000)
  const sum = (acc) => mineLog(acc).reduce((n, l) => n + l.delta, 0)
  // 每一笔是怎么来的：「按时完成 +2 · 5 星好评 +1」
  const why = (acc) => mineLog(acc).slice().reverse().map((l) => `${EN
    ? l.label.replace(` “${t.title}”`, '').replace(/^Got a /, '').replace(', auto-released', '')
    : l.label.replace(`「${t.title}」`, '').replace(/^收到 ?/, '').replace('收到 ', '').replace('，系统自动放款', '')} ${l.delta > 0 ? '+' : ''}${l.delta}`)
  const rows = [
    t.runnerId === 'runner' && { who: runner, d: sum(runner), avatar: 'avatar-runner-v2' },
    t.posterId === 'poster' && { who: poster, d: sum(poster), avatar: 'avatar-poster-v2' },
  ].filter(Boolean)
  const name = shortName
  const ease = [0.16, 1, 0.3, 1]
  const mine = onMyWay(t) ? myRoute() : null
  const mapR = mine || { from: t.from, to: t.to }
  const mapHits = mine ? [{ ...t, m: detourMin(mine.from, mine.to, t), dm: detourMeters(mine.from, mine.to, t) }] : []
  return (
    <motion.section initial={play ? { opacity: 0, y: 16, scale: 0.98 } : false} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ type: 'spring', stiffness: 260, damping: 26 }}
      className="overflow-hidden rounded-[24px] bg-accent-deep p-5 text-on-accent" aria-label={tr('这一单的收尾', 'Order wrap-up')}>
      <p className="text-sm font-semibold opacity-75">{tr('这一单走完了', 'Order complete')}</p>
      <p className="mt-1 text-balance text-2xl font-bold">{EN ? `One trip on the way, ¥${t.reward} paid, ${rows.every((x) => x.d >= 0) ? 'credit went up' : 'credit went up and down'}` : <><span className="whitespace-nowrap">顺路一趟，¥{t.reward} 到账，</span><span className="whitespace-nowrap">{rows.every((x) => x.d >= 0) ? '信用都涨了' : '信用有涨有跌'}</span></>}</p>
      {PLACES[mapR.from] && PLACES[mapR.to] && mapR.from !== mapR.to ? (
        // 顺路的单：画跑腿人本来要走的整条路，这一单捎的那段亮绿；不顺路的单：只画取件到送达
        <div className="mt-4"><CampusMap R={mapR} hits={mapHits} reduce={!play} pills={false} walker={play} park at={play ? null : 1} /></div>
      ) : (
      <div className="relative mt-5 h-12" aria-hidden="true">
        <span className="absolute left-0 right-0 top-1/2 h-[3px] -translate-y-1/2 rounded-full bg-on-accent/25" />
        <motion.span className="absolute left-0 top-1/2 h-[3px] -translate-y-1/2 rounded-full bg-on-accent" initial={play ? { width: '0%' } : false} animate={{ width: '100%' }} transition={{ duration: 1, delay: 0.3, ease }} />
        <span className="absolute left-0 top-1/2 size-4 -translate-y-1/2 rounded-full bg-on-accent" />
        <span className="absolute right-0 top-1/2 size-4 -translate-y-1/2 rounded-full bg-on-accent ring-4 ring-on-accent/30" />
        {play && (
          <motion.span className="absolute top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-full bg-on-accent text-sm font-bold text-accent-deep"
            initial={{ left: '0%', x: '-50%', opacity: 0 }} animate={{ left: '100%', opacity: [0, 1, 1, 0] }} transition={{ duration: 1, delay: 0.3, ease }}>¥</motion.span>
        )}
      </div>
      )}
      {mine ? (
        <p className="mt-2 text-sm font-semibold">{EN ? <><span className="opacity-75">From {name(mine.from)}</span> → {t.from === t.to ? 'Save a seat' : 'Pick up'} at {name(t.from)}{t.from !== t.to && <> → Drop off at {name(t.to)}</>}</> : <><span className="opacity-75">{name(mine.from)}出发</span> → 在{name(t.from)}{t.from === t.to ? '占座' : '取件'}{t.from !== t.to && <> → {name(t.to)}送达</>}</>}</p>
      ) : (
        <div className="mt-2 flex justify-between text-sm font-semibold">
          <span>{name(t.from)}</span><span className="opacity-75">{t.from === t.to ? tr('占座', 'Seat') : tr('捎到', 'to')}</span><span>{name(t.to)}</span>
        </div>
      )}
      <dl className="mt-5 grid gap-2">
        {rows.map((x) => (
          <div key={x.who.id} className="flex items-center gap-3 rounded-2xl bg-on-accent/10 px-3 py-2.5">
            <img src={`${import.meta.env.BASE_URL}icons/${x.avatar}.webp`} width={32} height={32} alt="" className="size-9 shrink-0 rounded-full bg-surface ring-2 ring-on-accent" />
            <dt className="min-w-0 flex-1 text-[15px]">{x.who.name}<span className="opacity-70">{EN ? ` · ${x.who.role} credit` : <> · {x.who.role}信用</>}</span>{why(x.who).length > 0 && <span className="tnum mt-0.5 flex flex-wrap gap-x-2 text-xs leading-snug opacity-75">{why(x.who).map((w) => <span key={w} className="whitespace-nowrap">{w}</span>)}</span>}</dt>
            <dd className="tnum text-xl font-bold"><Roll from={x.who.credit - x.d} to={x.who.credit} play={play} /></dd>
            {x.d !== 0 && <span className="tnum rounded-full bg-on-accent px-2 py-0.5 text-sm font-bold text-accent-deep">{x.d > 0 ? '+' : ''}{x.d}</span>}
          </div>
        ))}
      </dl>
      {/* 下一个台阶还差多少：一单按时完成 +2、好评 +1，换算成「再顺几单」，比干巴巴的分差好懂 */}
      {t.runnerId === 'runner' && nextLevel(runner.credit) && (() => { const nx = nextLevel(runner.credit); const gap = nx.min - runner.credit; return (
        <p className="tnum mt-3 text-sm opacity-85">{EN ? `Yuan is ${gap} ${gap === 1 ? 'point' : 'points'} from ${nx.name}, about ${Math.ceil(gap / 3)} more ${Math.ceil(gap / 3) === 1 ? 'order' : 'orders'} on the way` : <>阿远离「{nx.name}」还差 {gap} 分，大约再顺路 {Math.ceil(gap / 3)} 单</>}</p>
      ) })()}
      <div className="mt-4 grid grid-cols-2 gap-2">
        {state.role === 'poster' && t.posterId === 'poster'
          ? <button onClick={() => nav(`/app/publish?again=${t.id}`)} className="h-11 rounded-full bg-on-accent text-[15px] font-semibold text-accent-deep active:scale-[0.98]">{tr('再顺一单', 'Post another')}</button>
          : <button onClick={() => nav('/app')} className="h-11 rounded-full bg-on-accent text-[15px] font-semibold text-accent-deep active:scale-[0.98]">{tr('看看还有谁顺路', 'Find more orders')}</button>}
        <button onClick={() => { act('role', { role: 'runner' }); nav('/app/me') }} className="h-11 rounded-full bg-on-accent/15 text-[15px] font-semibold active:scale-[0.98]">{tr('看信用变化', 'See credit')}</button>
      </div>
      {t.runnerId === 'runner' && <RemindAgain />}
    </motion.section>
  )
}

export default function TaskDetail() {
  const { id } = useParams()
  const { state } = useStore()
  const nav = useNavigate()
  const t = state.tasks.find((x) => x.id === id)
  // 切了身份，页面换成另一方能做的事：回到顶上从头看，不停在半中间
  const firstRole = useRef(true)
  // 切了身份回到顶上从头看；导览进行中由导览条负责滚到要点的按钮，这里不抢
  useEffect(() => { if (firstRole.current) { firstRole.current = false; return } if (state.tour.active) return; window.scrollTo({ top: 0, behavior: 'smooth' }) }, [state.role]) // eslint-disable-line react-hooks/exhaustive-deps
  if (!t) {
    return <Empty img="empty-search" alt={tr('空纸箱和放大镜', 'An empty box and a magnifying glass')} title={tr('找不到这个任务', "Can't find this order")} hint={tr('可能已被取消，或演示数据被重置了。', 'It may have been cancelled, or the demo data was reset.')} action={<Btn variant="ghost" onClick={() => nav('/app')}>{tr('回到任务大厅', 'Back to Order board')}</Btn>} />
  }
  const own = t.posterId === 'poster'
  const pmode = privacyMode(t, state.role)
  // 刚发布的那几秒：顶上落一张「已冻结托管」，让人看见钱被锁住了，而不是直接跳到详情
  const justPosted = own && state.role === 'poster' && t.status === 'open' && Date.now() - t.createdAt < 6000
  return (
    <div className="space-y-5">
      {justPosted && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ type: 'spring', stiffness: 380, damping: 28 }}
          data-tour-moment="" className="flex items-center gap-3 rounded-2xl bg-accent p-4 text-on-accent" role="status">
          <motion.img src={`${import.meta.env.BASE_URL}icons/trust-escrow-v1.webp`} width={40} height={40} alt="" className="size-10 shrink-0 rounded-xl bg-on-accent/90 object-contain p-1"
            initial={{ y: -16, rotate: -12, scale: 1.3 }} animate={{ y: 0, rotate: 0, scale: 1 }} transition={{ type: 'spring', stiffness: 500, damping: 14, delay: 0.15 }} />
          <p className="min-w-0 flex-1 text-[15px] leading-snug"><b className="block text-lg">{tr('已发布', 'Posted')}</b>{EN ? `¥${t.reward} is held in escrow and goes to the runner once delivery is confirmed` : <>¥{t.reward} 已冻结托管，送达确认后才放给跑腿人</>}</p>
        </motion.div>
      )}
      <div className="flex items-center gap-2">
        <button onClick={() => (window.history.state?.idx > 0 ? nav(-1) : nav("/app"))} aria-label={tr('返回', 'Back')} className="grid size-11 place-items-center rounded-full bg-surface ring-1 ring-line"><ArrowLeft size={20} weight="bold" /></button>
        <span className={`min-w-0 truncate text-[15px] font-semibold text-muted`}>{tr('订单详情', 'Order details')}</span>
        <span className="ml-auto"><StatusTag t={t} /></span>
      </div>

      {t.status === 'completed' && t.ratingByPoster && t.ratingByRunner && <WrapUp t={t} />}

      {!(t.status === 'completed' && t.ratingByPoster && t.ratingByRunner) && <Panel className="p-4"><Stepper t={t} /></Panel>}

      {/* 进行中：这一单在校园地图上怎么走，放在取件码上面，导览里一眼就看到「顺路」 */}
      <Collapse show={['ongoing', 'delivered'].includes(t.status)}><OnTheWay t={t} /></Collapse>

      {/* 接单后取件码和操作挪到标题上面：也平滑展开 / 收起，标题不被一下子推下去 */}
      <Collapse show={pmode === 'open'}><div className="space-y-5"><PickupCard t={t} /><div><Actions t={t} /></div></div></Collapse>

      <Collapse show={own && state.role === 'poster' && ['ongoing', 'delivered'].includes(t.status)}>{own && state.role === 'poster' && ['ongoing', 'delivered'].includes(t.status) && (
        t.status === 'delivered' && t.proof?.kind === 'photo' ? (
          // 拍照留证：给发单人看照片本身，不再显示送达码
          <div className="rounded-2xl bg-ink p-3 text-bg">
            <p className="flex items-center gap-2 px-1 pb-2 text-[15px]"><Check size={22} weight="bold" className="shrink-0 text-accent" />{tr('跑腿人已拍照留证，看一眼再放款', 'The runner took a photo. Check it before releasing the payment')}</p>
            <ProofPhoto t={t} at={t.proof.at || Date.now()} className="h-44 w-full" />
          </div>
        ) : (
        <div className="flex items-center gap-3 rounded-2xl bg-ink p-4 text-bg">
          {t.status === 'delivered' ? <Check size={26} weight="bold" className="shrink-0 text-accent" /> : <Numpad size={26} className="shrink-0" />}
          <p className="flex-1 text-[15px]">{t.status === 'delivered' ? tr('跑腿人已当面核验送达码', 'The runner verified the delivery code in person') : tr('送达码，见面后告诉跑腿人', 'Delivery code. Tell the runner when you meet')}</p>
          <span className="tnum text-3xl font-bold tracking-[0.2em]">{t.deliverCode}</span>
        </div>
        )
      )}</Collapse>


      <div>
        <div className="flex flex-wrap items-center gap-2"><TypeTag type={t.type} />{t.urgent && <UrgentTag />}{state.role === 'runner' && t.status === 'open' && <RouteFit t={t} />}</div>
        <h1 className="mt-3 font-display text-[28px] leading-snug">{t.title}</h1>
        <div className="mt-3 space-y-1.5 text-[15px] text-muted">
          <p className="flex items-start gap-1.5"><MapPin size={18} className="mt-0.5 shrink-0" /><span>{B[t.from]?.name}{t.from !== t.to && <> {tr('到', 'to')} {B[t.to]?.name}</>}</span></p>
          <p className="flex items-center gap-1.5"><Clock size={18} />{['open', 'ongoing'].includes(t.status) ? tr(`截止：${left(t.deadline)}`, `Due: ${left(t.deadline)}`) : t.status === 'delivered' || t.status === 'disputed' ? tr('已送达，等确认', 'Delivered, waiting to confirm') : t.completedAt ? (Date.now() - t.completedAt < 60 * 60 * 1000 ? (Date.now() - t.completedAt < 2 * 60 * 1000 ? tr('刚刚完成', 'Just completed') : tr(`${Math.round((Date.now() - t.completedAt) / 60000)} 分钟前完成`, `Completed ${Math.round((Date.now() - t.completedAt) / 60000)} min ago`)) : tr(`完成于 ${clock(t.completedAt)}`, `Completed at ${clock(t.completedAt)}`)) : STATUS_TEXT[t.status]}</p>
        </div>
        {t.note && <p className="mt-3 rounded-xl bg-sunken p-3 text-[15px]">{EN ? `Note: ${t.note}` : <>备注：{t.note}</>}</p>}
      </div>

      {t.status === 'completed' && <Escrow t={t} />}

      {pmode !== 'open' && <div><Actions t={t} /></div>}

      {t.status !== 'completed' && <Escrow t={t} />}

      <Panel className="flex items-center gap-3 p-4">
        <div className="flex-1">
          <p className="text-sm text-muted">{own && state.role === 'poster' && t.runnerId ? tr('跑腿人', 'Runner') : tr('发单人', 'Requester')}</p>
          <p className="flex flex-wrap items-center gap-2 text-[17px] font-semibold">{own && state.role === 'poster' && t.runnerId ? state.accounts.runner.name : own ? state.accounts.poster.name : t.posterName}<VerifiedBadge small /></p>
        </div>
        <div className="text-right">
          <p className="text-sm text-muted">{tr('信用', 'Credit')}</p>
          <p className="tnum text-xl font-bold">{own && state.role === 'poster' && t.runnerId ? state.accounts.runner.credit : own ? state.accounts.poster.credit : t.posterCredit}</p>
        </div>
      </Panel>

      {pmode !== 'open' && <PrivateInfo t={t} role={state.role} />}

      {t.proof && (
        <Panel className="p-4">
          <p className="text-[15px] font-semibold">{tr('送达凭证', 'Proof of delivery')}</p>
          {t.proof.kind === 'code' ? <p className="mt-1 flex items-center gap-1.5 text-[15px] text-muted"><Check size={18} className="text-accent" weight="bold" />{tr('送达码当面核验通过', 'Delivery code verified in person')}</p>
            : <img src={`${import.meta.env.BASE_URL}images/proof-v1.webp`} width={800} height={450} alt={tr('送达照片（模拟）：宿舍门口放着的包裹', 'Delivery photo (simulated): a parcel left at a dorm door')} className="mt-2 h-32 w-auto rounded-xl bg-sunken object-cover" />}
          {t.late && <p className="mt-2 flex items-center gap-1.5 text-sm font-medium text-danger"><Warning size={16} weight="fill" />{tr('超时送达', 'Delivered late')}</p>}
        </Panel>
      )}

      <section>
        <h2 className="mb-2 text-[17px] font-semibold">{tr('订单记录', 'Order history')}</h2>
        <ol className="space-y-3 border-l-2 border-line pl-4">
          {[...t.timeline].reverse().map((e, i) => (
            <motion.li key={e.at + e.text} initial={i === 0 ? { opacity: 0, x: -8 } : false} animate={{ opacity: 1, x: 0 }} transition={spring} className="relative">
              <span className={`absolute -left-[23px] top-1.5 size-3 rounded-full ${i === 0 ? 'bg-accent' : 'bg-line'}`} />
              <p className="text-[15px]">{e.text}</p>
              <p className="tnum text-sm text-muted">{ago(e.at)}</p>
            </motion.li>
          ))}
        </ol>
      </section>
    </div>
  )
}
