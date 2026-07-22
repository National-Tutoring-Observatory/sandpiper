import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  FileTextIcon,
  LockIcon,
  ShieldCheckIcon,
  XCircleIcon,
} from "lucide-react";

interface FullTermsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function FullTermsDialog({
  open,
  onOpenChange,
}: FullTermsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85vh] flex-col sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileTextIcon className="size-5" />
            Sandpiper Terms of Use and Privacy Policy
          </DialogTitle>
          <DialogDescription>Hosted by Cornell University</DialogDescription>
        </DialogHeader>

        <div className="text-body-lg space-y-4 overflow-y-auto">
          <p className="text-muted-foreground leading-relaxed">
            This Contract governing Users&rsquo; Terms of Use (TOU or Agreement)
            constitutes a legal and binding contract between you and{" "}
            <strong className="text-foreground">Cornell University</strong>{" "}
            (hereinafter &ldquo;Cornell&rdquo;), containing the terms and
            conditions for licensed access to the information and use of the{" "}
            <strong className="text-foreground">Sandpiper</strong> web
            application developed by the National Tutoring Observatory (NTO).
          </p>

          <div className="bg-destructive/5 border-destructive text-caption rounded-r-md border-l-[3px] px-3 py-2 font-semibold text-red-700 dark:text-red-400">
            Access to Sandpiper is offered to registered and authorized users.
            Use of this licensed content requires that you carefully read and
            agree in full with all of the terms and conditions of this agreement
            before accessing or continuing the use of the tool.
          </div>

          <SectionHeading num={1}>License Grant and Ownership</SectionHeading>
          <p className="text-muted-foreground leading-relaxed">
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
          <p className="text-muted-foreground leading-relaxed">
            When you log in via GitHub, we receive your GitHub username, display
            name, and GitHub user ID. This information is used solely to
            authenticate you and manage your access to the application. You
            agree that it is your responsibility to maintain your access and
            keep your credentials confidential.
          </p>

          <SectionHeading num={3}>
            Data Ingestion, Storage, and Privacy
          </SectionHeading>
          <p className="text-muted-foreground leading-relaxed">
            Your uploaded data, including tutoring transcripts and session
            interactions, are treated as confidential research data. By
            uploading data, you explicitly acknowledge the following processing
            flows:
          </p>

          <SubHeading icon={<LockIcon className="size-3.5" />}>
            Storage &amp; Encryption
          </SubHeading>
          <p className="text-muted-foreground leading-relaxed">
            Your uploaded data is encrypted at rest and in transit using
            industry-standard AES-256 encryption. The application and all data
            are hosted securely on Amazon Web Services (AWS) infrastructure in
            the United States.
          </p>

          <SubHeading icon={<ShieldCheckIcon className="size-3.5" />}>
            Cornell Secure AI Gateway
          </SubHeading>
          <p className="text-muted-foreground leading-relaxed">
            All Large Language Model (LLM) API calls for transcript annotation
            are routed through Cornell University&rsquo;s AI Gateway, a secure,
            university-managed proxy operated by the AI Innovation Hub. The
            gateway ensures that your prompts, responses, and data are never
            stored or used by the underlying model providers (e.g., OpenAI,
            Google, Anthropic). No data passes directly to third-party AI
            services outside of this controlled environment.
          </p>

          <SubHeading
            icon={<XCircleIcon className="text-destructive size-3.5" />}
          >
            Prohibited Uses of Data
          </SubHeading>
          <p className="text-muted-foreground leading-relaxed">
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
          <p className="text-muted-foreground leading-relaxed">
            In compliance with the General Data Protection Regulation (GDPR),
            users residing within the European Economic Area (EEA) possess
            specific rights regarding their personal data and any Personally
            Identifiable Information (PII) uploaded to Sandpiper. Users from the
            EU are permitted to use the platform under the condition that they
            understand these rights:
          </p>
          <ul className="text-muted-foreground list-disc space-y-1 pl-5 leading-relaxed">
            <li>
              <strong className="text-foreground">
                Right to Access and Portability:
              </strong>{" "}
              You have the right to request access to the personal data we hold
              about you and receive it in a structured format.
            </li>
            <li>
              <strong className="text-foreground">
                Right to Erasure (Right to be Forgotten):
              </strong>{" "}
              You may delete your data at any time from your project settings.
              Upon deletion, all associated files and annotations are
              permanently removed from our active AWS servers within 30 days.
              You may also request the complete deletion of your user account.
            </li>
            <li>
              <strong className="text-foreground">
                Right to Withdraw Consent:
              </strong>{" "}
              You can withdraw consent for processing at any time by ceasing use
              of the application and contacting NTO administrators to purge your
              account data.
            </li>
          </ul>
          <p className="text-muted-foreground leading-relaxed">
            Sandpiper is designed with FERPA- and COPPA-eligible workflows in
            mind for researchers working with educational data. Sandpiper
            strictly operates as a data processor for uploaded tutoring
            transcripts, and all processing is handled within Cornell&rsquo;s
            secure infrastructure, aligned with institutional data
            classification standards.
          </p>

          <SectionHeading num={5}>Analytics</SectionHeading>
          <p className="text-muted-foreground leading-relaxed">
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
          <p className="text-muted-foreground text-caption tracking-wide uppercase opacity-85">
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
          <p className="text-muted-foreground leading-relaxed">
            This License shall be governed by and construed in accordance with
            the laws of the United States and the State of New York. Any claim
            arising from or related to this Agreement must be brought in state
            or federal courts located in New York, and Users voluntarily agree
            to New York venue, jurisdiction, and governing law.
          </p>

          <SectionHeading num={8}>Contact Information</SectionHeading>
          <p className="text-muted-foreground leading-relaxed">
            If you have questions about this privacy policy or our data
            practices, please contact us through the National Tutoring
            Observatory or Cornell&rsquo;s privacy contacts. We will publish on
            our website any changes we make to this Privacy Statement.
          </p>

          <div className="text-muted-foreground border-border text-caption border-t pt-3">
            Questions? Reach us at{" "}
            <a
              href="mailto:CIS-NTO-PARTNERSHIPS-L@list.cornell.edu"
              className="text-primary font-semibold"
            >
              CIS-NTO-PARTNERSHIPS-L@list.cornell.edu
            </a>
          </div>
        </div>

        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
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
    <h3 className="text-heading flex items-center gap-2 pt-2 font-semibold">
      <span className="bg-primary text-caption flex size-5 shrink-0 items-center justify-center rounded-full font-bold text-white">
        {num}
      </span>
      {children}
    </h3>
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
    <h4 className="text-foreground text-heading flex items-center gap-1.5 font-semibold">
      <span className="text-primary">{icon}</span>
      {children}
    </h4>
  );
}
