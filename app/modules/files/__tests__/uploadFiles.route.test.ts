import { Types } from "mongoose";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { FileService } from "~/modules/files/file";
import { ProjectService } from "~/modules/projects/project";
import "~/modules/teams/team";
import { TeamService } from "~/modules/teams/team";
import { UserService } from "~/modules/users/user";
import clearDocumentDB from "../../../../test/helpers/clearDocumentDB";
import expectAuthRequired from "../../../../test/helpers/expectAuthRequired";
import loginUser from "../../../../test/helpers/loginUser";
import { action, loader } from "../containers/uploadFiles.route";

vi.mock("~/modules/datasets/services/insertMtmDataset.server", () => ({
  default: vi.fn().mockResolvedValue(undefined),
}));

const createValidId = () => new Types.ObjectId().toString();

describe("uploadFiles.route loader", () => {
  beforeEach(async () => {
    await clearDocumentDB();
  });

  it("redirects to / when there is no session cookie", async () => {
    await expectAuthRequired(() =>
      loader({
        request: new Request(
          "http://localhost/teams/123/projects/123/upload-files",
        ),
        params: { teamId: "123", projectId: "123" },
      } as any),
    );
  });

  it("redirects to / when project not found", async () => {
    const user = await UserService.create({ username: "test_user" });
    const team = await TeamService.create({ name: "Test Team" });
    const fakeProjectId = createValidId();
    const cookieHeader = await loginUser(user._id);

    const res = await loader({
      request: new Request(
        `http://localhost/teams/${team._id}/projects/${fakeProjectId}/upload-files`,
        { headers: { cookie: cookieHeader } },
      ),
      params: { teamId: team._id, projectId: fakeProjectId },
    } as any);

    expect(res).toBeInstanceOf(Response);
    expect((res as Response).headers.get("Location")).toBe("/");
  });

  it("redirects to files when project is uploading", async () => {
    const user = await UserService.create({ username: "test_user", teams: [] });
    const team = await TeamService.create({ name: "Test Team" });
    await UserService.updateById(user._id, {
      teams: [{ team: team._id, role: "ADMIN" }],
    });

    const project = await ProjectService.create({
      name: "Test Project",
      createdBy: user._id,
      team: team._id,
      hasSetupProject: true,
      isUploadingFiles: true,
    });

    const cookieHeader = await loginUser(user._id);

    const res = await loader({
      request: new Request(
        `http://localhost/teams/${team._id}/projects/${project._id}/upload-files`,
        { headers: { cookie: cookieHeader } },
      ),
      params: { teamId: team._id, projectId: project._id },
    } as any);

    expect(res).toBeInstanceOf(Response);
    expect((res as Response).headers.get("Location")).toBe(
      `/teams/${team._id}/projects/${project._id}/files`,
    );
  });

  it("redirects to / when project is uploading during initial setup", async () => {
    const user = await UserService.create({ username: "test_user", teams: [] });
    const team = await TeamService.create({ name: "Test Team" });
    await UserService.updateById(user._id, {
      teams: [{ team: team._id, role: "ADMIN" }],
    });

    const project = await ProjectService.create({
      name: "Test Project",
      createdBy: user._id,
      team: team._id,
      hasSetupProject: false,
      isUploadingFiles: true,
    });

    const cookieHeader = await loginUser(user._id);

    const res = await loader({
      request: new Request(
        `http://localhost/teams/${team._id}/projects/${project._id}/upload-files`,
        { headers: { cookie: cookieHeader } },
      ),
      params: { teamId: team._id, projectId: project._id },
    } as any);

    expect(res).toBeInstanceOf(Response);
    expect((res as Response).headers.get("Location")).toBe("/");
  });
});

