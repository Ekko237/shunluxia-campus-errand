import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence, useReducedMotion, useIsPresent } from 'motion/react'
import { X, Star } from '@phosphor-icons/react'
import { TYPES } from './data'

// 表达内容的小图标用生成图（public/icons/ic-*.webp），和 Phosphor 同样的用法：<X size={20} className="..." />
export function gi(name, v = 'v1') {
  const C = ({ size = 20, className = '' }) => (
    <img src={`${import.meta.env.BASE_URL}icons/ic-${name}-${v}.webp`} width={size} height={size} alt="" aria-hidden="true"
      className={`inline-block shrink-0 object-contain ${className.replace(/\btext-\S+/g, '')}`} style={{ width: size, height: size }} />
  )
  C.displayName = `Ico(${name})`
  return C
}
// 素材里被裁坏的那几张图（相机、数字键盘、小票、下降趋势、开锁）：换成图标库里的同名图标，统一用主题色
export function pi(I, color = 'text-accent') {
  const C = ({ size = 20, className = '' }) => <I size={size} weight="duotone" aria-hidden="true" className={`inline-block shrink-0 ${color} ${className.replace(/\btext-\S+/g, '')}`} />
  C.displayName = `Ph(${I.displayName || 'icon'})`
  return C
}
const SealCheck = gi('seal')
const Lightning = gi('bolt')

export const spring = { type: 'spring', stiffness: 260, damping: 26 }

export function Btn({ as: As = 'button', variant = 'primary', size = 'md', className = '', children, ...p }) {
  const base = 'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full font-semibold transition active:scale-[0.98] disabled:opacity-45 disabled:active:scale-100 disabled:cursor-not-allowed'
  const sizes = { md: 'h-12 px-5 text-base', lg: 'h-14 px-7 text-[17px]', sm: 'h-10 px-4 text-[15px]' }
  const v = {
    primary: 'bg-accent text-on-accent hover:brightness-105',
    ink: 'bg-ink text-bg hover:opacity-90',
    ghost: 'bg-surface text-ink ring-1 ring-line hover:bg-sunken',
    danger: 'bg-danger-soft text-danger ring-1 ring-danger/30',
    plain: 'text-accent hover:underline px-1',
  }
  return <As className={`${base} ${sizes[size]} ${v[variant]} ${className}`} {...p}>{children}</As>
}

export function Panel({ className = '', children, ...p }) {
  return <div className={`rounded-2xl bg-surface ring-1 ring-line ${className}`} {...p}>{children}</div>
}

export function TypeTag({ type }) {
  const t = TYPES[type]
  if (!t) return null
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-sunken px-2.5 py-1 text-sm font-medium text-ink">
      <t.Icon size={16} weight="bold" />{t.label}
    </span>
  )
}

// 订单状态：和类型标签同一种胶囊，出了岔子的（申诉、退款、取消）用灰底
const STATUS_TEXT = { open: '待接单', ongoing: '进行中', delivered: '待确认', completed: '已完成', disputed: '申诉中', refunded: '已退款', cancelled: '已取消' }
export function StatusTag({ t }) {
  const off = ['refunded', 'cancelled', 'disputed'].includes(t.status)
  return <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-sm font-semibold ${off ? 'bg-sunken text-ink' : 'bg-accent-soft text-accent'}`}>{t.status === 'ongoing' && t.picked ? '送达中' : STATUS_TEXT[t.status]}</span>
}

export function UrgentTag() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-ink px-2.5 py-1 text-sm font-semibold text-bg">
      <Lightning size={14} weight="fill" />加急
    </span>
  )
}

export function VerifiedBadge({ small }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full bg-accent-soft font-medium text-accent ${small ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-sm'}`}>
      <SealCheck size={small ? 14 : 16} weight="fill" />校园认证
    </span>
  )
}

// 头像：生成图（发单人小满、跑腿人阿远），其他人回退为文字头像
export function Avatar({ who, name = '', size = 44 }) {
  if (who === 'poster' || who === 'runner') {
    return <img src={`${import.meta.env.BASE_URL}icons/avatar-${who}-v2.webp`} width={size} height={size} alt={`${name}的头像`} className="shrink-0 rounded-full object-cover" style={{ width: size, height: size }} />
  }
  return (
    <span aria-hidden="true" className="grid shrink-0 place-items-center rounded-full bg-accent-soft font-bold text-accent" style={{ width: size, height: size, fontSize: size * 0.42 }}>
      {name.slice(-1)}
    </span>
  )
}

export function Sheet({ open, onClose, title, children }) {
  // 挂到 body 上：不受页面转场的 transform 影响，遮罩能盖住顶栏和导览条
  return createPortal(
    <AnimatePresence>
      {open && <SheetBody key="sheet" onClose={onClose} title={title}>{children}</SheetBody>}
    </AnimatePresence>,
    document.body,
  )
}

