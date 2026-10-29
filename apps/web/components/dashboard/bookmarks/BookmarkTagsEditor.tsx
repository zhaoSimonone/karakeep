import { toast } from "@/components/ui/sonner";

import type { ZBookmark } from "@karakeep/shared/types/bookmarks";
import { useUpdateBookmarkTags } from "@karakeep/shared-react/hooks/bookmarks";

import { TagsEditor } from "./TagsEditor";

export function BookmarkTagsEditor({
  bookmark,
  disabled,
  quiet = false,
}: {
  bookmark: ZBookmark;
  disabled?: boolean;
  quiet?: boolean;
}) {
  const { mutate } = useUpdateBookmarkTags({
    onSuccess: () => {
      toast({
        description: "Tags has been updated!",
      });
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Something went wrong",
        description: "There was a problem with your request.",
      });
    },
  });

  return (
    <TagsEditor
      tags={bookmark.tags}
      quiet={quiet}
      disabled={disabled}
      onAttach={({ tagName, tagId }) => {
        mutate({
          bookmarkId: bookmark.id,
          attach: [
            {
              tagName,
              tagId,
            },
          ],
          detach: [],
        });
      }}
      onDetach={({ tagId }) => {
        mutate({
          bookmarkId: bookmark.id,
          attach: [],
          detach: [{ tagId }],
        });
      }}
    />
  );
}
