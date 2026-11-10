"use client"

import { useRouter } from "next/navigation"
import { useMemo, useState, type KeyboardEvent } from "react"
import {
  ArrowLeftRight, ChartPie, CornerDownLeft, EyeOff, House, Keyboard, MessageCircle, Mic, Moon, PiggyBank, ScanLine, Search, UserRound, Volume2,
  type LucideIcon,
} from "lucide-react"
import { Modal } from "@/components/ui/Modal"
import { Kbd } from "@/components/ui/Button"
import { getTheme, setTheme } from "@/lib/theme"
import { togglePrivate } from "@/components/shell/PrivacyToggle"
import { setSoundEnabled, soundEnabled } from "@/lib/sound"
import { useAppActions } from "@/components/shell/AppActions"

interface Command {
  id: string
  group: "Add" | "Go to" | "Switch" | "Search"
  label: string
  icon: LucideIcon
  key?: string
  /** Extra words the search should match. */
  words?: string
  run: () => void
}

/**
 * Ctrl/⌘ K: every action and place in the app, one fuzzy-ish search away.
 * Anything typed that isn't a command can be sent to Activity as a search,
 * or to Penny as a question.
 */
export default function CommandPalette({ onClose }: { onClose: () => void }) {
  const router = useRouter()
  const { newEntry, listen, scan, ask } = useAppActions()
  const [query, setQuery] = useState("")
  const [cursor, setCursor] = useState(0)

  const commands = useMemo<Command[]>(() => {
    const go = (href: string) => () => router.push(href)
    return [
      { id: "add", group: "Add", label: "New transaction", icon: Keyboard, key: "N", words: "add expense income type", run: () => newEntry() },
      { id: "say", group: "Add", label: "Say it out loud", icon: Mic, key: "V", words: "voice speak microphone", run: listen },
      { id: "snap", group: "Add", label: "Snap a receipt", icon: ScanLine, key: "S", words: "scan photo camera", run: scan },
      { id: "ask", group: "Add", label: "Ask Penny", icon: MessageCircle, key: "A", words: "assistant ai chat question", run: () => ask() },
      { id: "home", group: "Go to", label: "Home", icon: House, words: "dashboard overview", run: go("/dashboard") },
      { id: "activity", group: "Go to", label: "Activity", icon: ArrowLeftRight, words: "transactions history list", run: go("/dashboard/activity") },
      { id: "budgets", group: "Go to", label: "Budgets", icon: PiggyBank, words: "limits caps plan", run: go("/dashboard/budget") },
      { id: "insights", group: "Go to", label: "Insights", icon: ChartPie, words: "charts trends analytics", run: go("/dashboard/insights") },
      { id: "profile", group: "Go to", label: "Profile and settings", icon: UserRound, words: "account password email name delete export", run: go("/dashboard/profile") },
      {
        id: "theme",
        group: "Switch",
        label: "Flip between day and night",
        icon: Moon,
        words: "dark light theme mode coin",
        run: () => setTheme(getTheme() === "dark" ? "light" : "dark", { x: window.innerWidth / 2, y: window.innerHeight / 2 }),
      },
      { id: "private", group: "Switch", label: "Hide or show amounts", icon: EyeOff, words: "privacy blur numbers", run: togglePrivate },
      { id: "sound", group: "Switch", label: "Turn sounds on or off", icon: Volume2, words: "mute audio quiet volume", run: () => setSoundEnabled(!soundEnabled()) },
    ]
  }, [router, newEntry, listen, scan, ask])

  const q = query.trim().toLowerCase()
  const results = useMemo<Command[]>(() => {
    if (!q) return commands
    const hits = commands.filter((c) => `${c.label} ${c.words ?? ""}`.toLowerCase().includes(q))
    const typed = query.trim()
    return [
      ...hits,
      {
        id: "search",
        group: "Search",
        label: `Find “${typed}” in Activity`,
        icon: Search,
        run: () => router.push(`/dashboard/activity?q=${encodeURIComponent(typed)}`),
      },
      { id: "question", group: "Search", label: `Ask Penny: “${typed}”`, icon: MessageCircle, run: () => ask(typed) },
    ]
  }, [q, query, commands, router, ask])

  const active = Math.min(cursor, results.length - 1)

  function choose(command: Command, close: () => void) {
    close()
    // let the palette finish closing before another dialog takes focus
    window.setTimeout(command.run, 200)
  }

  function onKeyDown(e: KeyboardEvent, close: () => void) {
    if (e.key === "ArrowDown") {
      e.preventDefault()
      setCursor((active + 1) % results.length)
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setCursor((active - 1 + results.length) % results.length)
    } else if (e.key === "Enter" && results[active]) {
      e.preventDefault()
      choose(results[active], close)
    }
  }

  return (
    <Modal label="Search and commands" onClose={onClose} width={580}>
      {(close) => (
        <div onKeyDown={(e) => onKeyDown(e, close)} className="flex min-h-0 flex-col">
          <label className="flex items-center gap-3 border-b-[1.5px] border-line px-5 py-4">
            <Search size={20} strokeWidth={2} aria-hidden className="shrink-0 text-muted" />
            <input
              data-autofocus
              value={query}
              onChange={(e) => {
                setQuery(e.target.value)
                setCursor(0)
              }}
              placeholder="Type a command, a place, or a question"
              aria-label="Search commands"
              role="combobox"
              aria-expanded
              aria-controls="palette-results"
              aria-activedescendant={results[active] ? `palette-${results[active].id}` : undefined}
              className="min-w-0 flex-1 bg-transparent text-[17px] text-fg outline-none placeholder:text-faint"
            />
            <Kbd>Esc</Kbd>
          </label>

          <ul id="palette-results" role="listbox" aria-label="Results" className="max-h-[min(420px,56dvh)] overflow-y-auto p-2">
            {results.map((command, i) => {
              const Icon = command.icon
              const on = i === active
              const heading = i === 0 || results[i - 1].group !== command.group
              return (
                <li key={command.id} role="presentation">
                  {heading && <p className="eyebrow px-3 pb-1.5 pt-3 text-muted">{command.group}</p>}
                  <button
                    id={`palette-${command.id}`}
                    type="button"
                    role="option"
                    aria-selected={on}
                    tabIndex={-1}
                    onPointerMove={() => setCursor(i)}
                    onClick={() => choose(command, close)}
                    className={`flex w-full items-center gap-3 rounded-[14px] px-3 py-2.5 text-left text-[15px] transition-colors ${
                      on ? "bg-solid text-on-solid" : "text-fg"
                    }`}
                  >
                    <Icon size={18} strokeWidth={2} aria-hidden className={on ? "" : "text-muted"} />
                    <span className="min-w-0 flex-1 truncate font-medium">{command.label}</span>
                    {on ? (
                      <CornerDownLeft size={15} aria-hidden className="opacity-70" />
                    ) : (
                      command.key && <Kbd>{command.key}</Kbd>
                    )}
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </Modal>
  )
}
