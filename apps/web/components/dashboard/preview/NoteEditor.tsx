import { toast } from "@/components/ui/sonner";
import { Textarea } from "@/components/ui/textarea";
import { useClientConfig } from "@/lib/clientConfig";

import type { ZBookmark } from "@karakeep/shared/types/bookmarks";
import { useUpdateBookmark } from "@karakeep/shared-react/hooks/bookmarks";

export function NoteEditor({
  bookmark,
  disabled,
}: {
  bookmark: ZBookmark;
  disabled?: boolean;
}) {
  const demoMode = !!useClientConfig().demoMode;

  const updateBookmarkMutator = useUpdateBookmark({
    onSuccess: () => {
      toast({
        description: "备注已保存",
      });
    },
    onError: () => {
      toast({
        description: "备注保存失败，请重试",
        variant: "destructive",
      });
    },
  });

  return (
    <Textarea
      className="min-h-[5rem] w-full resize-y overflow-auto rounded-2xl border-border/60 bg-muted/20 p-3 text-sm text-foreground placeholder:text-muted-foreground dark:bg-input/30"
      defaultValue={bookmark.note ?? ""}
      disabled={demoMode || disabled}
      aria-label="阅读备注"
      placeholder="留下你的想法…"
      onBlur={(e) => {
        if (e.currentTarget.value == bookmark.note) {
          return;
        }
        updateBookmarkMutator.mutate({
          bookmarkId: bookmark.id,
          note: e.currentTarget.value,
        });
      }}
    />
  );
}
