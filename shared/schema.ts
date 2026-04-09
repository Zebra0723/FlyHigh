import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// ── Competition Settings ─────────────────────────────────────────────────────
export const competitionSettings = sqliteTable("competition_settings", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull().default("FlyHigh Championships"),
  description: text("description").notNull().default(""),
  useGroups: integer("use_groups", { mode: "boolean" }).notNull().default(true),
  groups: text("groups").notNull().default('["A4","XL","XS"]'),
  planeTypes: text("plane_types").notNull().default('["Glider","Distance","Stunt","Speed","Acrobatic"]'),
  judgeCategories: text("judge_categories").notNull().default('["distance","hangtime","accuracy","style"]'),
  categoryWeights: text("category_weights").notNull().default('{"position":60,"distance":20,"hangtime":10,"accuracy":5,"style":5}'),
  maxEntrantsPerRace: integer("max_entrants_per_race").notNull().default(8),
  pointsForFirst: integer("points_for_first").notNull().default(10),
  pointsForSecond: integer("points_for_second").notNull().default(7),
  pointsForThird: integer("points_for_third").notNull().default(5),
  pointsForFourth: integer("points_for_fourth").notNull().default(3),
  pointsForFifth: integer("points_for_fifth").notNull().default(2),
  pointsForOther: integer("points_for_other").notNull().default(1),
  showPublicStats: text("show_public_stats").notNull().default('["wins","advances","avgFinish","totalPoints","winRate"]'),
  adminPassword: text("admin_password").notNull().default("admin123"),
});

// ── Planes ───────────────────────────────────────────────────────────────────
export const planes = sqliteTable("planes", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  group: text("group").notNull().default("A4"),
  type: text("type").notNull().default("Glider"),
  creator: text("creator").notNull().default("Unknown"),
  description: text("description").notNull().default(""),
  imageUrl: text("image_url"),
  difficulty: integer("difficulty").notNull().default(2),
  paperSize: text("paper_size").notNull().default("A4"),
  flyingStyle: text("flying_style").notNull().default("Glide"),
  throwingTips: text("throwing_tips").notNull().default(""),
  aiSummary: text("ai_summary").notNull().default(""),
  featured: integer("featured", { mode: "boolean" }).notNull().default(false),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  createdAt: text("created_at").notNull().default(new Date().toISOString()),
});

// ── Tutorial Steps ────────────────────────────────────────────────────────────
// Each step has: number, title, instruction text, optional tip, optional image (stored as base64 data URL)
export const tutorialSteps = sqliteTable("tutorial_steps", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  planeId: integer("plane_id").notNull().references(() => planes.id, { onDelete: "cascade" }),
  stepNumber: integer("step_number").notNull(),
  title: text("title").notNull(),
  instruction: text("instruction").notNull(),
  tip: text("tip"),
  imageDataUrl: text("image_data_url"), // base64 data URL, e.g. "data:image/jpeg;base64,..."
  imageMimeType: text("image_mime_type"), // e.g. "image/jpeg"
});

// ── Race Events ──────────────────────────────────────────────────────────────
export const raceEvents = sqliteTable("race_events", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  date: text("date").notNull(),
  group: text("group"),
  notes: text("notes"),
  completed: integer("completed", { mode: "boolean" }).notNull().default(false),
});

// ── Race Results ─────────────────────────────────────────────────────────────
export const raceResults = sqliteTable("race_results", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  raceEventId: integer("race_event_id").notNull().references(() => raceEvents.id, { onDelete: "cascade" }),
  planeId: integer("plane_id").notNull().references(() => planes.id, { onDelete: "cascade" }),
  finishPosition: integer("finish_position").notNull(),
  distanceScore: real("distance_score"),
  hangtimeScore: real("hangtime_score"),
  accuracyScore: real("accuracy_score"),
  styleScore: real("style_score"),
  notes: text("notes"),
});

// ── Calculated Stats ─────────────────────────────────────────────────────────
export const planeStats = sqliteTable("plane_stats", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  planeId: integer("plane_id").notNull().references(() => planes.id, { onDelete: "cascade" }).unique(),
  totalRaces: integer("total_races").notNull().default(0),
  wins: integer("wins").notNull().default(0),
  podiums: integer("podiums").notNull().default(0),
  totalPoints: integer("total_points").notNull().default(0),
  avgFinish: real("avg_finish"),
  winRate: real("win_rate"),
  consistencyScore: real("consistency_score"),
  bestFinish: integer("best_finish"),
  rankPosition: integer("rank_position"),
  lastUpdated: text("last_updated").notNull().default(new Date().toISOString()),
});

