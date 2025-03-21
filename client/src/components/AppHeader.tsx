import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import HelpModal from "./HelpModal";

const AppHeader = () => {
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const { toast } = useToast();

  const { data: status = "Ready to scrape" } = useQuery({
    queryKey: ['/api/status'],
    refetchInterval: 5000,
  });

  const showHelpModal = () => {
    setIsHelpOpen(true);
  };

  return (
    <header className="bg-primary text-white p-4 shadow-md">
      <div className="container mx-auto flex flex-col md:flex-row justify-between items-center">
        <div className="flex items-center mb-4 md:mb-0">
          <FileText className="h-8 w-8 mr-3" />
          <h1 className="text-xl font-bold">JFK Records Collection Scraper</h1>
        </div>
        <div className="flex items-center">
          <span className="bg-secondary px-3 py-1 rounded-full text-sm mr-2">
            {status}
          </span>
          <Button 
            variant="outline" 
            size="icon" 
            onClick={showHelpModal} 
            className="ml-4 bg-primary hover:bg-opacity-80 border border-white rounded p-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </Button>
        </div>
      </div>
      <HelpModal isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />
    </header>
  );
};

export default AppHeader;
