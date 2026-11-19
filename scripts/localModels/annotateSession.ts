/**
 * Annotate one Sandpiper session file with a model served by any
 * OpenAI-compatible endpoint: Ollama, llama.cpp, LM Studio, vLLM or a LiteLLM
 * proxy. It needs no database, queue or account, and it reuses the worker's own
 * system prompts, response schema and LLM client, so its output is comparable
 * with a run made in the app.
 *
 *   AI_GATEWAY_BASE_URL=http://127.0.0.1:11434/v1 AI_GATEWAY_KEY=local \
 *     yarn tsx scripts/localModels/annotateSession.ts --model mistral-nemo
 *
 * Pass --promptFile to label with your own codebook instead of a default
 * prompt. The script stops if the endpoint is not on this machine, unless you
 * pass --allowRemote.
 *
 * Pass --tutorTurnsPerPiece N with a per-utterance prompt to annotate a few
 * tutor turns at a time, each piece as a conversation of its own, instead of
 * sending the whole session in one request.
 *
 * See scripts/localModels/README.md.
 */
import fse from "fs-extra";
import path from "path";
import { fileURLToPath } from "url";
import buildAnnotationSchema from "../../app/modules/llm/helpers/buildAnnotationSchema";
import LLM from "../../app/modules/llm/llm";
import DEFAULT_PROMPTS from "../../app/modules/prompts/helpers/defaultPrompts";
import type { AnnotationSchemaItem } from "../../app/modules/prompts/prompts.types";
import getConversationFromJSON from "../../app/modules/sessions/helpers/getConversationFromJSON";
import type {
  Annotation,
  SessionFile,
} from "../../app/modules/sessions/sessions.types";
import getPromptText from "../../workers/helpers/getPromptText";
import cutSessionIntoPieces from "./cutSessionIntoPieces";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));

const LOCAL_HOSTS = new Set(["127.0.0.1", "localhost", "[::1]"]);

interface Prompt {
  name: string;
  annotationType: "PER_UTTERANCE" | "PER_SESSION";
  userPrompt: string;
  annotationSchema: AnnotationSchemaItem[];
}

function getArgument(name: string, fallback?: string): string | undefined {
  const index = process.argv.indexOf(`--${name}`);
  return index > -1 ? process.argv[index + 1] : fallback;
}

function hasFlag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

function isLocalEndpoint(address: string): boolean {
  try {
    return LOCAL_HOSTS.has(new URL(address).hostname);
  } catch {
    return false;
  }
}

function findDefaultPrompt(name: string): Prompt {
  const prompt = DEFAULT_PROMPTS.find((item) => item.name === name);
  if (!prompt) {
    const names = DEFAULT_PROMPTS.map((item) => item.name).join(", ");
    throw new Error(`Prompt not found: ${name}. Available: ${names}`);
  }
  return prompt;
}

async function readPromptFile(promptFilePath: string): Promise<Prompt> {
  const prompt = await fse.readJSON(promptFilePath);
  const hasValidType =
    prompt.annotationType === "PER_UTTERANCE" ||
    prompt.annotationType === "PER_SESSION";
  if (
    !hasValidType ||
    typeof prompt.userPrompt !== "string" ||
    !Array.isArray(prompt.annotationSchema)
  ) {
    throw new Error(
      `${promptFilePath} needs annotationType (PER_UTTERANCE or PER_SESSION), userPrompt and annotationSchema`,
    );
  }
  return {
    name: prompt.name || path.basename(promptFilePath, ".json"),
    annotationType: prompt.annotationType,
    userPrompt: prompt.userPrompt,
    annotationSchema: prompt.annotationSchema,
  };
}

