import { detourMetersMap } from './campusMap.js'
// 全部是演示用的示例数据，不代表真实统计。
import { createElement } from 'react'
import { EN, tr } from './i18n'

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
  express: { label: tr('快递', 'Parcel'), Icon: typeIcon('express', tr('快递纸箱', 'Parcel box')), base: 3 },
  buy: { label: tr('代买', 'Buy for me'), Icon: typeIcon('buy', tr('购物袋', 'Shopping bag')), base: 4 },
  seat: { label: tr('占座', 'Save a seat'), Icon: typeIcon('seat', tr('放着书的椅子', 'Chair with a book on it')), base: 4 },
  food: { label: tr('外卖', 'Takeout'), Icon: typeIcon('food', tr('外卖餐盒', 'Takeout box')), base: 2 },
  other: { label: tr('其他', 'Other'), Icon: typeIcon('other', tr('递出雨伞的手', 'Hand passing an umbrella')), base: 3 },
}
export const TYPE_KEYS = Object.keys(TYPES)

// 楼栋坐标单位：米（示例校园平面）
export const BUILDINGS = [
  { id: 'cainiao', name: tr('菜鸟驿站（东门）', 'Cainiao parcel station (East Gate)'), group: tr('取件点', 'Pickup points'), x: 900, y: 120 },
  { id: 'sf', name: tr('顺丰点（南门）', 'SF Express point (South Gate)'), group: tr('取件点', 'Pickup points'), x: -350, y: 300 },
  { id: 'jd', name: tr('京东快递柜（南门）', 'JD parcel lockers (South Gate)'), group: tr('取件点', 'Pickup points'), x: 300, y: 900 },
  { id: 'canteen1', name: tr('第一食堂', 'Dining hall 1'), group: tr('食堂/超市', 'Food and stores'), x: 420, y: 260 },
  { id: 'canteen2', name: tr('第二食堂', 'Dining hall 2'), group: tr('食堂/超市', 'Food and stores'), x: 160, y: 520 },
  { id: 'market', name: tr('教育超市', 'Campus store'), group: tr('食堂/超市', 'Food and stores'), x: 600, y: 480 },
  { id: 'gate', name: tr('北门外卖取餐点', 'North Gate takeout pickup'), group: tr('食堂/超市', 'Food and stores'), x: 60, y: -260 },
  { id: 'lib', name: tr('图书馆', 'Library'), group: tr('教学区', 'Academic area'), x: 300, y: 50 },
  { id: 'jiao1', name: tr('一教', 'Teaching Bldg 1'), group: tr('教学区', 'Academic area'), x: 980, y: -60 },
  { id: 'hall', name: tr('学术报告厅', 'Lecture hall'), group: tr('教学区', 'Academic area'), x: 700, y: 30 },
  { id: 'gym', name: tr('体育馆', 'Gym'), group: tr('教学区', 'Academic area'), x: -200, y: 700 },
  { id: 'zhu3', name: tr('竹园 3 号楼', 'Bamboo Court Bldg 3'), group: tr('宿舍区', 'Dorms'), x: 0, y: 0 },
  { id: 'mei5', name: tr('梅园 5 号楼', 'Plum Court Bldg 5'), group: tr('宿舍区', 'Dorms'), x: 120, y: 90 },
  { id: 'tao2', name: tr('桃园 2 号楼', 'Peach Court Bldg 2'), group: tr('宿舍区', 'Dorms'), x: -260, y: -180 },
  { id: 'lan1', name: tr('兰园 1 号楼', 'Orchid Court Bldg 1'), group: tr('宿舍区', 'Dorms'), x: -420, y: 120 },
  { id: 'yan', name: tr('研究生公寓 B 栋', 'Grad Housing B'), group: tr('宿舍区', 'Dorms'), x: -600, y: -380 },
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
  { id: 'w30', label: tr('30 分钟内', 'Within 30 min'), min: 30 },
  { id: 'w60', label: tr('1 小时内', 'Within 1 h'), min: 60 },
  { id: 'w120', label: tr('2 小时内', 'Within 2 h'), min: 120 },
  { id: 'today', label: tr('今天 22:00 前', 'Today by 22:00'), min: 360 },
  { id: 'tomorrow', label: tr('明早 8:00 前', 'Tomorrow by 8:00'), min: 720 },
]
// 「今天 22:00 前」「明早 8:00 前」按现在的时间算到那个点，不是固定 6、12 小时
export const winNow = (id) => {
  const w = WINDOWS.find((x) => x.id === id) || WINDOWS[1]
  return w.id === 'today' ? { ...w, min: untilMin(22, 0) } : w.id === 'tomorrow' ? { ...w, min: untilMin(8, 0) } : w
}

