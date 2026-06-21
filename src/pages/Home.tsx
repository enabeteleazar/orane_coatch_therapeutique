import { useState } from "react";
import { Navbar } from "@/components/Navbar";
import { Hero } from "@/components/Hero";
import { About } from "@/components/About";
import { Services } from "@/components/Services";
import { Pricing } from "@/components/Pricing";
import { Testimonials } from "@/components/Testimonials";
import { Contact } from "@/components/Contact";
import { Footer } from "@/components/Footer";

export default function Home() {
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar onOpenBookingModal={() => setIsBookingModalOpen(true)} />
      <main className="flex-1">
        <Hero />
        <About />
        <Services />
        <Pricing />
        <Testimonials />
        <Contact
          isBookingModalOpen={isBookingModalOpen}
          onCloseBookingModal={() => setIsBookingModalOpen(false)}
        />
      </main>
      <Footer />
    </div>
  );
}
