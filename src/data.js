import { detourMetersMap } from './campusMap.js'
// 全部是演示用的示例数据，不代表真实统计。
import { createElement } from 'react'

// 任务类型图标：生成图（public/icons/type-*-v1.webp），按 2x 导出
const typeIcon = (key, alt) => {
  const C = ({ size = 20 }) => createElement('img', {
    src: `${import.meta.env.BASE_URL}icons/type-${key}-v1.webp`, width: size, height: size, alt, 'aria-hidden': true,
    className: 'shrink-0 object-contain', style: { width: size * 1.25, height: size * 1.25, margin: -size * 0.125 },
  })
  C.displayName = `TypeIcon_${key}`
  return C
}

export const TYPES = {
  express: { label: '快递', Icon: typeIcon('express', '快递纸箱'), base: 3 },
  buy: { label: '代买', Icon: typeIcon('buy', '购物袋'), base: 4 },
  seat: { label: '占座', Icon: typeIcon('seat', '放着书的椅子'), base: 4 },
  food: { label: '外卖', Icon: typeIcon('food', '外卖餐盒'), base: 2 },
  other: { label: '其他', Icon: typeIcon('other', '递出雨伞的手'), base: 3 },
}
export const TYPE_KEYS = Object.keys(TYPES)

// 楼栋坐标单位：米（示例校园平面）
export const BUILDINGS = [
  { id: 'cainiao', name: '菜鸟驿站（东门）', group: '取件点', x: 900, y: 120 },
  { id: 'sf', name: '顺丰点（南门）', group: '取件点', x: -350, y: 300 },
  { id: 'jd', name: '京东快递柜（南门）', group: '取件点', x: 300, y: 900 },
  { id: 'canteen1', name: '第一食堂', group: '食堂/超市', x: 420, y: 260 },
  { id: 'canteen2', name: '第二食堂', group: '食堂/超市', x: 160, y: 520 },
  { id: 'market', name: '教育超市', group: '食堂/超市', x: 600, y: 480 },
  { id: 'gate', name: '北门外卖取餐点', group: '食堂/超市', x: 60, y: -260 },
  { id: 'lib', name: '图书馆', group: '教学区', x: 300, y: 50 },
  { id: 'jiao1', name: '一教', group: '教学区', x: 980, y: -60 },
  { id: 'hall', name: '学术报告厅', group: '教学区', x: 700, y: 30 },
  { id: 'gym', name: '体育馆', group: '教学区', x: -200, y: 700 },
  { id: 'zhu3', name: '竹园 3 号楼', group: '宿舍区', x: 0, y: 0 },
  { id: 'mei5', name: '梅园 5 号楼', group: '宿舍区', x: 120, y: 90 },
  { id: 'tao2', name: '桃园 2 号楼', group: '宿舍区', x: -260, y: -180 },
  { id: 'lan1', name: '兰园 1 号楼', group: '宿舍区', x: -420, y: 120 },
  { id: 'yan', name: '研究生公寓 B 栋', group: '宿舍区', x: -600, y: -380 },
]
export const B = Object.fromEntries(BUILDINGS.map((b) => [b.id, b]))
export const RUNNER_HOME = 'zhu3'

export function dist(a, b) {
  const p = B[a], q = B[b]
  if (!p || !q) return 0
  return Math.round(Math.hypot(p.x - q.x, p.y - q.y) / 10) * 10
}
// 顺路：按「我本来就要走的路」算这单让我多走几分钟（步行约 80 米/分钟）
// 顺路按真实路网算（src/campusMap.js 里沿路寻路），不是直线距离；步行约 80 米/分钟
export const detourMin = (a, b, t) => Math.max(1, Math.round(detourMetersMap(a, b, t) / 80))
export const detourMeters = (a, b, t) => detourMetersMap(a, b, t)
// 跑腿人常走的那条路（大厅里「换条路」会记住），没有就用示例路线
export const myRoute = () => {
  try { const r = JSON.parse(localStorage.getItem('shunluxia:myroute')); if (B[r?.from] && B[r?.to]) return r } catch { /* 用默认 */ }
  return { from: 'jiao1', to: 'mei5' }
}
export const onMyWay = (t) => { const r = myRoute(); return detourMin(r.from, r.to, t) <= 5 }
export const fmtDist = (m) => (m >= 1000 ? (m / 1000).toFixed(1) + ' km' : m + ' m')

