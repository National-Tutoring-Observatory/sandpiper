import {
  FileTextIcon,
  LockIcon,
  ShieldCheckIcon,
  XCircleIcon,
} from "lucide-react";

export function PrivacyPolicy() {
  return (
    <section
      id="privacy-policy"
      className="pt-16 pb-22"
      style={{
        background: "linear-gradient(170deg, #F9F7F1 0%, #f0ece0 100%)",
      }}
    >
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <div className="mb-2 flex items-center gap-2 text-[0.72rem] font-bold tracking-[0.14em] text-[#A64B2A] uppercase">
          <FileTextIcon size={14} />
          Terms &amp; Privacy
        </div>
        <h1 className="font-display text-section-heading mb-3 leading-[1.15] font-bold tracking-[-0.01em] text-[#2C241B]">
          Terms of Use and Privacy Policy
        </h1>
        <p className="mb-10 text-[1.05rem] text-[#5D534A]">
          Hosted by Cornell University
        </p>

        <div className="space-y-4">
          <p className="text-base leading-[1.8] text-[#5D534A]">
            This Contract governing Users&rsquo; Terms of Use (TOU or Agreement)
            constitutes a legal and binding contract between you and{" "}
            <strong className="font-semibold text-[#2C241B]">
              Cornell University
            </strong>{" "}
            (hereinafter &ldquo;Cornell&rdquo;), containing the terms and
            conditions for licensed access to the information and use of the{" "}
            <strong className="font-semibold text-[#2C241B]">Sandpiper</strong>{" "}
            web application developed by the National Tutoring Observatory
            (NTO).
          </p>

          <div className="rounded-r-md border-l-[3px] border-[#B31B1B] bg-[rgba(179,27,27,0.05)] px-4 py-3 text-[0.85rem] leading-[1.7] font-semibold text-[#8B1515]">
            Access to Sandpiper is offered to registered and authorized users.
            Use of this licensed content requires that you carefully read and
            agree in full with all of the terms and conditions of this agreement
            before accessing or continuing the use of the tool.
          </div>

          <SectionHeading num={1}>License Grant and Ownership</SectionHeading>
          <p className="text-base leading-[1.8] text-[#5D534A]">
            Cornell hereby grants to you a limited, non-exclusive,
            non-sublicensable license to access Sandpiper solely for research
            and educational purposes. Cornell is and remains the owner of all
            right, title, and interest (including copyright, patent, trade
            secret, and other proprietary rights) in and to Sandpiper. Nothing
            in this Agreement will be construed as granting Users any title or
            interest in the underlying technology.
          </p>

          <SectionHeading num={2}>
            User Information and Authentication
          </SectionHeading>
          <p className="text-base leading-[1.8] text-[#5D534A]">
            When you log in via GitHub, we receive your GitHub username, display
            name, and GitHub user ID. This information is used solely to
            authenticate you and manage your access to the application. You
            agree that it is your responsibility to maintain your access and
            keep your credentials confidential.
          </p>

          <SectionHeading num={3}>
            Data Ingestion, Storage, and Privacy
          </SectionHeading>
          <p className="text-base leading-[1.8] text-[#5D534A]">
            Your uploaded data, including tutoring transcripts and session
            interactions, are treated as confidential research data. By
            uploading data, you explicitly acknowledge the following processing
            flows:
          </p>

          <SubHeading icon={<LockIcon className="size-4" />}>
            Storage &amp; Encryption
          </SubHeading>
          <p className="text-base leading-[1.8] text-[#5D534A]">
            Your uploaded data is encrypted at rest and in transit using
            industry-standard AES-256 encryption. The application and all data
            are hosted securely on Amazon Web Services (AWS) infrastructure in
            the United States.
          </p>

          <SubHeading icon={<ShieldCheckIcon className="size-4" />}>
            Cornell Secure AI Gateway
          </SubHeading>
          <p className="text-base leading-[1.8] text-[#5D534A]">
            All Large Language Model (LLM) API calls for transcript annotation
            are routed through Cornell University&rsquo;s AI Gateway, a secure,
            university-managed proxy operated by the AI Innovation Hub. The
            gateway ensures that your prompts, responses, and data are never
            stored or used by the underlying model providers (e.g., OpenAI,
            Google, Anthropic). No data passes directly to third-party AI
            services outside of this controlled environment.
          </p>

          <SubHeading icon={<XCircleIcon className="size-4" />}>
            Prohibited Uses of Data
          </SubHeading>
          <p className="text-base leading-[1.8] text-[#5D534A]">
            We will never use your uploaded data to train, fine-tune, evaluate,
            or improve foundation models, speech models, tutoring models,
            biometric systems, or other general-purpose AI systems. We do not
            sell your personal information, share data for advertising purposes,
            or access your data for internal NTO analyses without explicit
            consent.
          </p>

          <SectionHeading num={4}>
            GDPR Compliance and Rights for EU Users
          </SectionHeading>
          <p className="text-base leading-[1.8] text-[#5D534A]">
            In compliance with the General Data Protection Regulation (GDPR),
            users residing within the European Economic Area (EEA) possess
            specific rights regarding their personal data and any Personally
            Identifiable Information (PII) uploaded to Sandpiper. Users from the
            EU are permitted to use the platform under the condition that they
            understand these rights:
          </p>
          <ul className="list-disc space-y-2 pl-5 text-base leading-[1.8] text-[#5D534A]">
            <li>
              <strong className="font-semibold text-[#2C241B]">
                Right to Access and Portability:
              </strong>{" "}
              You have the right to request access to the personal data we hold
              about you and receive it in a structured format.
            </li>
            <li>
              <strong className="font-semibold text-[#2C241B]">
                Right to Erasure (Right to be Forgotten):
              </strong>{" "}
              You may delete your data at any time from your project settings.
              Upon deletion, all associated files and annotations are
              permanently removed from our active AWS servers within 30 days.
              You may also request the complete deletion of your user account.
            </li>
            <li>
              <strong className="font-semibold text-[#2C241B]">
                Right to Withdraw Consent:
              </strong>{" "}
              You can withdraw consent for processing at any time by ceasing use
              of the application and contacting NTO administrators to purge your
              account data.
            </li>
          </ul>
          <p className="text-base leading-[1.8] text-[#5D534A]">
            Sandpiper is designed with FERPA- and COPPA-eligible workflows in
            mind for researchers working with educational data. Sandpiper
            strictly operates as a data processor for uploaded tutoring
            transcripts, and all processing is handled within Cornell&rsquo;s
            secure infrastructure, aligned with institutional data
            classification standards.
          </p>

          <SectionHeading num={5}>Analytics</SectionHeading>
          <p className="text-base leading-[1.8] text-[#5D534A]">
            We use Google Analytics 4 to collect anonymized usage data (e.g.,
            pages visited, performance metrics, device types). Google Analytics
            uses cookies to distinguish unique users and sessions. IP addresses
            are anonymized by default, and we have disabled Google Signals and
            all advertising features. You can opt out of Google Analytics
            tracking by installing the Google Analytics Opt-out Browser Add-on.
            Analytics data is retained for 14 months before automatic deletion.
          </p>

          <SectionHeading num={6}>
            No Warranty and Limitation of Liability
          </SectionHeading>
          <p className="text-[0.8rem] leading-[1.7] tracking-wide text-[#5D534A] uppercase">
            The tool is provided &ldquo;as is&rdquo; without warranty of any
            kind, express or implied. Cornell and FreshCognate will not be
            responsible to you or your entity for any consequences, foreseeable
            or unforeseeable, for losses or damages of any kind, including
            indirect, incidental, or consequential damages arising out of the
            use or reliance upon Sandpiper.
          </p>

          <SectionHeading num={7}>
            Governing Law and Jurisdiction
          </SectionHeading>
          <p className="text-base leading-[1.8] text-[#5D534A]">
            This License shall be governed by and construed in accordance with
            the laws of the United States and the State of New York. Any claim
            arising from or related to this Agreement must be brought in state
            or federal courts located in New York, and Users voluntarily agree
            to New York venue, jurisdiction, and governing law.
          </p>

          <SectionHeading num={8}>Contact Information</SectionHeading>
          <p className="text-base leading-[1.8] text-[#5D534A]">
            If you have questions about this privacy policy or our data
            practices, please contact us through the National Tutoring
            Observatory or Cornell&rsquo;s privacy contacts. We will publish on
            our website any changes we make to this Privacy Statement.
          </p>

          <div className="mt-8 border-t border-[#E6E2D6] pt-5 text-[0.9rem] text-[#5D534A]">
            Questions? Reach us at{" "}
            <a
              href="mailto:CIS-NTO-PARTNERSHIPS-L@list.cornell.edu"
              className="font-semibold text-[#A64B2A] underline hover:text-[#8B3D21]"
            >
              CIS-NTO-PARTNERSHIPS-L@list.cornell.edu
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

function SectionHeading({
  num,
  children,
}: {
  num: number;
  children: React.ReactNode;
}) {
  return (
    <h2 className="font-display flex items-center gap-3 pt-6 text-[1.15rem] font-bold text-[#2C241B]">
      <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-[#367181] text-[0.75rem] font-bold text-white">
        {num}
      </span>
      {children}
    </h2>
  );
}

function SubHeading({
  icon,
  children,
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <h3 className="font-display flex items-center gap-2 pt-2 text-[1rem] font-semibold text-[#2C241B]">
      <span className="text-[#367181]">{icon}</span>
      {children}
    </h3>
  );
}
