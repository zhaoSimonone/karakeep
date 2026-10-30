import AllListsView from "@/components/dashboard/lists/AllListsView";
import { EditListModal } from "@/components/dashboard/lists/EditListModal";
import { PendingInvitationsCard } from "@/components/dashboard/lists/PendingInvitationsCard";
import { KeeplyListIcon } from "@/components/KarakeepIcon";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/lib/i18n/server";
import { api } from "@/server/api/client";
import { Plus } from "lucide-react";

export default async function ListsPage() {
  // oxlint-disable-next-line rules-of-hooks
  const { t } = await useTranslation();
  const [lists, stats] = await Promise.all([
    api.lists.list(),
    api.users.bookmarkCounts(),
  ]);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-center justify-between gap-5">
        <div className="flex min-w-0 items-center gap-4">
          <KeeplyListIcon kind="all" size="lg" />
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              {t("lists.all_lists")}
            </h1>
            <p className="text-sm text-muted-foreground">
              {t("lists.summary_list", { count: lists.lists.length })} ·{" "}
              {t("lists.summary_bookmark", { count: stats.numBookmarks })}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <EditListModal>
            <Button className="h-11 gap-2 rounded-full px-5 font-semibold shadow-sm">
              <Plus className="size-4" />
              <span>{t("lists.new_list")}</span>
            </Button>
          </EditListModal>
        </div>
      </div>
      <PendingInvitationsCard />
      <AllListsView
        archivedCount={stats.numArchived}
        favoritesCount={stats.numFavorites}
        initialData={lists.lists}
      />
    </div>
  );
}
