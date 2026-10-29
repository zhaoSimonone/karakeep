"use client";

import { useState } from "react";
import Link from "next/link";
import GlobalActions from "@/components/dashboard/GlobalActions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useTranslation } from "@/lib/i18n/client";
import { Plus, Star, Tags } from "lucide-react";
import { useHotkeys } from "react-hotkeys-hook";

import EditorCard from "./EditorCard";

export default function CollectionToolbar({
  count,
  hasMore,
  showAdd,
  isHome,
}: {
  count: number;
  hasMore: boolean;
  showAdd: boolean;
  isHome: boolean;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  useHotkeys("mod+e", () => setOpen(true), {
    enabled: showAdd && !open,
    preventDefault: true,
  });

  return (
    <div className="mb-5 space-y-4">
      {showAdd && (
        <div className="flex flex-wrap items-center justify-between gap-5">
          {isHome && (
            <div>
              <h1 className="text-2xl font-semibold tracking-tight sm:text-[28px]">
                {t("keeply_ui.title")}
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                {t("keeply_ui.subtitle")}
              </p>
            </div>
          )}
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="h-11 rounded-full px-5 font-semibold shadow-sm">
                <Plus size={18} />
                {t("keeply_ui.add")}
              </Button>
            </DialogTrigger>
            <DialogContent className="rounded-[28px] p-6">
              <DialogHeader>
                <DialogTitle>{t("keeply_ui.add")}</DialogTitle>
                <DialogDescription className="pt-2 leading-relaxed">
                  {t("keeply_ui.add_description")}
                </DialogDescription>
              </DialogHeader>
              <EditorCard
                dialog
                onSaved={() => setOpen(false)}
                className="p-0"
              />
            </DialogContent>
          </Dialog>
        </div>
      )}
      {showAdd && isHome && (
        <nav
          aria-label={t("keeply_ui.title")}
          className="flex flex-wrap gap-2 text-sm"
        >
          <span className="keeply-filter-active rounded-full px-4 py-2">
            {t("keeply_ui.all")}
          </span>
          <Link className="keeply-filter" href="/dashboard/favourites">
            <Star size={14} />
            {t("keeply_ui.favorites")}
          </Link>
          <Link className="keeply-filter" href="/dashboard/tags">
            <Tags size={14} />
            {t("keeply_ui.tags")}
          </Link>
        </nav>
      )}
      <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-4">
        <p className="text-xs text-muted-foreground" aria-live="polite">
          {t(hasMore ? "keeply_ui.more_count" : "keeply_ui.count", { count })}
        </p>
        <div className="keeply-view-controls rounded-full border bg-card px-1">
          <GlobalActions />
        </div>
      </div>
    </div>
  );
}
