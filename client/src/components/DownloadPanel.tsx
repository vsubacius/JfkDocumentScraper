import { FolderArchive, X } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { DownloadJob } from "@/lib/types";

interface DownloadPanelProps {
  downloadProgress: DownloadJob[];
  isLoading: boolean;
}

const DownloadPanel = ({ downloadProgress, isLoading }: DownloadPanelProps) => {
  const { toast } = useToast();

  const handleCancel = async (jobId: string) => {
    try {
      await apiRequest('DELETE', `/api/downloads/${jobId}`);
      toast({
        title: "Download Cancelled",
        description: "The download job has been cancelled.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to cancel download.",
        variant: "destructive",
      });
    }
  };

  // Calculate overall progress
  const totalFiles = downloadProgress.reduce((total, job) => total + job.totalFiles, 0);
  const downloadedFiles = downloadProgress.reduce((total, job) => total + job.downloadedFiles, 0);
  const overallProgressPercentage = totalFiles > 0 ? Math.round((downloadedFiles / totalFiles) * 100) : 0;

  return (
    <Card className="mb-6">
      <div className="p-4">
        <h2 className="text-lg font-bold mb-4">Download Progress</h2>
        
        {isLoading ? (
          <div className="space-y-4">
            <div className="mb-4">
              <div className="flex justify-between mb-2">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-4 w-28" />
              </div>
              <Skeleton className="h-3 w-full rounded-full" />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2].map((i) => (
                <div key={i} className="border border-secondary rounded-lg p-3">
                  <div className="flex justify-between items-center mb-2">
                    <Skeleton className="h-5 w-36" />
                    <Skeleton className="h-4 w-16" />
                  </div>
                  <div className="flex justify-between mb-1">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-8" />
                  </div>
                  <Skeleton className="h-2 w-full rounded-full mb-2" />
                  <div className="flex justify-between items-center">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-4 w-12" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : downloadProgress.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No active downloads. Start a download to see progress here.
          </div>
        ) : (
          <>
            <div className="mb-4">
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium">Overall Progress</span>
                <span className="text-sm font-medium">
                  {downloadedFiles} of {totalFiles} files ({overallProgressPercentage}%)
                </span>
              </div>
              <Progress value={overallProgressPercentage} className="h-3" />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {downloadProgress.map((job) => (
                <div key={job.id} className="border border-secondary rounded-lg p-3">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="font-semibold text-sm">{job.name}</h3>
                    <span className="text-xs text-secondary">{job.size || 'Calculating...'}</span>
                  </div>
                  <div className="flex justify-between mb-1">
                    <span className="text-xs">{job.downloadedFiles} of {job.totalFiles} files</span>
                    <span className="text-xs">{Math.round((job.downloadedFiles / job.totalFiles) * 100)}%</span>
                  </div>
                  <Progress 
                    value={Math.round((job.downloadedFiles / job.totalFiles) * 100)} 
                    className="h-2 mb-2" 
                  />
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-secondary">{job.status}</span>
                    <Button 
                      variant="link" 
                      size="sm" 
                      className="text-xs p-0 h-auto text-primary hover:underline"
                      onClick={() => handleCancel(job.id)}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </Card>
  );
};

export default DownloadPanel;
