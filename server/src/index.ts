import express from "express";
import path from "node:path";
import { app } from "./app";

const isProd = process.env.NODE_ENV === "production";
if (isProd) {
  const dist = path.resolve("client-dist");
  app.use(express.static(dist));
  app.get("*", (_req: express.Request, res: express.Response) => {
    res.sendFile(path.join(dist, "index.html"));
  });
}

const port = Number(process.env.PORT ?? 8787);
const host = process.env.HOST ?? "127.0.0.1";
app.listen(port, host, () => {
  console.log(`VYUHA server on http://${host}:${port} (${isProd ? "prod" : "dev"})`);
});
