import { Storage } from "@google-cloud/storage";
import fse from "fs-extra";
import path from "path";
import { PROJECT_ROOT } from "~/helpers/projectRoot";
import registerStorageAdapter from "~/modules/storage/helpers/registerStorageAdapter";
import type {
  DownloadParams,
  RemoveDirParams,
  RemoveParams,
  RequestParams,
  UploadParams,
} from "~/modules/storage/storage.types";

function getGcsBucket() {
  const { GCS_BUCKET } = process.env;
  if (!GCS_BUCKET) {
    throw new Error("Missing GCS configuration: GCS_BUCKET");
  }
  // Credentials come from Application Default Credentials (the Cloud Run
  // runtime service account) — no key file needed.
  const storage = new Storage();
  return storage.bucket(GCS_BUCKET);
}

registerStorageAdapter({
  name: "GCS",
  download: async ({
    sourcePath,
    destinationPath,
  }: DownloadParams): Promise<string> => {
    const bucket = getGcsBucket();

    try {
      const tmpPath = path.join(
        PROJECT_ROOT,
        "tmp",
        destinationPath || sourcePath,
      );
      const downloadDirectory = path.dirname(tmpPath);
      await fse.ensureDir(downloadDirectory);
      await bucket.file(sourcePath).download({ destination: tmpPath });
      return tmpPath;
    } catch (error) {
      throw new Error(`GCS download error for ${sourcePath}`, {
        cause: error,
      });
    }
  },
  upload: async ({ file, uploadPath }: UploadParams): Promise<void> => {
    const { buffer, type } = file;
    const bucket = getGcsBucket();

    try {
      await bucket.file(uploadPath).save(buffer, {
        contentType: type,
        private: true,
      });
    } catch (error) {
      throw new Error(`GCS upload error for ${uploadPath}`, {
        cause: error,
      });
    }
  },
  remove: async ({ sourcePath }: RemoveParams): Promise<void> => {
    const bucket = getGcsBucket();
    await bucket.file(sourcePath).delete();
    console.log(`GCS: Deleted file ${sourcePath}`);
  },
  removeDir: async ({ sourcePath }: RemoveDirParams): Promise<void> => {
    const bucket = getGcsBucket();
    const prefix = sourcePath.endsWith("/") ? sourcePath : `${sourcePath}/`;

    try {
      await bucket.deleteFiles({ prefix });
    } catch (error) {
      console.error(`GCS: Error deleting directory ${sourcePath}:`, error);
      throw error;
    }
  },
  request: async ({ url }: RequestParams): Promise<unknown> => {
    const bucket = getGcsBucket();

    const [signedUrl] = await bucket.file(url).getSignedUrl({
      action: "read",
      expires: Date.now() + 60 * 60 * 1000,
    });
    return signedUrl;
  },
});
