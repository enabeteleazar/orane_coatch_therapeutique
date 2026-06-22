import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { ArrowLeft, Check, Pencil, Plus, Power, RefreshCw, Save, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type PricingPlan = {
  id: number;
  title: string;
  subtitle: string;
  description: string;
  price_cents: number;
  currency: string;
  duration_minutes: number | null;
  formula_type: string;
  features: string[];
  is_active: boolean;
  display_order: number;
};

type PricingForm = {
  title: string;
  subtitle: string;
  description: string;
  priceEuros: string;
  currency: string;
  durationMinutes: string;
  formulaType: string;
  features: string;
  isActive: boolean;
  displayOrder: string;
};

const emptyForm: PricingForm = {
  title: "",
  subtitle: "",
  description: "",
  priceEuros: "",
  currency: "EUR",
  durationMinutes: "",
  formulaType: "session",
  features: "",
  isActive: true,
  displayOrder: "0",
};

type AdminPricingPlansProps = {
  onBackToMenu?: () => void;
  adminPassword?: string;
  onLogout?: () => void;
};

function getStoredPassword() {
  return window.sessionStorage.getItem("coach_admin_password") ?? "";
}

function formatPrice(priceCents: number, currency: string) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: currency || "EUR",
    maximumFractionDigits: priceCents % 100 === 0 ? 0 : 2,
  }).format(priceCents / 100);
}

function centsToEuros(priceCents: number) {
  return priceCents % 100 === 0
    ? String(priceCents / 100)
    : (priceCents / 100).toFixed(2);
}

function planToForm(plan: PricingPlan): PricingForm {
  return {
    title: plan.title,
    subtitle: plan.subtitle ?? "",
    description: plan.description ?? "",
    priceEuros: centsToEuros(plan.price_cents),
    currency: plan.currency || "EUR",
    durationMinutes: plan.duration_minutes === null ? "" : String(plan.duration_minutes),
    formulaType: plan.formula_type ?? "",
    features: (plan.features ?? []).join("\n"),
    isActive: plan.is_active,
    displayOrder: String(plan.display_order ?? 0),
  };
}

function eurosToCents(value: string) {
  const amount = Number(value.replace(",", "."));

  if (!Number.isFinite(amount) || amount < 0) {
    return null;
  }

  return Math.round(amount * 100);
}

function formToPayload(form: PricingForm) {
  const priceCents = eurosToCents(form.priceEuros);

  if (priceCents === null) {
    throw new Error("Le prix est invalide.");
  }

  return {
    title: form.title,
    subtitle: form.subtitle,
    description: form.description,
    price_cents: priceCents,
    currency: form.currency,
    duration_minutes: form.durationMinutes === "" ? null : Number(form.durationMinutes),
    formula_type: form.formulaType,
    features: form.features
      .split(/\r?\n/)
      .map((feature) => feature.trim().replace(/^[-*]\s*/, ""))
      .filter(Boolean),
    is_active: form.isActive,
    display_order: Number(form.displayOrder || 0),
  };
}