async function main() {
  const model = getArgument("model");
  const sessionPath = getArgument(
    "session",
    path.join(scriptDirectory, "fixtures/syntheticSession.json"),
  )!;
  const promptName = getArgument("prompt");
  const promptFilePath = getArgument("promptFile");
  const outputPath = getArgument("out");
  const timeoutMinutes = Number(getArgument("timeoutMinutes", "10"));
  const shouldRunVerification = hasFlag("verify");
  const shouldAllowRemote = hasFlag("allowRemote");
  const tutorTurnsArgument = getArgument("tutorTurnsPerPiece");
  const tutorTurnsPerPiece =
    tutorTurnsArgument === undefined ? undefined : Number(tutorTurnsArgument);

  if (!model) {
    throw new Error("--model is required, for example --model mistral-nemo");
  }
  if (promptName && promptFilePath) {
    throw new Error("Pass --prompt or --promptFile, not both");
  }
  if (!Number.isFinite(timeoutMinutes) || timeoutMinutes <= 0) {
    throw new Error("--timeoutMinutes must be a positive number of minutes");
  }
  if (
    tutorTurnsPerPiece !== undefined &&
    (!Number.isInteger(tutorTurnsPerPiece) || tutorTurnsPerPiece < 1)
  ) {
    throw new Error("--tutorTurnsPerPiece must be a positive whole number");
  }
  const endpoint = process.env.AI_GATEWAY_BASE_URL;
  if (!endpoint) {
    throw new Error(
      "AI_GATEWAY_BASE_URL is required, for example http://127.0.0.1:11434/v1",
    );
  }
  if (!shouldAllowRemote && !isLocalEndpoint(endpoint)) {
    throw new Error(
      `AI_GATEWAY_BASE_URL (${endpoint}) is not on this machine, so transcripts would leave it. Reach another machine through an SSH tunnel to a local port, or pass --allowRemote.`,
    );
  }
  process.env.LLM_PROVIDER = process.env.LLM_PROVIDER || "AI_GATEWAY";
  process.env.AI_GATEWAY_KEY = process.env.AI_GATEWAY_KEY || "local";

  const prompt = promptFilePath
    ? await readPromptFile(promptFilePath)
    : findDefaultPrompt(promptName || "Tutor Moves (sample prompt)");
  const timeout = timeoutMinutes * 60_000;

  const isPerUtterance = prompt.annotationType === "PER_UTTERANCE";
  if (tutorTurnsPerPiece !== undefined && !isPerUtterance) {
    throw new Error(
      "--tutorTurnsPerPiece works only with a per-utterance prompt. A per-session prompt scores the whole session at once.",
    );
  }
  const annotateTask = isPerUtterance
    ? "annotatePerUtterance"
    : "annotatePerSession";
  const verifyTask = isPerUtterance ? "verifyPerUtterance" : "verifyPerSession";
  const source = isPerUtterance ? "per-utterance" : "per-session";

  const sessionFile: SessionFile = await fse.readJSON(sessionPath);
  const conversation = getConversationFromJSON(sessionFile);
  const leadRole = sessionFile.leadRole || "TEACHER";

  // Same shape createRunAnnotations sends to the worker.
  const annotationFields: Record<string, unknown> = {};
  for (const item of prompt.annotationSchema) {
    annotationFields[item.fieldKey] = item.value;
  }
  const annotationSchema = { annotations: [annotationFields] };
  const responseSchema = buildAnnotationSchema(
    annotationSchema,
    prompt.annotationSchema,
  );

  const startedAt = Date.now();

  // One request, plus the verification pass when asked, for one conversation.
  const annotateConversation = async (conversation: string) => {
    const llm = new LLM({
      model,
      userId: "local",
      schema: responseSchema,
      source: `annotation:${source}`,
      billingEventId: "local:annotation",
      timeout,
    });
    llm.addSystemMessage(getPromptText(annotateTask), {
      annotationSchema: JSON.stringify(annotationSchema),
      leadRole,
    });
    llm.addUserMessage(
      `${prompt.userPrompt}\n\nConversation: {{conversation}}`,
      { conversation },
    );

    const response = await llm.createChat();
    let annotations: Annotation[] = response.annotations || [];
    const usage = llm.getUsage();
    const firstPassAnnotations = annotations;

    if (shouldRunVerification) {
      const verifyLlm = new LLM({
        model,
        userId: "local",
        schema: responseSchema,
        source: `verification:${source}`,
        billingEventId: "local:verification",
        timeout,
      });
      verifyLlm.addSystemMessage(getPromptText(verifyTask), {
        annotationSchema: JSON.stringify(annotationSchema),
        leadRole,
      });
      verifyLlm.addUserMessage(
        `Original prompt: {{originalPrompt}}\n\nConversation: {{conversation}}\n\nAnnotations to review: {{annotations}}`,
        {
          originalPrompt: prompt.userPrompt,
          conversation,
          annotations: JSON.stringify(annotations),
        },
      );

      const verifyResponse = await verifyLlm.createChat();
      annotations = verifyResponse.annotations || annotations;

      const verifyUsage = verifyLlm.getUsage();
      usage.inputTokens += verifyUsage.inputTokens;
      usage.outputTokens += verifyUsage.outputTokens;
    }

    return { annotations, firstPassAnnotations, usage };
  };

  let annotations: Annotation[] = [];
  const usage = { inputTokens: 0, outputTokens: 0 };
  let pieceCount: number | undefined;
  let unmatchedIds = 0;

  if (tutorTurnsPerPiece === undefined) {
    const result = await annotateConversation(conversation);
    annotations = result.annotations;
    usage.inputTokens = result.usage.inputTokens;
    usage.outputTokens = result.usage.outputTokens;
    if (shouldRunVerification) {
      sessionFile.preVerificationAnnotations = result.firstPassAnnotations;
    }
  } else {
    const pieces = cutSessionIntoPieces(
      sessionFile.transcript,
      leadRole,
      tutorTurnsPerPiece,
    );
    pieceCount = pieces.length;
    const preVerificationAnnotations: Annotation[] = [];
    let firstUtterance = 1;
    for (const [index, piece] of pieces.entries()) {
      const pieceStartedAt = Date.now();
      const pieceIds = new Set(piece.map((item) => item._id));
      const result = await annotateConversation(
        getConversationFromJSON({ ...sessionFile, transcript: piece }),
      );
      const keepInPiece = (list: Annotation[]) =>
        list.filter((annotation) => pieceIds.has(annotation._id));
      const kept = keepInPiece(result.annotations);
      unmatchedIds += result.annotations.length - kept.length;
      annotations.push(...kept);
      preVerificationAnnotations.push(
        ...keepInPiece(result.firstPassAnnotations),
      );
      usage.inputTokens += result.usage.inputTokens;
      usage.outputTokens += result.usage.outputTokens;

      const lastUtterance = firstUtterance + piece.length - 1;
      const pieceSeconds = (Date.now() - pieceStartedAt) / 1000;
      console.error(
        `piece ${index + 1} of ${pieces.length}: utterances ${firstUtterance}-${lastUtterance}, ${kept.length} annotated, ${pieceSeconds.toFixed(1)} s`,
      );
      firstUtterance = lastUtterance + 1;
    }
    if (shouldRunVerification) {
      sessionFile.preVerificationAnnotations = preVerificationAnnotations;
    }
  }

  const utteranceIds = new Set(sessionFile.transcript.map((item) => item._id));

  if (isPerUtterance) {
    for (const annotation of annotations) {
      const utterance = sessionFile.transcript.find(
        (item) => item._id === annotation._id,
      );
      if (!utterance) {
        unmatchedIds++;
        continue;
      }
      utterance.annotations = [...(utterance.annotations || []), annotation];
    }
  } else {
    sessionFile.annotations = annotations.map((annotation, index) => ({
      ...annotation,
      _id: `${index}`,
    }));
  }

  const seconds = (Date.now() - startedAt) / 1000;

  if (outputPath) {
    await fse.outputJSON(outputPath, sessionFile, { spaces: 2 });
  }

  const codedFields = prompt.annotationSchema
    .filter((item) => !item.isSystem)
    .map((item) => item.fieldKey);

  console.log(
    JSON.stringify(
      {
        endpoint,
        model,
        prompt: prompt.name,
        verified: shouldRunVerification,
        ...(tutorTurnsPerPiece === undefined
          ? {}
          : { tutorTurnsPerPiece, pieces: pieceCount }),
        utterances: utteranceIds.size,
        annotations: annotations.length,
        unmatchedIds,
        inputTokens: usage.inputTokens,
        outputTokens: usage.outputTokens,
        seconds: Number(seconds.toFixed(1)),
        output: outputPath || "(not written, pass --out)",
      },
      null,
      2,
    ),
  );
  for (const annotation of annotations) {
    const codes = codedFields.map((field) => annotation[field]).join(" | ");
    console.log(`${annotation._id ?? "-"}\t${codes}`);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
