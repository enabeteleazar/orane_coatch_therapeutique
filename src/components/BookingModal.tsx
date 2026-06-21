import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CalendarDays, ChevronLeft, ChevronRight, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type BookingSlot = {
  start: string;
  end: string;
  startLabel: string;
  endLabel: string;
  status: "available" | "reserved";
};

type BookingDay = {
  date: string;
  label: string;
  slots: BookingSlot[];
};

type AvailabilityResponse = {
  calendarName: string;
  timeZone: string;
  weekStart: string;
  days: BookingDay[];
};

type BookingModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

function toDateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function getMonday(date: Date) {
  const copy = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = copy.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  copy.setUTCDate(copy.getUTCDate() + diff);

  return toDateKey(copy);
}

function addDays(dateKey: string, days: number) {
  const [year, month, day] = dateKey.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + days));

  return toDateKey(date);
}

function formatWeekRange(weekStart: string) {
  const [year, month, day] = weekStart.split("-").map(Number);
  const start = new Date(Date.UTC(year, month - 1, day, 12));
  const end = new Date(Date.UTC(year, month - 1, day + 6, 12));
  const formatter = new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "short",
  });

  return `${formatter.format(start)} - ${formatter.format(end)}`;
}

export function BookingModal({ isOpen, onClose }: BookingModalProps) {
  const [weekStart, setWeekStart] = useState(() => getMonday(new Date()));
  const [availability, setAvailability] = useState<AvailabilityResponse | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<BookingSlot | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [website, setWebsite] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const weekRange = useMemo(() => formatWeekRange(weekStart), [weekStart]);

  async function loadAvailability(targetWeekStart = weekStart) {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/bookings/availability?weekStart=${encodeURIComponent(targetWeekStart)}`,
      );
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          payload?.error || "Les disponibilités n'ont pas pu être chargées.",
        );
      }

      setAvailability(payload);
      setSelectedSlot(null);
    } catch (requestError) {
      setAvailability(null);
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Les disponibilités n'ont pas pu être chargées.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (isOpen) {
      void loadAvailability();
    }
  }, [isOpen, weekStart]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedSlot) {
      setError("Veuillez sélectionner un créneau disponible.");
      return;
    }

    setSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          phone,
          website,
          start: selectedSlot.start,
          end: selectedSlot.end,
        }),
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(payload?.error || "La réservation n'a pas pu être validée.");
      }

      setSuccess("Votre séance est réservée. Vous serez recontacté si besoin.");
      setName("");
      setPhone("");
      setWebsite("");
      await loadAvailability();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "La réservation n'a pas pu être validée.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  const goToPreviousWeek = () => {
    setSuccess(null);
    setWeekStart((value) => addDays(value, -7));
  };

  const goToNextWeek = () => {
    setSuccess(null);
    setWeekStart((value) => addDays(value, 7));
  };

  return (
    <AnimatePresence>
      {isOpen ? (
        <motion.div
          role="presentation"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-foreground/40 px-3 py-4 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Calendrier de réservation"
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="relative max-h-[calc(100dvh-2rem)] w-full max-w-6xl overflow-y-auto rounded-2xl border border-border/50 bg-card shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="sticky top-0 z-10 border-b border-border/50 bg-card/95 px-5 py-4 backdrop-blur md:px-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="mb-1 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-primary">
                    <CalendarDays className="h-4 w-4" />
                    Disponibilités
                  </p>
                  <h3 className="font-serif text-2xl text-foreground md:text-3xl">
                    Réserver une séance
                  </h3>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label="Fermer le calendrier"
                  className="rounded-full"
                  onClick={onClose}
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
            </div>

            <div className="space-y-6 p-5 md:p-6">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-sm text-foreground/65">Calendrier rdv-coach</p>
                  <p className="text-lg font-semibold text-foreground">
                    Semaine du {weekRange}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    aria-label="Semaine précédente"
                    className="rounded-full"
                    onClick={goToPreviousWeek}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    aria-label="Semaine suivante"
                    className="rounded-full"
                    onClick={goToNextWeek}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="flex flex-wrap gap-3 text-sm text-foreground/70">
                <span className="inline-flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full bg-emerald-500" />
                  Disponible
                </span>
                <span className="inline-flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full bg-orange-400" />
                  Déjà réservé
                </span>
              </div>

              {error ? (
                <p role="alert" className="rounded-xl bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive">
                  {error}
                </p>
              ) : null}

              {success ? (
                <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
                  {success}
                </p>
              ) : null}

              {loading ? (
                <div className="flex min-h-64 items-center justify-center rounded-2xl border border-border/50 bg-muted/30">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : (
                <div className="grid gap-3 md:grid-cols-7">
                  {(availability?.days ?? []).map((day) => (
                    <div
                      key={day.date}
                      className="rounded-2xl border border-border/50 bg-background p-3"
                    >
                      <div className="mb-3 border-b border-border/40 pb-2">
                        <p className="font-serif text-base font-medium text-foreground">
                          {day.label}
                        </p>
                      </div>
                      <div className="space-y-2">
                        {day.slots.length > 0 ? (
                          day.slots.map((slot) => {
                            const isSelected = selectedSlot?.start === slot.start;
                            const isAvailable = slot.status === "available";

                            return (
                              <button
                                key={slot.start}
                                type="button"
                                disabled={!isAvailable}
                                onClick={() => {
                                  setSelectedSlot(slot);
                                  setSuccess(null);
                                  setError(null);
                                }}
                                className={cn(
                                  "w-full rounded-xl border px-2 py-3 text-left text-sm font-medium transition-all",
                                  isAvailable
                                    ? "border-emerald-200 bg-emerald-50 text-emerald-900 hover:-translate-y-0.5 hover:border-emerald-400 hover:shadow-sm"
                                    : "cursor-not-allowed border-orange-200 bg-orange-50 text-orange-800 opacity-85",
                                  isSelected && "ring-2 ring-emerald-500",
                                )}
                              >
                                {slot.startLabel} - {slot.endLabel}
                              </button>
                            );
                          })
                        ) : (
                          <p className="rounded-xl bg-muted/50 px-3 py-4 text-center text-sm text-foreground/50">
                            Aucun créneau
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <form
                onSubmit={handleSubmit}
                className="grid gap-4 rounded-2xl border border-border/50 bg-background p-4 md:grid-cols-[1fr_1fr_auto] md:items-end"
              >
                <input
                  type="text"
                  tabIndex={-1}
                  autoComplete="off"
                  className="hidden"
                  aria-hidden="true"
                  value={website}
                  onChange={(event) => setWebsite(event.target.value)}
                />
                <div className="space-y-2">
                  <Label htmlFor="booking-name">Nom complet</Label>
                  <Input
                    id="booking-name"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="Marie Dupont"
                    className="rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="booking-phone">Téléphone</Label>
                  <Input
                    id="booking-phone"
                    type="tel"
                    value={phone}
                    onChange={(event) => setPhone(event.target.value)}
                    placeholder="06 12 34 56 78"
                    className="rounded-xl"
                  />
                </div>
                <Button
                  type="submit"
                  className="rounded-full px-6"
                  disabled={!selectedSlot || submitting}
                >
                  {submitting ? "Validation..." : "Valider"}
                </Button>
              </form>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
