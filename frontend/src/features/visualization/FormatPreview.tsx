/** Small decorative sketch of what each material type looks like once it is visualised (design page 10). */
export function FormatPreview({ kind }: { kind: string }) {
  const line = { stroke: "var(--color-teal)", strokeWidth: 2.5, fill: "none", strokeLinecap: "round" as const };
  const card = { fill: "var(--color-card)", stroke: "var(--color-teal)", strokeWidth: 1.5 };
  return (
    <svg aria-hidden="true" className="h-24 w-full" viewBox="0 0 240 96">
      {kind === "documents" && <><path {...line} d="M70 48 L120 24 M70 48 L120 72 M120 24 L172 24" /><circle {...card} cx="62" cy="48" r="16" /><circle {...card} cx="120" cy="24" r="12" /><circle {...card} cx="120" cy="72" r="12" /><circle {...card} cx="180" cy="24" r="12" /></>}
      {kind === "slides" && [36, 96, 156].map((x, index) => <g key={x}><rect {...card} height="40" rx="6" width="48" x={x} y="28" /><path {...line} d={`M${x + 10} 42 h28 M${x + 10} 54 h${18 + index * 5}`} /></g>)}
      {kind === "tables" && [34, 56, 44, 70, 52].map((height, index) => <rect fill={index % 2 ? "var(--color-navy)" : "var(--color-teal)"} height={height} key={index} rx="4" width="22" x={52 + index * 30} y={82 - height} />)}
      {kind === "images" && <><rect {...card} height="62" rx="8" width="128" x="56" y="17" /><circle cx="88" cy="39" fill="var(--color-teal)" r="8" /><path {...line} d="M66 70 L104 48 L128 62 L148 44 L174 70" /></>}
      {kind === "audio" && [16, 34, 56, 28, 64, 40, 22, 50, 30, 14].map((height, index) => <rect fill="var(--color-navy)" height={height} key={index} opacity="0.55" rx="3" width="8" x={52 + index * 14} y={48 - height / 2} />)}
      {kind === "links" && <><rect {...card} height="66" rx="8" width="132" x="54" y="15" /><path {...line} d="M54 32 h132 M68 46 h104 M68 58 h80 M68 70 h92" /></>}
    </svg>
  );
}
