import { tr } from '../i18n'

// 一单七章的文案和凭证上的数：首页一镜到底（OneTake.jsx）照着它讲，一章一张字幕卡、凭证一行行变

// 七段：每段一句话的事 + 被划掉的那种「怕」 + 背后的产品设计
export const CH = [
  {
    k: 'scene', icon: 'type-express-v1', alt: tr('纸箱快递', 'Cardboard parcel'), kicker: tr('跟着一单往下走', 'Follow one order'),
    t: tr('快递在驿站，小满在宿舍', 'Parcels at the station, Xiaoman in her dorm'), hl: tr('驿站', 'station'),
    d: tr('小满两个快递在菜鸟驿站放了三天，驿站 18:00 关门。找室友要欠人情，找陌生人又怕取件码被乱用。', "Xiaoman's two parcels have sat at the Cainiao parcel station for three days, and it closes at 18:00. Asking a roommate means owing a favor. Asking a stranger means handing out her pickup code."),
    note: [tr('为什么叫「顺路」', 'Why "on your way"'), tr('大厅按「捎上这单要多走几分钟」排序，5 分钟以内才算顺路；本来就要走这条路的人，赏金低一点也愿意接。', 'The order board sorts by how many extra minutes an order adds. Under 5 minutes counts as on your way. If you walk that route anyway, a small reward is still worth it.')],
  },
  {
    k: 'publish', icon: 'trust-escrow-v1', alt: tr('护着硬币的盾牌', 'Shield guarding a coin'), kicker: tr('发布', 'Post'), fear: tr('怕付了钱没人管', 'What if I pay and nobody shows up'),
    t: tr('发一单 ¥5，钱先冻结', 'Post for ¥5, the reward is held'), hl: tr('钱先冻结', 'the reward is held'),
    d: tr('选「取快递」模板，填楼栋和截止时间。赏金在发布那一刻就冻结在平台，谁也拿不走。', 'Pick the Parcel template, add the building and a deadline. The reward is held in escrow the moment you post, so nobody can take it.'),
    note: [tr('赏金托管', 'Reward escrow'), tr('确认送达才放款；发单人 2 小时不确认，系统自动放款，跑腿的人也不怕白跑。', "The payment is released only after delivery is confirmed. If the requester doesn't confirm within 2 hours, it releases automatically, so runners never walk for nothing.")],
  },
  {
    k: 'match', icon: 'trust-verify-v1', alt: tr('带对勾的学生证', 'Student ID with a check mark'), kicker: tr('顺路', 'On the way'), fear: tr('怕对方是校外的人', "What if they're not a student"),
    t: tr('阿远一教下课，正好顺路', "Yuan's class ends, and he's on the way"), hl: tr('正好顺路', 'on the way'),
    d: tr('阿远 17:50 在一教下课，本来就要走回梅园，路过驿站只多走 1 分钟。大厅把和他顺路的单排在最前面。', 'Yuan gets out of Teaching Bldg 1 at 17:50 and is walking back to Plum Court anyway. Stopping at the station adds just 1 minute. The order board puts orders on his way at the top.'),
    note: [tr('认证和门槛', 'Verification and limits'), tr('学号或 .edu.cn 邮箱认证后才能接单；60 分起能接 ¥8 以内的单，72 分起放宽到 ¥15。', 'Taking orders requires campus verification with a student ID or .edu.cn email. A credit score of 60 unlocks orders up to ¥8, and 72 unlocks up to ¥15.')],
  },
  {
    k: 'code', icon: 'trust-privacy-v1', alt: tr('挂锁和钥匙', 'Padlock and key'), kicker: tr('接单', 'Accept'), fear: tr('怕取件码和宿舍号被乱传', 'What if my code and room number get passed around'),
    t: tr('接单那一刻，取件码才出现', 'Accept, then the pickup code appears'), hl: tr('取件码', 'pickup code'),
    d: tr('阿远接单，到驿站报 6-2-3108 取件。接单之前，大厅里只看得到「梅园」，楼号和门牌都打了码。', 'Yuan accepts the order and gives 6-2-3108 at the station. Before that, the order board only shows "Plum Court". The building and room number stay hidden.'),
    note: [tr('隐私分级', 'Tiered privacy'), tr('取件码和宿舍号只给接单的人看，订单结束自动收回；电话一律走虚拟号。', 'Only the runner sees the pickup code and room number, and both are taken back when the order ends. Calls always go through a masked number.')],
  },
  {
    k: 'deliver', icon: 'trust-dispute-v1', alt: tr('天平', 'Balance scale'), kicker: tr('送达', 'Deliver'), fear: tr('怕出了问题说不清', "What if something goes wrong and it's my word against theirs"),
    t: tr('捎着快递走回梅园', 'Carrying the parcel back to Plum Court'), hl: tr('走回梅园', 'Plum Court'),
    d: tr('绿色这一段，是阿远捎着小满的快递走的路。到楼下，小满当面报出 4 位送达码，或者他拍照放门口。', "The green line is the stretch Yuan walks with Xiaoman's parcel. Downstairs, Xiaoman gives him the 4-digit delivery code in person, or he leaves it at her door with a photo."),
    note: [tr('送达凭证与申诉', 'Proof of delivery and disputes'), tr('送达码当面核验，或拍照留证；有问题就申诉，申诉期间钱继续冻结，平台判责。', 'The delivery code is checked in person, or a photo is kept as proof. If something is off, file a dispute: the money stays held while the platform decides.')],
  },
  {
    k: 'pay', icon: 'step-confirm-v1', alt: tr('两只手传递硬币', 'Two hands passing a coin'), kicker: tr('放款', 'Pay'), fear: tr('怕钱放了，信息还留在别人手里', 'What if my info stays with them after I pay'),
    t: tr('确认收货，¥5 放给阿远', 'Confirm, and ¥5 goes to Yuan'), hl: tr('¥5 放给阿远', '¥5 goes to Yuan'),
    d: tr('小满看过东西没问题，点一下确认，托管的 ¥5 当场转给阿远。', 'Xiaoman checks the parcel, taps confirm, and the ¥5 in escrow goes straight to Yuan.'),
    note: [tr('放款即收回', 'Paid means taken back'), tr('钱放出去的同一刻，取件码和宿舍号对阿远隐藏，这单的隐私不留在别人手机里。', "The moment the payment is released, the pickup code and room number are hidden from Yuan. Nothing private from this order stays on his phone.")],
  },
  {
    k: 'credit', icon: 'trust-credit-v1', alt: tr('带上升箭头的奖牌', 'Medal with a rising arrow'), kicker: tr('互评', 'Rate each other'), fear: tr('怕碰上不靠谱的人', 'What if I get someone flaky'),
    t: tr('两个人的信用，一起涨', 'Both credit scores go up'), hl: tr('一起涨', 'go up'),
    d: tr('这一单走完，阿远 70 → 73，小满 88 → 90。下次阿远能接更贵的单，小满的单也更快有人接。', "With this order done, Yuan goes 70 → 73 and Xiaoman 88 → 90. Next time Yuan can take bigger orders, and Xiaoman's orders get picked up faster."),
    note: [tr('双向信用', 'Two-way credit'), tr('跑腿人按时 +2、爽约 -5、被判责 -8；发单人按时确认 +1、超时不确认 -2。不能充值，也刷不了。', "Runners get +2 for on time, -5 for a no-show, -8 when found at fault. Requesters get +1 for confirming on time, -2 for not confirming. You can't buy it or game it.")],
  },
]

export const STATUS = [tr('还没发单', 'Not posted'), tr('待接单', 'Waiting'), tr('有人顺路', 'Runner found'), tr('取件中', 'Picking up'), tr('待确认', 'To confirm'), tr('已放款', 'Paid'), tr('已互评', 'Rated')]
export const ESCROW = [tr('还没付', 'Not paid'), tr('¥5 冻结中', '¥5 held'), tr('¥5 冻结中', '¥5 held'), tr('¥5 冻结中', '¥5 held'), tr('¥5 冻结中', '¥5 held'), tr('¥5 给了阿远', '¥5 to Yuan'), tr('¥5 给了阿远', '¥5 to Yuan')]
export const CODE = [tr('还没有', 'None yet'), '••••', '••••', '6-2-3108', tr('已用完', 'Used'), tr('已收回', 'Revoked'), tr('已收回', 'Revoked')]
export const RUNNER = [70, 70, 70, 70, 70, 72, 73]
export const POSTER = [88, 88, 88, 88, 88, 89, 90]
