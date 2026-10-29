"use client";

import { useTranslation } from "@/lib/i18n/client";
import { Bookmark } from "lucide-react";

export default function NoBookmarksBanner() {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col items-center justify-center rounded-[24px] border border-dashed bg-card/60 px-6 py-16 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/15">
        <Bookmark className="h-8 w-8 text-foreground/60" />
      </div>
      <h3 className="mb-2 text-xl font-medium text-foreground">
        {t("banners.no_bookmarks.title")}
      </h3>
      <p className="mb-6 max-w-md text-muted-foreground">
        {t("banners.no_bookmarks.description")}
      </p>
    </div>
  );
}
