import { ArrowLeft } from "lucide-react";

import Logo from "../Logo";
import { Button } from "./ui/button";

export function PopupHeader({
  title,
  onBack,
  children,
}: {
  title?: string;
  onBack?: () => void;
  children?: React.ReactNode;
}) {
  return (
    <div className="-mx-3 -mt-3 flex h-10 items-center gap-1 px-2.5">
      {onBack && (
        <Button
          variant="ghost"
          size="icon"
          className="size-7 text-muted-foreground"
          onClick={onBack}
          aria-label="返回"
          title="返回"
        >
          <ArrowLeft className="size-4" />
        </Button>
      )}
      {title ? (
        <h1 className="px-1 text-base font-semibold">{title}</h1>
      ) : (
        <Logo className="ml-1 h-6" />
      )}
      <div className="ml-auto flex items-center gap-0.5">{children}</div>
    </div>
  );
}

export function HeaderIconButton({
  label,
  ...props
}: React.ComponentProps<typeof Button> & { label: string }) {
  return (
    <Button
      variant="ghost"
      size="icon"
      className="size-7 text-muted-foreground hover:text-foreground"
      aria-label={label}
      title={label}
      {...props}
    />
  );
}
