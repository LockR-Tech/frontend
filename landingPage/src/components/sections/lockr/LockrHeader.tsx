export default function LockrHeader() {
  return (
    <header className="bg-lockr-surface/80 backdrop-blur-md shadow-sm sticky top-0 z-50 flex justify-between items-center px-gutter py-base max-w-container-max mx-auto w-full">
      <div className="text-title-md font-bold text-lockr-primary tracking-tight">
        Lock.R
      </div>

      <nav className="hidden md:flex gap-md items-center">
        <a
          className="text-lockr-on-surface-variant hover:text-lockr-primary transition-colors text-label-md"
          href="#"
        >
          Features
        </a>
        <a
          className="text-lockr-on-surface-variant hover:text-lockr-primary transition-colors text-label-md"
          href="#"
        >
          How it Works
        </a>
        <a
          className="text-lockr-primary font-bold border-b-2 border-lockr-primary pb-1 text-label-md"
          href="#"
        >
          Solutions
        </a>
        <a
          className="text-lockr-on-surface-variant hover:text-lockr-primary transition-colors text-label-md"
          href="#"
        >
          Pricing
        </a>
      </nav>

      <div className="hidden md:block">
        <button className="bg-lockr-primary-container text-lockr-on-primary text-label-md px-md py-sm rounded-lg hover:bg-lockr-primary transition-colors lockr-hover-lift">
          Get Started
        </button>
      </div>

      {/* Mobile Menu Icon (Hidden on Desktop) */}
      <div className="md:hidden">
        <span className="material-symbols-outlined text-lockr-primary cursor-pointer">
          menu
        </span>
      </div>
    </header>
  );
}
