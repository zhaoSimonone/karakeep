import type { Metadata } from "next";
import Bookmarks from "@/components/dashboard/bookmarks/Bookmarks";
import { useTranslation } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  // oxlint-disable-next-line rules-of-hooks
  const { t } = await useTranslation();
  return {
    title: `${t("lists.favourites")} | Keeply · 收好`,
  };
}

export default async function FavouritesBookmarkPage() {
  // oxlint-disable-next-line rules-of-hooks
  const { t } = await useTranslation();
  return (
    <Bookmarks
      header={
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">⭐️ {t("lists.favourites")}</h1>
        </div>
      }
      query={{ favourited: true }}
      showDivider={true}
      showEditorCard={true}
    />
  );
}
