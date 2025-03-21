import fetch from "node-fetch";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { storage } from "./storage";
import { zipper } from "./zipper";
import { PdfFile } from "@shared/schema";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create temp directory for downloads
const tempDir = path.join(__dirname, "../temp");
fs.mkdirSync(tempDir, { recursive: true });

// Create downloads directory
const downloadsDir = path.join(__dirname, "../downloads");
fs.mkdirSync(downloadsDir, { recursive: true });

interface ActiveDownload {
  jobId: number;
  fileId: number;
  bytesDownloaded: number;
  startTime: number;
}

class Downloader {
  private maxConcurrentDownloads = 3;
  private activeDownloads: Map<number, ActiveDownload>;
  private queue: Array<{ jobId: number, file: PdfFile }>;
  private cancelledJobs: Set<number>;
  private downloadSpeeds: number[];
  
  constructor() {
    this.activeDownloads = new Map();
    this.queue = [];
    this.cancelledJobs = new Set();
    this.downloadSpeeds = []; // Store recent speeds for averaging
  }

  /**
   * Start downloading a batch of PDF files
   * @param jobId ID of the download job
   * @param files Array of PDF files to download
   */
  async downloadBatch(jobId: number, files: PdfFile[]): Promise<void> {
    // Update job status
    await storage.updateDownloadJob(jobId, { status: "in progress" });
    
    // Queue all files for download
    for (const file of files) {
      // Update file status to queued
      await storage.updatePdfFile(file.id, { status: "queued" });
      
      // Add to queue
      this.queue.push({ jobId, file });
    }
    
    // Start processing the queue
    this.processQueue();
  }

  /**
   * Process download queue
   */
  private async processQueue(): Promise<void> {
    // Check if we can start more downloads
    while (this.activeDownloads.size < this.maxConcurrentDownloads && this.queue.length > 0) {
      const nextDownload = this.queue.shift();
      if (!nextDownload) break;
      
      const { jobId, file } = nextDownload;
      
      // Check if job is cancelled
      if (this.cancelledJobs.has(jobId)) continue;
      
      // Start downloading this file
      this.downloadFile(jobId, file);
    }
  }

