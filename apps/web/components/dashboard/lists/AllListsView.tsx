"use client";

import { useMemo } from "react";
import Link from "next/link";
import { KeeplyListIcon } from "@/components/KarakeepIcon";
import { Button } from "@/components/ui/button";
import { CollapsibleTriggerChevron } from "@/components/ui/collapsible";
import { useTranslation } from "@/lib/i18n/client";
import { MoreHorizontal } from "lucide-react";

import type { ZBookmarkList } from "@karakeep/shared/types/lists";
import {
  augmentBookmarkListsWithInitialData,
  useBookmarkLists,
} from "@karakeep/shared-react/hooks/lists";

import { CollapsibleBookmarkLists } from "./CollapsibleBookmarkLists";
import { ListOptions } from "./ListOptions";
import {
  ListCollaboratorsIcons,
  ListItemCount,
  ListPrivacyLabel,
} from "./ListHeaderComponents";

function ListItem({
  name,
  icon,
  path,
  style,
  list,
  open,
  collapsible,
  itemCount,
  kind,
  description,
}: {
  name: string;
  icon: string;
  path: string;
  list?: ZBookmarkList;
  open?: boolean;
  collapsible: boolean;
  itemCount?: number;
  kind?: "favourites" | "archive";
  description?: string;
  style?: React.CSSProperties;
}) {
  const { t } = useTranslation();

  return (
    <li
      className="group/list-row flex min-h-20 items-center justify-between gap-x-3 gap-y-2 px-4 py-4 transition-colors hover:bg-accent/30"
      style={style}
    >
      <div className="flex min-w-0 flex-1 items-center gap-2">
        {collapsible && (
          <CollapsibleTriggerChevron
            className="size-4 shrink-0 rounded-sm text-muted-foreground"
            open={open ?? false}
          />
        )}
        <Link
          href={path}
          className="flex min-w-0 flex-1 items-center gap-3 rounded-xl"
        >
          <KeeplyListIcon icon={icon} kind={kind} size="lg" />
          <div className="flex min-w-0 flex-col">
            <div className="min-w-0">
              <p
                title={name}
                className="truncate text-base font-medium text-foreground"
              >
                {name}
              </p>
            </div>
            {(description || list?.description) && (
              <p className="truncate text-sm text-muted-foreground">
                {description || list?.description}
              </p>
            )}
          </div>
        </Link>
      </div>
      <div className="flex shrink-0 items-center gap-2 text-sm text-muted-foreground">
        {list && (
          <>
            <div className="hidden items-center gap-2 sm:flex">
              <ListCollaboratorsIcons className="mr-4" list={list} />
              <ListPrivacyLabel className="truncate" list={list} />
              <span aria-hidden>·</span>
              <ListItemCount className="text-muted-foreground" list={list} />
            </div>
            <ListOptions list={list}>
              <Button
                className="size-9 shrink-0 rounded-full p-0"
                aria-label={`${name} · ${t("actions.more")}`}
                variant="ghost"
              >
                <MoreHorizontal className="size-4" />
              </Button>
            </ListOptions>
          </>
        )}
        {!list && itemCount !== undefined && (
          <span className="hidden items-center gap-2 sm:flex">
            {t("lists.items_count", { count: itemCount })}
          </span>
        )}
      </div>
    </li>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <h2 className="px-1 text-xs font-medium tracking-wider text-muted-foreground">
        {title}
      </h2>
      <div className="overflow-hidden rounded-[20px] border bg-card shadow-sm">
        {children}
      </div>
    </section>
  );
}

export default function AllListsView({
  initialData,
  favoritesCount,
  archivedCount,
}: {
  initialData: ZBookmarkList[];
  favoritesCount?: number;
  archivedCount?: number;
}) {
  const { t } = useTranslation();

  // Fetch live lists data
  const { data: listsData } = useBookmarkLists(undefined, {
    initialData: { lists: initialData },
  });
  const lists = augmentBookmarkListsWithInitialData(listsData, initialData);

  // Check if there are any shared lists
  const hasSharedLists = useMemo(() => {
    return lists.data.some((list) => list.userRole !== "owner");
  }, [lists.data]);

  const hasOwnedLists = useMemo(() => {
    return lists.data.some((list) => list.userRole === "owner");
  }, [lists.data]);

  return (
    <div className="space-y-8">
      <Section title={t("keeply_ui.pinned_lists")}>
        <ul className="divide-y">
          <ListItem
            collapsible={false}
            name={t("lists.favourites")}
            icon=""
            description={t("keeply_ui.favorites_description")}
            itemCount={favoritesCount}
            path={`/dashboard/favourites`}
            kind="favourites"
          />
          <ListItem
            collapsible={false}
            name={t("common.archive")}
            icon=""
            description={t("keeply_ui.archive_description")}
            itemCount={archivedCount}
            path={`/dashboard/archive`}
            kind="archive"
          />
        </ul>
      </Section>

      {hasOwnedLists && (
        <Section title={t("lists.all_lists")}>
          <CollapsibleBookmarkLists
            className="border-b last:border-b-0"
            listsData={lists}
            filter={(node) => node.item.userRole === "owner"}
            render={({ node, level, open, numBookmarks }) => (
              <ListItem
                name={node.item.name}
                icon={node.item.icon}
                itemCount={numBookmarks}
                list={node.item}
                path={`/dashboard/lists/${node.item.id}`}
                collapsible={node.children.length > 0}
                open={open}
                style={{ marginLeft: `${level * 1}rem` }}
              />
            )}
          />
        </Section>
      )}

      {hasSharedLists && (
        <Section title={t("lists.shared_lists")}>
          <CollapsibleBookmarkLists
            className="border-b last:border-b-0"
            listsData={lists}
            filter={(node) => node.item.userRole !== "owner"}
            render={({ node, open, numBookmarks }) => (
              <ListItem
                name={node.item.name}
                icon={node.item.icon}
                itemCount={numBookmarks}
                list={node.item}
                path={`/dashboard/lists/${node.item.id}`}
                collapsible={node.children.length > 0}
                open={open}
              />
            )}
          />
        </Section>
      )}
    </div>
  );
}
