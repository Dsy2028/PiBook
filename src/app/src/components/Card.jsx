export default function Card({ title, accentColor, children, className = "" }) {
  return (
    <div className={`bg-[#FAFAF2] border-3 border-ink shadow-hard mb-6 ${className}`}>

      {title && (
        <div className="flex items-center gap-3 px-6 pt-5 pb-4 border-b-2 border-ink">
          {/* Diamond accent shape */}
          {accentColor && (
            <div
              className="w-3.5 h-3.5 border-2 border-ink rotate-45 flex-shrink-0"
              style={{ background: accentColor }}
            />
          )}
          <h3 className="font-display text-2xl tracking-wide leading-none">{title}</h3>
        </div>
      )}

      <div className="p-6">{children}</div>

    </div>
  );
}