  /**
   * Download a single PDF file
   * @param jobId ID of the download job
   * @param file PDF file to download
   */
  private async downloadFile(jobId: number, file: PdfFile): Promise<void> {
    try {
      // Update file status
      await storage.updatePdfFile(file.id, { status: "downloading", progress: 0 });
      
      // Create a unique temp filename
      const tempFilePath = path.join(tempDir, `${Date.now()}-${file.filename}`);
      
      // Create write stream
      const fileStream = fs.createWriteStream(tempFilePath);
      
      // Track download progress
      const startTime = Date.now();
      
      // Add to active downloads
      this.activeDownloads.set(file.id, {
        jobId,
        fileId: file.id,
        bytesDownloaded: 0,
        startTime
      });
      
      // Start download with a simpler approach (no streaming)
      const response = await fetch(file.url);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      // Check if job was cancelled
      if (this.cancelledJobs.has(jobId)) {
        fileStream.close();
        fs.unlinkSync(tempFilePath);
        
        // Update file status
        await storage.updatePdfFile(file.id, { status: "ready", progress: 0 });
        
        // Remove from active downloads
        this.activeDownloads.delete(file.id);
        
        return;
      }
      
      // Get content as buffer - this is more compatible with different node-fetch versions
      const buffer = await response.buffer();
      
      // Write the entire buffer to file at once
      fileStream.write(buffer);
      fileStream.end();
      
      // Update progress to 100% since we downloaded the entire file
      const bytesDownloaded = buffer.length;
      
      // Update active download tracking
      const activeDownload = this.activeDownloads.get(file.id);
      if (activeDownload) {
        activeDownload.bytesDownloaded = bytesDownloaded;
      }
      
      // Update file progress
      await storage.updatePdfFile(file.id, { progress: 100 });
      
      // Update file status
      await storage.updatePdfFile(file.id, { status: "completed", progress: 100 });
      
      // Get file size
      const stats = fs.statSync(tempFilePath);
      const fileSizeInBytes = stats.size;
      let fileSize = "Unknown";
      
      if (fileSizeInBytes < 1024) {
        fileSize = `${fileSizeInBytes} B`;
      } else if (fileSizeInBytes < 1024 * 1024) {
        fileSize = `${(fileSizeInBytes / 1024).toFixed(1)} KB`;
      } else if (fileSizeInBytes < 1024 * 1024 * 1024) {
        fileSize = `${(fileSizeInBytes / (1024 * 1024)).toFixed(1)} MB`;
      } else {
        fileSize = `${(fileSizeInBytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
      }
      
      // Update file size if not known
      if (file.size === "Unknown") {
        await storage.updatePdfFile(file.id, { size: fileSize });
      }
      
      // Add to job's completed files
      const job = await storage.getDownloadJob(jobId);
      if (job) {
        await storage.updateDownloadJob(jobId, { 
          downloadedFiles: job.downloadedFiles + 1,
          size: job.size || "Calculating..."
        });
        
        // Check if all files in the job are downloaded
        if (job.downloadedFiles + 1 >= job.totalFiles) {
          // Job is complete, create zip file
          await this.completeJob(jobId, tempDir);
        }
      }
      
      // Remove from active downloads
      this.activeDownloads.delete(file.id);
      
      // Process next in queue
      this.processQueue();
    } catch (error) {
      console.error(`Error downloading ${file.filename}:`, error);
      
      // Update file status
      await storage.updatePdfFile(file.id, { status: "failed", progress: 0 });
      
      // Remove from active downloads
      this.activeDownloads.delete(file.id);
      
      // Process next in queue
      this.processQueue();
    }
  }

  /**
   * Complete a download job by creating a zip file
   * @param jobId ID of the download job
   * @param tempDir Directory with downloaded files
   */
  private async completeJob(jobId: number, tempDir: string): Promise<void> {
    try {
      const job = await storage.getDownloadJob(jobId);
      if (!job) {
        throw new Error(`Job ${jobId} not found`);
      }
      
      // Update job status
      await storage.updateDownloadJob(jobId, { status: "creating zip" });
      
      // Get all files for this job
      const allFiles = await storage.getPdfFiles();
      const jobFiles = allFiles.filter(file => {
        // Check if this is a series job (e.g., "JFK Records Series 104")
        const seriesMatch = job.name.match(/Series (\d+)/);
        if (seriesMatch) {
          const series = seriesMatch[1];
          // Match files from this series
          const fileSeriesMatch = file.filename.match(/^(\d{3})/);
          return fileSeriesMatch && fileSeriesMatch[1] === series;
        } else {
          // Regular job with range (e.g., "JFK Records 104-203")
          const rangeMatch = job.name.match(/(\d+)-(\d+)/);
          if (rangeMatch) {
            const startNum = parseInt(rangeMatch[1], 10);
            const endNum = parseInt(rangeMatch[2], 10);
            
            // Extract number from filename
            const fileNumMatch = file.filename.match(/(\d+)/);
            if (fileNumMatch) {
              const fileNum = parseInt(fileNumMatch[0], 10);
              return fileNum >= startNum && fileNum <= endNum;
            }
          }
        }
        return false;
      });
      
      // Get completed files
      const completedFiles = jobFiles.filter(file => file.status === "completed");
      
      // Create a zip file name
      const zipFileName = `jfk-docs-${job.name.replace(/\s+/g, "-").toLowerCase()}.zip`;
      const zipFilePath = path.join(downloadsDir, zipFileName);
      
      // Collect all temp files for this job
      const allTempFiles = fs.readdirSync(tempDir);
      const tempFiles: string[] = [];
      
      // Go through completed files and find matching temp files
      for (const file of completedFiles) {
        // Find any temp file that contains the original filename
        const matchingTempFiles = allTempFiles.filter(tempFile => tempFile.includes(file.filename));
        
        for (const tempFile of matchingTempFiles) {
          const fullPath = path.join(tempDir, tempFile);
          if (fs.existsSync(fullPath) && fs.statSync(fullPath).size > 0) {
            tempFiles.push(fullPath);
            break; // Use first valid match
          }
        }
      }
      
      console.log(`Creating zip ${zipFilePath} with ${tempFiles.length} files`);
      
      // Only create a zip if we have files
      if (tempFiles.length === 0) {
        throw new Error("No files found to include in zip");
      }
      
      // Create the zip file
      await zipper.createZip(tempFiles, zipFilePath);
      
      // Calculate total size
      const stats = fs.statSync(zipFilePath);
      const zipSizeInBytes = stats.size;
      let zipSize = "Unknown";
      
      if (zipSizeInBytes < 1024) {
        zipSize = `${zipSizeInBytes} B`;
      } else if (zipSizeInBytes < 1024 * 1024) {
        zipSize = `${(zipSizeInBytes / 1024).toFixed(1)} KB`;
      } else if (zipSizeInBytes < 1024 * 1024 * 1024) {
        zipSize = `${(zipSizeInBytes / (1024 * 1024)).toFixed(1)} MB`;
      } else {
        zipSize = `${(zipSizeInBytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
      }
      
      // Update job with completion info
      await storage.updateDownloadJob(jobId, { 
        status: "completed",
        completedAt: new Date(),
        size: zipSize
      });
      
      // Add to completed downloads
      await storage.createCompletedDownload({
        filename: zipFileName,
        contents: `${tempFiles.length} PDFs (${job.name})`,
        size: zipSize,
        path: zipFilePath
      });
      
      // Add history entry
      await storage.createHistoryEntry({
        action: "Download completed",
        details: `Completed download job: ${job.name} with ${tempFiles.length} files`,
        filesCount: tempFiles.length
      });
      
      // Don't delete temp files immediately after zipping
      // We'll keep them until user explicitly clears them
    } catch (error) {
      console.error(`Error completing job ${jobId}:`, error);
      
      // Update job status
      await storage.updateDownloadJob(jobId, { 
        status: "failed",
        completedAt: new Date()
      });
      
      // Add history entry
      await storage.createHistoryEntry({
        action: "Download failed",
        details: `Failed to complete download job ${jobId}: ${error instanceof Error ? error.message : "Unknown error"}`,
        filesCount: 0
      });
    }
  }

  /**
   * Cancel a download job
   * @param jobId ID of the job to cancel
   */
  async cancelDownload(jobId: number): Promise<void> {
    // Mark job as cancelled
    this.cancelledJobs.add(jobId);
    
    // Remove files for this job from the queue
    this.queue = this.queue.filter(item => item.jobId !== jobId);
    
    // Update job status
    await storage.updateDownloadJob(jobId, { 
      status: "cancelled",
      completedAt: new Date()
    });
    
    // Check active downloads and let them finish naturally
    // (they will detect cancellation on next chunk)
  }

  /**
   * Get current download speed
   * @returns Formatted download speed string
   */
  getCurrentSpeed(): string {
    // Calculate average speed from active downloads
    let totalSpeed = 0;
    let activeCount = 0;
    
    for (const download of this.activeDownloads.values()) {
      const elapsedSeconds = (Date.now() - download.startTime) / 1000;
      if (elapsedSeconds > 0) {
        const speedBps = download.bytesDownloaded / elapsedSeconds;
        totalSpeed += speedBps;
        activeCount++;
      }
    }
    
    if (activeCount === 0) {
      return "0 KB/s";
    }
    
    const avgSpeed = totalSpeed / activeCount;
    
    // Format speed
    if (avgSpeed < 1024) {
      return `${avgSpeed.toFixed(1)} B/s`;
    } else if (avgSpeed < 1024 * 1024) {
      return `${(avgSpeed / 1024).toFixed(1)} KB/s`;
    } else {
      return `${(avgSpeed / (1024 * 1024)).toFixed(1)} MB/s`;
    }
  }
}

export const downloader = new Downloader();
