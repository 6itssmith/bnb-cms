import { LoaderCircle, ShieldAlert } from "lucide-react";

export function PageLoading() {
  return (
    <div className="flex items-center justify-center py-24">
      <LoaderCircle className="w-6 h-6 animate-spin text-moss" aria-hidden="true" />
    </div>
  );
}

export function NotPermitted() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center gap-2">
      <ShieldAlert className="w-8 h-8 text-earth-dark" aria-hidden="true" />
      <p className="text-sm text-ink/60 dark:text-cream/60">
        You don't have access to this page.
      </p>
    </div>
  );
}
