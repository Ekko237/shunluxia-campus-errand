import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { motion, AnimatePresence, useReducedMotion, useScroll, useTransform, useMotionValue, useMotionValueEvent, animate } from 'motion/react'
import { ArrowDown } from '@phosphor-icons/react'
import { routePath, PLACES } from '../campusMap'
import { CH, STATUS, ESCROW, CODE, RUNNER, POSTER } from './Story'
import { EN, tr } from '../i18n'

// 一镜到底：首屏和一单的六步是同一张校园地图的一次连续镜头。地图铺满整屏，黏土小人阿远是镜头里唯一的演员；
// 往下滚，镜头推近、横移、拉远，跟着他从一教走到梅园。每一章的字写在画面下沿一条纸色字幕卡上，不压路线和人。
// 放款那一章，深绿从阿远身上往外铺满整屏，¥5 沿路飞到他手里；互评之后镜头拉回整个校园。
const MW = 1600, MH = 900
const BASE = import.meta.env.BASE_URL
const icon = (n) => `${BASE}icons/${n}.webp`
const ease = [0.16, 1, 0.3, 1]
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v))
const mix = (a, b, t) => a + (b - a) * t
const sm = (t) => t * t * (3 - 2 * t)

const PTS = routePath('jiao1', 'mei5').pts
const SEGS = PTS.slice(1).map((p, k) => Math.hypot(p[0] - PTS[k][0], p[1] - PTS[k][1]))
const LEN = SEGS.reduce((a, b) => a + b, 0)
const at = (f) => {
  let t = clamp(f) * LEN
  for (let k = 0; k < SEGS.length; k++) {
    if (t <= SEGS[k] || k === SEGS.length - 1) { const u = SEGS[k] ? clamp(t / SEGS[k]) : 0; return [mix(PTS[k][0], PTS[k + 1][0], u), mix(PTS[k][1], PTS[k + 1][1], u)] }
    t -= SEGS[k]
  }
  return PTS[PTS.length - 1]
}
const STATION = [PLACES.cainiao.door[0], PLACES.cainiao.door[1] - 18]
// 驿站门口在整条路上的哪一处
const F = (() => {
  let acc = 0
  for (let k = 0; k < SEGS.length; k++) {
    const [ax, ay] = PTS[k], [bx, by] = PTS[k + 1]
    if (ay === by && Math.abs(ay - 324) < 1 && (STATION[0] - ax) * (STATION[0] - bx) <= 0) return (acc + Math.abs(STATION[0] - ax)) / LEN
    acc += SEGS[k]
  }
  return 0.18
})()
const D = PTS.map(([x, y], k) => `${k ? 'L' : 'M'}${x} ${y}`).join(' ')
const NEED = routePath('cainiao', 'mei5').pts.map(([x, y], k) => `${k ? 'L' : 'M'}${x} ${y}`).join(' ')
const ICHI = PLACES.jiao1.door
const MEI = PLACES.mei5.door
const XM = [MEI[0] - 62, MEI[1] + 60]

// 每一镜对准哪儿：[中心 x, 中心 y, 镜头宽]。0 是首屏，1–7 是七章；手机画框窄，单独一套
// 桌面：路线压在画面上方三分之一处，下面那一条留给字幕卡。三到五镜依次是推近一教、再推近驿站、拉远跟着走回梅园
const CAM = [[800, 450, 1440], [760, 470, 1300], [700, 470, 1200], [1200, 380, 940], [1130, 430, 860], [700, 440, 1360], [420, 460, 1080], [800, 450, 1440]]
const CAM_SM = [[1040, 380, 760], [760, 390, 770], [440, 400, 700], [1180, 330, 640], [1150, 350, 560], [520, 360, 770], [330, 400, 640], [800, 420, 770]]
// 阿远在每一镜停在路上的哪儿：首屏另算（开场走一遍），叙事里一教 → 驿站 → 梅园
const WALK = [1, null, null, 0, F, 0.985, 0.985, 0.985]

function camRect(c, aspect) {
  const [cx, cy, w0] = c
  const w = Math.min(w0, MW, MH * aspect), h = w / aspect
  return { x: clamp(cx - w / 2, 0, MW - w), y: clamp(cy - h / 2, 0, MH - h), w, h }
}
// 每一镜开头停一小会儿，读标题时画面不动；之后跟着滚动连续走到下一镜
const settle = (pos) => { const k = Math.floor(pos), t = pos - k; return [k, clamp((t - 0.5) / 0.5)] }

function useBox(ref) {
  const [box, setBox] = useState({ w: 1440, h: 900 })
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const f = () => setBox({ w: el.clientWidth, h: el.clientHeight })
    f()
    const ro = new ResizeObserver(f)
    ro.observe(el)
    return () => ro.disconnect()
  }, [ref])
  return box
}

