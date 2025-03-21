import fs from "fs";
import path from "path";
import archiver from "archiver";

class Zipper {
  /**
   * Create a zip file containing specified files
   * @param filePaths Array of file paths to include in the zip
   * @param outputPath Path where the zip file will be saved
   * @returns Promise that resolves when the zip is completed
   */
  async createZip(filePaths: string[], outputPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      // Create output stream
      const output = fs.createWriteStream(outputPath);
      
      // Create zip archive
      const archive = archiver("zip", {
        zlib: { level: 5 } // Compression level (1-9)
      });
      
      // Listen for output stream close
      output.on("close", () => {
        console.log(`Zip created: ${outputPath}, ${archive.pointer()} bytes`);
        resolve();
      });
      
      // Listen for warnings
      archive.on("warning", (err) => {
        if (err.code === "ENOENT") {
          console.warn("Zip warning:", err);
        } else {
          reject(err);
        }
      });
      
      // Listen for errors
      archive.on("error", (err) => {
        reject(err);
      });
      
      // Pipe archive to output file
      archive.pipe(output);
      
      // Add files to the archive
      for (const filePath of filePaths) {
        // Add file with its basename as name in the zip
        const filename = path.basename(filePath);
        archive.file(filePath, { name: filename });
      }
      
      // Finalize the archive
      archive.finalize();
    });
  }
}

export const zipper = new Zipper();
