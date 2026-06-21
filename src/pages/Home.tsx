import { useState } from "react";
import { Navbar } from "@/components/Navbar";
import { Hero } from "@/components/Hero";
import { About } from "@/components/About";
import { Services } from "@/components/Services";
import { Pricing } from "@/components/Pricing";
import { Testimonials } from "@/components/Testimonials";
import { Contact } from "@/components/Contact";
import { Footer } from "@/components/Footer";
import { BookingModal } from "@/components/BookingModal";

export default function Home() {
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar onOpenBookingModal={() => setIsBookingModalOpen(true)} />
      <main className="flex-1">
        <Hero onOpenBookingModal={() => setIsBookingModalOpen(true)} />
        <About />
        <Services />
        <Pricing />
        <Testimonials />
        <Contact onOpenBookingModal={() => setIsBookingModalOpen(true)} />
      </main>
      <Footer />
      <BookingModal
        isOpen={isBookingModalOpen}
        onClose={() => setIsBookingModalOpen(false)}
      />
    </div>
  );
}
