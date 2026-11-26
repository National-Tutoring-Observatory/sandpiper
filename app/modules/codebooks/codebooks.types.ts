import type { AnnotationTypeOptions } from "../annotations/helpers/annotationTypes";
import type { Team } from "../teams/teams.types";
import type { User } from "../users/users.types";

export interface Codebook {
  _id: string;
  name: string;
  description: string;
  team: Team | string;
  productionVersion: number;
  createdAt: string;
  createdBy: User | string;
  updatedAt?: string;
  updatedBy?: User | string;
  deletedAt?: Date;
}

export interface CodebookExample {
  _id: string;
  example: string;
  exampleType: "NEAR_MISS" | "NEAR_HIT" | "HIT" | "MISS";
}

export interface CodebookCode {
  _id: string;
  code: string;
  description: string;
  definition: string;
  examples: CodebookExample[];
}

export interface CodebookCategory {
  _id: string;
  name: string;
  description: string;
  codes: CodebookCode[];
}

export interface CodebookVersion {
  _id: string;
  name: string;
  codebook: Codebook | string;
  version: number;
  hasBeenSaved: boolean;
  categories: CodebookCategory[];
  createdAt: string;
  updatedAt: string;
}

export type GetCodebooksByActiveTeamInput = {
  currentPage?: number;
  searchValue?: string;
  sort?: string;
};

export type CreateCodebookInput = {
  name: string;
  description?: string;
};

export type UpdateCodebookInput = {
  codebookId: string;
  name: string;
  description?: string;
};

export type CodebookIdInput = {
  codebookId: string;
};

export type CreateCodebookVersionInput = {
  codebookId: string;
  version: number;
};

export type CodebookVersionInput = {
  codebookId: string;
  version: number;
};

export type UpdateCodebookVersionInput = {
  codebookId: string;
  version: number;
  name: string;
  categories: CodebookCategory[];
};

export type CreatePromptFromCodebookInput = {
  codebookId: string;
  codebookVersionId: string;
  annotationType: AnnotationTypeOptions;
  categoryIds?: string[];
  hasFlattenedCategories?: boolean;
  flattenedAnnotationField?: string;
};