// 逐字由模糊变清晰地出现；标点跟着前一个字，不会单独落到行首
const PUNCT = '，。、；：？！」』）'
function units(text) {
  // 英文按词出现：逐个字母做成 inline-block 会让单词从中间断行
  if (EN) return text.split(/\s+/).filter(Boolean)
  const out = []
  for (const ch of text) { if (PUNCT.includes(ch) && out.length) out[out.length - 1] += ch; else out.push(ch) }
  return out
}
function Chars({ text, delay = 0, step = 0.035, dur = 0.55, blur = 10, reduce }) {
  if (reduce) return text
  const one = (u, i) => (
    <motion.span key={i} className="inline-block" initial={{ opacity: 0, filter: `blur(${blur}px)`, y: '0.14em' }} animate={{ opacity: 1, filter: 'blur(0px)', y: 0 }}
      transition={{ duration: dur, delay: delay + i * step, ease }}>{u}</motion.span>
  )
  if (!EN) return units(text).map(one)
  // 英文：词之间的空格留成普通文字，才有词距、才能在词间换行
  let n = -1
  return text.split(/(\s+)/).map((w, j) => (!w ? null : /^\s+$/.test(w) ? <span key={`s${j}`}> </span> : one(w, ++n)))
}

// 关键词下面的点线小路：读到这一章时从左画到右，末端一个点
function KeyLine({ children, on, reduce, dark }) {
  return (
    <span className={`relative inline-block ${dark ? 'text-accent-glow' : 'text-accent'}`}>
      {children}
      <svg aria-hidden="true" viewBox="0 0 200 20" preserveAspectRatio="none" className="absolute -bottom-[0.2em] left-0 h-[0.16em] w-full overflow-visible">
        <motion.path d="M4 10 H186" fill="none" stroke="currentColor" strokeWidth="6" strokeLinecap="round" strokeDasharray="0.1 14"
          initial={false} animate={{ pathLength: on || reduce ? 1 : 0, opacity: on || reduce ? 1 : 0 }} transition={{ duration: reduce ? 0 : 0.6, ease, delay: reduce ? 0 : 0.35 }} />
        <motion.circle cx="192" cy="10" r="7" fill="currentColor" initial={false} animate={{ scale: on || reduce ? 1 : 0 }}
          transition={{ type: 'spring', stiffness: 400, damping: 15, delay: reduce ? 0 : 0.8 }} style={{ transformOrigin: '192px 10px' }} />
      </svg>
    </span>
  )
}

// 落点：标题末尾一颗翠绿圆点，像地图上刚落下的定位点；这一章亮起时外圈脉冲一次
function Drop({ on, reduce, dark, delay = 0 }) {
  return (
    <motion.span aria-hidden="true" initial={reduce ? false : { scale: 0 }} animate={{ scale: on || reduce ? 1 : 0 }} transition={{ type: 'spring', stiffness: 420, damping: 18, delay: reduce ? 0 : delay }}
      className={`relative ml-[0.1em] inline-block size-[0.15em] min-h-2 min-w-2 rounded-full align-baseline ${dark ? 'bg-accent-glow' : 'bg-accent'}`}>
      {!reduce && on && <motion.span key="ping" className={`absolute inset-0 rounded-full ${dark ? 'bg-accent-glow' : 'bg-accent'}`} initial={{ opacity: 0.6, scale: 1 }} animate={{ opacity: 0, scale: 3.2 }} transition={{ duration: 0.9, delay: delay + 0.2, ease: 'easeOut' }} />}
    </motion.span>
  )
}

// 章节标题：一章一换，要在半秒内读得清，逐字间隔和模糊都比首屏短。
// 逗号前后各是一个不断开的词组，只在逗号后换行，不会把「下课」拆成两行
const TS = 0.02
function Title({ c, reduce, dark, className = '' }) {
  // 英文按词自然换行，不分段、不加 nowrap
  const cut = EN ? 0 : c.t.indexOf('，') + 1
  const parts = cut ? [c.t.slice(0, cut), c.t.slice(cut)] : [c.t]
  const ch = (text, delay = 0) => <Chars text={text} delay={delay} step={TS} dur={0.34} blur={6} reduce={reduce} />
  let n = 0
  return (
    <h3 className={`font-display ${className}`}>
      {parts.map((part, j) => {
        const at = n
        n += units(part).length
        const i = c.hl ? part.indexOf(c.hl) : -1
        const head = i < 0 ? part : part.slice(0, i)
        return (
          <span key={j} className={EN ? '' : 'whitespace-nowrap'}>
            {ch(head, at * TS)}
            {i >= 0 && <><KeyLine on reduce={reduce} dark={dark}>{ch(c.hl, (at + units(head).length) * TS)}</KeyLine>{ch(part.slice(i + c.hl.length), (at + units(head).length + units(c.hl).length) * TS)}</>}
            {j === parts.length - 1 && <Drop on reduce={reduce} dark={dark} delay={units(c.t).length * TS + 0.2} />}
          </span>
        )
      })}
    </h3>
  )
}

