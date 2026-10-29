import { BookmarkCheck } from "lucide-react";

export default function KeeplyLogo({ height }: { height: number }) {
  return (
    <span
      className="flex items-center gap-2 whitespace-nowrap"
      aria-label="Keeply · 收好"
      style={{ height }}
    >
      <span className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
        <BookmarkCheck size={23} strokeWidth={1.8} aria-hidden="true" />
      </span>
      <span className="text-2xl font-bold tracking-tight">
        keeply<span className="text-muted-foreground">.</span>
      </span>
      <span className="text-sm font-medium text-muted-foreground">收好</span>
    </span>
  );
}
