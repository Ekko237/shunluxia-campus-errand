import { useNavigate } from 'react-router-dom'
import { motion, useReducedMotion } from 'motion/react'
import { Check, ArrowCounterClockwise } from '@phosphor-icons/react'
import { useStore } from '../store'
import { levelOf, posterTierOf } from '../data'
import { Avatar, gi } from '../ui'

// 和导览条的「共 8 步」一一对应
const STEPS = ['发布托管', '校园认证', '接单', '取到快递', '提交送达凭证', '确认放款', '发单人评价', '跑腿人回评']
function progress(t, verified) {
  if (!t) return 0
  if (t.status === 'open') return verified ? 2 : 1
  if (t.status === 'ongoing') return t.picked ? 4 : 3
  if (t.status === 'delivered' || t.status === 'disputed') return 5
  if (t.status === 'completed') return 6 + (t.ratingByPoster ? 1 : 0) + (t.ratingByRunner ? 1 : 0)
  return 1
}

function Num({ v }) {
  const reduce = useReducedMotion()
  return (
    <motion.span key={v} initial={reduce ? false : { y: -6 }} animate={{ y: 0 }} className="tnum inline-block">
      {v}
    </motion.span>
  )
}

// 宽屏（≥1280px）右侧的演示面板：同时看到两个账号的信用和钱包，以及最近一单走到哪一步
export default function DemoPanel() {
  const { state, act } = useStore()
  const nav = useNavigate()
  const { poster, runner } = state.accounts
  // 引导进行中跟踪引导那一单，否则显示发单人最新发布的一单（tasks 按发布时间倒序）
  const t = (state.tour.active && state.tasks.find((x) => x.id === state.tour.taskId)) || state.tasks.find((x) => x.posterId === 'poster')
  const n = progress(t, runner.verified)
  const start = () => {
    act('tour', { tour: { active: true, taskId: null, done: false } })
    act('role', { role: 'poster' })
    nav('/app/publish?tour=1')
  }
  const accounts = [
    ['poster', poster, `余额 ¥${poster.balance}${poster.frozen ? ` · 托管冻结 ¥${poster.frozen}` : ''}`],
    ['runner', runner, `累计收入 ¥${runner.ledger.filter((l) => l.amount > 0).reduce((a, l) => a + l.amount, 0)} · 完成 ${runner.done} 单`],
  ]
  return (
    <div className="space-y-4">
      <p className="text-sm font-semibold text-muted">演示面板 · 示例数据</p>
      {accounts.map(([k, a, sub]) => (
        <button key={k} onClick={() => act('role', { role: k })} aria-pressed={state.role === k}
          className={`flex w-full items-center gap-3 rounded-2xl p-3.5 text-left ring-1 transition ${state.role === k ? 'bg-accent-soft ring-accent' : 'bg-surface ring-line hover:bg-sunken'}`}>
          <Avatar who={k} name={a.name} size={40} />
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-1.5 text-[15px] font-semibold">{a.name}<span className="text-sm font-normal text-muted">{a.role}</span></p>
            <p className="text-sm text-muted">{sub.split(' · ').map((x, i) => <span key={i}>{i ? ' · ' : ''}<span className="whitespace-nowrap">{x}</span></span>)}</p>
          </div>
          <div className="text-right">
            {a.verified ? (
              <>
                <p className="text-xl font-bold text-accent"><Num v={a.credit} /></p>
                <p className="text-[13px] text-muted">{(k === 'poster' ? posterTierOf : levelOf)(a.credit).name}</p>
              </>
            ) : <p className="text-[13px] text-muted">未认证</p>}
          </div>
        </button>
      ))}
      <div className="rounded-2xl bg-surface p-4 ring-1 ring-line">
        <p className="truncate text-[15px] font-semibold">{t ? `最近一单：${t.title}` : '还没有发过单'}</p>
        {/* 8 步收成一条细进度：做到哪一步、下一步做什么，矮屏也一眼看全 */}
        <div className="mt-3 flex gap-1" role="img" aria-label={`走到第 ${n} 步，共 8 步`}>
          {STEPS.map((s, i) => <span key={s} className={`h-1.5 flex-1 rounded-full transition-colors duration-300 ${i < n ? 'bg-accent' : 'bg-sunken'}`} />)}
        </div>
        <p className="mt-2 flex items-center gap-1.5 text-[14px]">
          {n >= STEPS.length ? <><Check size={14} weight="bold" className="text-accent" />8 步都走完了</> : <><span className="tnum text-muted">{n}/8</span>下一步：<b className="font-semibold">{STEPS[n]}</b></>}
        </p>
      </div>
      <div className="sticky bottom-0 z-10 -mx-1.5 grid gap-2 bg-bg px-1.5 pb-1.5 pt-3 shadow-[0_-12px_12px_-8px_var(--bg)]">
        {state.tour.active ? <button onClick={() => act('tour', { tour: { active: false } })} className="inline-flex h-11 items-center justify-center rounded-full bg-sunken text-[15px] font-semibold active:scale-[0.98]">退出导览</button> : (
          <button onClick={start} className="inline-flex h-11 items-center justify-center gap-2 whitespace-nowrap rounded-full bg-accent text-[15px] font-semibold text-on-accent active:scale-[0.98]">跟着走一遍（约 2 分钟）</button>
        )}
        <button onClick={() => { if (window.confirm('把演示数据恢复成初始示例？你走过的订单和信用变化都会清掉。')) { act('reset'); nav('/app') } }} className="inline-flex h-11 items-center justify-center gap-2 whitespace-nowrap rounded-full bg-surface text-[15px] font-semibold ring-1 ring-line active:scale-[0.98]"><ArrowCounterClockwise size={18} weight="bold" />重置演示数据</button>
      </div>
    </div>
  )
}
