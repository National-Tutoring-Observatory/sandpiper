import fse from "fs-extra";
import { Types } from "mongoose";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ProjectService } from "~/modules/projects/project";
import type { Project } from "~/modules/projects/projects.types";
import type { Run } from "~/modules/runs/runs.types";
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
import { loader } from "../containers/downloadRun.route";

describe("downloadRun.route loader", () => {
  beforeEach(async () => {
    await clearDocumentDB();
  });

  it("redirects to / when there is no session cookie", async () => {
    const fakeRunId = new Types.ObjectId().toString();

    await expectAuthRequired(() =>
      loader({
        request: new Request(
          "http://localhost/runs/" + fakeRunId + "/download",
        ),
        params: { runId: fakeRunId },
      } as any),
    );
  });

  it("returns error when run not found", async () => {
    const user = await UserService.create({ username: "test_user" });
    const cookieHeader = await loginUser(user._id);
    const fakeRunId = new Types.ObjectId().toString();

    const res = await loader({
      request: new Request("http://localhost/runs/" + fakeRunId + "/download", {
        headers: { cookie: cookieHeader },
      }),
      params: { runId: fakeRunId },
    } as any);

    expect(res).toBeInstanceOf(Response);
  });

  describe("zip filename", () => {
    let user: User;
    let team: Team;
    let project: Project;
    let run: Run;
    let cookieHeader: string;
    let storage: ReturnType<typeof getStorageAdapter>;

    beforeEach(async () => {
      user = await UserService.create({ username: "test_user", teams: [] });
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

      cookieHeader = await loginUser(user._id);
      storage = getStorageAdapter();
    });

    afterEach(async () => {
      await fse.remove(`storage/${project._id}`);
    });

    async function uploadFakeExportFiles(exportType: "CSV" | "JSONL") {
      const outputDirectory = `storage/${run.project}/runs/${run._id}/exports`;

      if (exportType === "CSV") {
        const metaCsv = Buffer.from("runId,runName\n123,Test Run");
        const utterancesCsv = Buffer.from("sessionId,utteranceId,text\n1,1,Hi");

        await storage.upload({
          file: { buffer: metaCsv, size: metaCsv.length, type: "text/csv" },
          uploadPath: `${outputDirectory}/${run.project}-${run._id}-meta.csv`,
        });
        await storage.upload({
          file: {
            buffer: utterancesCsv,
            size: utterancesCsv.length,
            type: "text/csv",
          },
          uploadPath: `${outputDirectory}/${run.project}-${run._id}-utterances.csv`,
        });
      } else {
        const metaJsonl = Buffer.from('{"runId":"123","runName":"Test Run"}');
        const sessionsJsonl = Buffer.from('{"_id":"session1"}');

        await storage.upload({
          file: {
            buffer: metaJsonl,
            size: metaJsonl.length,
            type: "application/x-ndjson",
          },
          uploadPath: `${outputDirectory}/${run.project}-${run._id}-meta.jsonl`,
        });
        await storage.upload({
          file: {
            buffer: sessionsJsonl,
            size: sessionsJsonl.length,
            type: "application/x-ndjson",
          },
          uploadPath: `${outputDirectory}/${run.project}-${run._id}-sessions.jsonl`,
        });
      }
    }

    it("includes the csv format in the zip filename for CSV exports", async () => {
      await uploadFakeExportFiles("CSV");

      const res = await loader({
        request: new Request(
          `http://localhost/api/downloads/${project._id}/${run._id}?exportType=CSV`,
          { headers: { cookie: cookieHeader } },
        ),
        params: { projectId: project._id, runId: run._id },
      } as any);

      expect(res).toBeInstanceOf(Response);
      expect((res as Response).headers.get("Content-Disposition")).toContain(
        "-csv.zip",
      );
    });

    it("includes the jsonl format in the zip filename for JSONL exports", async () => {
      await uploadFakeExportFiles("JSONL");

      const res = await loader({
        request: new Request(
          `http://localhost/api/downloads/${project._id}/${run._id}?exportType=JSONL`,
          { headers: { cookie: cookieHeader } },
        ),
        params: { projectId: project._id, runId: run._id },
      } as any);

      expect(res).toBeInstanceOf(Response);
      expect((res as Response).headers.get("Content-Disposition")).toContain(
        "-jsonl.zip",
      );
    });
  });
});
