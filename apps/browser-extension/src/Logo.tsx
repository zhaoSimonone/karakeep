import { BookmarkCheck } from "lucide-react";

import { cn } from "./utils/css";

export default function Logo({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "flex items-center gap-2 text-base font-bold tracking-tight",
        className,
      )}
    >
      <BookmarkCheck className="size-5 text-emerald-600" aria-hidden="true" />
      <span>keeply.收好</span>
    </span>
  );
}
