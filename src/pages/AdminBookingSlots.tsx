import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { ArrowLeft, CalendarPlus, Check, Pencil, Power, RefreshCw, Save, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type AdminSlot = {
  id: number;
  date: string;
  startTime: string;
  endTime: string;
  enabled: boolean;
};

type SlotForm = {
  date: string;
  startTime: string;
  endTime: string;
  enabled: boolean;
};

const emptyForm: SlotForm = {
  date: "",
  startTime: "",
  endTime: "",
  enabled: true,
};

type AdminBookingSlotsProps = {
  onBackToMenu?: () => void;
  adminPassword?: string;
  onLogout?: () => void;
};

function getStoredPassword() {
  return window.sessionStorage.getItem("coach_admin_password") ?? "";
}

export default function AdminBookingSlots({
  onBackToMenu,
  adminPassword,
  onLogout,
}: AdminBookingSlotsProps) {
  const [password, setPassword] = useState(() => adminPassword ?? getStoredPassword());
  const [authenticated, setAuthenticated] = useState(Boolean(adminPassword ?? getStoredPassword()));
  const [slots, setSlots] = useState<AdminSlot[]>([]);
  const [newSlot, setNewSlot] = useState<SlotForm>(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingSlot, setEditingSlot] = useState<SlotForm>(emptyForm);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const requestPassword = adminPassword ?? password;

  async function adminFetch(path: string, init: RequestInit = {}) {
    const response = await fetch(path, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        "x-admin-password": requestPassword,
        ...(init.headers ?? {}),
      },
    });
    const payload = await response.json().catch(() => null);

    if (!response.ok) {
      throw new Error(payload?.error || "La requête admin a échoué.");
    }

    return payload;
  }

  async function loadSlots() {
    setLoading(true);
    setError(null);

    try {
      const payload = await adminFetch("/api/admin/booking-slots");
      setSlots(payload.slots ?? []);
      setAuthenticated(true);
      window.sessionStorage.setItem("coach_admin_password", requestPassword);
    } catch (requestError) {
      setSlots([]);
      setAuthenticated(false);
      window.sessionStorage.removeItem("coach_admin_password");
      onLogout?.();
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Les créneaux n'ont pas pu être chargés.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (authenticated && requestPassword) {
      void loadSlots();
    }
  }, []);

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await loadSlots();
  }

  async function createSlot(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);

    try {
      await adminFetch("/api/admin/booking-slots", {
        method: "POST",
        body: JSON.stringify(newSlot),
      });
      setNewSlot(emptyForm);
      setMessage("Créneau créé.");
      await loadSlots();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Le créneau n'a pas pu être créé.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function saveSlot(id: number, payload: SlotForm) {
    setSaving(true);
    setError(null);
    setMessage(null);

    try {
      await adminFetch(`/api/admin/booking-slots/${id}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      });
      setEditingId(null);
      setMessage("Créneau mis à jour.");
      await loadSlots();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Le créneau n'a pas pu être modifié.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function deleteSlot(id: number) {
    setSaving(true);
    setError(null);
    setMessage(null);

    try {
      await adminFetch(`/api/admin/booking-slots/${id}`, { method: "DELETE" });
      setMessage("Créneau supprimé.");
      await loadSlots();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Le créneau n'a pas pu être supprimé.",
      );
    } finally {
      setSaving(false);
    }
  }

  function startEditing(slot: AdminSlot) {
    setEditingId(slot.id);
    setEditingSlot({
      date: slot.date,
      startTime: slot.startTime,
      endTime: slot.endTime,
      enabled: slot.enabled,
    });
    setError(null);
    setMessage(null);
  }

  function handleLogout() {
    window.sessionStorage.removeItem("coach_admin_password");
    setAuthenticated(false);
    setPassword("");
    onLogout?.();
  }

  if (!authenticated) {
    return (
      <main className="min-h-dvh bg-background px-4 py-10 text-foreground">
        <form
          onSubmit={handleLogin}
          className="mx-auto grid w-full max-w-sm gap-4 rounded-lg border border-border bg-card p-5 shadow-sm"
        >
          <div>
            <h1 className="text-2xl">Administration</h1>
            <p className="mt-1 text-sm text-muted-foreground">Gestion des créneaux</p>
          </div>
          {onBackToMenu ? (
            <Button type="button" variant="outline" onClick={onBackToMenu}>
              <ArrowLeft className="h-4 w-4" />
              Menu
            </Button>
          ) : null}
          {error ? (
            <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          ) : null}
          <div className="space-y-2">
            <Label htmlFor="admin-password">Mot de passe</Label>
            <Input
              id="admin-password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
            />
          </div>
          <Button type="submit" disabled={!password || loading}>
            <Check className="h-4 w-4" />
            Entrer
          </Button>
        </form>
      </main>
    );
  }

  return (
    <main className="min-h-dvh bg-background px-4 py-8 text-foreground">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="flex flex-col gap-4 border-b border-border pb-5 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-medium uppercase text-primary">Administration</p>
            <h1 className="text-3xl">Créneaux de réservation</h1>
          </div>
          <div className="flex flex-wrap gap-2">
            {onBackToMenu ? (
              <Button type="button" variant="outline" onClick={onBackToMenu}>
                <ArrowLeft className="h-4 w-4" />
                Menu
              </Button>
            ) : null}
            <Button type="button" variant="outline" onClick={loadSlots} disabled={loading}>
              <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
              Actualiser
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                handleLogout();
              }}
            >
              <X className="h-4 w-4" />
              Sortir
            </Button>
          </div>
        </header>

        {error ? (
          <p role="alert" className="rounded-md bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive">
            {error}
          </p>
        ) : null}

        {message ? (
          <p role="status" className="rounded-md border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-medium text-blue-900">
            {message}
          </p>
        ) : null}

        <form
          onSubmit={createSlot}
          className="grid gap-4 rounded-lg border border-border bg-card p-4 md:grid-cols-[1fr_1fr_1fr_auto_auto] md:items-end"
        >
          <div className="space-y-2">
            <Label htmlFor="new-date">Date</Label>
            <Input
              id="new-date"
              type="date"
              value={newSlot.date}
              onChange={(event) => setNewSlot((slot) => ({ ...slot, date: event.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-start">Début</Label>
            <Input
              id="new-start"
              type="time"
              value={newSlot.startTime}
              onChange={(event) =>
                setNewSlot((slot) => ({ ...slot, startTime: event.target.value }))
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-end">Fin</Label>
            <Input
              id="new-end"
              type="time"
              value={newSlot.endTime}
              onChange={(event) =>
                setNewSlot((slot) => ({ ...slot, endTime: event.target.value }))
              }
            />
          </div>
          <label className="flex min-h-9 items-center gap-2 text-sm font-medium">
            <input
              type="checkbox"
              checked={newSlot.enabled}
              onChange={(event) =>
                setNewSlot((slot) => ({ ...slot, enabled: event.target.checked }))
              }
              className="h-4 w-4"
            />
            Actif
          </label>
          <Button type="submit" disabled={saving}>
            <CalendarPlus className="h-4 w-4" />
            Créer
          </Button>
        </form>

        <div className="overflow-x-auto rounded-lg border border-border bg-card">
          <table className="w-full min-w-[760px] border-collapse text-sm">
            <thead className="bg-muted text-left text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Début</th>
                <th className="px-4 py-3 font-medium">Fin</th>
                <th className="px-4 py-3 font-medium">Statut</th>
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {slots.map((slot) => {
                const isEditing = editingId === slot.id;
                const form = isEditing ? editingSlot : slot;

                return (
                  <tr key={slot.id} className="border-t border-border">
                    <td className="px-4 py-3">
                      {isEditing ? (
                        <Input
                          type="date"
                          value={editingSlot.date}
                          onChange={(event) =>
                            setEditingSlot((value) => ({ ...value, date: event.target.value }))
                          }
                        />
                      ) : (
                        slot.date
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {isEditing ? (
                        <Input
                          type="time"
                          value={editingSlot.startTime}
                          onChange={(event) =>
                            setEditingSlot((value) => ({
                              ...value,
                              startTime: event.target.value,
                            }))
                          }
                        />
                      ) : (
                        slot.startTime
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {isEditing ? (
                        <Input
                          type="time"
                          value={editingSlot.endTime}
                          onChange={(event) =>
                            setEditingSlot((value) => ({ ...value, endTime: event.target.value }))
                          }
                        />
                      ) : (
                        slot.endTime
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {isEditing ? (
                        <label className="inline-flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={editingSlot.enabled}
                            onChange={(event) =>
                              setEditingSlot((value) => ({
                                ...value,
                                enabled: event.target.checked,
                              }))
                            }
                            className="h-4 w-4"
                          />
                          Actif
                        </label>
                      ) : (
                        <span
                          className={cn(
                            "inline-flex rounded-full px-2.5 py-1 text-xs font-semibold",
                            slot.enabled
                              ? "bg-blue-50 text-blue-900"
                              : "bg-muted text-muted-foreground",
                          )}
                        >
                          {slot.enabled ? "Actif" : "Inactif"}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        {isEditing ? (
                          <>
                            <Button
                              type="button"
                              size="icon"
                              aria-label="Enregistrer"
                              disabled={saving}
                              onClick={() => saveSlot(slot.id, editingSlot)}
                            >
                              <Save className="h-4 w-4" />
                            </Button>
                            <Button
                              type="button"
                              size="icon"
                              variant="outline"
                              aria-label="Annuler"
                              onClick={() => setEditingId(null)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button
                              type="button"
                              size="icon"
                              variant="outline"
                              aria-label="Modifier"
                              onClick={() => startEditing(slot)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              type="button"
                              size="icon"
                              variant="outline"
                              aria-label={slot.enabled ? "Désactiver" : "Activer"}
                              disabled={saving}
                              onClick={() =>
                                saveSlot(slot.id, {
                                  date: form.date,
                                  startTime: form.startTime,
                                  endTime: form.endTime,
                                  enabled: !form.enabled,
                                })
                              }
                            >
                              <Power className="h-4 w-4" />
                            </Button>
                            <Button
                              type="button"
                              size="icon"
                              variant="destructive"
                              aria-label="Supprimer"
                              disabled={saving}
                              onClick={() => deleteSlot(slot.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {slots.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                    Aucun créneau.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
