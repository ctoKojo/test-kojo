// Kojobot — Login (Dark + gradient hero, dark navy form card)
// Per /DESIGN_SYSTEM.md §17: Dark theme + Gradient hero + form card on dark navy.

import { useState, type FormEvent } from "react";
import { createFileRoute, useNavigate, redirect } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { KojoButton } from "@/components/ui/kojo/kojo-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { logoHorizontalWhite, logoHorizontal } from "@/assets/logos";

export const Route = createFileRoute("/login")({
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession();
    if (data.session) {
      throw redirect({ to: "/dashboard" });
    }
  },
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  // Dark theme applied globally on <html> in __root.tsx (spec §17).

  const handleEmailLogin = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Welcome back");
    navigate({ to: "/dashboard" });
  };

  const handleGoogle = async () => {
    setGoogleLoading(true);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      setGoogleLoading(false);
      toast.error("Google sign-in failed");
      return;
    }
    if (result.redirected) return;
    navigate({ to: "/dashboard" });
  };

  return (
    <div className="min-h-screen w-full bg-background grid lg:grid-cols-2">
      {/* Left: Gradient hero */}
      <div className="relative hidden lg:flex flex-col justify-between p-12 bg-kojo-gradient overflow-hidden">
        <div className="relative z-10 flex items-center gap-3">
          <img
            src={logoHorizontalWhite}
            alt="Kojobot"
            className="h-10 w-auto object-contain"
          />
        </div>
        <div className="relative z-10 space-y-4 text-white">
          <h2 className="font-title text-4xl font-bold leading-tight">
            Your First Line.
          </h2>
          <p className="font-main text-lg text-white/85 max-w-md">
            The first place where kids learn programming and robotics — ages 6 to 17.
          </p>
        </div>
        <div className="relative z-10 text-xs text-white/60">
          © {new Date().getFullYear()} Kojobot Academy
        </div>
        {/* Subtle pattern overlay */}
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 30%, white 1px, transparent 1px), radial-gradient(circle at 80% 70%, white 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />
      </div>

      {/* Right: Form card */}
      <div className="flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-sm space-y-6">
          <div className="lg:hidden flex items-center mb-4">
            <img
              src={logoHorizontal}
              alt="Kojobot"
              className="h-9 w-auto object-contain dark:hidden"
            />
            <img
              src={logoHorizontalWhite}
              alt="Kojobot"
              className="hidden h-9 w-auto object-contain dark:block"
            />
          </div>

          <div className="space-y-2">
            <h1 className="font-main text-2xl font-bold text-foreground">
              Sign in
            </h1>
            <p className="text-sm text-muted-foreground">
              Welcome back. Sign in to your Kojobot account.
            </p>
          </div>

          <KojoButton
            type="button"
            variant="secondary"
            size="lg"
            className="w-full"
            onClick={handleGoogle}
            disabled={googleLoading}
          >
            {googleLoading ? (
              <Loader2 className="animate-spin" />
            ) : (
              <GoogleIcon />
            )}
            Continue with Google
          </KojoButton>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-3 text-muted-foreground tracking-wider">
                or
              </span>
            </div>
          </div>

          <form onSubmit={handleEmailLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>
            <KojoButton type="submit" size="lg" className="w-full" disabled={loading}>
              {loading ? <Loader2 className="animate-spin" /> : null}
              Sign in
            </KojoButton>
          </form>

          <p className="text-center text-xs text-muted-foreground">
            Trouble signing in? Contact your branch admin.
          </p>
        </div>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden>
      <path
        fill="currentColor"
        d="M21.35 11.1H12v3.2h5.35c-.23 1.4-1.66 4.1-5.35 4.1-3.22 0-5.85-2.67-5.85-5.95s2.63-5.95 5.85-5.95c1.83 0 3.06.78 3.76 1.45l2.56-2.47C16.8 4.05 14.6 3 12 3 6.98 3 3 6.98 3 12s3.98 9 9 9c5.2 0 8.65-3.65 8.65-8.8 0-.6-.06-1.05-.13-1.5z"
      />
    </svg>
  );
}
