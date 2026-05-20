import { Loader2 } from "lucide-react";
import { logoHorizontalWhite } from "@/assets/logos";

export function AuthLoadingScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6 text-foreground">
      <div className="flex flex-col items-center gap-5">
        <img
          src={logoHorizontalWhite}
          alt="Kojobot"
          className="h-10 w-auto object-contain"
        />
        <div
          className="flex items-center gap-2 text-sm text-muted-foreground"
          role="status"
          aria-live="polite"
        >
          <Loader2 className="size-5 animate-spin text-kojo-cyan" strokeWidth={1.5} />
          <span>Checking session…</span>
        </div>
      </div>
    </div>
  );
}