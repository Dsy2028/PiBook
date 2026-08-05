export default function PageHeader({
  title,
  eyebrow,
  accentColor = "#E91E8C",
  lightText = false,
  children,   // optional action buttons on the right
}) {
  return (
    <header
      className="relative overflow-hidden flex items-end justify-between gap-4
                 px-9 pt-7 pb-6 border-b-3 border-ink bg-[#FAFAF2]"
    >
      {/* Parallelogram color bleed from right edge */}
      <div
        className="absolute inset-y-0 right-0 w-48 opacity-10"
        style={{
          background: accentColor,
          clipPath: "polygon(40px 0, 100% 0, 100% 100%, 0 100%)",
        }}
      />

      {/* Title block */}
      <div className="relative z-10">
        {eyebrow && (
          <p className="text-[10px] font-bold tracking-[.2em] uppercase text-[#888] mb-1">
            {eyebrow}
          </p>
        )}
        <h2
          className="font-display text-5xl tracking-wide leading-none"
          style={{ color: lightText ? accentColor : "#0D0D0D" }}
        >
          {title}
        </h2>
      </div>

      {/* Right-side action slot */}
      {children && (
        <div className="relative z-10 flex items-center gap-3 flex-shrink-0">
          {children}
        </div>
      )}
    </header>
  );
}