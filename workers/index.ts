import { initializeDatabase } from "app/lib/database";
import "app/modules/storage/storage";
import http from "http";
import createWorker from "./helpers/createWorker";
import cronProcessor from "./runners/cron";
import generalProcessor from "./runners/general";
import tasksProcessor from "./runners/tasks";

// Cloud Run requires the container to bind to $PORT and answer health
// checks — this process otherwise has no HTTP listener of its own.
const port = process.env.PORT || 4000;
http
  .createServer((_req, res) => res.writeHead(200).end("ok"))
  .listen(port, () => console.log(`[workers] Health server on port ${port}`));

console.log("[workers] Initializing database connection...");
const dbStartDate = Date.now();
await initializeDatabase();
console.log(`[workers] Database ready (${Date.now() - dbStartDate}ms)`);

createWorker({ name: "tasks", isGrouped: true }, tasksProcessor);
createWorker({ name: "general" }, generalProcessor);
createWorker({ name: "cron" }, cronProcessor);
