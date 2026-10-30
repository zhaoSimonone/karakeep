"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { haptic } from "@/lib/haptic";
import { cn } from "@/lib/utils";

export default function MobileSidebarItem({
  logo,
  path,
  name,
}: {
  logo: React.ReactNode;
  path: string;
  name: string;
}) {
  const currentPath = usePathname();
  return (
    <li
      className={cn(
        "flex min-w-0 flex-1 rounded-2xl transition-colors hover:bg-accent",
        path == currentPath
          ? "bg-accent font-semibold text-accent-foreground"
          : "text-muted-foreground",
      )}
    >
      <Link
        aria-label={name}
        aria-current={path === currentPath ? "page" : undefined}
        onClick={haptic}
        href={path}
        className="flex min-h-12 w-full flex-col items-center justify-center gap-1 rounded-[inherit] px-1 py-2"
      >
        <span className="flex size-[18px] items-center justify-center">
          {logo}
        </span>
        <span className="max-w-full truncate text-[10px] leading-4">
          {name}
        </span>
      </Link>
    </li>
  );
}
