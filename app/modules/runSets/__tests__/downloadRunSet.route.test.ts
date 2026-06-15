import fse from "fs-extra";
import { Types } from "mongoose";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ProjectService } from "~/modules/projects/project";
import type { Project } from "~/modules/projects/projects.types";
import type { Run } from "~/modules/runs/runs.types";
import { RunSetService } from "~/modules/runSets/runSet";
import type { RunSet } from "~/modules/runSets/runSets.types";
import getStorageAdapter from "~/modules/storage/helpers/getStorageAdapter";
import { TeamService } from "~/modules/teams/team";
import type { Team } from "~/modules/teams/teams.types";
import { UserService } from "~/modules/users/user";
import type { User } from "~/modules/users/users.types";
import "~/storageAdapters/local";
import clearDocumentDB from "../../../../test/helpers/clearDocumentDB";
import createTestRun from "../../../../test/helpers/createTestRun";
import expectAuthRequired from "../../../../test/helpers/expectAuthRequired";
import loginUser from "../../../../test/helpers/loginUser";
import { loader } from "../containers/downloadRunSet.route";

describe("downloadRunSet.route loader", () => {
  let user: User;
  let team: Team;
  let project: Project;
  let runSet: RunSet;
  let run: Run;
  let cookieHeader: string;
  let storage: ReturnType<typeof getStorageAdapter>;

  beforeEach(async () => {
    await clearDocumentDB();

    user = await UserService.create({
      username: "test_user",
      teams: [],
    });
    team = await TeamService.create({ name: "Test Team" });
    await UserService.updateById(user._id, {
      teams: [{ team: team._id, role: "ADMIN" }],
    });
    project = await ProjectService.create({
      name: "Test Project",
      createdBy: user._id,
      team: team._id,
    });
    run = await createTestRun({
      name: "Test Run",
      project: project._id,
      annotationType: "PER_UTTERANCE",
      isRunning: false,
      isComplete: true,
    });
    runSet = await RunSetService.create({
      name: "Test Run Set",
      project: project._id,
      sessions: [],
      runs: [run._id],
      annotationType: "PER_UTTERANCE",
    });

    cookieHeader = await loginUser(user._id);
    storage = getStorageAdapter();
  });

  afterEach(async () => {
    await fse.remove(`storage/${project._id}`);
  });

  async function uploadFakeExportFiles(
    col: RunSet,
    exportType: "CSV" | "JSONL",
  ) {
    const outputDirectory = `storage/${col.project}/run-sets/${col._id}/exports`;

    if (exportType === "CSV") {
      const metaCsv = Buffer.from("runId,runName\n123,Test Run");
      const utterancesCsv = Buffer.from(
        "sessionId,utteranceId,text\n1,1,Hello",
      );

      await storage.upload({
        file: { buffer: metaCsv, size: metaCsv.length, type: "text/csv" },
        uploadPath: `${outputDirectory}/${col.project}-${col._id}-meta.csv`,
      });
      await storage.upload({
        file: {
          buffer: utterancesCsv,
          size: utterancesCsv.length,
          type: "text/csv",
        },
        uploadPath: `${outputDirectory}/${col.project}-${col._id}-utterances.csv`,
      });
    } else {
      const metaJsonl = Buffer.from('{"runId":"123","runName":"Test Run"}');
      const sessionsJsonl = Buffer.from(
        '{"_id":"session1","transcript":[{"text":"Hello"}]}',
      );

      await storage.upload({
        file: {
          buffer: metaJsonl,
          size: metaJsonl.length,
          type: "application/x-ndjson",
        },
        uploadPath: `${outputDirectory}/${col.project}-${col._id}-meta.jsonl`,
      });
      await storage.upload({
        file: {
          buffer: sessionsJsonl,
          size: sessionsJsonl.length,
          type: "application/x-ndjson",
        },
        uploadPath: `${outputDirectory}/${col.project}-${col._id}-sessions.jsonl`,
      });
    }
  }

  it("redirects to / when there is no session cookie", async () => {
    await expectAuthRequired(() =>
      loader({
        request: new Request(
          `http://localhost/api/downloads/${project._id}/run-sets/${runSet._id}?exportType=CSV`,
        ),
        params: { projectId: project._id, runSetId: runSet._id },
        context: {},
      } as any),
    );
  });

  it("redirects to / when project not found", async () => {
    const fakeProjectId = new Types.ObjectId().toString();

    const res = await loader({
      request: new Request(
        `http://localhost/api/downloads/${fakeProjectId}/run-sets/${runSet._id}?exportType=CSV`,
        { headers: { cookie: cookieHeader } },
      ),
      params: { projectId: fakeProjectId, runSetId: runSet._id },
      context: {},
    } as any);

    expect(res).toBeInstanceOf(Response);
    expect((res as Response).headers.get("Location")).toBe("/");
  });

  it("throws error when runSet not found", async () => {
    const fakeRunSetId = new Types.ObjectId().toString();

    await expect(
      loader({
        request: new Request(
          `http://localhost/api/downloads/${project._id}/run-sets/${fakeRunSetId}?exportType=CSV`,
          { headers: { cookie: cookieHeader } },
        ),
        params: { projectId: project._id, runSetId: fakeRunSetId },
        context: {},
      } as any),
    ).rejects.toThrow("Run set not found.");
  });

  it("throws error when runSet belongs to different project", async () => {
    const otherProject = await ProjectService.create({
      name: "Other Project",
      createdBy: user._id,
      team: team._id,
    });

    await expect(
      loader({
        request: new Request(
          `http://localhost/api/downloads/${otherProject._id}/run-sets/${runSet._id}?exportType=CSV`,
          { headers: { cookie: cookieHeader } },
        ),
        params: { projectId: otherProject._id, runSetId: runSet._id },
        context: {},
      } as any),
    ).rejects.toThrow("Run set not found.");
  });

  it("throws error when exportType is invalid", async () => {
    await expect(
      loader({
        request: new Request(
          `http://localhost/api/downloads/${project._id}/run-sets/${runSet._id}?exportType=XML`,
          { headers: { cookie: cookieHeader } },
        ),
        params: { projectId: project._id, runSetId: runSet._id },
        context: {},
      } as any),
    ).rejects.toThrow("exportType must be CSV or JSONL");
  });

  it("returns zip response for CSV export type", async () => {
    await uploadFakeExportFiles(runSet, "CSV");

    const res = await loader({
      request: new Request(
        `http://localhost/api/downloads/${project._id}/run-sets/${runSet._id}?exportType=CSV`,
        { headers: { cookie: cookieHeader } },
      ),
      params: { projectId: project._id, runSetId: runSet._id },
      context: {},
    } as any);

    expect(res).toBeInstanceOf(Response);
    expect((res as Response).headers.get("Content-Type")).toBe(
      "application/zip",
    );
    expect((res as Response).headers.get("Content-Disposition")).toContain(
      "attachment",
    );
    expect((res as Response).headers.get("Content-Disposition")).toContain(
      runSet._id,
    );
    expect((res as Response).headers.get("Content-Disposition")).toContain(
      "-csv.zip",
    );
  });

  it("returns zip response for JSONL export type", async () => {
    await uploadFakeExportFiles(runSet, "JSONL");

    const res = await loader({
      request: new Request(
        `http://localhost/api/downloads/${project._id}/run-sets/${runSet._id}?exportType=JSONL`,
        { headers: { cookie: cookieHeader } },
      ),
      params: { projectId: project._id, runSetId: runSet._id },
      context: {},
    } as any);

    expect(res).toBeInstanceOf(Response);
    expect((res as Response).headers.get("Content-Type")).toBe(
      "application/zip",
    );
    expect((res as Response).headers.get("Content-Disposition")).toContain(
      "attachment",
    );
    expect((res as Response).headers.get("Content-Disposition")).toContain(
      runSet._id,
    );
    expect((res as Response).headers.get("Content-Disposition")).toContain(
      "-jsonl.zip",
    );
  });
});
