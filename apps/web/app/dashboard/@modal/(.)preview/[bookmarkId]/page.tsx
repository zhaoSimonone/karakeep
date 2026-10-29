"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import BookmarkPreview from "@/components/dashboard/preview/BookmarkPreview";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";

export default function BookmarkPreviewPage(props: {
  params: Promise<{ bookmarkId: string }>;
}) {
  const params = use(props.params);
  const router = useRouter();

  const [open, setOpen] = useState(true);

  const setOpenWithRouter = (value: boolean) => {
    setOpen(value);
    if (!value) {
      router.back();
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpenWithRouter}>
      <VisuallyHidden>
        <DialogHeader>
          <DialogTitle>Preview</DialogTitle>
        </DialogHeader>
      </VisuallyHidden>
      <DialogContent
        className="h-[94dvh] w-[96vw] max-w-[1600px] overflow-hidden rounded-[24px] border-0 p-0 shadow-2xl"
        hideCloseBtn={true}
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <BookmarkPreview
          bookmarkId={params.bookmarkId}
          onClose={() => setOpenWithRouter(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