describe("uploadFiles.route action", () => {
  beforeEach(async () => {
    await clearDocumentDB();
  });

  it("redirects to / when there is no session cookie", async () => {
    const formData = new FormData();

    const req = new Request(
      "http://localhost/teams/123/projects/123/upload-files",
      {
        method: "POST",
        body: formData,
      },
    );

    await expectAuthRequired(() =>
      action({
        request: req,
        params: { teamId: "123", projectId: "123" },
      } as any),
    );
  });

  it("returns 404 when project not found", async () => {
    const user = await UserService.create({ username: "test_user" });
    const team = await TeamService.create({ name: "Test Team" });
    const fakeProjectId = createValidId();
    const cookieHeader = await loginUser(user._id);

    const formData = new FormData();

    const req = new Request(
      `http://localhost/teams/${team._id}/projects/${fakeProjectId}/upload-files`,
      {
        method: "POST",
        headers: { cookie: cookieHeader },
        body: formData,
      },
    );

    const resp = (await action({
      request: req,
      params: { teamId: team._id, projectId: fakeProjectId },
    } as any)) as any;

    expect(resp.init?.status).toBe(404);
    expect(resp.data?.errors?.general).toBe("Project not found");
  });

  it("returns 400 when no files provided", async () => {
    const user = await UserService.create({ username: "test_user", teams: [] });
    const team = await TeamService.create({ name: "Test Team" });
    await UserService.updateById(user._id, {
      teams: [{ team: team._id, role: "ADMIN" }],
    });

    const project = await ProjectService.create({
      name: "Test Project",
      createdBy: user._id,
      team: team._id,
    });

    const cookieHeader = await loginUser(user._id);

    const formData = new FormData();

    const req = new Request(
      `http://localhost/teams/${team._id}/projects/${project._id}/upload-files`,
      {
        method: "POST",
        headers: { cookie: cookieHeader },
        body: formData,
      },
    );

    const resp = (await action({
      request: req,
      params: { teamId: team._id, projectId: project._id },
    } as any)) as any;

    expect(resp.init?.status).toBe(400);
    expect(resp.data?.errors?.files).toBe("Please select at least one file.");
  });

  it("returns error when file processing fails", async () => {
    const user = await UserService.create({ username: "test_user", teams: [] });
    const team = await TeamService.create({ name: "Test Team" });
    await UserService.updateById(user._id, {
      teams: [{ team: team._id, role: "ADMIN" }],
    });

    const project = await ProjectService.create({
      name: "Test Project",
      createdBy: user._id,
      team: team._id,
      hasSetupProject: false,
    });

    const cookieHeader = await loginUser(user._id);

    const formData = new FormData();
    const testFile = new File(["test content"], "test.txt", {
      type: "text/plain",
    });
    formData.append("files", testFile);

    const req = new Request(
      `http://localhost/teams/${team._id}/projects/${project._id}/upload-files`,
      {
        method: "POST",
        headers: { cookie: cookieHeader },
        body: formData,
      },
    );

    const resp = (await action({
      request: req,
      params: { teamId: team._id, projectId: project._id },
    } as any)) as any;

    expect(resp.init?.status).toBe(400);
    expect(resp.data?.errors?.files).toContain("File processing failed");
  });

  it("returns 409 when MTM dataset has already been added", async () => {
    const user = await UserService.create({ username: "test_user", teams: [] });
    const team = await TeamService.create({ name: "Test Team" });
    await UserService.updateById(user._id, {
      teams: [{ team: team._id, role: "ADMIN" }],
    });

    const project = await ProjectService.create({
      name: "Test Project",
      createdBy: user._id,
      team: team._id,
      hasMtmDataset: true,
    });

    const cookieHeader = await loginUser(user._id);

    const req = new Request(
      `http://localhost/teams/${team._id}/projects/${project._id}/upload-files`,
      {
        method: "POST",
        headers: {
          cookie: cookieHeader,
          "content-type": "application/json",
        },
        body: JSON.stringify({ intent: "INSERT_MTM_DATASET" }),
      },
    );

    const resp = (await action({
      request: req,
      params: { teamId: team._id, projectId: project._id },
    } as any)) as any;

    expect(resp.init?.status).toBe(409);
    expect(resp.data?.errors?.general).toBe(
      "MTM dataset has already been added.",
    );
  });

  it("allows INSERT_MTM_DATASET even when project already has files", async () => {
    const user = await UserService.create({ username: "test_user", teams: [] });
    const team = await TeamService.create({ name: "Test Team" });
    await UserService.updateById(user._id, {
      teams: [{ team: team._id, role: "ADMIN" }],
    });

    const project = await ProjectService.create({
      name: "Test Project",
      createdBy: user._id,
      team: team._id,
      hasSetupProject: true,
    });

    await FileService.create({ project: project._id, name: "existing.csv" });

    const cookieHeader = await loginUser(user._id);

    const req = new Request(
      `http://localhost/teams/${team._id}/projects/${project._id}/upload-files`,
      {
        method: "POST",
        headers: {
          cookie: cookieHeader,
          "content-type": "application/json",
        },
        body: JSON.stringify({ intent: "INSERT_MTM_DATASET" }),
      },
    );

    const resp = (await action({
      request: req,
      params: { teamId: team._id, projectId: project._id },
    } as any)) as any;

    expect(resp.data?.success).toBe(true);
    expect(resp.data?.intent).toBe("INSERT_MTM_DATASET");
  });

  it("returns 409 when upload is already in progress", async () => {
    const user = await UserService.create({ username: "test_user", teams: [] });
    const team = await TeamService.create({ name: "Test Team" });
    await UserService.updateById(user._id, {
      teams: [{ team: team._id, role: "ADMIN" }],
    });

    const project = await ProjectService.create({
      name: "Test Project",
      createdBy: user._id,
      team: team._id,
      isUploadingFiles: true,
    });

    const cookieHeader = await loginUser(user._id);

    const formData = new FormData();
    const testFile = new File(["test content"], "test.txt", {
      type: "text/plain",
    });
    formData.append("files", testFile);

    const req = new Request(
      `http://localhost/teams/${team._id}/projects/${project._id}/upload-files`,
      {
        method: "POST",
        headers: { cookie: cookieHeader },
        body: formData,
      },
    );

    const resp = (await action({
      request: req,
      params: { teamId: team._id, projectId: project._id },
    } as any)) as any;

    expect(resp.init?.status).toBe(409);
    expect(resp.data?.errors?.general).toBe(
      "An upload is already in progress.",
    );
  });
});
