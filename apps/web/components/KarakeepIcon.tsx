import { BookmarkCheck } from "lucide-react";

export default function KeeplyLogo({ height }: { height: number }) {
  return (
    <span
      className="flex items-center gap-2 whitespace-nowrap"
      aria-label="Keeply · 收好"
      style={{ height }}
    >
      <BookmarkCheck size={Math.round(height * 0.72)} aria-hidden="true" />
      <span className="text-2xl font-bold tracking-tight">Keeply</span>
      <span className="text-sm font-medium text-muted-foreground">收好</span>
    </span>
  );
}
