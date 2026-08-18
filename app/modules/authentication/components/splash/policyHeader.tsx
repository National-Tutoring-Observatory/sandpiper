import { ArrowLeftIcon } from "lucide-react";
import { Link } from "react-router";
import sandpiperLogo from "~/assets/sandpiper-logo.svg";

// The marketing Navbar links to on-page sections (#features, #about, ...) that
// only exist on the splash. Policy pages get this slim header instead so none
// of those anchors can go dead.
export function PolicyHeader() {
  return (
    <header className="border-b border-[rgba(230,226,214,0.6)] bg-[#f9f7f1]/82 backdrop-blur-[20px]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between gap-4">
          <Link
            to="/"
            className="font-display flex items-center gap-2 text-[1.3rem] font-bold text-[#2C241B] no-underline"
          >
            <img
              src={sandpiperLogo}
              alt="Sandpiper"
              className="h-[50px] w-[50px]"
            />
            Sandpiper
          </Link>

          <div className="flex items-center gap-4 sm:gap-6">
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 text-[0.88rem] font-medium text-[#5D534A] no-underline transition-colors hover:text-[#B31B1B]"
            >
              <ArrowLeftIcon size={14} />
              Back to home
            </Link>
            <Link
              to="/signup"
              className="rounded-[0.625rem] bg-[#367181] px-4 py-2 text-sm font-semibold text-white no-underline transition-all hover:bg-[#2a5a68]"
            >
              Open App
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