export const WINDOWS = [
  { id: 'w30', label: '30 分钟内', min: 30 },
  { id: 'w60', label: '1 小时内', min: 60 },
  { id: 'w120', label: '2 小时内', min: 120 },
  { id: 'today', label: '今天 22:00 前', min: 360 },
  { id: 'tomorrow', label: '明早 8:00 前', min: 720 },
]
// 「今天 22:00 前」「明早 8:00 前」按现在的时间算到那个点，不是固定 6、12 小时
export const winNow = (id) => {
  const w = WINDOWS.find((x) => x.id === id) || WINDOWS[1]
  return w.id === 'today' ? { ...w, min: untilMin(22, 0) } : w.id === 'tomorrow' ? { ...w, min: untilMin(8, 0) } : w
}

export const SIZES = [
  { id: 's', label: '小件', add: 0 },
  { id: 'm', label: '中件', add: 2 },
  { id: 'l', label: '大件/重物', add: 5 },
]

// 建议价：类型底价 + 路程（每 400m +1）+ 加急 +2 + 体积
export function suggestPrice({ type, from, to, urgent, size }) {
  const d = dist(from, to) + dist(RUNNER_HOME, from) * 0.3
  const s = (TYPES[type]?.base ?? 3) + Math.floor(d / 400) + (urgent ? 2 : 0) + (type === 'seat' ? 0 : SIZES.find((x) => x.id === size)?.add ?? 0)
  return [s, s + 2]
}

// 预估接单时长（示例模型）：出价越接近/高于建议价越快，加急和长时间窗更快
export function estimateMinutes({ reward, suggested, urgent, windowMin }) {
  const ratio = Math.max(0.3, reward / suggested)
  // 建议价时约 6 到 10 分钟有人接，和「接单时长中位数不超过 10 分钟」的目标一致
  let m = 8 / Math.pow(ratio, 1.6)
  if (urgent) m *= 0.75
  if (windowMin >= 360) m *= 0.85
  const lo = Math.max(2, Math.round(m * 0.7))
  const hi = Math.max(lo + 2, Math.round(m * 1.3))
  return [lo, hi]
}

// 违规任务关键词拦截
export const BANNED = ['代考', '替考', '枪手', '代签到', '代打卡', '代点名', '代上课', '代课', '代写作业', '代写论文', '代写报告', '代做作业', '刷课', '代刷网课', '考试答案', '抄答案', '作弊',
  // 烟酒和违禁品不能代买代送，刷单也不行
  '香烟', '烟酒', '买烟', '带烟', '包烟', '电子烟', '买酒', '带酒', '白酒', '啤酒', '违禁', '刷单', '管制刀具']
// 除了原词，也认换个说法的：「帮我签个到」「替我上课」「帮考」这类「帮 / 替 / 代 + 签到 / 考 / 课 / 点名 / 打卡」
const BANNED_LOOSE = /(?:帮|替|代)(?:我|人|他|她)?(?:签个?到|考试?|上个?课(?![用的要本前后])|上节课(?![用的要])|课(?![用的要本前后])|点个?名|打个?卡|写个?作业)/g
export const findBanned = (text) => [...new Set([...BANNED.filter((w) => text.includes(w)), ...(text.match(BANNED_LOOSE) || [])])]

// 信用规则
export const CREDIT_INIT = 70
export const LEVELS = [
  { name: '受限', min: 0, cap: 0, desc: '暂停接单，只能浏览', badge: 'level-restricted', alt: '带锁的灰色盾牌' },
  { name: '新手', min: 60, cap: 8, desc: '可接赏金 ≤ ¥8 的单', badge: 'level-newbie', alt: '冒芽的徽章' },
  { name: '可靠', min: 72, cap: 15, desc: '可接赏金 ≤ ¥15 的单', badge: 'level-reliable', alt: '带对勾的绿色盾牌' },
  { name: '金牌', min: 85, cap: Infinity, desc: '不限金额，加急单优先推送', badge: 'level-gold', alt: '带皇冠的金牌' },
]
export const levelOf = (c) => [...LEVELS].reverse().find((l) => c >= l.min)
export const nextLevel = (c) => LEVELS.find((l) => l.min > c)
export const minCreditFor = (reward) => LEVELS.find((l) => l.min >= 60 && reward <= l.cap)?.min ?? 85

