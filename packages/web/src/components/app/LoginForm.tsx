import { useState } from "react";
import { toast } from "sonner";
import { api, API_BASE } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await api.sendMagicLink(email, "/dashboard");
      setSent(true);
      toast.success("Check your email for a sign-in link.");
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-sm space-y-5">
      {/* Browser navigation to the API origin — MUST use API_BASE (dev proxy is fetch-only). */}
      <Button asChild variant="outline" className="w-full">
        <a href={`${API_BASE}/api/v1/auth/google?next=/dashboard`}>Continue with Google</a>
      </Button>

      <div className="flex items-center gap-3 text-xs text-text-tertiary">
        <span className="h-px flex-1 bg-border" />
        or
        <span className="h-px flex-1 bg-border" />
      </div>

      <form onSubmit={submit} className="space-y-3">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
        />
        <Button type="submit" className="w-full" disabled={loading || sent}>
          {sent ? "Link sent — check your email" : "Email me a sign-in link"}
        </Button>
      </form>
    </div>
  );
}
