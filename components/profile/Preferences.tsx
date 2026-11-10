"use client"

import { useSyncExternalStore } from "react"
import { Switcher } from "@/components/ui/Switcher"
import { ThemeCoin } from "@/components/ui/ThemeCoin"
import { setTheme, useTheme, type Theme } from "@/lib/theme"
import { togglePrivate } from "@/components/shell/PrivacyToggle"
import { play, setSoundEnabled, useSoundEnabled } from "@/lib/sound"
import { ToggleRow } from "@/components/profile/fields"

// Privacy mode lives on <html data-private>; watching the attribute keeps this
// switch honest whichever control flipped it (here, the rail, or the palette).
function watchPrivate(onChange: () => void) {
  const observer = new MutationObserver(onChange)
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-private"] })
  return () => observer.disconnect()
}
const readPrivate = () => document.documentElement.dataset.private === "true"

/** Day or night, and whether amounts are blurred. Both are remembered on this device. */
export default function Preferences() {
  const theme = useTheme()
  const hidden = useSyncExternalStore(watchPrivate, readPrivate, () => false)
  const sounds = useSoundEnabled()

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-4">
        <div className="min-w-0 max-w-[420px]">
          <p className="text-[15px] font-semibold text-fg">Day or night</p>
          <p className="mt-1 text-[13.5px] leading-relaxed text-muted">
            Flip the coin, or pick one. Until you choose, Spendwise follows your device. Your choice is remembered here.
          </p>
        </div>
        <div className="flex items-center gap-4">
          <ThemeCoin size={52} />
          {theme ? (
            <Switcher<Theme>
              label="Theme"
              value={theme}
              onChange={(next) => setTheme(next)}
              options={[
                { value: "light", label: "Day" },
                { value: "dark", label: "Night" },
              ]}
              className="w-[176px]"
            />
          ) : (
            <span aria-hidden className="skeleton block h-11 w-[176px] rounded-full" />
          )}
        </div>
      </div>

      <div className="border-t border-dashed border-line-2" />

      <ToggleRow
        title="Hide amounts"
        detail="Blurs every amount on screen, for checking your budget with someone at your shoulder. Remembered on this device."
        on={hidden}
        onToggle={togglePrivate}
      />

      <div className="border-t border-dashed border-line-2" />

      <ToggleRow
        title="Sounds"
        detail="A soft clink when a coin lands, a tick on the number pad, a chime when something saves. Always quiet. Remembered on this device."
        on={sounds}
        onToggle={() => {
          setSoundEnabled(!sounds)
          if (!sounds) play("chime")
        }}
      />
    </div>
  )
}
