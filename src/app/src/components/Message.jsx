// Message component — displays inline warnings, success, and error states
// Usage:
//   <Message type="success" message="Book downloaded!" />
//   <Message type="error"   message="Connection failed." />
//   <Message type="warn"    message="Calibre unreachable, using cache." />
//   <Message type="info"    message="Online mode active." />
//
// With a title:
//   <Message type="error" title="Download Failed" message="Could not reach Calibre." />
//
// Dismissible:
//   <Message type="success" message="Saved!" dismissible />
//
// As a banner (full width, no shadow):
//   <Message type="warn" message="Offline mode." banner />

import { useState } from "react";

const VARIANTS = {
  success: {
    bg:     "bg-lime-500",
    text:   "text-ink",
    border: "border-ink",
    accent: "bg-ink",
    icon:   "✓",
    label:  "Success",
  },
  error: {
    bg:     "bg-red-500",
    text:   "text-white",
    border: "border-ink",
    accent: "bg-white",
    icon:   "✕",
    label:  "Error",
  },
  warn: {
    bg:     "bg-gold-500",
    text:   "text-ink",
    border: "border-ink",
    accent: "bg-ink",
    icon:   "!",
    label:  "Warning",
  },
  info: {
    bg:     "bg-cobalt-500",
    text:   "text-white",
    border: "border-ink",
    accent: "bg-white",
    icon:   "i",
    label:  "Info",
  },
};

export default function Message({
  type        = "info",
  title,
  message,
  dismissible = false,
  banner      = false,
  className   = "",
  setMessage
}) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed || !message){ 
    setMessage(null);    
    return null;
}

  const v = VARIANTS[type] ?? VARIANTS.info;
  console.log(type,message,dismissible)

  return (
    <div
      className={`
        relative flex items-start gap-4
        ${v.bg} ${v.text} ${v.border}
        border-2
        
        ${banner ? "w-full" : "shadow-hard-sm"}
        px-4 py-3
        ${className}
      `}
    >
      {/* Icon badge */}
      <div
        className={`
          shrink-0 w-7 h-7
          ${v.accent} ${v.text === "text-white" ? "text-ink" : "text-white"}
          border-2 border-current
          flex items-center justify-center
          font-black text-sm
          rotate-0
        `}
        style={{ clipPath: "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)" }}
      >
        {v.icon}
      </div>

      {/* Text content */}
      <div className="flex-1 min-w-0">
        {/* Title — uses provided title or falls back to type label */}
        <p className="font-display text-lg leading-none tracking-wide mb-0.5">
          {title ?? v.label}
        </p>
        <p className="text-sm font-medium leading-snug opacity-90">
          {message}
        </p>
      </div>

      {/* Dismiss button */}
      {dismissible && (
        <button
          onClick={() => setDismissed(true)}
          className={`
            shrink-0 w-6 h-6 flex items-center justify-center
            font-black text-xs border-2 border-current
            hover:opacity-70 transition-opacity
          `}
        >
          ✕
        </button>
      )}

      {/* JoJo corner accent — bottom right decorative diamond */}
      <div
        className={`
          absolute bottom-1.5 right-1.5 w-2 h-2
          ${v.accent} border border-current opacity-40
        `}
        style={{ transform: "rotate(45deg)" }}
      />
    </div>
  );
}