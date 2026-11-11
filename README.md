# Shunluxia (顺路侠)

**Shunluxia** (顺路侠) is the person who helps because they are already going that way. 顺路 (*shunlu*) means "on the way." 侠 (*xia*) is someone who steps in to help.

This repository is an interactive product prototype for local-life, on-demand delivery, built as a reference for product managers working on local services. It matches tasks only to people already walking that route (顺路派单)—sorting the task hall by the extra minutes a pickup adds to a walk they were already going to make. You can click through a landing story, a page of product notes, and a phone and desktop prototype.

People, tasks, and places in the prototype are demo data stored in the browser. It is not a live delivery service: no campus is operating it, and it has no live users.

* **Live demo:** [https://ekko237.github.io/shunluxia-campus-errand/](https://ekko237.github.io/shunluxia-campus-errand/)
* **English interface:** [https://ekko237.github.io/shunluxia-campus-errand/?lang=en](https://ekko237.github.io/shunluxia-campus-errand/?lang=en)

The sections below are in Chinese. They cover the screens, product rules, tech stack, and GitHub Pages deployment.

## Run locally

Requires Node.js 22 or newer.

```bash
npm install
npm run dev
```

Open the URL printed in the terminal (default `http://localhost:5173/shunluxia-campus-errand/`).

```bash
npm run build
npm run preview
```

## License

Code is under the [MIT License](LICENSE).

Third-party assets keep their own licenses: Smiley Sans (SIL OFL 1.1, `public/fonts/smiley-v2/OFL.txt`), Geist (SIL OFL 1.1), and Phosphor Icons (MIT).

---

# 顺路侠 · 校园跑腿互助

本来就要经过，顺手捎一下。

顺路侠是一个校园跑腿互助平台的产品原型。它只把顺路的单派给本来就要走那条路的同学：快递在驿站，你在宿舍，正好下课路过驿站的同学多走 1 分钟就能帮你带上。

**在线体验：** [https://ekko237.github.io/shunluxia-campus-errand/](https://ekko237.github.io/shunluxia-campus-errand/)

<p>
  <img src="docs/home.webp" alt="首页首屏：校园地图上阿远从一教走过驿站，标题「本来就要经过，顺手捎一下」" width="100%">
</p>

## 能看到什么

网站分三部分：

| 页面 | 地址 | 内容 |
| --- | --- | --- |
| 首页 | `#/` | 一镜到底的校园地图，跟着跑腿人阿远把一单从发布走到互评，七章随滚动推进 |
| 产品思考 | `#/thinking` | 为什么只派顺路的单、三个关键数字、接下来做什么 |
| 可交互原型 | `#/app/start` | 手机版和电脑版两种界面，可以切换发单人和跑腿人身份，自己完整走一单 |

全站支持中英文：中文浏览器默认显示中文，其余默认英文。点击顶栏或页脚的「EN / 中文」按钮可切换语言，网址加 `?lang=en` 可直接打开[英文版](https://ekko237.github.io/shunluxia-campus-errand/?lang=en)。

<p>
  <img src="docs/story.webp" alt="首页第二章：阿远一教下课正好顺路，旁边的凭证卡显示赏金托管和双方信用" width="100%">
</p>

<table>
  <tr>
    <td width="68%"><img src="docs/desk.webp" alt="电脑版原型：左边演示面板，中间任务大厅，右边顺路地图" width="100%"></td>
    <td width="32%"><img src="docs/phone.webp" alt="手机版原型的任务大厅" width="100%"></td>
  </tr>
</table>

## 产品设计

* **只派顺路的单。** 跑腿人登记自己常走的路，大厅按「顺路多走几分钟」排序，取件点在路上按先后编号。
* **赏金先托管。** 发单时赏金冻结在平台，确认送达才放款；2 小时不确认自动放款。
* **校内实名和信用门槛。** 学号或 .edu.cn 邮箱认证后才能接单；信用 60 分能接 ¥8 以内的单，72 分起放宽到 ¥15。
* **隐私分级。** 取件码、宿舍号、电话接单后才可见，订单结束自动隐藏，电话走虚拟号。
* **送达凭证。** 当面核验 4 位送达码，或拍照留证，纠纷时作为依据。
* **双向信用。** 跑腿人和发单人各有一套信用规则和档位，互评后信用变化当场可见；申诉期间赏金继续冻结。
* **发不出去。** 代考、代签到这类违规需求在发布时就被拦下。
* **下课提醒。** 下课前 5 分钟推送常走路线上的单。
* **新手指引。** 第一次进入原型可以「带我走一遍」，指哪点哪，约 2 分钟走完一单，最后能保存一张今日顺路卡。

原型里的数据都是演示用的示例数据，存在浏览器的 localStorage 里（键名 `shunluxia:v3`）。地址后加上 `?reset=1` 即可恢复初始数据，例如 `https://ekko237.github.io/shunluxia-campus-errand/?reset=1#/app/start`。

## 使用的技术

* React 19、React Router 7（Hash 路由，方便部署到 GitHub Pages）
* Vite 8、Tailwind CSS 4
* Motion（滚动驱动的地图镜头、逐字标题和各处微动效）
* Phosphor Icons；中文标题字体是得意黑 Smiley Sans，西文和数字是 Geist
* 插画、校园地图和大部分图标是 AI 生成图，放在 `public/` 下，文件名带版本号（例如 `campus-map-v3.webp`），换图时换文件名，避免浏览器缓存旧图

## 本地运行

需要 Node.js 22 或更新的版本。

```bash
npm install
npm run dev
```

打开终端里显示的地址（默认 `http://localhost:5173/shunluxia-campus-errand/`）。

构建正式版本：

```bash
npm run build
npm run preview
```

## 目录结构

```
src/
  main.jsx          路由入口；原型部分按需加载
  landing/          首页和产品思考页（OneTake.jsx 是一镜到底的地图故事）
  app/              可交互原型：大厅、发布、订单详情、我的、新手指引、演示面板
  store.jsx         原型的状态和 localStorage 读写
  data.js           示例任务、地点、信用规则
  campusMap.js      校园地图坐标和绕路距离计算
public/
  images/ icons/ brand/   生成图素材
  fonts/smiley-v2/        得意黑字体（按字符分包）
docs/               README 用的截图
```

## 部署

推送到 `main` 分支后，`.github/workflows/deploy.yml` 会构建并发布到 GitHub Pages。部署时会带上上一版的打包文件，`index.html` 里还有一段加载失败时带参数刷新一次的脚本，防止浏览器因缓存旧页面而白屏。

站点部署在 `/shunluxia-campus-errand/` 子路径下。如果修改了仓库名，需要同步修改 `vite.config.js` 里的 `base`、`index.html` 里写死的 `/shunluxia-campus-errand/` 路径，以及 `.github/workflows/deploy.yml` 里的 Pages 地址。页面使用 Hash 路由，地址在 `#` 后面（例如 `#/app/start`）。不要把这个子路径写进 React Router 的 `basename`，否则 `#/` 对不上路由，页面会显示空白。

## 许可证

代码按 [MIT 许可证](LICENSE) 开源。

第三方素材按各自的许可证使用：得意黑 Smiley Sans（SIL OFL 1.1，见 `public/fonts/smiley-v2/OFL.txt`）、Geist（SIL OFL 1.1）、Phosphor Icons（MIT）。
