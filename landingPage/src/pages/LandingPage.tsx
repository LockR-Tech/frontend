import { useEffect, useState } from "react";
import {
  ArrowRight,
  ChevronDown,
  Clock3,
  LockKeyhole,
  Menu,
  PackageCheck,
  Plane,
  QrCode,
  ScanLine,
  ShieldCheck,
  Smartphone,
  X,
} from "lucide-react";
import "./AetherLanding.css";

const asset = (name: string) => `/aether/${name}`;

const offerCards = [
  {
    number: "01",
    title: "Secure Locker\nCabinets",
    image: "feature-pickup.jpg",
    icon: LockKeyhole,
  },
  {
    number: "02",
    title: "Super-Fast\nDrone Delivery",
    image: "locker-white.jpg",
    icon: Plane,
  },
  {
    number: "03",
    title: "On-Demand\nDelivery Service",
    image: "feature-qr.jpg",
    icon: Smartphone,
  },
  {
    number: "04",
    title: "24/7 Pick-Up",
    image: "feature-package.jpg",
    icon: Clock3,
  },
];

const features = [
  {
    title: "Store Large Items Securely",
    copy: "Spacious lockers designed to safely store luggage, backpacks, and oversized belongings.",
    image: "feature-large.jpg",
  },
  {
    title: "Safe Package Collection",
    copy: "Receive and collect parcels anytime with secure, contactless access.",
    image: "feature-package.jpg",
  },
  {
    title: "Simple Pick-up & Drop-off",
    copy: "An intuitive touchscreen makes storing and collecting items fast and effortless.",
    image: "feature-pickup.jpg",
  },
  {
    title: "QR Code Access",
    copy: "Scan your unique QR code to access your locker quickly and securely.",
    image: "feature-qr.jpg",
  },
];

const droneSpecs = [
  ["5 kg", "Payload Capacity"],
  ["15 km", "Flight Range"],
  ["30 min", "Flight Time"],
  ["AI GPS", "Smart Navigation"],
];

function Logo() {
  return (
    <a className="aether-logo" href="#home" aria-label="Lock.R home">
      <img src={asset("lockr-logo.svg")} alt="LOCK.R" />
    </a>
  );
}

function Header() {
  const [open, setOpen] = useState(false);

  const close = () => setOpen(false);

  return (
    <header className="site-header">
      <Logo />
      <button
        className="menu-button"
        type="button"
        aria-label={open ? "Close navigation" : "Open navigation"}
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        {open ? <X size={22} /> : <Menu size={22} />}
      </button>
      <nav className={open ? "site-nav is-open" : "site-nav"}>
        <a className="active" href="#home" onClick={close}>
          Home
        </a>
        <a href="#about" onClick={close}>
          About
        </a>
        <a href="#products" onClick={close}>
          Products <ChevronDown size={13} />
        </a>
        <a href="#contact" onClick={close}>
          Contact
        </a>
        <a className="nav-icon" href="#products" onClick={close} aria-label="Products">
          <QrCode size={15} />
        </a>
      </nav>
    </header>
  );
}

function SectionLabel({ children }: { children: string }) {
  return (
    <span className="section-label">
      <span />
      {children}
    </span>
  );
}

function DroneMark() {
  return <img className="rail-drone" src={asset("hero-rail-icon.svg")} alt="" />;
}

function HeroRail() {
  const destinations = [
    ["#home", "Home"],
    ["#about", "About"],
    ["#products", "Products"],
    ["#aether-details", "AETHER"],
    ["#features", "Features"],
    ["#eos", "Drones"],
  ];

  return (
    <aside className="hero-rail" aria-label="Page sections">
      <DroneMark />
      <nav className="rail-dots">
        {destinations.map(([href, label], index) => (
          <a
            className={index === 0 ? "rail-dot active" : "rail-dot"}
            href={href}
            aria-label={label}
            key={href}
          >
            <span />
          </a>
        ))}
      </nav>
      <span className="rail-line" />
      <a className="rail-next" href="#about">
        NEXT
      </a>
    </aside>
  );
}

