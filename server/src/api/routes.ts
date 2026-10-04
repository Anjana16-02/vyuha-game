import express from "express";
import { store } from "../database/db";
import type { AchievementProgress, BattleRecord, KingdomState, PlayerProfile } from "../../../shared/types";

function str(v: unknown) {
  return typeof v === "string" && v.trim().length > 0;
}

export const api = express.Router();

api.post("/profile", (req, res) => {
  const body = req.body as PlayerProfile;
  if (!str(body?.playerId) || !str(body?.username)) {
    res.status(400).json({ error: "invalid_profile" });
    return;
  }
  const saved = store.putProfile({ ...body, updatedAt: Date.now() });
  res.json(saved);
});

api.get("/profile/:id", (req, res) => {
  const p = store.getProfile(req.params.id);
  if (!p) {
    res.status(404).json({ error: "not_found" });
    return;
  }
  res.json(p);
});

api.put("/profile/:id", (req, res) => {
  const body = req.body as PlayerProfile;
  if (body.playerId !== req.params.id) {
    res.status(400).json({ error: "id_mismatch" });
    return;
  }
  res.json(store.putProfile({ ...body, updatedAt: Date.now() }));
});

api.get("/battles", (_req, res) => {
  res.json(store.listBattles());
});

api.post("/battles", (req, res) => {
  const b = req.body as BattleRecord;
  if (!str(b?.id) || typeof b.seed !== "number") {
    res.status(400).json({ error: "invalid_battle" });
    return;
  }
  res.json(store.addBattle(b));
});

api.get("/battles/:id", (req, res) => {
  const b = store.getBattle(req.params.id);
  if (!b) {
    res.status(404).json({ error: "not_found" });
    return;
  }
  res.json(b);
});

api.get("/inventory", (req, res) => {
  const id = String(req.query.playerId ?? "");
  res.json(store.getInventory(id));
});

api.post("/inventory/unlock", (req, res) => {
  const { playerId, itemId } = req.body as { playerId: string; itemId: string };
  if (!str(playerId) || !str(itemId)) {
    res.status(400).json({ error: "invalid" });
    return;
  }
  res.json(store.unlock(playerId, itemId));
});

api.get("/achievements", (req, res) => {
  const id = String(req.query.playerId ?? "");
  res.json(store.getAchievements(id));
});

api.post("/achievements/progress", (req, res) => {
  const { playerId, list } = req.body as { playerId: string; list: AchievementProgress[] };
  if (!str(playerId) || !Array.isArray(list)) {
    res.status(400).json({ error: "invalid" });
    return;
  }
  res.json(store.progressAchievements(playerId, list));
});

api.get("/kingdom", (req, res) => {
  const id = String(req.query.playerId ?? "");
  res.json(store.getKingdom(id));
});

api.put("/kingdom", (req, res) => {
  const { playerId, kingdom } = req.body as { playerId: string; kingdom: KingdomState };
  if (!str(playerId) || !kingdom) {
    res.status(400).json({ error: "invalid" });
    return;
  }
  res.json(store.putKingdom(playerId, kingdom));
});

api.get("/health", (_req, res) => {
  res.json({ ok: true, persistence: store.fallback ? "json" : "sqlite" });
});
