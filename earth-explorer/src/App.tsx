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
  Volume2,
  VolumeX,
  MessageSquare,
  X,
  Send,
} from "lucide-react";
import "./App.css";
import OrbitalAtlas from "./components/OrbitalAtlas";
import { audio } from "./audio";

interface NasaEvent {
  id: string;
  title: string;
  description?: string;
  links?: { url: string }[];
  categories?: { title: string }[];
  geometry?: { coordinates: [number, number] }[];
}

interface ChatMessage {
  sender: "ai" | "user";
  text: string;
  options?: string[];
}

const TRIVIA_QUESTIONS = [
  {
    statement: "The Amazon Rainforest produces over 50% of the oxygen we breathe.",
    isFact: false,
    explanation: "MYTH! While the Amazon produces massive amounts of oxygen, it consumes almost all of it itself. Marine phytoplankton in our oceans actually generate over 50% of Earth's oxygen."
  },
  {
    statement: "There is a region in the Indian Ocean where Earth's gravity is significantly weaker, creating a sea-level depression.",
    isFact: true,
    explanation: "FACT! Known as the Indian Ocean Geoid Low, this gravitational anomaly causes sea level to drop by over 100 meters due to denser ancient mantle structures below."
  },
  {
    statement: "Lightning never strikes the same place twice.",
    isFact: false,
    explanation: "MYTH! Tall structures like the Empire State Building are struck by lightning dozens of times every single year."
  },
  {
    statement: "Saturn's rings are composed almost entirely of water ice particles.",
    isFact: true,
    explanation: "FACT! Saturn's magnificent ring system is made up of 99% pure water ice chunks ranging from microscopic dust grains to house-sized boulders."
  },
  {
    statement: "Hurricanes and tropical cyclones can easily form directly on the Earth's equator.",
    isFact: false,
    explanation: "MYTH! The Coriolis effect (which makes storms spin) is virtually zero at the equator, making hurricane formation impossible right on the equator line."
  }
];

