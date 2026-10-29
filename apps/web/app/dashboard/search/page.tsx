"use client";

import { Suspense, useEffect } from "react";
import BookmarksGrid from "@/components/dashboard/bookmarks/BookmarksGrid";
import BookmarksGridSkeleton from "@/components/dashboard/bookmarks/BookmarksGridSkeleton";
import { useBookmarkSearch } from "@/lib/hooks/bookmark-search";
import { useInSearchPageStore } from "@/lib/store/useInSearchPageStore";
import { useTranslation } from "@/lib/i18n/client";
import { useSortOrderStore } from "@/lib/store/useSortOrderStore";

function SearchComp() {
  const { t } = useTranslation();
  const { data, error, hasNextPage, fetchNextPage, isFetchingNextPage } =
    useBookmarkSearch();

  const { setInSearchPage } = useInSearchPageStore();

  const { setSortOrder } = useSortOrderStore();

  useEffect(() => {
    // also see related cleanup code in SortOrderToggle.tsx
    setSortOrder("relevance");
  }, [setSortOrder]);

  useEffect(() => {
    setInSearchPage(true);
    return () => setInSearchPage(false);
  }, [setInSearchPage]);

  if (error) {
    throw error;
  }

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-2xl font-semibold tracking-tight">
        {t("common.search")}
      </h1>
      {data ? (
        <BookmarksGrid
          hasNextPage={hasNextPage}
          fetchNextPage={fetchNextPage}
          isFetchingNextPage={isFetchingNextPage}
          bookmarks={data.pages.flatMap((b) => b.bookmarks)}
        />
      ) : (
        <BookmarksGridSkeleton />
      )}
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense>
      <SearchComp />
    </Suspense>
  );
}
