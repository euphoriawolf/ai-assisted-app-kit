import { useEffect, useState } from "react";
import { api, ApiError, type Item } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { parseTimestamp } from "@/lib/date";

// Read with  below: a status added server-side later must not render an
// undefined variant. Never index a status map without a fallback.
const STATUS_VARIANT: Record<string, BadgeProps["variant"]> = {
  done: "positive",
  failed: "critical",
  processing: "active",
  pending: "secondary",
};

export function Dashboard() {
  const [items, setItems] = useState<Item[] | null>(null);

  async function load() {
    try {
      const r = await api.listItems();
      setItems(r.items);
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) window.location.href = "/login";
    }
  }

  useEffect(() => {
    load();
  }, []);

  // Poll while any item is still running.
  useEffect(() => {
    if (!items?.some((i) => i.status === "pending" || i.status === "processing")) return;
    const t = setInterval(load, 2000);
    return () => clearInterval(t);
  }, [items]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Your items</h2>
        <Button asChild>
          <a href="/dashboard/new">New item</a>
        </Button>
      </div>

      {items === null ? (
        <p className="text-sm text-text-secondary">Loading…</p>
      ) : items.length === 0 ? (
        <Card className="p-8 text-center text-sm text-text-secondary">
          No items yet. Create your first one to run the example job.
        </Card>
      ) : (
        <div className="space-y-2">
          {items.map((i) => (
            <a key={i.id} href={`/dashboard/items/${i.id}`} className="block">
              <Card className="flex items-center justify-between p-4 transition-colors hover:border-border-strong">
                <div>
                  <div className="font-medium">{i.title}</div>
                  <div className="text-xs text-text-tertiary">{parseTimestamp(i.createdAt)?.toLocaleString()}</div>
                </div>
                <Badge variant={STATUS_VARIANT[i.status] ?? "secondary"}>{i.status}</Badge>
              </Card>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
