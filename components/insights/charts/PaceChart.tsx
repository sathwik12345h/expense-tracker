"use client"

import { useEffect, useState, type CSSProperties, type KeyboardEvent, type PointerEvent } from "react"
import { ArrowDownRight, ArrowUpRight } from "lucide-react"
import { useSeen } from "@/components/ui/motion"
import { formatMoney, formatMoneyCompact } from "@/lib/format"
import { niceTop, type Pace } from "../derive"
import { C, mix } from "../tokens"

const LEFT = 44
const RIGHT = 14
const TOP = 20
const BOTTOM = 28

interface Props {
  pace: Pace
  /** This month's name, e.g. "November". */
  monthName: string
  /** All caps added together, or 0 when there are none. */
  cap: number
}

/**
 * The month as a running total: this month's line climbing day by day over
 * last month's, with the combined cap as a ceiling when there is one.
 * Scrub it with the pointer or the arrow keys to read any day.
 *
 * The drawing is sized to the card in real pixels (not scaled), so labels
 * stay the same readable size on a phone as on a desktop.
 */
export default function PaceChart({ pace, monthName, cap }: Props) {
  const [ref, seen] = useSeen<HTMLDivElement>()
  const [width, setWidth] = useState(0)
  const [scrub, setScrub] = useState<number | null>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new ResizeObserver(([entry]) => setWidth(Math.round(entry.contentRect.width)))
    observer.observe(el)
    return () => observer.disconnect()
  }, [ref])

  const W = Math.max(260, width)
  const H = Math.round(Math.min(270, Math.max(190, W * 0.42)))
  const plotW = W - LEFT - RIGHT
  const plotH = H - TOP - BOTTOM

  const span = Math.max(pace.days, pace.previous.length)
  const soFar = pace.current[pace.today - 1] ?? 0
  const lastTotal = pace.previous[pace.previous.length - 1] ?? 0
  const lastByNow = pace.previous[Math.min(pace.today, pace.previous.length) - 1] ?? 0
  const top = niceTop(Math.max(soFar, lastTotal, cap, 1))

  const x = (day: number) => LEFT + ((day - 1) / Math.max(1, span - 1)) * plotW
  const y = (value: number) => TOP + (1 - Math.min(1, value / top)) * plotH
  const path = (series: number[]) => series.map((v, i) => `${i === 0 ? "M" : "L"}${x(i + 1).toFixed(1)} ${y(v).toFixed(1)}`).join(" ")

  const currentPath = path(pace.current)
  const areaPath = `${currentPath} L${x(pace.today).toFixed(1)} ${y(0).toFixed(1)} L${x(1).toFixed(1)} ${y(0).toFixed(1)} Z`
  const previousPath = path(pace.previous)

  const day = Math.min(span, Math.max(1, scrub ?? pace.today))
  const currentAt = day <= pace.today ? pace.current[day - 1] ?? 0 : null
  const previousAt = pace.previous[Math.min(day, pace.previous.length) - 1] ?? 0

  // if the rest of this month goes the way the rest of last month did
  const landing = lastTotal > 0 ? soFar + Math.max(0, lastTotal - lastByNow) : (soFar / pace.today) * pace.days
  const gap = soFar - lastByNow
  const todayOnRight = pace.today > span * 0.75

  function onPointerMove(e: PointerEvent<SVGSVGElement>) {
    const box = e.currentTarget.getBoundingClientRect()
    const px = e.clientX - box.left
    setScrub(Math.min(span, Math.max(1, Math.round(((px - LEFT) / plotW) * (span - 1)) + 1)))
  }

  function onKeyDown(e: KeyboardEvent) {
    const move: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, PageDown: -7, PageUp: 7 }
    if (e.key in move) {
      e.preventDefault()
      setScrub(Math.min(span, Math.max(1, day + move[e.key])))
    } else if (e.key === "Home") {
      e.preventDefault()
      setScrub(1)
    } else if (e.key === "End") {
      e.preventDefault()
      setScrub(span)
    }
  }

  const readout =
    currentAt === null
      ? `Day ${day}: ${formatMoney(Math.round(previousAt))} by this day in ${pace.previousName}`
      : `Day ${day}: ${formatMoney(Math.round(currentAt))} this month, ${formatMoney(Math.round(previousAt))} in ${pace.previousName}`

  return (
    <div ref={ref} className="flex flex-1 flex-col">
      {/* the verdict, in words */}
      <p className="text-[15px] leading-relaxed text-fg-2">
        {soFar === 0 ? (
          "Nothing spent yet this month."
        ) : lastByNow === 0 ? (
          <>
            <span className="font-semibold text-fg tnum">{formatMoney(Math.round(soFar))}</span> out so far. There&apos;s no {pace.previousName} spending to
            compare it with.
          </>
        ) : Math.abs(gap) < 1 ? (
          <>Neck and neck with {pace.previousName} at this point.</>
        ) : gap < 0 ? (
          <>
            <span className="inline-flex items-center gap-1 font-semibold text-income tnum">
              <ArrowDownRight size={16} strokeWidth={2.6} aria-hidden />
              {formatMoney(Math.round(-gap))} lighter
            </span>{" "}
            than {pace.previousName} was by day {pace.today}.
          </>
        ) : (
          <>
            <span className="inline-flex items-center gap-1 font-semibold text-coral-ink tnum">
              <ArrowUpRight size={16} strokeWidth={2.6} aria-hidden />
              {formatMoney(Math.round(gap))} heavier
            </span>{" "}
            than {pace.previousName} was by day {pace.today}.
          </>
        )}{" "}
        {soFar > 0 && pace.today < pace.days && (
          <>
            {lastTotal > 0 ? `If the rest of the month goes like ${pace.previousName}'s did, you'd` : "At this rate you'd"} finish near{" "}
            <span className="font-semibold text-fg tnum">{formatMoney(Math.round(landing))}</span>
            {cap > 0 && (
              <>
                , which is{" "}
                <span className={`font-semibold tnum ${landing > cap ? "text-coral-ink" : "text-fg"}`}>
                  {formatMoney(Math.round(Math.abs(cap - landing)))} {landing > cap ? "over" : "under"}
                </span>{" "}
                your caps
              </>
            )}
            .
          </>
        )}
      </p>

      <div
        role="slider"
        tabIndex={0}
        aria-label="Day of the month"
        aria-valuemin={1}
        aria-valuemax={span}
        aria-valuenow={day}
        aria-valuetext={readout}
        onKeyDown={onKeyDown}
        onBlur={() => setScrub(null)}
        className="mt-4 rounded-[16px]"
        style={{ minHeight: H }}
      >
        {width > 0 && (
          <svg
            width={W}
            height={H}
            viewBox={`0 0 ${W} ${H}`}
            aria-hidden
            onPointerMove={onPointerMove}
            onPointerLeave={() => setScrub(null)}
            className="block touch-pan-y overflow-visible"
          >
            {/* scale */}
            {[0, 0.5, 1].map((t) => (
              <g key={t}>
                <line
                  x1={LEFT}
                  x2={W - RIGHT}
                  y1={y(top * t)}
                  y2={y(top * t)}
                  stroke={t === 0 ? C.line2 : C.line}
                  strokeWidth={t === 0 ? 1.5 : 1}
                  strokeDasharray={t === 0 ? undefined : "3 5"}
                />
                <text x={LEFT - 8} y={y(top * t) + 4} textAnchor="end" className="fill-muted font-mono text-[10.5px] tnum">
                  {formatMoneyCompact(top * t)}
                </text>
              </g>
            ))}
            {[1, 8, 15, 22, span].map((d) => (
              <text
                key={d}
                x={x(d)}
                y={H - 8}
                textAnchor={d === 1 ? "start" : d === span ? "end" : "middle"}
                className="fill-muted font-mono text-[10.5px]"
              >
                {d}
              </text>
            ))}

            {/* the cap: a ceiling */}
            {cap > 0 && (
              <g className={seen ? "animate-[fade_.8s_ease-out_.9s_backwards]" : "opacity-0"}>
                <line x1={LEFT} x2={W - RIGHT} y1={y(cap)} y2={y(cap)} stroke={C.fg} strokeWidth={1.5} strokeDasharray="2 6" strokeLinecap="round" />
                <text x={W - RIGHT} y={y(cap) - 7} textAnchor="end" className="fill-fg text-[11.5px] font-semibold tnum">
                  Caps · {formatMoney(Math.round(cap))}
                </text>
              </g>
            )}

            {/* last month */}
            <path
              d={previousPath}
              fill="none"
              stroke={C.skyDeep}
              strokeWidth={2}
              strokeDasharray="5 5"
              strokeLinejoin="round"
              className={seen ? "animate-[fade_.8s_ease-out_.3s_backwards]" : "opacity-0"}
            />

            {/* this month */}
            <path d={areaPath} fill={mix(C.coral, 16)} className={seen ? "animate-[fade_1s_ease-out_.7s_backwards]" : "opacity-0"} />
            <path
              d={currentPath}
              fill="none"
              stroke={C.coral}
              strokeWidth={3.5}
              strokeLinejoin="round"
              strokeLinecap="round"
              pathLength={1}
              strokeDasharray={1}
              strokeDashoffset={seen ? 0 : 1}
              className={seen ? "animate-[draw_1.3s_var(--ease-out-quint)_backwards]" : ""}
              style={{ "--len": 1 } as CSSProperties}
            />
            <g className={seen ? "animate-[fade_.4s_ease-out_1.1s_backwards]" : "opacity-0"}>
              <circle cx={x(pace.today)} cy={y(soFar)} r={7} fill={C.coral} stroke={C.surface} strokeWidth={3} />
              <text
                x={x(pace.today) + (todayOnRight ? -12 : 12)}
                y={y(soFar) - 10}
                textAnchor={todayOnRight ? "end" : "start"}
                className="fill-fg text-[12px] font-semibold"
              >
                Today
              </text>
            </g>

            {/* scrubber */}
            {scrub !== null && (
              <g>
                <line x1={x(day)} x2={x(day)} y1={TOP - 4} y2={y(0)} stroke={C.fg} strokeWidth={1} strokeOpacity={0.5} />
                <circle cx={x(day)} cy={y(previousAt)} r={5} fill={C.surface} stroke={C.skyDeep} strokeWidth={2.5} />
                {currentAt !== null && <circle cx={x(day)} cy={y(currentAt)} r={5.5} fill={C.surface} stroke={C.coral} strokeWidth={3} />}
              </g>
            )}
          </svg>
        )}
      </div>

      {/* key + readout for the scrubbed day */}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-x-5 gap-y-2 text-[12.5px] text-muted">
        <p className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <span className="flex items-center gap-1.5">
            <svg width="20" height="6" aria-hidden>
              <line x1="1" x2="19" y1="3" y2="3" stroke={C.coral} strokeWidth="3.5" strokeLinecap="round" />
            </svg>
            {monthName}
          </span>
          <span className="flex items-center gap-1.5">
            <svg width="20" height="6" aria-hidden>
              <line x1="1" x2="19" y1="3" y2="3" stroke={C.skyDeep} strokeWidth="2" strokeDasharray="5 4" />
            </svg>
            {pace.previousName}
          </span>
        </p>
        <p className="rounded-full bg-well px-3 py-1 font-medium text-fg-2">
          Day {day}
          {" · "}
          <span className="font-semibold text-fg tnum">{currentAt === null ? "not yet" : formatMoney(Math.round(currentAt))}</span>
          {" vs "}
          <span className="tnum">{formatMoney(Math.round(previousAt))}</span>
        </p>
      </div>
    </div>
  )
}
