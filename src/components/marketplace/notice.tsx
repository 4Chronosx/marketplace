import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import type { ApiRequestError } from "@/lib/api-client";
import { cn } from "@/lib/utils";

type NoticeProps = {
  title: string;
  /** Short plain-text explanation. */
  children?: ReactNode;
  action?: ReactNode;
  role?: "alert" | "status";
  className?: string;
};

// Shared card for errors, empty states and not-found messages.
export function Notice({ title, children, action, role, className }: NoticeProps) {
  return (
    <div
      role={role}
      className={cn(
        "flex max-w-xl flex-col items-start gap-2 rounded-xl border bg-card p-6",
        className,
      )}
    >
      <h2 className="text-lg font-semibold">{title}</h2>
      {children && <p className="text-sm text-muted-foreground">{children}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

// Error card for failed API requests, with an optional retry button.
export function ErrorNotice({
  error,
  onRetry,
}: {
  error: ApiRequestError;
  onRetry?: () => void;
}) {
  const notConfigured = error.status === 503;

  return (
    <Notice
      role="alert"
      title={notConfigured ? "The database isn't set up yet" : "Something went wrong"}
      action={
        onRetry && (
          <Button type="button" variant="outline" onClick={onRetry}>
            Try again
          </Button>
        )
      }
    >
      {notConfigured
        ? "Marketplace can't reach its database. Add the Supabase credentials and restart the server."
        : error.message}
    </Notice>
  );
}
