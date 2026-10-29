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
        "flex w-full rounded-lg hover:bg-background",
        path == currentPath ? "bg-accent" : "",
      )}
    >
      <Link
        aria-label={name}
        aria-current={path === currentPath ? "page" : undefined}
        onClick={haptic}
        href={path}
        className="m-auto px-3 py-3"
      >
        {logo}
      </Link>
    </li>
  );
}
