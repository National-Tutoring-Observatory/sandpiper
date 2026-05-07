import dotenv from "dotenv";
import fse from "fs-extra";
import map from "lodash/map.js";
import LLM from "~/modules/llm/llm";
import getStorageAdapter from "~/modules/storage/helpers/getStorageAdapter";
import systemPrompt from "./system.prompt.json";
dotenv.config({ path: ".env" });

interface LambdaBody {
  inputFile: string;
  outputFolder: string;
  prompt: { prompt: string; annotationSchema: unknown };
  model: string;
  team: string;
  userId: string;
  sessionId: string;
  billingEventId: string;
}

export const handler = async (event: { body: LambdaBody }) => {
  const { body } = event;
  const {
    inputFile,
    outputFolder,
    prompt,
    model,
    team,
    userId,
    sessionId,
    billingEventId,
  } = body;

  const storage = getStorageAdapter();

  const downloadedPath = await storage.download({ sourcePath: inputFile });
  const data = await fse.readFile(downloadedPath);

  const inputFileSplit = inputFile.split("/");
  const outputFileName = inputFileSplit[inputFileSplit.length - 1].replace(
    ".json",
    "",
  );

  const originalJSON = JSON.parse(data.toString());

  const llm = new LLM({
    model,
    team,
    userId,
    source: "annotation:per-session",
    sourceId: sessionId,
    billingEventId,
  });

  llm.addSystemMessage(systemPrompt.prompt, {
    annotationSchema: JSON.stringify(prompt.annotationSchema),
  });

  llm.addUserMessage(`${prompt.prompt}\n\nConversation: {{conversation}}`, {
    conversation: String(data),
  });

  const response = await llm.createChat();

  originalJSON.annotations = map(
    response.annotations || [],
    (annotation, index) => ({
      ...annotation,
      _id: `${index}`,
    }),
  );

  await fse.outputJSON(
    `tmp/${outputFolder}/${outputFileName}.json`,
    originalJSON,
  );

  const buffer = await fse.readFile(
    `tmp/${outputFolder}/${outputFileName}.json`,
  );

  await storage.upload({
    file: { buffer, size: buffer.length, type: "application/json" },
    uploadPath: `${outputFolder}/${outputFileName}.json`,
  });
};
