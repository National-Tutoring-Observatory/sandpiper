import mongoose from "mongoose";
import { getPaginationParams, getTotalPages } from "~/helpers/pagination";
import runSetSchema from "~/lib/schemas/runSet.schema";
import type { FindOptions, PaginateProps } from "~/modules/common/types";
import type { Run, RunAnnotationType } from "~/modules/runs/runs.types";
import type { RunDefinition, RunSet } from "./runSets.types";
import addRunsToRunSetService from "./services/addRunsToRunSet.server";
import createRunSetForRunService from "./services/createRunSetForRun.server";
import createRunSetWithRuns from "./services/createRunSetWithRuns.server";
import createRunsForRunSetService from "./services/createRunsForRunSet.server";
import deleteRunSetService from "./services/deleteRunSet.server";
import findEligibleRunSetsForRunService from "./services/findEligibleRunSetsForRun.server";
import findEligibleRunsService from "./services/findEligibleRuns.server";
import findMergeableRunSetsService from "./services/findMergeableRunSets.server";
import {
  getPrefillDataFromRun,
  getPrefillDataFromRunSet,
} from "./services/getRunSetPrefillData.server";
import mergeRunSetsService from "./services/mergeRunSets.server";
import stopAllRunsService from "./services/stopAllRuns.server";

const RunSetModel =
  mongoose.models.RunSet || mongoose.model("RunSet", runSetSchema);

export class RunSetService {
  private static toRunSet(doc: mongoose.Document): RunSet {
    return doc.toJSON({ flattenObjectIds: true }) as RunSet;
  }

  static async find(options?: FindOptions): Promise<RunSet[]> {
    const match = options?.match || {};
    let query = RunSetModel.find(match);

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
    return docs.map((doc) => this.toRunSet(doc));
  }

  static async count(match: Record<string, unknown> = {}): Promise<number> {
    return RunSetModel.countDocuments(match);
  }

  static async findById(id: string | undefined): Promise<RunSet | null> {
    if (!id) return null;
    const doc = await RunSetModel.findById(id);
    return doc ? this.toRunSet(doc) : null;
  }

  static async findOne(match: Record<string, unknown>): Promise<RunSet | null> {
    const doc = await RunSetModel.findOne(match);
    return doc ? this.toRunSet(doc) : null;
  }

  static async create(data: Partial<RunSet>): Promise<RunSet> {
    const doc = await RunSetModel.create(data);
    return this.toRunSet(doc);
  }

  static async updateById(
    id: string,
    updates: Partial<RunSet>,
  ): Promise<RunSet | null> {
    const doc = await RunSetModel.findByIdAndUpdate(id, updates, {
      new: true,
    });
    return doc ? this.toRunSet(doc) : null;
  }

  static async deleteById(id: string): Promise<RunSet | null> {
    const doc = await RunSetModel.findByIdAndDelete(id);
    return doc ? this.toRunSet(doc) : null;
  }

  static async findByProject(projectId: string): Promise<RunSet[]> {
    return this.find({ match: { project: projectId } });
  }

  static async deleteByProject(projectId: string): Promise<number> {
    const result = await RunSetModel.deleteMany({ project: projectId });
    return result.deletedCount || 0;
  }

  static async paginate({
    match,
    sort,
    page,
    pageSize,
    select,
  }: PaginateProps): Promise<{
    data: RunSet[];
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

  static async createWithRuns(payload: {
    project: string;
    name: string;
    sessions: string[];
    definitions: RunDefinition[];
    annotationType: RunAnnotationType;
    shouldRunVerification?: boolean;
    userId: string;
  }): Promise<{ runSet: RunSet; errors: string[] }> {
    return createRunSetWithRuns(payload);
  }

  static async deleteWithCleanup(
    runSetId: string,
  ): Promise<{ status: string }> {
    return deleteRunSetService({ runSetId });
  }

  static async findEligibleRunSetsForRun(
    runId: string,
    options?: { page?: number; pageSize?: number; search?: string },
  ): Promise<{ data: RunSet[]; count: number; totalPages: number }> {
    return findEligibleRunSetsForRunService(runId, options);
  }

  static async createRunSetForRun(
    runId: string,
    name: string,
  ): Promise<RunSet> {
    return createRunSetForRunService(runId, name);
  }

  static async findEligibleRunsForRunSet(
    runSetId: string,
    options?: { page?: number; pageSize?: number; search?: string },
  ): Promise<{ data: Run[]; count: number; totalPages: number }> {
    return findEligibleRunsService(runSetId, options);
  }

  static async addRunsToRunSet(
    runSetId: string,
    runIds: string[],
  ): Promise<{
    runSet: RunSet;
    added: string[];
    skipped: string[];
    errors: string[];
  }> {
    return addRunsToRunSetService(runSetId, runIds);
  }

  static async findMergeableRunSets(
    targetRunSetId: string,
    options?: { page?: number; pageSize?: number; search?: string },
  ): Promise<{ data: RunSet[]; count: number; totalPages: number }> {
    return findMergeableRunSetsService(targetRunSetId, options);
  }

  static async mergeRunSets(
    targetRunSetId: string,
    sourceRunSetIds: string | string[],
  ): Promise<{ runSet: RunSet; added: string[]; skipped: string[] }> {
    return mergeRunSetsService(targetRunSetId, sourceRunSetIds);
  }

  static async removeRunFromRunSet(
    runSetId: string,
    runId: string,
  ): Promise<RunSet | null> {
    const doc = await RunSetModel.findByIdAndUpdate(
      runSetId,
      { $pull: { runs: runId } },
      { new: true },
    );
    return doc ? this.toRunSet(doc) : null;
  }

  static async createRunsForRunSet(payload: {
    runSetId: string;
    definitions: RunDefinition[];
    shouldRunVerification?: boolean;
    userId: string;
  }) {
    return createRunsForRunSetService(payload);
  }

  static async getPrefillDataFromRun(runId: string, projectId: string) {
    return getPrefillDataFromRun(runId, projectId);
  }

  static async getPrefillDataFromRunSet(runSetId: string, projectId: string) {
    return getPrefillDataFromRunSet(runSetId, projectId);
  }

  static async stopAllRuns(runSetId: string): Promise<number> {
    return stopAllRunsService(runSetId);
  }
}
