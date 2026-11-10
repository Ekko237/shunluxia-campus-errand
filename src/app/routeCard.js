import { routePath, PLACES } from '../campusMap'
import { EN, tr } from '../i18n'

// 今日顺路卡：走完一单后存下来的一张 1080×1350 图。上面是校园地图上这一单走的路（阿远自己的路是黑点线，捎快递那段是亮绿实线），
// 下面是信用的大数字和这一单的钱，可以发给同学看。全部在浏览器里用 canvas 画，不上传任何东西
const BASE = import.meta.env.BASE_URL
const W = 1080, H = 1350
const SANS = '"Geist Variable", "PingFang SC", "Noto Sans SC", "Microsoft YaHei", sans-serif'
const DISPLAY = '"Smiley Sans Oblique", "PingFang SC", sans-serif'

function load(src) {
  return new Promise((ok, fail) => { const im = new Image(); im.onload = () => ok(im); im.onerror = () => fail(new Error(tr(`图片没加载出来：${src}`, `Image failed to load: ${src}`))); im.src = src })
}
function rounded(ctx, x, y, w, h, r) {
  ctx.beginPath()
  ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}
// 英文比中文长：量一下宽度，超出 maxW 就按比例把字号缩小，保证不出画布
function fitFont(ctx, text, weight, size, maxW) {
  ctx.font = `${weight} ${size}px ${SANS}`
  const w = ctx.measureText(text).width
  if (w > maxW) ctx.font = `${weight} ${Math.floor(size * maxW / w)}px ${SANS}`
}

