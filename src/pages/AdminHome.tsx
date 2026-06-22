import { CalendarDays, Tags } from "lucide-react";
import { Button } from "@/components/ui/button";

type AdminHomeProps = {
  onSelectSlots: () => void;
  onSelectPricing: () => void;
};

export default function AdminHome({ onSelectSlots, onSelectPricing }: AdminHomeProps) {
  return (
    <main className="min-h-dvh bg-background px-4 py-10 text-foreground">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-8">
        <header className="border-b border-border pb-5">
          <p className="text-sm font-medium uppercase text-primary">Administration</p>
          <h1 className="mt-1 text-3xl">Menu principal</h1>
        </header>

        <nav className="grid gap-4 sm:grid-cols-2" aria-label="Menu admin">
          <Button
            type="button"
            size="lg"
            className="min-h-24 justify-start px-5 text-left"
            onClick={onSelectSlots}
          >
            <CalendarDays className="h-5 w-5" />
            <span className="text-base">Créneaux</span>
          </Button>
          <Button
            type="button"
            size="lg"
            variant="secondary"
            className="min-h-24 justify-start px-5 text-left"
            onClick={onSelectPricing}
          >
            <Tags className="h-5 w-5" />
            <span className="text-base">Tarifs</span>
          </Button>
        </nav>
      </div>
    </main>
  );
}
