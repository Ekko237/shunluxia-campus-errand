import { createContext, useContext, useEffect, useReducer, useCallback, useState } from 'react'
import { seedTasks, seedAccounts, CREDIT_INIT, levelOf, COMPENSATE } from './data'

const KEY = 'shunluxia:v3'
const Ctx = createContext(null)

function fresh() {
  return { role: 'poster', accounts: seedAccounts(), tasks: seedTasks(), onboarded: false, tour: { active: false, taskId: null, done: false }, toasts: [] }
}

function load() {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return { state: fresh(), error: null }
    const s = JSON.parse(raw)
    if (!s || !Array.isArray(s.tasks) || !s.accounts?.poster || !s.accounts?.runner) throw new Error('bad shape')
    // 示例单是演示用的：过了截止时间就按原来的时间窗重新排到「现在」，大厅不会一片「已超时」
    const t0 = Date.now()
    const tasks = s.tasks.map((t) => (/^s\d+$/.test(t.id) && t.status === 'open' && t.deadline < t0
      ? { ...t, createdAt: t0 - (t.ago ?? 10) * 60000, deadline: t0 + t.windowMin * 60000, timeline: [{ ...t.timeline[0], at: t0 - (t.ago ?? 10) * 60000 }, ...t.timeline.slice(1)] }
      : t))
    // 旧版示例账号只有一行信用记录、没有评价，和「发布 5 单」对不上：换成新版示例
    let accounts = s.accounts
    const sp = seedAccounts().poster
    if (!accounts.poster.ratings.length && accounts.poster.creditLog.length === 1 && accounts.poster.creditLog[0].label.startsWith('示例账号')) {
      accounts = { ...accounts, poster: { ...accounts.poster, ratings: sp.ratings, creditLog: [...accounts.poster.creditLog.slice(0, 0), ...sp.creditLog] } }
    }
    return { state: { ...s, accounts, tasks, toasts: [] }, error: null }
  } catch (e) {
    return { state: fresh(), error: '本地演示数据损坏，已无法读取' }
  }
}

const now = () => Date.now()
const log = (t, text) => ({ ...t, timeline: [...t.timeline, { at: now(), text }] })

function credit(acc, delta, label) {
  if (acc.credit == null) return acc
  const c = Math.max(0, Math.min(100, acc.credit + delta))
  return { ...acc, credit: c, creditLog: [{ at: now(), delta, label }, ...acc.creditLog] }
}
function money(acc, amount, label, field = 'balance') {
  return { ...acc, [field]: +(acc[field] + amount).toFixed(2), ledger: field === 'balance' || amount < 0 ? [{ at: now(), amount, label }, ...acc.ledger] : acc.ledger }
}
function toast(s, text, tone = 'ok') {
  return { ...s, toasts: [...s.toasts, { id: Math.random().toString(36).slice(2), text, tone }].slice(-4) }
}
function levelMsg(before, after) {
  if (before == null || after == null) return null
  const a = levelOf(before), b = levelOf(after)
  return a.name !== b.name ? `跑腿人信用等级变为「${b.name}」：${b.desc}` : null
}

