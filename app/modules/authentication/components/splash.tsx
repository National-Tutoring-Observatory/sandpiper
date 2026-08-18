import { About } from "./splash/about";
import { AnnouncementBanner } from "./splash/announcementBanner";
import { Benefits } from "./splash/benefits";
import { CTASection } from "./splash/ctaSection";
import { DataPrivacy } from "./splash/dataPrivacy";
import { Features } from "./splash/features";
import { Footer } from "./splash/footer";
import { Hero } from "./splash/hero";
import { HowItWorks } from "./splash/howItWorks";
import { Impact } from "./splash/impact";
import { Metrics } from "./splash/metrics";
import { Navbar } from "./splash/navbar";
import { Orchestration } from "./splash/orchestration";
import { Partners } from "./splash/partners";
import { Research } from "./splash/research";

export default function Splash() {
  return (
    <div className="min-h-screen font-sans text-[#2C241B]">
      <AnnouncementBanner />
      <Navbar />
      <div className="flex flex-col [@media(min-height:900px)]:min-h-svh">
        <Hero />
        <Partners />
      </div>
      <Benefits />
      <Features />
      <HowItWorks />
      <Orchestration />
      <Metrics />
      <Research />
      <About />
      <Impact />
      <DataPrivacy />
      <CTASection />
      <Footer sectionHrefPrefix="" />
    </div>
  );
}
