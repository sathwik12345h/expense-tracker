import type { Metadata, Viewport } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { THEME_SCRIPT } from "@/lib/themeScript"
import Spotlight from "@/components/ui/Spotlight"
import "./globals.css"

const sans = Geist({ subsets: ["latin"], variable: "--ff-sans", display: "swap" })
const mono = Geist_Mono({ subsets: ["latin"], variable: "--ff-mono", display: "swap" })

export const metadata: Metadata = {
  title: "Spendwise — Personal Finance Tracker",
  description: "Track expenses, manage budgets, master your money.",
}

export const viewport: Viewport = {
  themeColor: "#eef4e9",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // data-theme is set by the inline script before paint, so it can differ from the server's guess
    <html
      lang="en"
      data-theme="light"
      data-scroll-behavior="smooth"
      suppressHydrationWarning
      className={`${sans.variable} ${mono.variable}`}
    >
      <body className="min-h-dvh antialiased">
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
        <Spotlight />
        {children}
      </body>
    </html>
  )
}
