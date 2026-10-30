import { cn } from "./utils/css";

export default function Logo({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "flex items-center gap-2 text-base font-bold tracking-tight",
        className,
      )}
    >
      <img
        src="/logo-48.png"
        alt=""
        className="size-7 shrink-0"
        aria-hidden="true"
      />
      <span>keeply.收好</span>
    </span>
  );
}
