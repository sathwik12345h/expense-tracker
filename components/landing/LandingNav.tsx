"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { ArrowRight } from "lucide-react"
import { Logo } from "@/components/ui/Logo"

export default function LandingNav() {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24)
    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-500 ${
        scrolled ? "border-b border-line bg-paper/85 backdrop-blur-md" : "border-b border-transparent"
      }`}
    >
      <nav className="mx-auto flex h-16 max-w-[1280px] items-center justify-between px-5 sm:h-[72px] sm:px-8">
        <Logo />
        <div className="hidden items-center gap-8 text-[14px] text-ink-2 md:flex">
          <a href="#how" className="transition hover:text-ink">How it works</a>
          <a href="#features" className="transition hover:text-ink">Features</a>
          <Link href="/login" className="transition hover:text-ink">Sign in</Link>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/login" className="px-3 py-2 text-[14px] text-ink-2 md:hidden">
            Sign in
          </Link>
          <Link
            href="/signup"
            className="group inline-flex h-10 items-center gap-2 rounded-full bg-ink pl-4 pr-3 text-[14px] font-medium text-on-ink transition hover:bg-ink-soft"
          >
            Start free
            <span className="inline-flex size-6 items-center justify-center rounded-full bg-lime text-ink transition-transform duration-300 group-hover:translate-x-0.5">
              <ArrowRight size={14} strokeWidth={2.2} />
            </span>
          </Link>
        </div>
      </nav>
    </header>
  )
}
