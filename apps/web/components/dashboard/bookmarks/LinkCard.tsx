"use client";

import Image from "next/image";
import Link from "next/link";
import { Globe2 } from "lucide-react";
import { useUserSettings } from "@/lib/userSettings";

import type { ZBookmarkTypeLink } from "@karakeep/shared/types/bookmarks";
import {
  getBookmarkLinkImageUrl,
  getBookmarkTitle,
  getSourceUrl,
  isBookmarkStillCrawling,
} from "@karakeep/shared/utils/bookmarkUtils";

import { BookmarkLayoutAdaptingCard } from "./BookmarkLayoutAdaptingCard";
import FooterLinkURL from "./FooterLinkURL";

const useOnClickUrl = (bookmark: ZBookmarkTypeLink) => {
  const userSettings = useUserSettings();
  return {
    urlTarget:
      userSettings.bookmarkClickAction === "open_original_link"
        ? ("_blank" as const)
        : ("_self" as const),
    onClickUrl:
      userSettings.bookmarkClickAction === "expand_bookmark_preview"
        ? `/dashboard/preview/${bookmark.id}`
        : bookmark.content.url,
  };
};

function LinkTitle({ bookmark }: { bookmark: ZBookmarkTypeLink }) {
  const { onClickUrl, urlTarget } = useOnClickUrl(bookmark);
  const parsedUrl = new URL(bookmark.content.url);
  return (
    <Link href={onClickUrl} target={urlTarget} rel="noreferrer">
      {getBookmarkTitle(bookmark) ?? parsedUrl.host}
    </Link>
  );
}

function LinkImage({
  bookmark,
  className,
}: {
  bookmark: ZBookmarkTypeLink;
  className?: string;
}) {
  const { onClickUrl, urlTarget } = useOnClickUrl(bookmark);
  const link = bookmark.content;

  const imgComponent = (url: string, unoptimized: boolean) => (
    <Image
      unoptimized={unoptimized}
      className={className}
      alt="card banner"
      fill={true}
      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
      src={url}
    />
  );

  const imageDetails = getBookmarkLinkImageUrl(link);

  let img: React.ReactNode;
  if (isBookmarkStillCrawling(bookmark)) {
    img = imgComponent("/blur.avif", false);
  } else if (imageDetails) {
    img = imgComponent(imageDetails.url, true);
  } else {
    img = (
      <div className="keeply-cover flex size-full flex-col items-center justify-center gap-3 text-muted-foreground">
        <Globe2 size={28} strokeWidth={1.3} aria-hidden="true" />
        <span className="max-w-[85%] truncate text-xs">
          {new URL(link.url).hostname}
        </span>
      </div>
    );
  }

  return (
    <Link
      href={onClickUrl}
      target={urlTarget}
      rel="noreferrer"
      className={`${className ?? ""} block`}
      aria-label={getBookmarkTitle(bookmark) ?? new URL(link.url).hostname}
    >
      <div className="relative size-full flex-1">{img}</div>
    </Link>
  );
}

export default function LinkCard({
  bookmark: bookmarkLink,
  className,
  bookmarkIndex,
}: {
  bookmark: ZBookmarkTypeLink;
  className?: string;
  bookmarkIndex?: number;
}) {
  return (
    <BookmarkLayoutAdaptingCard
      title={<LinkTitle bookmark={bookmarkLink} />}
      footer={<FooterLinkURL url={getSourceUrl(bookmarkLink)} />}
      fitHeight={true}
      content={
        bookmarkLink.content.description ? (
          <p className="line-clamp-3 text-sm leading-relaxed text-muted-foreground">
            {bookmarkLink.content.description}
          </p>
        ) : undefined
      }
      bookmark={bookmarkLink}
      wrapTags={false}
      image={(_layout, className) => (
        <LinkImage className={className} bookmark={bookmarkLink} />
      )}
      className={className}
      bookmarkIndex={bookmarkIndex}
    />
  );
}
