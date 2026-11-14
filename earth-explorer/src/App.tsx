import { useEffect, useRef, useState } from "react";
import Globe from "globe.gl";
import {
  Globe2,
  Waves,
  Mountain,
  Flame,
  Leaf,
  Search,
  Compass,
  Menu,
  Sparkles,
  Satellite,
  ArrowUpRight,
  Activity,
  Radio,
} from "lucide-react";
import "./App.css";

interface NasaEvent {
  id: string;
  title: string;
  links?: { url: string }[];
  categories?: { title: string }[];
  geometry?: { coordinates: [number, number] }[];
}

function App() {
  const globeContainer = useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = useState("Overview");
  const [events, setEvents] = useState<NasaEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("https://eonet.gsfc.nasa.gov/api/v3/events?status=open&limit=10")
      .then((response) => {
        if (!response.ok) throw new Error("NASA data unavailable");
        return response.json();
      })
      .then((data) => {
        setEvents(data.events || []);
        setLoading(false);
      })
      .catch(() => {
        setError("Unable to load NASA events. Please try again.");
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    const container = globeContainer.current;
    if (!container) return;

    const globePoints = events
      .map((event) => {
        const geometry = event.geometry?.[event.geometry.length - 1];
        if (!geometry || !geometry.coordinates) return null;
        const [lng, lat] = geometry.coordinates;
        return {
          lat,
          lng,
          size: 0.6,
          color: "#38bdf8",
          title: event.title,
        };
      })
      .filter(Boolean);

    // @ts-ignore
    const globe = Globe()(container)
      .globeImageUrl("https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg")
      .bumpImageUrl("https://unpkg.com/three-globe/example/img/earth-topology.png")
      .backgroundColor("rgba(0,0,0,0)")
      .showAtmosphere(true)
      .atmosphereColor("#38bdf8")
      .atmosphereAltitude(0.18)
      .pointsData(
        globePoints.length > 0
          ? globePoints
          : [
              { lat: 28.6, lng: 77.2, size: 0.7, color: "#38bdf8", title: "New Delhi" },
              { lat: 40.7, lng: -74, size: 0.7, color: "#38bdf8", title: "New York" },
            ]
      )
      .pointLat("lat")
      .pointLng("lng")
      .pointRadius("size")
      .pointColor("color")
      .pointAltitude(0.02)
      .pointResolution(16)
      .pointLabel("title");

    globe.width(container.clientWidth);
    globe.height(container.clientHeight);

    globe.controls().autoRotate = true;
    globe.controls().autoRotateSpeed = 0.4;
    globe.controls().enableZoom = true;

    const handleResize = () => {
      if (globeContainer.current) {
        globe.width(globeContainer.current.clientWidth);
        globe.height(globeContainer.current.clientHeight);
      }
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      globe._destructor();
    };
  }, [events]);

  const categories = [
    { name: "Ocean Explorer", icon: Waves, detail: "Currents & Sea Level" },
    { name: "Earth's Secrets", icon: Mountain, detail: "Tectonic & Terrain" },
    { name: "Planet in Motion", icon: Flame, detail: "Wildfires & Storms" },
    { name: "Biodiversity", icon: Leaf, detail: "Ecosystem Health" },
  ];

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-icon"><Globe2 size={24} /></div>
          <div>
            <h2>EARTH<span>JUKEBOX</span></h2>
            <p>PLANETARY TELEMETRY</p>
          </div>
        </div>

        <div className="side-label">NAVIGATION</div>
        <nav className="navigation">
          {["Overview", "Explore Earth", "Discoveries", "Missions"].map((item) => (
            <button
              key={item}
              className={`nav-item ${activeTab === item ? "active" : ""}`}
              onClick={() => setActiveTab(item)}
            >
              {item === "Overview" ? <Compass size={18} /> :
               item === "Missions" ? <Satellite size={18} /> :
               <Globe2 size={18} />}
              {item}
            </button>
          ))}
        </nav>

        <div className="side-label">JUKEBOX CHANNELS</div>
        <nav className="navigation">
          {categories.map(({ name, icon: Icon }) => (
            <button
              key={name}
              className="nav-item"
              onClick={() => setActiveTab(name)}
            >
              <Icon size={18} />
              {name}
            </button>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <div className="nasa-card">
            <Radio size={18} />
            <p>Streaming real-time signals from NASA EONET v3</p>
            <span>LIVE FEED ACTIVE</span>
          </div>
        </div>
      </aside>

      <section className="main-content">
        <header className="topbar">
          <div className="breadcrumb">
            <span>EARTH JUKEBOX</span>
            <span className="slash">/</span>
            <strong>{activeTab.toUpperCase()}</strong>
          </div>
          <div className="top-actions">
            <div className="status"><span /> TELEMETRY ONLINE</div>
            <button className="icon-button"><Search size={18} /></button>
            <button className="icon-button"><Menu size={18} /></button>
          </div>
        </header>

        <section className="welcome">
          <div>
            <div className="eyebrow"><Sparkles size={14} /> EARTH INFORMATION JUKEBOX</div>
            <h1>Play the pulse of the <span>planet.</span></h1>
            <p>Tune into live environmental tracks, natural phenomena, and global satellite feeds.</p>
          </div>
          <div className="date-chip"><Activity size={15} /> NASA SPACE APPS 2026</div>
        </section>

        <section className="globe-section">
          <div className="globe-heading">
            <div>
              <span className="section-kicker">GLOBAL RADAR</span>
              <h2>Interactive Planetary Scope</h2>
            </div>
            <span className="live-tag"><span /> 3D GLOBE SYNC</span>
          </div>

          <div className="globe-stage">
            <div className="globe-grid" />
            <div className="globe-halo" />
            <div className="globe-canvas" ref={globeContainer} />
            <div className="globe-caption">
              <span>TRACK 01 / 01</span>
              <strong>ACTIVE PLANET VIEW</strong>
              <small>Drag to rotate • Scroll to zoom</small>
            </div>
            <div className="coordinate">LAT 28.6° N • LNG 77.2° E</div>
          </div>
        </section>

        <section className="explore-section">
          <div className="section-title-row">
            <div>
              <span className="section-kicker">CHANNELS</span>
              <h2>Select a frequency</h2>
            </div>
            <button className="view-all">ALL STREAMS <ArrowUpRight size={15} /></button>
          </div>

          <div className="category-grid">
            {categories.map(({ name, icon: Icon, detail }) => (
              <button className="category-card" key={name} onClick={() => setActiveTab(name)}>
                <div className="category-icon"><Icon size={20} /></div>
                <div>
                  <h3>{name}</h3>
                  <p>{detail}</p>
                </div>
                <ArrowUpRight className="card-arrow" size={16} />
              </button>
            ))}
          </div>
        </section>

        <section className="events-section">
          <div className="section-title-row">
            <div>
              <span className="section-kicker">LIVE PLAYLIST</span>
              <h2>Planet in Motion (EONET Tracks)</h2>
            </div>
            <span className="live-tag"><span /> REAL-TIME STREAM</span>
          </div>

          {loading && <p className="event-message">Loading planetary broadcast...</p>}
          {error && <p className="event-message">{error}</p>}
          {!loading && !error && events.length === 0 && (
            <p className="event-message">No active tracks found.</p>
          )}

          <div className="events-grid">
            {events.map((event) => (
              <a
                className="event-card"
                key={event.id}
                href={event.links?.[0]?.url || "#"}
                target="_blank"
                rel="noreferrer"
              >
                <div>
                  <span className="event-status">● NOW PLAYING</span>
                  <h3>{event.title}</h3>
                  <p>
                    {event.categories?.map((category) => category.title).join(", ")}
                  </p>
                </div>
                <span className="event-link">STREAM TELEMETRY ↗</span>
              </a>
            ))}
          </div>
          <p className="data-credit">DATA SOURCE: NASA EONET API V3 • EARTH INFORMATION JUKEBOX</p>
        </section>

        <footer className="footer">
          <span>EARTH JUKEBOX © 2026</span>
          <span>BUILT FOR NASA HACKATHON <span className="footer-star">✦</span></span>
        </footer>
      </section>
    </main>
  );
}

export default App;