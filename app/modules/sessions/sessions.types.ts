import type { File } from "~/modules/files/files.types";
import type { Project } from "~/modules/projects/projects.types";
import type { Tag } from "../tags/tags.types";

export interface Session {
  _id: string;
  name: string;
  project: Project | string;
  file: File | string;
  sessionId?: string;
  fileType?: string;
  error?: string;
  hasConverted: boolean;
  inputTokens?: number;
  hasErrored: boolean;
  startedAt?: string;
  finishedAt?: string;
  tags?: (Tag | string)[];
  createdAt?: string;
  createdBy?: string;
  updatedAt?: string;
  updatedBy?: string;
}

export type SessionData = Pick<Session, "_id" | "inputTokens">;

export interface SessionFile {
  transcript: Utterance[];
  session_id?: string;
  leadRole: string;
  annotations: Annotation[];
  preVerificationAnnotations?: Annotation[];
}

export interface Utterance {
  _id: string;
  // Required at ingestion; legacy sessions may be missing it at runtime.
  role: string;
  content: string;
  start_time: string;
  end_time: string;
  timestamp: string;
  session_id: string;
  sequence_id: string | number;
  annotations: Annotation[];
}

export interface Annotation {
  _id: string;
  identifiedBy: string;
  markedAs?: "UP_VOTED" | "DOWN_VOTED";
  votingReason?: string;
  [key: string]: unknown;
}
