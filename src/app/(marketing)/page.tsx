import { HeroSection } from "@/components/marketing/sections/hero";
import { ReaderQuestionsSection } from "@/components/marketing/sections/reader-questions";
import { ProofStripSection } from "@/components/marketing/sections/proof-strip";
import { ProblemContextSection } from "@/components/marketing/sections/problem-context";
import { HowItWorksSection } from "@/components/marketing/sections/how-it-works";
import { MissionSection } from "@/components/marketing/sections/mission";
import { WorksAnywhereSection } from "@/components/marketing/sections/works-anywhere";
import { FeaturesInsideSection } from "@/components/marketing/sections/features-inside";
import { AudienceGridSection } from "@/components/marketing/sections/audience-grid";
import { PrivacySection } from "@/components/marketing/sections/privacy";
import { PricingPreviewSection } from "@/components/marketing/sections/pricing-preview";
import { FaqSection } from "@/components/marketing/sections/faq";
import { FinalCtaSection } from "@/components/marketing/sections/final-cta";

// AIDA: hero (Attention) → vragen + probleem (Interest) → missie + desire-
// secties (Desire) → pricing/faq/cta (Action).
export default function HomePage() {
  return (
    <>
      <HeroSection />
      <ReaderQuestionsSection />
      <ProofStripSection />
      <ProblemContextSection />
      <HowItWorksSection />
      <MissionSection />
      <WorksAnywhereSection />
      <FeaturesInsideSection />
      <AudienceGridSection />
      <PrivacySection />
      <PricingPreviewSection />
      <FaqSection />
      <FinalCtaSection />
    </>
  );
}