function Hero() {
  return (
    <section className="hero section-dark" id="home">
      <div className="hero-background" />
      <Header />
      <HeroRail />
      <div className="hero-content">
        <div className="hero-copy">
          <h1>
            SMART LOCKER.
            <br />
            REAL SECURITY
          </h1>
          <h2>THE FUTURE OF SAFE STORAGE</h2>
          <p>
            Smart Locker is an intelligent storage solution designed to provide
            secure, fast, and convenient access to your belongings. Powered by
            smart technology, it streamlines package management and personal
            storage while ensuring maximum security and a seamless user
            experience.
          </p>
          <a className="outline-button" href="#about">
            Read More <ArrowRight size={16} />
          </a>
        </div>
        <div className="hero-product-copy" data-reveal>
          <strong>AETHER</strong>
          <span>by LOCK.R</span>
        </div>
        <div className="hero-callout hero-callout-drone">
          <span>Autonomous Drone Delivery</span>
        </div>
        <div className="hero-callout hero-callout-screen">
          <span>Smart Touch Interface</span>
        </div>
      </div>
    </section>
  );
}

function About() {
  return (
    <section className="about section-dark" id="about">
      <div className="about-glow" />
      <div className="about-word" aria-hidden="true">
        ABO<span>U</span>T
      </div>
      <div className="about-content">
        <div className="about-intro" data-reveal>
          <SectionLabel>WHO WE ARE</SectionLabel>
          <p>
            To redefine the future of logistics by building an intelligent,
            connected, and autonomous locker ecosystem. We envision a world
            where every delivery is faster, safer, and more convenient through
            the seamless integration of AI, smart infrastructure, and
            autonomous drone technology.
          </p>
        </div>
        <div className="about-mission" data-reveal>
          <span className="mini-title">OUR MISSION</span>
          <p>
            Our mission is to transform the way people store, send, and receive
            items through smart locker solutions powered by AI and automation.
            We create secure, efficient, and contactless experiences that
            connect businesses, communities, and individuals.
          </p>
          <a className="text-link" href="#products">
            Explore more <ArrowRight size={15} />
          </a>
        </div>
      </div>
    </section>
  );
}

function Offer() {
  return (
    <section className="offer section-dark">
      <div className="section-shell">
        <SectionLabel>WHY AETHER</SectionLabel>
        <div className="offer-heading">
          <h2>
            What Smart Delivery Offer
            <br />
            for You
          </h2>
          <a className="pill-button" href="#features">
            See applications <ArrowRight size={15} />
          </a>
        </div>
        <div className="offer-grid">
          {offerCards.map(({ number, title, image, icon: Icon }) => (
            <article
              className="offer-card"
              key={number}
              style={{ backgroundImage: `url(${asset(image)})` }}
              data-reveal
            >
              <div className="offer-overlay" />
              <div className="offer-card-top">
                <span>{number}</span>
                <Icon size={21} />
              </div>
              <h3>
                {title.split("\n").map((line) => (
                  <span key={line}>{line}</span>
                ))}
              </h3>
              <ArrowRight className="offer-arrow" size={20} />
            </article>
          ))}
        </div>
      </div>
      <div className="partner-strip">
        <span>SHOPEE EXPRESS</span>
        <span>LAZADA LOGISTICS</span>
        <span>AHA MOVE</span>
        <span>VNPOST</span>
        <span>DHL</span>
      </div>
    </section>
  );
}

function EcosystemShowcase() {
  return (
    <section className="ecosystem section-dark" id="products">
      <div className="section-shell ecosystem-shell">
        <h2 data-reveal>SEE MORE DETAILS</h2>
        <div className="ecosystem-stage" data-reveal>
          <img className="side-drone left" src={asset("drone-eos.jpg")} alt="" />
          <img
            className="ecosystem-product"
            src={asset("locker-product.jpg")}
            alt="AETHER smart locker and delivery drone"
          />
          <img
            className="side-drone right"
            src={asset("drone-nyx-full.jpg")}
            alt=""
          />
        </div>
        <div className="carousel-dots" aria-label="Product slide 1 of 3">
          <span className="active" />
          <span />
          <span />
        </div>
      </div>
    </section>
  );
}

function ProductIntro() {
  return (
    <section className="product-intro section-dark">
      <div className="product-halo" />
      <img
        src={asset("locker-product.jpg")}
        alt="AETHER smart locker"
        data-reveal
      />
      <div className="product-name">AETHER</div>
      <p>
        AETHER Smart Locker is an intelligent storage solution designed to make
        package pickup, drop-off, and management simple, secure, and
        contactless. Built with intuitive access and seamless integration, it
        delivers a faster and more convenient experience.
      </p>
      <a className="outline-button compact" href="#aether-details">
        Read More
      </a>
    </section>
  );
}

