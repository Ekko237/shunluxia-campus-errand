import { useNavigate } from 'react-router-dom'
import { TrendDown as PhTrendDown, Camera as PhCamera } from '@phosphor-icons/react'
import { ArrowLeft } from '@phosphor-icons/react'
import { useMe } from '../store'
import { LEVELS, RULES_PLUS, RULES_MINUS, POSTER_RULES_PLUS, POSTER_RULES_MINUS, POSTER_TIERS, CREDIT_INIT, iconUrl, posterTierOf } from '../data'
import { Panel, gi, pi } from '../ui'
import { EN, tr } from '../i18n'
const TrendUp = gi('trend-up', 'v2')
const TrendDown = pi(PhTrendDown, 'text-danger')
const ShieldCheck = gi('shield-check')
const LockKey = gi('lock')
const Camera = pi(PhCamera)
const Scales = gi('scales')

export default function CreditRules() {
  const nav = useNavigate()
  const me = useMe()
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <button onClick={() => (window.history.state?.idx > 0 ? nav(-1) : nav("/app"))} aria-label={tr('返回', 'Back')} className="grid size-11 place-items-center rounded-full bg-surface ring-1 ring-line"><ArrowLeft size={20} weight="bold" /></button>
        <h1 className="font-display text-[28px] leading-tight">{tr('双向信用分怎么算', 'How two-way credit works')}</h1>
      </div>
      <p className="text-[15px] leading-relaxed text-muted">{EN ? `Scores go up to 100, and you start at ${CREDIT_INIT} after campus verification. Requesters and Runners both have a credit score. It only moves with how you follow through and how you're rated. Money can't buy it.` : <>满分 100，校园认证后初始 {CREDIT_INIT} 分。发单人和跑腿人都有信用分，只由履约和评价决定，不能花钱买。</>}</p>

      <section>
        <h2 className="mb-3 text-lg font-bold">{tr('跑腿人：等级与接单权限', 'Runners: levels and what you can take')}</h2>
        <div className="grid grid-cols-2 gap-2">
          {[...LEVELS].reverse().map((l) => {
            const cur = me.id === 'runner' && me.credit != null && me.credit >= l.min && (LEVELS[LEVELS.indexOf(l) + 1]?.min ?? 101) > me.credit
            return (
              <div key={l.name} className={`rounded-2xl p-4 ${cur ? 'bg-accent text-on-accent' : 'bg-surface ring-1 ring-line'}`}>
                <img src={iconUrl(l.badge)} width={48} height={48} alt={l.alt} className="mb-2 size-12 object-contain" />
                <p className="text-lg font-bold">{l.name}{cur && tr('（你）', ' (you)')}</p>
                <p className="tnum text-sm font-semibold opacity-80">{l.min === 0 ? tr('低于 60 分', 'Below 60') : tr(`${l.min} 分以上`, `${l.min} and up`)}</p>
                <p className="mt-1 text-[15px]">{l.desc}</p>
              </div>
            )
          })}
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-2">
        {[[TrendUp, tr('跑腿人加分', 'Runner: earn points'), RULES_PLUS, 'text-accent'], [TrendDown, tr('跑腿人减分', 'Runner: lose points'), RULES_MINUS, 'text-danger'], [TrendUp, tr('发单人加分', 'Requester: earn points'), POSTER_RULES_PLUS, 'text-accent'], [TrendDown, tr('发单人减分', 'Requester: lose points'), POSTER_RULES_MINUS, 'text-danger']].map(([I, h, rules, c]) => (
          <section key={h}>
            <h2 className="mb-3 flex items-center gap-2 text-lg font-bold"><I size={22} className={c} />{h}</h2>
            <Panel className="divide-y divide-line">
              {rules.map((r) => (
                <div key={r.label} className="flex items-center gap-3 p-4">
                  <div className="flex-1"><p className="text-[15px] font-semibold">{r.label}</p><p className="text-sm text-muted">{r.note}</p></div>
                  <span className={`tnum text-xl font-bold ${c}`}>{r.delta > 0 ? '+' : ''}{r.delta}</span>
                </div>
              ))}
            </Panel>
          </section>
        ))}
      </div>

      <section>
        <h2 className="mb-3 text-lg font-bold">{tr('发单人：信用档位', 'Requesters: credit tiers')}</h2>
        <div className="grid grid-cols-2 gap-2">
          {/* 发单人身份看这页：高亮自己所在的发单人档位（跑腿人等级那块不高亮） */}
          {[...POSTER_TIERS].reverse().map((l) => {
            const cur = me.id === 'poster' && me.credit != null && posterTierOf(me.credit)?.name === l.name
            return (
            <div key={l.name} className={`rounded-2xl p-4 ${cur ? 'bg-accent text-on-accent' : 'bg-surface ring-1 ring-line'}`}>
              <img src={iconUrl(l.badge)} width={40} height={40} alt={l.alt} className="mb-2 size-10 object-contain" />
              <p className="text-lg font-bold">{l.name}{cur && tr('（你）', ' (you)')}</p>
              <p className={`tnum text-sm font-semibold ${cur ? 'opacity-80' : 'text-muted'}`}>{l.min === 0 ? tr('低于 70 分', 'Below 70') : tr(`${l.min} 分以上`, `${l.min} and up`)}</p>
              <p className="mt-1 text-[15px]">{l.desc}</p>
            </div>
            )
          })}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-bold">{tr('另外四道保护', 'Four more safeguards')}</h2>
        <div className="space-y-2">
          {(EN ? [['escrow', 'A shield guarding a coin', 'Reward escrow', 'The reward is held in escrow when you post and released after delivery is confirmed. If no one confirms within 2 hours, the payment is released automatically.'], ['privacy', 'A padlock and key', 'Tiered privacy', 'The pickup code, dorm room and phone number show only after the order is accepted, and hide again when it ends. Calls go through a masked number.'], ['proof', 'A camera taking a photo of a parcel', 'Proof of delivery', 'Check the delivery code in person, or take a photo as proof. It settles any dispute.'], ['dispute', 'A pair of scales', 'Disputes', 'The reward stays on hold during a dispute and the platform decides who is at fault: a Runner at fault loses 8, a Requester filing in bad faith loses 5.']] : [['escrow', '护着硬币的盾牌', '赏金托管', '发布即冻结，确认送达才放款；2 小时不确认自动放款。'], ['privacy', '挂锁和钥匙', '隐私分级', '取件码、宿舍号、电话接单后才可见，结束自动隐藏；电话走虚拟号。'], ['proof', '拍下包裹的相机', '送达凭证', '当面核验送达码，或拍照留证，纠纷时作为依据。'], ['dispute', '天平', '申诉', '申诉期间赏金继续冻结，平台判责：跑腿人被判责 -8，发单人恶意申诉 -5。']]).map(([k, alt, t, d]) => (
            <Panel key={t} className="flex gap-3 p-4">
              <img src={`${import.meta.env.BASE_URL}icons/trust-${k}-v1.webp`} width={40} height={40} alt={alt} className="size-10 shrink-0 object-contain" />
              <div><p className="text-[15px] font-semibold">{t}</p><p className="text-[15px] text-muted">{d}</p></div>
            </Panel>
          ))}
        </div>
      </section>
    </div>
  )
}