// 凭证：这一单的托管、取件码和两个人的信用写在一张两侧带缺口的小票上；这一章变了的那一行亮起来，数字翻过去
const ROWS = [[tr('赏金托管', 'Reward escrow'), ESCROW], [tr('取件码', 'Pickup code'), CODE], [tr('阿远信用', "Yuan's credit"), RUNNER], [tr('小满信用', "Xiaoman's credit"), POSTER]]
function Ticket({ k, small, notch = 'var(--surface)' }) {
  const reduce = useReducedMotion()
  const anyHot = k > 0 && ROWS.some(([, arr]) => arr[k] !== arr[k - 1])
  return (
    <div className={`relative rounded-2xl bg-bg ring-1 ring-line ${small ? 'px-3 py-2' : 'px-4 py-3'}`}>
      {!small && (
        <>
          <span aria-hidden="true" className="absolute -left-2 top-[46px] size-4 rounded-full ring-1 ring-line" style={{ background: notch }} />
          <span aria-hidden="true" className="absolute -right-2 top-[46px] size-4 rounded-full ring-1 ring-line" style={{ background: notch }} />
          <div className="flex items-center justify-between gap-2 border-b border-dashed border-line pb-2">
            <span className="text-[14px] font-semibold text-muted">{tr('凭证 · 驿站 → 梅园', 'Receipt · Station → Plum Court')}</span>
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.span key={STATUS[k]} initial={reduce ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.25 }}
                className="whitespace-nowrap rounded-full bg-accent px-2 py-0.5 text-[14px] font-bold text-on-accent">{STATUS[k]}</motion.span>
            </AnimatePresence>
          </div>
        </>
      )}
      <dl className={small ? 'grid grid-cols-2 gap-x-3 gap-y-1' : 'mt-1'}>
        {ROWS.map(([l, arr]) => {
          const v = arr[k], prev = k > 0 ? arr[k - 1] : v
          const hot = v !== prev
          const delta = typeof v === 'number' && v !== prev ? v - prev : 0
          return (
            <div key={l} className={`rounded-lg transition-colors duration-300 ${small ? 'px-2 py-1' : '-mx-2 flex items-baseline justify-between gap-3 px-2 py-1'} ${hot ? 'bg-accent-soft' : ''}`}>
              <dt className="whitespace-nowrap text-[14px] text-muted">{l}</dt>
              <dd className={`relative flex items-baseline gap-1.5 ${small ? '' : 'overflow-hidden'}`}>
                {delta > 0 && <span className="tnum text-[14px] font-bold text-accent-deep">+{delta}</span>}
                <AnimatePresence mode="popLayout" initial={false}>
                  <motion.span key={String(v)} initial={reduce ? false : { y: 14, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -14, opacity: 0 }} transition={{ duration: 0.32, ease }}
                    className={`tnum block whitespace-nowrap font-bold transition-colors duration-300 ${hot ? 'text-accent-deep' : anyHot ? 'text-ink/60' : 'text-ink'} ${small ? 'text-[15px]' : 'text-[17px]'}`}>{v}</motion.span>
                </AnimatePresence>
              </dd>
            </div>
          )
        })}
      </dl>
    </div>
  )
}

// 段落最后 4 个字用不换行的连接符连起来，不让「乱用。」这种一两个字单独落到最后一行
const keepTail = (t, n = 4) => { const a = [...t]; return a.length <= n ? t : a.slice(0, -n).join('') + a.slice(-n).join('\u2060') }
// 这些词也不许从中间断开（「取件｜码」「接单之｜前」）：字和字之间塞同一个不换行的连接符
const WORDS = ['取件码', '送达码', '宿舍号', '接单之前', '虚拟号', '信用分', '菜鸟驿站', '6-2-3108']
const glue = (t) => WORDS.reduce((x, w) => x.split(w).join([...w].join('\u2060')), t)
// 英文没有这类断行问题，原样输出
const tidy = (t) => (EN ? t : glue(keepTail(t)))

// 六步走到第几步：这一步拉长，走过的绿，没走的灰
function Steps({ k, dark, className = '' }) {
  return (
    <span role="img" aria-label={tr(`第 ${k} 步，共 6 步`, `Step ${k} of 6`)} className={`flex shrink-0 items-center gap-1 ${className}`}>
      {[1, 2, 3, 4, 5, 6].map((i) => <span key={i} className={`h-1.5 rounded-full ${i === k ? 'w-6' : 'w-2'} ${i <= k ? (dark ? 'bg-accent-glow' : 'bg-accent') : dark ? 'bg-on-accent/25' : 'bg-ink/15'}`} />)}
    </span>
  )
}

// 桌面字幕卡：一条矮卡压在画面下沿；左边第几站和标题，中间正文和背后的产品设计，右边凭证
function CardWide({ k, reduce, dark }) {
  const c = CH[k]
  return (
    <div className={`grid grid-cols-12 items-center gap-8 ${dark ? 'text-on-accent' : 'text-ink'}`}>
      <div className="col-span-4">
        <p className={`flex items-center gap-2 text-[15px] font-semibold ${dark ? 'text-on-accent/90' : 'text-muted'}`}>
          {k > 0 && <span className={`font-display text-[44px] leading-none ${dark ? 'text-accent-glow' : 'text-accent'}`}>{String(k).padStart(2, '0')}</span>}
          <img src={icon(c.icon)} width={24} height={24} alt="" aria-hidden="true" className="size-6" />{c.kicker}
          {k > 0 && <Steps k={k} dark={dark} className="ml-auto" />}
        </p>
        {c.fear && <p className="mt-2"><s className={`text-[16px] font-semibold decoration-2 ${dark ? 'text-on-accent/90 decoration-accent-glow' : 'text-ink/70 decoration-accent'}`}>{c.fear}</s></p>}
        <Title c={c} reduce={reduce} dark={dark} className="mt-1.5 text-[clamp(32px,3vw,44px)] leading-[1.12]" />
      </div>
      <div className="col-span-5">
        <p className={`text-[19px] leading-[1.65] ${dark ? 'text-on-accent' : 'text-ink/85'}`}>{tidy(c.d)}</p>
        <p className={`mt-3 text-[15px] font-semibold ${dark ? 'text-accent-glow' : 'text-accent'}`}>{c.note[0]}</p>
        <p className={`mt-0.5 text-[16px] leading-relaxed ${dark ? 'text-on-accent/90' : 'text-muted'}`}>{tidy(c.note[1])}</p>
      </div>
      {/* 第一章还没发单：凭证先摆出来，「还没付」「还没有」，往下每一章看它一格格变 */}
      <div className="col-span-3"><Ticket k={k} notch={dark ? 'var(--accent-deep)' : 'var(--surface)'} /></div>
    </div>
  )
}

