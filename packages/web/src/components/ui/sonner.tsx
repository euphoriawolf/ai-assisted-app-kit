import { Toaster as Sonner } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

export function Toaster(props: ToasterProps) {
  return (
    <Sonner
      position="bottom-right"
      toastOptions={{
        classNames: {
          toast: "border border-border bg-card text-card-foreground shadow-md rounded-md",
        },
      }}
      {...props}
    />
  );
}
