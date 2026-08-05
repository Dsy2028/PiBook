import { useEffect, useState } from "react";
import { SECTIONS } from "../App";

// Per-section active colors — each nav item gets its own color when active
const ACTIVE_STYLES = {
  library:  " text-[#1D538B] mb-1 border-ink shadow-hard-sm",
  calibre:  "bg-cobalt  text-white border-ink shadow-hard-sm",
  news:     "bg-lime    text-ink  border-ink shadow-hard-sm",
  weather:  "bg-sky     text-ink  border-ink shadow-hard-sm",
  info:     "bg-paper   text-ink  border-ink shadow-hard-sm",
  settings: "bg-gold    text-ink  border-ink shadow-hard-sm",
  terminal: "bg-dark    text-lime border-lime shadow-hard-lime",
  logs:     "bg-danger  text-white border-ink shadow-hard-sm",
};

const JOJO_COLORS = {
    jojolion_pink: "#EB74A2",
    jojolion_navy: "#1D538B",
    jojolion_coral: "#02BBC3",
}

const GROUPS = [
  { label: "Library",  keys: ["library", "calibre"] },
  { label: "Content",  keys: ["news", "weather"] },
  { label: "System",   keys: ["navigation","info", "settings", "terminal", "logs"] },
];

export default function Sidebar({ active, onNavigate }) {
  const [battery, setBattery] = useState({ percentage: null, charging: false });

/*   useEffect(() => {
    fetchBattery();
    const interval = setInterval(fetchBattery, 60_000);
    return () => clearInterval(interval);
  }, []); */

  function fetchBattery() {
    fetch("/api/battery")
      .then((r) => r.json())
      .then((data) => setBattery(data))
      .catch(() => {});
  }

  const pct = battery.percentage ?? 0;
  const batteryColor =
    pct < 20 ? "bg-danger" : pct < 50 ? "bg-gold" : "bg-lime";

  return (
    <aside className="w-56 min-h-screen bg-dark border-r-3 border-ink
                      flex flex-col sticky top-0 h-screen overflow-y-auto shrink-0">
  
      <div className="relative overflow-hidden bg-magenta border-b-3 border-ink px-5 pt-6 pb-5 ">
        <div className="absolute -top-5 -right-5 w-20 h-20 bg-gold border-3 border-ink rotate-45 bg-[#02BBC3]" />
        <div className="absolute -bottom-4 left-2 w-12 h-12 bg-[#02BBC3] border-3 border-ink rotate-12" />

        <p className="relative z-10 text-[10px] font-bold tracking-[.22em] uppercase text-black/60 mb-0.5">
          Your Device
        </p>
        <h1 className="relative z-10 font-display text-5xl tracking-wide text-black  leading-none mt-2 mb-3">
          PiBook
        </h1>
      </div>

      <nav className={`flex-1   py-3  `}>
        {GROUPS.map((group) => (
          <div key={group.label}>
            <p className="px-4 pt-3 pb-1 text-[11px] font-bold tracking-[.2em] uppercase text-black/60">
              {group.label}
            </p>

            {group.keys.map((key) => {
              const section = SECTIONS.find((s) => s.key === key);
              const isActive = active === key;

              return (
                <button
                  key={key}
                  onClick={() => onNavigate(key)}
                  style={{ clipPath: "polygon(0 0, calc(100% - 12px) 0, 100% 50%, calc(100% - 12px) 100%, 0 100%)" }}
                  className={`
                    w-[calc(100%-16px)] mx-2 flex items-center gap-3 px-3 h-11
                    text-sm font-semibold transition-all duration-100
                    border-2
                    
                    ${isActive
                      ? "text-[#1D538B] border-[#1D538B] mb-1"
                      : "text-white border-transparent hover:bg-gold hover:text-ink hover:border-ink bg-[#1D538B]"
                    }
                  `}
                >
                  {/* <span className="text-base w-5 text-center">{NAV_ICONS[key]}</span> */}
                  <span>{section?.label}</span>
                </button>
              );
            })}

            <div className="h-px bg-white/10 mx-4 my-2" />
          </div>
        ))}
      </nav>

      <div className="border-t-3 border-ink bg-[#EB74A2] px-4 py-3">
        <p className="text-[9px] font-bold tracking-[.18em] uppercase text-white mb-1.5">
          Battery {battery.charging ? "⚡" : ""}
        </p>
        <div className="flex items-center gap-2">
          <div className="flex-1 h-2 bg-white border border-white/20">
            <div
              className={`h-full ${batteryColor} transition-all duration-500`}
              style={{ width: `${pct}%` }}
            />
          </div>
          <span className={`text-[11px] font-bold w-8 text-right ${batteryColor.replace("bg-", "text-")}`}>
            {pct > 0 ? `${pct}%` : "--"}
          </span>
        </div>
      </div>

    </aside>
  );
}