// Variant → Tailwind classes
const VARIANTS = {
  primary: "bg-magenta text-white border-ink hover:shadow-hard active:translate-x-0.5 active:translate-y-0.5",
  cobalt:  "bg-cobalt  text-white border-ink hover:shadow-hard active:translate-x-0.5 active:translate-y-0.5",
  gold:    "bg-amber-400   text-ink  border-ink hover:shadow-hard active:translate-x-0.5 active:translate-y-0.5",
  lime:    "bg-lime    text-ink  border-ink hover:shadow-hard active:translate-x-0.5 active:translate-y-0.5",
  dark:    "bg-dark    text-white border-ink hover:shadow-hard active:translate-x-0.5 active:translate-y-0.5",
  danger:  "bg-red-500  text-white border-ink hover:shadow-hard active:translate-x-0.5 active:translate-y-0.5",
  ghost:   "bg-transparent text-ink border-ink hover:shadow-hard active:translate-x-0.5 active:translate-y-0.5",
};

const SIZES = {
  sm: "px-3 py-1.5 text-xs",
  md: "px-5 py-2.5 text-sm",
  lg: "px-6 py-3 text-base",
};

export default function Button({
  children,
  variant = "primary",
  size = "md",
  className = "",
  disabled = false,
  loading = false,
  onClick,
  type = "button",
  ...props
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`
        inline-flex items-center justify-center gap-2
        font-bold tracking-wide border-2 shadow-hard-sm
        transition-all duration-100
        translate-x-0 translate-y-0
        hover:-translate-x-0.5 hover:-translate-y-0.5
        disabled:opacity-50 disabled:pointer-events-none
        cursor-pointer
        ${VARIANTS[variant] ?? VARIANTS.primary}
        ${SIZES[size] ?? SIZES.md}
        ${className}
      `}
      {...props}
    >
      {loading ? (
        <>
          <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
          Loading...
        </>
      ) : children}
    </button>
  );
}