import { Link, useLocation } from "wouter";

const NavigationTabs = () => {
  const [location] = useLocation();

  const tabs = [
    { path: "/", label: "PDF Scraper" },
    { path: "/downloads", label: "Downloaded Files" },
    { path: "/history", label: "History" },
    { path: "/settings", label: "Settings" },
  ];

  return (
    <div className="bg-white shadow-md mb-6">
      <div className="container mx-auto">
        <nav className="flex overflow-x-auto">
          {tabs.map((tab) => (
            <Link 
              key={tab.path} 
              href={tab.path}
              className={`px-4 py-3 font-medium focus:outline-none cursor-pointer ${
                location === tab.path
                  ? "text-primary border-b-2 border-primary"
                  : "text-secondary hover:text-primary"
              }`}
            >
              {tab.label}
            </Link>
          ))}
        </nav>
      </div>
    </div>
  );
};

export default NavigationTabs;
