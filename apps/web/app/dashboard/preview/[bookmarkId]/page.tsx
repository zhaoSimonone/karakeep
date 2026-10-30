import { notFound } from "next/navigation";
import BookmarkPreview from "@/components/dashboard/preview/BookmarkPreview";
import { api } from "@/server/api/client";
import { TRPCError } from "@trpc/server";

export default async function BookmarkPreviewPage(props: {
  params: Promise<{ bookmarkId: string }>;
}) {
  const params = await props.params;
  let bookmark;
  try {
    bookmark = await api.bookmarks.getBookmark({
      bookmarkId: params.bookmarkId,
    });
  } catch (e) {
    if (e instanceof TRPCError) {
      if (e.code === "NOT_FOUND") {
        notFound();
      }
    }
    throw e;
  }

  return (
    <div className="h-[calc(100dvh-192px)] min-h-80 overflow-hidden rounded-[24px] border border-border/60 shadow-sm sm:h-[calc(100dvh-120px)] lg:h-[calc(100dvh-136px)]">
      <BookmarkPreview bookmarkId={bookmark.id} initialData={bookmark} />
    </div>
  );
}
