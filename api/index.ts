// Vercel serverless entry: reuses the same Express app as the local server.
// Vercel's filesystem is read-only except /tmp, so storage is ephemeral there.
process.env.DATABASE_PATH ??= "/tmp/vyuha/vyuha.db";
import { app } from "../server/src/app";
export default app;
