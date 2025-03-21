import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import DownloadPanel from "@/components/DownloadPanel";
import CompletedDownloads from "@/components/CompletedDownloads";
import { PackageIcon, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const Downloads = () => {
  const { toast } = useToast();

  // Query for download progress
  const { 
    data: downloadProgress = { active: [], completed: [] },
    isLoading: isLoadingProgress
  } = useQuery({ 
    queryKey: ['/api/downloads/progress'],
    refetchInterval: 2000
  });

  // Query for PDF files
  const { 
    data: pdfFiles = [],
    isLoading: isLoadingPdfs
  } = useQuery({ 
    queryKey: ['/api/pdfs'],
    refetchInterval: 5000
  });

  // Mutation for creating series zips
  const createSeriesZips = useMutation({
    mutationFn: async () => {
      return apiRequest("/api/downloads/create-series-zips", {
        method: "POST",
      });
    },
    onSuccess: (data) => {
      toast({
        title: "Success",
        description: `Created ${data.series} series zip files.`,
        variant: "default",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/downloads/progress'] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create series zip files.",
        variant: "destructive",
      });
    },
  });

  // Check if we have any completed PDF files
  const hasCompletedFiles = pdfFiles.some((file: any) => file.status === "completed");

  return (
    <div className="space-y-6 mt-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Downloads</h1>
        
        <Button
          onClick={() => createSeriesZips.mutate()}
          disabled={createSeriesZips.isPending || !hasCompletedFiles || isLoadingPdfs}
          variant="outline"
          className="flex items-center gap-2"
        >
          {createSeriesZips.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <PackageIcon className="h-4 w-4" />
          )}
          {createSeriesZips.isPending ? "Creating series zips..." : "Create Series ZIPs"}
        </Button>
      </div>
      
      <DownloadPanel 
        downloadProgress={downloadProgress.active}
        isLoading={isLoadingProgress}
      />
      
      <CompletedDownloads 
        completedDownloads={downloadProgress.completed}
        isLoading={isLoadingProgress}
      />
    </div>
  );
};

export default Downloads;
