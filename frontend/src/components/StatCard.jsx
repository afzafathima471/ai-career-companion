export default function StatCard({ label, value, suffix, tone = "gold" }) {
  const dotColor = { gold: "bg-gold", sage: "bg-sage", navy: "bg-navy" }[tone];

  return (
    <div className="flex-1 border border-line bg-white px-6 py-5">
      <div className="mb-3 flex items-center gap-2">
        <span className={`h-1.5 w-1.5 rounded-full ${dotColor}`} />
        <span className="text-[13px] text-ink/60">{label}</span>
      </div>
      <div className="font-display text-[34px] leading-none text-ink">
        {value}
        {suffix && <span className="ml-1 text-[18px] text-ink/50">{suffix}</span>}
      </div>
    </div>
  );
}
