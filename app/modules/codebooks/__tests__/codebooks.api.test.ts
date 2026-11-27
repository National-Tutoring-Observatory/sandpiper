import express from "express";
import { Types } from "mongoose";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import getApis from "~/modules/api/helpers/getApis";
import { UserService } from "~/modules/users/user";
import clearDocumentDB from "../../../../test/helpers/clearDocumentDB";
import loginUser from "../../../../test/helpers/loginUser";
import "../codebooks.api";

let server: Server | undefined;
let baseUrl: string;
let cookie: string;
let teamId: string;

async function request(
  method: string,
  path: string,
  data?: unknown,
  queryTeamId = teamId,
) {
  const response = await fetch(`${baseUrl}${path}?teamId=${queryTeamId}`, {
    method,
    headers: {
      cookie,
      ...(data === undefined ? {} : { "Content-Type": "application/json" }),
    },
    body: data === undefined ? undefined : JSON.stringify(data),
  });
  return { status: response.status, body: await response.json() };
}

beforeEach(async () => {
  await clearDocumentDB();
  teamId = new Types.ObjectId().toString();
  const user = await UserService.create({
    username: "admin",
    teams: [{ team: teamId, role: "ADMIN" }],
  });
  cookie = await loginUser(user._id);

  const app = express();
  getApis(app);
  server = await new Promise<Server>((resolve) => {
    const s = app.listen(0, () => resolve(s));
  });
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api`;
});

afterEach(async () => {
  await new Promise((resolve) => server?.close(resolve));
  server = undefined;
});

describe("codebooks api", () => {
  it("supports the full codebook lifecycle", async () => {
    const created = await request("POST", "/codebooks", { name: "Codebook" });
    expect(created.status).toBe(200);
    const codebookId = created.body.data._id;

    const list = await request("GET", "/codebooks");
    expect(list.body.count).toBe(1);

    const read = await request("GET", `/codebooks/${codebookId}`);
    expect(read.body.data.name).toBe("Codebook");

    const updated = await request("PUT", `/codebooks/${codebookId}`, {
      name: "Renamed",
    });
    expect(updated.body.data.name).toBe("Renamed");

    const nextVersion = await request(
      "POST",
      `/codebooks/${codebookId}/versions`,
      { version: 1 },
    );
    expect(nextVersion.body.data.version).toBe(2);

    const versions = await request("GET", `/codebooks/${codebookId}/versions`);
    expect(
      versions.body.data.map((v: { version: number }) => v.version),
    ).toEqual([2, 1]);

    const savedVersion = await request(
      "PUT",
      `/codebooks/${codebookId}/versions/2`,
      {
        name: "Second",
        categories: [{ name: "Category", description: "", codes: [] }],
      },
    );
    expect(savedVersion.body.data.hasBeenSaved).toBe(true);

    const version = await request("GET", `/codebooks/${codebookId}/versions/2`);
    expect(version.body.data.name).toBe("Second");

    const production = await request(
      "POST",
      `/codebooks/${codebookId}/versions/2/production`,
    );
    expect(production.body.data.productionVersion).toBe(2);

    const deleted = await request("DELETE", `/codebooks/${codebookId}`);
    expect(deleted.body.data.deleted).toBe(true);
    const listAfterDelete = await request("GET", "/codebooks");
    expect(listAfterDelete.body.count).toBe(0);
  });

  it("returns 403 for a team the user is not in", async () => {
    const response = await request(
      "GET",
      "/codebooks",
      undefined,
      new Types.ObjectId().toString(),
    );
    expect(response.status).toBe(403);
  });

  it("returns 404 for a version that is not a number", async () => {
    const created = await request("POST", "/codebooks", { name: "Codebook" });
    const response = await request(
      "GET",
      `/codebooks/${created.body.data._id}/versions/latest`,
    );
    expect(response.status).toBe(404);
  });
});
