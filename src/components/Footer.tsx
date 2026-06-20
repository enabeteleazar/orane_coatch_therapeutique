export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="bg-foreground/5 border-t border-border/40 py-10">
      <div className="container mx-auto px-4 md:px-6 flex flex-col md:flex-row items-center justify-between gap-4 text-center md:text-left">
        <div>
          <p className="text-lg font-serif font-semibold text-foreground">
            Equilibre Coaching
          </p>
          <p className="text-sm text-foreground/55 mt-1">
            Avancez vers une vie plus claire, plus alignee et plus sereine.
          </p>
        </div>
        <p className="text-sm text-foreground/45">
          &copy; {year} Equilibre Coaching. Tous droits reserves.
        </p>
      </div>
    </footer>
  );
}
