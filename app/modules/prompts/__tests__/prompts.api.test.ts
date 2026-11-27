import express from "express";
import { Types } from "mongoose";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import getApis from "~/modules/api/helpers/getApis";
import { UserService } from "~/modules/users/user";
import clearDocumentDB from "../../../../test/helpers/clearDocumentDB";
import loginUser from "../../../../test/helpers/loginUser";
import "../prompts.api";

let server: Server | undefined;
let baseUrl: string;
let cookie: string;
let teamId: string;

async function request(
  method: string,
  path: string,
  data?: unknown,
  query: Record<string, string> = {},
) {
  const params = new URLSearchParams({ teamId, ...query });
  const response = await fetch(`${baseUrl}${path}?${params}`, {
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

describe("prompts api", () => {
  it("supports the full prompt lifecycle", async () => {
    const created = await request("POST", "/prompts", {
      name: "Prompt",
      annotationType: "PER_UTTERANCE",
    });
    expect(created.status).toBe(200);
    const promptId = created.body.data._id;

    const list = await request("GET", "/prompts", undefined, {
      annotationType: "PER_UTTERANCE",
    });
    expect(list.body.count).toBe(1);

    const read = await request("GET", `/prompts/${promptId}`);
    expect(read.body.data.name).toBe("Prompt");

    const updated = await request("PUT", `/prompts/${promptId}`, {
      name: "Renamed",
    });
    expect(updated.body.data.name).toBe("Renamed");

    const nextVersion = await request("POST", `/prompts/${promptId}/versions`, {
      version: 1,
    });
    expect(nextVersion.body.data.version).toBe(2);

    const savedVersion = await request(
      "PUT",
      `/prompts/${promptId}/versions/2`,
      { name: "Second", userPrompt: "Annotate", annotationSchema: [] },
    );
    expect(savedVersion.body.data.hasBeenSaved).toBe(true);

    const savedVersions = await request(
      "GET",
      `/prompts/${promptId}/versions`,
      undefined,
      { hasBeenSaved: "true" },
    );
    expect(
      savedVersions.body.data.map((v: { version: number }) => v.version),
    ).toEqual([2]);

    const savedPrompts = await request("GET", "/prompts/saved", undefined, {
      annotationType: "PER_UTTERANCE",
    });
    expect(savedPrompts.body.data.map((p: { _id: string }) => p._id)).toEqual([
      promptId,
    ]);

    const version = await request("GET", `/prompts/${promptId}/versions/2`);
    expect(version.body.data.name).toBe("Second");
    expect(version.body.data.linkedCodebook).toBeNull();

    const production = await request(
      "POST",
      `/prompts/${promptId}/versions/2/production`,
    );
    expect(production.body.data.productionVersion).toBe(2);

    const deleted = await request("DELETE", `/prompts/${promptId}`);
    expect(deleted.body.data.deleted).toBe(true);
    const listAfterDelete = await request("GET", "/prompts");
    expect(listAfterDelete.body.count).toBe(0);
  });

  it("returns 403 for a team the user is not in", async () => {
    const params = new URLSearchParams({
      teamId: new Types.ObjectId().toString(),
    });
    const response = await fetch(`${baseUrl}/prompts?${params}`, {
      headers: { cookie },
    });
    expect(response.status).toBe(403);
  });

  it("returns 403 when a non super admin publishes", async () => {
    const created = await request("POST", "/prompts", {
      name: "Prompt",
      annotationType: "PER_UTTERANCE",
    });
    const response = await request(
      "POST",
      `/prompts/${created.body.data._id}/publish`,
      { description: "Desc" },
    );
    expect(response.status).toBe(403);
  });

  it("rejects an invalid annotation type", async () => {
    const response = await request("POST", "/prompts", {
      name: "Prompt",
      annotationType: "NOPE",
    });
    expect(response.status).toBe(400);
  });
});
