import { Types } from "mongoose";
import path from "path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ProjectService } from "~/modules/projects/project";
import { RunSetService } from "~/modules/runSets/runSet";
import { TeamService } from "~/modules/teams/team";
import { UserService } from "~/modules/users/user";
import clearDocumentDB from "../../../../test/helpers/clearDocumentDB";
import loginUser from "../../../../test/helpers/loginUser";
import { action } from "../containers/humanAnnotations.route";

const mockUpload = vi.fn().mockResolvedValue(undefined);

const mocks = vi.hoisted(() => ({
  analyzeHumanCsv: vi.fn(),
  createHumanRun: vi.fn(),
}));

vi.mock("~/modules/storage/helpers/getStorageAdapter", () => ({
  default: () => ({
    upload: mockUpload,
    download: vi.fn(),
    remove: vi.fn(),
    request: vi.fn(),
  }),
}));

vi.mock("~/modules/humanAnnotations/services/analyzeHumanCsv.server", () => ({
  default: mocks.analyzeHumanCsv,
}));

vi.mock("~/modules/humanAnnotations/services/createHumanRun.server", () => ({
  default: mocks.createHumanRun,
}));

vi.mock(
  "~/modules/humanAnnotations/services/uploadHumanAnnotations.server",
  () => ({
    default: vi.fn().mockResolvedValue(undefined),
  }),
);

describe("humanAnnotations.route action - UPLOAD_HUMAN_CSV", () => {
  beforeEach(async () => {
    await clearDocumentDB();
    mockUpload.mockClear();
    mocks.analyzeHumanCsv.mockReset().mockResolvedValue({
      missingSessionNames: [],
      matchedSessions: [],
      fieldTypes: {},
    });
    mocks.createHumanRun
      .mockReset()
      .mockResolvedValue({ _id: new Types.ObjectId().toString() });
  });

  async function setupAndUpload(
    filename: string,
    csvContent = "col1,col2\nval1,val2",
  ) {
    const team = await TeamService.create({ name: "Team" });
    const user = await UserService.create({
      username: "admin",
      role: "USER",
      teams: [{ team: team._id, role: "ADMIN" }],
    });
    const project = await ProjectService.create({
      name: "Project",
      createdBy: user._id,
      team: team._id,
    });
    const runSet = await RunSetService.create({
      name: "RunSet",
      project: project._id,
      annotationType: "PER_UTTERANCE",
    });

    const cookieHeader = await loginUser(user._id);

    const formData = new FormData();
    formData.append(
      "body",
      JSON.stringify({
        intent: "UPLOAD_HUMAN_CSV",
        payload: {
          headers: ["session_name", "annotation"],
          sessionIds: [],
          annotators: ["Annotator A"],
        },
      }),
    );
    formData.append(
      "file",
      new File([csvContent], filename, { type: "text/csv" }),
    );

    const response = await action({
      request: new Request(
        "http://localhost/api/humanAnnotations/" + runSet._id,
        {
          method: "POST",
          headers: { cookie: cookieHeader },
          body: formData,
        },
      ),
      params: { runSetId: runSet._id },
    } as any);

    return { runSet, response };
  }

  it("sanitizes path traversal sequences in the uploaded filename", async () => {
    await setupAndUpload("../../.env");

    expect(mockUpload).toHaveBeenCalledOnce();
    const { uploadPath } = mockUpload.mock.calls[0][0];

    expect(path.basename(uploadPath)).toBe(".env");
    expect(uploadPath).not.toContain("..");
    expect(uploadPath).not.toContain("../../");
  });

  it("uses path.basename of the original filename for safe filenames", async () => {
    await setupAndUpload("annotations.csv");

    expect(mockUpload).toHaveBeenCalledOnce();
    const { uploadPath } = mockUpload.mock.calls[0][0];

    expect(path.basename(uploadPath)).toBe("annotations.csv");
    expect(uploadPath).not.toContain("..");
  });

  it("stores the CSV and creates the run for a valid upload", async () => {
    vi.spyOn(RunSetService, "addRunsToRunSet").mockResolvedValue({
      errors: [],
    } as never);

    const { response } = await setupAndUpload(
      "annotations.csv",
      "session_id,annotator[joe][0]IS_QUESTION\nsession-a.json,FALSE",
    );

    expect((response.data as any).success).toBe(true);
    expect(mockUpload).toHaveBeenCalledOnce();
    expect(mocks.createHumanRun).toHaveBeenCalledOnce();
  });
});
