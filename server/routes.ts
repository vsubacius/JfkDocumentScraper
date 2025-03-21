import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { scraper } from "./scraper";
import { downloader } from "./downloader";
import { zipper } from "./zipper";
import { z } from "zod";
import * as fs from "node:fs";
import * as fsPromises from "node:fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create downloads directory if it doesn't exist
const downloadsDir = path.join(__dirname, "../downloads");
try {
  if (!fs.existsSync(downloadsDir)) {
    fs.mkdirSync(downloadsDir, { recursive: true });
  }
} catch (err) {
  console.error("Failed to create downloads directory:", err);
}

// Validate request body schemas
const scanSchema = z.object({
  url: z.string().url()
});

const downloadSchema = z.object({
  ids: z.array(z.number()).optional(),
  rangeStart: z.number().positive().optional(),
  rangeEnd: z.number().positive().optional(),
  pdfsPerZip: z.number().positive().default(100)
});

const settingsSchema = z.object({
  defaultUrl: z.string().url(),
  defaultPdfsPerZip: z.number().positive(),
  maxConcurrentDownloads: z.number().positive(),
  saveDownloadHistory: z.boolean()
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Status endpoint
  app.get("/api/status", async (req, res) => {
    res.json("Ready to scrape");
  });

  // Scan for PDFs
  app.post("/api/scan", async (req, res) => {
    try {
      const { url } = scanSchema.parse(req.body);
      
      // Add history entry
      await storage.createHistoryEntry({
        action: "Scan initiated",
        details: `Scanning URL: ${url}`,
        filesCount: 0
      });
      
      // Start scraping process
      const pdfLinks = await scraper.scanForPdfs(url);
      
      // Store PDF links in the database
      for (const link of pdfLinks) {
        await storage.createPdfFile({
          url: link.url,
          filename: link.filename,
          size: link.size || "Unknown",
          status: "ready"
        });
      }
      
      // Update history entry
      await storage.createHistoryEntry({
        action: "Scan completed",
        details: `Found ${pdfLinks.length} PDF files at ${url}`,
        filesCount: pdfLinks.length
      });
      
      res.json({ message: "Scan completed", count: pdfLinks.length });
    } catch (error) {
      console.error("Scan error:", error);
      res.status(400).json({ message: error instanceof Error ? error.message : "Invalid request" });
    }
  });

  // Get all PDF files
  app.get("/api/pdfs", async (req, res) => {
    const pdfFiles = await storage.getPdfFiles();
    res.json(pdfFiles);
  });
  
  // Clear all PDF files
  app.delete("/api/pdfs", async (req, res) => {
    try {
      const pdfFiles = await storage.getPdfFiles();
      
      // Delete each PDF file from storage
      for (const file of pdfFiles) {
        await storage.deletePdfFile(file.id);
      }
      
      // Also clear any active download jobs
      const activeJobs = await storage.getDownloadJobs();
      for (const job of activeJobs) {
        if (job.status !== "completed" && job.status !== "failed") {
          await downloader.cancelDownload(job.id);
          await storage.deleteDownloadJob(job.id);
        }
      }
      
      // Add history entry
      await storage.createHistoryEntry({
        action: "PDF files cleared",
        details: `Cleared ${pdfFiles.length} PDF files from the system`,
        filesCount: pdfFiles.length
      });
      
      res.json({ 
        message: "All PDF files cleared",
        count: pdfFiles.length
      });
    } catch (error) {
      console.error("Error clearing PDF files:", error);
      res.status(500).json({ message: "Failed to clear PDF files" });
    }
  });

  // Start download
  app.post("/api/downloads", async (req, res) => {
    try {
      const { ids, rangeStart, rangeEnd, pdfsPerZip } = downloadSchema.parse(req.body);
      let filesToDownload = [];
      let allFiles = await storage.getPdfFiles();
      
      // Determine which files to download
      if (ids && ids.length > 0) {
        filesToDownload = allFiles.filter(file => ids.includes(file.id));
      } else if (rangeStart !== undefined && rangeEnd !== undefined) {
        // Use position-based indexing (1-based) for range instead of filenames
        // Calculate real indexes (convert to 0-based for array)
        const startIndex = Math.max(0, rangeStart - 1);
        const endIndex = Math.min(allFiles.length - 1, rangeEnd - 1);
        
        // Get files by array index
        filesToDownload = allFiles.slice(startIndex, endIndex + 1);
      } else {
        // Download all
        filesToDownload = allFiles;
      }
      
      if (filesToDownload.length === 0) {
        return res.status(400).json({ message: "No files selected for download" });
      }
      
      // Group files into batches for zipping
      const batches = [];
      for (let i = 0; i < filesToDownload.length; i += pdfsPerZip) {
        batches.push(filesToDownload.slice(i, i + pdfsPerZip));
      }
      
      // Create download jobs
      for (const [index, batch] of batches.entries()) {
        const firstFile = batch[0];
        const lastFile = batch[batch.length - 1];
        
        // Extract numbers from filenames for naming the zip
        const firstMatch = firstFile.filename.match(/(\d+)/);
        const lastMatch = lastFile.filename.match(/(\d+)/);
        const firstNum = firstMatch ? firstMatch[0] : "unknown";
        const lastNum = lastMatch ? lastMatch[0] : "unknown";
        
        const jobName = `JFK Records ${firstNum}-${lastNum}`;
        
        const job = await storage.createDownloadJob({
          name: jobName,
          totalFiles: batch.length,
          status: "queued"
        });
        
        // Start the download process
        downloader.downloadBatch(job.id, batch);
      }
      
      // Add history entry
      await storage.createHistoryEntry({
        action: "Download initiated",
        details: `Started downloading ${filesToDownload.length} files in ${batches.length} batches`,
        filesCount: filesToDownload.length
      });
      
      res.json({ 
        message: "Download started",
        totalFiles: filesToDownload.length,
        batches: batches.length
      });
    } catch (error) {
      console.error("Download error:", error);
      res.status(400).json({ message: error instanceof Error ? error.message : "Invalid request" });
    }
  });
  
  // Start organized download (by record series)
  app.post("/api/downloads/organized", async (req, res) => {
    try {
      const allFiles = await storage.getPdfFiles();
      
      if (allFiles.length === 0) {
        return res.status(400).json({ message: "No files available for download" });
      }
      
      // Group files by the first 3 digits of their document ID (record series)
      const seriesGroups = new Map<string, typeof allFiles>();
      
      for (const file of allFiles) {
        // Extract the first 3 digits from the filename (e.g., "104-10001-10001.pdf" => "104")
        const match = file.filename.match(/^(\d{3})/);
        const series = match ? match[1] : "000"; // Default to "000" if no match
        
        if (!seriesGroups.has(series)) {
          seriesGroups.set(series, []);
        }
        
        seriesGroups.get(series)?.push(file);
      }
      
      // Create a download job for each record series
      let totalFiles = 0;
      let jobCount = 0;
      
      for (const [series, files] of seriesGroups.entries()) {
        if (files.length === 0) continue;
        
        const jobName = `JFK Records Series ${series}`;
        
        const job = await storage.createDownloadJob({
          name: jobName,
          totalFiles: files.length,
          status: "queued"
        });
        
        // Start the download process
        downloader.downloadBatch(job.id, files);
        
        totalFiles += files.length;
        jobCount++;
      }
      
      // Add history entry
      await storage.createHistoryEntry({
        action: "Organized download initiated",
        details: `Started downloading ${totalFiles} files organized by ${jobCount} record series`,
        filesCount: totalFiles
      });
      
      res.json({ 
        message: "Organized download started",
        totalFiles,
        seriesCount: jobCount
      });
    } catch (error) {
      console.error("Organized download error:", error);
      res.status(400).json({ message: error instanceof Error ? error.message : "Invalid request" });
    }
  });

  // Get download progress
  app.get("/api/downloads/progress", async (req, res) => {
    try {
      const activeJobs = await storage.getDownloadJobs();
      const completedDownloads = await storage.getCompletedDownloads();
      
      // Filter only active jobs (not completed)
      const activeJobsList = activeJobs
        .filter(job => job.status !== "completed" && job.status !== "failed")
        .map(job => ({
          id: job.id.toString(),
          name: job.name,
          totalFiles: job.totalFiles,
          downloadedFiles: job.downloadedFiles,
          size: job.size,
          status: job.status
        }));
      
      // Format completed downloads
      const completedDownloadsList = completedDownloads.map(download => ({
        id: download.id.toString(),
        filename: download.filename,
        contents: download.contents,
        size: download.size,
        date: download.date.toISOString(),
        path: download.path
      }));
      
      res.json({
        active: activeJobsList,
        completed: completedDownloadsList
      });
    } catch (error) {
      console.error("Error fetching download progress:", error);
      res.status(500).json({ message: "Failed to get download progress" });
    }
  });

  // Get download status
  app.get("/api/downloads/status", async (req, res) => {
    try {
      const activeJobs = await storage.getDownloadJobs();
      
      // Count active and pending downloads
      const active = activeJobs.filter(job => job.status === "downloading").length;
      const pending = activeJobs.filter(job => job.status === "queued").length;
      
      // Get last action from history
      const history = await storage.getHistory();
      const lastAction = history.length > 0 
        ? `Last action: ${history[history.length - 1].action} at ${history[history.length - 1].date.toLocaleTimeString()}`
        : "Ready";
      
      // Calculate download speed (simplified approximation)
      const downloadSpeed = downloader.getCurrentSpeed();
      
      res.json({
        networkStatus: "Connected",
        lastAction,
        downloadSpeed,
        downloadQueue: `${active} active, ${pending} pending`
      });
    } catch (error) {
      console.error("Error fetching download status:", error);
      res.status(500).json({ message: "Failed to get download status" });
    }
  });

  // Cancel download
  app.delete("/api/downloads/:id", async (req, res) => {
    try {
      const jobId = parseInt(req.params.id);
      const job = await storage.getDownloadJob(jobId);
      
      if (!job) {
        return res.status(404).json({ message: "Download job not found" });
      }
      
      // Cancel the download
      await downloader.cancelDownload(jobId);
      
      // Update job status
      await storage.updateDownloadJob(jobId, { status: "cancelled" });
      
      // Add history entry
      await storage.createHistoryEntry({
        action: "Download cancelled",
        details: `Cancelled download job: ${job.name}`,
        filesCount: job.totalFiles
      });
      
      res.json({ message: "Download cancelled" });
    } catch (error) {
      console.error("Error cancelling download:", error);
      res.status(500).json({ message: "Failed to cancel download" });
    }
  });

  // Retry download
  app.post("/api/downloads/retry/:id", async (req, res) => {
    try {
      const jobId = parseInt(req.params.id);
      const job = await storage.getDownloadJob(jobId);
      
      if (!job) {
        return res.status(404).json({ message: "Download job not found" });
      }
      
      // Reset job status and progress
      await storage.updateDownloadJob(jobId, { 
        status: "queued",
        downloadedFiles: 0
      });
      
      // Get files and restart the download
      const allFiles = await storage.getPdfFiles();
      const filesToDownload = allFiles.filter(file => {
        // Match files that belong to this job based on the job name
        // Extract range from job name (e.g., "JFK Records 104-203")
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
        return false;
      });
      
      // Start the download process
      downloader.downloadBatch(jobId, filesToDownload);
      
      // Add history entry
      await storage.createHistoryEntry({
        action: "Download restarted",
        details: `Restarted download job: ${job.name}`,
        filesCount: filesToDownload.length
      });
      
      res.json({ message: "Download restarted" });
    } catch (error) {
      console.error("Error restarting download:", error);
      res.status(500).json({ message: "Failed to restart download" });
    }
  });

  // Export download list
  app.get("/api/downloads/export", async (req, res) => {
    try {
      const completedDownloads = await storage.getCompletedDownloads();
      
      // Format the data for export
      const exportData = {
        exportDate: new Date().toISOString(),
        totalDownloads: completedDownloads.length,
        downloads: completedDownloads
      };
      
      // Set headers for download
      res.setHeader("Content-Type", "application/json");
      res.setHeader("Content-Disposition", "attachment; filename=jfk-downloads.json");
      
      res.json(exportData);
    } catch (error) {
      console.error("Error exporting downloads:", error);
      res.status(500).json({ message: "Failed to export downloads" });
    }
  });

  // Get settings
  app.get("/api/settings", async (req, res) => {
    try {
      const settings = await storage.getSettings();
      res.json(settings);
    } catch (error) {
      console.error("Error fetching settings:", error);
      res.status(500).json({ message: "Failed to get settings" });
    }
  });

  // Update settings
  app.post("/api/settings", async (req, res) => {
    try {
      const settingsData = settingsSchema.parse(req.body);
      const updatedSettings = await storage.updateSettings(settingsData);
      
      // Add history entry
      await storage.createHistoryEntry({
        action: "Settings updated",
        details: "Application settings were updated",
        filesCount: 0
      });
      
      res.json(updatedSettings);
    } catch (error) {
      console.error("Error updating settings:", error);
      res.status(400).json({ message: error instanceof Error ? error.message : "Invalid settings data" });
    }
  });

  // Get history
  app.get("/api/history", async (req, res) => {
    try {
      const history = await storage.getHistory();
      
      // Format history entries for the frontend
      const formattedHistory = history.map(entry => ({
        id: entry.id.toString(),
        date: entry.date.toLocaleString(),
        action: entry.action,
        details: entry.details || "",
        filesCount: entry.filesCount
      }));
      
      res.json(formattedHistory.reverse()); // Most recent first
    } catch (error) {
      console.error("Error fetching history:", error);
      res.status(500).json({ message: "Failed to get history" });
    }
  });

  // Clear history
  app.delete("/api/history", async (req, res) => {
    try {
      await storage.clearHistory();
      
      // Add a new entry to record the clearing
      await storage.createHistoryEntry({
        action: "History cleared",
        details: "Download history was cleared",
        filesCount: 0
      });
      
      res.json({ message: "History cleared" });
    } catch (error) {
      console.error("Error clearing history:", error);
      res.status(500).json({ message: "Failed to clear history" });
    }
  });

  // Download a file
  app.get("/api/downloads/file/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const download = await storage.getCompletedDownload(id);
      
      if (!download) {
        return res.status(404).json({ message: "File not found" });
      }
      
      // Check if file exists
      const filePath = download.path;
      try {
        await fs.access(filePath);
      } catch {
        return res.status(404).json({ message: "File not found on disk" });
      }
      
      // Stream the file
      res.setHeader("Content-Disposition", `attachment; filename="${download.filename}"`);
      res.setHeader("Content-Type", "application/zip");
      
      const fileStream = fs.createReadStream(filePath);
      fileStream.pipe(res);
    } catch (error) {
      console.error("Error downloading file:", error);
      res.status(500).json({ message: "Failed to download file" });
    }
  });
  
  // Create zip files for each series from downloaded files
  app.post("/api/downloads/create-series-zips", async (req, res) => {
    try {
      // Get all completed PDF files
      const allFiles = await storage.getPdfFiles();
      const completedFiles = allFiles.filter(file => file.status === "completed");
      
      if (completedFiles.length === 0) {
        return res.status(400).json({ message: "No completed files to create zips from" });
      }
      
      // Group files by series (first 3 digits)
      const seriesGroups = new Map<string, typeof completedFiles>();
      
      for (const file of completedFiles) {
        // Extract the first 3 digits from the filename (e.g., "104-10001-10001.pdf" => "104")
        const match = file.filename.match(/^(\d{3})/);
        const series = match ? match[1] : "000"; // Default to "000" if no match
        
        if (!seriesGroups.has(series)) {
          seriesGroups.set(series, []);
        }
        
        seriesGroups.get(series)?.push(file);
      }
      
      // Track created zips
      const createdZips: string[] = [];
      
      // For each series, create a zip file
      for (const [series, files] of seriesGroups.entries()) {
        if (files.length === 0) continue;
        
        // Create a zip file name
        const zipFileName = `jfk-docs-series-${series}.zip`;
        const zipFilePath = path.join(path.join(__dirname, "../downloads"), zipFileName);
        
        // Find temp files for the files in this series
        const tempDir = path.join(__dirname, "../temp");
        const allTempFiles = fs.readdirSync(tempDir);
        const tempFilesForSeries: string[] = [];
        
        for (const file of files) {
          // Find any temp file that contains the original filename
          const matchingTempFiles = allTempFiles.filter(tempFile => tempFile.includes(file.filename));
          
          for (const tempFile of matchingTempFiles) {
            const fullPath = path.join(tempDir, tempFile);
            if (fs.existsSync(fullPath) && fs.statSync(fullPath).size > 0) {
              tempFilesForSeries.push(fullPath);
              break; // Use first valid match
            }
          }
        }
        
        // Only create zip if we have files
        if (tempFilesForSeries.length > 0) {
          console.log(`Creating series zip ${zipFileName} with ${tempFilesForSeries.length} files`);
          
          // Create the zip file
          await zipper.createZip(tempFilesForSeries, zipFilePath);
          
          // Calculate total size for the zip
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
          
          // Add to completed downloads
          await storage.createCompletedDownload({
            filename: zipFileName,
            contents: `${tempFilesForSeries.length} PDFs (Series ${series})`,
            size: zipSize,
            path: zipFilePath
          });
          
          createdZips.push(zipFileName);
        }
      }
      
      // Add history entry
      await storage.createHistoryEntry({
        action: "Created series zip files",
        details: `Created ${createdZips.length} series zip files: ${createdZips.join(", ")}`,
        filesCount: completedFiles.length
      });
      
      res.json({
        message: "Created series zip files",
        series: createdZips.length,
        zips: createdZips
      });
    } catch (error) {
      console.error("Error creating series zips:", error);
      res.status(500).json({ message: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
