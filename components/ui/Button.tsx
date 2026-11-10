import Link from "next/link"
import type { ButtonHTMLAttributes, ComponentProps, ReactNode } from "react"

export type ButtonVariant = "coral" | "sun" | "sky" | "solid" | "surface" | "ghost"
export type ButtonSize = "sm" | "md" | "lg"

const sizes: Record<ButtonSize, string> = {
  sm: "h-9 gap-1.5 px-4 text-[13px] [--depth:3px]",
  md: "h-11 gap-2 px-5 text-[14.5px] [--depth:4px]",
  lg: "h-14 gap-2.5 px-7 text-[16px] [--depth:5px]",
}

// Every filled variant is a keycap: it has an edge, and it travels when pressed.
const variants: Record<ButtonVariant, string> = {
  coral: "key3d bg-coral text-on-coral hover:bg-coral-2",
  sun: "key3d key3d-sun bg-sun text-on-sun hover:bg-sun-2",
  sky: "key3d key3d-sky bg-sky text-on-sky hover:bg-sky-2",
  solid: "key3d key3d-solid bg-solid text-on-solid hover:bg-solid-2",
  surface: "key3d key3d-surface border-[1.5px] border-line-2 bg-surface text-fg hover:bg-surface-2",
  ghost: "text-fg transition-colors hover:bg-well",
}

export function buttonClass({
  variant = "coral", size = "md", className = "",
}: { variant?: ButtonVariant; size?: ButtonSize; className?: string } = {}) {
  return `inline-flex shrink-0 select-none items-center justify-center whitespace-nowrap rounded-full font-semibold disabled:pointer-events-none disabled:opacity-50 ${sizes[size]} ${variants[variant]} ${className}`
}

interface Shared {
  variant?: ButtonVariant
  size?: ButtonSize
  children: ReactNode
}

export function Button({ variant, size, className, type = "button", ...props }: Shared & ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button type={type} className={buttonClass({ variant, size, className })} {...props} />
}

export function ButtonLink({ variant, size, className, ...props }: Shared & ComponentProps<typeof Link>) {
  return <Link className={buttonClass({ variant, size, className })} {...props} />
}

/** A square keycap for a single glyph: number pads, icon actions, shortcuts. */
export function Keycap({
  variant = "surface", className = "", type = "button", ...props
}: { variant?: ButtonVariant } & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type={type}
      className={`inline-flex select-none items-center justify-center rounded-[18px] font-display text-[26px] [--depth:5px] disabled:pointer-events-none disabled:opacity-40 ${variants[variant]} ${className}`}
      {...props}
    />
  )
}

/** A small inline key hint, e.g. the "N" beside "New transaction". */
export function Kbd({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <kbd
      className={`inline-flex h-[22px] min-w-[22px] items-center justify-center rounded-[7px] border-[1.5px] border-b-[3px] border-line-2 bg-surface px-1.5 font-mono text-[11px] font-medium leading-none text-fg-2 ${className}`}
    >
      {children}
    </kbd>
  )
}
