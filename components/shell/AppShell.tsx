"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import type { ReactNode } from "react"
import { ArrowLeftRight, ChartPie, House, PiggyBank, Search, type LucideIcon } from "lucide-react"
import { Logo, LogoMark } from "@/components/ui/Logo"
import { ThemeCoin } from "@/components/ui/ThemeCoin"
import { Kbd } from "@/components/ui/Button"
import PrivacyToggle from "@/components/shell/PrivacyToggle"
import QuickActions from "@/components/shell/QuickActions"
import { useAppActions } from "@/components/shell/AppActions"

interface Place {
  href: string
  label: string
  icon: LucideIcon
}

const PLACES: Place[] = [
  { href: "/dashboard", label: "Home", icon: House },
  { href: "/dashboard/activity", label: "Activity", icon: ArrowLeftRight },
  { href: "/dashboard/budget", label: "Budgets", icon: PiggyBank },
  { href: "/dashboard/insights", label: "Insights", icon: ChartPie },
]

const isHere = (path: string, href: string) => (href === "/dashboard" ? path === href : path === href || path.startsWith(`${href}/`))

/**
 * The signed-in frame. Wide screens get a floating rail down the left edge
 * and a coin-shaped quick-action button; phones get a slim top bar and a tab
 * bar with the add button in the middle.
 */
export default function AppShell({
  name, initials, signOut, children,
}: { name: string; initials: string; signOut: ReactNode; children: ReactNode }) {
  const pathname = usePathname()
  const { openPalette } = useAppActions()

  return (
    <div data-app-shell className="min-h-dvh lg:pl-[112px]">
      {/* ── rail (lg+) ── */}
      <aside className="glass fixed bottom-4 left-4 top-4 z-40 hidden w-[80px] flex-col items-center rounded-[28px] py-4 shadow-card lg:flex">
        <Link href="/dashboard" aria-label="Spendwise home" className="transition-transform duration-300 ease-spring hover:-translate-y-0.5 hover:rotate-[-8deg]">
          <LogoMark size={36} />
        </Link>

        <nav aria-label="Main" className="mt-7 flex flex-col gap-2">
          {PLACES.map(({ href, label, icon: Icon }) => {
            const active = isHere(pathname, href)
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={`group flex w-[60px] flex-col items-center gap-1 rounded-[18px] pb-1.5 pt-2.5 text-[10.5px] font-semibold transition ${
                  active ? "key3d key3d-solid bg-solid text-on-solid [--depth:4px]" : "text-muted hover:bg-well hover:text-fg"
                }`}
              >
                <Icon size={20} strokeWidth={active ? 2.2 : 1.9} aria-hidden className="transition-transform duration-300 ease-spring group-hover:-translate-y-0.5" />
                {label}
              </Link>
            )
          })}
        </nav>

        <div className="mt-auto flex flex-col items-center gap-2.5">
          <button
            type="button"
            onClick={openPalette}
            aria-label="Search and commands"
            title="Search and commands  (Ctrl K)"
            className="inline-flex size-10 items-center justify-center rounded-full text-muted transition hover:bg-well hover:text-fg"
          >
            <Search size={18} strokeWidth={2} aria-hidden />
          </button>
          <PrivacyToggle />
          <ThemeCoin size={38} />
          <span aria-hidden className="my-1 h-px w-8 bg-line-2" />
          <ProfileLink name={name} initials={initials} active={isHere(pathname, "/dashboard/profile")} />
          {signOut}
        </div>
      </aside>

      {/* ── top bar (below lg) ── */}
      <header className="sticky top-0 z-40 px-3 pt-3 lg:hidden">
        <div className="glass flex h-14 items-center justify-between rounded-[20px] pl-3 pr-2 shadow-card">
          <Logo href="/dashboard" />
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={openPalette}
              aria-label="Search and commands"
              className="inline-flex size-10 items-center justify-center rounded-full text-muted transition hover:bg-well hover:text-fg"
            >
              <Search size={18} strokeWidth={2} aria-hidden />
            </button>
            <PrivacyToggle />
            <ThemeCoin size={34} className="mx-1" />
            <ProfileLink name={name} initials={initials} active={isHere(pathname, "/dashboard/profile")} />
          </div>
        </div>
      </header>

      {children}

      {/* ── tab bar (below lg) ── */}
      <nav aria-label="Main" className="fixed inset-x-3 bottom-3 z-40 lg:hidden">
        <div className="glass grid h-[66px] grid-cols-5 items-center rounded-[24px] px-1.5 shadow-lift">
          {PLACES.slice(0, 2).map((p) => (
            <Tab key={p.href} place={p} active={isHere(pathname, p.href)} />
          ))}
          <QuickActions variant="tab" />
          {PLACES.slice(2).map((p) => (
            <Tab key={p.href} place={p} active={isHere(pathname, p.href)} />
          ))}
        </div>
      </nav>

      {/* ── coin button (lg+) ── */}
      <QuickActions variant="coin" />
    </div>
  )
}

/** The round initials badge: it is the way into the profile page. */
function ProfileLink({ name, initials, active }: { name: string; initials: string; active: boolean }) {
  return (
    <Link
      href="/dashboard/profile"
      aria-current={active ? "page" : undefined}
      aria-label={`Your profile (${name})`}
      title="Your profile"
      className={`inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-sky font-mono text-[12px] font-semibold tracking-wide text-on-sky transition duration-300 hover:scale-110 ${
        active ? "ring-2 ring-fg ring-offset-2 ring-offset-surface" : ""
      }`}
    >
      <span aria-hidden>{initials}</span>
    </Link>
  )
}

function Tab({ place: { href, label, icon: Icon }, active }: { place: Place; active: boolean }) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`flex h-[52px] flex-col items-center justify-center gap-1 rounded-[16px] text-[10.5px] font-semibold transition ${
        active ? "bg-solid text-on-solid" : "text-muted"
      }`}
    >
      <Icon size={19} strokeWidth={active ? 2.2 : 1.9} aria-hidden />
      {label}
    </Link>
  )
}

/** The page heading every screen opens with: small kicker, big title, optional actions on the right. */
export function PageHeader({
  kicker, title, children,
}: { kicker: ReactNode; title: ReactNode; children?: ReactNode }) {
  return (
    <header className="rise flex flex-wrap items-end justify-between gap-x-6 gap-y-4 pb-6 pt-5 sm:pt-8">
      <div className="min-w-0">
        <p className="eyebrow text-muted">{kicker}</p>
        <h1 className="mt-2.5 font-display text-[clamp(30px,4vw,46px)] leading-[1.02] text-fg">{title}</h1>
      </div>
      {children && <div className="flex flex-wrap items-center gap-2.5">{children}</div>}
    </header>
  )
}

/** "Search…  Ctrl K" — a button dressed as a search field that opens the palette. */
export function PaletteButton({ className = "" }: { className?: string }) {
  const { openPalette } = useAppActions()
  return (
    <button
      type="button"
      onClick={openPalette}
      className={`hidden h-11 items-center gap-2.5 rounded-full border-[1.5px] border-line-2 bg-surface pl-4 pr-2.5 text-[14px] text-muted transition hover:border-fg hover:text-fg md:inline-flex ${className}`}
    >
      <Search size={16} strokeWidth={2} aria-hidden />
      Search or jump to…
      <span className="ml-3 flex items-center gap-1" aria-hidden>
        <Kbd>Ctrl</Kbd>
        <Kbd>K</Kbd>
      </span>
    </button>
  )
}
