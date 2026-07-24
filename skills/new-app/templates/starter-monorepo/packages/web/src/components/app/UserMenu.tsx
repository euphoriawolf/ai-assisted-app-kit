import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { FEATURES } from "@app/shared/constants";
import { Button } from "@/components/ui/button";

export function UserMenu() {
  const [email, setEmail] = useState<string | null>(null);
  const [balance, setBalance] = useState<number | null>(null);

  useEffect(() => {
    api
      .me()
      .then((u) => setEmail(u.email))
      .catch((e) => {
        if (e instanceof ApiError && e.status === 401) window.location.href = "/login";
      });
    // Credits are optional — only fetch/show a balance when the feature is on.
    if (FEATURES.credits.enabled) {
      api
        .credits()
        .then((c) => setBalance(c.balance))
        .catch(() => {});
    }
  }, []);

  async function logout() {
    await api.logout().catch(() => {});
    window.location.href = "/login";
  }

  return (
    <div className="flex items-center gap-3 text-sm">
      {balance !== null && (
        <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-secondary-foreground">
          {balance} credits
        </span>
      )}
      {email && <span className="hidden text-text-secondary sm:inline">{email}</span>}
      <Button variant="ghost" size="sm" onClick={logout}>
        Sign out
      </Button>
    </div>
  );
}
