import { motion, type Variants } from "framer-motion";
import { Star } from "lucide-react";

const testimonials = [
  {
    name: "Sophie M.",
    quote:
      "En quelques séances, j'ai retrouvé une clarté que je n'avais plus depuis des années. L'accompagnement est doux, bienveillant et terriblement efficace. Je recommande sans hésiter.",
    stars: 4,
  },
  {
    name: "Thomas R.",
    quote:
      "J'étais sceptique au départ, mais le coaching m'a permis de prendre du recul sur mes blocages professionnels et personnels. J'ai retrouvé confiance en moi et en mes décisions.",
    stars: 5,
  },
  {
    name: "Camille D.",
    quote:
      "Un espace d'écoute rare et précieux. Chaque séance m'a aidée à avancer à mon rythme, sans jugement. Je suis ressortie de cette expérience plus sereine et plus alignée avec mes valeurs.",
    stars: 5,
  },
];

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.15 },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } },
};

export function Testimonials() {
  return (
    <section id="testimonials" className="py-24 md:py-32 bg-background">
      <div className="container mx-auto px-4 md:px-6">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="text-sm font-semibold tracking-wider text-primary uppercase mb-3">
            Témoignages
          </h2>
          <h3 className="text-4xl md:text-5xl font-serif text-foreground mb-6">
            Ce qu'ils en disent
          </h3>
          <p className="text-lg text-foreground/70">
            Des parcours authentiques, des transformations réelles.
          </p>
        </div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto"
        >
          {testimonials.map((t, idx) => (
            <motion.div
              key={idx}
              variants={itemVariants}
              className="flex flex-col bg-card border border-border/50 rounded-[1.5rem] p-8 shadow-sm hover:shadow-md transition-shadow duration-300"
            >
              <div className="flex gap-1 mb-6">
                {Array.from({ length: t.stars }).map((_, i) => (
                  <Star
                    key={i}
                    className="w-4 h-4 fill-primary text-primary"
                  />
                ))}
              </div>
              <blockquote className="flex-1 text-foreground/80 leading-relaxed italic mb-8 text-[0.95rem]">
                "{t.quote}"
              </blockquote>
              <div>
                <p className="font-semibold text-foreground font-serif">{t.name}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
