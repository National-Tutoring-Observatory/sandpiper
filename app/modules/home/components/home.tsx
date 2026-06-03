import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  ArrowUpToLine,
  Download,
  ExternalLink,
  FolderOpen,
  Link2,
  Loader2,
  PenLine,
  Share2,
} from "lucide-react";
import type { ReactNode } from "react";
import { useState } from "react";
import { Link } from "react-router";
import {
  PROMPTS_CREATE_PARAM,
  promptsUrl,
} from "~/modules/prompts/helpers/promptUrls";

export default function Home({
  onDownloadClicked,
  isDownloading,
  initialCredits,
  activeTeamId,
}: {
  onDownloadClicked: () => void;
  isDownloading: boolean;
  initialCredits: number;
  activeTeamId: string;
}) {
  const [agreed, setAgreed] = useState(false);
  return (
    <div className="container mx-auto max-w-4xl space-y-4 px-6 py-8">
      <div className="flex items-start justify-between gap-6">
        <div className="flex-1">
          <h1 className="text-3xl font-bold">
            Welcome to <span className="text-primary">Sandpiper</span>
          </h1>
          <p className="text-muted-foreground mt-2 text-sm">
            AI-powered discourse annotation that&apos;s fast, reliable, and
            built for rigorous research.
          </p>
          <p className="text-muted-foreground mt-3 text-xs">
            Built by the&nbsp;
            <strong className="text-foreground">
              National Tutoring Observatory
            </strong>
            &nbsp;at Cornell Bowers CIS, with MIT Teaching Systems Lab, Carnegie
            Mellon, and FreshCognate.
          </p>
          <p className="text-foreground mt-3 text-xs font-semibold">
            Read our papers
          </p>
          <ul className="mt-1 flex flex-col gap-1 text-xs">
            <li>
              <a
                href="https://doi.org/10.48550/arXiv.2603.08406"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary inline-flex items-center gap-1 font-semibold"
              >
                <ExternalLink className="h-3 w-3 shrink-0" />
                Sandpiper (arXiv 2603.08406)
              </a>
            </li>
            <li>
              <a
                href="https://arxiv.org/abs/2605.08092"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary inline-flex items-center gap-1 font-semibold"
              >
                <ExternalLink className="h-3 w-3 shrink-0" />
                Million Tutoring Moves (arXiv 2605.08092)
              </a>
            </li>
          </ul>
        </div>
        <div className="border-primary flex w-48 shrink-0 flex-col items-center rounded-lg border-2 bg-gradient-to-br from-[#e8f4f7] to-[#f0f7f4] p-4 text-center">
          <p className="text-primary text-4xl leading-none font-extrabold">
            ${initialCredits}
          </p>
          <p className="text-primary mt-1 text-xs font-semibold">
            free credit included
          </p>
          <p className="text-muted-foreground mt-2 text-xs leading-snug">
            Enough to annotate{" "}
            <strong className="text-foreground">~75 sessions</strong> across 3
            models with self-verification.
          </p>
        </div>
      </div>
      <Card>
        <CardContent className="flex flex-col items-center gap-4 p-6">
          <h2 className="text-xl font-semibold">Get Started</h2>
          <div className="flex items-center gap-3">
            <Button asChild>
              <Link to="/projects" state={{ create: true }}>
                <FolderOpen className="h-4 w-4" />
                Start a Project
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link
                to={`${promptsUrl(activeTeamId)}?${PROMPTS_CREATE_PARAM}=1`}
              >
                <PenLine className="h-4 w-4" />
                Create a Prompt
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <p className="text-muted-foreground mb-6 text-center text-lg font-semibold tracking-widest">
            How It Works
          </p>
          <div className="flex items-start justify-center gap-4">
            <Step
              icon={<ArrowUpToLine className="text-primary h-5 w-5" />}
              label="Upload"
              sub="Import transcripts"
              borderClass="border-primary"
            />
            <span className="text-muted-foreground mt-6 text-sm">→</span>
            <Step
              icon={<PenLine className="text-primary h-5 w-5" />}
              label="Prompt"
              sub="Define coding scheme"
              borderClass="border-primary"
            />
            <span className="text-muted-foreground mt-6 text-sm">→</span>
            <Step
              icon={<Share2 className="text-primary h-5 w-5" />}
              label="Orchestrate"
              sub="Multiple LLMs + adjudication"
              borderClass="border-primary"
            />
            <span className="text-muted-foreground mt-6 text-sm">→</span>
            <Step
              icon={<Link2 className="text-primary h-5 w-5" />}
              label="Evaluate"
              sub="Kappa, F1, precision, recall"
              borderClass="border-primary"
            />
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-6">
            <h3 className="mb-4 text-center text-sm font-semibold">
              Orchestration &amp; Adjudication
            </h3>
            <div className="bg-sandpiper-surface space-y-3 rounded-lg p-4">
              <div className="flex justify-center gap-3">
                <LlmBox
                  label="GPT-4"
                  run="Run A"
                  runClass="text-green-700 bg-green-100"
                />
                <LlmBox
                  label="Gemini"
                  run="Run B"
                  runClass="text-blue-700 bg-blue-100"
                />
                <LlmBox
                  label="Claude"
                  run="Run C"
                  runClass="text-destructive bg-destructive/10"
                />
              </div>
              <div className="text-muted-foreground flex justify-center gap-8 text-xs">
                <span>▼</span>
                <span>▼</span>
                <span>▼</span>
              </div>
              <div className="bg-primary text-primary-foreground mx-auto max-w-[200px] rounded-md p-3 text-center">
                <p className="text-sm font-medium">Adjudication Engine</p>
                <p className="text-primary-foreground/70 text-xs">
                  Compare · Resolve · Consensus
                </p>
              </div>
              <div className="text-muted-foreground flex justify-center text-xs">
                <span>▼</span>
              </div>
              <div className="border-primary mx-auto max-w-[200px] rounded-md border-2 p-3 text-center">
                <p className="text-primary text-sm font-semibold">
                  Consensus Annotation
                </p>
                <p className="text-muted-foreground text-xs">
                  More reliable than any single model
                </p>
              </div>
              <div className="flex justify-center pt-1">
                <span className="bg-destructive rounded-full px-3 py-1 text-xs text-white">
                  130% better performance than conversational AI
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="flex flex-col">
          <CardContent className="flex flex-1 flex-col p-6">
            <h3 className="mb-4 text-center text-sm font-semibold">
              See Sandpiper in Action
            </h3>
            <div className="bg-sandpiper-surface flex-1 overflow-hidden rounded-lg">
              <iframe
                src="https://www.youtube.com/embed/cHshZ9bQMxg?si=siFkRjq434GcQLb0"
                title="YouTube video player"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                referrerPolicy="strict-origin-when-cross-origin"
                allowFullScreen
                className="h-full w-full"
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-6">
          <h3 className="mb-2 text-center text-sm font-bold">
            Million Tutor Moves Dataset
          </h3>
          <p className="text-muted-foreground mb-4 text-center text-sm">
            Download over one million tutoring interactions from seven platforms
            — ready for annotation in Sandpiper or your own research pipeline.
          </p>
          <div className="bg-muted mb-4 flex items-start gap-3 rounded-lg p-4">
            <Checkbox
              id="mtmAgree"
              checked={agreed}
              onCheckedChange={(checked) => setAgreed(checked === true)}
            />
            <label
              htmlFor="mtmAgree"
              className="text-foreground cursor-pointer text-xs leading-relaxed"
            >
              I agree that MTM data made available in Sandpiper cannot be used
              in any way that may harm teachers and/or students, including but
              not limited to trying to re-identify students or teachers after
              de-identification has occurred, building a model that could
              discriminate against teachers or students from a particular
              demographic group, or to surveil and punish teachers based on
              their practice.
            </label>
          </div>
          <div className="flex justify-center">
            <Button
              disabled={!agreed || isDownloading}
              onClick={onDownloadClicked}
            >
              {isDownloading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              Download MTM Dataset
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Step({
  icon,
  label,
  sub,
  borderClass,
}: {
  icon: ReactNode;
  label: string;
  sub: string;
  borderClass: string;
}) {
  return (
    <div className="flex w-24 flex-col items-center gap-2 text-center">
      <div
        className={`h-14 w-14 rounded-full border-2 ${borderClass} flex items-center justify-center`}
      >
        {icon}
      </div>
      <p className="text-sm font-medium">{label}</p>
      <p className="text-muted-foreground text-xs leading-tight">{sub}</p>
    </div>
  );
}

function LlmBox({
  label,
  run,
  runClass,
}: {
  label: string;
  run: string;
  runClass: string;
}) {
  return (
    <div className="bg-background border-border min-w-[64px] rounded-md border p-2 text-center">
      <p className="text-sm font-medium">{label}</p>
      <span className={`rounded px-1.5 py-0.5 text-xs ${runClass}`}>{run}</span>
    </div>
  );
}
