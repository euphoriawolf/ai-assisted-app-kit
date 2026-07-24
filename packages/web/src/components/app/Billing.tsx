import { useEffect, useState } from "react";
import { api, API_BASE } from "@/lib/api";
import { FEATURES } from "@app/shared/constants";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

interface Pack {
  id: string;
  label: string;
  price: number;
  totalCredits: number;
  units: number;
  tagline: string;
  popular: boolean;
}

export function Billing() {
  const [balance, setBalance] = useState<number | null>(null);
  const [packs, setPacks] = useState<Pack[]>([]);
  const [payg, setPayg] = useState({ min: 5, max: 10000, creditsPerDollar: 5 });
  const [dollars, setDollars] = useState(5);

  useEffect(() => {
    api
      .credits()
      .then((c) => setBalance(c.balance))
      .catch(() => {});
    api
      .packs()
      .then((p) => {
        setPacks(p.packs as unknown as Pack[]);
        setPayg(p.payg);
        setDollars(p.payg.min);
      })
      .catch(() => {});
  }, []);

  const credits = Math.floor(dollars * payg.creditsPerDollar);

  if (!FEATURES.billing.enabled) {
    return (
      <Card className="max-w-md p-6 text-sm text-text-secondary">
        Billing is not enabled for this app. Turn it on in <code>packages/shared/src/constants/features.ts</code> and
        wire a payment adapter under <code>packages/api/src/billing</code>.
      </Card>
    );
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div className="text-sm text-text-secondary">
        Balance: <span className="font-semibold text-text-primary">{balance ?? "…"} credits</span>
      </div>

      <Card className="space-y-3 p-6">
        <h3 className="font-semibold">Pay as you go</h3>
        <div className="flex items-center gap-3">
          <span className="text-text-secondary">$</span>
          <Input
            type="number"
            min={payg.min}
            max={payg.max}
            value={dollars}
            onChange={(e) => setDollars(Number(e.target.value))}
            className="w-28"
          />
          <span className="text-sm text-text-secondary">= {credits} credits</span>
        </div>
        {/* Checkout is a browser navigation to the API origin — uses API_BASE. */}
        <Button asChild disabled={dollars < payg.min}>
          <a href={`${API_BASE}/api/v1/checkout?amount=${Math.round(dollars * 100)}`}>Buy {credits} credits</a>
        </Button>
      </Card>

      <div className="grid gap-4 sm:grid-cols-3">
        {packs.map((p) => (
          <Card key={p.id} className={`space-y-2 p-5 ${p.popular ? "border-border-strong" : ""}`}>
            <div className="font-semibold">{p.label}</div>
            <div className="text-2xl font-bold">${p.price}</div>
            <div className="text-sm text-text-secondary">
              {p.totalCredits} credits · {p.units} items
            </div>
            <div className="text-xs text-[var(--signal-positive)]">{p.tagline}</div>
            <Button asChild variant={p.popular ? "default" : "outline"} className="w-full">
              <a href={`${API_BASE}/api/v1/checkout?pack=${p.id}`}>Buy</a>
            </Button>
          </Card>
        ))}
      </div>
    </div>
  );
}
