import { z } from "zod";
import { ANNOTATION_TYPES } from "../annotations/helpers/annotationTypes";
import registerApi from "../api/helpers/registerApi";
import { isAuthenticated } from "../authentication/authentication.middleware";
import { isTeamMember } from "../teams/teams.middleware";
import promptsController from "./codebookPrompts.controller.js";
import codebooksController from "./codebooks.controller.js";
import versionProductionController from "./codebookVersionProduction.controller.js";
import versionsController from "./codebookVersions.controller.js";

const middleware = [isAuthenticated, isTeamMember];

const teamQuery = {
  teamId: z.string().regex(/^[a-f0-9]{24}$/),
};

const listQuery = {
  ...teamQuery,
  currentPage: z.coerce.number().int().min(1).optional(),
  searchValue: z.string().trim().max(100).optional(),
  sort: z.enum(["name", "-name", "createdAt", "-createdAt"]).optional(),
};

const codebookBody = {
  name: z.string().trim().min(1),
  description: z.string().optional(),
};

const exampleSchema = z.object({
  _id: z.string().optional(),
  example: z.string(),
  exampleType: z.enum(["NEAR_MISS", "NEAR_HIT", "HIT", "MISS"]),
});

const codeSchema = z.object({
  _id: z.string().optional(),
  code: z.string(),
  description: z.string(),
  definition: z.string(),
  examples: z.array(exampleSchema),
});

const categorySchema = z.object({
  _id: z.string().optional(),
  name: z.string(),
  description: z.string(),
  codes: z.array(codeSchema),
});

const codebookVersionBody = {
  name: z.string(),
  categories: z.array(categorySchema),
};

const createPromptBody = {
  codebookVersionId: z.string().regex(/^[a-f0-9]{24}$/),
  annotationType: z.enum(
    Object.keys(ANNOTATION_TYPES) as [keyof typeof ANNOTATION_TYPES],
  ),
  categoryIds: z.array(z.string()).optional(),
  hasFlattenedCategories: z.boolean().optional(),
  flattenedAnnotationField: z.string().optional(),
};

registerApi([
  {
    basePath: "/codebooks",
    controller: codebooksController,
    list: { query: listQuery, middleware },
    create: { body: codebookBody, query: teamQuery, middleware },
    read: {
      param: "codebookId",
      query: teamQuery,
      middleware,
    },
    update: {
      param: "codebookId",
      body: codebookBody,
      query: teamQuery,
      middleware,
    },
    delete: {
      param: "codebookId",
      query: teamQuery,
      middleware,
    },
  },
  {
    basePath: "/codebooks/:codebookId/versions",
    controller: versionsController,
    list: { query: teamQuery, middleware },
    create: {
      body: { version: z.number().int().min(1) },
      query: teamQuery,
      middleware,
    },
    read: {
      param: "version",
      query: teamQuery,
      middleware,
    },
    update: {
      param: "version",
      body: codebookVersionBody,
      query: teamQuery,
      middleware,
      bodyLimit: "1mb",
    },
  },
  {
    basePath: "/codebooks/:codebookId/versions/:version/production",
    controller: versionProductionController,
    create: { query: teamQuery, middleware },
  },
  {
    basePath: "/codebooks/:codebookId/prompts",
    controller: promptsController,
    create: {
      body: createPromptBody,
      query: teamQuery,
      middleware,
    },
  },
]);
