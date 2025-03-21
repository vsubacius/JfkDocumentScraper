import { useState } from "react";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Search, Download, Check } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const scrapeSchema = z.object({
  targetUrl: z.string().url("Please enter a valid URL"),
  rangeStart: z.number().optional(),
  rangeEnd: z.number().optional(),
  pdfsPerZip: z.number().min(1, "Must download at least 1 PDF per zip").default(100),
});

type ScrapeFormValues = z.infer<typeof scrapeSchema>;

interface ScrapeControlsProps {
  onScan: (targetUrl: string) => void;
  onDownloadAll: (pdfsPerZip: number) => void;
  onDownloadSelected: (ids: number[], pdfsPerZip: number) => void;
  onDownloadRange: (rangeStart: number, rangeEnd: number, pdfsPerZip: number) => void;
  isScanning: boolean;
}

const ScrapeControls = ({
  onScan,
  onDownloadAll,
  onDownloadSelected,
  onDownloadRange,
  isScanning,
}: ScrapeControlsProps) => {
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  const form = useForm<ScrapeFormValues>({
    resolver: zodResolver(scrapeSchema),
    defaultValues: {
      targetUrl: "https://www.archives.gov/research/jfk/release-2025",
      pdfsPerZip: 100,
    },
  });

  const handleScan = (values: ScrapeFormValues) => {
    onScan(values.targetUrl);
  };

  const handleDownloadAll = () => {
    onDownloadAll(form.getValues().pdfsPerZip);
  };

  const handleDownloadSelected = () => {
    if (selectedIds.length > 0) {
      onDownloadSelected(selectedIds, form.getValues().pdfsPerZip);
    }
  };

  const handleDownloadRange = () => {
    const { rangeStart, rangeEnd, pdfsPerZip } = form.getValues();
    if (rangeStart && rangeEnd && rangeStart <= rangeEnd) {
      onDownloadRange(rangeStart, rangeEnd, pdfsPerZip);
    }
  };

  return (
    <Card className="mb-6">
      <CardContent className="pt-6">
        <h2 className="text-lg font-bold mb-4">Scrape PDF Links</h2>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleScan)} className="space-y-4">
            <div className="flex flex-col md:flex-row md:items-end gap-4 mb-4">
              <FormField
                control={form.control}
                name="targetUrl"
                render={({ field }) => (
                  <FormItem className="flex-grow">
                    <FormLabel>Target URL</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        className="w-full p-2 border border-secondary rounded font-mono text-sm"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button 
                type="submit" 
                className="bg-primary text-white py-2 px-4 rounded hover:bg-opacity-90 flex items-center justify-center"
                disabled={isScanning}
              >
                <Search className="h-5 w-5 mr-2" />
                {isScanning ? "Scanning..." : "Scan for PDFs"}
              </Button>
            </div>
            
            <div className="flex flex-col md:flex-row gap-4 mb-4">
              <div className="flex-grow">
                <FormLabel>PDF Range</FormLabel>
                <div className="flex items-center">
                  <FormField
                    control={form.control}
                    name="rangeStart"
                    render={({ field }) => (
                      <FormItem className="w-full">
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="Start"
                            min={1}
                            className="w-full p-2 border border-secondary rounded-l"
                            {...field}
                            onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <span className="px-2 bg-secondary text-white">to</span>
                  <FormField
                    control={form.control}
                    name="rangeEnd"
                    render={({ field }) => (
                      <FormItem className="w-full">
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="End"
                            min={1}
                            className="w-full p-2 border border-secondary rounded-r"
                            {...field}
                            onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
              <FormField
                control={form.control}
                name="pdfsPerZip"
                render={({ field }) => (
                  <FormItem className="md:w-1/3">
                    <FormLabel>PDFs per Zip</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="100"
                        min={1}
                        className="w-full p-2 border border-secondary rounded"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <div className="flex items-center justify-end space-x-3">
              <Button
                type="button"
                onClick={handleDownloadAll}
                className="bg-success hover:bg-opacity-90 text-white px-4 py-2 rounded flex items-center"
              >
                <Download className="h-5 w-5 mr-2" />
                Download All
              </Button>
              <Button
                type="button"
                onClick={handleDownloadSelected}
                className="bg-primary hover:bg-opacity-90 text-white px-4 py-2 rounded flex items-center"
              >
                <Check className="h-5 w-5 mr-2" />
                Download Selected
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};

export default ScrapeControls;
