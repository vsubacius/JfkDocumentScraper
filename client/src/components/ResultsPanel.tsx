import { useState } from "react";
import { FileText, RefreshCw, Filter, Download, X, RotateCw } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { PdfFile } from "@/lib/types";

interface ResultsPanelProps {
  pdfFiles: PdfFile[];
  isLoading: boolean;
  onRefresh: () => void;
  onDownload: (ids: number[]) => void;
}

const ResultsPanel = ({ pdfFiles, isLoading, onRefresh, onDownload }: ResultsPanelProps) => {
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(pdfFiles.map(file => file.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectItem = (id: number, checked: boolean) => {
    if (checked) {
      setSelectedIds([...selectedIds, id]);
    } else {
      setSelectedIds(selectedIds.filter(itemId => itemId !== id));
    }
  };

  const handleSingleDownload = (id: number) => {
    onDownload([id]);
  };

  // Calculate pagination
  const totalPages = Math.ceil(pdfFiles.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const visiblePdfFiles = pdfFiles.slice(startIndex, startIndex + itemsPerPage);

  return (
    <Card className="mb-6">
      <div className="p-4 border-b border-secondary">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-bold">Found PDFs</h2>
          <div className="flex items-center">
            <span className="mr-2 text-sm">{pdfFiles.length} PDFs found</span>
            <div className="flex items-center">
              <Button 
                variant="ghost" 
                size="icon" 
                className="p-1 text-secondary hover:text-primary" 
                title="Refresh list"
                onClick={onRefresh}
              >
                <RefreshCw className="h-5 w-5" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                className="p-1 text-secondary hover:text-primary ml-2" 
                title="Filter"
              >
                <Filter className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </div>
      
      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead className="bg-background">
            <tr>
              <th className="px-4 py-2 text-left">
                <div className="flex items-center">
                  <Checkbox 
                    id="select-all" 
                    onCheckedChange={(checked) => handleSelectAll(!!checked)}
                    checked={selectedIds.length === pdfFiles.length && pdfFiles.length > 0}
                  />
                  <Label htmlFor="select-all" className="ml-2 text-sm font-semibold">
                    Select All
                  </Label>
                </div>
              </th>
              <th className="px-4 py-2 text-left text-sm font-semibold">File Name</th>
              <th className="px-4 py-2 text-left text-sm font-semibold">Size</th>
              <th className="px-4 py-2 text-left text-sm font-semibold">Status</th>
              <th className="px-4 py-2 text-right text-sm font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-background">
            {isLoading ? (
              Array(5).fill(0).map((_, index) => (
                <tr key={index} className="hover:bg-background transition-colors">
                  <td className="px-4 py-2">
                    <Skeleton className="h-4 w-4 rounded" />
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex items-center">
                      <Skeleton className="h-5 w-5 mr-2 rounded" />
                      <Skeleton className="h-4 w-48 rounded" />
                    </div>
                  </td>
                  <td className="px-4 py-2">
                    <Skeleton className="h-4 w-16 rounded" />
                  </td>
                  <td className="px-4 py-2">
                    <Skeleton className="h-6 w-20 rounded-full" />
                  </td>
                  <td className="px-4 py-2 text-right">
                    <Skeleton className="h-6 w-6 rounded ml-auto" />
                  </td>
                </tr>
              ))
            ) : visiblePdfFiles.length > 0 ? (
              visiblePdfFiles.map((file) => (
                <tr key={file.id} className="hover:bg-background transition-colors">
                  <td className="px-4 py-2">
                    <Checkbox 
                      checked={selectedIds.includes(file.id)}
                      onCheckedChange={(checked) => handleSelectItem(file.id, !!checked)}
                    />
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex items-center">
                      <FileText className="h-5 w-5 text-warning mr-2" />
                      <span className="font-mono text-sm">{file.filename}</span>
                    </div>
                  </td>
                  <td className="px-4 py-2 text-sm">{file.size}</td>
                  <td className="px-4 py-2">
                    {file.status === 'downloading' ? (
                      <div className="flex items-center">
                        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-warning bg-opacity-20 text-warning mr-2">
                          Downloading
                        </span>
                        <div className="w-16 bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-warning h-2 rounded-full" 
                            style={{ width: `${file.progress || 0}%` }}
                          ></div>
                        </div>
                      </div>
                    ) : (
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                        file.status === 'ready' ? 'bg-success bg-opacity-20 text-success' :
                        file.status === 'queued' ? 'bg-secondary bg-opacity-20 text-secondary' :
                        file.status === 'failed' ? 'bg-red-500 bg-opacity-20 text-red-500' :
                        'bg-secondary bg-opacity-20 text-secondary'
                      }`}>
                        {file.status === 'ready' ? 'Ready' :
                         file.status === 'queued' ? 'Queued' :
                         file.status === 'failed' ? 'Failed' :
                         file.status}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-right">
                    {file.status === 'downloading' ? (
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="text-secondary hover:text-primary p-1" 
                        title="Cancel"
                      >
                        <X className="h-5 w-5" />
                      </Button>
                    ) : file.status === 'failed' ? (
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="text-primary hover:text-opacity-80 p-1" 
                        title="Retry"
                        onClick={() => handleSingleDownload(file.id)}
                      >
                        <RotateCw className="h-5 w-5" />
                      </Button>
                    ) : (
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="text-primary hover:text-opacity-80 p-1" 
                        title="Download"
                        onClick={() => handleSingleDownload(file.id)}
                      >
                        <Download className="h-5 w-5" />
                      </Button>
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                  No PDF files found. Click "Scan for PDFs" to begin.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      
      {pdfFiles.length > 0 && (
        <div className="p-4 border-t border-secondary flex justify-between items-center">
          <div className="text-sm">
            Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, pdfFiles.length)} of {pdfFiles.length} PDFs
          </div>
          <div className="flex space-x-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(page => Math.max(page - 1, 1))}
              disabled={currentPage === 1}
            >
              Previous
            </Button>
            
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNumber = currentPage;
              if (totalPages <= 5) {
                pageNumber = i + 1;
              } else if (currentPage <= 3) {
                pageNumber = i + 1;
              } else if (currentPage >= totalPages - 2) {
                pageNumber = totalPages - 4 + i;
              } else {
                pageNumber = currentPage - 2 + i;
              }
              
              return (
                <Button
                  key={pageNumber}
                  variant={currentPage === pageNumber ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCurrentPage(pageNumber)}
                >
                  {pageNumber}
                </Button>
              );
            })}
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(page => Math.min(page + 1, totalPages))}
              disabled={currentPage === totalPages || totalPages === 0}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
};

export default ResultsPanel;
