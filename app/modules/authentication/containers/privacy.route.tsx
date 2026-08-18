import { AnnouncementBanner } from "../components/splash/announcementBanner";
import { Footer } from "../components/splash/footer";
import { PolicyHeader } from "../components/splash/policyHeader";
import { PrivacyPolicy } from "../components/splash/privacyPolicy";

export const meta = () => [
  { title: "Terms of Use & Privacy Policy - Sandpiper" },
  {
    name: "description",
    content:
      "How Sandpiper handles tutoring transcripts and research data: encryption, Cornell's Secure AI Gateway, GDPR rights, and data deletion.",
  },
];

export default function PrivacyRoute() {
  return (
    // pt clears the fixed AnnouncementBanner, matching the offset Navbar uses.
    <div className="min-h-screen pt-[32px] font-sans text-[#2C241B]">
      <AnnouncementBanner />
      <PolicyHeader />
      <PrivacyPolicy />
      <Footer sectionHrefPrefix="/" />
    </div>
  );
}
