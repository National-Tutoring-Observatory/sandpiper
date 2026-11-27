import { z } from "zod";
import { ANNOTATION_TYPES } from "../annotations/helpers/annotationTypes";
import registerApi from "../api/helpers/registerApi";
import { isAuthenticated } from "../authentication/authentication.middleware";
import { isTeamMember } from "../teams/teams.middleware";
import promptAlignmentController from "./promptAlignment.controller.js";
import promptPublishController from "./promptPublish.controller.js";
import promptsController from "./prompts.controller.js";
import promptSuggestionsController from "./promptSuggestions.controller.js";
import promptUnpublishController from "./promptUnpublish.controller.js";
import versionProductionController from "./promptVersionProduction.controller.js";
import versionsController from "./promptVersions.controller.js";
import savedPromptsController from "./savedPrompts.controller.js";

const middleware = [isAuthenticated, isTeamMember];

const teamQuery = {
  teamId: z.string().regex(/^[a-f0-9]{24}$/),
};

const annotationType = z.enum(
  Object.keys(ANNOTATION_TYPES) as [keyof typeof ANNOTATION_TYPES],
);

const listQuery = {
  ...teamQuery,
  currentPage: z.coerce.number().int().min(1).optional(),
  searchValue: z.string().trim().max(100).optional(),
  sort: z.enum(["name", "-name", "createdAt", "-createdAt"]).optional(),
  annotationType: annotationType.optional(),
};

const annotationSchema = z.array(
  z.object({
    fieldKey: z.string(),
    value: z.unknown(),
    isSystem: z.boolean(),
    fieldType: z.string().optional(),
    codes: z.array(z.string()).optional(),
  }),
);

const alignmentBody = {
  userPrompt: z.string(),
  annotationSchema,
};

registerApi([
  // Registered before /prompts so "saved" is not read as a :promptId.
  {
    basePath: "/prompts/saved",
    controller: savedPromptsController,
    list: { query: { ...teamQuery, annotationType }, middleware },
  },
  {
    basePath: "/prompts",
    controller: promptsController,
    list: { query: listQuery, middleware },
    create: {
      body: { name: z.string().trim().min(1), annotationType },
      query: teamQuery,
      middleware,
    },
    read: { param: "promptId", query: teamQuery, middleware },
    update: {
      param: "promptId",
      body: { name: z.string().trim().min(1) },
      query: teamQuery,
      middleware,
    },
    delete: { param: "promptId", query: teamQuery, middleware },
  },
  {
    basePath: "/prompts/:promptId/versions",
    controller: versionsController,
    list: {
      query: { ...teamQuery, hasBeenSaved: z.enum(["true"]).optional() },
      middleware,
    },
    create: {
      body: { version: z.number().int().min(1) },
      query: teamQuery,
      middleware,
    },
    read: { param: "version", query: teamQuery, middleware },
    update: {
      param: "version",
      body: { name: z.string(), userPrompt: z.string(), annotationSchema },
      query: teamQuery,
      middleware,
      bodyLimit: "1mb",
    },
  },
  {
    basePath: "/prompts/:promptId/versions/:version/production",
    controller: versionProductionController,
    create: { query: teamQuery, middleware },
  },
  {
    basePath: "/prompts/:promptId/publish",
    controller: promptPublishController,
    create: {
      body: {
        description: z.string().trim().min(1),
        authors: z
          .array(
            z.object({
              name: z.string(),
              affiliation: z.string().optional(),
            }),
          )
          .optional(),
        paperRefs: z
          .array(z.object({ title: z.string(), url: z.string() }))
          .optional(),
      },
      query: teamQuery,
      middleware,
    },
  },
  {
    basePath: "/prompts/:promptId/unpublish",
    controller: promptUnpublishController,
    create: { query: teamQuery, middleware },
  },
  {
    basePath: "/prompts/:promptId/alignment-check",
    controller: promptAlignmentController,
    create: {
      body: alignmentBody,
      query: teamQuery,
      middleware,
      bodyLimit: "1mb",
    },
  },
  {
    basePath: "/prompts/:promptId/alignment-suggestions",
    controller: promptSuggestionsController,
    create: {
      body: {
        ...alignmentBody,
        alignmentScore: z.number(),
        reasoning: z.string(),
      },
      query: teamQuery,
      middleware,
      bodyLimit: "1mb",
    },
  },
]);
