import { useQuery } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import DownloadPanel from "@/components/DownloadPanel";
import CompletedDownloads from "@/components/CompletedDownloads";

const Downloads = () => {
  // Query for download progress
  const { 
    data: downloadProgress = { active: [], completed: [] },
    isLoading: isLoadingProgress
  } = useQuery({ 
    queryKey: ['/api/downloads/progress'],
    refetchInterval: 2000
  });

  return (
    <div className="space-y-6 mt-4">
      <h1 className="text-2xl font-bold">Downloads</h1>
      
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
