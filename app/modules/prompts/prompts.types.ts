import type { AnnotationTypeOptions } from "~/modules/annotations/helpers/annotationTypes";
import type { Team } from "../teams/teams.types";
import type { User } from "../users/users.types";

export interface PromptPaperRef {
  title: string;
  url: string;
}

export interface PromptAuthor {
  name: string;
  affiliation?: string;
}

export interface PromptLibrary {
  isPublished: boolean;
  description: string;
  authors: PromptAuthor[];
  paperRefs: PromptPaperRef[];
  publishedAt?: Date | string;
}

export interface PromptCopiedFrom {
  prompt: string;
  name: string;
  version: number;
  copiedAt: Date | string;
}

export interface Prompt {
  _id: string;
  name: string;
  team: Team | string;
  createdAt: string;
  annotationType: AnnotationTypeOptions;
  productionVersion: number;
  createdBy: User | string;
  deletedAt?: Date;
  library?: PromptLibrary;
  copiedFrom?: PromptCopiedFrom;
}

export interface PromptVersion {
  _id: string;
  name: string;
  createdAt: string;
  prompt: Prompt | string;
  version: number;
  userPrompt: string;
  annotationSchema: AnnotationSchemaItem[];
  codebook?: string;
  codebookVersion?: string;
  hasBeenSaved: boolean;
  inputTokens?: number;
  updatedAt: string;
}

export interface Model {
  provider: string;
  label: string;
  code: string;
}

export interface AnnotationType {
  value: string;
  name: string;
}

export interface AnnotationSchemaItem {
  fieldKey: string;
  value: unknown;
  isSystem: boolean;
  fieldType?: string;
  codes?: string[];
}

export type GetPromptsByActiveTeamInput = {
  currentPage?: number;
  searchValue?: string;
  sort?: string;
  annotationType?: AnnotationTypeOptions;
};

export type GetSavedPromptsInput = {
  annotationType: AnnotationTypeOptions;
};

export type CreatePromptInput = {
  name: string;
  annotationType: AnnotationTypeOptions;
};

export type PromptIdInput = {
  promptId: string;
};

export type UpdatePromptInput = {
  promptId: string;
  name: string;
};

export type GetPromptVersionsInput = {
  promptId: string;
  hasBeenSaved?: boolean;
};

export type PromptVersionInput = {
  promptId: string;
  version: number;
};

export type UpdatePromptVersionInput = {
  promptId: string;
  version: number;
  name: string;
  userPrompt: string;
  annotationSchema: AnnotationSchemaItem[];
};

export type PublishPromptInput = {
  promptId: string;
  description: string;
  authors?: PromptAuthor[];
  paperRefs?: PromptPaperRef[];
};

export type CheckPromptAlignmentInput = {
  promptId: string;
  userPrompt: string;
  annotationSchema: AnnotationSchemaItem[];
};

export type SuggestPromptChangesInput = CheckPromptAlignmentInput & {
  alignmentScore: number;
  reasoning: string;
};