export const RULES_PLUS = [
  { delta: +2, label: '按时完成一单', note: '在截止时间前提交送达凭证' },
  { delta: +1, label: '收到好评', note: '对方打 4 到 5 星' },
]
// 发单人规则（双向信用）
export const POSTER_RULES_PLUS = [
  { delta: +1, label: '按时确认收货', note: '送达后 2 小时内确认' },
  { delta: +1, label: '收到好评', note: '跑腿人打 4 到 5 星' },
]
export const POSTER_RULES_MINUS = [
  { delta: -5, label: '接单后取消', note: '赏金的 30% 补偿给跑腿人' },
  { delta: -2, label: '超时不确认', note: '2 小时不确认，系统自动放款' },
  { delta: -5, label: '恶意申诉被驳回', note: '凭证有效，申诉不成立' },
  { delta: -5, label: '描述与实际不符', note: '跑腿人申诉成立' },
  { delta: -4, label: '收到差评', note: '跑腿人打 1 到 2 星' },
]
// 发单人信用低于 70：单笔赏金上限 ¥10；低于 75：大厅给跑腿人显示「发单人信用偏低」
export const POSTER_LIMIT = { min: 70, cap: 10 }
export const POSTER_WARN = 75
export const COMPENSATE = 0.3
// 发单人的信用档位：说的是信用对「发单」意味着什么
export const POSTER_TIERS = [
  { name: '受限', min: 0, desc: '单笔赏金上限 ¥10', badge: 'level-restricted', alt: '带锁的灰色盾牌' },
  { name: '需留意', min: 70, desc: '跑腿人会看到「信用偏低」提醒', badge: 'level-newbie', alt: '冒芽的徽章' },
  { name: '良好', min: 75, desc: '正常发单，不受限制', badge: 'level-reliable', alt: '带对勾的绿色盾牌' },
  { name: '优质', min: 85, desc: '进入跑腿人的「信用 ≥ 85」筛选，接单更快', badge: 'level-gold', alt: '带皇冠的金牌' },
]
export const posterTierOf = (c) => [...POSTER_TIERS].reverse().find((l) => c >= l.min)
export const posterNextTier = (c) => POSTER_TIERS.find((l) => l.min > c)

export const RULES_MINUS = [
  { delta: -3, label: '超时送达', note: '晚于截止时间才送到' },
  { delta: -5, label: '接单后爽约', note: '接单后主动放弃或失联' },
  { delta: -4, label: '收到差评', note: '对方打 1 到 2 星' },
  { delta: -8, label: '申诉被判责任方', note: '平台核实后判定' },
]

const now = () => Date.now()
const M = 60000

let seq = 100
export const nextId = () => 't' + (seq++) + Math.random().toString(36).slice(2, 6)
export const code4 = () => String(Math.floor(1000 + Math.random() * 9000))

// 占座这类「明早之前」的单：截止定在下一个 7:40，不管现在几点打开，都不会出现「明天 05:00 前」这种怪时间
export const untilMin = (hh, mm) => { const d = new Date(); const t = new Date(d); t.setHours(hh, mm, 0, 0); if (t - d < 60 * M) t.setDate(t.getDate() + 1); return Math.round((t - d) / M) }

function mk(o) {
  return {
    status: 'open', picked: false, proof: null, runnerId: null, late: false,
    ratingByPoster: null, ratingByRunner: null, dispute: null,
    createdAt: now() - (o.ago ?? 10) * M,
    deadline: now() + o.windowMin * M,
    deliverCode: code4(),
    private: { code: o.type === 'express' ? `${3 + (o.id.length % 5)}-2-${code4()}` : null, room: o.room, phone: '170 0000 ' + code4() },
    timeline: [{ at: now() - (o.ago ?? 10) * M, text: '发布任务，赏金已托管' }],
    ...o,
  }
}

