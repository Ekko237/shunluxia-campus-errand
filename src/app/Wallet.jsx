import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, useReducedMotion } from 'motion/react'
import { ArrowLeft } from '@phosphor-icons/react'
import { useMe } from '../store'
import { Panel, Empty, spring } from '../ui'

const fmtMoney = (n) => `${n < 0 ? '-' : n > 0 ? '+' : ''}¥${Math.abs(+n.toFixed(2))}`
const keyOf = (at, by) => {
  const d = new Date(at)
  return by === 'year' ? `${d.getFullYear()}` : `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}
const titleOf = (k, by) => (by === 'year' ? `${k} 年` : `${k.slice(0, 4)} 年 ${Number(k.slice(5))} 月`)
const when = (at, by) => {
  const d = new Date(at)
  const hm = d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
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
  const inWord = runner ? '收入' : '入账'

  // 托管退回不算入账，从支出里减掉：不然冻结时记一次支出、退回时又记一次入账，两头都算
  const refund = (l) => l.amount > 0 && l.label.includes('退回')
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
        <button onClick={() => (window.history.state?.idx > 0 ? nav(-1) : nav("/app"))} aria-label="返回" className="grid size-11 place-items-center rounded-full bg-surface ring-1 ring-line"><ArrowLeft size={20} weight="bold" /></button>
        <h1 className="font-display text-[28px] leading-tight">{runner ? '收入流水' : '钱包流水'}</h1>
      </div>

      <div className="rounded-2xl bg-accent p-5 text-on-accent">
        <p className="text-[15px] font-semibold opacity-90">可用余额</p>
        <p className="tnum text-5xl font-bold leading-none tracking-tight">¥{me.balance}</p>
        <dl className="mt-5 grid grid-cols-3 gap-2 border-t border-on-accent/20 pt-4">
          {[[`累计${inWord}`, `¥${income}`], ['累计支出', `¥${spend}`], ['托管冻结', `¥${me.frozen}`]].map(([k, v]) => (
            <div key={k}>
              <dd className="tnum text-xl font-bold">{v}</dd>
              <dt className="text-sm opacity-80">{k}</dt>
            </div>
          ))}
        </dl>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Segmented label="分组" value={by} onChange={setBy} options={[['month', '按月'], ['year', '按年']]} />
        <Segmented label="类型" value={kind} onChange={setKind} options={[['all', '全部'], ['in', inWord], ['out', '支出']]} />
      </div>

      {groups.length === 0 ? (
        <Panel>
          <Empty img="empty-wallet" alt="只有一枚硬币的钱包" title={me.ledger.length ? '这个筛选下没有记录' : '还没有流水'}
            hint={me.ledger.length ? '换个类型看看。' : runner ? <>完成第一单后，赏金会从托管放到<span className="whitespace-nowrap">这里，</span>按月份归档。</> : '发单、退款、充值都会记在这里。'} />
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
                  {g.outSum > 0 && <span>支出 ¥{g.outSum}</span>}
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