export const SIZES = [
  { id: 's', label: tr('小件', 'Small'), add: 0 },
  { id: 'm', label: tr('中件', 'Medium'), add: 2 },
  { id: 'l', label: tr('大件/重物', 'Large or heavy'), add: 5 },
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
// 英文界面：英文的同类说法也拦（不分大小写），中文词照样认
const BANNED_EN = ['take my exam', 'take my test', 'take my quiz', 'exam for me', 'test for me', 'quiz for me', 'sign in for me', 'check in for me', 'attendance for me', 'roll call', 'attend class for me', 'go to class for me',
  'do my homework', 'write my essay', 'write my paper', 'homework for me', 'essay for me', 'exam answers', 'test answers', 'cheat', 'cigarette', 'vape', 'tobacco', 'alcohol', 'liquor', 'beer', 'wine', 'fake review', 'fake order', 'knife', 'drugs']
const BANNED_LOOSE_EN = /\b(?:take|do|sit|write)\s+(?:my|his|her|their)\s+(?:exam|test|quiz|midterm|final|class|homework|essay|paper)s?\b/gi
export const findBanned = EN
  ? (text) => { const low = text.toLowerCase(); return [...new Set([...BANNED_EN.filter((w) => low.includes(w)), ...(low.match(BANNED_LOOSE_EN) || []), ...BANNED.filter((w) => text.includes(w)), ...(text.match(BANNED_LOOSE) || [])])] }
  : (text) => [...new Set([...BANNED.filter((w) => text.includes(w)), ...(text.match(BANNED_LOOSE) || [])])]

// 信用规则
export const CREDIT_INIT = 70
export const LEVELS = [
  { name: tr('受限', 'Restricted'), min: 0, cap: 0, desc: tr('暂停接单，只能浏览', 'Can\'t take orders, browse only'), badge: 'level-restricted', alt: tr('带锁的灰色盾牌', 'Gray shield with a lock') },
  { name: tr('新手', 'Newbie'), min: 60, cap: 8, desc: tr('可接赏金 ≤ ¥8 的单', 'Orders with a reward up to ¥8'), badge: 'level-newbie', alt: tr('冒芽的徽章', 'Badge with a sprout') },
  { name: tr('可靠', 'Reliable'), min: 72, cap: 15, desc: tr('可接赏金 ≤ ¥15 的单', 'Orders with a reward up to ¥15'), badge: 'level-reliable', alt: tr('带对勾的绿色盾牌', 'Green shield with a check') },
  { name: tr('金牌', 'Gold'), min: 85, cap: Infinity, desc: tr('不限金额，加急单优先推送', 'No reward cap, first to see urgent orders'), badge: 'level-gold', alt: tr('带皇冠的金牌', 'Gold medal with a crown') },
]
export const levelOf = (c) => [...LEVELS].reverse().find((l) => c >= l.min)
export const nextLevel = (c) => LEVELS.find((l) => l.min > c)
export const minCreditFor = (reward) => LEVELS.find((l) => l.min >= 60 && reward <= l.cap)?.min ?? 85

export const RULES_PLUS = [
  { delta: +2, label: tr('按时完成一单', 'Finish an order on time'), note: tr('在截止时间前提交送达凭证', 'Proof of delivery sent before the deadline') },
  { delta: +1, label: tr('收到好评', 'Get a good rating'), note: tr('对方打 4 到 5 星', '4 or 5 stars from the other side') },
]
// 发单人规则（双向信用）
export const POSTER_RULES_PLUS = [
  { delta: +1, label: tr('按时确认收货', 'Confirm on time'), note: tr('送达后 2 小时内确认', 'Within 2 h of delivery') },
  { delta: +1, label: tr('收到好评', 'Get a good rating'), note: tr('跑腿人打 4 到 5 星', '4 or 5 stars from the runner') },
]
export const POSTER_RULES_MINUS = [
  { delta: -5, label: tr('接单后取消', 'Cancel after it\'s taken'), note: tr('赏金的 30% 补偿给跑腿人', '30% of the reward goes to the runner') },
  { delta: -2, label: tr('超时不确认', 'Don\'t confirm in time'), note: tr('2 小时不确认，系统自动放款', 'After 2 h the payment is released automatically') },
  { delta: -5, label: tr('恶意申诉被驳回', 'Bad-faith dispute rejected'), note: tr('凭证有效，申诉不成立', 'The proof was valid') },
  { delta: -5, label: tr('描述与实际不符', 'Description didn\'t match'), note: tr('跑腿人申诉成立', 'The runner\'s claim was upheld') },
  { delta: -4, label: tr('收到差评', 'Get a bad rating'), note: tr('跑腿人打 1 到 2 星', '1 or 2 stars from the runner') },
]
// 发单人信用低于 70：单笔赏金上限 ¥10；低于 75：大厅给跑腿人显示「发单人信用偏低」
export const POSTER_LIMIT = { min: 70, cap: 10 }
export const POSTER_WARN = 75
export const COMPENSATE = 0.3
// 发单人的信用档位：说的是信用对「发单」意味着什么
export const POSTER_TIERS = [
  { name: tr('受限', 'Restricted'), min: 0, desc: tr('单笔赏金上限 ¥10', 'Reward capped at ¥10 per order'), badge: 'level-restricted', alt: tr('带锁的灰色盾牌', 'Gray shield with a lock') },
  { name: tr('需留意', 'Watch'), min: 70, desc: tr('跑腿人会看到「信用偏低」提醒', 'Runners see a "low credit" note'), badge: 'level-newbie', alt: tr('冒芽的徽章', 'Badge with a sprout') },
  { name: tr('良好', 'Good'), min: 75, desc: tr('正常发单，不受限制', 'Post as usual, no limits'), badge: 'level-reliable', alt: tr('带对勾的绿色盾牌', 'Green shield with a check') },
  { name: tr('优质', 'Top'), min: 85, desc: tr('进入跑腿人的「信用 ≥ 85」筛选，接单更快', 'Shows up in the runners\' "credit ≥ 85" filter, so orders get taken faster'), badge: 'level-gold', alt: tr('带皇冠的金牌', 'Gold medal with a crown') },
]
export const posterTierOf = (c) => [...POSTER_TIERS].reverse().find((l) => c >= l.min)
export const posterNextTier = (c) => POSTER_TIERS.find((l) => l.min > c)

export const RULES_MINUS = [
  { delta: -3, label: tr('超时送达', 'Late delivery'), note: tr('晚于截止时间才送到', 'Arrived after the deadline') },
  { delta: -5, label: tr('接单后爽约', 'No-show after taking it'), note: tr('接单后主动放弃或失联', 'Dropped the order or went silent') },
  { delta: -4, label: tr('收到差评', 'Get a bad rating'), note: tr('对方打 1 到 2 星', '1 or 2 stars from the other side') },
  { delta: -8, label: tr('申诉被判责任方', 'Found at fault in a dispute'), note: tr('平台核实后判定', 'Decided after a platform review') },
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
    timeline: [{ at: now() - (o.ago ?? 10) * M, text: tr('发布任务，赏金已托管', 'Order posted, reward held in escrow') }],
    ...o,
  }
}