export function seedTasks() {
  return [
    mk({ id: 's1', type: 'express', title: '菜鸟驿站帮取一箱教材', from: 'cainiao', to: 'mei5', reward: 5, windowMin: 90, urgent: false, size: 's', note: '一箱书，不重，抱得动', room: '梅园 5 号楼 412', posterName: '梁小禾', posterCredit: 91, ago: 6 }),
    mk({ id: 's2', type: 'food', title: '外卖到北门了，帮忙拎上楼', from: 'gate', to: 'tao2', reward: 3, windowMin: 25, urgent: true, size: 's', note: '黄色袋子，尾号 7731', room: '桃园 2 号楼 608', posterName: '许一舟', posterCredit: 83, ago: 3 }),
    mk({ id: 's3', type: 'buy', title: '教育超市带一瓶生抽和两包抽纸', from: 'market', to: 'zhu3', reward: 6, windowMin: 240, urgent: false, size: 's', note: '生抽要海天的，钱到了一起转', room: '竹园 3 号楼 215', posterName: '温晴', posterCredit: 95, ago: 22 }),
    mk({ id: 's4', type: 'seat', title: '图书馆三楼占一个靠窗座位', from: 'lib', to: 'lib', reward: 4, windowMin: untilMin(7, 40), urgent: false, size: 's', note: '明早 7:40 前，放本书就行', room: '图书馆 3F 自习区', posterName: '周砚', posterCredit: 88, ago: 40 }),
    mk({ id: 's5', type: 'express', title: '顺丰大件显示器，需要力气', from: 'sf', to: 'yan', reward: 15, windowMin: 180, urgent: false, size: 'l', note: '箱子大约 8 斤，有提手', room: '研究生公寓 B 栋 1103', posterName: '程立', posterCredit: 97, ago: 15 }),
    mk({ id: 's6', type: 'buy', title: '二食堂带一份黄焖鸡米饭', from: 'canteen2', to: 'jiao1', reward: 4, windowMin: 35, urgent: true, size: 's', note: '微辣，不要香菜', room: '一教 204 教室后排', posterName: '于小渔', posterCredit: 68, ago: 4 }),
    mk({ id: 's7', type: 'other', title: '把雨伞送到体育馆门口', from: 'lan1', to: 'gym', reward: 5, windowMin: 45, urgent: false, size: 's', note: '伞在宿管阿姨那里，报我名字', room: '兰园 1 号楼宿管室', posterName: '乐知行', posterCredit: 86, ago: 9 }),
    mk({ id: 's8', type: 'seat', title: '今晚讲座帮占前排两个位', from: 'hall', to: 'hall', reward: 12, windowMin: 120, urgent: false, size: 's', note: '19:00 开始，18:40 前到', room: '学术报告厅前三排', posterName: '王一凡（社团）', posterCredit: 90, ago: 55 }),
  ]
}

export function seedAccounts() {
  return {
    poster: {
      id: 'poster', name: '小满', role: '发单人', avatar: 'student-city-1',
      verified: true, verifyMethod: '学号认证', credit: 88, balance: 50, frozen: 0,
      done: 0, ratings: [5, 5],
      ledger: [
        [2026, 10, 7, 12, -7, '发布「顺丰大件代取」托管，已放款给跑腿人'],
        [2026, 9, 21, 18, -3, '发布「外卖送上楼」托管，已放款给跑腿人'],
        [2026, 4, 8, 16, 5, '取消「菜鸟驿站取快递」，托管退回'],
        [2026, 4, 8, 9, -5, '发布「菜鸟驿站取快递」冻结托管'],
        [2026, 3, 15, 20, 30, '钱包充值'],
        [2025, 11, 20, 7, -4, '发布「图书馆占座」托管，已放款给跑腿人'],
        [2025, 10, 12, 19, -6, '发布「教育超市带生抽」托管，已放款给跑腿人'],
        [2025, 9, 3, 10, 40, '钱包充值'],
      ].map(([y, mo, d, h, amount, label]) => ({ at: new Date(y, mo - 1, d, h, 0).getTime(), amount, label, sample: true })),
      creditLog: [
        { at: new Date(2026, 9, 7, 13, 0).getTime(), delta: 1, label: '示例：「顺丰大件代取」按时确认收货' },
        { at: new Date(2026, 9, 7, 12, 55).getTime(), delta: 1, label: '示例：「顺丰大件代取」收到 5\u00a0星好评' },
        { at: new Date(2026, 8, 21, 19, 0).getTime(), delta: 1, label: '示例：「外卖送上楼」收到 5\u00a0星好评' },
        { at: new Date(2025, 8, 3, 10, 0).getTime(), delta: 0, label: '老用户示例：之前已攒到 85 分' },
      ],
    },
    runner: {
      id: 'runner', name: '阿远', role: '跑腿人', avatar: 'canteen-study-1',
      verified: false, verifyMethod: null, credit: null, balance: 0, frozen: 0,
      done: 0, ratings: [], ledger: [], creditLog: [],
    },
  }
}

export const iconUrl = (name) => `${import.meta.env.BASE_URL}icons/${name}-v1.webp`
