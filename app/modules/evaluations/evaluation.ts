import mongoose from "mongoose";
import { getPaginationParams, getTotalPages } from "~/helpers/pagination";
import evaluationSchema from "~/lib/schemas/evaluation.schema";
import type { FindOptions, PaginateProps } from "~/modules/common/types";
import type { Evaluation } from "./evaluations.types";
import createAdjudicationRun from "./services/createAdjudicationRun.server";
import createEvaluationReport from "./services/createEvaluationReport.server";
import rerunEvaluationService from "./services/rerunEvaluation.server";

const EvaluationModel =
  mongoose.models.Evaluation || mongoose.model("Evaluation", evaluationSchema);

export class EvaluationService {
  private static toEvaluation(doc: mongoose.Document): Evaluation {
    return doc.toJSON({ flattenObjectIds: true }) as Evaluation;
  }

  static async find(options?: FindOptions): Promise<Evaluation[]> {
    const match = options?.match || {};
    let query = EvaluationModel.find(match);

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
    return docs.map((doc) => this.toEvaluation(doc));
  }

  static async count(match: Record<string, unknown> = {}): Promise<number> {
    return EvaluationModel.countDocuments(match);
  }

  static async findById(id: string | undefined): Promise<Evaluation | null> {
    if (!id) return null;
    const doc = await EvaluationModel.findById(id);
    return doc ? this.toEvaluation(doc) : null;
  }

  static async findOne(
    match: Record<string, unknown>,
  ): Promise<Evaluation | null> {
    const doc = await EvaluationModel.findOne(match);
    return doc ? this.toEvaluation(doc) : null;
  }

  static async paginate({
    match,
    sort,
    page,
    pageSize,
    select,
  }: PaginateProps): Promise<{
    data: Evaluation[];
    count: number;
    totalPages: number;
  }> {
    const pagination = getPaginationParams(page, pageSize);

    const results = await this.find({
      match,
      sort,
      pagination,
      select,
    });

    const count = await this.count(match);

    return {
      data: results,
      count,
      totalPages: getTotalPages(count, pageSize),
    };
  }

  static async create(data: Partial<Evaluation>): Promise<Evaluation> {
    const doc = await EvaluationModel.create(data);
    return this.toEvaluation(doc);
  }

  static async start(evaluation: Evaluation): Promise<void> {
    createEvaluationReport(evaluation);
  }

  static async startAdjudication(params: {
    evaluationId: string;
    selectedRunIds: string[];
    modelCode: string;
    projectId: string;
    runSetId: string;
    promptId: string;
    promptVersion: number;
    userId: string;
  }): Promise<void> {
    await createAdjudicationRun(params);
  }

  static rerunEvaluation(evaluationId: string): void {
    rerunEvaluationService(evaluationId);
  }

  static async updateById(
    id: string,
    updates: Partial<Evaluation>,
  ): Promise<Evaluation | null> {
    const doc = await EvaluationModel.findByIdAndUpdate(id, updates, {
      new: true,
    });
    return doc ? this.toEvaluation(doc) : null;
  }

  static async deleteById(id: string): Promise<Evaluation | null> {
    const doc = await EvaluationModel.findByIdAndDelete(id);
    return doc ? this.toEvaluation(doc) : null;
  }

  static async deleteByProject(projectId: string): Promise<number> {
    const result = await EvaluationModel.deleteMany({ project: projectId });
    return result.deletedCount || 0;
  }
}
