import { useEffect, useState } from "react";
import { api, ApiError, API_BASE, type Item } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

const STATUS_VARIANT: Record<Item["status"], BadgeProps["variant"]> = {
  done: "positive",
  failed: "critical",
  processing: "active",
  pending: "secondary",
};

export function ItemDetail({ id }: { id: string }) {
  const [item, setItem] = useState<Item | null>(null);
  const [notFound, setNotFound] = useState(false);

  async function load() {
    try {
      setItem(await api.getItem(id));
    } catch (e) {
      if (e instanceof ApiError && e.status === 404) setNotFound(true);
      else if (e instanceof ApiError && e.status === 401) window.location.href = "/login";
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Poll while the job runs.
  useEffect(() => {
    if (!item || (item.status !== "pending" && item.status !== "processing")) return;
    const t = setInterval(load, 1500);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item]);

  async function del() {
    await api.deleteItem(id).catch(() => {});
    window.location.href = "/dashboard";
  }

  if (notFound)
    return (
      <p className="text-sm text-text-secondary">
        Item not found.{" "}
        <a href="/dashboard" className="underline">
          Back to dashboard
        </a>
      </p>
    );
  if (!item) return <p className="text-sm text-text-secondary">Loading…</p>;

  const running = item.status === "pending" || item.status === "processing";

  return (
    <div className="max-w-2xl space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">{item.title}</h2>
        <Badge variant={STATUS_VARIANT[item.status]}>{item.status}</Badge>
      </div>

      {running && (
        <Card className="p-4">
          <div className="mb-2 text-sm text-text-secondary">{item.progressMessage ?? "Working…"}</div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-surface-muted">
            <div className="h-full bg-primary transition-all" style={{ width: `${item.progress}%` }} />
          </div>
        </Card>
      )}

      {item.status === "failed" && (
        <Card className="p-4 text-sm text-[var(--signal-critical)]">Failed: {item.errorMessage ?? "unknown error"}</Card>
      )}

      {item.status === "done" && item.resultKey && (
        <Card className="space-y-3 p-4">
          <p className="text-sm text-text-secondary">Your result is ready.</p>
          {/* Browser navigation to the file proxy — uses API_BASE, not the fetch client. */}
          <Button asChild>
            <a href={`${API_BASE}/files/${item.resultKey}`} target="_blank" rel="noreferrer">
              Download result
            </a>
          </Button>
        </Card>
      )}

      <Button variant="ghost" size="sm" onClick={del}>
        Delete
      </Button>
    </div>
  );
}
