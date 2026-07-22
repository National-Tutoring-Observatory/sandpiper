import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  LockIcon,
  ShieldCheckIcon,
  Trash2Icon,
  XCircleIcon,
} from "lucide-react";
import { useState } from "react";
import sandpiperLogo from "~/assets/sandpiper-logo.svg";
import FullTermsDialog from "./fullTermsDialog";

interface TermsAcceptanceProps {
  isSubmitting: boolean;
  onAccept: () => void;
}

export default function TermsAcceptance({
  isSubmitting,
  onAccept,
}: TermsAcceptanceProps) {
  const [accepted, setAccepted] = useState(false);
  const [termsOpen, setTermsOpen] = useState(false);

  return (
    <div className="bg-muted flex min-h-screen w-screen items-center justify-center">
      <div className="bg-background w-full max-w-lg rounded-lg p-8 shadow-sm">
        <div className="mb-6 flex justify-center">
          <img
            src={sandpiperLogo}
            alt="Sandpiper"
            className="h-12 object-contain"
          />
        </div>
        <h1 className="text-display mb-1 text-center font-semibold">
          Terms of Use &amp; Privacy Policy
        </h1>
        <p className="text-muted-foreground text-body mb-6 text-center">
          Hosted by Cornell University
        </p>

        <p className="text-muted-foreground text-body mb-5">
          By using Sandpiper, you agree to our Terms of Use and Privacy Policy.
          Your data is encrypted, routed through Cornell&rsquo;s Secure AI
          Gateway, and never used to train AI models.
        </p>

        <div className="mb-5 space-y-3">
          <Highlight icon={<LockIcon className="size-4" />}>
            AES-256 encryption at rest and in transit on AWS
          </Highlight>
          <Highlight icon={<ShieldCheckIcon className="size-4" />}>
            All LLM calls routed through Cornell&rsquo;s Secure AI Gateway
          </Highlight>
          <Highlight icon={<XCircleIcon className="size-4" />}>
            Data never used to train, fine-tune, or improve AI systems
          </Highlight>
          <Highlight icon={<Trash2Icon className="size-4" />}>
            Delete your data anytime from project settings
          </Highlight>
        </div>

        <div className="border-border mb-5 border-t" />

        <div className="mb-6 flex items-center gap-2">
          <Checkbox
            id="terms-accept"
            className="mb-0.5"
            checked={accepted}
            onCheckedChange={(checked) => setAccepted(checked === true)}
          />
          <Label
            htmlFor="terms-accept"
            className="text-body cursor-pointer font-medium"
          >
            I have read and agree to the&nbsp;
          </Label>
          <button
            type="button"
            className="text-primary text-body -ml-1.5 font-semibold hover:underline"
            onClick={() => setTermsOpen(true)}
          >
            Terms&nbsp;of&nbsp;Use and Privacy&nbsp;Policy
          </button>
        </div>

        <Button
          className="w-full"
          disabled={!accepted || isSubmitting}
          onClick={onAccept}
        >
          {isSubmitting ? "Saving..." : "Continue \u2192"}
        </Button>
      </div>

      <FullTermsDialog open={termsOpen} onOpenChange={setTermsOpen} />
    </div>
  );
}

function Highlight({
  icon,
  children,
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="text-muted-foreground text-body flex items-start gap-2">
      <span className="text-primary mt-0.5 shrink-0">{icon}</span>
      <span>{children}</span>
    </div>
  );
}
