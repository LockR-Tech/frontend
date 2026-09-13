export default function LockrFooter() {
  return (
    <footer className="bg-lockr-surface-container-lowest border-t border-lockr-outline-variant w-full py-xl px-gutter max-w-container-max mx-auto flex flex-col md:flex-row justify-between items-start gap-md">
      <div className="text-title-md font-bold text-lockr-primary">Lock.R</div>

      <nav className="flex flex-wrap gap-md">
        <a
          className="text-lockr-on-surface-variant hover:text-lockr-primary transition-colors focus:ring-2 focus:ring-lockr-primary text-body-md"
          href="#"
        >
          Privacy Policy
        </a>
        <a
          className="text-lockr-on-surface-variant hover:text-lockr-primary transition-colors focus:ring-2 focus:ring-lockr-primary text-body-md"
          href="#"
        >
          Terms of Service
        </a>
        <a
          className="text-lockr-on-surface-variant hover:text-lockr-primary transition-colors focus:ring-2 focus:ring-lockr-primary text-body-md"
          href="#"
        >
          Contact Us
        </a>
        <a
          className="text-lockr-on-surface-variant hover:text-lockr-primary transition-colors focus:ring-2 focus:ring-lockr-primary text-body-md"
          href="#"
        >
          Global Network
        </a>
      </nav>

      <div className="text-body-md text-lockr-on-surface-variant">
        © 2026 Lock.R Logistics. Securely delivered by drone.
      </div>
    </footer>
  );
}