// 弹层本体单独成一个组件，才能知道自己是不是正在收起：收起的那 0.3 秒标上 data-closing，
// 指引就不会把一个正在关掉的弹窗当成还开着、去圈里面的按钮
function SheetBody({ onClose, title, children }) {
  const reduce = useReducedMotion()
  const present = useIsPresent()
  // 打开时把键盘焦点放进弹层，Tab 只在弹层里转，不跑到被压暗的背景里
  const panel = useRef(null)
  useEffect(() => {
    if (!present || !panel.current) return
    const els = () => [...panel.current.querySelectorAll('button, a[href], input, select, textarea, [tabindex]:not([tabindex="-1"])')].filter((e) => !e.disabled && e.offsetParent)
    const prev = document.activeElement
    if (!panel.current.contains(document.activeElement)) (els().find((e) => !e.matches('[aria-label="关闭"]')) || panel.current).focus({ preventScroll: true })
    const trap = (e) => {
      if (e.key !== 'Tab') return
      const l = els(); if (!l.length) return
      const i = l.indexOf(document.activeElement)
      if (e.shiftKey && (i <= 0)) { e.preventDefault(); l[l.length - 1].focus() } else if (!e.shiftKey && i === l.length - 1) { e.preventDefault(); l[0].focus() }
    }
    window.addEventListener('keydown', trap)
    return () => { window.removeEventListener('keydown', trap); if (prev && document.contains(prev)) prev.focus?.({ preventScroll: true }) }
  }, [present])
  // 按 Esc 也能关
  useEffect(() => { if (!present) return; const f = (e) => { if (e.key === 'Escape') onClose?.() }; window.addEventListener('keydown', f); return () => window.removeEventListener('keydown', f) }, [present, onClose])
  return (
        // 只让遮罩淡入淡出，弹层本身一直不透明、只做上滑：下面的表单字不会从弹层里透上来
        <motion.div className={`fixed inset-0 z-50 flex items-end justify-center sm:items-center ${present ? '' : 'pointer-events-none'}`} initial={false} exit={{ opacity: 1, transition: { duration: 0.25 } }}>
          <motion.div className="absolute inset-0 bg-ink/50" onClick={onClose} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} />
          <motion.div
            ref={panel} tabIndex={-1} role="dialog" aria-modal="true" aria-label={title} data-closing={present ? undefined : ''}
            className="relative max-h-[88dvh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-surface p-5 pb-8 sm:rounded-2xl"
            initial={reduce ? false : { y: '100%' }} animate={{ y: 0 }} exit={reduce ? { opacity: 0 } : { y: '100%' }} transition={spring}
          >
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-xl font-bold">{title}</h2>
              <button onClick={onClose} aria-label="关闭" className="grid size-11 place-items-center rounded-full bg-sunken"><X size={20} weight="bold" /></button>
            </div>
            {children}
          </motion.div>
        </motion.div>
  )
}

export function Empty({ img, alt = '', title, hint, action }) {
  return (
    <div className="flex flex-col items-center px-6 py-12 text-center">
      <img src={`${import.meta.env.BASE_URL}icons/${img}-v1.webp`} width={112} height={112} alt={alt} className="size-28 object-contain" />
      <p className="mt-4 text-lg font-semibold">{title}</p>
      {hint && <p className="mt-1.5 max-w-[26ch] text-base text-muted">{hint}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}

export function Field({ label, error, hint, children }) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-[15px] font-semibold">{label}</span>
      {children}
      {hint && <span className="text-sm text-muted">{hint}</span>}
      <span role={error ? 'alert' : undefined} className={`min-h-5 text-sm font-medium text-danger ${error ? '' : 'invisible'}`}>{error || '占位'}</span>
    </div>
  )
}

export const inputCls = 'h-12 w-full rounded-xl bg-surface px-3.5 text-base text-ink ring-1 ring-line placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent'

export function Stars({ value, onChange, size = 30 }) {
  return (
    <div className="flex gap-1" role="radiogroup" aria-label="评分">
      {[1, 2, 3, 4, 5].map((n) => (
        <button key={n} type="button" role="radio" aria-checked={value === n} aria-label={`${n} 星`} onClick={() => onChange(n)}
          className={`grid size-11 place-items-center rounded-full transition active:scale-90 ${n <= value ? 'text-accent' : 'text-muted'}`}>
          <Star size={size} weight={n <= value ? 'fill' : 'regular'} />
        </button>
      ))}
    </div>
  )
}

export const ago = (t) => {
  const m = Math.round((Date.now() - t) / 60000)
  if (m < 1) return '刚刚'
  if (m < 60) return `${m} 分钟前`
  const h = Math.round(m / 60)
  return h < 24 ? `${h} 小时前` : `${Math.round(h / 24)} 天前`
}
export const left = (t) => {
  const m = Math.round((t - Date.now()) / 60000)
  if (m <= 0) return '已超时'
  if (m < 60) return `${m} 分钟内`
  const h = Math.floor(m / 60)
  // 一小时以上统一写「约 N 小时内」，不和「1 小时 28 分钟内」混着用；超过 8 小时（占座、讲座）写具体到几点
  if (h < 8) return `约 ${Math.max(1, Math.round(m / 60))} 小时内`
  // 超过 8 小时的截止取整到半点，不出现「09:17」这种按当前时间推出来的分钟数
  const d = new Date(Math.round(t / 1800000) * 1800000), today = new Date()
  const days = Math.round((new Date(d.getFullYear(), d.getMonth(), d.getDate()) - new Date(today.getFullYear(), today.getMonth(), today.getDate())) / 86400000)
  return `${['今天', '明天', '后天'][days] ?? `${days} 天后`} ${clock(d)} 前`
}
export const clock = (t) => new Date(t).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
