import { useEffect, useState } from "react";
import { motion } from "framer-motion";

type PricingPlan = {
  id: number;
  title: string;
  subtitle: string;
  description: string;
  price_cents: number;
  currency: string;
  duration_minutes: number | null;
  features: string[];
};

const fallbackPrices: PricingPlan[] = [
  {
    id: 1,
    title: "Séance découverte",
    subtitle: "",
    description: "",
    price_cents: 0,
    currency: "EUR",
    duration_minutes: 30,
    features: [],
  },
  {
    id: 2,
    title: "Séance individuelle",
    subtitle: "",
    description: "",
    price_cents: 6000,
    currency: "EUR",
    duration_minutes: 90,
    features: [],
  },
  {
    id: 3,
    title: "Pack 5 séances",
    subtitle: "Suivi modéré",
    description: "",
    price_cents: 28000,
    currency: "EUR",
    duration_minutes: null,
    features: [],
  },
  {
    id: 4,
    title: "Pack 10 séances",
    subtitle: "Suivi complet",
    description: "",
    price_cents: 56000,
    currency: "EUR",
    duration_minutes: null,
    features: [],
  },
];

function formatPrice(priceCents: number, currency: string) {
  if (priceCents === 0) {
    return "Offerte";
  }

  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: currency || "EUR",
    maximumFractionDigits: priceCents % 100 === 0 ? 0 : 2,
  }).format(priceCents / 100);
}

function formatDuration(minutes: number | null) {
  if (!minutes) {
    return "";
  }

  if (minutes < 60) {
    return `${minutes} minutes`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  return remainingMinutes ? `${hours}h${String(remainingMinutes).padStart(2, "0")}` : `${hours}h`;
}

function getPlanSubtitle(plan: PricingPlan) {
  return plan.subtitle || formatDuration(plan.duration_minutes);
}

export function Pricing() {
  const [prices, setPrices] = useState<PricingPlan[]>(fallbackPrices);

  useEffect(() => {
    const controller = new AbortController();

    async function loadPrices() {
      try {
        const response = await fetch("/api/pricing-plans", {
          headers: { Accept: "application/json" },
          signal: controller.signal,
        });
        const payload = await response.json().catch(() => null);

        if (!response.ok) {
          throw new Error(payload?.error || "Les tarifs n'ont pas pu être chargés.");
        }

        if (!Array.isArray(payload?.plans)) {
          throw new Error("La réponse des tarifs est invalide.");
        }

        setPrices(payload.plans);
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }

        console.error("[pricing]", error);
      }
    }

    void loadPrices();

    return () => controller.abort();
  }, []);

  return (
    <section id="pricing" className="py-24 md:py-32 bg-primary/5">
      <div className="container mx-auto px-4 md:px-6">
        <div className="grid md:grid-cols-2 gap-16 items-center max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.7 }}
          >
            <h2 className="text-sm font-semibold tracking-wider text-primary uppercase mb-3">Tarifs</h2>
            <h3 className="text-4xl md:text-5xl font-serif mb-6 text-foreground">Investir en vous-même</h3>
            <p className="text-lg text-foreground/80 mb-8 leading-relaxed">
              La clarté et l'équilibre valent cet investissement. Choisissez la formule qui correspond le mieux à votre besoin du moment.
            </p>
            <div className="p-6 bg-secondary/10 rounded-2xl border border-secondary/20">
              <p className="text-sm text-foreground/80 italic text-center">
                "Les tarifs peuvent être adaptés selon les besoins après échange. N'hésitez pas à m'en parler lors de notre séance découverte."
              </p>
            </div>
            <div className="mt-4 p-4 bg-background rounded-2xl border border-border/50">
              <p className="text-sm text-foreground/70 text-center">
                Pour les séances nécessitant un déplacement à domicile, un forfait de
                <span className="font-semibold text-primary"> 10 € </span>
                par séance est appliqué.
              </p>
            </div>
 
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.7 }}
            className="space-y-4"
          >
            {prices.map((item) => {
              const subtitle = getPlanSubtitle(item);

              return (
              <div 
                key={item.id}
                className="flex flex-col gap-4 p-6 bg-background rounded-2xl shadow-sm border border-border/50 transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-md sm:flex-row sm:items-start sm:justify-between"
              >
                <div className="min-w-0">
                  <h4 className="text-lg font-serif font-medium text-foreground">{item.title}</h4>
                  {subtitle ? (
                    <span className="text-sm text-foreground/60">{subtitle}</span>
                  ) : null}
                  {item.description ? (
                    <p className="mt-3 text-sm leading-relaxed text-foreground/70">{item.description}</p>
                  ) : null}
                  {item.features.length > 0 ? (
                    <ul className="mt-3 list-disc space-y-1 pl-4 text-sm text-foreground/65">
                      {item.features.map((feature) => (
                        <li key={feature}>{feature}</li>
                      ))}
                    </ul>
                  ) : null}
                </div>
                <div className="shrink-0 text-2xl font-semibold text-primary">
                  {formatPrice(item.price_cents, item.currency)}
                </div>
              </div>
              );
            })}
          </motion.div>
        </div>
      </div>
    </section>
  );
}
