import { useQuery } from "@tanstack/react-query";
import { Wifi } from "lucide-react";

const StatusBar = () => {
  const { data: statusInfo = {
    networkStatus: "Connected",
    lastAction: "Ready",
    downloadSpeed: "0 KB/s",
    downloadQueue: "0 active, 0 pending"
  } } = useQuery({
    queryKey: ['/api/downloads/status'],
    refetchInterval: 2000
  });

  return (
    <footer className="fixed bottom-0 left-0 right-0 bg-primary text-white py-2 px-4 shadow-md">
      <div className="container mx-auto flex justify-between items-center">
        <div className="flex items-center">
          <div className="flex items-center mr-4">
            <div className={`w-2 h-2 rounded-full mr-2 ${
              statusInfo.networkStatus === "Connected" 
                ? "bg-success" 
                : "bg-destructive"
            }`}></div>
            <span className="text-xs">{statusInfo.networkStatus}</span>
          </div>
          <div className="text-xs">{statusInfo.lastAction}</div>
        </div>
        <div className="flex items-center">
          <div className="text-xs mr-4">{statusInfo.downloadSpeed}</div>
          <div className="text-xs">{statusInfo.downloadQueue}</div>
        </div>
      </div>
    </footer>
  );
};

export default StatusBar;
