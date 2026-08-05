import { useState,useEffect } from "react";
import Sidebar from "./components/Sidebar";
import PageHeader from "./components/PageHeader";
import Toast from "./components/Toast";

import Library  from "./pages/Library";
import Calibre  from "./pages/Calibre";
import News     from "./pages/News";
import Weather  from "./pages/Weather";
import SystemInfo from "./pages/SystemInfo";
import Settings from "./pages/Settings";
import Terminal from "./pages/Terminal";
import Logs     from "./pages/Logs";
import Navigation from "./pages/Navigation";


export const SECTIONS = [
  { key: "library",  label: "E-Reader",  eyebrow: "Local Storage",   color: "#E91E8C", textLight: true  },
  { key: "calibre",  label: "Calibre Books",   eyebrow: "Network Library", color: "#1A3FE8", textLight: true  },
  { key: "news",     label: "News",      eyebrow: "Cached Articles", color: "#39FF14", textLight: false },
  { key: "weather",  label: "Weather",   eyebrow: "5-Day Forecast",  color: "#00C9FF", textLight: false },
  { key: "info",     label: "System",    eyebrow: "Hardware",        color: "#1A3FE8", textLight: true  },
  { key: "settings", label: "Settings",  eyebrow: "Configuration",   color: "#F5C400", textLight: false },
  { key: "terminal", label: "Terminal",  eyebrow: "Shell Access",    color: "#1A1A2E", textLight: true  },
  { key: "logs",     label: "Logs",      eyebrow: "Diagnostics",     color: "#FF4444", textLight: true  },
  {key: "navigation", label: "Navigation", eyebrow:"Navigate from Web", color: "#FF4444", textLight: true}
];
export const booksObj = {"1": {"identifiers": {}, "pubdate": "None", "title": "Unknown", "last_modified": "2026-07-22T00:25:09+00:00", "authors": ["Unknown"], "application_id": 1, "series": null, "user_metadata": {}, "title_sort": "Unknown", "thumbnail": "/get/thumb/1/calibre-library", "tags": [], "timestamp": "2026-07-22T00:25:09+00:00", "comments": null, "rating": 0.0, "publisher": null, "author_sort": "Unknown", "author_link_map": {"Unknown": ""}, "cover": "/get/cover/1/calibre-library", "user_categories": {}, "series_index": null, "languages": [], "author_sort_map": {"Unknown": "Unknown"}, "uuid": "9d08c3b0-789e-418f-bb8b-fd3670865f42", "format_metadata": {}, "formats": [], "main_format": null, "other_formats": {}, "category_urls": {"authors": {"Unknown": "/ajax/books_in/617574686f7273/31/calibre-library"}, "series": {}, "tags": {}, "publisher": {}, "languages": {}}}, "2": {"identifiers": {"isbn": "9781411448650"}, "pubdate": "2017-02-08T00:00:00+00:00", "title": "Wage-Labour and Capital", "last_modified": "2026-07-22T01:20:05+00:00", "authors": ["Karl Marx"], "application_id": 2, "series": null, "user_metadata": {}, "title_sort": "Wage-Labour and Capital", "thumbnail": "/get/thumb/2/calibre-library", "tags": [], "timestamp": "2026-07-22T01:20:04+00:00", "comments": null, "rating": 0.0, "publisher": "Barnes and Noble, Inc.", "author_sort": "Marx, Karl", "author_link_map": {"Karl Marx": ""}, "cover": "/get/cover/2/calibre-library", "user_categories": {}, "series_index": null, "languages": ["eng"], "author_sort_map": {"Karl Marx": "Marx, Karl"}, "uuid": "8dad879a-34ab-4060-b4cc-a36d4b9bdc5b", "format_metadata": {"epub": {"path": "/opt/calibre-library/Karl Marx/Wage-Labour and Capital (2)/Wage-Labour and Capital - Karl Marx.epub", "size": 540102, "mtime": "2026-07-22T01:20:05.108631+00:00"}}, "formats": ["epub"], "main_format": {"epub": "/get/epub/2/calibre-library"}, "other_formats": {}, "category_urls": {"authors": {"Karl Marx": "/ajax/books_in/617574686f7273/32/calibre-library"}, "series": {}, "tags": {}, "publisher": {"Barnes and Noble, Inc.": "/ajax/books_in/7075626c6973686572/31/calibre-library"}, "languages": {}}}, "3": {"identifiers": {}, "pubdate": "2014-05-21T06:00:00+00:00", "title": "Imperialism, the Highest Stage of Capitalism", "last_modified": "2026-07-22T01:20:05+00:00", "authors": ["Vladimir Ilyich Lenin"], "application_id": 3, "series": null, "user_metadata": {}, "title_sort": "Imperialism, the Highest Stage of Capitalism", "thumbnail": "/get/thumb/3/calibre-library", "tags": [], "timestamp": "2026-07-22T01:20:05+00:00", "comments": null, "rating": 0.0, "publisher": "Marxists Internet Archive", "author_sort": "Lenin, Vladimir Ilyich", "author_link_map": {"Vladimir Ilyich Lenin": ""}, "cover": "/get/cover/3/calibre-library", "user_categories": {}, "series_index": null, "languages": ["eng"], "author_sort_map": {"Vladimir Ilyich Lenin": "Lenin, Vladimir Ilyich"}, "uuid": "716636ae-2474-4425-a6dc-79793fcf0f92", "format_metadata": {"epub": {"path": "/opt/calibre-library/Vladimir Ilyich Lenin/Imperialism, the Highest Stage of Capitalism (3)/Imperialism, the Highest Stage of Capitali - Vladimir Ilyich Lenin.epub", "size": 182412, "mtime": "2026-07-22T01:20:05.249955+00:00"}}, "formats": ["epub"], "main_format": {"epub": "/get/epub/3/calibre-library"}, "other_formats": {}, "category_urls": {"authors": {"Vladimir Ilyich Lenin": "/ajax/books_in/617574686f7273/33/calibre-library"}, "series": {}, "tags": {}, "publisher": {"Marxists Internet Archive": "/ajax/books_in/7075626c6973686572/32/calibre-library"}, "languages": {}}}, "4": {"identifiers": {"uri": "tRjgtqFnT"}, "pubdate": "None", "title": "The Principles of Communism", "last_modified": "2026-07-22T01:20:05+00:00", "authors": ["Frederick Engels"], "application_id": 4, "series": null, "user_metadata": {}, "title_sort": "Principles of Communism, The", "thumbnail": "/get/thumb/4/calibre-library", "tags": ["Unknown"], "timestamp": "2026-07-22T01:20:05+00:00", "comments": null, "rating": 0.0, "publisher": null, "author_sort": "Engels, Frederick", "author_link_map": {"Frederick Engels": ""}, "cover": "/get/cover/4/calibre-library", "user_categories": {}, "series_index": null, "languages": ["eng"], "author_sort_map": {"Frederick Engels": "Engels, Frederick"}, "uuid": "8def23e7-d62e-4f7a-884f-d48228540208", "format_metadata": {"epub": {"path": "/opt/calibre-library/Frederick Engels/The Principles of Communism (4)/The Principles of Communism - Frederick Engels.epub", "size": 195153, "mtime": "2026-07-22T01:20:05.403563+00:00"}}, "formats": ["epub"], "main_format": {"epub": "/get/epub/4/calibre-library"}, "other_formats": {}, "category_urls": {"authors": {"Frederick Engels": "/ajax/books_in/617574686f7273/34/calibre-library"}, "series": {}, "tags": {"Unknown": "/ajax/books_in/74616773/31/calibre-library"}, "publisher": {}, "languages": {}}}, "5": {"identifiers": {}, "pubdate": "2013-11-13T00:00:00+00:00", "title": "Fascism: What it is and how to fight it (1944)", "last_modified": "2026-07-22T01:20:05+00:00", "authors": ["Trotsky, Leon"], "application_id": 5, "series": null, "user_metadata": {}, "title_sort": "Fascism: What it is and how to fight it (1944)", "thumbnail": "/get/thumb/5/calibre-library", "tags": [], "timestamp": "2026-07-22T01:20:05+00:00", "comments": null, "rating": 0.0, "publisher": "Marxists Internet Archive", "author_sort": "Trotsky, Leon", "author_link_map": {"Trotsky, Leon": ""}, "cover": "/get/cover/5/calibre-library", "user_categories": {}, "series_index": null, "languages": ["eng"], "author_sort_map": {"Trotsky, Leon": "Trotsky, Leon"}, "uuid": "471381d2-ae01-4e74-9de5-061950938759", "format_metadata": {"epub": {"path": "/opt/calibre-library/Trotsky, Leon/Fascism_ What it is and how to fight it (1944) (5)/Fascism_ What it is and how to fight it (1 - Trotsky, Leon.epub", "size": 624935, "mtime": "2026-07-22T01:20:05.526521+00:00"}}, "formats": ["epub"], "main_format": {"epub": "/get/epub/5/calibre-library"}, "other_formats": {}, "category_urls": {"authors": {"Trotsky, Leon": "/ajax/books_in/617574686f7273/35/calibre-library"}, "series": {}, "tags": {}, "publisher": {"Marxists Internet Archive": "/ajax/books_in/7075626c6973686572/32/calibre-library"}, "languages": {}}}}


const PAGE_COMPONENTS = {
  library:  Library,
  calibre:  Calibre,
  news:     News,
  weather:  Weather,
  navigation:Navigation,
  info:     SystemInfo,
  settings: Settings,
  terminal: Terminal,
  logs:     Logs,
  
};
export let  isPiOnline = false;

export default function App() {
  const [activeSection, setActiveSection] = useState("library");

  const activeMeta = SECTIONS.find((s) => s.key === activeSection);
  const ActivePage = PAGE_COMPONENTS[activeSection];

  return (
    <div className="flex min-h-screen bg-paper overflow-x-hidden">

      <Sidebar active={activeSection} onNavigate={setActiveSection} />
      <main className="flex-1 min-h-screen overflow-y-auto">
        <PageHeader
          title={activeMeta?.label}
          eyebrow={activeMeta?.eyebrow}
          accentColor={activeMeta?.color}
          lightText={activeMeta?.textLight}
        />

        <div className="p-9">
          {ActivePage && <ActivePage />}
        </div>

      </main>

      <Toast />

    </div>
  );
}