import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion } from "framer-motion";
import { CheckCircle } from "lucide-react";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

const contactSchema = z.object({
  name: z.string().min(2, "Veuillez indiquer votre nom complet."),
  email: z.string().email("Adresse e-mail invalide."),
  phone: z.string().optional(),
  website: z.string().optional(),
  message: z
    .string()
    .min(10, "Votre message doit contenir au moins 10 caractères.")
    .max(2000, "Votre message doit contenir moins de 2000 caractères."),
});

type ContactValues = z.infer<typeof contactSchema>;

const FORMSPREE_ENDPOINT = import.meta.env.VITE_FORMSPREE_ENDPOINT as
  | string
  | undefined;

export function Contact() {
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const form = useForm<ContactValues>({
    resolver: zodResolver(contactSchema),
    defaultValues: { name: "", email: "", phone: "", website: "", message: "" },
  });

  async function onSubmit(values: ContactValues) {
    setSubmitError(null);

    try {
      if (!FORMSPREE_ENDPOINT) {
        throw new Error("Le formulaire de contact n'est pas configuré.");
      }

      const response = await fetch(FORMSPREE_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(values),
      });

      const result = await response.json().catch(() => null);

      if (!response.ok) {
        const formspreeError = Array.isArray(result?.errors)
          ? result.errors
              .map((item: { message?: string }) => item.message)
              .filter(Boolean)
              .join(" ")
          : null;

        throw new Error(
          formspreeError ||
            result?.error ||
            "Une erreur est survenue pendant l'envoi du message."
        );
      }

      setSubmitted(true);
    } catch (error) {
      setSubmitError(
        error instanceof Error
          ? error.message
          : "Une erreur est survenue pendant l'envoi du message."
      );
    }
  }

  return (
    <section id="contact" className="py-24 md:py-32 bg-primary/5">
      <div className="container mx-auto px-4 md:px-6">
        <div className="max-w-2xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.7 }}
            className="text-center mb-14"
          >
            <h2 className="text-sm font-semibold tracking-wider text-primary uppercase mb-3">
              Contact
            </h2>
            <h3 className="text-4xl md:text-5xl font-serif text-foreground mb-5">
              Faites le premier pas vers votre changement.
            </h3>
            <p className="text-lg text-foreground/70">
              Réservez votre séance découverte ou posez-moi simplement vos questions. Je vous répondrai sous 48h.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.7, delay: 0.15 }}
            className="bg-card border border-border/50 rounded-[1.5rem] p-8 md:p-12 shadow-sm"
          >
            {submitted ? (
              <div className="flex flex-col items-center text-center py-10 gap-5">
                <CheckCircle className="w-14 h-14 text-primary" />
                <h4 className="text-2xl font-serif text-foreground">Message envoyé</h4>
                <p className="text-foreground/70 max-w-sm">
                  Merci pour votre message. Je vous répondrai dans les plus brefs délais. À très bientôt.
                </p>
                <Button
                  variant="outline"
                  className="rounded-full mt-2"
                  onClick={() => {
                    setSubmitted(false);
                    form.reset();
                  }}
                >
                  Envoyer un autre message
                </Button>
              </div>
            ) : (
              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(onSubmit)}
                  className="space-y-6"
                >
                  <input
                    type="text"
                    tabIndex={-1}
                    autoComplete="off"
                    className="hidden"
                    aria-hidden="true"
                    {...form.register("website")}
                  />

                  <div className="grid sm:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Prénom et nom</FormLabel>
                          <FormControl>
                            <Input
                              data-testid="input-name"
                              placeholder="Marie Dupont"
                              className="rounded-xl"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Adresse e-mail</FormLabel>
                          <FormControl>
                            <Input
                              data-testid="input-email"
                              type="email"
                              placeholder="marie@exemple.fr"
                              className="rounded-xl"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Téléphone (optionnel)</FormLabel>
                        <FormControl>
                          <Input
                            data-testid="input-phone"
                            type="tel"
                            placeholder="06 12 34 56 78"
                            className="rounded-xl"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="message"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Message</FormLabel>
                        <FormControl>
                          <Textarea
                            data-testid="input-message"
                            placeholder="Parlez-moi de vous et de vos besoins..."
                            className="rounded-xl min-h-[140px] resize-none"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {submitError ? (
                    <p
                      role="alert"
                      className="text-sm font-medium text-destructive"
                    >
                      {submitError}
                    </p>
                  ) : null}

                  <Button
                    data-testid="button-submit"
                    type="submit"
                    size="lg"
                    className="w-full rounded-full text-base py-6"
                    disabled={form.formState.isSubmitting}
                  >
                    {form.formState.isSubmitting ? "Envoi en cours..." : "Envoyer"}
                  </Button>
                </form>
              </Form>
            )}
          </motion.div>
        </div>
      </div>
    </section>
  );
}
