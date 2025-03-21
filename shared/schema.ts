import { pgTable, text, serial, integer, boolean, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// PDF File Status Enum
export const pdfStatusEnum = pgEnum('pdf_status', [
  'ready', 'queued', 'downloading', 'completed', 'failed'
]);

// PDF Files Table
export const pdfFiles = pgTable("pdf_files", {
  id: serial("id").primaryKey(),
  url: text("url").notNull(),
  filename: text("filename").notNull(),
  size: text("size"),
  status: pdfStatusEnum("status").default('ready'),
  progress: integer("progress").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertPdfFileSchema = createInsertSchema(pdfFiles).omit({
  id: true,
  createdAt: true,
  progress: true,
});

// Download Jobs Table
export const downloadJobs = pgTable("download_jobs", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  totalFiles: integer("total_files").notNull(),
  downloadedFiles: integer("downloaded_files").default(0),
  size: text("size"),
  status: text("status").default('in progress'),
  createdAt: timestamp("created_at").defaultNow(),
  completedAt: timestamp("completed_at"),
});

export const insertDownloadJobSchema = createInsertSchema(downloadJobs).omit({
  id: true,
  downloadedFiles: true,
  createdAt: true,
  completedAt: true,
});

// Completed Downloads Table
export const completedDownloads = pgTable("completed_downloads", {
  id: serial("id").primaryKey(),
  filename: text("filename").notNull(),
  contents: text("contents").notNull(),
  size: text("size").notNull(),
  path: text("path").notNull(),
  date: timestamp("date").defaultNow(),
});

export const insertCompletedDownloadSchema = createInsertSchema(completedDownloads).omit({
  id: true,
  date: true,
});

// Settings Table
export const settings = pgTable("settings", {
  id: serial("id").primaryKey(),
  defaultUrl: text("default_url").default("https://www.archives.gov/research/jfk/release-2025"),
  defaultPdfsPerZip: integer("default_pdfs_per_zip").default(100),
  maxConcurrentDownloads: integer("max_concurrent_downloads").default(3),
  saveDownloadHistory: boolean("save_download_history").default(true),
});

export const insertSettingsSchema = createInsertSchema(settings).omit({
  id: true,
});

// History Table
export const history = pgTable("history", {
  id: serial("id").primaryKey(),
  date: timestamp("date").defaultNow(),
  action: text("action").notNull(),
  details: text("details"),
  filesCount: integer("files_count").default(0),
});

export const insertHistorySchema = createInsertSchema(history).omit({
  id: true,
  date: true,
});

// Type Definitions
export type PdfFile = typeof pdfFiles.$inferSelect;
export type InsertPdfFile = z.infer<typeof insertPdfFileSchema>;

export type DownloadJob = typeof downloadJobs.$inferSelect;
export type InsertDownloadJob = z.infer<typeof insertDownloadJobSchema>;

export type CompletedDownload = typeof completedDownloads.$inferSelect;
export type InsertCompletedDownload = z.infer<typeof insertCompletedDownloadSchema>;

export type Settings = typeof settings.$inferSelect;
export type InsertSettings = z.infer<typeof insertSettingsSchema>;

export type History = typeof history.$inferSelect;
export type InsertHistory = z.infer<typeof insertHistorySchema>;
