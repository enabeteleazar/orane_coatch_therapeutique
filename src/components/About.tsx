import { motion } from "framer-motion";
import { Check } from "lucide-react";
import aboutImg from "@/assets/images/about.jpg";

export function About() {
  const values = [
    { title: "Écoute", desc: "Une présence attentive sans jugement." },
    { title: "Accompagnement", desc: "Un guide à vos côtés, pas à pas." },
    { title: "Confiance", desc: "Un espace sûr pour vous exprimer." },
    { title: "Progression", desc: "Avancer à votre rythme vers vos objectifs." },
    { title: "Équilibre de vie", desc: "Harmoniser vos différentes sphères de vie." }
  ];

  return (
    <section id="about" className="py-24 md:py-32 bg-muted/30">
      <div className="container mx-auto px-4 md:px-6">
        <div className="grid md:grid-cols-2 gap-12 md:gap-24 items-center">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.7 }}
          >
            <div className="relative">
              <div className="absolute -inset-4 bg-secondary/20 rounded-2xl -z-10 transform -rotate-2"></div>
              <img
                src={aboutImg}
                alt="Coach portrait"
                className="rounded-2xl shadow-xl w-full object-cover aspect-[3/4]"
              />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.7 }}
          >
            <h2 className="text-sm font-semibold tracking-wider text-primary uppercase mb-3">À Propos</h2>
            <h3 className="text-4xl md:text-5xl font-serif mb-6 text-foreground">Une approche humaine avant tout</h3>
            
            <p className="text-lg text-foreground/80 mb-6 leading-relaxed">
              Mon approche s'appuie sur la conviction profonde que vous possédez déjà toutes les ressources 
              nécessaires pour atteindre votre équilibre. Mon rôle est de vous aider à mettre en lumière 
              ce potentiel.
            </p>
            
            <p className="text-lg text-foreground/80 mb-10 leading-relaxed">
              Ensemble, nous créons un espace chaleureux et sécurisant, une parenthèse de calme dans votre 
              quotidien, pour explorer vos envies, dénouer vos blocages et construire un chemin qui vous ressemble.
            </p>

            <div className="space-y-4">
              {values.map((value, idx) => (
                <div key={idx} className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center shrink-0 mt-1">
                    <Check className="w-3.5 h-3.5 text-primary" />
                  </div>
                  <div>
                    <strong className="text-foreground font-medium">{value.title}</strong>
                    <span className="text-foreground/70 ml-2">{value.desc}</span>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
