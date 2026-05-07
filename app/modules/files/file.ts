import mongoose from "mongoose";
import { getPaginationParams, getTotalPages } from "~/helpers/pagination";
import fileSchema from "~/lib/schemas/file.schema";
import type { FindOptions, PaginateProps } from "~/modules/common/types";
import processUploadedFiles from "~/modules/uploads/services/processUploadedFiles.server";
import type { File } from "./files.types";

const FileModel = mongoose.models.File || mongoose.model("File", fileSchema);

export class FileService {
  private static toFile(doc: mongoose.Document): File {
    return doc.toJSON({ flattenObjectIds: true }) as File;
  }

  static async find(options?: FindOptions): Promise<File[]> {
    const match = options?.match || {};
    let query = FileModel.find(match);

    if (options?.select) {
      query = query.select(options.select);
    }

    if (options?.populate?.length) {
      query = query.populate(options.populate);
    }

    if (options?.sort) {
      query = query.sort(options.sort);
    }

    if (options?.pagination) {
      query = query
        .skip(options.pagination.skip)
        .limit(options.pagination.limit);
    }

    const docs = await query;
    return docs.map((doc) => this.toFile(doc));
  }

  static async count(match: Record<string, unknown> = {}): Promise<number> {
    return FileModel.countDocuments(match);
  }

  static async findById(id: string | undefined): Promise<File | null> {
    if (!id) return null;
    const doc = await FileModel.findById(id);
    return doc ? this.toFile(doc) : null;
  }

  static async create(data: Partial<File>): Promise<File> {
    const doc = await FileModel.create(data);
    return this.toFile(doc);
  }

  static async updateById(
    id: string,
    updates: Partial<File>,
  ): Promise<File | null> {
    const doc = await FileModel.findByIdAndUpdate(id, updates, {
      new: true,
    });
    return doc ? this.toFile(doc) : null;
  }

  static async deleteById(id: string): Promise<File | null> {
    const doc = await FileModel.findByIdAndDelete(id);
    return doc ? this.toFile(doc) : null;
  }

  static async paginate({
    match,
    sort,
    page,
    pageSize,
  }: PaginateProps): Promise<{
    data: File[];
    count: number;
    totalPages: number;
  }> {
    const pagination = getPaginationParams(page, pageSize);
    const results = await this.find({ match, sort, pagination });
    const count = await this.count(match);
    return {
      data: results,
      count,
      totalPages: getTotalPages(count, pageSize),
    };
  }

  static async findByProject(projectId: string): Promise<File[]> {
    return this.find({ match: { project: projectId } });
  }

  static async deleteByProject(projectId: string): Promise<number> {
    const result = await FileModel.deleteMany({ project: projectId });
    return result.deletedCount || 0;
  }

  static async processUploadedFiles(params: {
    projectId: string;
    files: globalThis.File[];
    team: string;
    userId: string;
  }) {
    return processUploadedFiles(params);
  }
}
