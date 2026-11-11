<p align="center">
  English · <a href="README.zh-CN.md">中文</a>
</p>

<p align="center">
  <img src="public/brand/logo-v2.png" alt="Shunluxia" width="96" />
</p>

<h1 align="center">Shunluxia (顺路侠)</h1>

<p align="center">You're walking past anyway. Grab it on the way.</p>

<p align="center">
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-24292f?style=flat&amp;logo=github&amp;logoColor=white" alt="MIT License" /></a>
  &nbsp;
  <a href="https://ekko237.github.io/shunluxia-campus-errand/"><img src="https://img.shields.io/badge/live_demo-shunluxia-24292f?style=flat" alt="Live demo" /></a>
</p>

<p align="center">
  <a href="https://ekko237.github.io/shunluxia-campus-errand/">
    <img src="docs/home.webp" alt="Home, first screen: on the campus map Yuan walks from Teaching Bldg 1 past the station, under the title &quot;You're walking past anyway. Grab it on the way.&quot;" width="100%" />
  </a>
</p>

**Shunluxia** (顺路侠) is the person who helps because they are already going that way. 顺路 (*shunlu*) means "on the way." 侠 (*xia*) is someone who steps in to help.

This repository is an interactive product prototype for local-life, on-demand delivery, built as a reference for product managers working on local services. It matches tasks only to people already walking that route (顺路派单)—sorting the task hall by the extra minutes a pickup adds to a walk they were already going to make. You can click through a landing story, a page of product notes, and a phone and desktop prototype.

Shunluxia is a product prototype of a campus errand mutual-help platform. It only assigns an order to a classmate who was already going to walk that route: the parcel is at the station, you are in the dorm, and a classmate who passes the station right after class can bring it to you with 1 extra minute.

People, tasks, and places in the prototype are demo data stored in the browser. It is not a live delivery service: no campus is operating it, and it has no live users.

