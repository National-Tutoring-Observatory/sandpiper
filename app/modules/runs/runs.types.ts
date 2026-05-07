import type { Project } from "~/modules/projects/projects.types";
import type { Prompt } from "~/modules/prompts/prompts.types";
import type { RunSnapshot } from "~/modules/runs/services/buildRunSnapshot.server";

export type RunAnnotationType = "PER_UTTERANCE" | "PER_SESSION";

export interface Run {
  _id: string;
  name: string;
  project: Project | string;
  annotationType: string;
  prompt?: Prompt | string;
  promptVersion?: number;
  isHuman?: boolean;
  annotator?: {
    name: string;
  };
  isAdjudication?: boolean;
  adjudication?: {
    sourceRuns: string[];
    disagreements?: Record<string, unknown[]>;
  };
  sessions: RunSession[];
  snapshot: RunSnapshot;
  stoppedAt?: Date | string | null;
  isRunning: boolean;
  isComplete: boolean;
  hasErrored: boolean;
  createdAt: Date | string;
  startedAt: Date | string;
  finishedAt: Date | string;
  isExporting: boolean;
  shouldRunVerification: boolean;
}

export interface RunSession {
  sessionId: string;
  status: "DONE" | "RUNNING" | "ERRORED" | "STOPPED" | "NOT_STARTED";
  error?: string;
  name: string;
  fileType: string;
  startedAt: Date;
  finishedAt: Date;
}

export interface CreateRun {
  name: string;
  selectedAnnotationType: string;
  selectedPrompt: string | null;
  selectedPromptVersion: number | null;
  selectedModel: string;
  selectedSessions: string[];
  shouldRunVerification: boolean;
}

export interface CreateRunProps {
  project: string;
  name: string;
  sessions: string[];
  annotationType: RunAnnotationType;
  prompt: string;
  promptVersion: number;
  modelCode: string;
  shouldRunVerification: boolean;
  createdBy?: string;
  isAdjudication?: boolean;
  adjudication?: {
    sourceRuns: string[];
  };
}
