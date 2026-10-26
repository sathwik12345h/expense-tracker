import type { Metadata, Viewport } from "next"
import { Geist, Geist_Mono, Instrument_Serif } from "next/font/google"
import "./globals.css"

const sans = Geist({ subsets: ["latin"], variable: "--ff-sans", display: "swap" })
const mono = Geist_Mono({ subsets: ["latin"], variable: "--ff-mono", display: "swap" })
const serif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  variable: "--ff-serif",
  display: "swap",
})

export const metadata: Metadata = {
  title: "Spendwise — Personal Finance Tracker",
  description: "Track expenses, manage budgets, master your money.",
}

export const viewport: Viewport = {
  themeColor: "#f3f0e8",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sans.variable} ${mono.variable} ${serif.variable}`}>
      <body className="min-h-dvh antialiased">{children}</body>
    </html>
  )
}