* **Live demo:** [https://ekko237.github.io/shunluxia-campus-errand/](https://ekko237.github.io/shunluxia-campus-errand/)
* **English interface:** [https://ekko237.github.io/shunluxia-campus-errand/?lang=en](https://ekko237.github.io/shunluxia-campus-errand/?lang=en)

## What you can see

The site has three parts:

| Page | Address | What it shows |
| --- | --- | --- |
| Home | `#/` | A one-take campus map. It follows the runner Yuan through one order, from posting to mutual ratings, in seven chapters that advance as you scroll |
| Product thinking | `#/thinking` | Why it only assigns on-the-way orders, three key numbers, and what comes next |
| Interactive prototype | `#/app/start` | Phone and desktop interfaces. Switch between requester and runner and walk through a whole order yourself |

The whole site supports Chinese and English: a Chinese browser shows Chinese by default, and every other browser shows English. The "EN / 中文" button in the top bar or the footer switches the language, and adding `?lang=en` to the URL opens the [English version](https://ekko237.github.io/shunluxia-campus-errand/?lang=en) directly.

<p>
  <img src="docs/story.webp" alt="Home, chapter two: Yuan's class in Teaching Bldg 1 has just ended and he is already on the way. The card beside him shows reward escrow and both credit scores" width="100%">
</p>

<table>
  <tr>
    <td width="68%"><img src="docs/desk.webp" alt="Desktop prototype: demo panel on the left, task hall in the middle, on-the-way map on the right" width="100%"></td>
    <td width="32%"><img src="docs/phone.webp" alt="Task hall of the phone prototype" width="100%"></td>
  </tr>
</table>

## Run locally

Requires Node.js 22 or newer.

```bash
npm install
npm run dev
```

Open the URL printed in the terminal (default `http://localhost:5173/shunluxia-campus-errand/`).

Build the production version:

```bash
npm run build
npm run preview
```

## Product design

* **Only on-the-way orders.** Runners register the route they usually walk. The task hall sorts by how many extra minutes the order adds on the way, and pickup points are numbered in the order they fall along the route.
* **The reward is held in escrow first.** The reward is frozen on the platform when the order is posted, and released only after delivery is confirmed. If nobody confirms within 2 hours, it is released automatically.
* **Campus identity and a credit threshold.** Taking an order requires verification with a student ID or a .edu.cn email. A credit score of 60 can take orders within ¥8, and from 72 the limit opens up to ¥15.
* **Tiered privacy.** The pickup code, dorm number, and phone number are visible only after the order is accepted, and they hide again when the order ends. Calls go through a masked number.
* **Proof of delivery.** Check a 4-digit delivery code in person, or take a photo as proof. That record is what a dispute relies on.
* **Two-way credit.** Runners and requesters each have their own credit rules and tiers. After they rate each other, the credit change is visible right away. During a dispute, the reward stays frozen.
* **Some requests cannot be posted.** Requests such as taking an exam for someone, or signing in for someone, are blocked when you try to publish them.
* **After-class reminder.** 5 minutes before class ends, it pushes the orders that sit on the route you usually walk.
* **First-run guide.** The first time you enter the prototype you can choose "Show me around." It points at each step, walks through one order in about 2 minutes, and at the end you can save a Today's route card.

Data in the prototype is sample data for the demo, stored in the browser's localStorage (key `shunluxia:v3`). Add `?reset=1` to the address to restore the initial data, for example `https://ekko237.github.io/shunluxia-campus-errand/?reset=1#/app/start`.

## Technology used

* React 19 and React Router 7 (hash routing, so it can be deployed to GitHub Pages)
* Vite 8 and Tailwind CSS 4
* Motion (a scroll-driven map camera, titles that appear character by character, and small motion throughout)
* Phosphor Icons. Chinese titles use Smiley Sans (得意黑). Latin text and numbers use Geist
* Illustrations, the campus map, and most icons are AI-generated images under `public/`. Filenames include a version (for example `campus-map-v3.webp`). When you replace an image, change the filename so the browser does not keep the old one

## Directory structure

```
src/
  main.jsx          route entry; the prototype part loads on demand
  landing/          home and product-thinking pages (OneTake.jsx is the one-take map story)
  app/              interactive prototype: task hall, publish, order detail, me, first-run guide, demo panel
  store.jsx         prototype state, and localStorage reads and writes
  data.js           sample tasks, places, and credit rules
  campusMap.js      campus map coordinates and the detour-distance calculation
public/
  images/ icons/ brand/   generated image assets
  fonts/smiley-v2/        Smiley Sans, subset by character
docs/               screenshots used in this README
```

## Deployment

After a push to the `main` branch, `.github/workflows/deploy.yml` builds the site and publishes it to GitHub Pages. The deploy also brings along the previous build's files. `index.html` includes a script that reloads once, with a parameter, if loading fails, so a browser that cached an old page does not show a blank screen.

The site is deployed under the `/shunluxia-campus-errand/` subpath. If the repository is renamed, update `base` in `vite.config.js`, the hardcoded `/shunluxia-campus-errand/` path in `index.html`, and the Pages URL in `.github/workflows/deploy.yml` together. Pages use hash routing, so the address sits after `#` (for example `#/app/start`). Do not put this subpath in React Router's `basename`. If you do, `#/` will not match a route and the page will be blank.

## Common Questions

**Is this a live delivery service?**  
No. It is not a live delivery service: no campus is operating it, and it has no live users. People, tasks, and places in the prototype are demo data stored in the browser's localStorage (key `shunluxia:v3`).

**How do I reset the demo data?**  
Add `?reset=1` to the address to restore the initial data, for example `https://ekko237.github.io/shunluxia-campus-errand/?reset=1#/app/start`.

**What is required to run it?**  
Node.js 22 or newer.

## License

Code is under the [MIT License](LICENSE).

Third-party assets keep their own licenses: Smiley Sans (SIL OFL 1.1, `public/fonts/smiley-v2/OFL.txt`), Geist (SIL OFL 1.1), and Phosphor Icons (MIT).
