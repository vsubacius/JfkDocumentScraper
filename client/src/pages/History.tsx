import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";

const History = () => {
  const { toast } = useToast();
  
  const { data: history = [], isLoading } = useQuery({
    queryKey: ['/api/history'],
  });

  const clearHistoryHandler = async () => {
    try {
      await apiRequest('DELETE', '/api/history');
      toast({
        title: "History cleared",
        description: "Your download history has been cleared successfully.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to clear history. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6 mt-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Download History</h1>
        <Button
          variant="outline"
          onClick={clearHistoryHandler}
          disabled={isLoading || history.length === 0}
        >
          Clear History
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-1/3" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-2/3" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : history.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center">
            <p className="text-muted-foreground">No download history available.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {history.map((entry) => (
            <Card key={entry.id}>
              <CardHeader>
                <CardTitle>{entry.date}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="mb-2">
                  <span className="font-medium">Action:</span> {entry.action}
                </p>
                <p className="text-sm text-muted-foreground">{entry.details}</p>
              </CardContent>
              <CardFooter className="text-sm text-muted-foreground">
                {entry.filesCount} files processed
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default History;