// 演示数据按语言分开存，种子直接按当前语言生成
export function seedTasks() {
  if (EN) return [
    mk({ id: 's1', type: 'express', title: 'Grab a box of textbooks from the parcel station', from: 'cainiao', to: 'mei5', reward: 5, windowMin: 90, urgent: false, size: 's', note: 'One box of books, light enough to carry', room: 'Plum Court Bldg 5, Rm 412', posterName: 'Liang Xiaohe', posterCredit: 91, ago: 6 }),
    mk({ id: 's2', type: 'food', title: 'Takeout is at North Gate, bring it up', from: 'gate', to: 'tao2', reward: 3, windowMin: 25, urgent: true, size: 's', note: 'Yellow bag, order ending in 7731', room: 'Peach Court Bldg 2, Rm 608', posterName: 'Xu Yizhou', posterCredit: 83, ago: 3 }),
    mk({ id: 's3', type: 'buy', title: 'Soy sauce and 2 packs of tissues from the campus store', from: 'market', to: 'zhu3', reward: 6, windowMin: 240, urgent: false, size: 's', note: 'Haitian soy sauce please. I\'ll pay you back with the reward', room: 'Bamboo Court Bldg 3, Rm 215', posterName: 'Wen Qing', posterCredit: 95, ago: 22 }),
    mk({ id: 's4', type: 'seat', title: 'Save a window seat on Library 3F', from: 'lib', to: 'lib', reward: 4, windowMin: untilMin(7, 40), urgent: false, size: 's', note: 'Before 7:40 tomorrow, just leave a book on it', room: 'Library 3F study area', posterName: 'Zhou Yan', posterCredit: 88, ago: 40 }),
    mk({ id: 's5', type: 'express', title: 'Big SF parcel, a monitor, needs some muscle', from: 'sf', to: 'yan', reward: 15, windowMin: 180, urgent: false, size: 'l', note: 'About 4 kg, the box has a handle', room: 'Grad Housing B, Rm 1103', posterName: 'Cheng Li', posterCredit: 97, ago: 15 }),
    mk({ id: 's6', type: 'buy', title: 'Braised chicken rice from Dining hall 2', from: 'canteen2', to: 'jiao1', reward: 4, windowMin: 35, urgent: true, size: 's', note: 'Mildly spicy, no cilantro', room: 'Teaching Bldg 1, Rm 204, back row', posterName: 'Yu Xiaoyu', posterCredit: 68, ago: 4 }),
    mk({ id: 's7', type: 'other', title: 'Bring my umbrella to the gym entrance', from: 'lan1', to: 'gym', reward: 5, windowMin: 45, urgent: false, size: 's', note: 'The dorm manager has it, just give my name', room: 'Orchid Court Bldg 1, front desk', posterName: 'Le Zhixing', posterCredit: 86, ago: 9 }),
    mk({ id: 's8', type: 'seat', title: 'Save 2 front-row seats for tonight\'s talk', from: 'hall', to: 'hall', reward: 12, windowMin: 120, urgent: false, size: 's', note: 'Starts at 19:00, be there by 18:40', room: 'Lecture hall, first 3 rows', posterName: 'Wang Yifan (club)', posterCredit: 90, ago: 55 }),
  ]
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
      id: 'poster', name: tr('小满', 'Xiaoman'), role: tr('发单人', 'Requester'), avatar: 'student-city-1',
      verified: true, verifyMethod: tr('学号认证', 'Student ID'), credit: 88, balance: 50, frozen: 0,
      done: 0, ratings: [5, 5],
      ledger: [
        [2026, 10, 7, 12, -7, '发布「顺丰大件代取」托管，已放款给跑腿人', 'Posted, payment released to runner “SF big parcel pickup”'],
        [2026, 9, 21, 18, -3, '发布「外卖送上楼」托管，已放款给跑腿人', 'Posted, payment released to runner “Takeout up to my room”'],
        [2026, 4, 8, 16, 5, '取消「菜鸟驿站取快递」，托管退回', 'Cancelled, escrow refunded “Parcel station pickup”'],
        [2026, 4, 8, 9, -5, '发布「菜鸟驿站取快递」冻结托管', 'Posted, reward held in escrow “Parcel station pickup”'],
        [2026, 3, 15, 20, 30, '钱包充值', 'Wallet top-up'],
        [2025, 11, 20, 7, -4, '发布「图书馆占座」托管，已放款给跑腿人', 'Posted, payment released to runner “Library seat”'],
        [2025, 10, 12, 19, -6, '发布「教育超市带生抽」托管，已放款给跑腿人', 'Posted, payment released to runner “Soy sauce from the campus store”'],
        [2025, 9, 3, 10, 40, '钱包充值', 'Wallet top-up'],
      ].map(([y, mo, d, h, amount, zh, en]) => ({ at: new Date(y, mo - 1, d, h, 0).getTime(), amount, label: tr(zh, en), sample: true })),
      creditLog: [
        { at: new Date(2026, 9, 7, 13, 0).getTime(), delta: 1, label: tr('示例：「顺丰大件代取」按时确认收货', 'Sample: confirmed on time “SF big parcel pickup”') },
        { at: new Date(2026, 9, 7, 12, 55).getTime(), delta: 1, label: tr('示例：「顺丰大件代取」收到 5\u00a0星好评', 'Sample: got a 5-star rating “SF big parcel pickup”') },
        { at: new Date(2026, 8, 21, 19, 0).getTime(), delta: 1, label: tr('示例：「外卖送上楼」收到 5\u00a0星好评', 'Sample: got a 5-star rating “Takeout up to my room”') },
        { at: new Date(2025, 8, 3, 10, 0).getTime(), delta: 0, label: tr('老用户示例：之前已攒到 85 分', 'Longtime user sample: had already reached 85') },
      ],
    },
    runner: {
      id: 'runner', name: tr('阿远', 'Yuan'), role: tr('跑腿人', 'Runner'), avatar: 'canteen-study-1',
      verified: false, verifyMethod: null, credit: null, balance: 0, frozen: 0,
      done: 0, ratings: [], ledger: [], creditLog: [],
    },
  }
}

export const iconUrl = (name) => `${import.meta.env.BASE_URL}icons/${name}-v1.webp`
