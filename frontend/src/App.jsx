
import { useCallback, useEffect, useState } from "react";
import "./index.css";

const API = import.meta.env.VITE_API_URL || "http://localhost:5000";

const NAV = [
  { id: "Dashboard", label: "Overview", icon: "grid" },
  { id: "Register Vehicle", label: "Register vehicle", icon: "plus" },
  { id: "Verify Vehicle", label: "Verify identity", icon: "shield" },
  { id: "Vehicle Records", label: "Vehicle records", icon: "database" }
];

function Icon({ name, size = 20 }) {
  const paths = {
    grid: <><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></>,
    plus: <><path d="M12 5v14"/><path d="M5 12h14"/></>,
    shield: <><path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11Z"/><path d="m9 12 2 2 4-4"/></>,
    database: <><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14a9 3 0 0 0 18 0V5"/><path d="M3 12a9 3 0 0 0 18 0"/></>,
    arrow: <><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></>,
    car: <><path d="m5 11 1.5-4.5A2 2 0 0 1 8.4 5h7.2a2 2 0 0 1 1.9 1.5L19 11"/><path d="M3 11h18v7H3z"/><path d="M6 18v2m12-2v2M6 14h.01M18 14h.01"/></>,
    check: <><path d="m5 12 4 4L19 6"/></>,
    clock: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
    external: <><path d="M14 3h7v7"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/></>,
    search: <><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></>,
    menu: <><path d="M4 6h16M4 12h16M4 18h16"/></>,
    close: <><path d="m18 6-12 12M6 6l12 12"/></>,
    activity: <><path d="M3 12h4l3-8 4 16 3-8h4"/></>,
    lock: <><rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 1 1 8 0v3"/></>,
    refresh: <><path d="M20 7v5h-5"/><path d="M4 17v-5h5"/><path d="M5.6 9A7 7 0 0 1 18 6l2 6M4 12l2 6a7 7 0 0 0 12.4-3"/></>
  };

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name] || paths.grid}
    </svg>
  );
}

const EMPTY_VEHICLE = {
  registrationNumber: "",
  chassisNumber: "",
  manufacturer: "",
  model: "",
  manufacturingYear: "",
  ownerIdentifier: ""
};

