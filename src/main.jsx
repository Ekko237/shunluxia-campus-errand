import { StrictMode, lazy, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter, Routes, Route } from 'react-router-dom'
import '@fontsource-variable/geist'
import './index.css'
import Landing from './landing/Landing.jsx'
// 部署后旧版本的分包文件会被删掉：页面若停在旧版本，按需加载原型会 404。
// 这时整页刷新一次拿到新版本；用 sessionStorage 防止反复刷新。
const AppRoot = lazy(() =>
  import('./app/AppRoot.jsx').then(
    (m) => { try { sessionStorage.removeItem('chunk-reload') } catch {} return m },
    (err) => {
      let reloaded = false
      try { reloaded = sessionStorage.getItem('chunk-reload') === '1'; sessionStorage.setItem('chunk-reload', '1') } catch {}
      if (!reloaded) { window.location.reload(); return new Promise(() => {}) }
      throw err
    },
  ),
)

// 原型分包一般在首页就预加载好了；真没加载完时只留底色，不放假的骨架屏
// 慢网时原型分包还没到：放一个和顶栏、列表同形状的骨架，不留整屏空白
function AppLoading() {
  return (
    <div className="min-h-[100dvh] bg-bg" aria-label="加载中" role="status">
      <div className="flex h-16 items-center justify-between border-b border-line px-4">
        <span className="flex items-center gap-2 text-lg font-bold"><img src={`${import.meta.env.BASE_URL}brand/logo-v2.png`} width={36} height={36} alt="" className="size-9" />顺路侠</span>
        <span className="h-10 w-36 animate-pulse rounded-full bg-sunken motion-reduce:animate-none" />
      </div>
      <div className="mx-auto max-w-xl space-y-3 p-4">
        {[0, 1, 2, 3].map((k) => <div key={k} className="h-28 animate-pulse rounded-2xl bg-surface ring-1 ring-line motion-reduce:animate-none" />)}
      </div>
    </div>
  )
}

try { sessionStorage.removeItem('stale-reload') } catch {}
// 带 ?reset=1 打开：把这台设备上的演示数据清空，回到第一次来的样子（会再问一次要不要指引），然后去掉这个参数
if (/[?&]reset=1\b/.test(window.location.search)) {
  try {
    for (const st of [localStorage, sessionStorage]) Object.keys(st).filter((k) => k.startsWith('shunluxia')).forEach((k) => st.removeItem(k))
  } catch { /* 无痕模式下没有本地存储 */ }
  window.history.replaceState(null, '', window.location.pathname + window.location.hash)
}
// 标题字加载期间给 <html> 挂 fl（index.css 里让替身字先斜过来），得意黑到了就摘掉
{
  const done = () => document.documentElement.classList.remove('fl')
  // 字体样式表是异步挂上的，不能只等一次 load：每 100ms 看一眼有没有哪片得意黑真的加载完了
  if (document.fonts) {
    document.documentElement.classList.add('fl')
    const t0 = Date.now()
    const tick = () => ([...document.fonts].some((f) => f.family.includes('Smiley') && f.status === 'loaded') || Date.now() - t0 > 3000 ? done() : setTimeout(tick, 100))
    tick()
  }
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <HashRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/thinking" element={<Landing page="thinking" />} />
        <Route path="/app/*" element={<Suspense fallback={<AppLoading />}><AppRoot /></Suspense>} />
        <Route path="*" element={<Landing />} />
      </Routes>
    </HashRouter>
  </StrictMode>,
)
