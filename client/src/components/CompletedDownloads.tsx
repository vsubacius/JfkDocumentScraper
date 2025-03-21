import { DownloadCloud, FolderOpen, RotateCw, Upload } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { CompletedDownload } from "@/lib/types";

interface CompletedDownloadsProps {
  completedDownloads: CompletedDownload[];
  isLoading: boolean;
}

const CompletedDownloads = ({ completedDownloads, isLoading }: CompletedDownloadsProps) => {
  const { toast } = useToast();

  const handleExport = async () => {
    try {
      const response = await apiRequest('GET', '/api/downloads/export');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'jfk-downloads.json';
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      
      toast({
        title: "Export Successful",
        description: "Download list has been exported successfully.",
      });
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "Failed to export download list.",
        variant: "destructive",
      });
    }
  };

  const handleRetryDownload = async (id: string) => {
    try {
      await apiRequest('POST', `/api/downloads/retry/${id}`);
      toast({
        title: "Download Started",
        description: "Re-downloading files.",
      });
    } catch (error) {
      toast({
        title: "Download Failed",
        description: "Failed to restart download.",
        variant: "destructive",
      });
    }
  };

  return (
    <Card>
      <div className="flex justify-between items-center p-4 border-b border-secondary">
        <h2 className="text-lg font-bold">Completed Downloads</h2>
        <Button
          variant="ghost"
          size="sm"
          className="text-sm text-primary hover:underline flex items-center"
          onClick={handleExport}
          disabled={isLoading || completedDownloads.length === 0}
        >
          <Upload className="h-4 w-4 mr-1" />
          Export List
        </Button>
      </div>
      
      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead className="bg-background">
            <tr>
              <th className="px-4 py-2 text-left text-sm font-semibold">Zip File</th>
              <th className="px-4 py-2 text-left text-sm font-semibold">Contents</th>
              <th className="px-4 py-2 text-left text-sm font-semibold">Size</th>
              <th className="px-4 py-2 text-left text-sm font-semibold">Date</th>
              <th className="px-4 py-2 text-right text-sm font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-background">
            {isLoading ? (
              Array(3).fill(0).map((_, index) => (
                <tr key={index} className="hover:bg-background transition-colors">
                  <td className="px-4 py-2">
                    <div className="flex items-center">
                      <Skeleton className="h-5 w-5 mr-2 rounded" />
                      <Skeleton className="h-4 w-32 rounded" />
                    </div>
                  </td>
                  <td className="px-4 py-2">
                    <Skeleton className="h-4 w-24 rounded" />
                  </td>
                  <td className="px-4 py-2">
                    <Skeleton className="h-4 w-16 rounded" />
                  </td>
                  <td className="px-4 py-2">
                    <Skeleton className="h-4 w-24 rounded" />
                  </td>
                  <td className="px-4 py-2 text-right">
                    <div className="flex justify-end space-x-1">
                      <Skeleton className="h-6 w-6 rounded" />
                      <Skeleton className="h-6 w-6 rounded" />
                    </div>
                  </td>
                </tr>
              ))
            ) : completedDownloads.length > 0 ? (
              completedDownloads.map((download) => (
                <tr key={download.id} className="hover:bg-background transition-colors">
                  <td className="px-4 py-2">
                    <div className="flex items-center">
                      <DownloadCloud className="h-5 w-5 text-primary mr-2" />
                      <span className="font-mono text-sm">{download.filename}</span>
                    </div>
                  </td>
                  <td className="px-4 py-2 text-sm">{download.contents}</td>
                  <td className="px-4 py-2 text-sm">{download.size}</td>
                  <td className="px-4 py-2 text-sm">{new Date(download.date).toLocaleDateString()}</td>
                  <td className="px-4 py-2 text-right">
                    <div className="flex justify-end space-x-1">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="text-primary hover:text-opacity-80 p-1" 
                        title="Open folder"
                        onClick={() => window.open(`/api/downloads/file/${download.id}`, '_blank')}
                      >
                        <FolderOpen className="h-5 w-5" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="text-primary hover:text-opacity-80 p-1 ml-1" 
                        title="Download again"
                        onClick={() => handleRetryDownload(download.id)}
                      >
                        <RotateCw className="h-5 w-5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="py-8 text-center text-muted-foreground">
                  No completed downloads yet. Downloaded files will appear here.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
};

export default CompletedDownloads;
