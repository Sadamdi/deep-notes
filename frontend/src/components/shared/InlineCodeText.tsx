export function InlineCodeText({ children, className }: { children: string; className?: string }) {
  const parts = children.split(/(`[^`]+`)/g);

  return (
    <span className={className}>
      {parts.map((part, index) => part.startsWith("`") && part.endsWith("`") && part.length > 2
        ? <code className="break-words rounded bg-navy/10 px-1 py-0.5 font-mono text-[0.9em]" key={index}>{part.slice(1, -1)}</code>
        : part)}
    </span>
  );
}
