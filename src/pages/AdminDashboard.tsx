import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Check } from "lucide-react";
import AdminBookingSlots from "@/pages/AdminBookingSlots";
import AdminHome from "@/pages/AdminHome";
import AdminPricingPlans from "@/pages/AdminPricingPlans";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type DashboardView = "menu" | "slots" | "pricing";

function getStoredPassword() {
  return window.sessionStorage.getItem("coach_admin_password") ?? "";
}

export default function AdminDashboard() {
  const [view, setView] = useState<DashboardView>("menu");
  const [password, setPassword] = useState(getStoredPassword);
  const [authenticated, setAuthenticated] = useState(false);
  const [checking, setChecking] = useState(Boolean(getStoredPassword()));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (window.location.pathname !== "/dashboard") {
      window.history.replaceState(null, "", "/dashboard");
    }
  }, []);

  async function verifyPassword(passwordToVerify: string) {
    const response = await fetch("/api/admin/session", {
      headers: {
        "Content-Type": "application/json",
        "x-admin-password": passwordToVerify,
      },
    });
    const payload = await response.json().catch(() => null);

    if (!response.ok) {
      throw new Error(payload?.error || "Accès admin non autorisé.");
    }

    if (payload?.ok !== true) {
      throw new Error("La réponse d'authentification est invalide.");
    }
  }

  useEffect(() => {
    const storedPassword = getStoredPassword();

    if (!storedPassword) {
      setChecking(false);
      return;
    }

    verifyPassword(storedPassword)
      .then(() => {
        setPassword(storedPassword);
        setAuthenticated(true);
      })
      .catch(() => {
        window.sessionStorage.removeItem("coach_admin_password");
        setPassword("");
        setAuthenticated(false);
      })
      .finally(() => setChecking(false));
  }, []);

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setChecking(true);
    setError(null);

    try {
      await verifyPassword(password);
      window.sessionStorage.setItem("coach_admin_password", password);
      setAuthenticated(true);
    } catch (requestError) {
      window.sessionStorage.removeItem("coach_admin_password");
      setAuthenticated(false);
      setError(
        requestError instanceof Error ? requestError.message : "Accès admin non autorisé.",
      );
    } finally {
      setChecking(false);
    }
  }

  function handleLogout() {
    window.sessionStorage.removeItem("coach_admin_password");
    setPassword("");
    setAuthenticated(false);
    setView("menu");
  }

  if (!authenticated) {
    return (
      <main className="min-h-dvh bg-background px-4 py-10 text-foreground">
        <form
          onSubmit={handleLogin}
          className="mx-auto grid w-full max-w-sm gap-4 rounded-lg border border-border bg-card p-5 shadow-sm"
        >
          <div>
            <p className="text-sm font-medium uppercase text-primary">Dashboard</p>
            <h1 className="mt-1 text-2xl">Accès sécurisé</h1>
          </div>
          {error ? (
            <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          ) : null}
          <div className="space-y-2">
            <Label htmlFor="dashboard-password">Mot de passe</Label>
            <Input
              id="dashboard-password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
            />
          </div>
          <Button type="submit" disabled={!password || checking}>
            <Check className="h-4 w-4" />
            Entrer
          </Button>
        </form>
      </main>
    );
  }

  if (view === "slots") {
    return (
      <AdminBookingSlots
        adminPassword={password}
        onBackToMenu={() => setView("menu")}
        onLogout={handleLogout}
      />
    );
  }

  if (view === "pricing") {
    return (
      <AdminPricingPlans
        adminPassword={password}
        onBackToMenu={() => setView("menu")}
        onLogout={handleLogout}
      />
    );
  }

  return (
    <AdminHome
      onSelectSlots={() => setView("slots")}
      onSelectPricing={() => setView("pricing")}
    />
  );
}
