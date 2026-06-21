import { motion } from "framer-motion";
import { ArrowDown, CalendarCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import heroImg from "@/assets/images/hero.webp";

type HeroProps = {
  onOpenBookingModal: () => void;
};

export function Hero({ onOpenBookingModal }: HeroProps) {
  const scrollToServices = () => {
    document.getElementById("services")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section id="hero" className="relative flex min-h-[100dvh] items-center overflow-hidden px-0 pb-14 pt-28 md:pb-20">
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 z-10 bg-gradient-to-b from-background/80 via-background/62 to-background/88" />
        <img
          src={heroImg}
          alt="Studio lumineux et apaisant pour un accompagnement de coaching"
          className="w-full h-full object-cover object-center"
        />
      </div>

      <div className="container relative z-10 mx-auto px-4 md:px-6">
        <div className="max-w-3xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="mb-6 inline-flex items-center rounded-full border border-accent/30 bg-background/75 px-4 py-2 text-sm font-medium text-foreground/80 shadow-sm backdrop-blur"
          >
            Séance découverte offerte
          </motion.div>

          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="text-4xl sm:text-5xl md:text-7xl font-serif text-foreground mb-6 leading-tight"
          >
            Avancez vers une vie plus claire, plus alignée et plus sereine.
          </motion.h1>
          
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
            className="text-lg md:text-xl text-foreground/80 mb-10 max-w-2xl mx-auto leading-relaxed"
          >
            Retrouvez votre équilibre intérieur grâce à un accompagnement bienveillant et structuré. 
            Il est temps d'écouter vos besoins profonds et de reprendre les rênes de votre vie.
          </motion.p>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4, ease: "easeOut" }}
            className="flex flex-col items-center justify-center gap-3 sm:flex-row"
          >
            <Button
              type="button"
              size="lg"
              className="w-full rounded-full px-7 shadow-md transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg sm:w-auto"
              onClick={onOpenBookingModal}
            >
              <CalendarCheck className="h-4 w-4" />
              Réserver une séance
            </Button>
            <Button
              type="button"
              variant="outline"
              size="lg"
              className="w-full rounded-full bg-background/70 px-7 backdrop-blur transition-all duration-300 hover:-translate-y-0.5 hover:bg-background sm:w-auto"
              onClick={scrollToServices}
            >
              Découvrir les prestations
              <ArrowDown className="h-4 w-4" />
            </Button>
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.65, ease: "easeOut" }}
            className="mt-6 text-sm font-medium text-foreground/65"
          >
            Accompagnement individuel, en visio ou à domicile.
          </motion.p>
        </div>
      </div>
    </section>
  );
}
