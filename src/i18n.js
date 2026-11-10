// 中英两种语言：打开时定一次，切换就整页重新加载（演示数据也按语言分开存，免得中英混在一起）
// 定语言的顺序：网址里的 ?lang= → 上次手动选的 → 浏览器语言（中文浏览器看中文，其余看英文）
const KEY = 'ce-lang'
const fromUrl = new URLSearchParams(window.location.search).get('lang')

function detect() {
  if (fromUrl === 'en' || fromUrl === 'zh') {
    try { localStorage.setItem(KEY, fromUrl) } catch { /* 无痕模式存不了，只管这一次 */ }
    return fromUrl
  }
  try {
    const saved = localStorage.getItem(KEY)
    if (saved === 'en' || saved === 'zh') return saved
  } catch { /* 读不到就看浏览器语言 */ }
  const langs = navigator.languages?.length ? navigator.languages : [navigator.language || 'zh']
  return langs.some((l) => /^zh\b/i.test(l)) ? 'zh' : 'en'
}

export const LANG = detect()
export const EN = LANG === 'en'
document.documentElement.lang = EN ? 'en' : 'zh-CN'

// tr('中文', 'English')：按当前语言挑一句
export const tr = (zh, en) => (EN ? en : zh)

// 换语言：记下选择，网址带上 ?lang=，整页重新加载
export function setLang(lang) {
  try { localStorage.setItem(KEY, lang) } catch { /* 存不了就只靠网址参数 */ }
  const p = new URLSearchParams(window.location.search)
  p.set('lang', lang)
  window.location.replace(`${window.location.pathname}?${p}${window.location.hash}`)
}
