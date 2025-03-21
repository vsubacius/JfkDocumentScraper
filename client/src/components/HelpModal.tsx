import { X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const HelpModal = ({ isOpen, onClose }: HelpModalProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl w-full max-h-[80vh] overflow-y-auto">
        <DialogHeader className="border-b border-secondary pb-4">
          <DialogTitle className="text-lg font-bold">Help & Instructions</DialogTitle>
          <DialogClose className="absolute right-4 top-4 text-secondary hover:text-primary">
            <X className="h-6 w-6" />
          </DialogClose>
        </DialogHeader>
        
        <div className="py-4">
          <h3 className="font-bold mb-2">Getting Started</h3>
          <p className="mb-4">This tool helps you download and organize PDF files from the JFK Records Collection website. Follow these steps:</p>
          
          <ol className="list-decimal pl-6 mb-4 space-y-2">
            <li>Enter the target URL (default is already set to the JFK Records site)</li>
            <li>Click "Scan for PDFs" to search for available PDF documents</li>
            <li>Use the PDF Range fields to specify which documents to download</li>
            <li>Set how many PDFs should be included in each zip file</li>
            <li>Select individual files or use "Download All" to begin the process</li>
          </ol>
          
          <h3 className="font-bold mb-2">Download Options</h3>
          <p className="mb-4">You can download files in several ways:</p>
          <ul className="list-disc pl-6 mb-4 space-y-2">
            <li>Individual PDFs - Click the download button next to any file</li>
            <li>Selected PDFs - Check multiple files and use "Download Selected"</li>
            <li>All PDFs - Use "Download All" to queue everything</li>
            <li>By Range - Specify a range and download those files as a batch</li>
          </ul>
          
          <h3 className="font-bold mb-2">Organization</h3>
          <p className="mb-4">Files are organized in zip archives based on your settings:</p>
          <ul className="list-disc pl-6 mb-4 space-y-2">
            <li>Each zip contains the number of PDFs you specify (default 100)</li>
            <li>Zips are named based on their content range (e.g., jfk-docs-1-100.zip)</li>
            <li>All downloads are stored in your selected download directory</li>
          </ul>
          
          <h3 className="font-bold mb-2">Troubleshooting</h3>
          <p className="mb-4">If you encounter issues:</p>
          <ul className="list-disc pl-6 mb-4 space-y-2">
            <li>Check your network connection if downloads fail</li>
            <li>Use the "Retry" button for failed downloads</li>
            <li>Reduce the PDFs per zip if you experience memory issues</li>
            <li>Check the status bar for active processes and connection info</li>
          </ul>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default HelpModal;
