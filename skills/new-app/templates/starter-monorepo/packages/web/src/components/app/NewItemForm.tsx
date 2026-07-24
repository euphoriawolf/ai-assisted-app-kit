import { useState } from "react";
import { toast } from "sonner";
import { api, ApiError } from "@/lib/api";
import { FEATURES } from "@app/shared/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";

export function NewItemForm() {
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const r = await api.createItem(title);
      window.location.href = `/dashboard/items/${r.id}`;
    } catch (e) {
      if (e instanceof ApiError && e.status === 402) toast.error("Not enough credits. Top up in Billing.");
      else if (e instanceof ApiError && e.status === 401) window.location.href = "/login";
      else toast.error("Could not create item.");
      setLoading(false);
    }
  }

  return (
    <Card className="max-w-md p-6">
      <form onSubmit={submit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="title">Title</Label>
          <Input id="title" required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="My first item" />
        </div>
        <Button type="submit" disabled={loading || !title.trim()}>
          {loading ? "Creating…" : "Create item"}
        </Button>
        <p className="text-xs text-text-tertiary">
          {FEATURES.credits.enabled && FEATURES.credits.gateCreation ? "Creating an item charges credits and runs" : "Creating an item runs"}{" "}
          the example job (start → process → finalize).
        </p>
      </form>
    </Card>
  );
}