function AetherDetails() {
  return (
    <section className="aether-details section-dark" id="aether-details">
      <div className="section-shell aether-detail-grid">
        <div className="aether-visual" data-reveal>
          <img src={asset("smoke-white.jpg")} alt="AETHER smart locker system" />
          <div className="tech-rail">
            <span />
            <span />
            <span />
          </div>
        </div>
        <div className="aether-copy" data-reveal>
          <SectionLabel>SMART LOCKER SYSTEM</SectionLabel>
          <h2>
            AETHER
            <small>Smart Locker.</small>
          </h2>
          <p className="byline">By LOCK.R</p>
          <p>
            AETHER Smart Locker is an intelligent storage solution designed for
            secure and convenient item management. With intuitive QR code
            access, automated workflows, and real-time tracking, it connects
            lockers, users, and autonomous delivery into one unified ecosystem.
          </p>
          <ul className="check-list">
            <li>
              <ShieldCheck /> Secure by design
            </li>
            <li>
              <ScanLine /> Contactless access
            </li>
            <li>
              <PackageCheck /> Modular capacity
            </li>
          </ul>
        </div>
        <div className="stat-panel" data-reveal>
          <div>
            <strong>24/7</strong>
            <span>Access Anytime</span>
          </div>
          <div>
            <strong>500+</strong>
            <span>Secure Lockers</span>
          </div>
          <div>
            <strong>99.9%</strong>
            <span>System Uptime</span>
          </div>
        </div>
        <div className="detail-card detail-card-tall" data-reveal>
          <img src={asset("feature-package.jpg")} alt="Secure parcel storage" />
        </div>
        <div className="detail-card" data-reveal>
          <img src={asset("installing.jpg")} alt="AETHER system installation" />
        </div>
      </div>
    </section>
  );
}

