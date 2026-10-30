"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export default function SidebarItem({
  name,
  logo,
  path,
  className,
  linkClassName,
  style,
  collapseButton,
  right = null,
  dropHighlight = false,
  onDrop,
  onDragOver,
  onDragEnter,
  onDragLeave,
}: {
  name: string;
  logo: React.ReactNode;
  path: string;
  style?: React.CSSProperties;
  className?: string;
  linkClassName?: string;
  right?: React.ReactNode;
  collapseButton?: React.ReactNode;
  dropHighlight?: boolean;
  onDrop?: React.DragEventHandler;
  onDragOver?: React.DragEventHandler;
  onDragEnter?: React.DragEventHandler;
  onDragLeave?: React.DragEventHandler;
}) {
  const currentPath = usePathname();
  return (
    <li
      className={cn(
        "relative mb-1 flex min-h-10 items-center justify-between rounded-2xl text-sm transition-colors hover:bg-accent",
        path == currentPath
          ? "bg-accent font-semibold text-accent-foreground"
          : "text-muted-foreground",
        dropHighlight && "bg-accent ring-2 ring-primary",
        className,
      )}
      style={style}
      onDrop={onDrop}
      onDragOver={onDragOver}
      onDragEnter={onDragEnter}
      onDragLeave={onDragLeave}
    >
      <div className="flex min-w-0 flex-1 items-center">
        {collapseButton && (
          <span className="absolute inset-y-0 left-0 flex w-3 items-center justify-center">
            {collapseButton}
          </span>
        )}
        <Link
          href={path}
          aria-current={path === currentPath ? "page" : undefined}
          className={cn(
            "flex min-h-10 min-w-0 flex-1 items-center gap-x-3 rounded-[inherit] px-3 py-2.5",
            linkClassName,
          )}
        >
          <span className="flex size-[18px] shrink-0 items-center justify-center">
            {logo}
          </span>
          <span title={name} className="truncate">
            {name}
          </span>
        </Link>
      </div>
      {right}
    </li>
  );
}
