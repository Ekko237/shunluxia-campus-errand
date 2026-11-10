import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, useReducedMotion } from 'motion/react'
import { ArrowLeft } from '@phosphor-icons/react'
import { useMe } from '../store'
import { Panel, Empty, spring } from '../ui'
import { EN, tr } from '../i18n'

const fmtMoney = (n) => `${n < 0 ? '-' : n > 0 ? '+' : ''}¥${Math.abs(+n.toFixed(2))}`
const keyOf = (at, by) => {
  const d = new Date(at)
  return by === 'year' ? `${d.getFullYear()}` : `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}
const titleOf = (k, by) => (EN
  ? (by === 'year' ? k : new Date(Number(k.slice(0, 4)), Number(k.slice(5)) - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }))
  : (by === 'year' ? `${k} 年` : `${k.slice(0, 4)} 年 ${Number(k.slice(5))} 月`))
const when = (at, by) => {
  const d = new Date(at)
  const hm = d.toLocaleTimeString(EN ? 'en-US' : 'zh-CN', { hour: '2-digit', minute: '2-digit' })
  if (EN) return `${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}, ${hm}`
  return by === 'year' ? `${d.getMonth() + 1} 月 ${d.getDate()} 日 ${hm}` : `${d.getDate()} 日 ${hm}`
}

function Segmented({ value, onChange, options, label }) {
  return (
    <div className="grid rounded-full bg-sunken p-1" style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }} role="group" aria-label={label}>
      {options.map(([k, l]) => (
        <button key={k} onClick={() => onChange(k)} aria-pressed={value === k}
          className={`relative h-9 whitespace-nowrap rounded-full text-sm font-semibold transition-colors ${value === k ? 'text-ink' : 'text-muted'}`}>
          {value === k && <motion.span layoutId={`seg-${label}`} transition={spring} className="absolute inset-0 -z-0 rounded-full bg-surface shadow-sm" />}
          <span className="relative">{l}</span>
        </button>
      ))}
    </div>
  )
}

export default function Wallet() {
  const me = useMe()
  const nav = useNavigate()
  const reduce = useReducedMotion()
  const [by, setBy] = useState('month')
  const [kind, setKind] = useState('all')
  const runner = me.id === 'runner'
  const inWord = runner ? tr('收入', 'Income') : tr('入账', 'Money in')

  // 托管退回不算入账，从支出里减掉：不然冻结时记一次支出、退回时又记一次入账，两头都算
  const refund = (l) => l.amount > 0 && l.label.includes(tr('退回', 'refunded'))
  const refunds = me.ledger.filter(refund).reduce((a, l) => a + l.amount, 0)
  const income = me.ledger.filter((l) => l.amount > 0 && !refund(l)).reduce((a, l) => a + l.amount, 0)
  const spend = me.ledger.filter((l) => l.amount < 0).reduce((a, l) => a - l.amount, 0) - refunds

  const groups = useMemo(() => {
    const list = [...me.ledger]
      .filter((l) => (kind === 'in' ? l.amount > 0 : kind === 'out' ? l.amount < 0 : true))
      .sort((a, b) => b.at - a.at)
    const map = new Map()
    for (const l of list) {
      const k = keyOf(l.at, by)
      if (!map.has(k)) map.set(k, [])
      map.get(k).push(l)
    }
    return [...map.entries()].map(([k, items]) => ({
      k,
      items,
      inSum: items.filter((l) => l.amount > 0).reduce((a, l) => a + l.amount, 0),
      outSum: items.filter((l) => l.amount < 0).reduce((a, l) => a - l.amount, 0),
    }))
  }, [me.ledger, by, kind])

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <button onClick={() => (window.history.state?.idx > 0 ? nav(-1) : nav("/app"))} aria-label={tr('返回', 'Back')} className="grid size-11 place-items-center rounded-full bg-surface ring-1 ring-line"><ArrowLeft size={20} weight="bold" /></button>
        <h1 className="font-display text-[28px] leading-tight">{runner ? tr('收入流水', 'Income history') : tr('钱包流水', 'Wallet history')}</h1>
      </div>

      <div className="rounded-2xl bg-accent p-5 text-on-accent">
        <p className="text-[15px] font-semibold opacity-90">{tr('可用余额', 'Available balance')}</p>
        <p className="tnum text-5xl font-bold leading-none tracking-tight">¥{me.balance}</p>
        <dl className="mt-5 grid grid-cols-3 gap-2 border-t border-on-accent/20 pt-4">
          {[[EN ? (runner ? 'Total income' : 'Total in') : `累计${inWord}`, `¥${income}`], [tr('累计支出', 'Total spent'), `¥${spend}`], [tr('托管冻结', 'In escrow'), `¥${me.frozen}`]].map(([k, v]) => (
            <div key={k}>
              <dd className="tnum text-xl font-bold">{v}</dd>
              <dt className="text-sm opacity-80">{k}</dt>
            </div>
          ))}
        </dl>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Segmented label={tr('分组', 'Group by')} value={by} onChange={setBy} options={[['month', tr('按月', 'Monthly')], ['year', tr('按年', 'Yearly')]]} />
        <Segmented label={tr('类型', 'Type')} value={kind} onChange={setKind} options={[['all', tr('全部', 'All')], ['in', tr(inWord, 'In')], ['out', tr('支出', 'Out')]]} />
      </div>

      {groups.length === 0 ? (
        <Panel>
          <Empty img="empty-wallet" alt={tr('只有一枚硬币的钱包', 'A wallet with a single coin')} title={me.ledger.length ? tr('这个筛选下没有记录', 'Nothing matches this filter') : tr('还没有流水', 'No transactions yet')}
            hint={me.ledger.length ? tr('换个类型看看。', 'Try another type.') : runner ? (EN ? 'After your first order, the reward moves from escrow to here, sorted by month.' : <>完成第一单后，赏金会从托管放到<span className="whitespace-nowrap">这里，</span>按月份归档。</>) : tr('发单、退款、充值都会记在这里。', 'Orders, refunds and top-ups all show up here.')} />
        </Panel>
      ) : (
        <div key={by + kind} className="space-y-5">
          {groups.map((g, gi) => (
            <motion.section key={g.k} initial={reduce ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ ...spring, delay: Math.min(gi, 6) * 0.03 }}>
              <div className="mb-2 flex items-baseline justify-between gap-3 px-1">
                <h2 className="text-lg font-bold">{titleOf(g.k, by)}</h2>
                <p className="tnum text-sm text-muted">
                  {g.inSum > 0 && <span className="text-accent">{inWord} ¥{g.inSum}</span>}
                  {g.inSum > 0 && g.outSum > 0 && <span className="mx-1.5">/</span>}
                  {g.outSum > 0 && <span>{tr('支出', 'Spent')} ¥{g.outSum}</span>}
                </p>
              </div>
              <Panel className="divide-y divide-line">
                {g.items.map((l, i) => (
                  <div key={l.at + l.label + i} className="flex items-center gap-3 p-4">
                    <div className="min-w-0 flex-1">
                      <p className="text-[15px] font-medium">{l.label}</p>
                      <p className="tnum text-sm text-muted">{when(l.at, by)}</p>
                    </div>
                    <span className={`tnum shrink-0 text-lg font-bold ${l.amount > 0 ? 'text-accent' : ''}`}>{fmtMoney(l.amount)}</span>
                  </div>
                ))}
              </Panel>
            </motion.section>
          ))}
        </div>
      )}
    </div>
  )
}
