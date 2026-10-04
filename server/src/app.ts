import express from "express";
import { api } from "./api/routes";

export const app = express();
app.use(express.json({ limit: "2mb" }));
app.use("/api", api);
