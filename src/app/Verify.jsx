import { useEffect, useRef, useState } from 'react'
import { IdentificationCard as PhIdentificationCard } from '@phosphor-icons/react'
import { motion, useReducedMotion } from 'motion/react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, CaretDown } from '@phosphor-icons/react'
import { useStore } from '../store'
import { Btn, Panel, Field, VerifiedBadge, inputCls, gi, pi } from '../ui'
import { CREDIT_INIT, code4, levelOf } from '../data'
import { EN, tr } from '../i18n'
const SealCheck = gi('seal')
const IdentificationCard = pi(PhIdentificationCard)
const EnvelopeSimple = gi('envelope')
const COLLEGES = EN
  ? ['School of Computer Science', 'School of Economics and Management', 'School of Foreign Languages', 'School of Mechanical Engineering', 'School of Journalism and Communication']
  : ['计算机学院', '经济管理学院', '外国语学院', '机械工程学院', '新闻传播学院']

export default function Verify() {
  const { state, act } = useStore()
  const nav = useNavigate()
  const [sp] = useSearchParams()
  const back = sp.get('back') || '/app/me'
  const who = state.role === 'poster' ? 'poster' : 'runner'
  const me = state.accounts[who]
  const [mode, setMode] = useState('id')
  const [sid, setSid] = useState(() => (state.tour.active ? '2023011456' : ''))
  const [college, setCollege] = useState(() => (state.tour.active ? COLLEGES[0] : ''))
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(null)
  const [code, setCode] = useState('')
  const [err, setErr] = useState({})
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const keepH = useRef(0)
  const reduce = useReducedMotion()
  // 刚认证完：徽章弹进来停 1.4 秒，再自动回到原来的页面
  const [sec, setSec] = useState(2)
  // 指引进行中不自动跳：屏幕上正圈着「现在回去接单」，按钮不能在他伸手时自己变掉
  useEffect(() => { if (!done || state.tour.active) return; const id = setTimeout(() => nav(back), 2000); const tick = setInterval(() => setSec((x) => Math.max(1, x - 1)), 1000); return () => { clearTimeout(id); clearInterval(tick) } }, [done, back, nav])

  if (done) {
    return (
      <div style={{ minHeight: keepH.current ? Math.max(0, keepH.current - 260) : undefined }}>
      <Panel className="px-6 py-7 text-center">
        <motion.img initial={reduce ? false : { scale: 0.4, rotate: -12, opacity: 0 }} animate={{ scale: 1, rotate: 0, opacity: 1 }} transition={{ type: 'spring', stiffness: 380, damping: 14 }}
          src={`${import.meta.env.BASE_URL}icons/trust-verify-v1.webp`} width={88} height={88} alt={tr('带对勾的学生证', 'Student ID with a check mark')} className="mx-auto size-22 object-contain" />
        <motion.p initial={reduce ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="mt-4 text-2xl font-bold">{tr('认证通过', "You're verified")}</motion.p>
        <motion.p initial={reduce ? false : { opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }} className="mt-1 text-muted">{tr('获得校园认证徽章，现在可以接单了', 'You got the Verified student badge. You can take orders now.')}</motion.p>
        <motion.div initial={reduce ? false : { opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="mt-4 flex items-center justify-center gap-2">
          <VerifiedBadge />
          <span className="tnum rounded-full bg-accent-soft px-3 py-1 text-sm font-bold text-accent">{EN ? `Credit ${CREDIT_INIT} · ${levelOf(CREDIT_INIT).name}` : <>信用 {CREDIT_INIT} ·「{levelOf(CREDIT_INIT).name}」</>}</span>
        </motion.div>
        <Btn className="mt-5" onClick={() => nav(back)}>{back.startsWith('/app/task') ? tr('现在回去接单', 'Back to the order') : tr('回去', 'Go back')}</Btn>
        {!state.tour.active && <p className="tnum mt-2 text-xs text-muted">{EN ? `Going back in ${sec}s` : <>{sec} 秒后自动回去</>}</p>}
      </Panel>
      </div>
    )
  }

  if (me.verified) {
    return (
      <Panel className="p-6 text-center">
        <img src={`${import.meta.env.BASE_URL}icons/trust-verify-v1.webp`} width={64} height={64} alt={tr('带对勾的学生证', 'Student ID with a check mark')} className="mx-auto size-16 object-contain" />
        <p className="mt-3 text-xl font-bold">{EN ? `${me.name} is a verified student` : <>{me.name} 已完成校园认证</>}</p>
        <p className="mt-1 text-muted">{EN ? `Verified with: ${me.verifyMethod}` : <>认证方式：{me.verifyMethod}</>}</p>
        <div className="mt-2"><VerifiedBadge /></div>
        <Btn className="mt-5" onClick={() => nav(back)}>{tr('继续', 'Continue')}</Btn>
      </Panel>
    )
  }

  const finish = (method) => {
    setBusy(true)
    // 记下表单这时有多高：换成「认证通过」后页面不突然变短，浏览器就不会一下子往上收
    setTimeout(() => { keepH.current = document.documentElement.scrollHeight; act('verify', { who, method }); setBusy(false); setDone(true) }, 900)
  }
  const submitId = () => {
    const e = {}
    if (!/^\d{8,12}$/.test(sid)) e.sid = tr('学号应为 8 到 12 位数字', 'Student ID should be 8 to 12 digits')
    if (!college) e.college = tr('请选择学院', 'Pick your school')
    setErr(e)
    if (!Object.keys(e).length) finish(tr('学号认证', 'Student ID'))
  }
  const sendCode = () => {
    if (!/^[\w.+-]+@[\w-]+(\.[\w-]+)*\.edu\.cn$/i.test(email)) return setErr({ email: tr('请使用以 .edu.cn 结尾的校园邮箱', 'Use your campus email ending in .edu.cn') })
    setErr({}); setSent(code4())
  }
  const submitEmail = () => {
    if (!code) return setErr({ code: tr('请输入邮件里的 4 位验证码', 'Enter the 4-digit code from the email') })
    if (code !== sent) return setErr({ code: tr('验证码不对，请检查后重新输入', "That code doesn't match. Check it and try again.") })
    finish(tr('校园邮箱认证', 'Campus email'))
  }

  return (
    <div className="space-y-5">
      <div>
        <div className="flex items-center gap-2">
          <button onClick={() => (window.history.state?.idx > 0 ? nav(-1) : nav("/app"))} aria-label={tr('返回', 'Back')} className="grid size-11 shrink-0 place-items-center rounded-full bg-surface ring-1 ring-line"><ArrowLeft size={20} weight="bold" /></button>
          <h1 className="font-display text-[28px] leading-tight">{tr('校园身份认证', 'Campus verification')}</h1>
        </div>
        <p className="mt-1 text-[15px] leading-relaxed text-muted">{EN ? `Only for students at this school. Get verified to earn the badge and a starting credit score of ${CREDIT_INIT}, then you can take orders. Until then you can only browse.` : <>只对本校学生开放。认证后获得徽章和初始信用 {CREDIT_INIT} 分，才能接单。未认证只能浏览。</>}</p>
      </div>
      <div className="grid grid-cols-2 rounded-full bg-sunken p-1">
        {[['id', tr('学号认证', 'Student ID'), IdentificationCard], ['email', tr('校园邮箱', 'Campus email'), EnvelopeSimple]].map(([k, l, I]) => (
          <button key={k} onClick={() => { setMode(k); setErr({}) }} aria-pressed={mode === k} className={`inline-flex h-10 items-center justify-center gap-1.5 rounded-full text-[15px] font-semibold ${mode === k ? 'bg-surface text-ink shadow-sm' : 'text-muted'}`}><I size={18} />{l}</button>
        ))}
      </div>
      {mode === 'id' ? (
        <div className="space-y-4">
          <Field label={tr('学号', 'Student ID')} error={err.sid} hint={tr('示例：2023011456，只存在这台设备上', 'Example: 2023011456. Only saved on this device.')}>
            <input inputMode="numeric" className={inputCls} value={sid} onChange={(e) => setSid(e.target.value.replace(/\D/g, ''))} maxLength={12} placeholder={tr('输入学号', 'Enter your student ID')} />
          </Field>
          <Field label={tr('学院', 'School')} error={err.college}>
            <div className="relative">
            <select className={`${inputCls} appearance-none pr-10`} value={college} onChange={(e) => setCollege(e.target.value)}>
              <option value="">{tr('请选择', 'Select')}</option>
              {COLLEGES.map((c) => <option key={c}>{c}</option>)}
            </select>
            <CaretDown size={18} weight="bold" className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-muted" />
            </div>
          </Field>
          <Btn size="lg" className="w-full" onClick={submitId} disabled={busy}>{busy ? tr('核验中……', 'Checking…') : tr('提交认证', 'Submit verification')}</Btn>
        </div>
      ) : (
        <div className="space-y-4">
          <Field label={tr('校园邮箱', 'Campus email')} error={err.email}>
            <div className="flex gap-2">
              <input type="email" className={inputCls} value={email} onChange={(e) => setEmail(e.target.value.trim())} placeholder="name@school.edu.cn" />
              <Btn variant="ghost" onClick={sendCode}>{sent ? tr('重发', 'Resend') : tr('发验证码', 'Send code')}</Btn>
            </div>
          </Field>
          {sent && (
            <Field label={tr('验证码', 'Code')} error={err.code} hint={tr(`会发到你的校园邮箱；这次的验证码是 ${sent}`, `We'd normally email this. For the demo, your code is ${sent}`)}>
              <input inputMode="numeric" className={`${inputCls} tnum tracking-[0.3em]`} value={code} maxLength={4} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} placeholder={tr('4 位数字', '4 digits')} />
            </Field>
          )}
          <Btn size="lg" className="w-full" onClick={submitEmail} disabled={!sent || busy}>{busy ? tr('核验中……', 'Checking…') : tr('完成认证', 'Finish verification')}</Btn>
        </div>
      )}
    </div>
  )
}
