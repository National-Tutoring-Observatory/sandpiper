import mongoose from "mongoose";
import { redis } from "~/modules/queues/helpers/createQueue";

const checkParamsExist = (paramKeys: string[]): string[] => {
  const missingParams: string[] = [];
  for (const paramKey of paramKeys) {
    if (!process.env[paramKey]) {
      missingParams.push(paramKey);
    }
  }
  return missingParams;
};

export async function loader() {
  let missingParameters: string[] = [];

  const { LLM_PROVIDER, STORAGE_ADAPTER, DOCUMENTS_ADAPTER } = process.env;

  if (LLM_PROVIDER === "AI_GATEWAY") {
    missingParameters = missingParameters.concat(
      checkParamsExist([
        "AI_GATEWAY_KEY",
        "AI_GATEWAY_BASE_URL",
        "AI_GATEWAY_PROVIDER",
      ]),
    );
  }

  if (LLM_PROVIDER === "VERTEX_AI") {
    missingParameters = missingParameters.concat(
      checkParamsExist(["VERTEX_AI_PROJECT", "VERTEX_AI_LOCATION"]),
    );
  }

  if (STORAGE_ADAPTER === "AWS_S3") {
    missingParameters = missingParameters.concat(
      checkParamsExist(["AWS_BUCKET", "AWS_REGION", "AWS_KEY", "AWS_SECRET"]),
    );
  }

  if (STORAGE_ADAPTER === "GCS") {
    missingParameters = missingParameters.concat(
      checkParamsExist(["GCS_BUCKET"]),
    );
  }

  if (DOCUMENTS_ADAPTER === "DOCUMENT_DB") {
    missingParameters = missingParameters.concat(
      checkParamsExist([
        "DOCUMENT_DB_CONNECTION_STRING",
        "DOCUMENT_DB_USERNAME",
        "DOCUMENT_DB_PASSWORD",
        "REDIS_URL",
      ]),
    );
  }
  missingParameters = missingParameters.concat(
    checkParamsExist([
      "SESSION_SECRET",
      "GITHUB_CLIENT_ID",
      "GITHUB_CLIENT_SECRET",
      "SUPER_ADMIN_GITHUB_ID",
      "AUTH_CALLBACK_URL",
    ]),
  );

  let dbStatus;

  const isDocumentDB = process.env.DOCUMENTS_ADAPTER === "DOCUMENT_DB";

  if (isDocumentDB) {
    dbStatus = mongoose.STATES[mongoose.connection.readyState].toUpperCase();
  } else {
    dbStatus = "CONNECTED";
  }

  let cacheStatus = "DISCONNECTED";

  if (redis.status === "ready") {
    cacheStatus = "CONNECTED";
  }

  return {
    status: 200,
    dbStatus,
    cacheStatus,
    missingParameters,
  };
}
