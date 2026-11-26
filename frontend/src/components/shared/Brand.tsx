import { Link } from "react-router";

export function Brand({ to = "/" }: { to?: string }) {
  return (
    <Link aria-label="Deep Notes" className="inline-flex w-fit items-center gap-3" to={to}>
      <img alt="" className="size-8" src="/assets/brand-deep-notes-mark.svg" />
      <span className="text-xl font-bold tracking-tight text-navy">Deep Notes</span>
    </Link>
  );
}
