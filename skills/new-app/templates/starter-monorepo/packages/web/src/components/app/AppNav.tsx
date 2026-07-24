import { useState } from "react";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface NavItem {
  href: string;
  label: string;
  key: string;
}

// The sidebar is an island because the mobile drawer needs state. On md+ it is a static
// sidebar and the drawer machinery is inert; below md it slides in over a backdrop.
// Without this, small screens have NO way to navigate — the sidebar is simply hidden.
export function AppNav({
  items,
  active,
  appName,
}: {
  items: NavItem[];
  active?: string;
  appName: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Hamburger — floats over the topbar's reserved left padding. Hidden on md+. */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open menu"
        aria-expanded={open}
        className="fixed left-2.5 top-2.5 z-30 flex h-9 w-9 items-center justify-center rounded-md border border-border bg-card text-text-primary md:hidden"
      >
        <Menu size={19} strokeWidth={1.9} />
      </button>

      {/* Backdrop, mobile only */}
      {open && (
        <div
          onClick={() => setOpen(false)}
          aria-hidden="true"
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-[248px] shrink-0 flex-col bg-sidebar text-sidebar-foreground transition-transform duration-200 md:static md:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full md:translate-x-0",
        )}
      >
        <div className="flex h-14 items-center justify-between px-5">
          <a href="/dashboard" className="text-base font-semibold">
            {appName}
          </a>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close menu"
            className="flex h-8 w-8 items-center justify-center rounded-md md:hidden"
          >
            <X size={18} strokeWidth={1.9} />
          </button>
        </div>

        <nav className="flex-1 space-y-1 px-3">
          {items.map((n) => (
            <a
              key={n.key}
              href={n.href}
              onClick={() => setOpen(false)}
              className={cn(
                "block rounded-md px-3 py-2 text-sm transition-colors",
                active === n.key
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
              )}
            >
              {n.label}
            </a>
          ))}
        </nav>
      </aside>
    </>
  );
}
