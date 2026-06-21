import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";

type NavbarProps = {
  onOpenBookingModal: () => void;
};

export function Navbar({ onOpenBookingModal }: NavbarProps) {
  const [isScrolled, setIsScrolled] = useState(false);

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
    }
  };

  return (
    <header
      className={`fixed top-0 z-50 w-full transition-all duration-300 ease-in-out ${
        isScrolled
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
            <button onClick={() => scrollToSection("about")} className="text-foreground/80 hover:text-primary transition-colors">
              À propos
            </button>
            <button onClick={() => scrollToSection("services")} className="text-foreground/80 hover:text-primary transition-colors">
              Prestations
            </button>
            <button onClick={() => scrollToSection("pricing")} className="text-foreground/80 hover:text-primary transition-colors">
              Tarifs
            </button>
            <button onClick={() => scrollToSection("testimonials")} className="text-foreground/80 hover:text-primary transition-colors">
              Témoignages
            </button>
          </nav>

          <Button
            onClick={onOpenBookingModal}
            className="rounded-full px-6 transition-transform hover:scale-105"
          >
            Réserver une séance
          </Button>
        </div>
      </div>
    </header>
  );
}
