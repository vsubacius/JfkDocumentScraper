import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import Scanner from "@/pages/Scanner";
import Downloads from "@/pages/Downloads";
import History from "@/pages/History";
import Settings from "@/pages/Settings";
import AppHeader from "@/components/AppHeader";
import NavigationTabs from "@/components/NavigationTabs";
import StatusBar from "@/components/StatusBar";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Scanner} />
      <Route path="/downloads" component={Downloads} />
      <Route path="/history" component={History} />
      <Route path="/settings" component={Settings} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <div className="flex flex-col min-h-screen">
        <AppHeader />
        <NavigationTabs />
        <main className="container mx-auto px-4 pb-24 flex-grow">
          <Router />
        </main>
        <StatusBar />
      </div>
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;
