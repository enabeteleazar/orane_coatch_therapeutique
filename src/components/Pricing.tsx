import { motion } from "framer-motion";

export function Pricing() {
  const prices = [
    { title: "Séance découverte", duration: "30 minutes", price: "Offerte" },
    { title: "Séance individuelle", duration: "1h30", price: "60 €" },
    { title: "Pack 5 séances", duration: "Suivi modéré", price: "280 €" },
    { title: "Pack 10 séances", duration: "Suivi complet", price: "560 €" }
  ];

  return (
    <section id="pricing" className="py-24 md:py-32 bg-primary/5">
      <div className="container mx-auto px-4 md:px-6">
        <div className="grid md:grid-cols-2 gap-16 items-center max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
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
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.7 }}
            className="space-y-4"
          >
            {prices.map((item, idx) => (
              <div 
                key={idx} 
                className="flex items-center justify-between p-6 bg-background rounded-2xl shadow-sm border border-border/50 hover:shadow-md transition-shadow"
              >
                <div>
                  <h4 className="text-lg font-serif font-medium text-foreground">{item.title}</h4>
                  <span className="text-sm text-foreground/60">{item.duration}</span>
                </div>
                <div className="text-2xl font-semibold text-primary">
                  {item.price}
                </div>
              </div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
}
