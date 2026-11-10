import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import CampusMap from '../landing/CampusMap'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Minus, Plus, CaretDown } from '@phosphor-icons/react'
import { useStore } from '../store'
import { TYPES, TYPE_KEYS, BUILDINGS, B, WINDOWS, SIZES, suggestPrice, estimateMinutes, findBanned, nextId, code4, POSTER_LIMIT, detourMin, winNow } from '../data'
import { Btn, Panel, Field, Sheet, inputCls, gi } from '../ui'
import { ROUTES } from '../landing/RouteHero'
import { EN, tr } from '../i18n'
const Timer = gi('timer')
const LockKey = gi('lock')
const ProhibitInset = gi('ban')
const Lightning = gi('bolt')
const Wallet = gi('coins')

const groups = [...new Set(BUILDINGS.map((b) => b.group))]

// 英文模式下再拦一组英文说法（中文关键词照样拦）：代考、代签到、代上课、代写作业、作弊、烟酒违禁品、刷单
const P = '(?:me|him|her|them|us|my friend)'
const BANNED_EN = [
  /\b(?:take|sit|write|do)\s+(?:my|his|her|their|our)\s+(?:(?:online|final|midterm)\s+)?(?:exam|test|quiz|midterm|final)s?\b/gi,
  new RegExp(`\\b(?:exam|test|quiz|midterm|final)s?\\s+for\\s+${P}\\b`, 'gi'),
  new RegExp(`\\b(?:sign|check|clock|swipe)\\s+in\\s+for\\s+${P}\\b`, 'gi'),
  new RegExp(`\\b(?:roll\\s*call|attendance)\\s+for\\s+${P}\\b`, 'gi'),
  new RegExp(`\\b(?:attend|go\\s+to|sit\\s+in\\s+on|cover)\\s+(?:my\\s+|a\\s+|the\\s+)?(?:class|lecture|seminar)(?:es|s)?\\s+for\\s+${P}\\b`, 'gi'),
  /\battend\s+my\s+(?:class|lecture|seminar)(?:es|s)?\b/gi,
  new RegExp(`\\b(?:online\\s+(?:course|class)|mooc)(?:es|s)?\\s+for\\s+${P}\\b`, 'gi'),
  /\b(?:do|write|finish)\s+my\s+(?:homework|assignment|essay|paper|report|thesis|lab\s+report|online\s+course)s?\b/gi,
  /\b(?:exam|test|quiz)\s+answers?\b/gi,
  /\bcheat(?:ing)?\b/gi,
  /\b(?:cigarettes?|cigs?|tobacco|e-?cigarettes?|vapes?|alcohol|liquor|beers?|booze|baijiu)\b/gi,
  /\bfake\s+(?:orders?|reviews?)\b/gi,
  /\b(?:contraband|switchblades?)\b/gi,
]
const findBannedEn = (text) => [...new Set(BANNED_EN.flatMap((re) => (text.match(re) || []).map((w) => w.toLowerCase().replace(/\s+/g, ' '))))]
function BuildingSelect({ value, onChange, id }) {
  return (
    <div className="relative">
    <select id={id} value={value} onChange={(e) => onChange(e.target.value)} className={`${inputCls} appearance-none pr-10`}>
      {groups.map((g) => (
        <optgroup key={g} label={g}>
          {BUILDINGS.filter((b) => b.group === g).map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
        </optgroup>
      ))}
    </select>
    <CaretDown size={18} weight="bold" className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-muted" />
    </div>
  )
}

const defaultTitle = (f) => (EN ? {
  express: `${SIZES.find((s) => s.id === f.size)?.label} parcel from ${B[f.from]?.name}`,
  buy: `Grab something from ${B[f.from]?.name}`,
  seat: `Save a seat at ${B[f.from]?.name}`,
  food: `Bring takeout to ${B[f.to]?.name}`,
  other: 'A small favor on your way',
} : {
  express: `${B[f.from]?.name}取${SIZES.find((s) => s.id === f.size)?.label}快递`,
  buy: `${B[f.from]?.name}帮忙带东西`,
  seat: `${B[f.from]?.name}帮占一个座位`,
  food: `外卖帮忙送到${B[f.to]?.name}`,
  other: '顺路帮个小忙',
})[f.type]

const chip = (on) => `inline-flex h-11 items-center gap-1.5 whitespace-nowrap rounded-full px-4 text-[15px] font-semibold transition ${on ? 'bg-ink text-bg' : 'bg-surface text-ink ring-1 ring-line'}`

// 从落地页拦截演示带过来的那句备注（只用一次）
const draftNote = () => { try { const v = sessionStorage.getItem('shunluxia:draft-note') || ''; sessionStorage.removeItem('shunluxia:draft-note'); return v.slice(0, 80) } catch { return '' } }

export default function Publish() {
  const { state, act } = useStore()
  const nav = useNavigate()
  const [sp] = useSearchParams()
  // 导览里从底部「发布」标签进来也算：示例内容替他填好
  const tour = sp.get('tour') === '1' || (state.tour.active && !state.tour.taskId)
  const poster = state.accounts.poster
  const again = state.tasks.find((t) => t.id === sp.get('again') && t.posterId === 'poster')
  const [f, setF] = useState(() => again ? {
    type: again.type, from: again.from, to: again.to, size: again.size || 's', windowId: (WINDOWS.find((w) => w.min === again.windowMin) || WINDOWS[1]).id, urgent: !!again.urgent,
    title: again.title, note: again.note || '', room: again.private?.room || '', code: '', reward: again.reward,
  } : {
    type: 'express', from: 'cainiao', to: 'mei5', size: 's', windowId: 'w60', urgent: false,
    title: '', note: tour ? tr('一个小件，衣服', 'Small item, just clothes') : draftNote(), room: tour ? tr('梅园 5 号楼 412', 'Plum Court Bldg 5, Room 412') : '', code: tour ? '6-2-3108' : '', reward: null,
  })
  const usual = useMemo(() => {
    const n = {}
    for (const t of state.tasks) if (t.posterId === 'poster') n[t.to] = (n[t.to] || 0) + 1
    return Object.entries(n).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([id]) => id).filter((id) => B[id])
  }, [state.tasks])
  const [touched, setTouched] = useState(false)
  const [confirm, setConfirm] = useState(false)
  const set = (k) => (v) => setF((x) => ({ ...x, [k]: v }))

  const [sLo, sHi] = suggestPrice(f)
  const reward = f.reward ?? sLo
  const win = winNow(f.windowId)
  const [eLo, eHi] = estimateMinutes({ reward, suggested: sLo, urgent: f.urgent, windowMin: win.min })
  const title = f.title.trim() || defaultTitle(f)
  const banned = useMemo(() => (EN ? [...findBanned(title + f.note), ...findBannedEn(`${title} ${f.note}`)] : findBanned(title + f.note)), [title, f.note])
  // 英文里拦下的词用引号列出来
  const bannedEn = banned.map((w) => `"${w}"`).join(', ')

  const errors = {
    room: !f.room.trim() ? tr('请填写送达的宿舍号或具体位置，接单后才对跑腿人可见', 'Add a room number or exact spot. The runner only sees it after taking the order.') : null,
    code: f.type === 'express' && !f.code.trim() ? tr('代取快递需要填写取件码，接单后才对跑腿人可见', 'Parcel orders need a pickup code. The runner only sees it after taking the order.') : null,
    same: f.type !== 'seat' && f.from === f.to ? tr('取件地点和送达地点不能是同一栋楼', "Pickup and drop-off can't be the same building") : null,
    money: reward > poster.balance ? tr(`钱包余额 ¥${poster.balance} 不够托管 ¥${reward}`, `Your wallet has ¥${poster.balance}, not enough to hold ¥${reward} in escrow`) : poster.credit < POSTER_LIMIT.min && reward > POSTER_LIMIT.cap ? tr(`你的信用 ${poster.credit} 低于 ${POSTER_LIMIT.min}，单笔赏金上限 ¥${POSTER_LIMIT.cap}`, `Your credit is ${poster.credit}, below ${POSTER_LIMIT.min}, so the reward is capped at ¥${POSTER_LIMIT.cap}`) : null,
    banned: banned.length ? tr(`检测到违规内容「${banned.join('、')}」。平台不接代考、代签到、代写作业这类学术不端任务，也不接烟酒、违禁品和刷单`, `Not allowed: ${bannedEn}. No taking exams, signing in or doing homework for others, and no cigarettes, alcohol, contraband or fake orders.`) : null,
  }
  const blocking = Object.values(errors).some(Boolean)

  const [sideSlot, setSideSlot] = useState(null)
  useEffect(() => { const el = document.getElementById('desk-side-slot'); setSideSlot((p) => (p === el ? p : el)) })
  // 从落地页带着备注过来（?as=poster）：直接用发单人身份打开表单
  useEffect(() => { if (sp.get('as') === 'poster' && state.role !== 'poster') act('role', { role: 'poster' }) }, []) // eslint-disable-line react-hooks/exhaustive-deps
  if (state.role !== 'poster') {
    return (
      <Panel className="overflow-hidden text-center">
        <img src={`${import.meta.env.BASE_URL}icons/step-publish-v1.webp`} width={96} height={96} alt="" className="mx-auto mt-8 size-24 object-contain" />
        <div className="p-5 pt-3">
          <p className="text-lg font-semibold">{tr('发单要用发单人身份', 'Switch to Requester to post')}</p>
          <p className="mx-auto mt-1 max-w-[30ch] text-muted">{tr('你现在是跑腿人。切过去就能发一单：选类型、填取送地点、赏金先托管，大约 30 秒。', "You're the Runner right now. Switch over to post an order: pick a type, set pickup and drop-off, and the reward is held in escrow. Takes about 30 seconds.")}</p>
          <Btn className="mt-5" onClick={() => act('role', { role: 'poster' })}>{tr('切到发单人去发单', 'Switch to Requester')}</Btn>
        </div>
      </Panel>
    )
  }

  const submit = () => {
    setTouched(true)
    if (!blocking) return setConfirm(true)
    // 报错要在视线里：滚到第一条错误、轻轻抖一下，并把光标放进对应输入框
    setTimeout(() => {
      const el = document.querySelector('main [role=alert], [data-tour-root] [role=alert]')
      if (!el) return
      el.scrollIntoView({ block: 'center', behavior: 'smooth' })
      el.animate?.([{ transform: 'translateX(0)' }, { transform: 'translateX(-6px)' }, { transform: 'translateX(6px)' }, { transform: 'translateX(-3px)' }, { transform: 'translateX(0)' }], { duration: 320, delay: 250 })
      el.parentElement?.querySelector('input, textarea, select')?.focus({ preventScroll: true })
    }, 30)
  }
  const doPublish = () => {
    const id = nextId()
    act('publish', {
      task: {
        id, deliverCode: code4(), type: f.type, title, from: f.from, to: f.to, size: f.size, windowMin: win.min, urgent: f.urgent, reward, note: f.note.trim(),
        private: { code: f.type === 'express' ? f.code.trim() : null, room: f.room.trim(), phone: '170 0000 ' + code4() },
      },
    })
    nav(`/app/task/${id}`)
  }

  // 电脑版：右栏实时预览这一单发出去以后的样子，和它在谁的路上（sideSlot 在上面取，hook 不能放在提前返回后面）
  const preview = sideSlot && (() => {
    const passing = ROUTES.filter((r) => detourMin(r.from, r.to, f) <= 5)
    const R = passing[0] ? { from: passing[0].from, to: passing[0].to } : { from: f.from, to: f.to }
    const valid = B[R.from] && B[R.to] && R.from !== R.to
    const name = (id) => B[id]?.name.replace(EN ? /\s*\(.*?\)/ : /（.*?）/, '')
    return createPortal(
      <div className="space-y-3">
        <p className="text-sm font-semibold text-muted">{tr('发布以后，大厅里长这样', "How it'll look on the Order board")}</p>
        <Panel className="p-4">
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-sunken px-2.5 py-0.5 text-sm font-semibold">{TYPES[f.type]?.label}</span>
            {f.urgent && <span className="rounded-full bg-danger-soft px-2 py-0.5 text-xs font-bold text-danger">{tr('加急', 'Urgent')}</span>}
            <span className="tnum ml-auto text-2xl font-bold">¥{reward}</span>
          </div>
          <p className="mt-2 text-[17px] font-semibold">{title}</p>
          <p className="mt-1 text-sm text-muted">{f.from === f.to ? name(f.to) : `${name(f.from)} → ${name(f.to)}`}{f.room ? tr(' · 宿舍号接单后才给对方看', ' · Room shown after someone takes it') : ''}</p>
        </Panel>
        {valid && <CampusMap R={R} reduce pills={false} walker={false} compact hits={passing[0] ? [{ ...f, id: 'preview', reward }] : []} />}
        <p className="text-sm text-muted">{passing.length ? tr(`此刻有 ${passing.length} 条同学常走的路经过它，图上是「${passing[0].label}」`, `${passing.length} common ${passing.length === 1 ? 'route passes' : 'routes pass'} by it right now. The map shows "${passing[0].label}".`) : tr('还没有常走的路正好经过它，赏金高一点会更快有人接', 'No usual route passes by it yet. A higher reward gets it taken faster.')}</p>
      </div>,
      sideSlot,
    )
  })()
  return (
    <div className="space-y-5">
      {preview}
      <div>
        <h1 className="font-display text-[28px] leading-tight">{tr('发布跑腿任务', 'Post an order')}</h1>
        <p className="mt-1 text-[15px] text-muted">{again ? tr('已按上一单填好，取件码记得换成新的。', 'Filled in from your last order. Remember to update the pickup code.') : tr('选模板、选楼栋，赏金先冻结托管，送达确认后才放款。', 'Pick a type and buildings. The reward is held in escrow and released once delivery is confirmed.')}</p>
      </div>

      <Field label={tr('任务类型', 'Type')}>
        <div className="flex flex-wrap gap-2">
          {TYPE_KEYS.map((k) => {
            const T = TYPES[k]
            return <button key={k} type="button" onClick={() => setF((x) => ({ ...x, type: k, title: x.titleMine ? x.title : '', ...(k === 'seat' ? { size: 's', ...(x.from === 'cainiao' ? { from: 'lib', to: 'lib' } : {}) } : {}) }))} className={chip(f.type === k)} aria-pressed={f.type === k}><T.Icon size={18} weight="bold" />{T.label}</button>
          })}
        </div>
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={f.type === 'seat' ? tr('占座地点', 'Where to save it') : tr('取件 / 购买地点', 'Pickup / buy at')}><BuildingSelect value={f.from} onChange={(v) => setF((x) => ({ ...x, from: v, title: x.titleMine ? x.title : '' }))} /></Field>
        <Field label={tr('送达楼栋', 'Drop off at')} error={touched && errors.same}><BuildingSelect value={f.to} onChange={(v) => setF((x) => ({ ...x, to: v, title: x.titleMine ? x.title : '' }))} /></Field>
      </div>
      {usual.length > 0 && (
        <div className="-mt-2 flex flex-wrap items-center gap-2">
          <span className="text-sm text-muted">{tr('常送到', 'Usual spots')}</span>
          {usual.map((id) => (
            <button key={id} type="button" onClick={() => setF((x) => ({ ...x, to: id, title: x.titleMine ? x.title : '' }))} aria-pressed={f.to === id}
              className={`inline-flex h-9 items-center rounded-full px-3.5 text-sm font-semibold transition active:scale-[0.97] ${f.to === id ? 'bg-accent-soft text-accent' : 'bg-surface ring-1 ring-line'}`}>{B[id].name}</button>
          ))}
        </div>
      )}

      <Field label={tr('任务标题', 'Title')} hint={tr('已按模板自动生成，可以改', 'Auto-filled from the type. Feel free to edit.')}>
        <input className={inputCls} value={title} onChange={(e) => setF((x) => ({ ...x, title: e.target.value, titleMine: !!e.target.value.trim() }))} maxLength={EN ? 50 : 30} />
      </Field>

      {f.type !== 'seat' && (
        <Field label={tr('物品大小', 'Size')}>
          <div className="flex flex-wrap gap-2">
            {SIZES.map((s) => <button key={s.id} type="button" onClick={() => setF((x) => ({ ...x, size: s.id, title: x.titleMine ? x.title : '' }))} className={chip(f.size === s.id)} aria-pressed={f.size === s.id}>{s.label}{s.add ? ` +¥${s.add}` : ''}</button>)}
          </div>
        </Field>
      )}

      <Field label={tr('时间窗', 'Time window')}>
        <div className="flex flex-wrap gap-2">
          {WINDOWS.map((w) => <button key={w.id} type="button" onClick={() => set('windowId')(w.id)} className={chip(f.windowId === w.id)} aria-pressed={f.windowId === w.id}>{w.label}</button>)}
          <button type="button" onClick={() => set('urgent')(!f.urgent)} className={chip(f.urgent)} aria-pressed={f.urgent}><Lightning size={16} weight="fill" />{tr('加急 +¥2', 'Urgent +¥2')}</button>
        </div>
      </Field>

      <Panel className="space-y-4 p-4">
        <p className="flex items-center gap-2 text-[15px] font-semibold"><LockKey size={20} className="text-accent" />{tr('隐私信息：接单后才对跑腿人可见，完成后自动隐藏', 'Private info: the runner sees it only after taking the order. Hidden again when done.')}</p>
        {f.type === 'express' && (
          <Field label={tr('取件码', 'Pickup code')} error={touched && errors.code}>
            <input className={inputCls} value={f.code} onChange={(e) => set('code')(e.target.value)} placeholder={tr('例如 6-2-3108', 'e.g. 6-2-3108')} />
          </Field>
        )}
        <Field label={tr('宿舍号 / 具体位置', 'Room / exact spot')} error={touched && errors.room}>
          <input className={inputCls} value={f.room} onChange={(e) => set('room')(e.target.value)} placeholder={tr('例如 梅园 5 号楼 412', 'e.g. Plum Court Bldg 5, Room 412')} />
        </Field>
        <p className="text-sm text-muted">{tr('手机号不会给对方，双方通话走平台虚拟号。', 'Your phone number stays private. Calls go through a masked number.')}</p>
      </Panel>

      <Field label={tr('备注（选填）', 'Note (optional)')}>
        <textarea aria-label={tr('备注（选填）', 'Note (optional)')} aria-invalid={!!errors.banned} className={`${inputCls} h-24 resize-none py-3 ${errors.banned ? 'bg-danger-soft ring-2 ring-danger focus:ring-danger' : ''}`} value={f.note} onChange={(e) => set('note')(e.target.value)} maxLength={80} placeholder={tr('比如：放门口就行 / 微辣不要香菜', 'e.g. Just leave it at the door / mild, no cilantro')} />
      </Field>
      {errors.banned ? (
        <div role="alert" className="-mt-3 flex items-center gap-3 rounded-2xl bg-danger-soft p-4 ring-1 ring-danger/30">
          <img src={`${import.meta.env.BASE_URL}icons/blocked-v1.webp`} width={64} height={64} alt={tr('盖住试卷的禁止手势', 'A stop hand over an exam paper')} className="size-16 shrink-0 object-contain" />
          <p className="text-[15px] font-semibold text-danger">{EN ? `Found ${bannedEn}. This can't be posted: Shunluxia doesn't take exams or write homework for anyone, and no cigarettes, alcohol, contraband or fake orders.` : <>检测到「{banned.join('、')}」。这类任务发不出去：顺路侠不接代考代写，也不接烟酒、违禁品和刷单。</>}</p>
        </div>
      ) : (
        <p className="-mt-3 flex items-start gap-1.5 text-sm text-muted"><ProhibitInset size={16} className="mt-0.5 shrink-0" />{tr('代考、代签到、代写作业等任务会被拦截，不能发布。', 'Orders like taking exams, signing in or doing homework for others get blocked.')}</p>
      )}

      {(() => {
        const passing = ROUTES.filter((r) => detourMin(r.from, r.to, f) <= 5)
        return (
          <div className={`flex items-center gap-3 rounded-2xl p-4 ${passing.length ? 'bg-accent-soft' : 'bg-sunken'}`}>
            <span className="flex shrink-0 -space-x-2" aria-hidden="true">
              {(passing.length ? passing : [0]).slice(0, 3).map((_, k) => <img key={k} src={`${import.meta.env.BASE_URL}icons/${k % 2 ? 'avatar-poster-v2' : 'avatar-runner-v2'}.webp`} width={32} height={32} alt="" className={`size-8 rounded-full bg-surface ring-2 ring-accent-soft ${passing.length ? '' : 'opacity-40 grayscale'}`} />)}
            </span>
            <p className="text-[15px] leading-snug">{passing.length
              ? (EN ? <><b className="text-accent">{passing.length} common {passing.length === 1 ? 'route' : 'routes'}</b> {passing.length === 1 ? 'passes' : 'pass'} by this order, like "{passing[0].label}"</> : <>此刻有 <b className="text-accent">{passing.length} 条</b>同学常走的路经过这一单，比如「{passing[0].label}」</>)
              : tr('常走的路线里没有正好经过这里的，赏金高一点会更快有人接', 'No usual route passes right by here. A higher reward gets it taken faster.')}</p>
          </div>
        )
      })()}

      <Panel className="p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[15px] font-semibold">{tr('赏金', 'Reward')}</p>
            <p className="tnum text-sm text-muted">{EN ? `Suggested ¥${sLo} to ¥${sHi}, based on distance, size and urgency` : <>建议 ¥{sLo} 到 ¥{sHi}（按路程、大小、加急估算）</>}</p>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" aria-label={tr('减 1 元', 'Minus ¥1')} onClick={() => set('reward')(Math.max(1, reward - 1))} className="grid size-11 place-items-center rounded-full bg-sunken active:scale-95"><Minus size={18} weight="bold" /></button>
            <span className="tnum w-14 text-center text-2xl font-bold">¥{reward}</span>
            <button type="button" aria-label={tr('加 1 元', 'Plus ¥1')} onClick={() => set('reward')(Math.min(99, reward + 1))} className="grid size-11 place-items-center rounded-full bg-sunken active:scale-95"><Plus size={18} weight="bold" /></button>
          </div>
        </div>
        <div className="mt-4 flex items-center gap-3 rounded-xl bg-accent-soft p-3">
          <Timer size={26} className="shrink-0 text-accent" />
          <p className="text-[15px] leading-snug">{EN ? <>Someone should take it in <b className="tnum">{eLo} to {eHi} min</b></> : <>预计 <b className="tnum">{eLo} 到 {eHi} 分钟</b>有人接单</>}{reward < sLo && <span className="block text-sm text-muted">{tr('低于建议价，接单会慢一些', 'Below the suggested price, so it may take longer')}</span>}</p>
        </div>
        <p className="mt-3 flex items-center gap-1.5 text-sm text-muted"><Wallet size={16} />{EN ? `¥${reward} will be held from your wallet. Balance: ¥${poster.balance}` : <>发布后从钱包冻结 ¥{reward}，当前余额 ¥{poster.balance}</>}</p>
        {touched && errors.money && <p role="alert" className="mt-2 text-sm font-medium text-danger">{errors.money}</p>}
      </Panel>

      {/* 发布按钮吸底：手机贴在底部导航上面，电脑版贴在窗口底边，填表时一直看得到；还有没填好的，按钮上面一行写清楚还差什么 */}
      <div className="sticky bottom-[73px] z-10 -mx-4 bg-gradient-to-t from-bg from-85% to-transparent px-4 pb-1 pt-5 xl:bottom-0 xl:mx-0 xl:px-0 xl:pb-5">
        {blocking && (
          <p role="status" className={`mb-2 text-center text-[14px] font-semibold leading-snug ${touched || errors.banned ? 'text-danger' : 'text-muted'}`}>
            {errors.banned ? tr(`备注里有平台不接的内容「${banned.join('、')}」，删掉才能发布`, `Remove ${bannedEn} to post. It's not allowed here.`) : tr(`还要改：${[errors.code && '取件码没填', errors.room && '宿舍号没填', errors.same && '取送楼栋相同', errors.money && (reward > poster.balance ? '余额不够' : '赏金超过信用上限')].filter(Boolean).join('、')}`, `Still needed: ${[errors.code && 'pickup code', errors.room && 'room number', errors.same && 'different buildings', errors.money && (reward > poster.balance ? 'more balance' : 'lower reward for your credit')].filter(Boolean).join(', ')}`)}
          </p>
        )}
        <Btn size="lg" className="w-full" onClick={submit} disabled={!!errors.banned}>{EN ? `Hold ¥${reward} and post` : <>冻结 ¥{reward} 并发布</>}</Btn>
      </div>

      <Sheet open={confirm} onClose={() => setConfirm(false)} title={tr('确认发布', 'Confirm and post')}>
        <dl className="space-y-3 text-[15px]">
          {(EN
            ? [['Order', title], ['Route', f.from === f.to ? B[f.to].name : `${B[f.from].name} to ${B[f.to].name}`], ['Window', win.label + (f.urgent ? ', urgent' : '')], ['Escrow', `¥${reward}, released after delivery`], ['Taken in', `${eLo} to ${eHi} min`]]
            : [['任务', title], ['路线', f.from === f.to ? B[f.to].name : `${B[f.from].name} 到 ${B[f.to].name}`], ['时间窗', win.label + (f.urgent ? '，加急' : '')], ['托管赏金', `¥${reward}，确认送达后放款`], ['预估接单', `${eLo} 到 ${eHi} 分钟`]]).map(([k, v]) => (
            <div key={k} className="flex gap-3"><dt className={`shrink-0 text-muted ${EN ? 'w-24' : 'w-20'}`}>{k}</dt><dd className="font-medium">{v}</dd></div>
          ))}
        </dl>
        <p className="mt-4 rounded-xl bg-sunken p-3 text-sm leading-relaxed text-muted">{tr('没人接单可以随时取消，赏金原路退回。跑腿人送达后你有 2 小时确认，超时系统自动确认放款；有问题可以申诉，申诉期间赏金继续冻结。', "Cancel anytime before someone takes it and the reward goes back to you. After delivery you have 2 hours to confirm, or the payment is released automatically. If something's wrong, open a dispute and the reward stays held.")}</p>
        <Btn size="lg" className="mt-5 w-full" onClick={doPublish}>{tr('确认发布', 'Confirm and post')}</Btn>
      </Sheet>
    </div>
  )
}
