import { BookOpen, Check, Globe } from "lucide-react";

import Spinner from "../Spinner";

export interface PagePreview {
  image?: string;
  title?: string;
  url?: string;
}

export function CapturePreview({
  preview,
  status,
  detail,
  done = false,
}: {
  preview?: PagePreview;
  status: string;
  detail?: string;
  done?: boolean;
}) {
  let host = "网页收藏";
  try {
    if (preview?.url) host = new URL(preview.url).hostname;
  } catch {
    /* A text snippet has no URL. */
  }
  return (
    <div className="capture-card">
      <div className="capture-thumbnail">
        {preview?.image ? (
          <img src={preview.image} alt="当前网页预览" />
        ) : (
          <div className="capture-placeholder">
            <BookOpen className="size-8" strokeWidth={1.25} />
            <span>把值得留下的，收好。</span>
          </div>
        )}
        <span className="capture-domain">
          <Globe className="size-3" />
          {host}
        </span>
      </div>
      <div className="space-y-2.5 p-3">
        {preview?.title && (
          <h2 className="line-clamp-2 text-sm font-semibold leading-snug tracking-tight">
            {preview.title}
          </h2>
        )}
        <div
          className="flex items-center gap-2 text-sm"
          role="status"
          aria-live="polite"
        >
          {done ? (
            <span className="flex size-5 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
              <Check className="size-3.5" />
            </span>
          ) : (
            <Spinner className="size-4 text-emerald-600" />
          )}
          <span className="font-medium">{status}</span>
        </div>
        {detail && (
          <p className="text-[11px] leading-relaxed text-muted-foreground">
            {detail}
          </p>
        )}
      </div>
      {!done && (
        <div className="capture-progress" aria-hidden="true">
          <span />
        </div>
      )}
    </div>
  );
}
