import {
  EyeOffIcon,
  LockIcon,
  ShieldCheckIcon,
  Trash2Icon,
} from "lucide-react";
import { Link } from "react-router";

export function DataPrivacy() {
  const highlights = [
    {
      icon: <EyeOffIcon size={22} />,
      color: "#367181",
      title: "Confidential by Default",
      description:
        "Not sold, not shared for advertising, and never accessed for internal analyses without your explicit consent.",
    },
    {
      icon: <ShieldCheckIcon size={22} />,
      color: "#D4A843",
      title: "Cornell Secure AI Gateway",
      description:
        "Annotation calls run through Cornell's university-managed LiteLLM gateway. Never stored by model providers, never used to train AI systems.",
    },
    {
      icon: <LockIcon size={22} />,
      color: "#D8654F",
      title: "Encrypted at Rest and in Transit",
      description:
        "AES-256 encryption, on AWS infrastructure in the United States.",
    },
    {
      icon: <Trash2Icon size={22} />,
      color: "#A64B2A",
      title: "Yours to Delete",
      description:
        "Delete your data at any time from project settings. Removal from active servers completes within 30 days.",
    },
  ];

  return (
    <section
      id="privacy"
      className="relative overflow-hidden py-22 text-white"
      style={{
        background:
          "linear-gradient(135deg, #2C241B 0%, #322b22 45%, #2a3530 100%)",
      }}
    >
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 600px 400px at 15% 25%, rgba(54,113,129,0.1), transparent), radial-gradient(ellipse 500px 400px at 85% 75%, rgba(212,168,67,0.07), transparent)",
        }}
      />
      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-12 text-center">
          <div className="mb-2 text-[0.72rem] font-bold tracking-[0.14em] text-[#D4A843] uppercase">
            Data &amp; Privacy
          </div>
          <h2 className="font-display text-section-heading mb-4 leading-[1.15] font-bold tracking-[-0.01em]">
            Built for Research Data
          </h2>
          <p className="mx-auto max-w-[620px] text-[1.05rem] leading-[1.7] text-white/50">
            Sandpiper is hosted by Cornell University, and every commitment
            below is written into the policy itself.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {highlights.map((highlight) => (
            <div
              key={highlight.title}
              className="rounded-2xl border border-[rgba(255,255,255,0.08)] bg-white/4 p-8 backdrop-blur-[12px] transition-all hover:-translate-y-1 hover:border-[rgba(255,255,255,0.15)] hover:bg-[rgba(255,255,255,0.08)]"
            >
              <div className="mb-4" style={{ color: highlight.color }}>
                {highlight.icon}
              </div>
              <div className="mb-2 text-[0.95rem] font-semibold">
                {highlight.title}
              </div>
              <div className="text-[0.85rem] leading-relaxed text-white/55">
                {highlight.description}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-12 text-center">
          <Link
            to="/privacy"
            className="inline-flex items-center gap-2 rounded-[0.625rem] border-2 border-[rgba(255,255,255,0.5)] bg-transparent px-7 py-3 font-semibold text-white no-underline transition-all hover:border-white hover:bg-[rgba(255,255,255,0.12)]"
          >
            Read the full Terms of Use &amp; Privacy Policy &rarr;
          </Link>
        </div>
      </div>
    </section>
  );
}
