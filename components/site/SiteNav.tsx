"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { Logo } from "@/components/ui/Logo"
import { ThemeCoin } from "@/components/ui/ThemeCoin"
import { ButtonLink } from "@/components/ui/Button"

const LINKS = [
  { href: "#how", label: "How it works" },
  { href: "#features", label: "What's inside" },
  { href: "#play", label: "Try it" },
]

/** A floating pill of a nav bar: it tightens up once the page starts to scroll. */
export default function SiteNav() {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 30)
    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  return (
    <header className="pointer-events-none fixed inset-x-0 top-0 z-50 flex justify-center px-3 pt-3 sm:pt-4">
      <nav
        aria-label="Site"
        className={`glass pointer-events-auto flex h-[58px] w-full items-center gap-2 rounded-full pl-4 pr-2 transition-[max-width,box-shadow] duration-500 ease-out-quint ${
          scrolled ? "max-w-[860px] shadow-lift" : "max-w-[1180px] shadow-card"
        }`}
      >
        <Logo />
        <div className="ml-auto hidden items-center gap-1 md:flex">
          {LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="rounded-full px-3.5 py-2 text-[14px] font-medium text-fg-2 transition hover:bg-well hover:text-fg"
            >
              {l.label}
            </a>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-1.5 md:ml-2">
          <ThemeCoin size={36} className="mx-1.5" />
          <Link href="/login" className="hidden rounded-full px-3.5 py-2 text-[14px] font-semibold text-fg transition hover:bg-well sm:block">
            Sign in
          </Link>
          <ButtonLink href="/signup" size="sm" className="!h-10 !px-5 !text-[14px]">
            Get started
          </ButtonLink>
        </div>
      </nav>
    </header>
  )
}
