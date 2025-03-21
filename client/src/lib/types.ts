// PDF File
export interface PdfFile {
  id: number;
  url: string;
  filename: string;
  size: string;
  status: 'ready' | 'queued' | 'downloading' | 'completed' | 'failed';
  progress?: number;
}

// Download Job
export interface DownloadJob {
  id: string;
  name: string;
  totalFiles: number;
  downloadedFiles: number;
  size?: string;
  status: string;
}

// Completed Download
export interface CompletedDownload {
  id: string;
  filename: string;
  contents: string;
  size: string;
  date: string;
  path: string;
}

// Settings
export interface Settings {
  defaultUrl: string;
  defaultPdfsPerZip: number;
  maxConcurrentDownloads: number;
  saveDownloadHistory: boolean;
}

// History Entry
export interface HistoryEntry {
  id: string;
  date: string;
  action: string;
  details: string;
  filesCount: number;
}

// Status Info
export interface StatusInfo {
  networkStatus: string;
  lastAction: string;
  downloadSpeed: string;
  downloadQueue: string;
}
