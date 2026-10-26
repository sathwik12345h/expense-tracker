import LandingNav from "@/components/landing/LandingNav"
import Hero from "@/components/landing/Hero"
import Ticker from "@/components/landing/Ticker"
import HowItWorks from "@/components/landing/HowItWorks"
import Features from "@/components/landing/Features"
import Statement from "@/components/landing/Statement"
import Closing from "@/components/landing/Closing"

export default function Home() {
  return (
    <main className="overflow-x-clip">
      <LandingNav />
      <Hero />
      <Ticker />
      <HowItWorks />
      <Features />
      <Statement />
      <Closing />
    </main>
  )
}
