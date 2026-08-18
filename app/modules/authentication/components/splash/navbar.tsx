import { Menu, X } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router";
import sandpiperLogo from "~/assets/sandpiper-logo.svg";

export function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { label: "Why Sandpiper", href: "#benefits" },
    { label: "Features", href: "#features" },
    { label: "How It Works", href: "#how-it-works" },
    { label: "Orchestration", href: "#orchestration" },
    { label: "Evaluation", href: "#metrics" },
    { label: "Research", href: "#research" },
    { label: "About", href: "#about" },
    { label: "Privacy", href: "#privacy" },
  ];

  return (
    <nav className="fixed top-[32px] right-0 left-0 z-50 border-b border-[rgba(230,226,214,0.6)] bg-[#f9f7f1]/82 backdrop-blur-[20px]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <a
            href="#hero"
            className="font-display flex items-center gap-2 text-[1.3rem] font-bold text-[#2C241B] no-underline"
          >
            <img
              src={sandpiperLogo}
              alt="Sandpiper"
              className="h-[50px] w-[50px]"
            />
            Sandpiper
          </a>

          <div className="hidden items-center gap-6 lg:mr-6 lg:ml-auto lg:flex">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="text-[0.88rem] font-medium text-[#5D534A] no-underline transition-colors hover:text-[#B31B1B]"
              >
                {link.label}
              </a>
            ))}
          </div>

          <div className="hidden items-center gap-3 lg:flex">
            <Link
              to="/signup"
              className="rounded-[0.625rem] bg-[#367181] px-4 py-2 text-sm font-semibold text-white no-underline transition-all hover:bg-[#2a5a68]"
            >
              Open App
            </Link>
          </div>

          <button
            type="button"
            aria-label="Toggle menu"
            className="cursor-pointer border-none bg-transparent text-[#2C241B] lg:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {mobileMenuOpen && (
          <div className="border-t border-[#E6E2D6] py-4 lg:hidden">
            <div className="flex flex-col gap-3">
              {navLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className="text-[0.88rem] font-medium text-[#5D534A] no-underline transition-colors hover:text-[#B31B1B]"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {link.label}
                </a>
              ))}
              <div className="mt-2">
                <Link
                  to="/signup"
                  className="inline-block rounded-[0.625rem] bg-[#367181] px-4 py-2 text-sm font-semibold text-white no-underline"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Open App
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
