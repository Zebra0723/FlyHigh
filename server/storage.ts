import Database from "better-sqlite3";
import {
  type Plane, type InsertPlane, type TutorialStep, type InsertTutorialStep,
  type RaceEvent, type InsertRaceEvent, type RaceResult, type InsertRaceResult,
  type CompetitionSettings, type PlaneStats,
  type PlaneWithStats, type RaceResultWithPlane, type RaceEventWithResults,
  type CommunityDesign, type InsertCommunityDesign,
  type GalleryItem, type InsertGalleryItem,
  type User, type SafeUser, type PersonalPlane, type InsertPersonalPlane,
  type PersonalEvent, type InsertPersonalEvent,
  type PersonalResult, type InsertPersonalResult,
  type PersonalStats, type PersonalPlaneWithStats,
  type GlobalSubmission, type InsertGlobalSubmission,
} from "@shared/schema";
import bcrypt from "bcryptjs";

const sqlite = new Database("paper_plane_rankings.db");
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");

function slugify(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

// ── Migration ────────────────────────────────────────────────────────────────
function migrate() {
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS competition_settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL DEFAULT 'FlyHigh Championships',
      description TEXT NOT NULL DEFAULT '',
      use_groups INTEGER NOT NULL DEFAULT 1,
      groups TEXT NOT NULL DEFAULT '["A4","XL","XS"]',
      plane_types TEXT NOT NULL DEFAULT '["Glider","Distance","Stunt","Speed","Acrobatic"]',
      judge_categories TEXT NOT NULL DEFAULT '["distance","hangtime","accuracy","style"]',
      category_weights TEXT NOT NULL DEFAULT '{"position":60,"distance":20,"hangtime":10,"accuracy":5,"style":5}',
      max_entrants_per_race INTEGER NOT NULL DEFAULT 8,
      points_for_first INTEGER NOT NULL DEFAULT 10,
      points_for_second INTEGER NOT NULL DEFAULT 7,
      points_for_third INTEGER NOT NULL DEFAULT 5,
      points_for_fourth INTEGER NOT NULL DEFAULT 3,
      points_for_fifth INTEGER NOT NULL DEFAULT 2,
      points_for_other INTEGER NOT NULL DEFAULT 1,
      show_public_stats TEXT NOT NULL DEFAULT '["wins","advances","avgFinish","totalPoints","winRate"]',
      admin_password TEXT NOT NULL DEFAULT 'admin123'
    );

    CREATE TABLE IF NOT EXISTS planes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      "group" TEXT NOT NULL DEFAULT 'A4',
      type TEXT NOT NULL DEFAULT 'Glider',
      creator TEXT NOT NULL DEFAULT 'Unknown',
      description TEXT NOT NULL DEFAULT '',
      image_url TEXT,
      difficulty INTEGER NOT NULL DEFAULT 2,
      paper_size TEXT NOT NULL DEFAULT 'A4',
      flying_style TEXT NOT NULL DEFAULT 'Glide',
      throwing_tips TEXT NOT NULL DEFAULT '',
      ai_summary TEXT NOT NULL DEFAULT '',
      featured INTEGER NOT NULL DEFAULT 0,
      active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS tutorial_steps (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      plane_id INTEGER NOT NULL REFERENCES planes(id) ON DELETE CASCADE,
      step_number INTEGER NOT NULL,
      title TEXT NOT NULL,
      instruction TEXT NOT NULL,
      tip TEXT,
      image_data_url TEXT,
      image_mime_type TEXT
    );

    CREATE TABLE IF NOT EXISTS race_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      date TEXT NOT NULL,
      "group" TEXT,
      notes TEXT,
      completed INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS race_results (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      race_event_id INTEGER NOT NULL REFERENCES race_events(id) ON DELETE CASCADE,
      plane_id INTEGER NOT NULL REFERENCES planes(id) ON DELETE CASCADE,
      finish_position INTEGER NOT NULL,
      distance_score REAL,
      hangtime_score REAL,
      accuracy_score REAL,
      style_score REAL,
      notes TEXT
    );

    CREATE TABLE IF NOT EXISTS plane_stats (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      plane_id INTEGER NOT NULL UNIQUE REFERENCES planes(id) ON DELETE CASCADE,
      total_races INTEGER NOT NULL DEFAULT 0,
      wins INTEGER NOT NULL DEFAULT 0,
      podiums INTEGER NOT NULL DEFAULT 0,
      total_points INTEGER NOT NULL DEFAULT 0,
      avg_finish REAL,
      win_rate REAL,
      consistency_score REAL,
      best_finish INTEGER,
      rank_position INTEGER,
      last_updated TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS community_designs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      author_name TEXT NOT NULL,
      author_email TEXT,
      type TEXT NOT NULL DEFAULT 'Glider',
      difficulty INTEGER NOT NULL DEFAULT 2,
      paper_size TEXT NOT NULL DEFAULT 'A4',
      flying_style TEXT NOT NULL DEFAULT 'Glide',
      throwing_tips TEXT NOT NULL DEFAULT '',
      description TEXT NOT NULL DEFAULT '',
      steps TEXT NOT NULL DEFAULT '[]',
      status TEXT NOT NULL DEFAULT 'pending',
      submitted_at TEXT NOT NULL DEFAULT (datetime('now')),
      review_note TEXT
    );

    CREATE TABLE IF NOT EXISTS gallery_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      uploader_name TEXT NOT NULL,
      caption TEXT NOT NULL DEFAULT '',
      media_type TEXT NOT NULL DEFAULT 'image',
      data_url TEXT NOT NULL,
      mime_type TEXT NOT NULL DEFAULT 'image/jpeg',
      linked_plane_id INTEGER REFERENCES planes(id) ON DELETE SET NULL,
      linked_plane_name TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      submitted_at TEXT NOT NULL DEFAULT (datetime('now')),
      likes INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL UNIQUE,
      username TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS featured_posts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      body TEXT NOT NULL,
      badge TEXT NOT NULL DEFAULT 'Feature',
      pinned INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS auth_sessions (
      token TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS personal_planes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      notes TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS personal_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      date TEXT NOT NULL,
      notes TEXT NOT NULL DEFAULT '',
      completed INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS personal_results (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      event_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      personal_plane_id INTEGER NOT NULL,
      finish_position INTEGER NOT NULL,
      distance_meters REAL,
      hangtime_seconds REAL,
      notes TEXT NOT NULL DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS personal_stats (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      personal_plane_id INTEGER NOT NULL UNIQUE,
      total_races INTEGER NOT NULL DEFAULT 0,
      wins INTEGER NOT NULL DEFAULT 0,
      podiums INTEGER NOT NULL DEFAULT 0,
      avg_finish REAL,
      best_finish INTEGER,
      total_distance_meters REAL NOT NULL DEFAULT 0,
      best_distance_meters REAL,
      best_hangtime_seconds REAL,
      win_rate REAL,
      last_updated TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS global_submissions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      username TEXT NOT NULL,
      plane_name TEXT NOT NULL,
      total_races INTEGER NOT NULL DEFAULT 0,
      wins INTEGER NOT NULL DEFAULT 0,
      avg_finish REAL,
      best_distance_meters REAL,
      best_hangtime_seconds REAL,
      win_rate REAL,
      status TEXT NOT NULL DEFAULT 'pending',
      submitted_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

  `);

  // Migrations — add columns that may not exist in older DBs
  try { sqlite.prepare("ALTER TABLE global_submissions ADD COLUMN status TEXT NOT NULL DEFAULT 'pending'").run(); } catch {}
  try { sqlite.prepare("ALTER TABLE global_submissions ADD COLUMN user_id INTEGER NOT NULL DEFAULT 0").run(); } catch {}
  try { sqlite.prepare("ALTER TABLE global_submissions ADD COLUMN submission_type TEXT NOT NULL DEFAULT 'both'").run(); } catch {}
  try { sqlite.prepare("ALTER TABLE global_submissions ADD COLUMN ai_summary TEXT NOT NULL DEFAULT ''").run(); } catch {}
  try { sqlite.prepare("ALTER TABLE global_submissions ADD COLUMN plane_notes TEXT NOT NULL DEFAULT ''").run(); } catch {}
  try { sqlite.prepare("ALTER TABLE global_submissions ADD COLUMN username TEXT NOT NULL DEFAULT ''").run(); } catch {}
  try { sqlite.prepare("ALTER TABLE personal_planes ADD COLUMN user_id INTEGER NOT NULL DEFAULT 0").run(); } catch {}
  try { sqlite.prepare("ALTER TABLE personal_events ADD COLUMN user_id INTEGER NOT NULL DEFAULT 0").run(); } catch {}
  try { sqlite.prepare("ALTER TABLE personal_results ADD COLUMN user_id INTEGER NOT NULL DEFAULT 0").run(); } catch {}
  try { sqlite.prepare("ALTER TABLE personal_stats ADD COLUMN user_id INTEGER NOT NULL DEFAULT 0").run(); } catch {}

  // Seed settings row if missing
  const sc = sqlite.prepare("SELECT COUNT(*) as cnt FROM competition_settings").get() as { cnt: number };
  if (sc.cnt === 0) sqlite.exec(`INSERT INTO competition_settings (name) VALUES ('FlyHigh Championships')`);

  // No planes seeded — admin adds them via the admin panel
}

migrate();

// ── IStorage ─────────────────────────────────────────────────────────────────
export interface IStorage {
  getSettings(): CompetitionSettings | undefined;
  updateSettings(data: Partial<CompetitionSettings>): CompetitionSettings;
  getPlanes(group?: string, type?: string): PlaneWithStats[];
  getPlaneById(id: number): PlaneWithStats | undefined;
  getPlaneBySlug(slug: string): PlaneWithStats | undefined;
  createPlane(data: InsertPlane): Plane;
  updatePlane(id: number, data: any): Plane | undefined;
  deletePlane(id: number): boolean;
  getTutorialSteps(planeId: number): TutorialStep[];
  upsertTutorialSteps(planeId: number, steps: any[]): void;
  getRaceEvents(): RaceEventWithResults[];
  getRaceEventById(id: number): RaceEventWithResults | undefined;
  createRaceEvent(data: InsertRaceEvent): RaceEvent;
  updateRaceEvent(id: number, data: any): RaceEvent | undefined;
  deleteRaceEvent(id: number): boolean;
  addRaceResults(eventId: number, results: any[]): void;
  recalculateStats(): void;
  getLeaderboard(group?: string): PlaneWithStats[];
  getCommunityDesigns(status?: string): CommunityDesign[];
  getCommunityDesignById(id: number): CommunityDesign | undefined;
  createCommunityDesign(data: InsertCommunityDesign): CommunityDesign;
  updateCommunityDesignStatus(id: number, status: string, note?: string): CommunityDesign | undefined;
  deleteCommunityDesign(id: number): boolean;
  getGalleryItems(status?: string): GalleryItem[];
  getGalleryItemById(id: number): GalleryItem | undefined;
  createGalleryItem(data: InsertGalleryItem): GalleryItem;
  updateGalleryItemStatus(id: number, status: string): GalleryItem | undefined;
  likeGalleryItem(id: number): GalleryItem | undefined;
  deleteGalleryItem(id: number): boolean;
  // Featured posts
  getFeaturedPosts(): any[];
  createFeaturedPost(data: { title: string; body: string; badge: string; pinned: boolean }): any;
  updateFeaturedPost(id: number, data: { title: string; body: string; badge: string; pinned: boolean }): any;
  deleteFeaturedPost(id: number): boolean;
  // User auth
  registerUser(email: string, username: string, password: string): Promise<SafeUser>;
  loginUser(email: string, password: string): Promise<SafeUser | null>;
  getUserById(id: number): SafeUser | undefined;
  getAllUsers(): SafeUser[];
  resetPassword(userId: number, newPassword: string): Promise<void>;
  changePassword(userId: number, oldPassword: string, newPassword: string): Promise<boolean>;
  deleteUser(userId: number): void;
  createSession(token: string, userId: number): void;
  getSessionUserId(token: string): number | null;
  deleteSession(token: string): void;
  // Personal table
  getPersonalPlanes(userId: number): PersonalPlaneWithStats[];
  createPersonalPlane(data: InsertPersonalPlane): PersonalPlane;
  deletePersonalPlane(id: number, userId: number): boolean;
  getPersonalEvents(userId: number): PersonalEvent[];
  createPersonalEvent(data: InsertPersonalEvent): PersonalEvent;
  deletePersonalEvent(id: number, userId: number): boolean;
  addPersonalResults(eventId: number, userId: number, results: InsertPersonalResult[]): void;
  recalculatePersonalStats(userId: number): void;
  // Global leaderboard
  getGlobalSubmissions(status?: string): GlobalSubmission[];
  getGlobalSubmissionsByUser(userId: number): GlobalSubmission[];
  updateGlobalSubmissionStatus(id: number, status: string): GlobalSubmission | undefined;
  submitToGlobal(data: InsertGlobalSubmission): GlobalSubmission;
  deleteGlobalSubmission(id: number): boolean;
}

export class Storage implements IStorage {
  // Settings
  getSettings(): CompetitionSettings | undefined {
    const row = sqlite.prepare("SELECT * FROM competition_settings LIMIT 1").get() as any;
    if (!row) return undefined;
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      useGroups: !!row.use_groups,
      groups: row.groups,
      planeTypes: row.plane_types,
      judgeCategories: row.judge_categories,
      categoryWeights: row.category_weights,
      maxEntrantsPerRace: row.max_entrants_per_race,
      pointsForFirst: row.points_for_first,
      pointsForSecond: row.points_for_second,
      pointsForThird: row.points_for_third,
      pointsForFourth: row.points_for_fourth,
      pointsForFifth: row.points_for_fifth,
      pointsForOther: row.points_for_other,
      showPublicStats: row.show_public_stats,
      adminPassword: row.admin_password,
    };
  }
  updateSettings(data: Partial<CompetitionSettings>): CompetitionSettings {
    const c=this.getSettings()!; const m={...c,...data};
    sqlite.prepare(`UPDATE competition_settings SET name=?,description=?,use_groups=?,groups=?,plane_types=?,judge_categories=?,category_weights=?,max_entrants_per_race=?,points_for_first=?,points_for_second=?,points_for_third=?,points_for_fourth=?,points_for_fifth=?,points_for_other=?,show_public_stats=?,admin_password=? WHERE id=?`)
      .run(m.name,m.description,m.useGroups?1:0,m.groups,m.planeTypes,m.judgeCategories,m.categoryWeights,m.maxEntrantsPerRace,m.pointsForFirst,m.pointsForSecond,m.pointsForThird,m.pointsForFourth,m.pointsForFifth,m.pointsForOther,m.showPublicStats,m.adminPassword,c.id);
    return this.getSettings()!;
  }

  // Planes
  getPlanes(group?: string, type?: string): PlaneWithStats[] {
    let q=`SELECT p.*,ps.total_races,ps.wins,ps.podiums,ps.total_points,ps.avg_finish,ps.win_rate,ps.consistency_score,ps.best_finish,ps.rank_position,ps.last_updated FROM planes p LEFT JOIN plane_stats ps ON ps.plane_id=p.id WHERE p.active=1`;
    const params:any[]=[];
    if(group){q+=` AND p."group"=?`;params.push(group);}
    if(type){q+=` AND p.type=?`;params.push(type);}
    q+=` ORDER BY COALESCE(ps.rank_position,999),p.name`;
    return (sqlite.prepare(q).all(...params) as any[]).map(this._map);
  }
  getPlaneById(id:number): PlaneWithStats|undefined {
    const row=sqlite.prepare(`SELECT p.*,ps.total_races,ps.wins,ps.podiums,ps.total_points,ps.avg_finish,ps.win_rate,ps.consistency_score,ps.best_finish,ps.rank_position,ps.last_updated FROM planes p LEFT JOIN plane_stats ps ON ps.plane_id=p.id WHERE p.id=?`).get(id) as any;
    if(!row)return undefined; const pl=this._map(row); pl.tutorialSteps=this.getTutorialSteps(id); return pl;
  }
  getPlaneBySlug(slug:string): PlaneWithStats|undefined {
    const row=sqlite.prepare(`SELECT p.*,ps.total_races,ps.wins,ps.podiums,ps.total_points,ps.avg_finish,ps.win_rate,ps.consistency_score,ps.best_finish,ps.rank_position,ps.last_updated FROM planes p LEFT JOIN plane_stats ps ON ps.plane_id=p.id WHERE p.slug=?`).get(slug) as any;
    if(!row)return undefined; const pl=this._map(row); pl.tutorialSteps=this.getTutorialSteps(pl.id); return pl;
  }
  createPlane(data:InsertPlane): Plane {
    const r=sqlite.prepare(`INSERT INTO planes (name,slug,"group",type,creator,description,image_url,difficulty,paper_size,flying_style,throwing_tips,featured,active) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,1)`)
      .run(data.name,slugify(data.name),data.group,data.type,data.creator,data.description||"",data.imageUrl||null,data.difficulty||2,data.paperSize||"A4",data.flyingStyle||"Glide",data.throwingTips||"",data.featured?1:0);
    return sqlite.prepare("SELECT * FROM planes WHERE id=?").get(r.lastInsertRowid) as Plane;
  }
  updatePlane(id:number,data:any): Plane|undefined {
    const c=sqlite.prepare("SELECT * FROM planes WHERE id=?").get(id) as Plane|undefined;
    if(!c)return undefined; const m={...c,...data};
    sqlite.prepare(`UPDATE planes SET name=?,"group"=?,type=?,creator=?,description=?,difficulty=?,paper_size=?,flying_style=?,throwing_tips=?,featured=?,ai_summary=?,active=? WHERE id=?`)
      .run(m.name,m.group,m.type,m.creator,m.description,m.difficulty,m.paperSize,m.flyingStyle,m.throwingTips,m.featured?1:0,m.aiSummary||"",m.active?1:0,id);
    return sqlite.prepare("SELECT * FROM planes WHERE id=?").get(id) as Plane;
  }
  deletePlane(id:number): boolean { return sqlite.prepare("DELETE FROM planes WHERE id=?").run(id).changes>0; }

  // Tutorial steps — each step includes optional image_data_url
  getTutorialSteps(planeId:number): TutorialStep[] {
    return sqlite.prepare("SELECT * FROM tutorial_steps WHERE plane_id=? ORDER BY step_number").all(planeId) as TutorialStep[];
  }
  upsertTutorialSteps(planeId:number,steps:any[]): void {
    sqlite.prepare("DELETE FROM tutorial_steps WHERE plane_id=?").run(planeId);
    for(const s of steps){
      sqlite.prepare("INSERT INTO tutorial_steps (plane_id,step_number,title,instruction,tip,image_data_url,image_mime_type) VALUES (?,?,?,?,?,?,?)")
        .run(planeId,s.stepNumber,s.title,s.instruction,s.tip||null,s.imageDataUrl||null,s.imageMimeType||null);
    }
  }

  // Race Events
  getRaceEvents(): RaceEventWithResults[] { return (sqlite.prepare("SELECT * FROM race_events ORDER BY date DESC").all() as RaceEvent[]).map(e=>({...e,results:this._results(e.id)})); }
  getRaceEventById(id:number): RaceEventWithResults|undefined { const e=sqlite.prepare("SELECT * FROM race_events WHERE id=?").get(id) as RaceEvent|undefined; return e?{...e,results:this._results(id)}:undefined; }
  createRaceEvent(data:InsertRaceEvent): RaceEvent { const r=sqlite.prepare(`INSERT INTO race_events (name,date,"group",notes,completed) VALUES (?,?,?,?,?)`).run(data.name,data.date,data.group||null,data.notes||null,data.completed?1:0); return sqlite.prepare("SELECT * FROM race_events WHERE id=?").get(r.lastInsertRowid) as RaceEvent; }
  updateRaceEvent(id:number,data:any): RaceEvent|undefined { const c=sqlite.prepare("SELECT * FROM race_events WHERE id=?").get(id) as RaceEvent|undefined; if(!c)return undefined; const m={...c,...data}; sqlite.prepare(`UPDATE race_events SET name=?,date=?,"group"=?,notes=?,completed=? WHERE id=?`).run(m.name,m.date,m.group,m.notes,m.completed?1:0,id); return sqlite.prepare("SELECT * FROM race_events WHERE id=?").get(id) as RaceEvent; }
  deleteRaceEvent(id:number): boolean { return sqlite.prepare("DELETE FROM race_events WHERE id=?").run(id).changes>0; }
  addRaceResults(eventId:number,results:any[]): void { sqlite.prepare("DELETE FROM race_results WHERE race_event_id=?").run(eventId); for(const r of results) sqlite.prepare("INSERT INTO race_results (race_event_id,plane_id,finish_position,distance_score,hangtime_score,accuracy_score,style_score,notes) VALUES (?,?,?,?,?,?,?,?)").run(eventId,r.planeId,r.finishPosition,r.distanceScore??null,r.hangtimeScore??null,r.accuracyScore??null,r.styleScore??null,r.notes??null); this.recalculateStats(); }

  recalculateStats(): void {
    const s=this.getSettings();
    const pts=[s?.pointsForFirst??10,s?.pointsForSecond??7,s?.pointsForThird??5,s?.pointsForFourth??3,s?.pointsForFifth??2,s?.pointsForOther??1];
    sqlite.prepare("DELETE FROM plane_stats").run();
    for(const {id} of sqlite.prepare("SELECT id FROM planes WHERE active=1").all() as {id:number}[]){
      const res=sqlite.prepare("SELECT * FROM race_results WHERE plane_id=?").all(id) as RaceResult[];
      if(!res.length)continue;
      const pos=res.map(r=>r.finishPosition);
      const wins=pos.filter(p=>p===1).length;
      const avg=pos.reduce((a,b)=>a+b,0)/pos.length;
      const variance=pos.reduce((a,p)=>a+Math.pow(p-avg,2),0)/pos.length;
      let total=0; for(const r of res) total+=pts[Math.min(r.finishPosition-1,5)]??pts[5];
      sqlite.prepare(`INSERT INTO plane_stats (plane_id,total_races,wins,podiums,total_points,avg_finish,win_rate,consistency_score,best_finish,last_updated) VALUES (?,?,?,?,?,?,?,?,?,datetime('now'))`)
        .run(id,res.length,wins,pos.filter(p=>p<=3).length,total,avg,wins/res.length,Math.max(0,100-Math.sqrt(variance)*15),Math.min(...pos));
    }
    (sqlite.prepare("SELECT plane_id FROM plane_stats ORDER BY total_points DESC,wins DESC,avg_finish ASC").all() as {plane_id:number}[])
      .forEach((r,i)=>sqlite.prepare("UPDATE plane_stats SET rank_position=? WHERE plane_id=?").run(i+1,r.plane_id));
  }

  getLeaderboard(group?:string): PlaneWithStats[] {
    let q=`SELECT p.*,ps.total_races,ps.wins,ps.podiums,ps.total_points,ps.avg_finish,ps.win_rate,ps.consistency_score,ps.best_finish,ps.rank_position,ps.last_updated FROM planes p INNER JOIN plane_stats ps ON ps.plane_id=p.id WHERE p.active=1`;
    const params:any[]=[];
    if(group){q+=` AND p."group"=?`;params.push(group);}
    return (sqlite.prepare(q+` ORDER BY ps.rank_position ASC`).all(...params) as any[]).map(this._map);
  }

  // Community Designs
  private _mapDesign(r: any): CommunityDesign {
    return { id: r.id, designerName: r.designer_name, planeName: r.plane_name, description: r.description, difficulty: r.difficulty, paperSize: r.paper_size, imageUrl: r.image_url, tutorialSteps: r.tutorial_steps, linkedPlaneName: r.linked_plane_name, status: r.status, submittedAt: r.submitted_at, reviewNote: r.review_note };
  }
  getCommunityDesigns(status?:string): CommunityDesign[] {
    const rows = status ? sqlite.prepare("SELECT * FROM community_designs WHERE status=? ORDER BY submitted_at DESC").all(status) : sqlite.prepare("SELECT * FROM community_designs ORDER BY submitted_at DESC").all();
    return (rows as any[]).map(r => this._mapDesign(r));
  }
  getCommunityDesignById(id:number): CommunityDesign|undefined { const r = sqlite.prepare("SELECT * FROM community_designs WHERE id=?").get(id) as any; return r ? this._mapDesign(r) : undefined; }
  createCommunityDesign(data:InsertCommunityDesign): CommunityDesign {
    const steps = typeof data.steps==="string"?data.steps:JSON.stringify(data.steps||[]);
    const r=sqlite.prepare(`INSERT INTO community_designs (name,author_name,author_email,type,difficulty,paper_size,flying_style,throwing_tips,description,steps) VALUES (?,?,?,?,?,?,?,?,?,?)`)
      .run(data.name,data.authorName,data.authorEmail||null,data.type||"Glider",data.difficulty||2,data.paperSize||"A4",data.flyingStyle||"Glide",data.throwingTips||"",data.description||"",steps);
    return sqlite.prepare("SELECT * FROM community_designs WHERE id=?").get(r.lastInsertRowid) as CommunityDesign;
  }
  updateCommunityDesignStatus(id:number,status:string,note?:string): CommunityDesign|undefined { sqlite.prepare("UPDATE community_designs SET status=?,review_note=? WHERE id=?").run(status,note||null,id); const r = sqlite.prepare("SELECT * FROM community_designs WHERE id=?").get(id) as any; return r ? this._mapDesign(r) : undefined; }
  deleteCommunityDesign(id:number): boolean { return sqlite.prepare("DELETE FROM community_designs WHERE id=?").run(id).changes>0; }

  // Gallery
  private _mapGallery(r: any): GalleryItem {
    return { id: r.id, uploaderName: r.uploader_name, caption: r.caption, mediaType: r.media_type, dataUrl: r.data_url, mimeType: r.mime_type, linkedPlaneName: r.linked_plane_name, status: r.status, submittedAt: r.submitted_at, likes: r.likes };
  }
  getGalleryItems(status?:string): GalleryItem[] {
    const rows = status ? sqlite.prepare("SELECT * FROM gallery_items WHERE status=? ORDER BY submitted_at DESC").all(status) : sqlite.prepare("SELECT * FROM gallery_items ORDER BY submitted_at DESC").all();
    return (rows as any[]).map(r => this._mapGallery(r));
  }
  getGalleryItemById(id:number): GalleryItem|undefined { const r = sqlite.prepare("SELECT * FROM gallery_items WHERE id=?").get(id) as any; return r ? this._mapGallery(r) : undefined; }
  createGalleryItem(data:InsertGalleryItem): GalleryItem {
    const r=sqlite.prepare(`INSERT INTO gallery_items (uploader_name,caption,media_type,data_url,mime_type,linked_plane_id,linked_plane_name) VALUES (?,?,?,?,?,?,?)`)
      .run(data.uploaderName,data.caption||"",data.mediaType||"image",data.dataUrl,data.mimeType||"image/jpeg",data.linkedPlaneId||null,data.linkedPlaneName||null);
    return this._mapGallery(sqlite.prepare("SELECT * FROM gallery_items WHERE id=?").get(r.lastInsertRowid) as any);
  }
  updateGalleryItemStatus(id:number,status:string): GalleryItem|undefined { sqlite.prepare("UPDATE gallery_items SET status=? WHERE id=?").run(status,id); const r = sqlite.prepare("SELECT * FROM gallery_items WHERE id=?").get(id) as any; return r ? this._mapGallery(r) : undefined; }
  likeGalleryItem(id:number): GalleryItem|undefined { sqlite.prepare("UPDATE gallery_items SET likes=likes+1 WHERE id=?").run(id); const r = sqlite.prepare("SELECT * FROM gallery_items WHERE id=?").get(id) as any; return r ? this._mapGallery(r) : undefined; }
  deleteGalleryItem(id:number): boolean { return sqlite.prepare("DELETE FROM gallery_items WHERE id=?").run(id).changes>0; }

  // ── Featured Posts ─────────────────────────────────────────────────────────
  private _mapPost(r: any) {
    return { id: r.id, title: r.title, body: r.body, badge: r.badge, pinned: !!r.pinned, createdAt: r.created_at };
  }
  getFeaturedPosts() {
    return (sqlite.prepare("SELECT * FROM featured_posts ORDER BY pinned DESC, created_at DESC").all() as any[]).map(r => this._mapPost(r));
  }
  createFeaturedPost(data: { title: string; body: string; badge: string; pinned: boolean }) {
    const r = sqlite.prepare("INSERT INTO featured_posts (title,body,badge,pinned) VALUES (?,?,?,?)").run(data.title, data.body, data.badge || 'Feature', data.pinned ? 1 : 0);
    return this._mapPost(sqlite.prepare("SELECT * FROM featured_posts WHERE id=?").get(r.lastInsertRowid) as any);
  }
  updateFeaturedPost(id: number, data: { title: string; body: string; badge: string; pinned: boolean }) {
    sqlite.prepare("UPDATE featured_posts SET title=?,body=?,badge=?,pinned=? WHERE id=?").run(data.title, data.body, data.badge || 'Feature', data.pinned ? 1 : 0, id);
    return this._mapPost(sqlite.prepare("SELECT * FROM featured_posts WHERE id=?").get(id) as any);
  }
  deleteFeaturedPost(id: number) {
    return sqlite.prepare("DELETE FROM featured_posts WHERE id=?").run(id).changes > 0;
  }

  // ── User Auth ───────────────────────────────────────────────────────────────────
  private _mapUser(r: any): SafeUser {
    return { id: r.id, email: r.email, username: r.username, createdAt: r.created_at };
  }

  async registerUser(email: string, username: string, password: string): Promise<SafeUser> {
    const existing = sqlite.prepare("SELECT id FROM users WHERE email=?").get(email.toLowerCase().trim());
    if (existing) throw new Error("Email already registered");
    const hash = await bcrypt.hash(password, 10);
    const r = sqlite.prepare("INSERT INTO users (email,username,password_hash) VALUES (?,?,?)").run(email.toLowerCase().trim(), username.trim(), hash);
    return this._mapUser(sqlite.prepare("SELECT * FROM users WHERE id=?").get(r.lastInsertRowid) as any);
  }

  async loginUser(email: string, password: string): Promise<SafeUser | null> {
    const row = sqlite.prepare("SELECT * FROM users WHERE email=?").get(email.toLowerCase().trim()) as any;
    if (!row) return null;
    const ok = await bcrypt.compare(password, row.password_hash);
    if (!ok) return null;
    return this._mapUser(row);
  }

  getUserById(id: number): SafeUser | undefined {
    const r = sqlite.prepare("SELECT * FROM users WHERE id=?").get(id) as any;
    return r ? this._mapUser(r) : undefined;
  }

  getAllUsers(): SafeUser[] {
    return (sqlite.prepare("SELECT * FROM users ORDER BY created_at DESC").all() as any[]).map(r => this._mapUser(r));
  }

  async resetPassword(userId: number, newPassword: string): Promise<void> {
    const hash = await bcrypt.hash(newPassword, 10);
    sqlite.prepare("UPDATE users SET password_hash=? WHERE id=?").run(hash, userId);
    // Invalidate all sessions for this user
    sqlite.prepare("DELETE FROM auth_sessions WHERE user_id=?").run(userId);
  }

  async changePassword(userId: number, oldPassword: string, newPassword: string): Promise<boolean> {
    const row = sqlite.prepare("SELECT * FROM users WHERE id=?").get(userId) as any;
    if (!row) return false;
    const ok = await bcrypt.compare(oldPassword, row.password_hash);
    if (!ok) return false;
    const hash = await bcrypt.hash(newPassword, 10);
    sqlite.prepare("UPDATE users SET password_hash=? WHERE id=?").run(hash, userId);
    return true;
  }

  deleteUser(userId: number): void {
    sqlite.prepare("DELETE FROM auth_sessions WHERE user_id=?").run(userId);
    sqlite.prepare("DELETE FROM personal_planes WHERE user_id=?").run(userId);
    sqlite.prepare("DELETE FROM personal_events WHERE user_id=?").run(userId);
    sqlite.prepare("DELETE FROM personal_results WHERE user_id=?").run(userId);
    sqlite.prepare("DELETE FROM personal_stats WHERE user_id=?").run(userId);
    sqlite.prepare("DELETE FROM global_submissions WHERE user_id=?").run(userId);
    sqlite.prepare("DELETE FROM users WHERE id=?").run(userId);
  }

  createSession(token: string, userId: number): void {
    sqlite.prepare("INSERT OR REPLACE INTO auth_sessions (token, user_id) VALUES (?, ?)").run(token, userId);
  }

  getSessionUserId(token: string): number | null {
    const r = sqlite.prepare("SELECT user_id FROM auth_sessions WHERE token=?").get(token) as any;
    return r ? r.user_id : null;
  }

  deleteSession(token: string): void {
    sqlite.prepare("DELETE FROM auth_sessions WHERE token=?").run(token);
  }

  // ── Personal Table ──────────────────────────────────────────────────────────
  private _mapPersonalPlane(r: any): PersonalPlane {
    return { id: r.id, userId: r.user_id, name: r.name, notes: r.notes, createdAt: r.created_at };
  }
  private _mapPersonalEvent(r: any): PersonalEvent {
    return { id: r.id, userId: r.user_id, name: r.name, date: r.date, notes: r.notes, completed: !!r.completed };
  }
  private _mapPersonalStats(r: any): PersonalStats {
    return { id: r.id, userId: r.user_id, personalPlaneId: r.personal_plane_id, totalRaces: r.total_races, wins: r.wins, podiums: r.podiums, avgFinish: r.avg_finish, bestFinish: r.best_finish, totalDistanceMeters: r.total_distance_meters, bestDistanceMeters: r.best_distance_meters, bestHangtimeSeconds: r.best_hangtime_seconds, winRate: r.win_rate, lastUpdated: r.last_updated };
  }

  getPersonalPlanes(userId: number): PersonalPlaneWithStats[] {
    const planes = (sqlite.prepare("SELECT * FROM personal_planes WHERE user_id=? ORDER BY created_at").all(userId) as any[]).map(r => this._mapPersonalPlane(r));
    return planes.map(p => {
      const row = sqlite.prepare("SELECT * FROM personal_stats WHERE personal_plane_id=?").get(p.id) as any;
      return { ...p, stats: row ? this._mapPersonalStats(row) : null };
    });
  }

  createPersonalPlane(data: InsertPersonalPlane): PersonalPlane {
    const r = sqlite.prepare("INSERT INTO personal_planes (user_id,name,notes) VALUES (?,?,?)").run(data.userId, data.name, data.notes||"");
    return this._mapPersonalPlane(sqlite.prepare("SELECT * FROM personal_planes WHERE id=?").get(r.lastInsertRowid) as any);
  }

  deletePersonalPlane(id: number, userId: number): boolean {
    return sqlite.prepare("DELETE FROM personal_planes WHERE id=? AND user_id=?").run(id, userId).changes > 0;
  }

  getPersonalEvents(userId: number): PersonalEvent[] {
    return (sqlite.prepare("SELECT * FROM personal_events WHERE user_id=? ORDER BY date DESC").all(userId) as any[]).map(r => this._mapPersonalEvent(r));
  }

  createPersonalEvent(data: InsertPersonalEvent): PersonalEvent {
    const r = sqlite.prepare("INSERT INTO personal_events (user_id,name,date,notes,completed) VALUES (?,?,?,?,?)").run(data.userId, data.name, data.date, data.notes||"", data.completed?1:0);
    return this._mapPersonalEvent(sqlite.prepare("SELECT * FROM personal_events WHERE id=?").get(r.lastInsertRowid) as any);
  }

  deletePersonalEvent(id: number, userId: number): boolean {
    sqlite.prepare("DELETE FROM personal_results WHERE event_id=? AND user_id=?").run(id, userId);
    return sqlite.prepare("DELETE FROM personal_events WHERE id=? AND user_id=?").run(id, userId).changes > 0;
  }

  addPersonalResults(eventId: number, userId: number, results: InsertPersonalResult[]): void {
    sqlite.prepare("DELETE FROM personal_results WHERE event_id=? AND user_id=?").run(eventId, userId);
    for (const r of results) {
      sqlite.prepare("INSERT INTO personal_results (event_id,user_id,personal_plane_id,finish_position,distance_meters,hangtime_seconds,notes) VALUES (?,?,?,?,?,?,?)")
        .run(eventId, userId, r.personalPlaneId, r.finishPosition, r.distanceMeters??null, r.hangtimeSeconds??null, r.notes||"");
    }
    sqlite.prepare("UPDATE personal_events SET completed=1 WHERE id=? AND user_id=?").run(eventId, userId);
    this.recalculatePersonalStats(userId);
  }

  recalculatePersonalStats(userId: number): void {
    const planes = sqlite.prepare("SELECT * FROM personal_planes WHERE user_id=?").all(userId) as any[];
    for (const plane of planes) {
      const res = sqlite.prepare("SELECT * FROM personal_results WHERE personal_plane_id=? AND user_id=?").all(plane.id, userId) as any[];
      if (!res.length) { sqlite.prepare("DELETE FROM personal_stats WHERE personal_plane_id=?").run(plane.id); continue; }
      const positions = res.map((r: any) => r.finish_position);
      const wins = positions.filter((p: number) => p === 1).length;
      const podiums = positions.filter((p: number) => p <= 3).length;
      const avg = positions.reduce((a: number, b: number) => a + b, 0) / positions.length;
      const distances = res.map((r: any) => r.distance_meters).filter((d: any): d is number => d != null);
      const hangtimes = res.map((r: any) => r.hangtime_seconds).filter((h: any): h is number => h != null);
      const existing = sqlite.prepare("SELECT id FROM personal_stats WHERE personal_plane_id=?").get(plane.id) as {id:number}|undefined;
      const totalDistance = distances.reduce((a: number, b: number) => a + b, 0);
      const bestDistance = distances.length ? Math.max(...distances) : null;
      const bestHangtime = hangtimes.length ? Math.max(...hangtimes) : null;
      const bestFinish = Math.min(...positions);
      const winRate = wins / res.length;
      if (existing) {
        sqlite.prepare(`UPDATE personal_stats SET user_id=?,total_races=?,wins=?,podiums=?,avg_finish=?,best_finish=?,total_distance_meters=?,best_distance_meters=?,best_hangtime_seconds=?,win_rate=?,last_updated=datetime('now') WHERE personal_plane_id=?`)
          .run(userId, res.length, wins, podiums, avg, bestFinish, totalDistance, bestDistance, bestHangtime, winRate, plane.id);
      } else {
        sqlite.prepare(`INSERT INTO personal_stats (user_id,personal_plane_id,total_races,wins,podiums,avg_finish,best_finish,total_distance_meters,best_distance_meters,best_hangtime_seconds,win_rate) VALUES (?,?,?,?,?,?,?,?,?,?,?)`)
          .run(userId, plane.id, res.length, wins, podiums, avg, bestFinish, totalDistance, bestDistance, bestHangtime, winRate);
      }
    }
  }

  // ── Global Leaderboard ───────────────────────────────────────────────────────
  private _mapGlobal(r: any): GlobalSubmission {
    return { id: r.id, userId: r.user_id, username: r.username, planeName: r.plane_name, totalRaces: r.total_races, wins: r.wins, avgFinish: r.avg_finish, bestDistanceMeters: r.best_distance_meters, bestHangtimeSeconds: r.best_hangtime_seconds, winRate: r.win_rate, submissionType: r.submission_type ?? 'both', aiSummary: r.ai_summary ?? '', planeNotes: r.plane_notes ?? '', status: r.status ?? 'pending', submittedAt: r.submitted_at };
  }

  getGlobalSubmissions(status?: string): GlobalSubmission[] {
    const rows = status
      ? sqlite.prepare("SELECT * FROM global_submissions WHERE status=? ORDER BY wins DESC, avg_finish ASC").all(status)
      : sqlite.prepare("SELECT * FROM global_submissions ORDER BY wins DESC, avg_finish ASC").all();
    return (rows as any[]).map(r => this._mapGlobal(r));
  }

  getGlobalSubmissionsByUser(userId: number): GlobalSubmission[] {
    return (sqlite.prepare("SELECT * FROM global_submissions WHERE user_id=? ORDER BY submitted_at DESC").all(userId) as any[]).map(r => this._mapGlobal(r));
  }

  updateGlobalSubmissionStatus(id: number, status: string): GlobalSubmission | undefined {
    sqlite.prepare("UPDATE global_submissions SET status=? WHERE id=?").run(status, id);
    const r = sqlite.prepare("SELECT * FROM global_submissions WHERE id=?").get(id) as any;
    return r ? this._mapGlobal(r) : undefined;
  }

  submitToGlobal(data: InsertGlobalSubmission): GlobalSubmission {
    // Upsert: one entry per userId+planeName, reset to pending on update
    const existing = sqlite.prepare("SELECT id FROM global_submissions WHERE user_id=? AND plane_name=?").get(data.userId, data.planeName) as {id:number}|undefined;
    const st = (data as any).submissionType ?? 'both';
    const summary = (data as any).aiSummary ?? '';
    const notes = (data as any).planeNotes ?? '';
    if (existing) {
      sqlite.prepare(`UPDATE global_submissions SET username=?,total_races=?,wins=?,avg_finish=?,best_distance_meters=?,best_hangtime_seconds=?,win_rate=?,submission_type=?,ai_summary=?,plane_notes=?,status='pending',submitted_at=datetime('now') WHERE id=?`)
        .run(data.username, data.totalRaces, data.wins, data.avgFinish??null, data.bestDistanceMeters??null, data.bestHangtimeSeconds??null, data.winRate??null, st, summary, notes, existing.id);
      return this._mapGlobal(sqlite.prepare("SELECT * FROM global_submissions WHERE id=?").get(existing.id) as any);
    }
    const r = sqlite.prepare(`INSERT INTO global_submissions (user_id,username,plane_name,total_races,wins,avg_finish,best_distance_meters,best_hangtime_seconds,win_rate,submission_type,ai_summary,plane_notes) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`)
      .run(data.userId, data.username, data.planeName, data.totalRaces, data.wins, data.avgFinish??null, data.bestDistanceMeters??null, data.bestHangtimeSeconds??null, data.winRate??null, st, summary, notes);
    return this._mapGlobal(sqlite.prepare("SELECT * FROM global_submissions WHERE id=?").get(r.lastInsertRowid) as any);
  }

  deleteGlobalSubmission(id: number): boolean {
    return sqlite.prepare("DELETE FROM global_submissions WHERE id=?").run(id).changes > 0;
  }

  private _map(row:any): PlaneWithStats {
    const plane:Plane={id:row.id,name:row.name,slug:row.slug,group:row.group,type:row.type,creator:row.creator,description:row.description,imageUrl:row.image_url,difficulty:row.difficulty,paperSize:row.paper_size,flyingStyle:row.flying_style,throwingTips:row.throwing_tips,aiSummary:row.ai_summary,featured:!!row.featured,active:!!row.active,createdAt:row.created_at};
    const stats:PlaneStats|null=row.total_races!=null?{id:0,planeId:row.id,totalRaces:row.total_races,wins:row.wins,podiums:row.podiums,totalPoints:row.total_points,avgFinish:row.avg_finish,winRate:row.win_rate,consistencyScore:row.consistency_score,bestFinish:row.best_finish,rankPosition:row.rank_position,lastUpdated:row.last_updated}:null;
    return {...plane,stats};
  }
  private _results(eventId:number): RaceResultWithPlane[] {
    return (sqlite.prepare(`SELECT rr.*,p.name as pname,p.slug as pslug,p.group as pgroup,p.type as ptype FROM race_results rr JOIN planes p ON p.id=rr.plane_id WHERE rr.race_event_id=? ORDER BY rr.finish_position`).all(eventId) as any[])
      .map(r=>({id:r.id,raceEventId:r.race_event_id,planeId:r.plane_id,finishPosition:r.finish_position,distanceScore:r.distance_score,hangtimeScore:r.hangtime_score,accuracyScore:r.accuracy_score,styleScore:r.style_score,notes:r.notes,plane:{id:r.plane_id,name:r.pname,slug:r.pslug,group:r.pgroup,type:r.ptype} as Plane}));
  }
}

export const storage = new Storage();
storage.recalculateStats();
