"use client"

import Link from "next/link"
import { useState } from "react"
import { usePathname } from "next/navigation"

const tabs = [
  { href: "/dashboard", label: "Overview" },
  { href: "/dashboard/budget", label: "Budgets" },
]

function tabFor(path: string) {
  return path === "/dashboard/budget" || path.startsWith("/dashboard/budget/") ? 1 : 0
}

/**
 * The app's two tabs in a pill track. The ink tab slides as soon as a link is
 * clicked, rather than waiting for the next route to finish rendering.
 */
export default function AppNav() {
  const pathname = usePathname()
  // Remember which tab was clicked and from where; once the path changes the
  // real pathname takes over again (derived during render, no effect needed).
  const [clicked, setClicked] = useState<{ href: string; from: string } | null>(null)
  const active = tabFor(clicked && clicked.from === pathname ? clicked.href : pathname)
  const current = tabFor(pathname)

  return (
    <nav aria-label="Main">
      <div className="relative grid h-10 grid-cols-2 rounded-full bg-paper-2 p-1 shadow-[inset_0_0_0_1px_var(--color-line)]">
        <span
          aria-hidden
          className="absolute inset-y-1 left-1 rounded-full bg-ink shadow-[0_6px_14px_-6px_rgb(22_21_15/0.6)] transition-transform duration-500 ease-out-quint"
          style={{ width: `calc((100% - 8px) / ${tabs.length})`, transform: `translateX(${active * 100}%)` }}
        />
        {tabs.map((t, i) => (
          <Link
            key={t.href}
            href={t.href}
            aria-current={i === current ? "page" : undefined}
            onClick={() => setClicked({ href: t.href, from: pathname })}
            className={`relative z-10 inline-flex items-center justify-center whitespace-nowrap rounded-full px-4 text-[13.5px] font-medium transition-colors duration-300 sm:px-6 ${
              i === active ? "text-on-ink" : "text-muted hover:text-ink"
            }`}
          >
            {t.label}
          </Link>
        ))}
      </div>
    </nav>
  )
}
