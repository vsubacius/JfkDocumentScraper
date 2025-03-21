import {
  PdfFile, InsertPdfFile,
  DownloadJob, InsertDownloadJob,
  CompletedDownload, InsertCompletedDownload,
  Settings, InsertSettings,
  History, InsertHistory
} from "@shared/schema";

export interface IStorage {
  // PDF Files
  getPdfFiles(): Promise<PdfFile[]>;
  getPdfFile(id: number): Promise<PdfFile | undefined>;
  createPdfFile(file: InsertPdfFile): Promise<PdfFile>;
  updatePdfFile(id: number, data: Partial<PdfFile>): Promise<PdfFile | undefined>;
  deletePdfFile(id: number): Promise<boolean>;
  
  // Download Jobs
  getDownloadJobs(): Promise<DownloadJob[]>;
  getDownloadJob(id: number): Promise<DownloadJob | undefined>;
  createDownloadJob(job: InsertDownloadJob): Promise<DownloadJob>;
  updateDownloadJob(id: number, data: Partial<DownloadJob>): Promise<DownloadJob | undefined>;
  deleteDownloadJob(id: number): Promise<boolean>;
  
  // Completed Downloads
  getCompletedDownloads(): Promise<CompletedDownload[]>;
  getCompletedDownload(id: number): Promise<CompletedDownload | undefined>;
  createCompletedDownload(download: InsertCompletedDownload): Promise<CompletedDownload>;
  deleteCompletedDownload(id: number): Promise<boolean>;
  
  // Settings
  getSettings(): Promise<Settings | undefined>;
  updateSettings(data: InsertSettings): Promise<Settings>;
  
  // History
  getHistory(): Promise<History[]>;
  createHistoryEntry(entry: InsertHistory): Promise<History>;
  clearHistory(): Promise<boolean>;
}

export class MemStorage implements IStorage {
  private pdfFiles: Map<number, PdfFile>;
  private downloadJobs: Map<number, DownloadJob>;
  private completedDownloads: Map<number, CompletedDownload>;
  private settingsData: Settings | undefined;
  private historyEntries: Map<number, History>;
  
  private pdfFilesCounter: number;
  private downloadJobsCounter: number;
  private completedDownloadsCounter: number;
  private historyCounter: number;

  constructor() {
    this.pdfFiles = new Map();
    this.downloadJobs = new Map();
    this.completedDownloads = new Map();
    this.historyEntries = new Map();
    
    this.pdfFilesCounter = 1;
    this.downloadJobsCounter = 1;
    this.completedDownloadsCounter = 1;
    this.historyCounter = 1;
    
    // Initialize default settings
    this.settingsData = {
      id: 1,
      defaultUrl: "https://www.archives.gov/research/jfk/release-2025",
      defaultPdfsPerZip: 100,
      maxConcurrentDownloads: 3,
      saveDownloadHistory: true
    };
  }

  // PDF Files
  async getPdfFiles(): Promise<PdfFile[]> {
    return Array.from(this.pdfFiles.values());
  }

  async getPdfFile(id: number): Promise<PdfFile | undefined> {
    return this.pdfFiles.get(id);
  }

  async createPdfFile(file: InsertPdfFile): Promise<PdfFile> {
    const id = this.pdfFilesCounter++;
    const newFile: PdfFile = {
      ...file,
      id,
      progress: 0,
      createdAt: new Date()
    };
    this.pdfFiles.set(id, newFile);
    return newFile;
  }

  async updatePdfFile(id: number, data: Partial<PdfFile>): Promise<PdfFile | undefined> {
    const file = this.pdfFiles.get(id);
    if (!file) return undefined;
    
    const updatedFile = { ...file, ...data };
    this.pdfFiles.set(id, updatedFile);
    return updatedFile;
  }

  async deletePdfFile(id: number): Promise<boolean> {
    return this.pdfFiles.delete(id);
  }

  // Download Jobs
  async getDownloadJobs(): Promise<DownloadJob[]> {
    return Array.from(this.downloadJobs.values());
  }

  async getDownloadJob(id: number): Promise<DownloadJob | undefined> {
    return this.downloadJobs.get(id);
  }

  async createDownloadJob(job: InsertDownloadJob): Promise<DownloadJob> {
    const id = this.downloadJobsCounter++;
    const newJob: DownloadJob = {
      ...job,
      id,
      downloadedFiles: 0,
      createdAt: new Date(),
      completedAt: null
    };
    this.downloadJobs.set(id, newJob);
    return newJob;
  }

  async updateDownloadJob(id: number, data: Partial<DownloadJob>): Promise<DownloadJob | undefined> {
    const job = this.downloadJobs.get(id);
    if (!job) return undefined;
    
    const updatedJob = { ...job, ...data };
    this.downloadJobs.set(id, updatedJob);
    return updatedJob;
  }

  async deleteDownloadJob(id: number): Promise<boolean> {
    return this.downloadJobs.delete(id);
  }

  // Completed Downloads
  async getCompletedDownloads(): Promise<CompletedDownload[]> {
    return Array.from(this.completedDownloads.values());
  }

  async getCompletedDownload(id: number): Promise<CompletedDownload | undefined> {
    return this.completedDownloads.get(id);
  }

  async createCompletedDownload(download: InsertCompletedDownload): Promise<CompletedDownload> {
    const id = this.completedDownloadsCounter++;
    const newDownload: CompletedDownload = {
      ...download,
      id,
      date: new Date()
    };
    this.completedDownloads.set(id, newDownload);
    return newDownload;
  }

  async deleteCompletedDownload(id: number): Promise<boolean> {
    return this.completedDownloads.delete(id);
  }

  // Settings
  async getSettings(): Promise<Settings | undefined> {
    return this.settingsData;
  }

  async updateSettings(data: InsertSettings): Promise<Settings> {
    if (!this.settingsData) {
      this.settingsData = {
        id: 1,
        ...data
      };
    } else {
      this.settingsData = {
        ...this.settingsData,
        ...data
      };
    }
    return this.settingsData;
  }

  // History
  async getHistory(): Promise<History[]> {
    return Array.from(this.historyEntries.values());
  }

  async createHistoryEntry(entry: InsertHistory): Promise<History> {
    const id = this.historyCounter++;
    const newEntry: History = {
      ...entry,
      id,
      date: new Date()
    };
    this.historyEntries.set(id, newEntry);
    return newEntry;
  }

  async clearHistory(): Promise<boolean> {
    this.historyEntries.clear();
    return true;
  }
}

export const storage = new MemStorage();