// ── Community Design Submissions ─────────────────────────────────────────────
// Anyone can submit a plane design with a step-by-step picture tutorial
export const communityDesigns = sqliteTable("community_designs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  authorName: text("author_name").notNull(),
  authorEmail: text("author_email"),
  type: text("type").notNull().default("Glider"),
  difficulty: integer("difficulty").notNull().default(2),
  paperSize: text("paper_size").notNull().default("A4"),
  flyingStyle: text("flying_style").notNull().default("Glide"),
  throwingTips: text("throwing_tips").notNull().default(""),
  description: text("description").notNull().default(""),
  // JSON array of { stepNumber, title, instruction, tip, imageDataUrl?, imageMimeType? }
  steps: text("steps").notNull().default("[]"),
  status: text("status").notNull().default("pending"), // pending | approved | rejected
  submittedAt: text("submitted_at").notNull().default(new Date().toISOString()),
  reviewNote: text("review_note"),
});

// ── Gallery Media Uploads ─────────────────────────────────────────────────────
export const galleryItems = sqliteTable("gallery_items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  uploaderName: text("uploader_name").notNull(),
  caption: text("caption").notNull().default(""),
  mediaType: text("media_type").notNull().default("image"), // image | video
  dataUrl: text("data_url").notNull(),        // base64 data URL
  mimeType: text("mime_type").notNull().default("image/jpeg"),
  linkedPlaneId: integer("linked_plane_id").references(() => planes.id, { onDelete: "set null" }),
  linkedPlaneName: text("linked_plane_name"),
  status: text("status").notNull().default("pending"), // pending | approved | rejected
  submittedAt: text("submitted_at").notNull().default(new Date().toISOString()),
  likes: integer("likes").notNull().default(0),
});

// ── Users ─────────────────────────────────────────────────────────────────────
export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  email: text("email").notNull().unique(),
  username: text("username").notNull(),
  passwordHash: text("password_hash").notNull(),
  createdAt: text("created_at").notNull().default(new Date().toISOString()),
});

// ── Personal Planes ───────────────────────────────────────────────────────────
export const personalPlanes = sqliteTable("personal_planes", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull(),
  name: text("name").notNull(),
  notes: text("notes").notNull().default(""),
  createdAt: text("created_at").notNull().default(new Date().toISOString()),
});

// ── Personal Events ───────────────────────────────────────────────────────────
export const personalEvents = sqliteTable("personal_events", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull(),
  name: text("name").notNull(),
  date: text("date").notNull(),
  notes: text("notes").notNull().default(""),
  completed: integer("completed", { mode: "boolean" }).notNull().default(false),
});

// ── Personal Results ──────────────────────────────────────────────────────────
export const personalResults = sqliteTable("personal_results", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  eventId: integer("event_id").notNull(),
  userId: integer("user_id").notNull(),
  personalPlaneId: integer("personal_plane_id").notNull(),
  finishPosition: integer("finish_position").notNull(),
  distanceMeters: real("distance_meters"),
  hangtimeSeconds: real("hangtime_seconds"),
  notes: text("notes").notNull().default(""),
});

// ── Personal Stats ────────────────────────────────────────────────────────────
export const personalStats = sqliteTable("personal_stats", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull(),
  personalPlaneId: integer("personal_plane_id").notNull().unique(),
  totalRaces: integer("total_races").notNull().default(0),
  wins: integer("wins").notNull().default(0),
  podiums: integer("podiums").notNull().default(0),
  avgFinish: real("avg_finish"),
  bestFinish: integer("best_finish"),
  totalDistanceMeters: real("total_distance_meters").notNull().default(0),
  bestDistanceMeters: real("best_distance_meters"),
  bestHangtimeSeconds: real("best_hangtime_seconds"),
  winRate: real("win_rate"),
  lastUpdated: text("last_updated").notNull().default(new Date().toISOString()),
});

