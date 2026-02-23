export const isoToday = () => new Date().toISOString().slice(0, 10);

export const formatMinutes = (value: number) =>
  value >= 60 ? `${Math.floor(value / 60)}h ${value % 60}m` : `${value}m`;

export const tw = {
  input:
    "rounded-2xl border border-transparent bg-[var(--panel)] px-4 py-3 shadow-[0_0_0_1px_rgba(15,23,42,0.1)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]",
  label: "text-xs uppercase tracking-[0.2em] text-[var(--muted)]",
  accentBtn:
    "rounded-full bg-[var(--accent)] text-white shadow-lg transition hover:-translate-y-0.5",
  ghostBtn:
    "rounded-full border border-[var(--border-medium)] bg-white text-[var(--ink)] shadow transition hover:-translate-y-0.5",
} as const;