function App() {
  const [isLaunched, setIsLaunched] = useState(false);
  const globeContainer = useRef<HTMLDivElement>(null);
  const globeInstanceRef = useRef<any>(null);
  const [activeTab, setActiveTab] = useState("Overview");
  const [events, setEvents] = useState<NasaEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedEvent, setSelectedEvent] = useState<NasaEvent | null>(null);
  const [satViewOpen, setSatViewOpen] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Chatbot & Game State
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [gameActive, setGameActive] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      sender: "ai",
      text: "ACCESS GRANTED. I am GAIA ORACLE, your tactical AI co-pilot. Want to test your planetary knowledge? Type 'play' or click below to start the Earth Fact or Myth challenge.",
      options: ["Play Fact or Myth", "Tell me about Gaia Jukebox"]
    }
  ]);
  const [userInput, setUserInput] = useState("");

  const categories = [
    { name: "Ocean Explorer", icon: Waves, detail: "Currents & Sea Level" },
    { name: "Earth's Secrets", icon: Mountain, detail: "Tectonic & Terrain" },
    { name: "Planet in Motion", icon: Flame, detail: "Wildfires & Storms" },
    { name: "Endangered Species", icon: Leaf, detail: "Habitat & Wildlife" },
  ];

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
    if (isLaunched && soundEnabled) {
      audio.playChannelTone(activeTab);
    } else {
      audio.stopTone();
    }
  }, [activeTab, isLaunched, soundEnabled]);

  // 1. Initialize the Globe once when launched
  useEffect(() => {
    if (!isLaunched) return;
    const container = globeContainer.current;
    if (!container) return;

    try {
      // @ts-ignore
      const globe = Globe()(container)
        .globeImageUrl("https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg")
        .bumpImageUrl("https://unpkg.com/three-globe/example/img/earth-topology.png")
        .backgroundColor("rgba(0,0,0,0)")
        .showAtmosphere(true)
        .atmosphereColor("#38bdf8")
        .atmosphereAltitude(0.18)
        .pointLat("lat")
        .pointLng("lng")
        .pointRadius("size")
        .pointColor("color")
        .pointAltitude(0.02)
        .pointResolution(16)
        .pointLabel("title")
        .onPointClick((point: any) => {
          if (soundEnabled) audio.playClick();
          if (point) {
            if (point.event) {
              setSelectedEvent(point.event);
            } else if (point.title) {
              setSelectedEvent({
                id: point.title,
                title: point.title,
                description: point.description,
                categories: [{ title: point.categoryTitle || "Telemetry Node" }],
                geometry: [{ coordinates: [point.lng, point.lat] }]
              });
            }
          }
        });

      globe.width(container.clientWidth);
      globe.height(container.clientHeight);
      globe.controls().autoRotate = true;
      globe.controls().autoRotateSpeed = 0.4;
      globe.controls().enableZoom = true;

      globeInstanceRef.current = globe;

      const handleResize = () => {
        if (globeContainer.current && globeInstanceRef.current) {
          globeInstanceRef.current.width(globeContainer.current.clientWidth);
          globeInstanceRef.current.height(globeContainer.current.clientHeight);
        }
      };

      window.addEventListener("resize", handleResize);

      return () => {
        window.removeEventListener("resize", handleResize);
        if (globeInstanceRef.current) {
          globeInstanceRef.current._destructor();
          globeInstanceRef.current = null;
        }
      };
    } catch (err) {
      console.error("Globe initialization error:", err);
    }
  }, [isLaunched]);

  // 2. Dynamically update globe layers based on active Jukebox channel
  useEffect(() => {
    if (!globeInstanceRef.current) return;

    const globe = globeInstanceRef.current;

    try {
      globe.hexBinPointsData([]);

      if (activeTab === "Planet in Motion") {
        globe.arcsData([]);
        globe.ringsData([]);
        const globePoints = events
          .map((event) => {
            if (!event.geometry || event.geometry.length === 0) return null;
            const geometry = event.geometry[event.geometry.length - 1];
            if (!geometry || !geometry.coordinates || geometry.coordinates.length < 2) return null;
            const [lng, lat] = geometry.coordinates;
            return {
              lat,
              lng,
              size: 0.6,
              color: "#ef4444",
              title: event.title,
              event: event,
            };
          })
          .filter(Boolean);

        globe.pointsData(globePoints);
      } 
      else if (activeTab === "Ocean Explorer") {
        globe.arcsData([]);
        globe.ringsData([]);

        const oceanNodes = [
          { lat: 15.0, lng: -140.0, size: 0.8, color: "#38bdf8", title: "North Pacific Current Node", categoryTitle: "Hydro-Acoustic Ocean Node", description: "Monitoring thermal energy transport, surface temperature anomalies, and current vectors across the Pacific basin." },
          { lat: -20.0, lng: -100.0, size: 0.7, color: "#0284c7", title: "South Pacific Gyre Station", categoryTitle: "Hydro-Acoustic Ocean Node", description: "Tracking salinity shifts, marine current velocity vectors, and micro-oscillations in deep-water pressure." },
          { lat: 25.0, lng: -40.0, size: 0.8, color: "#38bdf8", title: "North Atlantic Drift Monitor", categoryTitle: "Hydro-Acoustic Ocean Node", description: "Measuring Gulf Stream thermal transfer rates and heat exchange patterns toward Western Europe." },
          { lat: -30.0, lng: -20.0, size: 0.7, color: "#0284c7", title: "South Atlantic Current Array", categoryTitle: "Hydro-Acoustic Ocean Node", description: "Logging deep-water upwelling, thermohaline circulation shifts, and baseline sea-level fluctuations." },
          { lat: 10.0, lng: 75.0, size: 0.9, color: "#34d399", title: "Indian Ocean Dipole Node", categoryTitle: "Hydro-Acoustic Ocean Node", description: "Analyzing monsoon-linked sea surface temperature variations and atmospheric moisture exchanges." },
          { lat: -55.0, lng: 120.0, size: 0.9, color: "#38bdf8", title: "Antarctic Circumpolar Station", categoryTitle: "Hydro-Acoustic Ocean Node", description: "Real-time glacial meltwater runoff tracking and deep-ocean acoustic telemetry monitoring." },
        ];

        const oceanRings = oceanNodes.map(node => ({
          lat: node.lat,
          lng: node.lng,
          alt: 0.01,
          color: node.color
        }));

        globe.pointsData(oceanNodes);
        globe.ringsData(oceanRings);
        globe.ringColor((d: any) => d.color);
        globe.ringMaxRadius(4);
        globe.ringPropagationSpeed(2);
        globe.ringRepeatPeriod(1000);
      } 
      else if (activeTab === "Endangered Species") {
        globe.arcsData([]);
        globe.ringsData([]);

        const speciesNodes = [
          { lat: 0.5, lng: 101.3, size: 0.8, color: "#f59e0b", title: "Sumatran Rainforest Node", categoryTitle: "Bio-Acoustic Habitat Frequency", description: "FREQUENCY STATUS: CRITICAL. Tracking canopy fragmentation, illegal logging pressure, and Sumatran Orangutan habitat contraction via NASA Landsat optical feeds." },
          { lat: -2.5, lng: 23.5, size: 0.8, color: "#f59e0b", title: "Congo Basin Elephant Corridor", categoryTitle: "Bio-Acoustic Habitat Frequency", description: "FREQUENCY STATUS: UNSTABLE. Monitoring infrasonic vocalization arrays and forest elephant movement across cross-border poaching risk zones." },
          { lat: 21.3, lng: -157.8, size: 0.7, color: "#34d399", title: "Hawaiian Marine Sanctuary", categoryTitle: "Bio-Acoustic Habitat Frequency", description: "FREQUENCY STATUS: WARNING. Logging marine acoustic resonance and coastal thermal stress affecting Hawaiian Monk Seal breeding grounds." },
          { lat: 35.0, lng: 88.0, size: 0.8, color: "#f59e0b", title: "Himalayan Snow Leopard Ridge", categoryTitle: "Bio-Acoustic Habitat Frequency", description: "FREQUENCY STATUS: SHIFTING. High-altitude climate tracking measuring snowline recession and prey migration displacement." },
        ];

        const speciesRings = speciesNodes.map(node => ({
          lat: node.lat,
          lng: node.lng,
          alt: 0.01,
          color: node.color
        }));

        globe.pointsData(speciesNodes);
        globe.ringsData(speciesRings);
        globe.ringColor((d: any) => d.color);
        globe.ringMaxRadius(4);
        globe.ringPropagationSpeed(1.5);
        globe.ringRepeatPeriod(1200);
      }
      else {
        globe.pointsData([]);
        globe.arcsData([]);
        globe.ringsData([]);
      }
    } catch (err) {
      console.error("Globe update error:", err);
    }
  }, [activeTab, events]);

  const handleTabChange = (tabName: string) => {
    if (soundEnabled) audio.playClick();
    setActiveTab(tabName);
  };

  const handleSendMessage = (textToSend?: string) => {
    const text = textToSend || userInput;
    if (!text.trim()) return;
    if (soundEnabled) audio.playClick();

    const newMessages = [...chatMessages, { sender: "user" as const, text }];
    setChatMessages(newMessages);
    setUserInput("");

    setTimeout(() => {
      const lowerText = text.toLowerCase();
      if (lowerText.includes("play") || lowerText.includes("fact") || lowerText.includes("myth")) {
        setGameActive(true);
        setCurrentQuestionIndex(0);
        setScore(0);
        const q = TRIVIA_QUESTIONS[0];
        setChatMessages([
          ...newMessages,
          {
            sender: "ai",
            text: `QUESTION 1/5:\n\n"${q.statement}"\n\nIs this a FACT or a MYTH?`,
            options: ["FACT", "MYTH"]
          }
        ]);
      } else if (gameActive && (lowerText === "fact" || lowerText === "myth")) {
        const q = TRIVIA_QUESTIONS[currentQuestionIndex];
        const userGuessedFact = lowerText === "fact";
        const isCorrect = userGuessedFact === q.isFact;
        const updatedScore = isCorrect ? score + 1 : score;
        if (isCorrect) setScore(updatedScore);

        const nextIndex = currentQuestionIndex + 1;
        if (nextIndex < TRIVIA_QUESTIONS.length) {
          setCurrentQuestionIndex(nextIndex);
          const nextQ = TRIVIA_QUESTIONS[nextIndex];
          setChatMessages([
            ...newMessages,
            {
              sender: "ai",
              text: `${isCorrect ? "✓ CORRECT!" : "✕ INCORRECT!"}\n\n${q.explanation}\n\n--- next question ---\n\nQUESTION ${nextIndex + 1}/5:\n\n"${nextQ.statement}"\n\nIs this a FACT or a MYTH?`,
              options: ["FACT", "MYTH"]
            }
          ]);
        } else {
          setGameActive(false);
          setChatMessages([
            ...newMessages,
            {
              sender: "ai",
              text: `GAME OVER! Final Score: ${updatedScore}/5 correct! 🌟\n\nYou're a certified Earth science expert. Type 'play' if you want another round or ask me anything else about the Jukebox!`
            }
          ]);
        }
      } else {
        setChatMessages([
          ...newMessages,
          {
            sender: "ai",
            text: "GAIA ORACLE online. You can type 'play' to start the Fact or Myth challenge, or select any channel on the left to tune into Earth's live telemetry frequencies."
          }
        ]);
      }
    }, 400);
  };

  // --- CINEMATIC LANDING SCREEN ---
  if (!isLaunched) {
    return (
      <div 
        className="launch-screen" 
        onClick={() => {
          setIsLaunched(true);
          if (soundEnabled) audio.playClick();
        }}
      >
        <nav className="launch-nav">
          <span className="launch-brand">DEVELOPED BY ORBITAL AUTOBOTS TEAM</span>
        </nav>

        <div className="launch-center-content">
          <span className="launch-subtitle-top">NASA SPACE APPS 2026</span>
          <h1>
            <span className="typewriter-title" style={{ color: '#ffffff' }}>SECRETS OF BREATHING <span style={{ color: '#38bdf8' }}>GAIA</span></span>
          </h1>
          <p className="launch-description">
            An interactive sonic and visual archive streaming real-time global tracking, 
            natural phenomena, and orbital satellite observation tracks.
          </p>
          <button className="launch-cta-btn">
            <span className="btn-content">
              INITIALIZE SYSTEM 
              <span className="btn-icon-wrapper">
                <ArrowUpRight size={16} />
              </span>
            </span>
          </button>
        </div>

        <div style={{ height: '20px' }} />
      </div>
    );
  }

  // --- MAIN DASHBOARD VIEW ---
  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-icon"><Globe2 size={24} /></div>
          <div>
            <h2>GAIA<span>JUKEBOX</span></h2>
            <p>GLOBAL MONITORING</p>
          </div>
        </div>

        <div className="side-label">NAVIGATION</div>
        <nav className="navigation">
          {["Overview", "Explore Earth", "Discoveries", "Missions"].map((item) => (
            <button
              key={item}
              className={`nav-item ${activeTab === item ? "active" : ""}`}
              onClick={() => handleTabChange(item)}
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
              className={`nav-item ${activeTab === name ? "active" : ""}`}
              onClick={() => handleTabChange(name)}
            >
              <Icon size={18} />
              {name}
            </button>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <div className="nasa-card">
            <Radio size={18} />
            <p>Streaming real-time signals from NASA v3</p>
            <span>LIVE FEED ACTIVE</span>
          </div>
        </div>
      </aside>

      <section className="main-content">
        <header className="topbar">
          <div className="breadcrumb">
            <span>SECRETS OF GAIA</span>
            <span className="slash">/</span>
            <strong>{activeTab.toUpperCase()}</strong>
          </div>
          <div className="top-actions">
            <button 
              className="icon-button"
              onClick={() => {
                setIsChatOpen(!isChatOpen);
                if (soundEnabled) audio.playClick();
              }}
              title="Open GAIA Oracle Chat & Trivia"
            >
              <MessageSquare size={18} color="#38bdf8" />
            </button>
            <button 
              className="icon-button" 
              onClick={() => {
                setSoundEnabled(!soundEnabled);
                if (!soundEnabled) audio.playClick();
              }}
              title={soundEnabled ? "Mute Ambient Synth" : "Enable Ambient Synth"}
            >
              {soundEnabled ? <Volume2 size={18} color="#38bdf8" /> : <VolumeX size={18} />}
            </button>
            <div className="status"><span /> SYSTEM ONLINE</div>
            <button
  className="sat-launch-btn"
  onClick={() => { setSatViewOpen(true); if (soundEnabled) audio.playClick(); }}
  title="Launch Orbital Atlas"
>
  <span className="pulse-dot" />
  <Satellite size={14} />
  Launch Sat View
</button>
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
              <h2>Interactive Global Scope</h2>
            </div>
            <span className="live-tag"><span /> 3D GLOBE SYNC</span>
          </div>

          <div className="globe-stage">
            <div className="globe-grid" />
            <div className="globe-halo" />
            <div className="globe-canvas" ref={globeContainer} />
            <div className="globe-caption">
              <span>TRACK 01 / 01</span>
              <strong>ACTIVE GLOBAL VIEW</strong>
              <small>Drag to rotate • Scroll to zoom</small>
            </div>
            <div className="coordinate">LAT 28.6° N • LNG 77.2° E</div>

            {/* --- CHATBOT / FACT OR MYTH DRAWER --- */}
            {isChatOpen && (
              <div className="event-modal-overlay">
                <div className="event-modal-card" style={{ maxWidth: '480px', height: '560px', display: 'flex', flexDirection: 'column' }}>
                  <div className="modal-header">
                    <span className="event-status">● GAIA ORACLE AI // TRIVIA TERMINAL</span>
                    <button 
                      className="close-modal" 
                      onClick={() => {
                        if (soundEnabled) audio.playClick();
                        setIsChatOpen(false);
                      }}
                    >
                      <X size={18} />
                    </button>
                  </div>

                  <div style={{ flex: 1, overflowY: 'auto', padding: '12px 0', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {chatMessages.map((msg, idx) => (
                      <div 
                        key={idx} 
                        style={{
                          alignSelf: msg.sender === 'user' ? 'flex-end' : 'flex-start',
                          background: msg.sender === 'user' ? '#0284c7' : 'rgba(255,255,255,0.06)',
                          border: msg.sender === 'ai' ? '1px solid rgba(56, 189, 248, 0.2)' : 'none',
                          padding: '10px 14px',
                          borderRadius: '8px',
                          maxWidth: '85%',
                          fontSize: '13px',
                          color: '#fff',
                          whiteSpace: 'pre-line',
                          fontFamily: 'monospace'
                        }}
                      >
                        <p>{msg.text}</p>
                        {msg.options && (
                          <div style={{ display: 'flex', gap: '8px', marginTop: '10px', flexWrap: 'wrap' }}>
                            {msg.options.map((opt) => (
                              <button
                                key={opt}
                                onClick={() => handleSendMessage(opt)}
                                style={{
                                  background: '#38bdf8',
                                  color: '#000',
                                  border: 'none',
                                  padding: '6px 12px',
                                  borderRadius: '4px',
                                  fontWeight: 'bold',
                                  cursor: 'pointer',
                                  fontSize: '12px'
                                }}
                              >
                                {opt}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  <div style={{ display: 'flex', gap: '8px', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '10px' }}>
                    <input 
                      type="text" 
                      value={userInput}
                      onChange={(e) => setUserInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                      placeholder="Type 'play' or answer Fact/Myth..."
                      style={{
                        flex: 1,
                        background: 'rgba(0,0,0,0.4)',
                        border: '1px solid rgba(255,255,255,0.2)',
                        borderRadius: '6px',
                        padding: '8px 12px',
                        color: '#fff',
                        fontSize: '13px',
                        outline: 'none'
                      }}
                    />
                    <button 
                      onClick={() => handleSendMessage()}
                      style={{
                        background: '#38bdf8',
                        border: 'none',
                        borderRadius: '6px',
                        padding: '0 14px',
                        cursor: 'pointer',
                        color: '#000',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      <Send size={16} />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* --- TACTICAL TELEMETRY MODAL --- */}
            {selectedEvent && (
              <div className="event-modal-overlay">
                <div className="event-modal-card">
                  <div className="modal-header">
                    <span className="event-status">● LIVE TELEMETRY INTEL</span>
                    <button 
                      className="close-modal" 
                      onClick={() => {
                        if (soundEnabled) audio.playClick();
                        setSelectedEvent(null);
                      }}
                    >
                      ✕
                    </button>
                  </div>
                  
                  <h3>{selectedEvent.title}</h3>
                  
                  <div className="modal-meta-grid">
                    <p className="modal-category">
                      <strong>CLASS:</strong> {selectedEvent.categories?.[0]?.title || "ANOMALY"}
                    </p>
                    {selectedEvent.geometry && selectedEvent.geometry.length > 0 && selectedEvent.geometry[selectedEvent.geometry.length - 1]?.coordinates && (
                      <p className="modal-coords">
                        <strong>LOC:</strong> {selectedEvent.geometry[selectedEvent.geometry.length - 1].coordinates[1].toFixed(1)}°N, {selectedEvent.geometry[selectedEvent.geometry.length - 1].coordinates[0].toFixed(1)}°E
                      </p>
                    )}
                  </div>

                  <div className="modal-desc-box">
                    <span className="desc-title">ATMOSPHERIC / EVENT ANALYSIS</span>
                    <p className="modal-description">
                      {selectedEvent.description || 
                       "Real-time observation tracking indicates localized environmental disturbance. Telemetry feeds compiled via orbital satellite arrays and ground stations are actively logging progression parameters."}
                    </p>
                  </div>

                  {selectedEvent.links?.[0]?.url && (
                    <a 
                      href={selectedEvent.links[0].url.includes("api/v3") 
                        ? `https://www.google.com/search?q=${encodeURIComponent(selectedEvent.title + " NASA")}` 
                        : selectedEvent.links[0].url} 
                      target="_blank" 
                      rel="noreferrer" 
                      className="modal-stream-btn"
                    >
                      ACCESS RAW NASA FEED ↗
                    </a>
                  )}
                </div>
              </div>
            )}
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
              <button className="category-card" key={name} onClick={() => handleTabChange(name)}>
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
              <h2>Planet in Motion (Global Tracks)</h2>
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
                onClick={() => { if (soundEnabled) audio.playClick(); }}
              >
                <div>
                  <span className="event-status">● NOW PLAYING</span>
                  <h3>{event.title}</h3>
                  <p>
                    {event.categories?.map((category: any) => category.title).join(", ")}
                  </p>
                </div>
                <span className="event-link">STREAM FEED ↗</span>
              </a>
            ))}
          </div>
          <p className="data-credit">DATA SOURCE: NASA API V3 • SECRETS OF GAIA</p>
        </section>

        <footer className="footer">
          <span>SECRETS OF GAIA © 2026</span>
          <span>BUILT FOR NASA HACKATHON <span className="footer-star">✦</span></span>
        </footer>
      </section>
      {satViewOpen && <OrbitalAtlas onClose={() => setSatViewOpen(false)} />}
    </main>
  );
}

export default App;
