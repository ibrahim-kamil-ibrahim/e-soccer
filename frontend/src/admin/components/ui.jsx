export function Field({ label, required, error, children, hint }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-medium text-[#64748B] uppercase tracking-wide">
        {label}
        {required && <span className="text-[#EF4444] ml-1">*</span>}
      </label>
      {children}
      {hint && !error && <p className="text-xs text-[#94A3B8]">{hint}</p>}
      {error && <p className="text-xs text-[#EF4444]">{error}</p>}
    </div>
  );
}

const inputBase =
  "w-full bg-white border rounded-lg px-3 py-2 text-sm text-[var(--color-text)] placeholder:text-[#94A3B8] focus:outline-none focus:border-[#16A34A]/60 transition-colors";

export function TextInput({ error, className = "", ...props }) {
  return (
    <input
      className={`${inputBase} ${error ? "border-[#EF4444]/60" : "border-[var(--color-border)]"} ${className}`}
      {...props}
    />
  );
}

export function TextArea({ error, className = "", ...props }) {
  return (
    <textarea
      className={`${inputBase} ${error ? "border-[#EF4444]/60" : "border-[var(--color-border)]"} resize-y min-h-[110px] ${className}`}
      {...props}
    />
  );
}

export function Select({ error, className = "", children, ...props }) {
  return (
    <select
      className={`${inputBase} appearance-none cursor-pointer ${error ? "border-[#EF4444]/60" : "border-[var(--color-border)]"} ${className}`}
      {...props}
    >
      {children}
    </select>
  );
}

export function Checkbox({ label, className = "", ...props }) {
  return (
    <label className={`flex items-center gap-2 cursor-pointer ${className}`}>
      <input
        type="checkbox"
        className="w-4 h-4 rounded border-[var(--color-border)] bg-white accent-[#16A34A]"
        {...props}
      />
      <span className="text-sm text-[var(--color-text)]">{label}</span>
    </label>
  );
}

const baseButton =
  "inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed";

export function Button({
  variant = "primary",
  loading = false,
  className = "",
  children,
  ...props
}) {
  const variants = {
    primary: "bg-[#16A34A] hover:bg-[#22C55E] text-white",
    danger: "bg-[#DC2626] hover:bg-[#EF4444] text-white",
    ghost: "bg-black/[0.04] hover:bg-black/[0.08] text-[var(--color-text)]",
    outline: "border border-[var(--color-border)] hover:bg-black/[0.04] text-[var(--color-text)]",
  };
  return (
    <button className={`${baseButton} ${variants[variant]} ${className}`} disabled={loading} {...props}>
      {loading ? <Spinner inline /> : null}
      {children}
    </button>
  );
}

export function Spinner({ className = "w-4 h-4", inline }) {
  return (
    <svg className={`animate-spin text-current ${className} ${inline ? "inline" : ""}`} viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-90" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
    </svg>
  );
}

export function Badge({ children, color = "slate" }) {
  const colors = {
    green: "bg-[var(--color-green-dim)] text-[#22C55E]",
    red: "bg-[#DC2626]/15 text-[#EF4444]",
    yellow: "bg-[#F59E0B]/15 text-[#FBBF24]",
    blue: "bg-[#3B82F6]/15 text-[#60A5FA]",
    slate: "bg-black/[0.04] text-[#64748B]",
    purple: "bg-[#8B5CF6]/15 text-[#A78BFA]",
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${colors[color]}`}>
      {children}
    </span>
  );
}

export function PageHeader({ title, description, actions }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-display font-bold text-[var(--color-text)]">{title}</h1>
        {description && <p className="text-sm text-[#64748B] mt-1">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