function App() {
  const [page, setPage] = useState("Dashboard");
  const [mobileMenu, setMobileMenu] = useState(false);
  const [stats, setStats] = useState("â€”");
  const [network, setNetwork] = useState("checking");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null);
  const [vehicle, setVehicle] = useState(EMPTY_VEHICLE);
  const [verification, setVerification] = useState({
    registrationNumber: "",
    chassisNumber: ""
  });
  const [searchReg, setSearchReg] = useState("");
  const [record, setRecord] = useState(null);
  const [recent, setRecent] = useState([]);

  const request = useCallback(async (path, options = {}) => {
    const response = await fetch(`${API}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options.headers
      }
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "The request could not be completed.");
    }

    return data;
  }, []);

  const loadSystem = useCallback(async () => {
    try {
      const [health, summary] = await Promise.all([
        request("/api/health"),
        request("/api/stats")
      ]);

      setNetwork(health.blockchain === "connected" ? "connected" : "offline");
      setStats(summary.totalVehicles);
    } catch {
      setNetwork("offline");
      setStats("â€”");
    }
  }, [request]);

  useEffect(() => {
    loadSystem();
  }, [loadSystem]);

  function navigate(id) {
    setPage(id);
    setMobileMenu(false);
    setMessage(null);
    setRecord(null);
  }

  async function register(e) {
    e.preventDefault();
    setBusy(true);
    setMessage(null);

    try {
      const data = await request("/api/vehicles", {
        method: "POST",
        body: JSON.stringify({
          ...vehicle,
          registrationNumber: vehicle.registrationNumber.trim().toUpperCase(),
          manufacturingYear: Number(vehicle.manufacturingYear)
        })
      });

      setMessage({ type: "success", title: "Registration confirmed", text: data.message, data });
      setRecent(previous => [
        {
          id: data.transactionHash,
          title: vehicle.registrationNumber.trim().toUpperCase(),
          subtitle: `${vehicle.manufacturer} ${vehicle.model}`,
          time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          hash: data.transactionHash
        },
        ...previous
      ].slice(0, 4));

      setVehicle(EMPTY_VEHICLE);
      await loadSystem();
    } catch (error) {
      setMessage({ type: "error", title: "Registration unsuccessful", text: error.message });
    } finally {
      setBusy(false);
    }
  }

  async function verify(e) {
    e.preventDefault();
    setBusy(true);
    setMessage(null);

    try {
      const data = await request("/api/vehicles/verify", {
        method: "POST",
        body: JSON.stringify(verification)
      });

      setMessage({
        type: data.verified ? "success" : "warning",
        title: data.verified ? "Identity verified" : "Verification unsuccessful",
        text: data.message,
        data
      });
    } catch (error) {
      setMessage({ type: "error", title: "Verification failed", text: error.message });
    } finally {
      setBusy(false);
    }
  }

  async function searchVehicle(e) {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    setRecord(null);

    try {
      const data = await request(
        `/api/vehicles/${encodeURIComponent(searchReg.trim())}`
      );
      setRecord(data.vehicle);
    } catch (error) {
      setMessage({ type: "error", title: "No record found", text: error.message });
    } finally {
      setBusy(false);
    }
  }

  const currentNav = NAV.find(item => item.id === page);
  const online = network === "connected";

  return (
    <div className="app-shell">
      {mobileMenu && (
        <button
          className="mobile-scrim"
          aria-label="Close navigation"
          onClick={() => setMobileMenu(false)}
        />
      )}

      <aside className={`sidebar ${mobileMenu ? "sidebar-open" : ""}`}>
        <button className="brand" onClick={() => navigate("Dashboard")} aria-label="SecureReg home">
          <span className="brand-mark">S<span>R</span></span>
          <span className="brand-copy">
            <strong>SecureReg</strong>
            <small>VEHICLE REGISTRY</small>
          </span>
        </button>

        <div className="sidebar-caption">WORKSPACE</div>

        <nav className="sidebar-nav" aria-label="Main navigation">
          {NAV.map(item => (
            <button
              key={item.id}
              className={`nav-item ${page === item.id ? "active" : ""}`}
              onClick={() => navigate(item.id)}
            >
              <span className="nav-icon"><Icon name={item.icon} size={18} /></span>
              <span>{item.label}</span>
              {page === item.id && <span className="nav-active-mark" />}
            </button>
          ))}
        </nav>

        <div className="sidebar-spacer" />

        <div className="sidebar-network">
          <div className="sidebar-network-top">
            <span className={`status-dot ${online ? "online" : "offline"}`} />
            <span>{online ? "Network connected" : network === "checking" ? "Checking network" : "Network unavailable"}</span>
          </div>
          <p>Local Ethereum development network</p>
          <div className="network-chain">
            <span>CHAIN ID</span>
            <strong>31337</strong>
          </div>
        </div>

        <div className="sidebar-footer">
          <span className="sidebar-footer-mark"><Icon name="lock" size={15} /></span>
          <span><strong>Secure by design</strong><small>Blockchain-backed records</small></span>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div className="topbar-left">
            <button
              className="mobile-menu-button"
              onClick={() => setMobileMenu(!mobileMenu)}
              aria-label="Toggle navigation"
            >
              <Icon name={mobileMenu ? "close" : "menu"} size={21} />
            </button>
            <div>
              <div className="breadcrumb">SECUREREG <span>/</span> {page.toUpperCase()}</div>
              <h1>{currentNav?.label || page}</h1>
            </div>
          </div>

          <div className={`connection-pill ${online ? "connected" : "disconnected"}`}>
            <span className={`status-dot ${online ? "online" : "offline"}`} />
            <span>{online ? "Local network live" : network === "checking" ? "Connecting..." : "Network offline"}</span>
          </div>
        </header>

        <div className="page-content">
          {page === "Dashboard" && (
            <>
              <section className="hero">
                <div className="hero-copy">
                  <div className="hero-kicker"><span /> TRUSTED VEHICLE RECORDS</div>
                  <h2>Vehicle identity,<br />secured on-chain.</h2>
                  <p>
                    A reliable registry for vehicle registration and identity
                    verification, backed by blockchain records.
                  </p>
                  <div className="hero-actions">
                    <button className="button button-white" onClick={() => navigate("Register Vehicle")}>
                      Register a vehicle <Icon name="arrow" size={16} />
                    </button>
                    <button className="button button-ghost" onClick={() => navigate("Verify Vehicle")}>
                      Verify identity
                    </button>
                  </div>
                </div>
                <div className="hero-art" aria-hidden="true">
                  <div className="hero-ring ring-one" />
                  <div className="hero-ring ring-two" />
                  <div className="hero-ring ring-three" />
                  <div className="hero-art-center">
                    <Icon name="shield" size={56} />
                    <span className="hero-check"><Icon name="check" size={17} /></span>
                  </div>
                  <span className="hero-art-caption">VERIFIED<br />RECORDS</span>
                </div>
                <div className="hero-index">01 <span>/ REGISTRY</span></div>
              </section>

              <div className="section-intro">
                <div>
                  <div className="section-overline">AT A GLANCE</div>
                  <h2>Registry overview</h2>
                </div>
                <button className="text-action" onClick={loadSystem} disabled={network === "checking"}>
                  <Icon name="refresh" size={15} /> Refresh status
                </button>
              </div>

              <section className="stats-grid">
                <article className="stat-card">
                  <div className="stat-top">
                    <span className="stat-icon red"><Icon name="car" size={19} /></span>
                    <span className="stat-category">REGISTRY</span>
                  </div>
                  <div className="stat-number">{stats}</div>
                  <div className="stat-bottom"><span>Total registered vehicles</span></div>
                </article>
                <article className="stat-card">
                  <div className="stat-top">
                    <span className="stat-icon dark"><Icon name="activity" size={19} /></span>
                    <span className="stat-category">NETWORK</span>
                  </div>
                  <div className="stat-number stat-word">{online ? "Connected" : network === "checking" ? "Checking" : "Offline"}</div>
                  <div className="stat-bottom"><span>Hardhat local Â· Chain 31337</span><span className={`mini-status ${online ? "ok" : "bad"}`} /></div>
                </article>
                <article className="stat-card">
                  <div className="stat-top">
                    <span className="stat-icon green"><Icon name="shield" size={19} /></span>
                    <span className="stat-category">INTEGRITY</span>
                  </div>
                  <div className="stat-number stat-word">Keccak-256</div>
                  <div className="stat-bottom"><span>Chassis hash verification</span></div>
                </article>
              </section>

              <section className="operations-section">
                <div className="section-intro compact">
                  <div>
                    <div className="section-overline">GET STARTED</div>
                    <h2>Registry operations</h2>
                  </div>
                  <span className="operation-count">03 OPERATIONS</span>
                </div>

                <div className="operation-grid">
                  <button className="operation-card" onClick={() => navigate("Register Vehicle")}>
                    <div className="operation-card-top">
                      <span className="operation-icon"><Icon name="plus" size={20} /></span>
                      <span className="operation-arrow"><Icon name="arrow" size={17} /></span>
                    </div>
                    <span className="operation-number">01 / REGISTER</span>
                    <strong>Register a vehicle</strong>
                    <p>Create a new vehicle record on the blockchain.</p>
                  </button>
                  <button className="operation-card" onClick={() => navigate("Verify Vehicle")}>
                    <div className="operation-card-top">
                      <span className="operation-icon"><Icon name="shield" size={20} /></span>
                      <span className="operation-arrow"><Icon name="arrow" size={17} /></span>
                    </div>
                    <span className="operation-number">02 / VERIFY</span>
                    <strong>Verify identity</strong>
                    <p>Validate a vehicle using its registration and chassis details.</p>
                  </button>
                  <button className="operation-card" onClick={() => navigate("Vehicle Records")}>
                    <div className="operation-card-top">
                      <span className="operation-icon"><Icon name="database" size={20} /></span>
                      <span className="operation-arrow"><Icon name="arrow" size={17} /></span>
                    </div>
                    <span className="operation-number">03 / EXPLORE</span>
                    <strong>Vehicle records</strong>
                    <p>Retrieve stored details and review a vehicle's current status.</p>
                  </button>
                </div>
              </section>

              <section className="recent-panel">
                <div className="recent-heading">
                  <div>
                    <div className="section-overline">SESSION ACTIVITY</div>
                    <h2>Recent registrations</h2>
                  </div>
                  <button className="text-action" onClick={() => navigate("Vehicle Records")}>
                    Search records <Icon name="arrow" size={15} />
                  </button>
                </div>

                {recent.length === 0 ? (
                  <div className="empty-activity">
                    <span className="empty-icon"><Icon name="clock" size={21} /></span>
                    <div>
                      <strong>No registrations in this session</strong>
                      <p>New successful registrations will appear here while this page remains open.</p>
                    </div>
                    <button className="button button-outline" onClick={() => navigate("Register Vehicle")}>Create record</button>
                  </div>
                ) : (
                  <div className="activity-list">
                    {recent.map(item => (
                      <div className="activity-row" key={item.id}>
                        <span className="activity-car"><Icon name="car" size={18} /></span>
                        <div className="activity-details">
                          <strong>{item.title}</strong>
                          <span>{item.subtitle}</span>
                        </div>
                        <div className="activity-time"><span>Confirmed</span><small>{item.time}</small></div>
                        <span className="activity-success"><Icon name="check" size={16} /></span>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </>
          )}

          {page === "Register Vehicle" && (
            <section className="workspace">
              <div className="workspace-heading">
                <div className="workspace-icon"><Icon name="car" size={22} /></div>
                <div>
                  <div className="section-overline">NEW REGISTRY ENTRY</div>
                  <h2>Vehicle registration</h2>
                  <p>Provide the vehicle details to create an on-chain registration record.</p>
                </div>
                <span className="record-tag">ON-CHAIN RECORD</span>
              </div>

              <form onSubmit={register}>
                <div className="form-section-heading"><span>01</span><div><h3>Vehicle information</h3><p>Enter the details as they appear in the vehicle documents.</p></div></div>
                <div className="form-grid">
                  <label className="field">
                    <span>Registration number <b>*</b></span>
                    <input required maxLength={20} placeholder="e.g. MH01AB1234" autoComplete="off" value={vehicle.registrationNumber} onChange={e => setVehicle({ ...vehicle, registrationNumber: e.target.value.toUpperCase() })} />
                    <small>Use a unique registration identifier.</small>
                  </label>
                  <label className="field">
                    <span>Chassis number <b>*</b></span>
                    <input required maxLength={100} placeholder="Enter chassis number" autoComplete="off" value={vehicle.chassisNumber} onChange={e => setVehicle({ ...vehicle, chassisNumber: e.target.value })} />
                    <small>A hash of this value will be stored on-chain.</small>
                  </label>
                  <label className="field">
                    <span>Manufacturer <b>*</b></span>
                    <input required maxLength={80} placeholder="e.g. Tata Motors" value={vehicle.manufacturer} onChange={e => setVehicle({ ...vehicle, manufacturer: e.target.value })} />
                  </label>
                  <label className="field">
                    <span>Vehicle model <b>*</b></span>
                    <input required maxLength={80} placeholder="e.g. Nexon" value={vehicle.model} onChange={e => setVehicle({ ...vehicle, model: e.target.value })} />
                  </label>
                  <label className="field">
                    <span>Manufacturing year <b>*</b></span>
                    <input required type="number" min="1886" max={new Date().getFullYear()} step="1" placeholder="e.g. 2025" value={vehicle.manufacturingYear} onChange={e => setVehicle({ ...vehicle, manufacturingYear: e.target.value })} />
                  </label>
                  <label className="field">
                    <span>Owner reference ID <b>*</b></span>
                    <input required maxLength={100} placeholder="Enter a demo owner ID" autoComplete="off" value={vehicle.ownerIdentifier} onChange={e => setVehicle({ ...vehicle, ownerIdentifier: e.target.value })} />
                    <small>Do not enter Aadhaar or other sensitive identity numbers.</small>
                  </label>
                </div>

                <div className="privacy-note">
                  <span className="privacy-icon"><Icon name="lock" size={18} /></span>
                  <div><strong>Data and privacy</strong><p>The chassis number and owner reference are hashed before storage. Registration number, manufacturer, model and manufacturing year are stored on the blockchain and may be publicly readable.</p></div>
                </div>

                <div className="form-actions">
                  <span className="required-note"><b>*</b> Required fields</span>
                  <button type="button" className="button button-outline" disabled={busy} onClick={() => { setVehicle(EMPTY_VEHICLE); setMessage(null); }}>Clear form</button>
                  <button type="submit" className="button button-primary" disabled={busy || !online}>
                    {busy ? <><span className="button-spinner" /> Processing transaction</> : <>Register vehicle <Icon name="arrow" size={16} /></>}
                  </button>
                </div>
                {!online && <p className="inline-warning">Start the Hardhat node and backend before registering a vehicle.</p>}
              </form>
            </section>
          )}

          {page === "Verify Vehicle" && (
            <section className="workspace">
              <div className="workspace-heading">
                <div className="workspace-icon"><Icon name="shield" size={22} /></div>
                <div>
                  <div className="section-overline">IDENTITY VALIDATION</div>
                  <h2>Verify a vehicle</h2>
                  <p>Compare the submitted chassis identity against the registered blockchain hash.</p>
                </div>
              </div>

              <div className="verify-banner">
                <div className="verify-banner-icon"><Icon name="shield" size={28} /></div>
                <div><strong>Verify against the source record</strong><p>A successful match confirms that the supplied chassis number matches the active record for that registration number.</p></div>
              </div>

              <form onSubmit={verify}>
                <div className="form-section-heading"><span>01</span><div><h3>Verification details</h3><p>Use the same chassis number supplied during registration.</p></div></div>
                <div className="form-grid single">
                  <label className="field">
                    <span>Registration number <b>*</b></span>
                    <input required maxLength={20} placeholder="e.g. MH01AB1234" autoComplete="off" value={verification.registrationNumber} onChange={e => setVerification({ ...verification, registrationNumber: e.target.value.toUpperCase() })} />
                  </label>
                  <label className="field">
                    <span>Chassis number <b>*</b></span>
                    <input required maxLength={100} placeholder="Enter the original chassis number" autoComplete="off" value={verification.chassisNumber} onChange={e => setVerification({ ...verification, chassisNumber: e.target.value })} />
                  </label>
                </div>
                <div className="form-actions">
                  <span className="required-note"><b>*</b> Required fields</span>
                  <button type="submit" className="button button-primary" disabled={busy || !online}>
                    {busy ? <><span className="button-spinner" /> Checking record</> : <>Verify identity <Icon name="arrow" size={16} /></>}
                  </button>
                </div>
              </form>
            </section>
          )}

          {page === "Vehicle Records" && (
            <section className="workspace">
              <div className="workspace-heading">
                <div className="workspace-icon"><Icon name="database" size={22} /></div>
                <div>
                  <div className="section-overline">REGISTRY LOOKUP</div>
                  <h2>Vehicle records</h2>
                  <p>Find a registered vehicle and inspect the information stored on-chain.</p>
                </div>
              </div>

              <form className="record-search" onSubmit={searchVehicle}>
                <span className="record-search-icon"><Icon name="search" size={21} /></span>
                <input required maxLength={20} placeholder="Search by registration number, e.g. MH01AB1234" value={searchReg} onChange={e => setSearchReg(e.target.value.toUpperCase())} />
                <button className="button button-primary" disabled={busy || !online}>
                  {busy ? "Searching..." : "Search records"}
                </button>
              </form>

              {!record && !message && (
                <div className="record-empty">
                  <span><Icon name="database" size={27} /></span>
                  <h3>Search the vehicle registry</h3>
                  <p>Enter a registration number above to retrieve its stored blockchain record.</p>
                </div>
              )}

              {record && (
                <div className="record-result">
                  <div className="record-result-head">
                    <div><div className="section-overline">REGISTRY RECORD</div><h3>{record.registrationNumber}</h3></div>
                    <span className={`record-status ${record.active ? "active" : "inactive"}`}><span />{record.active ? "Active" : "Inactive"}</span>
                  </div>
                  <div className="record-data-grid">
                    <div><span>MANUFACTURER</span><strong>{record.manufacturer}</strong></div>
                    <div><span>MODEL</span><strong>{record.model}</strong></div>
                    <div><span>MANUFACTURING YEAR</span><strong>{record.manufacturingYear}</strong></div>
                    <div><span>REGISTERED ON</span><strong>{new Date(Number(record.registeredAt) * 1000).toLocaleString()}</strong></div>
                    <div className="record-hash"><span>CHASSIS HASH</span><code>{record.chassisHash}</code></div>
                  </div>
                  <div className="record-result-foot"><Icon name="lock" size={16} /> Retrieved from the connected smart contract.</div>
                </div>
              )}
            </section>
          )}

          {message && (
            <section className={`feedback feedback-${message.type}`} role="status" aria-live="polite">
              <span className="feedback-icon"><Icon name={message.type === "success" ? "check" : message.type === "warning" ? "shield" : "activity"} size={20} /></span>
              <div className="feedback-content">
                <strong>{message.title}</strong>
                <p>{message.text}</p>
                {message.data?.transactionHash && <div className="transaction-info"><span>TRANSACTION HASH</span><code>{message.data.transactionHash}</code></div>}
                {message.data?.blockNumber !== undefined && <div className="transaction-block">Confirmed in block <strong>{message.data.blockNumber}</strong></div>}
                {message.data?.verified !== undefined && <div className="verification-outcome">{message.data.verified ? "The chassis hash matches the active vehicle record." : "The details did not match an active vehicle record."}</div>}
              </div>
              <button className="feedback-close" aria-label="Dismiss message" onClick={() => setMessage(null)}><Icon name="close" size={17} /></button>
            </section>
          )}

          <footer className="app-footer">
            <span>SECUREREG <span className="footer-separator">/</span> VEHICLE REGISTRY</span>
            <span><Icon name="lock" size={13} /> Local blockchain demonstration</span>
          </footer>
        </div>
      </main>
    </div>
  );
}

export default App;

