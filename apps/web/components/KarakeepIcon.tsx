import { Archive, ClipboardList, Star, Users } from "lucide-react";
import Image from "next/image";

export function KeeplyMark({
  size = 36,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <Image
      src="/icons/logo-icon.svg?v=20261030-polished"
      alt=""
      className={`shrink-0 ${className ?? ""}`}
      width={size}
      height={size}
      unoptimized
      aria-hidden="true"
    />
  );
}

export function KeeplyListIcon({
  icon,
  kind,
  size = "sm",
  variant = "tile",
}: {
  icon?: string;
  kind?: "all" | "favourites" | "archive" | "shared";
  size?: "sm" | "lg";
  variant?: "tile" | "sidebar";
}) {
  const Icon =
    kind === "all"
      ? ClipboardList
      : kind === "favourites"
        ? Star
        : kind === "archive"
          ? Archive
          : kind === "shared"
            ? Users
            : null;

  return (
    <span
      className={`keeply-list-icon keeply-list-icon-${size} keeply-list-icon-${variant}`}
      aria-hidden="true"
    >
      {Icon ? (
        <Icon
          className={kind === "favourites" ? "fill-current" : undefined}
          strokeWidth={1.8}
        />
      ) : (
        icon
      )}
    </span>
  );
}

export default function KeeplyLogo({ height }: { height: number }) {
  return (
    <span
      className="flex items-center gap-2.5 whitespace-nowrap"
      aria-label="Keeply · 收好"
      style={{ height }}
    >
      <KeeplyMark size={36} />
      <span className="text-[25px] font-bold tracking-[-0.045em]">
        keeply<span className="text-muted-foreground">.</span>
      </span>
      <span className="text-[13px] font-medium tracking-wide text-muted-foreground">
        收好
      </span>
    </span>
  );
}
