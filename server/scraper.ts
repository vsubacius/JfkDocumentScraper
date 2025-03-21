import fetch from "node-fetch";
import * as cheerio from "cheerio";
import path from "path";

interface PdfLink {
  url: string;
  filename: string;
  size?: string;
}

class Scraper {
  constructor() {}

  /**
   * Scan a webpage for PDF links
   * @param url URL to scan for PDF links
   * @returns Array of found PDF links with metadata
   */
  async scanForPdfs(url: string): Promise<PdfLink[]> {
    try {
      console.log(`Scanning ${url} for PDF links...`);
      
      // Fetch the webpage content
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch page: ${response.statusText}`);
      }
      
      const htmlContent = await response.text();
      
      // Parse HTML content
      const $ = cheerio.load(htmlContent);
      const pdfLinks: PdfLink[] = [];
      
      // Find all links that point to PDF files
      $("a").each((_, element) => {
        const href = $(element).attr("href");
        if (!href) return;
        
        // Check if the link is a PDF (either by extension or content type)
        if (href.toLowerCase().endsWith(".pdf") || href.toLowerCase().includes(".pdf?")) {
          // Resolve relative URLs
          const absoluteUrl = new URL(href, url).toString();
          
          // Extract filename from URL
          let filename = path.basename(new URL(absoluteUrl).pathname);
          if (!filename.toLowerCase().endsWith(".pdf")) {
            filename += ".pdf";
          }
          
          // Try to find file size if available in nearby text
          const parentText = $(element).parent().text().trim();
          const sizeMatch = parentText.match(/(\d+(?:\.\d+)?\s*(?:KB|MB|GB))/i);
          const size = sizeMatch ? sizeMatch[1] : undefined;
          
          pdfLinks.push({
            url: absoluteUrl,
            filename,
            size
          });
        }
      });
      
      console.log(`Found ${pdfLinks.length} PDF links on ${url}`);
      return pdfLinks;
    } catch (error) {
      console.error("Error scanning for PDFs:", error);
      throw new Error(`Failed to scan for PDFs: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  /**
   * Get the size of a file from headers
   * @param url URL to check
   * @returns Size string in human-readable format
   */
  async getFileSize(url: string): Promise<string> {
    try {
      const response = await fetch(url, { method: "HEAD" });
      if (!response.ok) {
        return "Unknown";
      }
      
      const contentLength = response.headers.get("content-length");
      if (!contentLength) {
        return "Unknown";
      }
      
      const bytes = parseInt(contentLength, 10);
      
      // Format size in human-readable format
      if (bytes < 1024) {
        return `${bytes} B`;
      } else if (bytes < 1024 * 1024) {
        return `${(bytes / 1024).toFixed(1)} KB`;
      } else if (bytes < 1024 * 1024 * 1024) {
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
      } else {
        return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
      }
    } catch (error) {
      console.error("Error getting file size:", error);
      return "Unknown";
    }
  }
}

export const scraper = new Scraper();
