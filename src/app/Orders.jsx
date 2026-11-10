import { useState, useEffect } from 'react'
import { Receipt as PhReceipt } from '@phosphor-icons/react'
import { Link, useLocation } from 'react-router-dom'
import { useOpenTaskId } from './openTask'
import { ArrowRight } from '@phosphor-icons/react'
import { useStore } from '../store'
import { B } from '../data'
import { TypeTag, StatusTag, Empty, Btn, ago, gi, pi } from '../ui'
const Receipt = pi(PhReceipt)

// 列表里楼名去掉括号里的补充（「菜鸟驿站（东门）」→「菜鸟驿站」），一行放得下从哪到哪和时间
const nm = (k) => B[k]?.name.replace(/（.*?）/, '')
const ACTIVE = ['open', 'ongoing', 'delivered', 'disputed']

export default function Orders() {
  const open = useOpenTaskId()
  const loc = useLocation().pathname
  const here = open ? `/app/task/${open}` : loc
  const { state } = useStore()
  const poster = state.role === 'poster'
  const mine = state.tasks.filter((t) => (poster ? t.posterId === 'poster' : t.runnerId === 'runner'))
  const [tab, setTab] = useState(() => (mine.some((t) => ACTIVE.includes(t.status)) || !mine.length ? 'active' : 'done'))
  // 电脑版右边开着一单：页签跟着切到它所在的那一栏
  const openId = (here.match(/^\/app\/task\/(.+)$/) || [])[1]
  useEffect(() => { const t = mine.find((x) => x.id === openId); if (t) setTab(ACTIVE.includes(t.status) ? 'active' : 'done') }, [openId, mine.find((x) => x.id === openId)?.status]) // eslint-disable-line react-hooks/exhaustive-deps
  const list = mine.filter((t) => (tab === 'active' ? ACTIVE.includes(t.status) : !ACTIVE.includes(t.status)))
  return (
    <div className="space-y-5">
      <h1 className="font-display text-[28px] leading-tight">{poster ? '我发布的' : '我接的单'}</h1>
      <div className="grid grid-cols-2 rounded-full bg-sunken p-1">
        {[['active', '进行中'], ['done', '已结束']].map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)} aria-pressed={tab === k} className={`h-10 rounded-full text-[15px] font-semibold ${tab === k ? 'bg-surface text-ink shadow-sm' : 'text-muted'}`}>
            {l} {mine.filter((t) => (k === 'active' ? ACTIVE.includes(t.status) : !ACTIVE.includes(t.status))).length}
          </button>
        ))}
      </div>
      {list.length === 0 ? (
        <Empty img="empty-orders" alt="空的写字板" title={tab === 'active' ? '没有进行中的订单' : '还没有结束的订单'}
          hint={poster ? '发一单试试，赏金会先托管，送达确认后才放款。' : '去大厅接一单，完成后信用分和收入都会记在这里。'}
          action={<Btn as={Link} to={poster ? '/app/publish' : '/app'} variant="ghost">{poster ? '去发布' : '去大厅'}</Btn>} />
      ) : (
        <ul className="space-y-3">
          {list.map((t) => (
            <li key={t.id}>
              <Link to={`/app/task/${t.id}`} className={`flex items-center gap-3 rounded-2xl p-4 ring-1 active:scale-[0.99] ${here === `/app/task/${t.id}` ? 'bg-surface ring-2 ring-accent' : 'bg-surface ring-line'}`}>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2"><TypeTag type={t.type} /><StatusTag t={t} /><span className="ml-1 whitespace-nowrap text-sm text-muted">{ago(t.createdAt)}</span></div>
                  <p className="mt-2.5 truncate text-[17px] font-semibold leading-snug">{t.title}</p>
                  {/* 标题常常已经写了送到哪，这里写从哪到哪；楼名不从中间断开 */}
                  <p className="mt-1 text-sm leading-snug text-muted">{t.from === t.to ? nm(t.to) : <><span className="whitespace-nowrap">{nm(t.from)}</span> 到 <span className="whitespace-nowrap">{nm(t.to)}</span></>}</p>
                </div>
                <span className="tnum text-xl font-bold">¥{t.reward}</span>
                <ArrowRight size={18} className="text-muted" />
              </Link>
            </li>
          ))}
        </ul>
      )}
      {/* 单子少的时候，列表下面接着放信用变化和「再来一单」：每一单走完都看得到它在信用上记了什么 */}
      {mine.length > 0 && list.length <= 2 && <Recap poster={poster} mine={mine} />}
    </div>
  )
}

function Recap({ poster, mine }) {
  const { state } = useStore()
  const acc = state.accounts[poster ? 'poster' : 'runner']
  const log = acc.creditLog.slice(0, 4)
  const last = poster ? mine.find((t) => !ACTIVE.includes(t.status)) || mine[0] : null
  if (!log.length) return null
  return (
    <section aria-label="最近的信用变化" className="rounded-[24px] bg-accent-soft p-4">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-[16px] font-bold">最近的信用变化</h2>
        <span className="tnum text-[14px] text-muted">现在 {acc.credit} 分</span>
      </div>
      <ul className="mt-3 space-y-2">
        {log.map((x) => (
          <li key={`${x.at}${x.label}`} className="flex items-center gap-3 rounded-xl bg-surface px-3 py-2.5">
            <span className={`tnum w-11 shrink-0 rounded-full py-0.5 text-center text-[14px] font-bold ${x.delta > 0 ? 'bg-accent-soft text-accent' : x.delta < 0 ? 'bg-danger-soft text-danger' : 'bg-sunken text-muted'}`}>{x.delta > 0 ? `+${x.delta}` : x.delta}</span>
            <span className="min-w-0 flex-1 truncate text-[15px]">{x.label}</span>
            <span className="shrink-0 whitespace-nowrap text-[14px] text-muted">{ago(x.at)}</span>
          </li>
        ))}
      </ul>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        {last ? <Btn as={Link} to={`/app/publish?again=${last.id}`} variant="ghost" size="sm">同样的再来一单</Btn> : <Btn as={Link} to="/app" variant="ghost" size="sm">去大厅接下一单</Btn>}
        <Btn as={Link} to="/app/credit" variant="plain" size="sm">信用怎么算</Btn>
      </div>
    </section>
  )
}