// route：阿远常走的路 { from, to }；task：这一单；credit：{ from, to, delta }；names：楼名
export async function routeCardBlob({ route, task, credit, fromName, toName, who }) {
  await Promise.all([document.fonts.load(`220px ${DISPLAY}`, `+${credit.delta}${credit.from}${credit.to}→顺路卡`), ...(EN ? [500, 600, 700].map((w) => document.fonts.load(`${w} 40px ${SANS}`, 'Shunluxia')) : []), document.fonts.ready])
  const [map, runner, logo] = await Promise.all([load(`${BASE}images/campus-map-v3.webp`), load(`${BASE}brand/runner-v1.webp`), load(`${BASE}brand/logo-v2.png`)])
  const cv = document.createElement('canvas')
  cv.width = W; cv.height = H
  const ctx = cv.getContext('2d')
  ctx.fillStyle = '#0a4f39'
  ctx.fillRect(0, 0, W, H)

  // 页眉：logo 和名字
  ctx.drawImage(logo, 72, 64, 72, 72)
  ctx.fillStyle = '#f6fbf8'
  ctx.font = `700 40px ${SANS}`
  ctx.textBaseline = 'middle'
  if (EN) fitFont(ctx, 'Shunluxia · Today\'s route card', 700, 40, W - 72 - 164)
  ctx.fillText(tr('顺路侠 · 今日顺路卡', 'Shunluxia · Today\'s route card'), 164, 101)

  // 地图：把阿远的路和捎快递那段都框进来，按画框比例裁一块
  const mine = routePath(route.from, route.to).pts
  const carry = routePath(task.from, task.to).pts
  const all = [...mine, ...carry]
  const xs = all.map((p) => p[0]), ys = all.map((p) => p[1])
  const bx = 72, by = 176, bw = 936, bh = 600
  let sw = Math.max(...xs) - Math.min(...xs) + 220, sh = sw * (bh / bw)
  if (sh < Math.max(...ys) - Math.min(...ys) + 220) { sh = Math.max(...ys) - Math.min(...ys) + 220; sw = sh * (bw / bh) }
  sw = Math.min(sw, 1600); sh = Math.min(sh, 900)
  const sx = Math.max(0, Math.min(1600 - sw, (Math.min(...xs) + Math.max(...xs)) / 2 - sw / 2))
  const sy = Math.max(0, Math.min(900 - sh, (Math.min(...ys) + Math.max(...ys)) / 2 - sh / 2))
  const k = bw / sw
  const px = ([x, y]) => [bx + (x - sx) * k, by + (y - sy) * k]
  ctx.save()
  rounded(ctx, bx, by, bw, bh, 36)
  ctx.clip()
  ctx.drawImage(map, sx, sy, sw, sh, bx, by, bw, bh)
  ctx.lineCap = 'round'; ctx.lineJoin = 'round'
  const stroke = (pts, color, width, dash) => { ctx.beginPath(); pts.forEach((p, i) => { const [x, y] = px(p); if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y) }); ctx.strokeStyle = color; ctx.lineWidth = width; ctx.setLineDash(dash); ctx.stroke() }
  stroke(mine, 'rgba(24,25,26,0.85)', 10, [1, 22])
  stroke(carry, '#ffffff', 22, [])
  stroke(carry, '#0b7a55', 13, [])
  ctx.setLineDash([])
  const dot = (p, fill) => { const [x, y] = px(p); ctx.beginPath(); ctx.arc(x, y, 15, 0, Math.PI * 2); ctx.fillStyle = fill; ctx.fill(); ctx.lineWidth = 6; ctx.strokeStyle = '#ffffff'; ctx.stroke() }
  dot(carry[0], '#18191a')
  dot(carry[carry.length - 1], '#0b7a55')
  ctx.restore()
  // 阿远站在送达的门口
  const door = PLACES[task.to]?.door || carry[carry.length - 1]
  const [rx, ry] = px(door)
  const rh = 190, rw = rh * (runner.width / runner.height)
  ctx.shadowColor = 'rgba(0,0,0,0.35)'; ctx.shadowBlur = 24; ctx.shadowOffsetY = 12
  ctx.drawImage(runner, Math.min(bx + bw - rw - 16, Math.max(bx + 16, rx - rw / 2)), Math.min(by + bh - rh - 12, ry - rh * 0.92), rw, rh)
  ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetY = 0

  // 大数字：这一单让信用涨了多少
  ctx.textBaseline = 'alphabetic'
  ctx.fillStyle = '#8fe3bb'
  ctx.font = `220px ${DISPLAY}`
  const big = `${credit.delta > 0 ? '+' : ''}${credit.delta}`
  ctx.fillText(big, 64, 1040)
  const bigW = ctx.measureText(big).width
  ctx.fillStyle = '#f6fbf8'
  ctx.font = `700 46px ${SANS}`
  if (EN) fitFont(ctx, `${who}'s credit`, 700, 46, W - 72 - (64 + bigW + 36))
  ctx.fillText(tr(`${who}的信用`, `${who}'s credit`), 64 + bigW + 36, 940)
  ctx.font = `700 64px ${SANS}`
  ctx.fillText(`${credit.from} → ${credit.to}`, 64 + bigW + 36, 1020)

  // 这一单：从哪到哪、赏金、日期
  ctx.fillStyle = 'rgba(246,251,248,0.92)'
  ctx.font = `600 38px ${SANS}`
  const leg = tr(`${fromName} → ${toName} · 顺手捎上 ¥${task.reward}`, `${fromName} → ${toName} · ¥${task.reward} on the way`)
  if (EN) fitFont(ctx, leg, 600, 38, W - 72 * 2)
  ctx.fillText(leg, 72, 1130)
  ctx.fillStyle = 'rgba(246,251,248,0.75)'
  ctx.font = `500 32px ${SANS}`
  const d = new Date()
  const foot = `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')} · ${tr('本来就要经过，顺手捎一下', 'You\'re walking past anyway. Grab it on the way.')}`
  if (EN) fitFont(ctx, foot, 500, 32, W - 72 * 2)
  ctx.fillText(foot, 72, 1250)
  return new Promise((ok, fail) => cv.toBlob((b) => (b ? ok(b) : fail(new Error(tr('顺路卡没画出来', 'Route card failed to render')))), 'image/png'))
}
