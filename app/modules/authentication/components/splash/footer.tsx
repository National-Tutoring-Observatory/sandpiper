import { Link } from "react-router";
import sandpiperLogo from "~/assets/sandpiper-logo.svg";

// Section links are in-page anchors on the splash, but must navigate home
// first from any other page. Pass "" on the splash and "/" elsewhere.
export function Footer({ sectionHrefPrefix }: { sectionHrefPrefix: string }) {
  return (
    <footer className="bg-[#2C241B] py-8 text-[0.82rem] text-[rgba(255,255,255,0.5)]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center gap-6 md:flex-row md:justify-between">
          <div>
            <div className="mb-1 flex items-center gap-2">
              <img
                src={sandpiperLogo}
                alt="Sandpiper"
                className="h-5 w-5 rounded-sm opacity-70"
              />
              <span className="font-display font-semibold text-white/60">
                Sandpiper
              </span>
            </div>
            <span>
              &copy; 2026 National Tutoring Observatory &middot; Cornell
              University
            </span>
          </div>
          <div className="flex gap-6">
            <a
              href={`${sectionHrefPrefix}#hero`}
              className="text-[rgba(255,255,255,0.55)] no-underline transition-colors hover:text-[#D4A843]"
            >
              Home
            </a>
            <a
              href={`${sectionHrefPrefix}#features`}
              className="text-[rgba(255,255,255,0.55)] no-underline transition-colors hover:text-[#D4A843]"
            >
              Features
            </a>
            <a
              href={`${sectionHrefPrefix}#how-it-works`}
              className="text-[rgba(255,255,255,0.55)] no-underline transition-colors hover:text-[#D4A843]"
            >
              How It Works
            </a>
            <a
              href={`${sectionHrefPrefix}#about`}
              className="text-[rgba(255,255,255,0.55)] no-underline transition-colors hover:text-[#D4A843]"
            >
              About
            </a>
            <Link
              to="/privacy"
              className="text-[rgba(255,255,255,0.55)] no-underline transition-colors hover:text-[#D4A843]"
            >
              Privacy Policy
            </Link>
          </div>
          <div>
            <span>Built by </span>
            <a
              href="https://freshcognate.com"
              target="_blank"
              rel="noreferrer"
              className="text-[#D4A843] no-underline"
            >
              FreshCognate
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
