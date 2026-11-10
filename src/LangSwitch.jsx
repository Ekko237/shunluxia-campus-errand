import { EN, setLang } from './i18n'

// 中英切换：显示另一种语言的名字，点一下整页换过去
export default function LangSwitch({ className = '', dark = false }) {
  return (
    <button type="button" lang={EN ? 'zh-CN' : 'en'} onClick={() => setLang(EN ? 'zh' : 'en')}
      aria-label={EN ? '切换到中文' : 'Switch to English'}
      className={`relative inline-flex h-9 min-w-11 shrink-0 items-center justify-center rounded-full px-3 text-[14px] font-semibold ring-1 transition active:scale-[0.97] before:absolute before:inset-x-0 before:-inset-y-1 before:content-[''] ${dark ? 'text-on-accent ring-on-accent/30 hover:bg-on-accent/10' : 'text-ink ring-line hover:bg-sunken'} ${className}`}>
      {EN ? '中文' : 'EN'}
    </button>
  )
}
