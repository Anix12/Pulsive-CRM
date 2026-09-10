import { AiAgent } from '@/components/landing/ai-agent'
import { Analytics } from '@/components/landing/analytics'
import { Automation } from '@/components/landing/automation'
import { CrmPreview } from '@/components/landing/crm-preview'
import { Cta } from '@/components/landing/cta'
import { CustomizableCrm } from '@/components/landing/customizable-crm'
import { Features } from '@/components/landing/features'
import { Enquiry } from '@/components/landing/enquiry'
import { Footer } from '@/components/landing/footer'
import { Hero } from '@/components/landing/hero'
import { Marquee } from '@/components/landing/marquee'
import { Navbar } from '@/components/landing/navbar'
import { Pricing } from '@/components/landing/pricing'

export default function Home() {
  return (
    <main className="pulsive-landing relative min-h-screen overflow-x-hidden">
      <Navbar />
      <Hero />
      <Marquee />
      <Features />
      <CrmPreview />
      <CustomizableCrm />
      <AiAgent />
      <Automation />
      <Analytics />
      <Pricing />
      <Cta />
      <Enquiry />
      <Footer />
    </main>
  )
}
