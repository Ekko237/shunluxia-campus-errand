import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence, animate, useMotionValue, useTransform, useReducedMotion } from 'motion/react'
import { CaretRight, ArrowRight, ArrowCounterClockwise, ListBullets, Database, DownloadSimple, Check, Translate } from '@phosphor-icons/react'
import LangSwitch from '../LangSwitch'
import { EN, tr } from '../i18n'
import { routeCardBlob } from './routeCard'
import { useStore, useMe } from '../store'
import { HomeLink } from './ViewMode'
import { levelOf, nextLevel, iconUrl, posterTierOf, posterNextTier, B, detourMin, onMyWay, myRoute } from '../data'
import { Avatar, VerifiedBadge, Panel, Btn, Empty, ago, gi } from '../ui'
const Path = gi('path')
const Wallet = gi('coins')

function CountUp({ value, from = value }) {
  const reduce = useReducedMotion()
  const mv = useMotionValue(reduce ? value : from)
  const out = useTransform(mv, (v) => Math.round(v))
  useEffect(() => {
    if (reduce) { mv.set(value); return }
    const c = animate(mv, value, { duration: from !== value ? 1.4 : 0.9, delay: from !== value ? 0.3 : 0, ease: [0.16, 1, 0.3, 1] })
    return () => c.stop()
  }, [value, reduce, mv])
  return <motion.span>{out}</motion.span>
}

// 留存钩子：下课前提醒路上的单（原型只记住开关，不真的发通知）；打开后预览一条推送长什么样
// 下课提醒开着没有：收尾卡上的大开关和下面「下课前 5 分钟提醒我」是同一个，任何一处一改另一处跟着变
function useRemind() {
  const read = () => { try { return localStorage.getItem('shunluxia:remind') === '1' } catch { return false } }
  const [on, setOn] = useState(read)
  useEffect(() => { const f = () => setOn(read()); window.addEventListener('shunluxia:remind', f); return () => window.removeEventListener('shunluxia:remind', f) }, [])
  const set = (v) => { try { localStorage.setItem('shunluxia:remind', v ? '1' : '0') } catch { /* 存不了不影响 */ } setOn(v); window.dispatchEvent(new Event('shunluxia:remind')) }
  return [on, set]
}

// 我常走的路上此刻有哪些顺路的单（多走 5 分钟以内），按多走的分钟数排
function useNear() {
  const { state } = useStore()
  const r = myRoute()
  const name = (id) => B[id]?.name.replace(/（.*?）|\s*\(.*?\)/, '')
  const open = state.tasks.filter((t) => t.status === 'open' && t.deadline > Date.now() && t.posterId !== 'runner')
  const near = open.map((t) => ({ t, m: detourMin(r.from, r.to, t) })).filter((x) => x.m <= 5).sort((a, b) => a.m - b.m)
  return { r, name, near }
}
const ring = () => window.dispatchEvent(new Event('shunluxia:ring'))

// 「模拟下课」：从屏幕顶上真的掉下来一条推送，点它就以跑腿人身份进大厅看这条路上的单
function RingPush() {
  const { act } = useStore()
  const nav = useNavigate()
  const reduce = useReducedMotion()
  const { r, name, near } = useNear()
  const [on, setOn] = useState(false)
  useEffect(() => { const f = () => setOn(true); window.addEventListener('shunluxia:ring', f); return () => window.removeEventListener('shunluxia:ring', f) }, [])
  useEffect(() => { if (!on) return; const id = setTimeout(() => setOn(false), 5000); return () => clearTimeout(id) }, [on])
  const goRoute = () => { setOn(false); act('role', { role: 'runner' }); nav('/app') }
  return createPortal(
    <AnimatePresence>
      {on && (
        <motion.button key="push" onClick={goRoute} initial={reduce ? false : { y: -120, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -120, opacity: 0 }} transition={{ type: 'spring', stiffness: 380, damping: 30 }}
          className="fixed inset-x-3 top-[72px] z-[60] mx-auto flex max-w-md gap-3 rounded-[20px] bg-surface/95 p-3 text-left shadow-[0_20px_40px_-16px_rgba(17,40,30,0.55)] ring-1 ring-line backdrop-blur-md">
          <img src={`${import.meta.env.BASE_URL}brand/logo-v2.png`} width={36} height={36} alt="" className="size-9 shrink-0 rounded-[10px]" />
          <span className="min-w-0 flex-1 text-sm">
            <span className="flex justify-between gap-2 font-semibold"><span>{tr('顺路侠 · 顺路提醒', 'Shunluxia · On-your-way alert')}</span><span className="font-normal text-muted">17:45</span></span>
            <span className="mt-0.5 block leading-snug">{EN ? (near.length ? <>{name(r.from)} → {name(r.to)} has <b className="text-accent">{near.length} {near.length === 1 ? 'order' : 'orders'}</b> on your way. Tap to take a look</> : <>No orders on your way from {name(r.from)} to {name(r.to)} right now</>) : (near.length ? <>{name(r.from)} → {name(r.to)} 上有 <b className="text-accent">{near.length} 单</b>顺路，<span className="whitespace-nowrap">点开看看</span></> : <>{name(r.from)} → {name(r.to)} 上暂时没有顺路的单</>)}</span>
          </span>
        </motion.button>
      )}
    </AnimatePresence>,
    document.body,
  )
}