// 手机抽屉卡：地图下面那一半，字号小一档，凭证收成两列贴在卡底
function Card({ k, reduce }) {
  const c = CH[k]
  return (
    <div className="flex h-full flex-col pb-4">
      <p className="flex items-center gap-2 text-[14px] font-semibold text-muted">
        {k > 0 && <span className="font-display text-[34px] leading-none text-accent">{String(k).padStart(2, '0')}</span>}
        <img src={icon(c.icon)} width={22} height={22} alt="" aria-hidden="true" className="size-[22px]" />{c.kicker}
        {k > 0 && <Steps k={k} className="ml-auto" />}
      </p>
      {c.fear && <p className="mt-1"><s className="text-[15px] font-semibold text-ink/70 decoration-accent decoration-2">{c.fear}</s></p>}
      <Title c={c} reduce={reduce} className="mt-1.5 text-[27px] leading-[1.18]" />
      <p className="mt-2.5 text-[16px] leading-[1.7] text-ink/85">{tidy(c.d)}</p>
      <div className="mt-auto pt-3"><Ticket k={k} small /></div>
    </div>
  )
}

export default function OneTake({ Cta, Anchor }) {
  const reduce = useReducedMotion()
  const box = useRef(null)
  const stage = useRef(null)
  const { w: vw, h: vh } = useBox(stage)
  // 手机和竖着拿的平板：上面是地图，下面是卡片抽屉，两块不重叠，字永远不会被地图盖住
  const small = vw < 1024
  const mapH = small ? Math.round(vh * 0.57) : vh
  const aspect = vw / mapH
  const cams = small ? CAM_SM : CAM
  const { scrollYProgress } = useScroll({ target: box, offset: ['start start', 'end end'] })
  // 最后一章（互评）多停半屏：信用的大数字读完了，下一段的纸才盖上来
  const pos = useTransform(scrollYProgress, (v) => Math.min(7, v * 8))
  const [k, setK] = useState(0)
  useMotionValueEvent(pos, 'change', (p) => setK(Math.min(7, Math.round(p - 0.08))))

  // 开场：路线自己画出来，阿远从一教走过驿站，然后标题逐字出现
  const intro = useMotionValue(reduce ? 1 : 0)
  const [introDone, setIntroDone] = useState(reduce)
  useEffect(() => {
    if (reduce) return
    const c = animate(intro, 1, { duration: 2.6, delay: 0.5, ease: [0.45, 0, 0.25, 1], onComplete: () => setIntroDone(true) })
    return () => c.stop()
  }, [reduce, intro])

  const cam = (p) => {
    if (reduce) return camRect(cams[Math.min(7, Math.round(p))], aspect)
    const [i, t] = settle(p)
    const A = camRect(cams[Math.min(i, 7)], aspect), B = camRect(cams[Math.min(i + 1, 7)], aspect)
    const u = sm(t)
    return { x: mix(A.x, B.x, u), y: mix(A.y, B.y, u), w: mix(A.w, B.w, u), h: mix(A.h, B.h, u) }
  }
  // 首屏开场：桌面走完整条路；手机画框装不下整条路，只走到驿站门口取上快递
  const walk = (p, io) => {
    if (p < 0.5) return { f: small ? io * (F + 0.07) : io, o: 1 }
    if (reduce) { const w = WALK[Math.min(7, Math.round(p))]; return w == null ? { f: 0, o: 0 } : { f: w, o: 1 } }
    const [i, t] = settle(p)
    const wk = (j) => (j === 0 && small ? F + 0.07 : WALK[Math.min(j, 7)])
    const a = wk(i), b = wk(i + 1)
    if (a == null && b == null) return { f: 0, o: 0 }
    if (a == null) return { f: b, o: sm(t) }
    if (b == null) return { f: a, o: 1 - sm(t) }
    return { f: mix(a, b, sm(t)), o: 1 }
  }
  const camV = useTransform(pos, (p) => cam(p))
  const mapTransform = useTransform(camV, (c) => { const sc = vw / c.w; return `translate3d(${-c.x * sc}px, ${-c.y * sc}px, 0) scale(${sc})` })
  const toScreen = (m, c) => [((m[0] - c.x) / c.w) * vw, ((m[1] - c.y) / c.h) * mapH]
  const wv = useTransform([pos, intro], ([p, io]) => walk(p, io))
  const runner = useTransform([camV, wv], ([c, w]) => { const [x, y] = toScreen(at(w.f), c); return `translate3d(${x}px, ${y}px, 0)` })
  const runnerO = useTransform(wv, (w) => w.o)
  const len = useTransform(wv, (w) => w.f)
  const stepY = useTransform(len, (f) => -Math.abs(Math.sin(((f * LEN) / 30) * Math.PI)) * (small ? 3 : 5))
  const stepR = useTransform(len, (f) => Math.sin(((f * LEN) / 30) * Math.PI) * 3)
  const carry = useTransform(wv, (w) => clamp((w.f - F) / (1 - F)))
  // 路线长度还是 0 时圆头线帽会画出一个小圆块，先藏起来
  const lenO = useTransform(len, (v) => (v < 0.004 ? 0 : 1))
  const carryO = useTransform(carry, (v) => (v < 0.004 ? 0 : 1))
  const hasPkg = useTransform(wv, (w) => (w.f >= F - 0.004 ? 1 : 0))
  const pkgAtStation = useTransform(hasPkg, (h) => 1 - h)
  const tagAt = (m) => useTransform(camV, (c) => { const [x, y] = toScreen(m, c); return `translate3d(${x}px, ${y}px, 0)` })
  // 镜头推近时，快出画框的地名牌先淡掉，不留半个牌子在画面边上
  const edgeO = (m, pad = 56) => useTransform(camV, (c) => { const [x, y] = toScreen(m, c); return x < pad || x > vw - pad || y < 72 || y > mapH - 24 ? 0 : 1 })
  const tIchi = tagAt([ICHI[0], ICHI[1] - 150])
  const tStation = tagAt([STATION[0], STATION[1] + 88])
  const tMei = tagAt([XM[0], XM[1]])
  const tPkg = tagAt(STATION)
  const tDetour = tagAt(small ? [STATION[0] - 293, STATION[1] - 50] : [STATION[0] - 20, STATION[1] - 66])
  const tLock = tagAt([XM[0] + (small ? 110 : 70), XM[1] - 118])
  const tCode = tagAt(small ? [STATION[0] - 20, STATION[1] - 143] : [STATION[0] - 300, STATION[1] + 64])
  const oIchi = edgeO([ICHI[0], ICHI[1] - 150])
  const oStation = edgeO([STATION[0], STATION[1] + 88])
  const oMei = edgeO([XM[0], XM[1]], 64)
  // 放款那一章：深绿以阿远为圆心铺满整屏；互评后镜头拉远时一直是深绿
  const wipe = useTransform([pos, camV], ([p, c]) => {
    const r = clamp((p - 5.45) / 0.5)
    const [x, y] = toScreen(at(0.985), c)
    const R = Math.hypot(Math.max(x, vw - x), Math.max(y, mapH - y)) * 1.05
    return `circle(${(reduce ? (p > 5.6 ? 1 : 0) : sm(r)) * R}px at ${x}px ${y}px)`
  })
  const heroO = useTransform(pos, [0, 0.35], [1, 0])
  const heroY = useTransform(pos, [0, 0.35], [0, -40])
  const heroPE = useTransform(heroO, (o) => (o < 0.15 ? 'none' : 'auto'))
  const climax = k >= 6
  const tag = (txt, extra = '') => <span className={`block -translate-x-1/2 whitespace-nowrap rounded-full px-2.5 py-1 text-[14px] font-semibold shadow-sm ring-1 ${extra || 'bg-surface text-ink ring-line'}`}>{txt}</span>

  return (
    <section ref={box} id="story" aria-label={tr('一单怎么走', 'How an order works')} className="relative -mt-16" style={{ height: '900svh' }}>
      <span id="top" aria-hidden="true" className="absolute left-0 top-0" />
      <div ref={stage} className={`sticky top-0 h-[100svh] overflow-hidden transition-colors duration-700 ${climax && small ? 'bg-accent-deep' : 'bg-bg'}`}>
        {/* 地图层：整张校园图和路线都在这一层里，镜头只做位移和缩放 */}
        <div className="absolute inset-x-0 top-0 overflow-hidden" style={{ height: mapH }} aria-hidden="true">
          <motion.div className="absolute left-0 top-0 origin-top-left will-change-transform" style={{ width: MW, height: MH, transform: mapTransform }}>
            <motion.svg viewBox={`0 0 ${MW} ${MH}`} className="absolute inset-0 size-full"
              initial={reduce ? false : { opacity: 0, filter: 'saturate(0.2) blur(6px)' }} animate={{ opacity: 1, filter: 'saturate(1) blur(0px)' }} transition={{ duration: 1.1, ease }}>
              <image href={`${BASE}images/campus-map-v3.webp`} x="0" y="0" width={MW} height={MH} />
              <path d={D} fill="none" stroke="var(--ink)" strokeOpacity="0.3" strokeWidth="7" strokeDasharray="1 15" strokeLinecap="round" />
              <motion.path d={D} fill="none" stroke="var(--ink)" strokeOpacity="0.9" strokeWidth="12" strokeLinecap="round" strokeLinejoin="round" style={{ pathLength: len, opacity: lenO }} />
              <motion.path d={NEED} fill="none" stroke="var(--accent)" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" style={{ pathLength: carry, opacity: carryO }} />
              {/* 发布那一下，驿站冒一圈：这里有一单在等人 */}
              {k === 2 && !reduce && (
                <motion.circle key="ping" cx={STATION[0]} cy={STATION[1] + 18} r="60" fill="var(--accent)" initial={{ opacity: 0.45, scale: 0.4 }} animate={{ opacity: 0, scale: 1.8 }}
                  transition={{ duration: 1.3, repeat: 2, ease: 'easeOut' }} style={{ transformOrigin: `${STATION[0]}px ${STATION[1] + 18}px` }} />
              )}
            </motion.svg>
          </motion.div>
          {/* 取件码亮出的那一章：地图压暗一点，画面里只有黑码卡发亮 */}
          <motion.div className="pointer-events-none absolute inset-0 bg-ink" initial={false} animate={{ opacity: k === 4 ? 0.24 : 0 }} transition={{ duration: reduce ? 0 : 0.5, ease }} />
          {/* 放款：深绿圆从阿远身上铺开，地图变成深绿单色，只有路线和人亮着 */}
          <motion.div className="absolute inset-0 bg-accent-deep mix-blend-multiply" style={{ clipPath: wipe }} />
          <motion.div className="absolute inset-0 bg-accent-deep/70" style={{ clipPath: wipe }} />
          <motion.div className="absolute inset-0" style={{ clipPath: wipe }}>
            <motion.div className="absolute left-0 top-0 origin-top-left" style={{ width: MW, height: MH, transform: mapTransform }}>
              <svg viewBox={`0 0 ${MW} ${MH}`} className="absolute inset-0 size-full">
                <path d={D} fill="none" stroke="var(--accent-soft)" strokeOpacity="0.55" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" />
                <path d={NEED} fill="none" stroke="var(--accent-glow)" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </motion.div>
          </motion.div>

          {/* 地名牌和人：不跟着镜头放大，只跟着位置走 */}
          <motion.span className="absolute left-0 top-0 z-10 transition-opacity duration-200" style={{ transform: tIchi, opacity: oIchi }}>{tag(tr('一教', 'Teaching Bldg 1'))}</motion.span>
          <motion.span className="absolute left-0 top-0 z-10 transition-opacity duration-200" style={{ transform: tStation, opacity: k >= 7 ? 0 : oStation }}>{tag(tr('菜鸟驿站', 'Parcel station'), k >= 2 && k <= 4 ? 'bg-ink text-bg ring-ink' : '')}</motion.span>
          <motion.span className="absolute left-0 top-0 z-10 transition-opacity duration-200" style={{ transform: tMei, opacity: oMei }}>
            {/* 小满站在梅园楼前：锚点在脚下，人在上面，名牌在脚下，不和走过来的阿远叠在一起 */}
            <span className="relative block">
              <img src={`${BASE}brand/poster-v1.webp`} width={136} height={240} alt="" className={`absolute bottom-0 left-0 w-auto max-w-none -translate-x-1/2 drop-shadow-[0_10px_10px_rgba(17,40,30,0.25)] ${small ? 'h-[56px]' : 'h-[84px]'}`} />
              <span className="absolute left-0 top-1.5">{tag(tr('梅园 · 小满', 'Plum Court · Xiaoman'))}</span>
            </span>
          </motion.span>
          <motion.span className="absolute left-0 top-0 z-10" style={{ transform: tPkg, opacity: pkgAtStation }}>
            <img src={icon('type-express-v1')} width={44} height={44} alt="" className="-translate-x-1/2 -translate-y-[85%]" />
          </motion.span>
          <motion.span className="absolute left-0 top-0 z-20" style={{ transform: runner, opacity: runnerO }}>
            <motion.span className="relative block origin-bottom -translate-x-1/2 -translate-y-[88%]" style={reduce ? undefined : { y: stepY, rotate: stepR }}>
              {/* 接单前空手走，取到快递后夹着包裹走 */}
              <motion.img src={`${BASE}brand/runner-free-v1.webp`} width={199} height={240} alt="" style={{ opacity: pkgAtStation }} className={`absolute bottom-0 left-0 max-w-none ${small ? 'h-[64px]' : 'h-[96px]'} w-auto drop-shadow-[0_10px_10px_rgba(17,40,30,0.25)]`} />
              <motion.img src={`${BASE}brand/runner-v1.webp`} width={169} height={240} alt="" style={{ opacity: hasPkg }} className={`block ${small ? 'h-[64px]' : 'h-[96px]'} w-auto max-w-none drop-shadow-[0_10px_10px_rgba(17,40,30,0.25)]`} />
            </motion.span>
          </motion.span>
          <AnimatePresence>
            {/* 首屏走完：驿站门口亮出这一单的价值 */}
            {k === 0 && introDone && (
              <motion.span key="detour" className="absolute left-0 top-0 z-30" style={{ transform: tDetour }} initial={reduce ? false : { opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={{ type: 'spring', stiffness: 380, damping: 24 }}>
                <span className="block -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-full bg-ink px-3.5 py-1.5 text-[14px] font-bold text-bg shadow-lg">{small ? tr('只多走 1 分钟', 'Just 1 min extra') : tr('顺路，只多走 1 分钟', 'On the way, 1 min extra')}</span>
              </motion.span>
            )}
            {/* 发布：赏金冻结在平台，锁落在小满身边 */}
            {k === 2 && (
              <motion.span key="lock" className="absolute left-0 top-0 z-30" style={{ transform: tLock }} initial={reduce ? false : { opacity: 0, y: -24 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ type: 'spring', stiffness: 300, damping: 16, delay: reduce ? 0 : 0.25 }}>
                <span className="flex -translate-x-1/2 items-center gap-1.5 whitespace-nowrap rounded-full bg-accent px-3 py-1.5 text-[14px] font-bold text-on-accent shadow-lg">
                  <img src={icon('trust-escrow-v1')} width={22} height={22} alt="" className="size-[22px]" />{tr('¥5 冻结在平台', '¥5 held in escrow')}
                </span>
              </motion.span>
            )}
            {/* 接单：取件码这时才出现，一张大的黑码卡 */}
            {k === 4 && (
              <motion.span key="code" className="absolute left-0 top-0 z-30" style={{ transform: tCode }} initial={reduce ? false : { opacity: 0, y: 14, scale: 0.92 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -6 }} transition={{ type: 'spring', stiffness: 320, damping: 22, delay: reduce ? 0 : 0.2 }}>
                <span className={`block -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-ink text-bg shadow-[0_0_0_6px_rgba(143,227,187,0.4),0_0_40px_6px_rgba(143,227,187,0.35),0_20px_40px_-18px_rgba(17,40,30,0.7)] ring-2 ring-accent-glow ${small ? 'px-3 py-2' : 'px-5 py-3'}`}>
                  <span className="block text-[14px] font-semibold opacity-80">{tr('接单后才看得到 · 到驿站报', 'Shown once accepted · Give it at the station')}</span>
                  <span className={`tnum block whitespace-nowrap font-bold tracking-wide ${small ? 'text-[22px] leading-tight' : 'text-[36px] leading-none'}`}>6-2-3108</span>
                </span>
              </motion.span>
            )}
          </AnimatePresence>
          {/* 放款：¥5 从驿站门口的托管锁出发，飞到阿远手边 */}
          <AnimatePresence>
            {k === 6 && !reduce && <Coin key="coin" camV={camV} toScreen={toScreen} small={small} />}
          </AnimatePresence>
          {k === 7 && <Gains key="gains" small={small} reduce={reduce} />}
        </div>

        {/* 首屏的字：地图下沿一整块纸色底，标题逐字出现 */}
        <motion.div className={`absolute inset-x-0 bottom-0 z-40 ${small ? 'flex flex-col justify-center' : ''}`} style={{ opacity: heroO, y: heroY, pointerEvents: heroPE, ...(small ? { top: mapH } : {}) }}>
          <div className={`relative bg-gradient-to-b from-transparent to-bg ${small ? 'h-6' : 'h-14'}`}>
            {!small && (
              <p className="absolute -top-2 left-1/2 flex w-full max-w-7xl -translate-x-1/2 items-center justify-end gap-3 px-8 text-[14px] font-semibold text-ink/80">
                <span className="flex items-center gap-2 rounded-full bg-surface/90 px-3 py-1 shadow-sm ring-1 ring-line"><span className="h-1 w-6 rounded-full bg-ink" />{tr('阿远本来就要走的路', 'The walk Yuan takes anyway')}</span>
                <span className="flex items-center gap-2 rounded-full bg-surface/90 px-3 py-1 shadow-sm ring-1 ring-line"><span className="h-1.5 w-6 rounded-full bg-accent" />{tr('顺手捎上你的快递', 'Your parcel, picked up on the way')}</span>
              </p>
            )}
          </div>
          <div className="bg-bg">
            <div className="mx-auto max-w-7xl px-4 pb-10 md:px-8">
              {/* 英文句子比中文长一倍多，字号小一档，两行都能放下 */}
              {EN ? (
                <h1 className={`font-display leading-[1.02] ${small ? (EN ? 'text-[clamp(28px,8.4vw,44px)]' : 'text-[clamp(32px,9.4vw,44px)]') : 'text-[clamp(48px,min(5.6vw,9svh),88px)]'}`}>
                  <span className="block"><Chars text="You're walking past anyway." delay={reduce ? 0 : 0.3} step={0.1} reduce={reduce} /></span>
                  <span className="block">
                    <Chars text="Grab it " delay={reduce ? 0 : 0.6} step={0.1} reduce={reduce} />
                    <KeyLine on={introDone} reduce={reduce}><Chars text="on the way" delay={reduce ? 0 : 0.8} step={0.1} reduce={reduce} /></KeyLine>
                    <span className="whitespace-nowrap"><Chars text="." delay={reduce ? 0 : 1.1} reduce={reduce} /><Drop on={introDone} reduce={reduce} delay={0.1} /></span>
                  </span>
                </h1>
              ) : (
              <h1 className={`font-display leading-[0.98] ${small ? 'text-[clamp(40px,12.8vw,56px)]' : 'text-[clamp(56px,min(7.6vw,11.5svh),112px)]'}`}>
                <span className="block"><Chars text="本来就要经过" delay={reduce ? 0 : 0.3} step={0.05} reduce={reduce} /><span className="sr-only">，</span></span>
                <span className="block">
                  <KeyLine on={introDone} reduce={reduce}><Chars text="顺手" delay={reduce ? 0 : 0.65} step={0.05} reduce={reduce} /></KeyLine>
                  <Chars text="捎一下" delay={reduce ? 0 : 0.75} step={0.05} reduce={reduce} /><Drop on={introDone} reduce={reduce} delay={0.1} />
                </span>
              </h1>
              )}
              <motion.div className={small ? 'mt-5' : 'mt-9 flex items-center gap-10'} initial={reduce ? false : { opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: reduce ? 0 : 1.05, ease }}>
                <p className={`text-ink/85 ${small ? 'max-w-[34em] text-[16px] leading-relaxed' : 'max-w-[26em] text-[20px] leading-[1.6]'}`}>{tr('快递在驿站，你在宿舍。正好路过驿站的同学，下课顺手帮你带上。校内实名，赏金先托管。', "Your parcel is at the station, you're in your dorm. A classmate walking past after class grabs it for you. Everyone is a verified student, and the reward is held in escrow.")}</p>
                <div className={`flex shrink-0 items-center gap-5 ${small ? 'mt-4' : ''} ${EN ? 'flex-wrap gap-y-2' : ''}`}>
                  <Cta />
                  <Anchor to="loop-1" className="inline-flex h-12 items-center gap-1.5 whitespace-nowrap font-semibold text-ink">{tr('看看谁顺路', "See who's on the way")}<ArrowDown size={16} weight="bold" /></Anchor>
                </div>
              </motion.div>
            </div>
          </div>
        </motion.div>

        {/* 一章一张卡：同一个位置换内容；桌面是下沿的矮字幕卡，手机是地图下面那一半 */}
        <div className={`absolute z-30 ${small ? `inset-x-0 bottom-0 px-4 pt-3 ${k >= 1 ? (climax ? 'bg-accent-deep' : 'bg-bg') : ''}` : 'inset-x-0 bottom-6 mx-auto max-w-7xl px-8'}`}
          style={small ? { height: vh - mapH } : undefined}>
          <AnimatePresence mode="wait" initial={false}>
            {k >= 1 && (
              <motion.div key={k} initial={reduce ? false : { opacity: 0, y: small ? 12 : 20 }} animate={{ opacity: 1, y: 0 }} exit={reduce ? { opacity: 0 } : { opacity: 0, y: small ? -8 : -12 }}
                transition={{ duration: 0.42, ease: [0.2, 0.8, 0.2, 1] }}
                className={small ? `h-full ${climax ? 'rounded-2xl bg-bg p-3' : ''}` : `rounded-[28px] px-8 py-6 shadow-[0_30px_60px_-30px_rgba(17,40,30,0.55)] ring-1 transition-colors duration-500 ${climax ? 'bg-accent-deep ring-white/15' : 'bg-surface ring-line'}`}>
                {small ? <Card k={k - 1} reduce={reduce} /> : <CardWide k={k - 1} reduce={reduce} dark={climax} />}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
      {/* 目录和「看看谁顺路」跳到第一章用的落点 */}
      <span id="loop-1" aria-hidden="true" className="absolute left-0" style={{ top: `${100 * 1.05}svh` }} />
    </section>
  )
}

// 放款：¥5 从驿站门口的托管锁沿弧线飞到阿远手边（他右上方），落下后化进他手里，不压在人身上
function Coin({ camV, toScreen, small }) {
  const t = useMotionValue(0)
  useEffect(() => { const c = animate(t, 1, { duration: 1.1, delay: 0.35, ease: [0.45, 0, 0.2, 1] }); return () => c.stop() }, [t])
  const tf = useTransform([t, camV], ([u, c]) => {
    const a = toScreen(STATION, c), f = toScreen(at(0.985), c)
    const b = [f[0] + (small ? 20 : 30), f[1] - (small ? 40 : 58)]
    const mid = [(a[0] + b[0]) / 2, Math.min(a[1], b[1]) - 160]
    const x = (1 - u) * (1 - u) * a[0] + 2 * (1 - u) * u * mid[0] + u * u * b[0]
    const y = (1 - u) * (1 - u) * a[1] + 2 * (1 - u) * u * mid[1] + u * u * b[1]
    return `translate3d(${x}px, ${y}px, 0)`
  })
  const sc = useTransform(t, [0, 0.5, 1], [0.5, 1.25, 0.6])
  const op = useTransform(t, [0, 0.82, 1], [1, 1, 0])
  return (
    <motion.span className="absolute left-0 top-0 z-40" style={{ transform: tf, opacity: op }} exit={{ opacity: 0 }}>
      <motion.span style={{ scale: sc }} className="tnum grid size-14 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-accent text-[18px] font-bold text-on-accent shadow-[0_10px_24px_-8px_rgba(0,0,0,0.5)] ring-4 ring-on-accent/80">¥5</motion.span>
    </motion.span>
  )
}

// 互评之后：两个人的信用一起涨，大数字落在深绿的画面上，放在路线下面，路线一直看得见
function Gains({ small, reduce }) {
  const items = [[tr('阿远 · 跑腿', 'Yuan · Runner'), 3, '70 → 73'], [tr('小满 · 发单', 'Xiaoman · Requester'), 2, '88 → 90']]
  return (
    <div className={`absolute z-30 flex ${small ? 'inset-x-4 top-1/2 -translate-y-[30%] gap-3' : 'left-1/2 top-[42%] -translate-x-[12%] gap-5'}`}>
      {items.map(([who, n, v], i) => (
        <motion.div key={who} initial={reduce ? false : { opacity: 0, y: 30, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ type: 'spring', stiffness: 260, damping: 18, delay: reduce ? 0 : 0.2 + i * 0.12 }}
          className={`rounded-[24px] bg-accent text-on-accent ring-1 ring-white/25 ${small ? 'flex-1 px-4 py-2.5' : 'w-[230px] px-6 py-4'}`}>
          <p className="text-[14px] font-semibold">{who}</p>
          <p className={`font-display leading-none ${small ? 'text-[48px]' : 'text-[104px]'}`}>+{n}</p>
          <p className={`tnum font-semibold ${small ? 'text-[14px]' : 'text-[17px]'}`}>{v}</p>
        </motion.div>
      ))}
    </div>
  )
}