function Features() {
  return (
    <section className="features section-dark" id="features">
      <div className="section-shell">
        <h2 className="glow-title">Features</h2>
        <div className="feature-timeline">
          {features.map((feature, index) => (
            <article
              className={index % 2 ? "feature-row reverse" : "feature-row"}
              key={feature.title}
              data-reveal
            >
              <div className="feature-image">
                <img src={asset(feature.image)} alt={feature.title} />
              </div>
              <span className="timeline-dot" />
              <div className="feature-copy">
                <h3>{feature.title}</h3>
                <p>{feature.copy}</p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function Configurator() {
  const [finish, setFinish] = useState<"white" | "dark">("white");

  return (
    <section className="configurator section-dark">
      <div className="section-shell">
        <article className="configuration" data-reveal>
          <div className="configuration-copy">
            <SectionLabel>FINISH 01</SectionLabel>
            <h2>WHITE</h2>
            <h3>SMOKE</h3>
            <p>
              A clean white smoke finish with a modern, lightweight design.
              Built for secure, smart, and effortless storage.
            </p>
            <div className="config-card">
              <div>
                <span>Color</span>
                <button
                  className={finish === "white" ? "swatch white active" : "swatch white"}
                  onClick={() => setFinish("white")}
                  type="button"
                  aria-label="Select white finish"
                />
              </div>
              <div>
                <span>Option</span>
                <span>Standard</span>
              </div>
              <strong>$1,999</strong>
            </div>
          </div>
          <img
            className={finish === "white" ? "" : "muted-product"}
            src={asset("smoke-white.jpg")}
            alt="AETHER White Smoke"
          />
        </article>
        <article className="configuration reverse" data-reveal>
          <div className="configuration-copy">
            <SectionLabel>FINISH 02</SectionLabel>
            <h2>DARK</h2>
            <h3>MATTE</h3>
            <p>
              A deep matte black finish crafted for a secure and sophisticated
              look. Built to deliver strong, smart, and effortless storage.
            </p>
            <div className="config-card">
              <div>
                <span>Color</span>
                <button
                  className={finish === "dark" ? "swatch dark active" : "swatch dark"}
                  onClick={() => setFinish("dark")}
                  type="button"
                  aria-label="Select dark finish"
                />
              </div>
              <div>
                <span>Option</span>
                <span>Stealth</span>
              </div>
              <strong>$1,999</strong>
            </div>
          </div>
          <img
            className={finish === "dark" ? "" : "muted-product"}
            src={asset("smoke-dark.jpg")}
            alt="AETHER Dark Matte"
          />
        </article>
      </div>
    </section>
  );
}

type DroneIntroProps = {
  name: "EOS" | "NYX";
  copy: string;
  image: string;
};

function DroneIntro({ name, copy, image }: DroneIntroProps) {
  return (
    <section className={`drone-intro section-dark drone-${name.toLowerCase()}`}>
      <div className="drone-word" aria-hidden="true">
        DRONE
      </div>
      <img src={asset(image)} alt={`${name} autonomous delivery drone`} data-reveal />
      <div className="drone-name">{name.split("").join("  ")}</div>
      <p>{copy}</p>
      <a className="outline-button compact" href={`#${name.toLowerCase()}`}>
        Read More
      </a>
    </section>
  );
}

type DroneDetailsProps = {
  name: "EOS" | "NYX";
  image: string;
  body: string;
};

function DroneDetails({ name, image, body }: DroneDetailsProps) {
  const isEos = name === "EOS";
  const gallery = isEos
    ? ["drone-landing.jpg", "drone-nyx.jpg", "locker-product.jpg"]
    : ["locker-black-bg.jpg", "drone-nyx.jpg", "feature-large.jpg"];

  return (
    <section className={`drone-details section-dark ${isEos ? "eos" : "nyx"}`} id={name.toLowerCase()}>
      <div className="section-shell">
        <div className="drone-detail-head">
          <div data-reveal>
            <h2>{name.split("").join("  ")}</h2>
            <p>View smartly with Drone</p>
            <a className="outline-button compact" href="#contact">
              Learn More
            </a>
          </div>
          <img src={asset(image)} alt={`${name} delivery drone`} data-reveal />
          <a className="buy-panel" href="#contact">
            <strong>BUY NOW</strong>
            <span>$999</span>
          </a>
        </div>
        <div className="drone-specs">
          {droneSpecs.map(([value, label]) => (
            <div key={label}>
              <strong>{value}</strong>
              <span>{label}</span>
            </div>
          ))}
        </div>
        <div className="drone-story">
          <div className="drone-gallery">
            {gallery.map((item, index) => (
              <img src={asset(item)} alt={`${name} detail ${index + 1}`} key={item} />
            ))}
          </div>
          <p>{body}</p>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="site-footer section-dark" id="contact">
      <div>
        <Logo />
        <p>Intelligent storage. Autonomous movement. One connected ecosystem.</p>
      </div>
      <div>
        <span>Explore</span>
        <a href="#about">About</a>
        <a href="#products">Products</a>
        <a href="#features">Features</a>
      </div>
      <div>
        <span>Contact</span>
        <a href="mailto:hello@lockr.global">hello@lockr.global</a>
        <p>Ho Chi Minh City, Vietnam</p>
      </div>
      <p className="copyright">© 2026 LOCK.R. All rights reserved.</p>
    </footer>
  );
}

export default function LandingPage() {
  useEffect(() => {
    const elements = document.querySelectorAll<HTMLElement>("[data-reveal]");
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("revealed");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12 },
    );

    elements.forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, []);

  return (
    <main className="aether-page">
      <Hero />
      <About />
      <Offer />
      <EcosystemShowcase />
      <ProductIntro />
      <AetherDetails />
      <Features />
      <Configurator />
      <DroneIntro
        name="EOS"
        copy="Lightweight autonomous delivery drone optimized for fast deliveries. Flight time up to 15 minutes and payload capacity of up to 2 kg, ideal for small parcels and short-distance transport."
        image="drone-eos.jpg"
      />
      <DroneDetails
        name="EOS"
        image="drone-eos-full.jpg"
        body="Inspired by the first light of dawn, EOS represents clarity, innovation, and a new beginning for autonomous logistics. Designed with a sleek silver finish, it combines elegant aesthetics with advanced AI-powered flight technology. Intelligent route planning, real-time tracking, obstacle avoidance, and contactless delivery make every mission fast, safe, and efficient."
      />
      <DroneIntro
        name="NYX"
        copy="Heavy-duty autonomous delivery drone designed for long-range operations. Flight time up to 30 minutes and payload capacity of 4–5 kg, ensuring efficient and reliable deliveries."
        image="drone-nyx-full.jpg"
      />
      <DroneDetails
        name="NYX"
        image="drone-nyx-full.jpg"
        body="Inspired by the quiet strength of the night, NYX is engineered for precision, resilience, and uncompromising performance. Its bold dark design reflects a powerful identity, while advanced autonomous flight systems, AI navigation, and intelligent obstacle detection ensure exceptional reliability in every mission."
      />
      <Footer />
    </main>
  );
}