// ── Global Leaderboard Submissions ───────────────────────────────────────────
export const globalSubmissions = sqliteTable("global_submissions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull(),
  username: text("username").notNull(),
  planeName: text("plane_name").notNull(),
  totalRaces: integer("total_races").notNull().default(0),
  wins: integer("wins").notNull().default(0),
  avgFinish: real("avg_finish"),
  bestDistanceMeters: real("best_distance_meters"),
  bestHangtimeSeconds: real("best_hangtime_seconds"),
  winRate: real("win_rate"),
  submissionType: text("submission_type").notNull().default("both"), // 'leaderboard' | 'planes' | 'both'
  aiSummary: text("ai_summary").notNull().default(""),
  planeNotes: text("plane_notes").notNull().default(""),
  status: text("status").notNull().default("pending"),
  submittedAt: text("submitted_at").notNull().default(new Date().toISOString()),
});

// ── Insert Schemas ───────────────────────────────────────────────────────────
export const insertPlaneSchema = createInsertSchema(planes).omit({ id: true, aiSummary: true, createdAt: true });
export const insertTutorialStepSchema = createInsertSchema(tutorialSteps).omit({ id: true });
export const insertRaceEventSchema = createInsertSchema(raceEvents).omit({ id: true });
export const insertRaceResultSchema = createInsertSchema(raceResults).omit({ id: true });
export const insertCompetitionSettingsSchema = createInsertSchema(competitionSettings).omit({ id: true });
export const insertCommunityDesignSchema = createInsertSchema(communityDesigns).omit({ id: true, status: true, submittedAt: true, reviewNote: true });
export const insertGalleryItemSchema = createInsertSchema(galleryItems).omit({ id: true, status: true, submittedAt: true, likes: true });
export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true });
export const insertPersonalPlaneSchema = createInsertSchema(personalPlanes).omit({ id: true, createdAt: true });
export const insertPersonalEventSchema = createInsertSchema(personalEvents).omit({ id: true });
export const insertPersonalResultSchema = createInsertSchema(personalResults).omit({ id: true });
export const insertGlobalSubmissionSchema = createInsertSchema(globalSubmissions).omit({ id: true, submittedAt: true });

// ── Types ────────────────────────────────────────────────────────────────────
export type Plane = typeof planes.$inferSelect;
export type InsertPlane = z.infer<typeof insertPlaneSchema>;
export type TutorialStep = typeof tutorialSteps.$inferSelect;
export type InsertTutorialStep = z.infer<typeof insertTutorialStepSchema>;
export type RaceEvent = typeof raceEvents.$inferSelect;
export type InsertRaceEvent = z.infer<typeof insertRaceEventSchema>;
export type RaceResult = typeof raceResults.$inferSelect;
export type InsertRaceResult = z.infer<typeof insertRaceResultSchema>;
export type CompetitionSettings = typeof competitionSettings.$inferSelect;
export type PlaneStats = typeof planeStats.$inferSelect;
export type CommunityDesign = typeof communityDesigns.$inferSelect;
export type InsertCommunityDesign = z.infer<typeof insertCommunityDesignSchema>;
export type GalleryItem = typeof galleryItems.$inferSelect;
export type InsertGalleryItem = z.infer<typeof insertGalleryItemSchema>;
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type SafeUser = Omit<User, 'passwordHash'>;
export type PersonalPlane = typeof personalPlanes.$inferSelect;
export type InsertPersonalPlane = z.infer<typeof insertPersonalPlaneSchema>;
export type PersonalEvent = typeof personalEvents.$inferSelect;
export type InsertPersonalEvent = z.infer<typeof insertPersonalEventSchema>;
export type PersonalResult = typeof personalResults.$inferSelect;
export type InsertPersonalResult = z.infer<typeof insertPersonalResultSchema>;
export type PersonalStats = typeof personalStats.$inferSelect;
export type GlobalSubmission = typeof globalSubmissions.$inferSelect;
export type InsertGlobalSubmission = z.infer<typeof insertGlobalSubmissionSchema>;

export type PersonalPlaneWithStats = PersonalPlane & { stats: PersonalStats | null };
export type PersonalEventWithResults = PersonalEvent & { results?: PersonalResult[] };

export type PlaneWithStats = Plane & {
  stats: PlaneStats | null;
  tutorialSteps?: TutorialStep[];
};
export type RaceResultWithPlane = RaceResult & { plane: Plane };
export type RaceEventWithResults = RaceEvent & { results: RaceResultWithPlane[] };

// Step shape used both in community designs and official tutorials
export interface TutorialStepData {
  stepNumber: number;
  title: string;
  instruction: string;
  tip?: string | null;
  imageDataUrl?: string | null;
  imageMimeType?: string | null;
}
