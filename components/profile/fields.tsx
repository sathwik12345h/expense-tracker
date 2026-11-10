"use client"

import { useId, useState, type InputHTMLAttributes, type ReactNode } from "react"
import { CircleCheck, Eye, EyeOff, TriangleAlert } from "lucide-react"

/**
 * The one input style on the profile page: label above, a 52px field, an
 * optional line of help underneath. Password fields get a show/hide button.
 */
export function TextField({
  label, help, type = "text", id, className = "", ...props
}: { label: string; help?: ReactNode } & InputHTMLAttributes<HTMLInputElement>) {
  const [shown, setShown] = useState(false)
  const auto = useId()
  const inputId = id ?? auto
  const helpId = `${inputId}-help`
  const secret = type === "password"

  return (
    <div className={className}>
      <label htmlFor={inputId} className="mb-2 block text-[13.5px] font-semibold text-fg">
        {label}
      </label>
      <div className="relative">
        <input
          {...props}
          id={inputId}
          type={secret && shown ? "text" : type}
          aria-describedby={[help ? helpId : null, props["aria-describedby"]].filter(Boolean).join(" ") || undefined}
          className={`h-[52px] w-full rounded-[14px] border border-line-2 bg-surface-2 text-[15.5px] text-fg outline-none transition-[border-color,box-shadow] placeholder:text-faint focus:border-fg focus:shadow-[0_0_0_3px_color-mix(in_srgb,var(--c-fg)_14%,transparent)] disabled:opacity-60 aria-[invalid=true]:border-danger ${
            secret ? "pl-4 pr-14" : "px-4"
          }`}
        />
        {secret && (
          <button
            type="button"
            onClick={() => setShown((s) => !s)}
            aria-label={shown ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}
            aria-pressed={shown}
            className="absolute right-1.5 top-1/2 inline-flex size-10 -translate-y-1/2 items-center justify-center rounded-full text-muted transition hover:bg-well hover:text-fg"
          >
            {shown ? <EyeOff size={18} aria-hidden /> : <Eye size={18} aria-hidden />}
          </button>
        )}
      </div>
      {help && (
        <p id={helpId} className="mt-2 text-[12.5px] leading-snug text-muted">
          {help}
        </p>
      )}
    </div>
  )
}

/** Something went wrong: announced straight away. */
export function Problem({ children }: { children: ReactNode }) {
  return (
    <p role="alert" className="flex items-start gap-2.5 rounded-[14px] border border-danger/40 bg-danger/[0.07] px-3.5 py-3 text-[14px] leading-snug text-fg">
      <TriangleAlert size={17} strokeWidth={2.2} aria-hidden className="mt-px shrink-0 text-danger" />
      <span>{children}</span>
    </p>
  )
}

/** A quiet confirmation that stays on screen after a save. */
export function Confirmation({ children }: { children: ReactNode }) {
  return (
    <p className="flex items-start gap-2.5 rounded-[14px] border border-line-2 bg-well/60 px-3.5 py-3 text-[14px] leading-snug text-fg-2">
      <CircleCheck size={17} strokeWidth={2.2} aria-hidden className="mt-px shrink-0 text-brand" />
      <span>{children}</span>
    </p>
  )
}

/** A small spinner for buttons that are waiting on the server. */
export function Spinner() {
  return <span aria-hidden className="size-4 animate-[spin_.8s_linear_infinite] rounded-full border-2 border-current/30 border-t-current" />
}

/** An on/off switch with its label and one line of explanation. */
export function ToggleRow({
  title, detail, on, onToggle, disabled = false,
}: { title: string; detail: ReactNode; on: boolean; onToggle: () => void; disabled?: boolean }) {
  const id = useId()
  return (
    <div className="flex items-start justify-between gap-5">
      <div className="min-w-0">
        <p id={`${id}-title`} className="text-[15px] font-semibold text-fg">
          {title}
        </p>
        <p id={`${id}-detail`} className="mt-1 text-[13.5px] leading-relaxed text-muted">
          {detail}
        </p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-labelledby={`${id}-title`}
        aria-describedby={`${id}-detail`}
        disabled={disabled}
        onClick={onToggle}
        className={`relative mt-0.5 h-[30px] w-[52px] shrink-0 rounded-full transition-colors duration-300 disabled:opacity-50 ${
          on ? "bg-solid" : "bg-well-2"
        }`}
      >
        <span
          aria-hidden
          className={`absolute left-[3px] top-[3px] size-6 rounded-full bg-surface-2 shadow-[0_1px_3px_rgb(0_0_0/0.3)] transition-transform duration-300 ease-spring ${
            on ? "translate-x-[22px]" : ""
          }`}
        />
      </button>
    </div>
  )
}
