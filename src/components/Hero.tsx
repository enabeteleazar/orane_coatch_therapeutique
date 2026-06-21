import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import heroImg from "@/assets/images/hero.png";

export function Hero() {
  const scrollToContact = () => {
    document.getElementById("contact")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section id="hero" className="relative min-h-[100dvh] flex items-center pt-24 pb-16 overflow-hidden">
      {/* Background with slight parallax effect possible, but just absolutely positioned for now */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-background/60 z-10" />
        <img
          src={heroImg}
          alt="Bright sun-drenched wellness studio"
          className="w-full h-full object-cover object-center"
        />
      </div>

      <div className="container relative z-10 mx-auto px-4 md:px-6">
        <div className="max-w-3xl mx-auto text-center">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="text-5xl md:text-7xl font-serif text-foreground mb-6 leading-tight"
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
          >
          </motion.div>
        </div>
      </div>
    </section>
  );
}
