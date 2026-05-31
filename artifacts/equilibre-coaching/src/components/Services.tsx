import { motion } from "framer-motion";
import { Compass, User, CalendarSync, Laptop } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function Services() {
  const services = [
    {
      title: "Séance découverte",
      icon: Compass,
      desc: "Un premier échange pour faire connaissance, comprendre vos besoins et définir si mon approche vous correspond. Sans engagement."
    },
    {
      title: "Coaching individuel",
      icon: User,
      desc: "Une séance sur mesure d'une heure pour travailler sur une problématique précise, lever un blocage ou préparer une étape importante."
    },
    {
      title: "Accompagnement régulier",
      icon: CalendarSync,
      desc: "Un suivi complet sur plusieurs mois pour ancrer de nouvelles habitudes, retrouver un équilibre global et réaliser vos projets de vie."
    },
    {
      title: "Coaching à distance",
      icon: Laptop,
      desc: "Profitez de l'accompagnement depuis le confort de votre domicile. Des séances en visio, avec la même qualité d'écoute et d'attention."
    }
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5, ease: "easeOut" }
    }
  };

  return (
    <section id="services" className="py-24 md:py-32 bg-background">
      <div className="container mx-auto px-4 md:px-6">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="text-sm font-semibold tracking-wider text-primary uppercase mb-3">Prestations</h2>
          <h3 className="text-4xl md:text-5xl font-serif text-foreground mb-6">Un accompagnement sur mesure</h3>
          <p className="text-lg text-foreground/70">
            Des formats adaptés à votre rythme et à vos besoins, pour vous offrir un espace d'évolution personnel.
          </p>
        </div>

        <motion.div 
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6"
        >
          {services.map((service, idx) => {
            const Icon = service.icon;
            return (
              <motion.div key={idx} variants={itemVariants}>
                <Card className="h-full border-border/50 bg-card hover:border-primary/30 hover:shadow-lg transition-all duration-300 rounded-[1.5rem]">
                  <CardHeader>
                    <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
                      <Icon className="w-6 h-6 text-primary" />
                    </div>
                    <CardTitle className="text-xl font-serif">{service.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-foreground/70 leading-relaxed text-sm">
                      {service.desc}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}
