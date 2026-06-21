import { useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CalendarCheck, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";

type NavbarProps = {
  onOpenBookingModal: () => void;
};

export function Navbar({ onOpenBookingModal }: NavbarProps) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const navItems = [
    { label: "À propos", id: "about" },
    { label: "Prestations", id: "services" },
    { label: "Tarifs", id: "pricing" },
    { label: "Témoignages", id: "testimonials" },
  ];

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
      setIsMenuOpen(false);
    }
  };

  const handleBookingClick = () => {
    setIsMenuOpen(false);
    onOpenBookingModal();
  };

  return (
    <header
      className={`fixed top-0 z-50 w-full transition-all duration-300 ease-in-out ${
        isScrolled || isMenuOpen
          ? "bg-background/90 py-4 shadow-sm backdrop-blur-md"
          : "bg-transparent py-6"
      }`}
    >
      <div className="container mx-auto px-4 md:px-6">
        <div className="flex items-center justify-between">
          <button
            onClick={() => scrollToSection("hero")}
            className="text-2xl font-serif font-semibold tracking-tight text-foreground transition-opacity hover:opacity-80"
          >
            Equilibre Coaching
          </button>

          <nav className="hidden md:flex items-center gap-8 text-sm font-medium">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => scrollToSection(item.id)}
                className="text-foreground/80 transition-colors hover:text-primary"
              >
                {item.label}
              </button>
            ))}
          </nav>

          <Button
            onClick={handleBookingClick}
            className="hidden rounded-full px-6 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md md:inline-flex"
          >
            <CalendarCheck className="h-4 w-4" />
            Réserver une séance
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={isMenuOpen ? "Fermer le menu" : "Ouvrir le menu"}
            aria-expanded={isMenuOpen}
            className="rounded-full md:hidden"
            onClick={() => setIsMenuOpen((value) => !value)}
          >
            {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      <AnimatePresence>
        {isMenuOpen ? (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="md:hidden"
          >
            <nav className="container mx-auto flex flex-col gap-2 px-4 pb-4 pt-3 text-sm font-medium md:px-6">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => scrollToSection(item.id)}
                  className="rounded-xl px-3 py-3 text-left text-foreground/80 transition-colors hover:bg-muted hover:text-primary"
                >
                  {item.label}
                </button>
              ))}
              <Button
                type="button"
                className="mt-2 rounded-full"
                onClick={handleBookingClick}
              >
                <CalendarCheck className="h-4 w-4" />
                Réserver une séance
              </Button>
            </nav>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </header>
  );
}
