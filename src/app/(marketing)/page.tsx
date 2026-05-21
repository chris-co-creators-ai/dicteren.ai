import { HeroSection } from "@/components/marketing/sections/hero";
import { ProofStripSection } from "@/components/marketing/sections/proof-strip";
import { ProblemContextSection } from "@/components/marketing/sections/problem-context";
import { HowItWorksSection } from "@/components/marketing/sections/how-it-works";
import { AudienceGridSection } from "@/components/marketing/sections/audience-grid";
import { PrivacySection } from "@/components/marketing/sections/privacy";
import { PricingPreviewSection } from "@/components/marketing/sections/pricing-preview";
import { FaqSection } from "@/components/marketing/sections/faq";
import { FinalCtaSection } from "@/components/marketing/sections/final-cta";

export default function HomePage() {
  return (
    <>
      <HeroSection />
      <ProofStripSection />
      <ProblemContextSection />
      <HowItWorksSection />
      <AudienceGridSection />
      <PrivacySection />
      <PricingPreviewSection />
      <FaqSection />
      <FinalCtaSection />
    </>
  );
}
