"use client"

import { useEffect, useSyncExternalStore } from "react"
import { Check, Info, TriangleAlert, X } from "lucide-react"
import { play } from "@/lib/sound"

type Tone = "good" | "bad" | "info"
interface Note {
  id: number
  text: string
  tone: Tone
}

// A module-level queue: anything can call notify(), one <Toasts/> renders it.
let queue: Note[] = []
let serial = 1
const watchers = new Set<() => void>()
const publish = () => watchers.forEach((w) => w())

export function notify(text: string, tone: Tone = "good") {
  queue = [...queue.slice(-2), { id: serial++, text, tone }]
  publish()
  // good news chimes, bad news thuds; plain information stays silent
  if (tone === "good") play("chime")
  else if (tone === "bad") play("thud")
}

function drop(id: number) {
  queue = queue.filter((n) => n.id !== id)
  publish()
}

const look: Record<Tone, { icon: typeof Check; chip: string }> = {
  good: { icon: Check, chip: "bg-sun text-on-sun" },
  bad: { icon: TriangleAlert, chip: "bg-coral text-on-coral" },
  info: { icon: Info, chip: "bg-sky text-on-sky" },
}

function Chip({ note }: { note: Note }) {
  useEffect(() => {
    const timer = window.setTimeout(() => drop(note.id), 3800)
    return () => window.clearTimeout(timer)
  }, [note.id])

  const { icon: Icon, chip } = look[note.tone]
  return (
    <div
      role={note.tone === "bad" ? "alert" : "status"}
      className="slab pointer-events-auto flex max-w-[min(440px,calc(100vw-32px))] animate-[pop_.4s_var(--ease-out-quint)] items-center gap-3 rounded-[18px] py-2 pl-2 pr-1.5 text-[14px] text-fg"
    >
      <span className={`inline-flex size-8 shrink-0 items-center justify-center rounded-[11px] ${chip}`}>
        <Icon size={16} strokeWidth={2.4} aria-hidden />
      </span>
      <span className="min-w-0 flex-1 font-medium leading-snug">{note.text}</span>
      <button
        type="button"
        onClick={() => drop(note.id)}
        aria-label="Dismiss"
        className="inline-flex size-8 shrink-0 items-center justify-center rounded-full text-muted transition hover:bg-well hover:text-fg"
      >
        <X size={15} />
      </button>
    </div>
  )
}

export function Toasts() {
  const notes = useSyncExternalStore(
    (cb) => {
      watchers.add(cb)
      return () => {
        watchers.delete(cb)
      }
    },
    () => queue,
    () => queue
  )

  return (
    <div aria-live="polite" className="pointer-events-none fixed inset-x-0 top-4 z-[200] flex flex-col items-center gap-3 px-4">
      {notes.map((note) => (
        <Chip key={note.id} note={note} />
      ))}
    </div>
  )
}
