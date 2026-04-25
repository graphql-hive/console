export function DescriptionList({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <div className="text-neutral-10 mb-1 inline-block text-[9px] font-medium uppercase tracking-[0.75px]">
        {label}
      </div>
      <div className="text-neutral-12 text-[13px]">{value}</div>
    </div>
  );
}