function reducer(s, a) {
  const upd = (id, fn) => ({ ...s, tasks: s.tasks.map((t) => (t.id === id ? fn(t) : t)) })
  const task = s.tasks.find((t) => t.id === a.id)
  switch (a.type) {
    case 'role':
      return { ...s, role: a.role }
    case 'onboarded':
      return { ...s, onboarded: true }
    case 'tour':
      // 导览开始：「我常走的路」先换回导览那一单所在的一教 → 梅园，免得首页选过别的路，导览那单被说成「不顺路」
      if (a.tour.active && !s.tour.active) { try { localStorage.setItem('shunluxia:myroute', JSON.stringify({ from: 'jiao1', to: 'mei5' })) } catch { /* 存不了不影响 */ } }
      return { ...s, onboarded: true, tour: { ...s.tour, ...a.tour } }
    case 'dismissToast':
      return { ...s, toasts: s.toasts.filter((x) => x.id !== a.tid) }
    case 'reset': {
      try { localStorage.removeItem(KEY) } catch {}
      return { ...fresh(), onboarded: true }
    }
    case 'verify': {
      const acc = s.accounts[a.who]
      const next = { ...acc, verified: true, verifyMethod: a.method, credit: acc.credit ?? CREDIT_INIT, creditLog: acc.credit == null ? [{ at: now(), delta: 0, label: `完成${a.method}，初始信用 ${CREDIT_INIT}` }] : acc.creditLog }
      return toast({ ...s, accounts: { ...s.accounts, [a.who]: next } }, `认证成功，获得校园认证徽章，初始信用 ${next.credit}`)
    }
    case 'publish': {
      const p = s.accounts.poster
      const t = {
        ...a.task, posterId: 'poster', posterName: p.name, posterCredit: p.credit,
        status: 'open', picked: false, proof: null, runnerId: null, late: false, ratingByPoster: null, ratingByRunner: null, dispute: null,
        createdAt: now(), deadline: now() + a.task.windowMin * 60000,
        timeline: [{ at: now(), text: `发布任务，赏金 ¥${a.task.reward} 已冻结托管` }],
      }
      const poster = money({ ...p, frozen: p.frozen + t.reward }, -t.reward, `发布「${t.title}」冻结托管`)
      const ns = { ...s, tasks: [t, ...s.tasks], accounts: { ...s.accounts, poster }, tour: s.tour.active && !s.tour.taskId ? { ...s.tour, taskId: t.id } : s.tour }
      return toast(ns, `已发布，¥${t.reward} 已冻结托管，送达确认后才放款`)
    }
    case 'cancel': {
      const p = s.accounts.poster
      const poster = money({ ...p, frozen: p.frozen - task.reward }, task.reward, `取消「${task.title}」，托管退回`)
      return toast({ ...upd(a.id, (t) => log({ ...t, status: 'cancelled' }, '发单人取消，托管赏金原路退回')), accounts: { ...s.accounts, poster } }, '已取消，赏金退回钱包')
    }
    case 'posterCancel':
    case 'mismatch': {
      // 接单后发单人取消，或跑腿人申诉「描述不符」成立：发单人 -5，赏金 30% 补偿跑腿人，其余退回
      let { poster, runner } = s.accounts
      const comp = Math.max(1, Math.round(task.reward * COMPENSATE))
      const why = a.type === 'posterCancel' ? '接单后取消' : '任务描述与实际不符'
      if (task.posterId === 'poster') {
        poster = money({ ...poster, frozen: poster.frozen - task.reward }, task.reward - comp, `「${task.title}」${why}，扣除补偿后退回`)
        poster = credit(poster, -5, `${why}「${task.title}」`)
      }
      runner = money(runner, comp, `「${task.title}」${why}，跑空补偿`)
      const posterCredit = task.posterId === 'poster' ? task.posterCredit : Math.max(0, task.posterCredit - 5)
      const text = a.type === 'posterCancel' ? `发单人在接单后取消：发单人信用 -5，跑腿人获得 ¥${comp} 跑空补偿` : `跑腿人申诉「描述与实际不符」成立：发单人信用 -5，跑腿人获得 ¥${comp} 补偿，不扣跑腿人信用`
      return toast({ ...upd(a.id, (t) => log({ ...t, status: 'cancelled', posterCredit }, text)), accounts: { ...s.accounts, poster, runner } }, text, 'bad')
    }
    case 'accept':
      return toast(upd(a.id, (t) => log({ ...t, status: 'ongoing', runnerId: 'runner', acceptedAt: now() }, `${s.accounts.runner.name}接单，联系方式与取件码已对其可见`)), '接单成功，取件码、电话、宿舍号已解锁')
    case 'pick':
      return toast(upd(a.id, (t) => log({ ...t, picked: true }, '跑腿人已取到物品，正在送达')), '已取到，出发送达。到了让发单人报送达码')
    case 'abandon': {
      const r = s.accounts.runner
      const runner = credit(r, -5, `接单后放弃「${task.title}」`)
      return toast({ ...upd(a.id, (t) => log({ ...t, status: 'open', runnerId: null, picked: false }, '跑腿人放弃订单，重新开放接单')), accounts: { ...s.accounts, runner } }, `已放弃，信用 -5（当前 ${runner.credit}）`, 'bad')
    }
    case 'deliver':
      return toast(upd(a.id, (t) => log({ ...t, status: 'delivered', proof: a.proof, late: !!a.late || Date.now() > t.deadline }, a.proof.kind === 'code' ? '送达码核验通过，等待发单人确认' : '已上传送达照片，等待发单人确认')), '已提交送达凭证，等发单人确认后放款')
    case 'confirm': {
      let { poster, runner } = s.accounts
      const before = runner.credit
      if (task.posterId === 'poster') poster = a.auto ? credit({ ...poster, frozen: poster.frozen - task.reward }, -2, `超时未确认「${task.title}」，系统自动放款`) : credit({ ...poster, frozen: poster.frozen - task.reward }, +1, `按时确认收货「${task.title}」`)
      runner = money({ ...runner, done: runner.done + 1 }, task.reward, `「${task.title}」赏金到账`)
      runner = task.late ? credit(runner, -3, `超时送达「${task.title}」`) : credit(runner, +2, `按时完成「${task.title}」`)
      const lm = levelMsg(before, runner.credit)
      let ns = { ...upd(a.id, (t) => log({ ...t, status: 'completed', completedAt: now(), posterCredit: a.auto && t.posterId !== 'poster' ? Math.max(0, t.posterCredit - 2) : t.posterCredit }, a.auto ? '发单人 2 小时未确认，系统自动放款，发单人信用 -2' : `${a.simulated ? '发单人（模拟）' : '发单人'}确认送达，托管赏金已放给跑腿人`)), accounts: { ...s.accounts, poster, runner } }
      ns = toast(ns, a.auto ? `超时未确认，系统自动放款；发单人信用 -2，跑腿人 ${task.late ? '-3' : '+2'}` : `已确认送达，¥${task.reward} 放款给${runner.name}；跑腿人信用 ${task.late ? '-3' : '+2'}`, task.late || a.auto ? 'bad' : 'ok')
      return lm ? toast(ns, lm) : ns
    }
    case 'rate': {
      let { poster, runner } = s.accounts
      const delta = a.stars >= 4 ? 1 : a.stars <= 2 ? -4 : 0
      const before = runner.credit
      if (a.by === 'poster') {
        runner = { ...runner, ratings: [...runner.ratings, a.stars] }
        if (delta) runner = credit(runner, delta, a.stars >= 4 ? `「${task.title}」收到 ${a.stars} 星好评` : `「${task.title}」收到 ${a.stars} 星差评`)
      } else if (task.posterId === 'poster') {
        poster = { ...poster, ratings: [...poster.ratings, a.stars] }
        if (delta) poster = credit(poster, delta, a.stars >= 4 ? `「${task.title}」收到 ${a.stars} 星好评` : `「${task.title}」收到 ${a.stars} 星差评`)
      }
      const field = a.by === 'poster' ? 'ratingByPoster' : 'ratingByRunner'
      const pc = a.by === 'runner' && task.posterId !== 'poster' ? Math.max(0, Math.min(100, task.posterCredit + delta)) : task.posterCredit
      let ns = { ...upd(a.id, (t) => log({ ...t, posterCredit: pc, [field]: { stars: a.stars, tags: a.tags } }, `${a.by === 'poster' ? '发单人' : '跑腿人'}评价 ${a.stars} 星`)), accounts: { ...s.accounts, poster, runner } }
      const who = a.by === 'poster' ? '跑腿人' : '发单人'
      ns = toast(ns, delta ? `评价已提交，${who}信用 ${delta > 0 ? '+' : ''}${delta}` : '评价已提交（3 星不影响信用）', delta < 0 ? 'bad' : 'ok')
      const lm = a.by === 'poster' ? levelMsg(before, runner.credit) : null
      return lm ? toast(ns, lm) : ns
    }
    case 'dispute':
      return toast(upd(a.id, (t) => log({ ...t, status: 'disputed', dispute: { reason: a.reason, at: now() } }, `发单人发起申诉：${a.reason}。赏金继续冻结`)), '申诉已提交，赏金继续冻结，等待平台核实', 'bad')
    case 'resolve': {
      let { poster, runner } = s.accounts
      if (a.winner === 'poster') {
        if (task.posterId === 'poster') poster = money({ ...poster, frozen: poster.frozen - task.reward }, task.reward, `申诉成立，「${task.title}」赏金退回`)
        runner = credit(runner, -8, `申诉被判责任方「${task.title}」`)
        return toast({ ...upd(a.id, (t) => log({ ...t, status: 'refunded' }, '平台判定申诉成立：赏金退回发单人，跑腿人信用 -8')), accounts: { ...s.accounts, poster, runner } }, '申诉成立：赏金退回，跑腿人信用 -8', 'bad')
      }
      if (task.posterId === 'poster') poster = credit({ ...poster, frozen: poster.frozen - task.reward }, -5, `恶意申诉被驳回「${task.title}」`)
      runner = money({ ...runner, done: runner.done + 1 }, task.reward, `「${task.title}」申诉驳回，赏金到账`)
      // 申诉驳回等同正常确认：按时 +2，超时 -3
      runner = task.late ? credit(runner, -3, `超时送达「${task.title}」`) : credit(runner, +2, `按时完成「${task.title}」`)
      return toast({ ...upd(a.id, (t) => log({ ...t, status: 'completed', completedAt: now() }, `平台判定申诉不成立：赏金放给跑腿人，跑腿人信用 ${task.late ? '-3（超时）' : '+2'}，发单人信用 -5`)), accounts: { ...s.accounts, poster, runner } }, `申诉驳回：发单人信用 -5，跑腿人 ${task.late ? '-3（超时）' : '+2'}`)
    }
    default:
      return s
  }
}

export function StoreProvider({ children }) {
  const [init] = useState(load)
  const [state, dispatch] = useReducer(reducer, init.state)
  useEffect(() => {
    try {
      const { toasts, ...rest } = state
      localStorage.setItem(KEY, JSON.stringify(rest))
    } catch {}
  }, [state])
  const act = useCallback((type, payload = {}) => dispatch({ type, ...payload }), [])
  return <Ctx.Provider value={{ state, act, loadError: init.error }}>{children}</Ctx.Provider>
}

export const useStore = () => useContext(Ctx)
export const useMe = () => {
  const { state } = useStore()
  return state.accounts[state.role === 'poster' ? 'poster' : 'runner']
}
