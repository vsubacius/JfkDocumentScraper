import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";

const settingsSchema = z.object({
  defaultUrl: z.string().url("Please enter a valid URL"),
  defaultPdfsPerZip: z.number().min(1).max(1000),
  maxConcurrentDownloads: z.number().min(1).max(10),
  saveDownloadHistory: z.boolean(),
});

type SettingsFormValues = z.infer<typeof settingsSchema>;

const defaultValues: SettingsFormValues = {
  defaultUrl: "https://www.archives.gov/research/jfk/release-2025",
  defaultPdfsPerZip: 100,
  maxConcurrentDownloads: 3,
  saveDownloadHistory: true,
};

const Settings = () => {
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  const form = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsSchema),
    defaultValues,
  });

  const onSubmit = async (data: SettingsFormValues) => {
    setIsSaving(true);
    try {
      await apiRequest('POST', '/api/settings', data);
      toast({
        title: "Settings saved",
        description: "Your preferences have been updated successfully.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save settings. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 mt-4">
      <h1 className="text-2xl font-bold">Settings</h1>
      
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>General Settings</CardTitle>
              <CardDescription>Configure your scraper preferences</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="defaultUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Default Target URL</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormDescription>
                      The default URL to scan for PDF documents
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="defaultPdfsPerZip"
                render={({ field: { value, onChange, ...rest } }) => (
                  <FormItem>
                    <FormLabel>Default PDFs per Zip: {value}</FormLabel>
                    <FormControl>
                      <Slider
                        defaultValue={[value]}
                        min={1}
                        max={1000}
                        step={10}
                        onValueChange={(vals) => onChange(vals[0])}
                        {...rest}
                      />
                    </FormControl>
                    <FormDescription>
                      Number of PDF files to include in each zip archive
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="maxConcurrentDownloads"
                render={({ field: { value, onChange, ...rest } }) => (
                  <FormItem>
                    <FormLabel>Max Concurrent Downloads: {value}</FormLabel>
                    <FormControl>
                      <Slider
                        defaultValue={[value]}
                        min={1}
                        max={10}
                        step={1}
                        onValueChange={(vals) => onChange(vals[0])}
                        {...rest}
                      />
                    </FormControl>
                    <FormDescription>
                      Maximum number of downloads to process simultaneously
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="saveDownloadHistory"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Save Download History</FormLabel>
                      <FormDescription>
                        Keep a record of your download activities
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </CardContent>
            <CardFooter>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? "Saving..." : "Save Settings"}
              </Button>
            </CardFooter>
          </Card>
        </form>
      </Form>
    </div>
  );
};

export default Settings;
