import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CalendarDays, ChevronDown, ChevronRight, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type BookingSlot = {
  id: number;
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
  source: "database";
  calendarName: string;
  timeZone: string;
  weekStart: string;
  days: BookingDay[];
};

type BookingModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

export function BookingModal({ isOpen, onClose }: BookingModalProps) {
  const [availability, setAvailability] = useState<AvailabilityResponse | null>(null);
  const [openDates, setOpenDates] = useState<Set<string>>(new Set());
  const [selectedSlot, setSelectedSlot] = useState<BookingSlot | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [website, setWebsite] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const availableSlotsCount = useMemo(
    () =>
      (availability?.days ?? []).reduce(
        (total, day) =>
          total + day.slots.filter((slot) => slot.status === "available").length,
        0,
      ),
    [availability],
  );

  async function loadAvailability() {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/bookings/availability");
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          payload?.error || "Les disponibilités n'ont pas pu être chargées.",
        );
      }

      setAvailability(payload);
      setOpenDates(payload?.days?.[0]?.date ? new Set([payload.days[0].date]) : new Set());
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
  }, [isOpen]);

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

  function toggleDate(date: string) {
    setOpenDates((dates) => {
      const nextDates = new Set(dates);

      if (nextDates.has(date)) {
        nextDates.delete(date);
      } else {
        nextDates.add(date);
      }

      return nextDates;
    });
  }

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
                  <p className="text-sm text-foreground/65">
                    Calendrier {availability?.calendarName ?? "rdv-coach"}
                  </p>
                  <p className="text-lg font-semibold text-foreground">
                    {availableSlotsCount} créneau{availableSlotsCount > 1 ? "x" : ""} disponible
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-3 text-sm text-foreground/70">
                <span className="inline-flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full bg-blue-500" />
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
                <div className="space-y-3">
                  {(availability?.days ?? []).map((day) => (
                    <div
                      key={day.date}
                      className="overflow-hidden rounded-xl border border-border/50 bg-background"
                    >
                      <button
                        type="button"
                        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
                        onClick={() => toggleDate(day.date)}
                        aria-expanded={openDates.has(day.date)}
                      >
                        <span className="font-serif text-base font-medium text-foreground">
                          {day.label}
                        </span>
                        <span className="flex items-center gap-3 text-sm text-muted-foreground">
                          {day.slots.length} horaire{day.slots.length > 1 ? "s" : ""}
                          {openDates.has(day.date) ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </span>
                      </button>
                      {openDates.has(day.date) ? (
                        <div className="grid gap-2 border-t border-border/40 p-3 sm:grid-cols-2 md:grid-cols-4">
                          {day.slots.map((slot) => {
                              const isSelected = selectedSlot?.start === slot.start;
                              const isAvailable = slot.status === "available";

                              return (
                                <button
                                  key={slot.id}
                                  type="button"
                                  disabled={!isAvailable}
                                  onClick={() => {
                                    setSelectedSlot(slot);
                                    setSuccess(null);
                                    setError(null);
                                  }}
                                  className={cn(
                                    "min-h-12 rounded-lg border px-3 py-2 text-center text-sm font-semibold transition-all",
                                    isAvailable
                                      ? "border-blue-200 bg-blue-50 text-blue-950 hover:-translate-y-0.5 hover:border-blue-500 hover:shadow-sm"
                                      : "cursor-not-allowed border-orange-200 bg-orange-50 text-orange-900 opacity-85",
                                    isSelected && "ring-2 ring-blue-500",
                                  )}
                                >
                                  {slot.startLabel} - {slot.endLabel}
                                </button>
                              );
                            })}
                        </div>
                      ) : null}
                    </div>
                  ))}
                  {(availability?.days ?? []).length === 0 ? (
                    <p className="rounded-xl bg-muted/50 px-4 py-8 text-center text-sm text-foreground/60">
                      Aucun créneau disponible.
                    </p>
                  ) : null}
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
