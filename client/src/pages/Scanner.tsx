import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import ScrapeControls from "@/components/ScrapeControls";
import ResultsPanel from "@/components/ResultsPanel";
import DownloadPanel from "@/components/DownloadPanel";
import CompletedDownloads from "@/components/CompletedDownloads";
import HelpModal from "@/components/HelpModal";
import { PdfFile, DownloadJob, CompletedDownload } from "@/lib/types";

const Scanner = () => {
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const { toast } = useToast();

  // Query for PDF files
  const { 
    data: pdfFiles = [] as PdfFile[],
    isLoading: isLoadingPdfs,
    refetch: refetchPdfs
  } = useQuery<PdfFile[]>({ 
    queryKey: ['/api/pdfs'],
    refetchOnWindowFocus: true
  });

  // Query for download progress
  const { 
    data: downloadProgress = { active: [] as DownloadJob[], completed: [] as CompletedDownload[] },
    isLoading: isLoadingProgress,
    refetch: refetchProgress
  } = useQuery<{ active: DownloadJob[], completed: CompletedDownload[] }>({ 
    queryKey: ['/api/downloads/progress'],
    refetchInterval: 2000
  });

  // Mutation to start PDF scan
  const scanMutation = useMutation({
    mutationFn: async (url: string) => {
      const response = await apiRequest('POST', '/api/scan', { url });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Scan completed",
        description: "PDF links have been successfully scanned.",
        variant: "default",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/pdfs'] });
      refetchPdfs(); // Explicitly refetch PDF files
    },
    onError: (error) => {
      toast({
        title: "Scan failed",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Mutation to download selected PDFs
  const downloadMutation = useMutation({
    mutationFn: async ({ ids, rangeStart, rangeEnd, pdfsPerZip }: { ids?: number[], rangeStart?: number, rangeEnd?: number, pdfsPerZip: number }) => {
      const response = await apiRequest('POST', '/api/downloads', { ids, rangeStart, rangeEnd, pdfsPerZip });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Download started",
        description: "Your download has been queued.",
        variant: "default",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/downloads/progress'] });
    },
    onError: (error) => {
      toast({
        title: "Download failed",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Handler for scanning PDFs
  const handleScan = async (targetUrl: string) => {
    scanMutation.mutate(targetUrl);
  };

  // Handler for downloading all PDFs
  const handleDownloadAll = (pdfsPerZip: number) => {
    downloadMutation.mutate({ pdfsPerZip });
  };

  // Handler for downloading selected PDFs
  const handleDownloadSelected = (ids: number[], pdfsPerZip: number) => {
    downloadMutation.mutate({ ids, pdfsPerZip });
  };

  // Handler for downloading PDF range
  const handleDownloadRange = (rangeStart: number, rangeEnd: number, pdfsPerZip: number) => {
    downloadMutation.mutate({ rangeStart, rangeEnd, pdfsPerZip });
  };

  return (
    <>
      <ScrapeControls 
        onScan={handleScan} 
        onDownloadAll={handleDownloadAll}
        onDownloadSelected={handleDownloadSelected}
        onDownloadRange={handleDownloadRange}
        isScanning={scanMutation.isPending}
      />
      
      <ResultsPanel 
        pdfFiles={pdfFiles} 
        isLoading={isLoadingPdfs}
        onRefresh={() => refetchPdfs()}
        onDownload={(ids) => downloadMutation.mutate({ ids, pdfsPerZip: 100 })}
      />
      
      <DownloadPanel 
        downloadProgress={downloadProgress.active}
        isLoading={isLoadingProgress}
      />
      
      <CompletedDownloads 
        completedDownloads={downloadProgress.completed}
        isLoading={isLoadingProgress}
      />
      
      <HelpModal isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />
    </>
  );
};

export default Scanner;
