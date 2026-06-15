import compression from "compression";
import dotenv from "dotenv";
import express from "express";
import http from "http";
import morgan from "morgan";
import { initializeDatabase } from "./app/lib/database";
import securityHeaders from "./app/modules/app/helpers/securityHeaders";
import securityHeadersEnabled from "./app/modules/app/helpers/securityHeadersEnabled";
import "./app/modules/storage/storage";
import { UserService } from "./app/modules/users/user";
import { setupSockets } from "./sockets";
dotenv.config({ path: ".env" });

// Short-circuit the type-checking of the built output.
const BUILD_PATH = "./build/server/index.js";
const DEVELOPMENT = process.env.NODE_ENV === "development";
const PORT = Number.parseInt(process.env.PORT || "5173");

const app = express();

const server = http.createServer(app);

setupSockets({ server, app });

app.use(compression());
app.disable("x-powered-by");

app.use((_req, res, next) => {
  if (securityHeadersEnabled()) {
    for (const [header, value] of Object.entries(securityHeaders())) {
      res.setHeader(header, value);
    }
  }
  next();
});

if (DEVELOPMENT) {
  console.log("Starting development server");
  const viteDevServer = await import("vite").then((vite) =>
    vite.createServer({
      server: { middlewareMode: true },
    }),
  );
  app.use(viteDevServer.middlewares);
  app.use("/assets", express.static("app/assets", { maxAge: 0, etag: false }));
  app.use(async (req, res, next) => {
    try {
      const source = await viteDevServer.ssrLoadModule("./app/app.ts");
      return await source.app(req, res, next);
    } catch (error) {
      if (typeof error === "object" && error instanceof Error) {
        viteDevServer.ssrFixStacktrace(error);
      }
      next(error);
    }
  });
} else {
  console.log("Starting production server");
  app.use(
    "/assets",
    express.static("build/client/assets", { immutable: true, maxAge: "1y" }),
  );
  app.use(
    morgan(
      "[app] :method :url :status :res[content-length] - :response-time ms",
    ),
  );
  app.use(express.static("build/client", { maxAge: "1h" }));
  app.use((_req, res, next) => {
    res.setHeader("Cache-Control", "no-store");
    next();
  });
  app.use(await import(BUILD_PATH).then((mod) => mod.app));
}

const checkSuperAdminExists = async () => {
  const users = await UserService.find({
    match: {
      role: "SUPER_ADMIN",
      githubId: parseInt(process.env.SUPER_ADMIN_GITHUB_ID as string),
    },
  });

  if (users.length === 0) {
    await UserService.create({
      role: "SUPER_ADMIN",
      username: "local",
      githubId: parseInt(process.env.SUPER_ADMIN_GITHUB_ID as string),
      hasGithubSSO: process.env.SUPER_ADMIN_GITHUB_ID ? true : false,
      isRegistered: true,
      registeredAt: new Date(),
    });
  }
};

server.listen(PORT, async () => {
  console.log(`Server is running on http://localhost:${PORT}`);
  await initializeDatabase();
  await checkSuperAdminExists();
});
