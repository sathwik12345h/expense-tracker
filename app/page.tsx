import SiteNav from "@/components/site/SiteNav"
import Hero from "@/components/site/Hero"
import Pile from "@/components/site/Pile"
import Layers from "@/components/site/Layers"
import FeatureIndex from "@/components/site/FeatureIndex"
import Showcase from "@/components/site/Showcase"
import Finale from "@/components/site/Finale"

export default function LandingPage() {
  return (
    <>
      <SiteNav />
      <main className="overflow-x-clip">
        <Hero />
        <Pile />
        <Layers />
        <FeatureIndex />
        <Showcase />
        <Finale />
      </main>
    </>
  )
}
