import { useRef, useState } from 'react'
import { motion, useReducedMotion, useScroll, useSpring, useTransform, useMotionValueEvent } from 'motion/react'
import { tr } from '../i18n'

// 段与段之间的一小段路：阿远沿着点线从左往右走（立绘左右翻过来，朝右），走过的部分变成翠绿实线，读法和进度条一样；
// 路的右头是下一站，他走到时站点亮起。整页因此一直是同一个人在走同一条路，滚到哪走到哪，不劫持滚动
const BASE = import.meta.env.BASE_URL

export default function Walkway({ next }) {
  const reduce = useReducedMotion()
  const ref = useRef(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start 0.95', 'start 0.3'] })
  const f = useSpring(scrollYProgress, { stiffness: 140, damping: 26, mass: 0.4 })
  const left = useTransform(f, [0, 1], ['6%', '93%'])
  const trail = useTransform(f, [0, 1], [0.06, 0.93])
  // 迈一步颠一下：起伏跟着走过的距离走，停下就不动
  const stepY = useTransform(f, (v) => -Math.abs(Math.sin(v * 34)) * 4)
  const stepR = useTransform(f, (v) => Math.sin(v * 34) * 2.5)
  const [here, setHere] = useState(false)
  useMotionValueEvent(f, 'change', (v) => setHere(v > 0.9))
  const lit = here || reduce
  return (
    <div ref={ref} aria-hidden="true" className="mx-auto h-28 max-w-7xl px-4 md:h-32 md:px-8">
      <div className="relative h-full">
        <span className="absolute inset-x-0 bottom-9 border-t-[5px] border-dotted border-ink/20 md:bottom-10" />
        <motion.span className="absolute inset-x-0 bottom-9 h-[5px] origin-left rounded-full bg-accent md:bottom-10" style={{ scaleX: reduce ? 0.5 : trail }} />
        <span className="absolute bottom-9 left-0 size-3.5 translate-y-1/2 rounded-full bg-ink ring-4 ring-bg md:bottom-10" />
        <span className="absolute bottom-9 right-0 flex translate-y-1/2 items-center md:bottom-10">
          <span className={`relative grid size-5 place-items-center rounded-full ring-4 ring-bg transition-colors duration-300 ${lit ? 'bg-accent' : 'bg-muted/50'}`}>
            {here && !reduce && <motion.span key="ping" className="absolute inset-0 rounded-full bg-accent" initial={{ opacity: 0.6, scale: 1 }} animate={{ opacity: 0, scale: 2.6 }} transition={{ duration: 0.8, ease: 'easeOut' }} />}
          </span>
        </span>
        <span className={`absolute bottom-0 right-0 whitespace-nowrap text-[14px] font-semibold transition-colors duration-300 ${lit ? 'text-accent' : 'text-muted'}`}>{tr('下一站', 'Next stop')} · {next}</span>
        {reduce ? (
          <img src={`${BASE}brand/runner-v1.webp`} width={169} height={240} alt="" className="absolute bottom-9 left-1/2 h-14 w-auto max-w-none -translate-x-1/2 -scale-x-100 drop-shadow-[0_8px_8px_rgba(17,40,30,0.22)] md:bottom-10 md:h-16" />
        ) : (
          <motion.div className="absolute bottom-9 h-14 -translate-x-1/2 md:bottom-10 md:h-16" style={{ left }}>
            <motion.img src={`${BASE}brand/runner-v1.webp`} width={169} height={240} alt="" style={{ y: stepY, rotate: stepR, scaleX: -1 }}
              className="h-full w-auto max-w-none origin-bottom drop-shadow-[0_8px_8px_rgba(17,40,30,0.22)]" />
          </motion.div>
        )}
      </div>
    </div>
  )
}
