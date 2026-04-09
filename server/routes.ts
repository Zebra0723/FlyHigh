import type { Express, Request, Response, NextFunction } from "express";
import type { Server } from "http";
import { storage } from "./storage";

function makeToken(): string {
  return Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
}

function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = req.headers["x-session-token"] as string;
  if (!token) return res.status(401).json({ error: "Not authenticated" });
  const userId = storage.getSessionUserId(token);
  if (!userId) return res.status(401).json({ error: "Session expired, please log in again" });
  (req as any).userId = userId;
  next();
}

export function registerRoutes(httpServer: Server, app: Express) {

  // ── User Auth ──────────────────────────────────────────────────────────────
  app.post("/api/register", async (req, res) => {
    const { email, username, password } = req.body;
    if (!email || !username || !password) return res.status(400).json({ error: "Email, username and password required" });
    if (password.length < 6) return res.status(400).json({ error: "Password must be at least 6 characters" });
    try {
      const user = await storage.registerUser(email, username, password);
      const token = makeToken();
      storage.createSession(token, user.id);
      res.json({ user, token });
    } catch (e: any) { res.status(400).json({ error: e.message }); }
  });

  app.post("/api/login", async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: "Email and password required" });
    const user = await storage.loginUser(email, password);
    if (!user) return res.status(401).json({ error: "Invalid email or password" });
    const token = makeToken();
    storage.createSession(token, user.id);
    res.json({ user, token });
  });

  app.post("/api/logout", (req, res) => {
    const token = req.headers["x-session-token"] as string;
    if (token) storage.deleteSession(token);
    res.json({ ok: true });
  });

  app.get("/api/me", requireAuth, (req, res) => {
    const user = storage.getUserById((req as any).userId);
    user ? res.json(user) : res.status(404).json({ error: "User not found" });
  });

  // Change own password
  app.post("/api/me/change-password", requireAuth, async (req, res) => {
    const { oldPassword, newPassword } = req.body;
    if (!oldPassword || !newPassword || newPassword.length < 6)
      return res.status(400).json({ error: "Invalid passwords" });
    const ok = await storage.changePassword((req as any).userId, oldPassword, newPassword);
    ok ? res.json({ ok: true }) : res.status(401).json({ error: "Current password is incorrect" });
  });

  // Admin: list all users
  app.get("/api/admin/users", (_req, res) => res.json(storage.getAllUsers()));

  // Admin: reset a user's password
  app.post("/api/admin/users/:id/reset-password", async (req, res) => {
    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 6) return res.status(400).json({ error: "Password must be at least 6 characters" });
    await storage.resetPassword(+req.params.id, newPassword);
    res.json({ ok: true });
  });

  // Admin: delete a user
  app.delete("/api/admin/users/:id", (req, res) => {
    storage.deleteUser(+req.params.id);
    res.json({ ok: true });
  });

  // ── Settings ──────────────────────────────────────────────────────────────
  app.get("/api/settings", (_req, res) => {
    const s = storage.getSettings();
    if (!s) return res.status(404).json({ error: "Not found" });
    const { adminPassword, ...safe } = s;
    res.json(safe);
  });
  app.put("/api/settings", (req, res) => {
    try { const u = storage.updateSettings(req.body); const { adminPassword, ...safe } = u; res.json(safe); }
    catch (e: any) { res.status(400).json({ error: e.message }); }
  });
  // ── Featured Posts ────────────────────────────────────────────────
  app.get("/api/featured", (_req, res) => res.json(storage.getFeaturedPosts()));
  app.post("/api/featured", (req, res) => {
    try { res.status(201).json(storage.createFeaturedPost(req.body)); }
    catch (e: any) { res.status(400).json({ error: e.message }); }
  });
  app.put("/api/featured/:id", (req, res) => {
    try { res.json(storage.updateFeaturedPost(+req.params.id, req.body)); }
    catch (e: any) { res.status(400).json({ error: e.message }); }
  });
  app.delete("/api/featured/:id", (req, res) => {
    storage.deleteFeaturedPost(+req.params.id) ? res.json({ ok: true }) : res.status(404).json({ error: "Not found" });
  });

  app.post("/api/auth", (req, res) => {
    const s = storage.getSettings();
    res.json({ ok: s?.adminPassword === req.body.password });
  });

  // ── Planes ────────────────────────────────────────────────────────────────
  // Community planes from approved global submissions (type=planes or both)
  app.get("/api/planes/community", (_req, res) => {
    const all = storage.getGlobalSubmissions("approved");
    res.json(all.filter(g => g.submissionType === "planes" || g.submissionType === "both"));
  });
  app.get("/api/planes", (req, res) => res.json(storage.getPlanes(req.query.group as string, req.query.type as string)));
  app.get("/api/planes/:slug", (req, res) => { const p = storage.getPlaneBySlug(req.params.slug); p ? res.json(p) : res.status(404).json({ error: "Not found" }); });
  app.post("/api/planes", (req, res) => { try { res.status(201).json(storage.createPlane(req.body)); } catch (e: any) { res.status(400).json({ error: e.message }); } });
  app.put("/api/planes/:id", (req, res) => { const p = storage.updatePlane(+req.params.id, req.body); p ? res.json(p) : res.status(404).json({ error: "Not found" }); });
  app.delete("/api/planes/:id", (req, res) => { storage.deletePlane(+req.params.id) ? res.json({ ok: true }) : res.status(404).json({ error: "Not found" }); });

  // ── Tutorial Steps ────────────────────────────────────────────────────────
  app.get("/api/planes/:id/tutorial", (req, res) => res.json(storage.getTutorialSteps(+req.params.id)));
  app.put("/api/planes/:id/tutorial", (req, res) => {
    const id = +req.params.id;
    storage.upsertTutorialSteps(id, req.body);
    res.json(storage.getTutorialSteps(id));
  });

  // ── Leaderboard ───────────────────────────────────────────────────────────
  app.get("/api/leaderboard", (req, res) => res.json(storage.getLeaderboard(req.query.group as string)));

  // ── Race Events ───────────────────────────────────────────────────────────
  app.get("/api/events", (_req, res) => res.json(storage.getRaceEvents()));
  app.get("/api/events/:id", (req, res) => { const e = storage.getRaceEventById(+req.params.id); e ? res.json(e) : res.status(404).json({ error: "Not found" }); });
  app.post("/api/events", (req, res) => { try { res.status(201).json(storage.createRaceEvent(req.body)); } catch (e: any) { res.status(400).json({ error: e.message }); } });
  app.put("/api/events/:id", (req, res) => { const e = storage.updateRaceEvent(+req.params.id, req.body); e ? res.json(e) : res.status(404).json({ error: "Not found" }); });
  app.delete("/api/events/:id", (req, res) => { storage.deleteRaceEvent(+req.params.id) ? res.json({ ok: true }) : res.status(404).json({ error: "Not found" }); });
  app.post("/api/events/:id/results", (req, res) => { storage.addRaceResults(+req.params.id, req.body); storage.updateRaceEvent(+req.params.id, { completed: true }); res.json({ ok: true }); });
  app.post("/api/recalculate", (_req, res) => { storage.recalculateStats(); res.json({ ok: true }); });

  // ── Community Designs ─────────────────────────────────────────────────────
  app.get("/api/community/designs", (_req, res) => res.json(storage.getCommunityDesigns("approved")));
  app.get("/api/admin/community/designs", (_req, res) => res.json(storage.getCommunityDesigns()));
  app.get("/api/community/designs/:id", (req, res) => { const d = storage.getCommunityDesignById(+req.params.id); d ? res.json(d) : res.status(404).json({ error: "Not found" }); });
  app.post("/api/community/designs", (req, res) => {
    try { res.status(201).json(storage.createCommunityDesign(req.body)); }
    catch (e: any) { res.status(400).json({ error: e.message }); }
  });
  app.patch("/api/community/designs/:id/status", (req, res) => {
    const d = storage.updateCommunityDesignStatus(+req.params.id, req.body.status, req.body.note);
    d ? res.json(d) : res.status(404).json({ error: "Not found" });
  });
  app.delete("/api/community/designs/:id", (req, res) => { storage.deleteCommunityDesign(+req.params.id) ? res.json({ ok: true }) : res.status(404).json({ error: "Not found" }); });

  // ── Gallery ───────────────────────────────────────────────────────────────
  app.get("/api/gallery", (_req, res) => res.json(storage.getGalleryItems("approved")));
  app.get("/api/admin/gallery", (_req, res) => res.json(storage.getGalleryItems()));
  app.post("/api/gallery", (req, res) => {
    try { res.status(201).json(storage.createGalleryItem(req.body)); }
    catch (e: any) { res.status(400).json({ error: e.message }); }
  });
  app.post("/api/gallery/:id/like", (req, res) => {
    const item = storage.likeGalleryItem(+req.params.id);
    item ? res.json(item) : res.status(404).json({ error: "Not found" });
  });
  app.patch("/api/gallery/:id/status", (req, res) => {
    const item = storage.updateGalleryItemStatus(+req.params.id, req.body.status);
    item ? res.json(item) : res.status(404).json({ error: "Not found" });
  });
  app.delete("/api/gallery/:id", (req, res) => { storage.deleteGalleryItem(+req.params.id) ? res.json({ ok: true }) : res.status(404).json({ error: "Not found" }); });

  // ── Personal Table (requires auth) ────────────────────────────────────────
  app.get("/api/personal/planes", requireAuth, (req, res) => {
    res.json(storage.getPersonalPlanes((req as any).userId));
  });
  app.post("/api/personal/planes", requireAuth, (req, res) => {
    try { res.status(201).json(storage.createPersonalPlane({ ...req.body, userId: (req as any).userId })); }
    catch (e: any) { res.status(400).json({ error: e.message }); }
  });
  app.delete("/api/personal/planes/:id", requireAuth, (req, res) => {
    storage.deletePersonalPlane(+req.params.id, (req as any).userId) ? res.json({ ok: true }) : res.status(404).json({ error: "Not found" });
  });

  app.get("/api/personal/events", requireAuth, (req, res) => {
    res.json(storage.getPersonalEvents((req as any).userId));
  });
  app.post("/api/personal/events", requireAuth, (req, res) => {
    try { res.status(201).json(storage.createPersonalEvent({ ...req.body, userId: (req as any).userId })); }
    catch (e: any) { res.status(400).json({ error: e.message }); }
  });
  app.delete("/api/personal/events/:id", requireAuth, (req, res) => {
    storage.deletePersonalEvent(+req.params.id, (req as any).userId) ? res.json({ ok: true }) : res.status(404).json({ error: "Not found" });
  });
  app.post("/api/personal/events/:id/results", requireAuth, (req, res) => {
    storage.addPersonalResults(+req.params.id, (req as any).userId, req.body);
    res.json({ ok: true });
  });

  // ── Global Leaderboard ────────────────────────────────────────────────────
  app.get("/api/global", (_req, res) => res.json(storage.getGlobalSubmissions("approved")));
  app.get("/api/admin/global", (_req, res) => res.json(storage.getGlobalSubmissions()));
  app.get("/api/global/mine", requireAuth, (req, res) => res.json(storage.getGlobalSubmissionsByUser((req as any).userId)));
  app.post("/api/global", requireAuth, (req, res) => {
    try {
      const user = storage.getUserById((req as any).userId);
      if (!user) return res.status(401).json({ error: "User not found" });
      res.json(storage.submitToGlobal({ ...req.body, userId: user.id, username: user.username }));
    } catch (e: any) { res.status(400).json({ error: e.message }); }
  });
  app.patch("/api/global/:id/status", (req, res) => {
    const item = storage.updateGlobalSubmissionStatus(+req.params.id, req.body.status);
    item ? res.json(item) : res.status(404).json({ error: "Not found" });
  });
  app.delete("/api/global/:id", (req, res) => { storage.deleteGlobalSubmission(+req.params.id) ? res.json({ ok: true }) : res.status(404).json({ error: "Not found" }); });

  return httpServer;
}