export default function AdminPricingPlans({
  onBackToMenu,
  adminPassword,
  onLogout,
}: AdminPricingPlansProps) {
  const [password, setPassword] = useState(() => adminPassword ?? getStoredPassword());
  const [authenticated, setAuthenticated] = useState(Boolean(adminPassword ?? getStoredPassword()));
  const [plans, setPlans] = useState<PricingPlan[]>([]);
  const [newPlan, setNewPlan] = useState<PricingForm>(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingPlan, setEditingPlan] = useState<PricingForm>(emptyForm);
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

  async function loadPlans() {
    setLoading(true);
    setError(null);

    try {
      const payload = await adminFetch("/api/admin/pricing-plans");
      setPlans(payload.plans ?? []);
      setAuthenticated(true);
      window.sessionStorage.setItem("coach_admin_password", requestPassword);
    } catch (requestError) {
      setPlans([]);
      setAuthenticated(false);
      window.sessionStorage.removeItem("coach_admin_password");
      onLogout?.();
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Les tarifs n'ont pas pu être chargés.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (authenticated && requestPassword) {
      void loadPlans();
    }
  }, []);

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await loadPlans();
  }

  async function createPlan(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);

    try {
      await adminFetch("/api/admin/pricing-plans", {
        method: "POST",
        body: JSON.stringify(formToPayload(newPlan)),
      });
      setNewPlan(emptyForm);
      setMessage("Tarif créé.");
      await loadPlans();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Le tarif n'a pas pu être créé.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function savePlan(id: number, form: PricingForm) {
    setSaving(true);
    setError(null);
    setMessage(null);

    try {
      await adminFetch(`/api/admin/pricing-plans/${id}`, {
        method: "PATCH",
        body: JSON.stringify(formToPayload(form)),
      });
      setEditingId(null);
      setMessage("Tarif mis à jour.");
      await loadPlans();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Le tarif n'a pas pu être modifié.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function togglePlan(plan: PricingPlan) {
    const form = planToForm(plan);
    await savePlan(plan.id, { ...form, isActive: !plan.is_active });
  }

  function startEditing(plan: PricingPlan) {
    setEditingId(plan.id);
    setEditingPlan(planToForm(plan));
    setError(null);
    setMessage(null);
  }

  function updateNewPlan(field: keyof PricingForm, value: string | boolean) {
    setNewPlan((form) => ({ ...form, [field]: value }));
  }

  function updateEditingPlan(field: keyof PricingForm, value: string | boolean) {
    setEditingPlan((form) => ({ ...form, [field]: value }));
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
            <p className="mt-1 text-sm text-muted-foreground">Gestion des tarifs</p>
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
            <h1 className="text-3xl">Tarifs et formules</h1>
          </div>
          <div className="flex flex-wrap gap-2">
            {onBackToMenu ? (
              <Button type="button" variant="outline" onClick={onBackToMenu}>
                <ArrowLeft className="h-4 w-4" />
                Menu
              </Button>
            ) : null}
            <Button type="button" variant="outline" onClick={loadPlans} disabled={loading}>
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

        <form onSubmit={createPlan} className="grid gap-4 rounded-lg border border-border bg-card p-4">
          <div className="grid gap-4 md:grid-cols-4">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="new-title">Titre</Label>
              <Input
                id="new-title"
                value={newPlan.title}
                onChange={(event) => updateNewPlan("title", event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-subtitle">Sous-titre</Label>
              <Input
                id="new-subtitle"
                value={newPlan.subtitle}
                onChange={(event) => updateNewPlan("subtitle", event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-formula">Type</Label>
              <Input
                id="new-formula"
                value={newPlan.formulaType}
                onChange={(event) => updateNewPlan("formulaType", event.target.value)}
              />
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-5">
            <div className="space-y-2">
              <Label htmlFor="new-price">Prix en euros</Label>
              <Input
                id="new-price"
                type="number"
                min="0"
                step="0.01"
                value={newPlan.priceEuros}
                onChange={(event) => updateNewPlan("priceEuros", event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-currency">Devise</Label>
              <Input
                id="new-currency"
                value={newPlan.currency}
                onChange={(event) => updateNewPlan("currency", event.target.value.toUpperCase())}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-duration">Durée minutes</Label>
              <Input
                id="new-duration"
                type="number"
                min="0"
                value={newPlan.durationMinutes}
                onChange={(event) => updateNewPlan("durationMinutes", event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-order">Ordre</Label>
              <Input
                id="new-order"
                type="number"
                min="0"
                value={newPlan.displayOrder}
                onChange={(event) => updateNewPlan("displayOrder", event.target.value)}
              />
            </div>
            <label className="flex min-h-9 items-end gap-2 pb-2 text-sm font-medium">
              <input
                type="checkbox"
                checked={newPlan.isActive}
                onChange={(event) => updateNewPlan("isActive", event.target.checked)}
                className="h-4 w-4"
              />
              Actif
            </label>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="new-description">Description</Label>
              <Textarea
                id="new-description"
                value={newPlan.description}
                onChange={(event) => updateNewPlan("description", event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-features">Points inclus</Label>
              <Textarea
                id="new-features"
                value={newPlan.features}
                onChange={(event) => updateNewPlan("features", event.target.value)}
              />
            </div>
          </div>
          <div className="flex justify-end">
            <Button type="submit" disabled={saving}>
              <Plus className="h-4 w-4" />
              Créer
            </Button>
          </div>
        </form>

        <div className="overflow-x-auto rounded-lg border border-border bg-card">
          <table className="w-full min-w-[1100px] border-collapse text-sm">
            <thead className="bg-muted text-left text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Ordre</th>
                <th className="px-4 py-3 font-medium">Formule</th>
                <th className="px-4 py-3 font-medium">Prix</th>
                <th className="px-4 py-3 font-medium">Durée</th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Statut</th>
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {plans.map((plan) => {
                const isEditing = editingId === plan.id;

                return (
                  <tr key={plan.id} className="border-t border-border align-top">
                    <td className="px-4 py-3">
                      {isEditing ? (
                        <Input
                          type="number"
                          min="0"
                          value={editingPlan.displayOrder}
                          onChange={(event) => updateEditingPlan("displayOrder", event.target.value)}
                        />
                      ) : (
                        plan.display_order
                      )}
                    </td>
                    <td className="min-w-[360px] px-4 py-3">
                      {isEditing ? (
                        <div className="grid gap-3">
                          <Input
                            value={editingPlan.title}
                            onChange={(event) => updateEditingPlan("title", event.target.value)}
                          />
                          <Input
                            value={editingPlan.subtitle}
                            onChange={(event) => updateEditingPlan("subtitle", event.target.value)}
                          />
                          <Textarea
                            value={editingPlan.description}
                            onChange={(event) => updateEditingPlan("description", event.target.value)}
                          />
                          <Textarea
                            value={editingPlan.features}
                            onChange={(event) => updateEditingPlan("features", event.target.value)}
                          />
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <div>
                            <p className="font-medium text-foreground">{plan.title}</p>
                            {plan.subtitle ? (
                              <p className="text-muted-foreground">{plan.subtitle}</p>
                            ) : null}
                          </div>
                          {plan.description ? (
                            <p className="text-muted-foreground">{plan.description}</p>
                          ) : null}
                          {plan.features.length > 0 ? (
                            <ul className="list-disc space-y-1 pl-4 text-muted-foreground">
                              {plan.features.map((feature) => (
                                <li key={feature}>{feature}</li>
                              ))}
                            </ul>
                          ) : null}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {isEditing ? (
                        <div className="grid min-w-36 gap-2">
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={editingPlan.priceEuros}
                            onChange={(event) => updateEditingPlan("priceEuros", event.target.value)}
                          />
                          <Input
                            value={editingPlan.currency}
                            onChange={(event) =>
                              updateEditingPlan("currency", event.target.value.toUpperCase())
                            }
                          />
                        </div>
                      ) : (
                        formatPrice(plan.price_cents, plan.currency)
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {isEditing ? (
                        <Input
                          type="number"
                          min="0"
                          value={editingPlan.durationMinutes}
                          onChange={(event) => updateEditingPlan("durationMinutes", event.target.value)}
                        />
                      ) : plan.duration_minutes ? (
                        `${plan.duration_minutes} min`
                      ) : (
                        "-"
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {isEditing ? (
                        <Input
                          value={editingPlan.formulaType}
                          onChange={(event) => updateEditingPlan("formulaType", event.target.value)}
                        />
                      ) : (
                        plan.formula_type || "-"
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {isEditing ? (
                        <label className="inline-flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={editingPlan.isActive}
                            onChange={(event) => updateEditingPlan("isActive", event.target.checked)}
                            className="h-4 w-4"
                          />
                          Actif
                        </label>
                      ) : (
                        <span
                          className={cn(
                            "inline-flex rounded-full px-2.5 py-1 text-xs font-semibold",
                            plan.is_active
                              ? "bg-blue-50 text-blue-900"
                              : "bg-muted text-muted-foreground",
                          )}
                        >
                          {plan.is_active ? "Actif" : "Inactif"}
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
                              onClick={() => savePlan(plan.id, editingPlan)}
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
                              onClick={() => startEditing(plan)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              type="button"
                              size="icon"
                              variant="outline"
                              aria-label={plan.is_active ? "Désactiver" : "Activer"}
                              disabled={saving}
                              onClick={() => void togglePlan(plan)}
                            >
                              <Power className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {plans.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                    Aucun tarif.
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