function RemindToggle() {
  const reduce = useReducedMotion()
  const [on, setRemind] = useRemind()
  const flip = () => setRemind(!on)
  const { r, name, near } = useNear()
  return (
    <div className="border-t border-line">
      <button onClick={flip} role="switch" aria-checked={on} aria-label={tr('下课前 5 分钟提醒我路上的单', 'Remind me 5 min before class ends')} className="flex w-full items-center gap-3 px-4 py-3 text-left">
        <span className="min-w-0 flex-1">
          <span className="block text-[15px] font-semibold">{tr('下课前 5 分钟提醒我路上的单', 'Remind me 5 min before class ends')}</span>
          <span className="block text-sm text-muted">{on ? tr('已开启：每天下课前 5 分钟，把这条路上的单推给你', "On: 5 min before class ends each day, we'll send you orders on this route") : tr('按你常走的路和下课时间提醒，不用自己翻大厅', 'Based on your usual route and class times, so you never have to check the board')}</span>
        </span>
        <span className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${on ? 'bg-accent' : 'bg-sunken ring-1 ring-line'}`}>
          <span className={`absolute left-1 top-1 size-5 rounded-full bg-surface shadow transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${on ? 'translate-x-5' : ''}`} />
        </span>
      </button>
      <AnimatePresence initial={false}>
        {on && (
          <motion.div initial={reduce ? false : { opacity: 0, y: -8, height: 0 }} animate={{ opacity: 1, y: 0, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.25 }} className="overflow-hidden px-4">
            <p className="flex items-center justify-between text-xs font-semibold text-muted">{tr('下课时你会收到', "After class you'll get")}<button onClick={ring} className="h-8 rounded-full bg-accent-soft px-3 text-[13px] font-semibold text-accent active:scale-[0.97]">{tr('预览 17:45 的提醒', 'Preview the 17:45 alert')}</button></p>
            <div className="mb-4 mt-1.5 flex gap-3 rounded-2xl bg-bg p-3 shadow-[0_10px_24px_-16px_rgba(17,40,30,0.5)] ring-1 ring-line">
              <img src={`${import.meta.env.BASE_URL}brand/logo-v2.png`} width={36} height={36} alt="" className="size-9 shrink-0 rounded-lg" />
              <div className="min-w-0 text-sm">
                <p className="flex justify-between gap-2 font-semibold"><span>{tr('顺路侠', 'Shunluxia')}</span><span className="tnum font-normal text-muted">17:45</span></p>
                <p className="mt-0.5 leading-snug">{EN ? (near.length ? <>{name(r.from)} → {name(r.to)} has <b className="text-accent">{near.length} {near.length === 1 ? 'order' : 'orders'}</b> on your way. The closest is at {name(near[0].t.from)}, a {near[0].m} min detour</> : <>No orders on {name(r.from)} → {name(r.to)} yet. We'll tell you as soon as one shows up</>) : (near.length ? <>{name(r.from)} → {name(r.to)} 上有 <b className="text-accent">{near.length} 单</b>顺路，最近的在{name(near[0].t.from)}，捎上多走 {near[0].m} 分钟</> : <>{name(r.from)} → {name(r.to)} 上暂时没有顺路的单，有了第一时间告诉你</>)}</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default function Me() {
  const { state, act } = useStore()
  const me = useMe()
  const nav = useNavigate()
  const reduce = useReducedMotion()
  const isPoster = me.id === 'poster'
  const posted = state.tasks.filter((t) => t.posterId === 'poster').length + me.ledger.filter((l) => l.sample && l.label.startsWith(tr('发布', 'Posted'))).length
  const good = me.ratings.filter((r) => r >= 4).length
  const rate = me.ratings.length ? Math.round((good / me.ratings.length) * 100) + '%' : tr('暂无', 'None yet')
  // 刚发生的信用变化：进「我的」页时从旧分数滚到新分数，跨档就弹出升级。
  // 导览刚走完时算整单（从发布到互评，首页写的 70 → 73 就是这一单的合计），平时只算 10 秒内的
  const [recent] = useState(() => {
    if (me.credit == null) return null
    const tourTask = state.tour.done && state.tasks.find((x) => x.id === state.tour.taskId)
    const since = tourTask ? tourTask.createdAt : Date.now() - 10000
    const fresh = me.creditLog.filter((l) => l.at >= since)
    const delta = fresh.reduce((a, l) => a + l.delta, 0)
    return delta ? { from: me.credit - delta, delta } : null
  })
  const tierOf = (c) => (me.id === 'poster' ? posterTierOf(c) : levelOf(c))
  const leveled = recent && tierOf(recent.from).name !== tierOf(me.credit).name && recent.delta > 0
  const lv = me.credit != null ? (me.id === 'poster' ? posterTierOf(me.credit) : levelOf(me.credit)) : null
  const nx = me.credit != null ? (me.id === 'poster' ? posterNextTier(me.credit) : nextLevel(me.credit)) : null
  const badges = [
    { img: 'trust-verify', alt: tr('带对勾的学生证', 'A student ID with a check mark'), name: tr('校园认证', 'Verified student'), on: me.verified },
    { img: 'badge-first', alt: tr('插在包裹旁的小旗', 'A small flag next to a parcel'), name: tr('首单完成', 'First order'), on: isPoster ? state.tasks.some((t) => t.posterId === 'poster' && t.status === 'completed') : me.done >= 1 },
    { img: 'badge-praise', alt: tr('带星星的点赞徽章', 'A thumbs-up badge with a star'), name: tr('好评 3 次', '3 good ratings'), on: good >= 3 },
    // 发单人和跑腿人的信用档位名称、门槛不一样：各用各的
    { img: 'level-reliable', alt: tr('带对勾的绿色盾牌', 'A green shield with a check mark'), name: isPoster ? tr('信用良好', 'Good credit') : tr('信用可靠', 'Reliable'), on: (me.credit ?? 0) >= (isPoster ? 75 : 72) },
    { img: 'level-gold', alt: tr('带皇冠的金牌', 'A gold medal with a crown'), name: isPoster ? tr('信用优质', 'Top credit') : tr('金牌信用', 'Gold credit'), on: (me.credit ?? 0) >= 85 },
  ]
  // 导览刚走完：顶上放一张收尾卡，告诉他这一单里钱、码、分都走了一遍，下一步去哪
  const [wrap, setWrap] = useState(() => { try { return state.tour.done && !sessionStorage.getItem('shunluxia:wrap-seen') } catch { return false } })
  const closeWrap = () => { setWrap(false); try { sessionStorage.setItem('shunluxia:wrap-seen', '1') } catch { /* 无痕模式 */ } }
  const [remindOn, setRemind] = useRemind()
  const gap = nx && me.credit != null ? nx.min - me.credit : 0
  // 今日顺路卡：收尾卡一出来就把这一单的路线、信用变化和钱画成一张图，缩略图直接摆在卡里，点一下存到这台设备上
  const tourTask = state.tasks.find((x) => x.id === state.tour.taskId)
  const [cardUrl, setCardUrl] = useState(null)
  useEffect(() => {
    if (!wrap || !tourTask || !recent) return
    let url = null
    const nm = (id) => B[id]?.name.replace(/（.*?）|\s*\(.*?\)/, '')
    routeCardBlob({ route: myRoute(), task: tourTask, credit: { from: recent.from, to: me.credit, delta: recent.delta }, fromName: nm(tourTask.from), toName: nm(tourTask.to), who: me.name })
      .then((b) => { url = URL.createObjectURL(b); setCardUrl(url) })
    return () => { if (url) URL.revokeObjectURL(url) }
  }, [wrap]) // eslint-disable-line react-hooks/exhaustive-deps
  const [saved, setSaved] = useState(false)
  const [hop, setHop] = useState(0)
  useEffect(() => { if (!saved) return; const id = setTimeout(() => setSaved(false), 4000); return () => clearTimeout(id) }, [saved])
  const saveCard = () => {
    const a = document.createElement('a')
    const d = new Date()
    a.href = cardUrl
    a.download = `${tr('顺路卡', 'route-card')}-${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}.png`
    a.click()
    setSaved(true)
  }
  return (
    <div className="space-y-5">
      <RingPush />
      <AnimatePresence initial={false}>
        {wrap && (
          <motion.div initial={reduce ? false : { opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, height: 0 }} transition={{ type: 'spring', stiffness: 380, damping: 30 }}
            className="relative overflow-hidden rounded-[24px] bg-accent-deep p-5 text-on-accent md:p-6">
            {/* 走完一单：黏土阿远站在卡片右上，整单的信用变化写成大数字，下一次回来的理由就在眼前 */}
            {/* 打开提醒的那一下，阿远原地蹦一下 */}
            <motion.img key={hop} src={`${import.meta.env.BASE_URL}brand/runner-v1.webp`} width={169} height={240} alt="" aria-hidden="true" className="pointer-events-none absolute right-3 top-4 h-32 w-auto max-w-none drop-shadow-[0_14px_12px_rgba(0,0,0,0.3)] md:h-36"
              animate={hop && !reduce ? { y: [0, -16, 0], rotate: [0, -4, 0] } : undefined} transition={{ duration: 0.5, ease: 'easeOut' }} />
            <p className="text-[15px] font-semibold opacity-80">{tr('一单走完了', 'Order complete')}</p>
            {recent && (
              <p className="mt-1 flex flex-wrap items-baseline gap-x-3 pr-24">
                <span className="font-display text-[64px] leading-none text-accent-glow">{recent.delta > 0 ? '+' : ''}{recent.delta}</span>
                <span className="tnum text-[16px] font-semibold">{EN ? `${me.name}'s credit` : `${me.name}的信用`} {recent.from} → {me.credit}</span>
              </p>
            )}
            {nx && gap > 0 && <p className="tnum mt-2 pr-24 text-[15px] opacity-90">{EN ? `${gap} ${gap === 1 ? 'point' : 'points'} to ${nx.name}, about ${Math.ceil(gap / 3)} more ${Math.ceil(gap / 3) === 1 ? 'order' : 'orders'} on your way` : <>离「{nx.name}」还差 {gap} 分，大约再顺路 {Math.ceil(gap / 3)} 单</>}</p>}
            <button onClick={() => { const v = !remindOn; setRemind(v); if (v) { setHop((h) => h + 1); setTimeout(ring, 350) } }} role="switch" aria-checked={remindOn} className="mt-4 flex w-full items-center gap-3 rounded-2xl bg-on-accent/12 px-4 py-3 text-left md:max-w-[26rem]">
              <span className="min-w-0 flex-1">
                <span className="block text-[16px] font-bold">{tr('明天 17:45 提醒我这条路上的单', 'Remind me at 17:45 tomorrow')}</span>
                <span role="status" className="block text-[14px] opacity-80">{remindOn ? tr('已开启：明天 17:45 把这条路上的单推给你', "On: at 17:45 tomorrow we'll send you orders on this route") : tr('按你常走的路，下课前 5 分钟推给你', 'Based on your usual route, 5 min before class ends')}</span>
              </span>
              <span className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${remindOn ? 'bg-accent-glow' : 'bg-on-accent/25'}`}>
                <span className={`absolute left-1 top-1 size-5 rounded-full bg-surface shadow transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${remindOn ? 'translate-x-5' : ''}`} />
              </span>
            </button>
            {cardUrl && (
              <button onClick={saveCard} className="mt-3 flex w-full items-center gap-3 rounded-2xl bg-on-accent/12 p-2 pr-4 text-left md:max-w-[26rem]">
                <img src={cardUrl} width={1080} height={1350} alt={tr('今日顺路卡：这一单在校园地图上的路线、信用变化和赏金', "Today's route card: this order's route on the campus map, the credit change and the reward")} className="h-20 w-16 shrink-0 rounded-lg object-cover ring-1 ring-on-accent/25" />
                <span className="min-w-0 flex-1">
                  <span className="block text-[16px] font-bold">{tr('今日顺路卡', "Today's route card")}</span>
                  <span className="block text-[14px] opacity-80">{EN ? `Your route, credit ${recent.delta > 0 ? '+' : ''}${recent.delta} and ¥${tourTask.reward} in one image. Save it and share it with friends` : <>路线、信用 {recent.delta > 0 ? '+' : ''}{recent.delta} 和 ¥{tourTask.reward} 画成一张图，存下来发给同学</>}</span>
                </span>
                <DownloadSimple size={20} weight="bold" className="shrink-0" />
              </button>
            )}
            <p className="mt-3 text-[14px] leading-relaxed opacity-80">{tr('赏金托管到放款、取件码用完收起、两边互评改了信用分，全程都在这台设备上。', 'The reward sat in escrow until release, the pickup code hid itself after use, and rating each other updated both credit scores. All of it ran on this device.')}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <HomeLink onClick={closeWrap} className="inline-flex h-10 items-center rounded-full bg-on-accent px-4 text-[15px] font-semibold text-accent-deep">{tr('回到产品介绍', 'Back to the overview')}</HomeLink>
              <button onClick={() => { closeWrap(); act('tour', { tour: { active: true, taskId: null, done: false } }); act('role', { role: 'poster' }); nav('/app/publish?tour=1') }} className="inline-flex h-10 items-center rounded-full bg-on-accent/15 px-4 text-[15px] font-semibold">{tr('再走一遍', 'Go again')}</button>
              <button onClick={closeWrap} className="ml-auto inline-flex h-10 items-center px-2 text-[15px] font-semibold opacity-80">{tr('知道了', 'Got it')}</button>
            </div>
            {/* 存好了说一声：图在这台设备的下载文件夹里 */}
            <p role="status" className="mt-3 flex min-h-5 items-center gap-1.5 text-[14px] font-semibold text-accent-glow">{saved && <><Check size={16} weight="bold" />{tr('顺路卡已存到这台设备的下载文件夹', 'Route card saved to your Downloads folder')}</>}</p>
          </motion.div>
        )}
      </AnimatePresence>
      <div className="flex items-center gap-4">
        <Avatar who={me.id} name={me.name} size={64} />
        <div className="min-w-0">
          <p className="text-sm text-muted">{EN ? `${isPoster ? 'Requester' : 'Runner'} account` : `${me.role}账号`}</p>
          <p className="text-2xl font-bold">{me.name}</p>
          <div className="mt-1">{me.verified ? <VerifiedBadge /> : <span className="rounded-full bg-sunken px-2.5 py-1 text-sm font-medium text-muted">{tr('未认证，只能浏览', 'Not verified, browse only')}</span>}</div>
        </div>
      </div>

      {me.verified ? (
        <Link to="/app/credit" className="block rounded-2xl bg-accent-soft p-5">
          <div className="flex items-end justify-between">
            <div>
              <p className="whitespace-nowrap text-[15px] font-semibold">{me.id === 'poster' ? tr('发单人信用', 'Requester credit') : tr('跑腿人信用', 'Runner credit')}</p>
              <p className="tnum flex items-start gap-2 text-6xl font-bold leading-none tracking-tight text-accent"><CountUp value={me.credit} from={recent?.from} />
                {recent && <motion.span initial={reduce ? false : { opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4, type: 'spring', stiffness: 400, damping: 22 }}
                  className={`tnum mt-1 rounded-full px-2 py-0.5 text-base font-bold tracking-normal ${recent.delta > 0 ? 'bg-surface text-accent' : 'bg-danger-soft text-danger'}`}>{recent.delta > 0 ? '+' : ''}{recent.delta}</motion.span>}</p>
            </div>
            <div className="flex shrink-0 flex-col items-end text-right">
              <motion.img key={lv.name} src={iconUrl(lv.badge)} width={48} height={48} alt={lv.alt} className="mb-1 size-12 object-contain"
                initial={leveled && !reduce ? { scale: 0.3, rotate: -25, opacity: 0 } : false} animate={{ scale: 1, rotate: 0, opacity: 1 }} transition={{ type: 'spring', stiffness: 380, damping: 12, delay: 1.5 }} />
              <p className="whitespace-nowrap text-xl font-bold">{EN ? lv.name : <>「{lv.name}」</>}</p>
            </div>
          </div>
          {leveled && (
            <motion.p initial={reduce ? false : { opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: 'spring', stiffness: 420, damping: 20, delay: 1.6 }}
              className="mt-3 inline-flex rounded-full bg-accent px-3 py-1 text-sm font-bold text-on-accent">{EN ? `Leveled up to ${lv.name}` : <>升级到「{lv.name}」</>}</motion.p>
          )}
          <p className="mt-2 text-sm text-muted">{lv.desc}</p>
          {nx && (() => { const f = Math.max(6, ((me.credit - lv.min) / (nx.min - lv.min)) * 100); return (
            <div className="relative mt-4 h-5"><span className="tnum absolute bottom-0 whitespace-nowrap text-xs font-bold text-accent" style={{ left: `${f}%`, transform: `translateX(-${Math.min(100, Math.max(0, f))}%)` }}>{tr('现在', 'Now')} {me.credit}</span></div>
          ) })()}
          <div className={`${nx ? 'mt-1' : 'mt-4'} h-2 overflow-hidden rounded-full bg-surface`} role="progressbar" aria-label={tr('距下一等级', 'Progress to next level')} aria-valuemin={lv.min} aria-valuemax={nx ? nx.min : 100} aria-valuenow={me.credit}>
            <motion.div className="relative h-full rounded-full bg-accent" initial={reduce ? false : { width: 0 }} animate={{ width: `${nx ? Math.max(6, ((me.credit - lv.min) / (nx.min - lv.min)) * 100) : 100}%` }} transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }} />
          </div>
          {/* 进度条两头标上这一级和下一级的起点，读得出「73 在 72 到 85 之间」 */}
          {nx && (
            <div className="tnum relative mt-1.5 h-4 text-xs font-semibold text-muted">
              <span className="absolute left-0">{EN ? `${lv.min} ${lv.name}` : <>{lv.min}「{lv.name}」</>}</span>
              <span className="absolute right-0">{EN ? `${nx.min} ${nx.name}` : <>{nx.min}「{nx.name}」</>}</span>
            </div>
          )}
          <p className="mt-3 flex items-center justify-between gap-3 text-[15px]">
            <span>{nx ? tr(`再 +${nx.min - me.credit} 分升到「${nx.name}」，${nx.desc}`, `+${nx.min - me.credit} more to reach ${nx.name}: ${nx.desc}`) : tr('已是最高等级', 'You are at the top level')}</span>
            <ArrowRight size={18} className="shrink-0 text-accent" />
          </p>
        </Link>
      ) : (
        <Panel className="p-5">
          <p className="text-lg font-semibold">{tr('完成校园认证，开始接单', 'Get verified to start taking orders')}</p>
          <p className="mt-1 text-[15px] text-muted">{tr('认证后获得初始信用 70 分和认证徽章。', "You'll start with a credit score of 70 and a Verified student badge.")}</p>
          <Btn className="mt-4" onClick={() => nav('/app/verify')}>{tr('去认证', 'Get verified')}</Btn>
        </Panel>
      )}

      {!isPoster && me.verified && (() => {
        let route = { from: 'jiao1', to: 'mei5' }
        try { const r = JSON.parse(localStorage.getItem('shunluxia:myroute')); if (B[r?.from] && B[r?.to]) route = r } catch { /* 用默认路线 */ }
        const open = state.tasks.filter((t) => t.status === 'open' && t.posterId !== 'poster' && t.deadline > Date.now())
        const hits = open.map((t) => detourMin(route.from, route.to, t)).filter((m) => m <= 5)
        return (
          <div className="rounded-2xl bg-surface ring-1 ring-line">
          <Link to="/app" className="flex items-center gap-3 p-4 transition active:scale-[0.99]">
            <span className="grid size-11 shrink-0 place-items-center rounded-full bg-accent-soft text-accent"><Path size={22} weight="bold" /></span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm text-muted">{tr('我常走的路', 'My usual route')}{(() => { const n = state.tasks.filter((t) => t.runnerId === 'runner' && t.status === 'completed' && Date.now() - (t.completedAt || 0) < 7 * 864e5 && onMyWay(t)).length; return n ? tr(` · 本周顺路 ${n} 次`, ` · ${n} on the way this week`) : '' })()}</span>
              <span className="block text-[15px] font-semibold leading-snug"><span className={EN ? '' : 'whitespace-nowrap'}>{B[route.from].name.replace(/（.*?）|\s*\(.*?\)/, '')}</span> → <span className={EN ? '' : 'whitespace-nowrap'}>{B[route.to].name.replace(/（.*?）|\s*\(.*?\)/, '')}</span></span>
            </span>
            <span className="shrink-0 text-right">
              <span className="tnum block text-xl font-bold text-accent">{EN ? hits.length : <>{hits.length} 单</>}</span>
              <span className="block text-xs text-muted">{tr('此刻顺路', 'on your way')}</span>
            </span>
            <CaretRight size={16} weight="bold" className="shrink-0 text-muted" />
          </Link>
          <RemindToggle />
          </div>
        )
      })()}

      <dl className="grid grid-cols-3 divide-x divide-line rounded-2xl bg-surface py-4 ring-1 ring-line">
        {[[isPoster ? tr('发布单数', 'Orders posted') : tr('完成单数', 'Orders done'), isPoster ? posted : me.done], [tr('好评率', 'Good ratings'), rate], [!isPoster ? tr('累计收入', 'Total earned') : tr('托管中', 'In escrow'), !isPoster ? `¥${me.ledger.filter((l) => l.amount > 0).reduce((a, l) => a + l.amount, 0)}` : `¥${me.frozen}`, true]].map(([k, v, wallet]) => (
          wallet ? (
            <Link key={k} to="/app/wallet" className="group text-center transition active:scale-[0.97]">
              <dd className="tnum text-2xl font-bold">{v}</dd>
              <dt className="mt-0.5 inline-flex items-center gap-0.5 text-sm text-accent">{k}<CaretRight size={12} weight="bold" className="transition-transform group-hover:translate-x-0.5" /></dt>
            </Link>
          ) : (
            <div key={k} className="text-center">
              <dd className="tnum text-2xl font-bold">{v}</dd>
              <dt className="mt-0.5 text-sm text-muted">{k}</dt>
            </div>
          )
        ))}
      </dl>

      <section>
        <h2 className="mb-3 flex items-baseline justify-between text-lg font-bold">{tr('徽章', 'Badges')}<span className="tnum text-sm font-semibold text-muted">{EN ? `${badges.filter((b) => b.on).length} / ${badges.length} earned` : <>已得 {badges.filter((b) => b.on).length} / {badges.length}</>}<span className="md:hidden">{tr('，左右滑动', ' · swipe')}</span></span></h2>
        <div className="no-scrollbar -mx-4 -my-1 flex gap-3 overflow-x-auto px-4 py-1 [mask-image:linear-gradient(to_right,black_85%,transparent)]">
          {[...badges].sort((a, b) => b.on - a.on).map((b) => (
            <div key={b.name} className={`flex w-24 shrink-0 flex-col items-center gap-2 rounded-2xl p-3 text-center ${b.on ? 'bg-accent-soft' : 'bg-sunken opacity-60'}`}>
              <img src={iconUrl(b.img)} width={44} height={44} alt={b.alt} className={`size-11 object-contain ${b.on ? '' : 'grayscale'}`} />
              <span className="text-sm font-semibold">{b.name}</span>
            </div>
          ))}
        </div>
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold">{!isPoster ? tr('收入流水', 'Income history') : tr('钱包流水', 'Wallet history')}</h2>
          <Link to="/app/wallet" className="-my-3 inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-accent">{tr('按月 / 按年查看', 'By month or year')}<CaretRight size={14} weight="bold" /></Link>
        </div>
        {me.ledger.length === 0 ? (
          <Panel><Empty img="empty-wallet" alt={tr('只有一枚硬币的钱包', 'A wallet with a single coin')} title={tr('还没有流水', 'No transactions yet')} hint={tr('完成第一单后，赏金会从托管放到这里。', 'After your first order, the reward moves from escrow to here.')} /></Panel>
        ) : (
          <Panel className="divide-y divide-line">
            {[...me.ledger].sort((a, b) => b.at - a.at).slice(0, 3).map((l, i) => (
              <div key={i} className="flex items-center gap-3 p-4">
                <div className="min-w-0 flex-1"><p className="text-[15px] font-medium">{l.label}</p><p className="text-sm text-muted">{ago(l.at)}</p></div>
                <span className={`tnum text-lg font-bold ${l.amount > 0 ? 'text-accent' : ''}`}>{l.amount > 0 ? '+' : '-'}¥{Math.abs(l.amount)}</span>
              </div>
            ))}
            <Link to="/app/wallet" className="flex items-center justify-between p-4 text-[15px] font-semibold text-accent">
              <span className="inline-flex items-center gap-1.5"><Wallet size={18} />{EN ? `All ${me.ledger.length} records · ¥${me.balance} available` : <>全部 {me.ledger.length} 条，可用 ¥{me.balance}</>}</span>
              <CaretRight size={16} weight="bold" />
            </Link>
          </Panel>
        )}
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold">{tr('信用记录', 'Credit history')}</h2>
          <Link to="/app/credit" className="-my-3 inline-flex min-h-11 items-center text-sm font-semibold text-accent">{tr('规则说明', 'How it works')}</Link>
        </div>
        {me.creditLog.length === 0 ? (
          <Panel><Empty img="empty-orders" alt={tr('空的写字板', 'An empty clipboard')} title={tr('还没有信用记录', 'No credit history yet')} hint={tr('认证后会有初始 70 分，之后每一单都会记在这里。', 'You start at 70 after verification, and every order is recorded here.')} /></Panel>
        ) : (
          <Panel className="divide-y divide-line">
            {me.creditLog.slice(0, 8).map((l, i) => (
              <div key={i} className="flex items-center gap-3 p-4">
                <div className="min-w-0 flex-1"><p className="text-[15px] font-medium">{l.label}</p><p className="text-sm text-muted">{ago(l.at)}</p></div>
                {l.delta !== 0 && <span className={`tnum text-lg font-bold ${l.delta > 0 ? 'text-accent' : 'text-danger'}`}>{l.delta > 0 ? '+' : ''}{l.delta}</span>}
              </div>
            ))}
          </Panel>
        )}
      </section>

      {!state.tour.active && (
        <Panel className="flex items-center gap-3 p-4">
          <p className="flex-1 text-[15px] text-muted">{EN ? `${state.tour.done ? 'Want to see a full order again?' : "Haven't tried the full flow yet?"} It takes about 2 minutes.` : <>{state.tour.done ? '想再看一遍一单怎么走完？' : '还没走过完整流程？'}约 2 分钟。</>}</p>
          <Btn size="sm" onClick={() => { act('tour', { tour: { active: true, taskId: null, done: false } }); act('role', { role: 'poster' }); nav('/app/publish?tour=1') }}>{tr('跟着走一遍', 'Show me around')}</Btn>
        </Panel>
      )}
      <Panel className="flex items-center gap-3 p-4">
        {/* 只是说明数据放在哪：用中性的数据图标，不用盾牌叹号（像安全警告） */}
        <Database size={22} className="shrink-0 text-muted" />
        <p className="flex-1 text-[15px] text-muted">{tr('演示数据存在本机浏览器，可随时恢复初始状态。', 'Demo data lives in this browser. You can reset it anytime.')}</p>
        <Btn size="sm" variant="ghost" onClick={() => { if (window.confirm(tr('把演示数据恢复成初始示例？你走过的订单和信用变化都会清掉。', 'Reset the demo data to the original sample? Your orders and credit changes will be cleared.'))) { act('reset'); nav('/app') } }}><ArrowCounterClockwise size={16} weight="bold" />{tr('重置', 'Reset')}</Btn>
      </Panel>
      {/* 手机版顶栏放不下语言切换，放在这里；电脑版顶栏已经有了 */}
      <Panel className="flex items-center gap-3 p-4 xl:hidden">
        <Translate size={22} className="shrink-0 text-muted" />
        <p className="flex-1 text-[15px] text-muted">{tr('界面语言', 'Language')}</p>
        <LangSwitch />
      </Panel>
      <HomeLink className="flex h-12 items-center justify-center gap-1 text-[15px] font-semibold text-muted hover:text-ink">{tr('回到产品介绍页', 'Back to the overview')}<ArrowRight size={14} weight="bold" /></HomeLink>
    </div>
  )
}
