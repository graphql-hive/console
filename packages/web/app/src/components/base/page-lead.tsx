export function PageLead({ description, title }: { description: string; title: string }) {
  return (
    <div className="mb-4 flex flex-col gap-1.5">
      <h1 className="text-neutral-12 m-0 text-[16px] font-medium">{title}</h1>
      <p className="text-neutral-10 m-0 text-[13px]">{description}</p>
    </div>
  );
}
