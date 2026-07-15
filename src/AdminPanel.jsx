import { useState, useEffect } from "react";
import { fetchActiveVisits, insertNewVisit, deleteVisit, updatePatientIdentity } from "./supabaseHelpers";
import { translations } from "./translations";



const EMPTY_FORM = {
  nama: "",
  nik: "",
  noBpjs: "",
  tglLahir: "",
  umur: "",
  jenisKelamin: "",
  alamat: "",
  noHp: "",
  namaKontak: "",
  hubKontak: "",
  noHpKontak: "",
  statusPasien: "",
};

// Helper: Animated counter component
function AnimatedCounter({ value, duration = 800 }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let start = 0;
    const end = parseInt(value, 10);
    if (isNaN(end) || end <= 0) {
      setCount(value);
      return;
    }

    const totalSteps = 40;
    const stepDuration = duration / totalSteps;
    let step = 0;

    const timer = setInterval(() => {
      step++;
      const progress = step / totalSteps;
      const currentVal = Math.round(start + progress * (end - start));
      setCount(currentVal);

      if (step >= totalSteps) {
        clearInterval(timer);
        setCount(end);
      }
    }, stepDuration);

    return () => clearInterval(timer);
  }, [value, duration]);

  return <>{count}</>;
}


// ─── Helpers ──────────────────────────────────────────────────────────────────
function calcUmur(tglLahir) {
  if (!tglLahir) return "";
  const today = new Date();
  const birth = new Date(tglLahir);
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

function getInitials(name) {
  if (!name) return "";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return parts[0] ? parts[0][0].toUpperCase() : "";
}

function formatArrivalTime(isoString) {
  if (!isoString) return "";
  const date = new Date(isoString);
  const dateStr = date.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric"
  });
  const timeStr = date.toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit"
  }).replace(".", ":");
  return `${dateStr} • ${timeStr}`;
}

function downloadCSV(data) {
  const headers = [
    "ID","Nama","NIK","No BPJS","Tgl Lahir","Umur","Jenis Kelamin",
    "Alamat","No HP","Nama Kontak Darurat","Hubungan Kontak","No HP Kontak Darurat","Status Pasien","Tgl Daftar",
  ];
  const rows = data.map((p) =>
    [
      p.id, p.nama, p.nik, p.noBpjs, p.tglLahir, p.umur, p.jenisKelamin,
      `"${p.alamat}"`, p.noHp, p.namaKontak, p.hubKontak, p.noHpKontak, p.statusPasien, p.tglDaftar,
    ].join(",")
  );
  const csv = [headers.join(","), ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `data-pasien-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function StatusBadge({ status }) {
  const map = {
    BPJS: "bg-success",
    Umum: "bg-secondary",
    Asuransi: "bg-info text-dark",
    Perusahaan: "bg-warning text-dark",
  };
  return (
    <span className={`badge ${map[status] || "bg-secondary"}`}>{status}</span>
  );
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────
function Sidebar({ activePage, setActivePage, userName, onLogout, lang }) {
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const navItems = [
    { id: "dashboard", icon: "bi-grid-fill", label: translations[lang].dashboard },
    { id: "pasien", icon: "bi-people-fill", label: translations[lang].patientData },
    { id: "tambah", icon: "bi-person-plus-fill", label: translations[lang].addPatient },
  ];

  return (
    <div
      className="d-flex flex-column"
      style={{
        width: 260,
        minHeight: "100vh",
        background: "linear-gradient(180deg, #111c44 0%, #080d21 100%)",
        color: "#fff",
        position: "fixed",
        top: 0,
        left: 0,
        zIndex: 100,
        boxShadow: "4px 0 20px rgba(0,0,0,0.15)",
      }}
    >
      {/* Brand */}
      <div
        className="d-flex align-items-center gap-2 px-4 py-4"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}
      >
        <div
          style={{
            background: "#145c9c",
            borderRadius: 10,
            width: 36,
            height: 36,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 2px 6px rgba(20, 92, 156, 0.4)"
          }}
        >
          <i className="bi bi-heart-pulse-fill text-white" style={{ fontSize: 18 }} />
        </div>
        <div>
          <div style={{ fontWeight: 700, fontSize: 15, letterSpacing: 0.5 }}>
            Smart-Triage
          </div>
          <div style={{ fontSize: 11, opacity: 0.65 }}>Admin Panel</div>
        </div>
      </div>

      {/* Nav */}
      <nav className="mt-4 flex-grow-1">
        {navItems.map((item) => {
          const isActive = activePage === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActivePage(item.id)}
              className="d-flex align-items-center gap-3 border-0 text-start py-3 px-4 transition-all"
              style={{
                width: "100%",
                background: isActive ? "rgba(255, 255, 255, 0.05)" : "transparent",
                color: isActive ? "#fff" : "rgba(255, 255, 255, 0.65)",
                fontWeight: isActive ? 600 : 400,
                fontSize: 14,
                cursor: "pointer",
                borderLeft: isActive ? "4px solid #145c9c" : "4px solid transparent",
                borderRadius: "0px",
                margin: "0px"
              }}
            >
              <i 
                className={`bi ${item.icon}`} 
                style={{ 
                  fontSize: 16, 
                  color: isActive ? "#60a5fa" : "rgba(255, 255, 255, 0.65)",
                  transition: "color 0.2s"
                }} 
              />
              {item.label}
            </button>
          );
        })}
      </nav>

      {/* User info & dropdown popover */}
      <div
        className="px-3 py-3 position-relative"
        style={{ borderTop: "1px solid rgba(255,255,255,0.08)", fontSize: 12 }}
      >
        {showProfileMenu && (
          <div 
            style={{
              position: "absolute",
              bottom: "65px",
              left: "12px",
              right: "12px",
              background: "#fff",
              borderRadius: "12px",
              boxShadow: "0 10px 25px rgba(0,0,0,0.15)",
              padding: "6px",
              display: "flex",
              flexDirection: "column",
              zIndex: 1000
            }}
          >
            <button 
              onClick={() => {
                setActivePage("profile");
                setShowProfileMenu(false);
              }}
              className="btn d-flex align-items-center gap-2 text-start px-3 py-2 border-0"
              style={{ fontSize: "13px", color: "#334155", borderRadius: "8px", fontWeight: "500" }}
            >
              <i className="bi bi-person-gear text-muted" style={{ fontSize: "15px" }} />
              Profile
            </button>
            <button 
              onClick={() => {
                if (onLogout) onLogout();
                setShowProfileMenu(false);
              }}
              className="btn d-flex align-items-center gap-2 text-start px-3 py-2 border-0"
              style={{ fontSize: "13px", color: "#dc2626", borderRadius: "8px", fontWeight: "500" }}
            >
              <i className="bi bi-box-arrow-right" style={{ fontSize: "15px" }} />
              Keluar
            </button>
          </div>
        )}

        <div className="d-flex align-items-center justify-content-between">
          <div className="d-flex align-items-center gap-2" style={{ minWidth: 0 }}>
            {/* Initials Avatar */}
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: "50%",
                background: "rgba(255,255,255,0.15)",
                color: "#fff",
                fontWeight: "600",
                fontSize: 13,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0
              }}
            >
              {getInitials(userName)}
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 600, color: "#fff", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>
                {userName || "Admin RS"}
              </div>
              <div style={{ opacity: 0.5, fontSize: 10 }}>Administrator</div>
            </div>
          </div>
          <button
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className="btn btn-link p-1 text-white border-0"
            style={{ opacity: 0.7 }}
          >
            <i className="bi bi-three-dots-vertical" style={{ fontSize: 15 }} />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Topbar ───────────────────────────────────────────────────────────────────
function Topbar({ title, lang, onToggleLanguage }) {
  const getSubtitle = () => {
    switch (title) {
      case "Dashboard":
        return translations[lang].subDashboard;
      case "Data Pasien":
        return translations[lang].subPatientData;
      case "Tambah Pasien":
        return translations[lang].subAddPatient;
      case "Profil Pengguna":
        return translations[lang].subUserProfile;
      default:
        return translations[lang].subDefault;
    }
  };

  const displayTitle = () => {
    if (title === "Dashboard") return translations[lang].dashboard;
    if (title === "Data Pasien") return translations[lang].patientData;
    if (title === "Tambah Pasien") return translations[lang].addPatient;
    if (title === "Profil Pengguna") return translations[lang].userProfile;
    return title;
  };

  return (
    <div
      className="d-flex align-items-center justify-content-between px-4 py-3"
      style={{
        background: "rgba(248, 250, 252, 0.85)",
        backdropFilter: "blur(10px)",
        WebkitBackdropFilter: "blur(10px)",
        position: "sticky",
        top: 0,
        zIndex: 50,
        borderBottom: "1px solid rgba(226, 232, 240, 0.8)"
      }}
    >
      <div>
        <h3 className="mb-0 fw-bold text-dark" style={{ letterSpacing: "-0.5px" }}>
          {displayTitle()}
        </h3>
        <div className="text-muted" style={{ fontSize: 13, marginTop: 2 }}>
          {getSubtitle()}
        </div>
      </div>
      <div className="d-flex align-items-center gap-3">
        {/* Language Switcher */}
        <div className="d-flex align-items-center bg-light p-1 rounded-pill me-2" style={{ border: "1px solid #e2e8f0" }}>
          <button
            onClick={() => onToggleLanguage("id")}
            className={`btn btn-sm rounded-circle p-0 d-flex align-items-center justify-content-center ${lang === "id" ? "bg-white border" : ""}`}
            style={{ 
              width: "32px", 
              height: "32px", 
              border: lang === "id" ? "1px solid rgba(0,0,0,0.08)" : "none", 
              boxShadow: lang === "id" ? "0 3px 8px rgba(0,0,0,0.12)" : "none",
              transition: "all 0.2s" 
            }}
            title="Bahasa Indonesia"
          >
            <img 
              src="https://flagcdn.com/w40/id.png" 
              alt="Indonesia Flag" 
              style={{ 
                width: "20px", 
                height: "14px", 
                borderRadius: "2px", 
                objectFit: "cover",
                boxShadow: "0 1px 3px rgba(0,0,0,0.2)"
              }} 
            />
          </button>
          <button
            onClick={() => onToggleLanguage("en")}
            className={`btn btn-sm rounded-circle p-0 d-flex align-items-center justify-content-center ${lang === "en" ? "bg-white border" : ""}`}
            style={{ 
              width: "32px", 
              height: "32px", 
              border: lang === "en" ? "1px solid rgba(0,0,0,0.08)" : "none", 
              boxShadow: lang === "en" ? "0 3px 8px rgba(0,0,0,0.12)" : "none",
              transition: "all 0.2s" 
            }}
            title="English"
          >
            <img 
              src="https://flagcdn.com/w40/gb.png" 
              alt="English Flag" 
              style={{ 
                width: "20px", 
                height: "14px", 
                borderRadius: "2px", 
                objectFit: "cover",
                boxShadow: "0 1px 3px rgba(0,0,0,0.2)"
              }} 
            />
          </button>
        </div>
        <span
          className="badge d-flex align-items-center gap-2 px-3 py-2"
          style={{ 
            background: "rgba(20, 92, 156, 0.08)", 
            color: "#145c9c", 
            fontSize: "12.5px", 
            fontWeight: "600",
            borderRadius: "30px",
            border: "none"
          }}
        >
          <i className="bi bi-calendar3" />
          {new Date().toLocaleDateString(lang === "id" ? "id-ID" : "en-US", {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
        </span>
      </div>
    </div>
  );
}

// ─── Page: Dashboard ──────────────────────────────────────────────────────────
function DashboardPage({ patients, setActivePage, isMobile, userName, lang }) {
  const byStatus = patients.reduce((acc, p) => {
    acc[p.statusPasien] = (acc[p.statusPasien] || 0) + 1;
    return acc;
  }, {});

  const t = translations[lang];

  if (isMobile) {
    const stats = [
      { label: t.totalPatients, value: patients.length, icon: "bi-people-fill", color: "#145c9c", bg: "#e0f2fe" },
      { label: t.bpjsPatients, value: byStatus["BPJS"] || 0, icon: "bi-shield-fill-check", color: "#137333", bg: "#e6f4ea" },
      { label: t.umumPatients, value: byStatus["Umum"] || 0, icon: "bi-person-fill", color: "#64748b", bg: "#f1f5f9" },
      { label: t.asuransiPatients, value: byStatus["Asuransi"] || 0, icon: "bi-shield-fill", color: "#0284c7", bg: "#e0f2fe" },
    ];

    // Get recent 3 patients
    const recentPatients = patients.slice(0, 3);

    return (
      <div style={{ background: "#f8fafc", minHeight: "100vh", padding: "10px 5px" }}>
        {/* Custom Greeting Header */}
        <div className="mb-4 px-1">
          <h3 className="fw-bold mb-1" style={{ color: "#1e293b", fontSize: "24px" }}>Halo, {userName || "Admin RS"}</h3>
          <div className="text-muted d-flex align-items-center gap-1.5" style={{ fontSize: "13px", fontWeight: "500" }}>
            <i className="bi bi-calendar3 text-secondary me-1" />
            {new Date().toLocaleDateString(lang === "id" ? "id-ID" : "en-US", {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </div>
        </div>

        {/* 2x2 Stats Cards Grid */}
        <div className="row g-3 mb-4">
          {stats.map((s) => (
            <div key={s.label} className="col-6">
              <div
                className="card border-0 shadow-sm rounded-4 p-3 h-100 bg-white"
                style={{ border: "1px solid #f1f5f9" }}
              >
                <div className="d-flex align-items-center justify-content-start mb-3">
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 10,
                      background: s.bg,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <i
                      className={`bi ${s.icon}`}
                      style={{ fontSize: 16, color: s.color }}
                    />
                  </div>
                </div>
                <div>
                  <div className="text-muted fw-semibold mb-1" style={{ fontSize: 11 }}>
                    {s.label}
                  </div>
                  <div className="fw-bold" style={{ fontSize: 24, color: "#1e293b", lineHeight: 1.1 }}>
                    <AnimatedCounter value={s.value} />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Recent Patients Section */}
        <div className="mb-4">
          <div className="d-flex align-items-center justify-content-between mb-3 px-1">
            <h5 className="fw-bold mb-0" style={{ color: "#1e293b", fontSize: "16px" }}>
              {t.patientName}
            </h5>
            <button
              className="btn btn-link p-0 text-decoration-none fw-semibold"
              style={{ color: "#145c9c", fontSize: "13px" }}
              onClick={() => setActivePage("pasien")}
            >
              {t.viewAll}
            </button>
          </div>

          {/* Patient Stack */}
          {recentPatients.length === 0 ? (
            <div className="text-center py-4 bg-white rounded-4 shadow-sm text-muted" style={{ fontSize: 12 }}>
              Belum ada pasien terdaftar
            </div>
          ) : (
            recentPatients.map((p) => {
              // Status Badge mapping
              let badgeColor = "#f1f5f9";
              let badgeTextColor = "#64748b";
              if (p.statusPasien === "BPJS") {
                badgeColor = "#e6f4ea";
                badgeTextColor = "#137333";
              } else if (p.statusPasien === "Asuransi") {
                badgeColor = "#e0f2fe";
                badgeTextColor = "#145c9c";
              }

              return (
                <div 
                  key={p.id}
                  className="card border-0 shadow-sm rounded-4 mb-2 bg-white"
                  style={{ padding: "12px 16px", border: "1px solid #f1f5f9" }}
                >
                  <div className="d-flex align-items-center justify-content-between">
                    <div className="d-flex align-items-center gap-3">
                      {/* Avatar initials */}
                      <div 
                        className="fw-bold d-flex align-items-center justify-content-center"
                        style={{
                          width: 42,
                          height: 42,
                          borderRadius: "50%",
                          background: p.statusPasien === "BPJS" ? "#e8f0fe" : "#f1f3f4",
                          color: p.statusPasien === "BPJS" ? "#1a73e8" : "#5f6368",
                          fontSize: 14
                        }}
                      >
                        {getInitials(p.nama)}
                      </div>
                      
                      {/* Name & Time */}
                      <div>
                        <div className="fw-bold" style={{ color: "#1e293b", fontSize: 14 }}>{p.nama}</div>
                        <div className="text-muted" style={{ fontSize: 11, marginTop: 2 }}>
                          {formatArrivalTime(p.arrival_time || p.tglDaftar)}
                        </div>
                      </div>
                    </div>

                    {/* Badge & Chevron */}
                    <div className="d-flex align-items-center gap-2">
                      <span 
                        className="badge text-uppercase fw-semibold"
                        style={{
                          background: badgeColor,
                          color: badgeTextColor,
                          fontSize: 10,
                          padding: "4px 8px",
                          borderRadius: 6
                        }}
                      >
                        {p.statusPasien}
                      </span>
                      <i className="bi bi-chevron-right text-muted" style={{ fontSize: 14 }} />
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Floating Action Button (FAB) */}
        <button
          onClick={() => setActivePage("tambah")}
          className="btn shadow-lg d-flex align-items-center justify-content-center"
          style={{
            position: "fixed",
            bottom: "85px",
            right: "20px",
            width: "55px",
            height: "55px",
            borderRadius: "50%",
            background: "#145c9c",
            color: "#fff",
            zIndex: 999,
            border: "none"
          }}
        >
          <i className="bi bi-plus-lg" style={{ fontSize: 24 }} />
        </button>
      </div>
    );
  }

  // Desktop view logic (updated to match mock)
  const stats = [
    { label: t.totalPatients.toUpperCase(), value: patients.length, icon: "bi-people-fill", color: "#145c9c", bg: "#e0f2fe", extraIcon: "bi-graph-up-arrow", extraIconColor: "#93c5fd" },
    { label: t.bpjsPatients.toUpperCase(), value: byStatus["BPJS"] || 0, icon: "bi-shield-check", color: "#10b981", bg: "#ecfdf5", extraIcon: "bi-check-circle", extraIconColor: "#a7f3d0" },
    { label: t.umumPatients.toUpperCase(), value: byStatus["Umum"] || 0, icon: "bi-person-fill", color: "#64748b", bg: "#f1f5f9", extraIcon: "bi-person", extraIconColor: "#cbd5e1" },
    { label: t.asuransiPatients.toUpperCase(), value: byStatus["Asuransi"] || 0, icon: "bi-file-earmark-text-fill", color: "#0284c7", bg: "#e0f2fe", extraIcon: "bi-shield", extraIconColor: "#bae6fd" },
  ];

  return (
    <div>
      {/* Stats cards */}
      <div className="row g-3 mb-4">
        {stats.map((s) => (
          <div key={s.label} className="col-6 col-xl-3">
            <div
              className="card border-0 p-4 h-100 bg-white"
              style={{ 
                borderRadius: "20px", 
                boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.03)",
                border: "1px solid rgba(0,0,0,0.01)" 
              }}
            >
              <div className="d-flex align-items-center justify-content-between mb-3">
                <div
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: 12,
                    background: s.bg,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <i
                    className={`bi ${s.icon}`}
                    style={{ fontSize: 18, color: s.color }}
                  />
                </div>
                <i className={`bi ${s.extraIcon}`} style={{ fontSize: 16, color: s.extraIconColor }} />
              </div>
              <div>
                <div className="fw-bold text-dark" style={{ fontSize: 32, lineHeight: 1.2 }}>
                  <AnimatedCounter value={s.value} />
                </div>
                <div 
                  className="text-uppercase fw-bold" 
                  style={{ 
                    fontSize: 10, 
                    color: "#94a3b8", 
                    letterSpacing: "0.8px", 
                    marginTop: 4 
                  }}
                >
                  {s.label}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Recent patients */}
      <div
        className="card border-0 p-4 bg-white"
        style={{ 
          borderRadius: "20px", 
          boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.03)",
          border: "1px solid rgba(0,0,0,0.01)" 
        }}
      >
        <div className="d-flex align-items-center justify-content-between mb-4">
          <div>
            <h5 className="fw-bold mb-1 text-dark" style={{ letterSpacing: "-0.3px" }}>
              {t.recentPatients}
            </h5>
            <div className="text-muted" style={{ fontSize: 13 }}>
              {t.subRecentPatients}
            </div>
          </div>
          <button
            className="btn btn-sm rounded-pill px-4 py-2 text-white fw-bold d-flex align-items-center gap-1.5"
            style={{ 
              background: "#145c9c", 
              border: "none", 
              fontSize: 13,
              boxShadow: "0 4px 12px rgba(20, 92, 156, 0.25)"
            }}
            onClick={() => setActivePage("pasien")}
          >
            {t.viewAll} <i className="bi bi-arrow-right" />
          </button>
        </div>
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0" style={{ fontSize: 13.5 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #f1f5f9" }}>
                <th className="fw-bold text-uppercase pb-3 border-0" style={{ color: "#94a3b8", fontSize: 10, letterSpacing: "0.5px" }}>{t.tableNama}</th>
                <th className="fw-bold text-uppercase pb-3 border-0" style={{ color: "#94a3b8", fontSize: 10, letterSpacing: "0.5px" }}>NIK</th>
                <th className="fw-bold text-uppercase pb-3 border-0" style={{ color: "#94a3b8", fontSize: 10, letterSpacing: "0.5px" }}>{t.tableStatus}</th>
                <th className="fw-bold text-uppercase pb-3 border-0" style={{ color: "#94a3b8", fontSize: 10, letterSpacing: "0.5px" }}>{t.tableDate}</th>
              </tr>
            </thead>
            <tbody>
              {patients.slice(0, 5).map((p) => {
                const badgeStyle = p.statusPasien === "BPJS" 
                  ? { bg: "#e6f4ea", color: "#10b981" } 
                  : p.statusPasien === "Asuransi" 
                  ? { bg: "#e0f2fe", color: "#0284c7" } 
                  : { bg: "#f1f5f9", color: "#64748b" };

                return (
                  <tr key={p.id} style={{ borderBottom: "1px solid #f8fafc" }}>
                    <td className="py-3">
                      <div className="d-flex align-items-center gap-3">
                        {/* Initial Avatar */}
                        <div
                          className="fw-bold d-flex align-items-center justify-content-center"
                          style={{
                            width: 36,
                            height: 36,
                            borderRadius: "50%",
                            background: badgeStyle.bg,
                            color: badgeStyle.color,
                            fontSize: 12
                          }}
                        >
                          {getInitials(p.nama)}
                        </div>
                        <span className="fw-bold text-dark">{p.nama}</span>
                      </div>
                    </td>
                    <td className="py-3 text-secondary" style={{ fontFamily: "monospace", fontSize: 13 }}>
                      {p.nik}
                    </td>
                    <td className="py-3">
                      <span 
                        className="badge text-uppercase fw-bold"
                        style={{
                          background: badgeStyle.bg,
                          color: badgeStyle.color,
                          fontSize: 10,
                          padding: "5px 10px",
                          borderRadius: "20px"
                        }}
                      >
                        {p.statusPasien}
                      </span>
                    </td>
                    <td className="py-3 text-secondary">{p.tglDaftar}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── Page: Data Pasien ────────────────────────────────────────────────────────
function DataPasienPage({ patients, setPatients, lang }) {
  const t = translations[lang];
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("Semua");
  const [deleteId, setDeleteId] = useState(null);

  const [editPatient, setEditPatient] = useState(null);
  const [editErrors, setEditErrors] = useState({});
  const [editGeneralError, setEditGeneralError] = useState("");
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  const filtered = patients.filter((p) => {
    const q = search.toLowerCase();
    const matchQ =
      !q ||
      p.nama.toLowerCase().includes(q) ||
      p.nik.includes(q) ||
      p.noBpjs.includes(q);
    const matchS = filterStatus === "Semua" || filterStatus === "All" || p.statusPasien === filterStatus;
    return matchQ && matchS;
  });

  const handleDelete = async (id) => {
    try {
      await deleteVisit(id);
      setPatients((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      console.error("Error deleting patient visit:", err.message);
    }
    setDeleteId(null);
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditPatient((prev) => {
      const updated = { ...prev, [name]: value };
      if (name === "tglLahir") updated.umur = calcUmur(value);
      return updated;
    });
    if (editErrors[name]) setEditErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const validateEdit = () => {
    const required = ["nama", "nik", "tglLahir", "jenisKelamin", "alamat", "noHp", "namaKontak", "hubKontak", "noHpKontak", "statusPasien"];
    const newErrors = {};
    required.forEach((f) => {
      if (!editPatient[f] || (typeof editPatient[f] === 'string' && !editPatient[f].trim())) {
        newErrors[f] = "Wajib diisi";
      }
    });
    if (editPatient.nik && editPatient.nik.length !== 16) newErrors.nik = "NIK harus 16 digit";
    if (editPatient.noBpjs && editPatient.noBpjs.length !== 13) {
      newErrors.noBpjs = "No BPJS harus 13 digit";
    }
    return newErrors;
  };

  const handleSaveEdit = async () => {
    const errs = validateEdit();
    if (Object.keys(errs).length > 0) {
      setEditErrors(errs);
      return;
    }
    setIsSavingEdit(true);
    setEditGeneralError("");
    try {
      await updatePatientIdentity(editPatient.patientId, editPatient);
      setPatients((prev) => 
        prev.map((p) => (p.id === editPatient.id ? { ...p, ...editPatient } : p))
      );
      setEditPatient(null);
    } catch (err) {
      if (err.message.includes('23505') || err.message.includes('unique constraint')) {
        setEditErrors((prev) => ({ ...prev, nik: "NIK sudah terdaftar" }));
      } else {
        console.error("Error updating patient details:", err.message);
        setEditGeneralError("Gagal memperbarui data: " + err.message);
      }
    } finally {
      setIsSavingEdit(false);
    }
  };

  return (
    <div>
      {/* Toolbar */}
      <div
        className="p-3 mb-3 d-flex flex-wrap gap-2 align-items-center justify-content-between"
        style={{ background: "#fff", border: "1px solid #e5e9f0", borderRadius: "20px" }}
      >
        <div className="d-flex gap-2 flex-wrap">
          <div className="input-group" style={{ width: 240, borderRadius: "10px", overflow: "hidden" }}>
            <span className="input-group-text border-end-0 bg-white">
              <i className="bi bi-search text-muted" style={{ fontSize: 13 }} />
            </span>
            <input
              type="text"
              className="form-control border-start-0 ps-0"
              placeholder={t.searchPlaceholder}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ fontSize: 13 }}
            />
          </div>
          <select
            className="form-select"
            style={{ width: 140, fontSize: 13, borderRadius: "10px" }}
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            {[t.all, "BPJS", "Umum", "Asuransi", "Perusahaan"].map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </div>
        <button
          className="btn btn-sm d-flex align-items-center gap-2 text-white"
          style={{ background: "#145c9c", border: "none", borderRadius: "30px", padding: "6px 16px", fontWeight: "600", fontSize: 13 }}
          onClick={() => downloadCSV(filtered)}
        >
          <i className="bi bi-download" />
          {t.downloadCsv}
        </button>
      </div>

      {/* Table */}
      <div
        style={{ 
          background: "#fff", 
          border: "1px solid #e5e9f0", 
          overflow: "hidden", 
          borderRadius: "20px",
          boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.03)"
        }}
      >
        <div className="table-responsive">
          <table className="table mb-0" style={{ fontSize: 13 }}>
            <thead style={{ background: "#f8fafc" }}>
              <tr>
                {["#", t.fullName, "NIK", t.bpjsNum, t.dob, t.age, t.gender, t.noHp, t.emergencyContact, t.status, t.actionLabel].map(
                  (h) => (
                    <th
                      key={h}
                      className="fw-semibold border-0 py-3"
                      style={{ color: "#64748b", whiteSpace: "nowrap" }}
                    >
                      {h}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={11} className="text-center py-5 text-muted">
                    <i className="bi bi-inbox d-block mb-2" style={{ fontSize: 28 }} />
                    {t.noData}
                  </td>
                </tr>
              ) : (
                filtered.map((p, i) => (
                  <tr key={p.id} style={{ borderTop: "1px solid #f0f2f5" }}>
                    <td className="py-3 text-muted">{i + 1}</td>
                    <td className="py-3 fw-medium">{p.nama}</td>
                    <td
                      className="py-3"
                      style={{ fontFamily: "monospace", color: "#475569" }}
                    >
                      {p.nik}
                    </td>
                    <td
                      className="py-3"
                      style={{ fontFamily: "monospace", color: "#475569" }}
                    >
                      {p.noBpjs || <span className="text-muted">-</span>}
                    </td>
                    <td className="py-3">{p.tglLahir}</td>
                    <td className="py-3">{p.umur} {t.yearsOld}</td>
                    <td className="py-3">{p.jenisKelamin}</td>
                    <td className="py-3">{p.noHp}</td>
                    <td className="py-3">
                      <div className="fw-medium">{p.namaKontak} ({p.hubKontak})</div>
                      <div className="text-muted" style={{ fontSize: 11 }}>
                        <i className="bi bi-telephone-fill me-1 text-secondary" style={{ fontSize: 10 }} />
                        {p.noHpKontak || "-"}
                      </div>
                    </td>
                    <td className="py-3">
                      <StatusBadge status={p.statusPasien} />
                    </td>
                    <td className="py-3" style={{ whiteSpace: "nowrap" }}>
                      <button
                        className="btn btn-sm btn-outline-primary me-2"
                        style={{ 
                          fontSize: 12, 
                          borderRadius: "30px", 
                          width: "30px", 
                          height: "30px", 
                          padding: 0,
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center"
                        }}
                        onClick={() => {
                          setEditPatient(p);
                          setEditErrors({});
                          setEditGeneralError("");
                        }}
                      >
                        <i className="bi bi-pencil-square" />
                      </button>
                      <button
                        className="btn btn-sm btn-outline-danger"
                        style={{ 
                          fontSize: 12, 
                          borderRadius: "30px", 
                          width: "30px", 
                          height: "30px", 
                          padding: 0,
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center"
                        }}
                        onClick={() => setDeleteId(p.id)}
                      >
                        <i className="bi bi-trash3" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div
          className="px-3 py-2 text-muted"
          style={{
            borderTop: "1px solid #f0f2f5",
            fontSize: 12,
            background: "#fafbfc",
          }}
        >
          Menampilkan {filtered.length} dari {patients.length} pasien
        </div>
      </div>

      {/* Delete confirm modal */}
      {deleteId && (
        <div
          className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center"
          style={{ background: "rgba(0,0,0,0.4)", zIndex: 999 }}
        >
          <div
            className="bg-white p-4"
            style={{ width: 340, boxShadow: "0 8px 32px rgba(0,0,0,0.18)", borderRadius: "20px" }}
          >
            <div className="text-center mb-3">
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: "50%",
                  background: "#fef2f2",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 12px",
                }}
              >
                <i className="bi bi-exclamation-triangle-fill text-danger" style={{ fontSize: 24 }} />
              </div>
              <h6 className="fw-semibold">Hapus Data Pasien?</h6>
              <p className="text-muted mb-0" style={{ fontSize: 13 }}>
                Data yang dihapus tidak dapat dikembalikan.
              </p>
            </div>
            <div className="d-flex gap-2 mt-3">
              <button
                className="btn btn-outline-secondary flex-fill"
                style={{ borderRadius: "30px", fontSize: 13, padding: "8px 16px" }}
                onClick={() => setDeleteId(null)}
              >
                Batal
              </button>
              <button
                className="btn btn-danger flex-fill"
                style={{ borderRadius: "30px", fontSize: 13, padding: "8px 16px", border: "none" }}
                onClick={() => handleDelete(deleteId)}
              >
                Ya, Hapus
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Patient Modal */}
      {editPatient && (
        <>
          <div
            className="modal-backdrop show"
            style={{ zIndex: 1040 }}
            onClick={() => setEditPatient(null)}
          />
          <div
            className="modal show d-block"
            tabIndex="-1"
            style={{ zIndex: 1050, top: "5%" }}
          >
            <div className="modal-dialog modal-lg modal-dialog-centered px-3">
              <div className="modal-content border-0 shadow-lg rounded-4 overflow-hidden bg-white">
                
                {/* Modal Header */}
                <div className="px-4 py-3 d-flex align-items-center justify-content-between" style={{ background: "#f8fafc", borderBottom: "1px solid #f1f5f9" }}>
                  <h6 className="modal-title fw-bold text-dark mb-0 d-flex align-items-center gap-2">
                    <i className="bi bi-pencil-square text-primary" />
                    Edit Identitas Pasien
                  </h6>
                  <button
                    type="button"
                    className="btn-close"
                    aria-label="Close"
                    onClick={() => setEditPatient(null)}
                  />
                </div>

                {/* Modal Body */}
                <div className="modal-body p-4" style={{ maxHeight: "70vh", overflowY: "auto" }}>
                  
                  {editGeneralError && (
                    <div className="alert alert-danger py-2 px-3 rounded-3 d-flex align-items-center gap-2 mb-3" style={{ fontSize: "12.5px" }}>
                      <i className="bi bi-exclamation-triangle-fill" />
                      <span>{editGeneralError}</span>
                    </div>
                  )}

                  <div className="row g-3">
                    {/* Section 1: Demographics */}
                    <div className="col-12">
                      <div className="fw-semibold text-muted text-uppercase mb-2" style={{ fontSize: "11px", letterSpacing: "0.5px" }}>Identitas Utama</div>
                    </div>
                    
                    <div className="col-md-6">
                      <label className="form-label fw-medium text-secondary mb-1" style={{ fontSize: 12.5 }}>Nama Lengkap <span className="text-danger">*</span></label>
                      <input
                        type="text"
                        name="nama"
                        className={`form-control rounded-3 ${editErrors.nama ? "is-invalid" : ""}`}
                        value={editPatient.nama}
                        onChange={handleEditChange}
                        style={{ fontSize: 13.5 }}
                      />
                      {editErrors.nama && <div className="invalid-feedback" style={{ fontSize: 11.5 }}>{editErrors.nama}</div>}
                    </div>

                    <div className="col-md-6">
                      <label className="form-label fw-medium text-secondary mb-1" style={{ fontSize: 12.5 }}>NIK (16 Digit) <span className="text-danger">*</span></label>
                      <input
                        type="text"
                        name="nik"
                        className={`form-control rounded-3 ${editErrors.nik ? "is-invalid" : ""}`}
                        value={editPatient.nik}
                        onChange={handleEditChange}
                        maxLength={16}
                        style={{ fontSize: 13.5 }}
                      />
                      {editErrors.nik && <div className="invalid-feedback" style={{ fontSize: 11.5 }}>{editErrors.nik}</div>}
                    </div>

                    <div className="col-md-6">
                      <label className="form-label fw-medium text-secondary mb-1" style={{ fontSize: 12.5 }}>No BPJS (13 Digit)</label>
                      <input
                        type="text"
                        name="noBpjs"
                        className={`form-control rounded-3 ${editErrors.noBpjs ? "is-invalid" : ""}`}
                        value={editPatient.noBpjs || ""}
                        onChange={handleEditChange}
                        maxLength={13}
                        placeholder="Opsional jika Umum"
                        style={{ fontSize: 13.5 }}
                      />
                      {editErrors.noBpjs && <div className="invalid-feedback" style={{ fontSize: 11.5 }}>{editErrors.noBpjs}</div>}
                    </div>

                    <div className="col-md-6">
                      <label className="form-label fw-medium text-secondary mb-1" style={{ fontSize: 12.5 }}>Tanggal Lahir <span className="text-danger">*</span></label>
                      <input
                        type="date"
                        name="tglLahir"
                        className={`form-control rounded-3 ${editErrors.tglLahir ? "is-invalid" : ""}`}
                        value={editPatient.tglLahir}
                        onChange={handleEditChange}
                        style={{ fontSize: 13.5 }}
                      />
                      {editErrors.tglLahir && <div className="invalid-feedback" style={{ fontSize: 11.5 }}>{editErrors.tglLahir}</div>}
                    </div>

                    <div className="col-md-6">
                      <label className="form-label fw-medium text-secondary mb-1" style={{ fontSize: 12.5 }}>Jenis Kelamin <span className="text-danger">*</span></label>
                      <select
                        name="jenisKelamin"
                        className={`form-select rounded-3 ${editErrors.jenisKelamin ? "is-invalid" : ""}`}
                        value={editPatient.jenisKelamin}
                        onChange={handleEditChange}
                        style={{ fontSize: 13.5 }}
                      >
                        <option value="">Pilih Jenis Kelamin</option>
                        <option value="Laki-laki">Laki-laki</option>
                        <option value="Perempuan">Perempuan</option>
                      </select>
                      {editErrors.jenisKelamin && <div className="invalid-feedback" style={{ fontSize: 11.5 }}>{editErrors.jenisKelamin}</div>}
                    </div>

                    <div className="col-md-6">
                      <label className="form-label fw-medium text-secondary mb-1" style={{ fontSize: 12.5 }}>Status Pasien <span className="text-danger">*</span></label>
                      <select
                        name="statusPasien"
                        className={`form-select rounded-3 ${editErrors.statusPasien ? "is-invalid" : ""}`}
                        value={editPatient.statusPasien}
                        onChange={handleEditChange}
                        style={{ fontSize: 13.5 }}
                      >
                        <option value="">Pilih Status</option>
                        <option value="BPJS">BPJS</option>
                        <option value="Umum">Umum</option>
                        <option value="Asuransi">Asuransi</option>
                        <option value="Perusahaan">Perusahaan</option>
                      </select>
                      {editErrors.statusPasien && <div className="invalid-feedback" style={{ fontSize: 11.5 }}>{editErrors.statusPasien}</div>}
                    </div>

                    <div className="col-md-6">
                      <label className="form-label fw-medium text-secondary mb-1" style={{ fontSize: 12.5 }}>No HP <span className="text-danger">*</span></label>
                      <input
                        type="text"
                        name="noHp"
                        className={`form-control rounded-3 ${editErrors.noHp ? "is-invalid" : ""}`}
                        value={editPatient.noHp}
                        onChange={handleEditChange}
                        style={{ fontSize: 13.5 }}
                      />
                      {editErrors.noHp && <div className="invalid-feedback" style={{ fontSize: 11.5 }}>{editErrors.noHp}</div>}
                    </div>

                    <div className="col-md-6">
                      <label className="form-label fw-medium text-secondary mb-1" style={{ fontSize: 12.5 }}>Alamat Lengkap <span className="text-danger">*</span></label>
                      <input
                        type="text"
                        name="alamat"
                        className={`form-control rounded-3 ${editErrors.alamat ? "is-invalid" : ""}`}
                        value={editPatient.alamat}
                        onChange={handleEditChange}
                        style={{ fontSize: 13.5 }}
                      />
                      {editErrors.alamat && <div className="invalid-feedback" style={{ fontSize: 11.5 }}>{editErrors.alamat}</div>}
                    </div>

                    {/* Section 2: Emergency Contact */}
                    <div className="col-12 mt-4">
                      <div className="fw-semibold text-muted text-uppercase mb-2" style={{ fontSize: "11px", letterSpacing: "0.5px" }}>Kontak Darurat</div>
                    </div>

                    <div className="col-md-4">
                      <label className="form-label fw-medium text-secondary mb-1" style={{ fontSize: 12.5 }}>Nama Kontak <span className="text-danger">*</span></label>
                      <input
                        type="text"
                        name="namaKontak"
                        className={`form-control rounded-3 ${editErrors.namaKontak ? "is-invalid" : ""}`}
                        value={editPatient.namaKontak}
                        onChange={handleEditChange}
                        style={{ fontSize: 13.5 }}
                      />
                      {editErrors.namaKontak && <div className="invalid-feedback" style={{ fontSize: 11.5 }}>{editErrors.namaKontak}</div>}
                    </div>

                    <div className="col-md-4">
                      <label className="form-label fw-medium text-secondary mb-1" style={{ fontSize: 12.5 }}>Hubungan <span className="text-danger">*</span></label>
                      <input
                        type="text"
                        name="hubKontak"
                        className={`form-control rounded-3 ${editErrors.hubKontak ? "is-invalid" : ""}`}
                        value={editPatient.hubKontak}
                        onChange={handleEditChange}
                        placeholder="Contoh: Suami, Ibu, Kakak"
                        style={{ fontSize: 13.5 }}
                      />
                      {editErrors.hubKontak && <div className="invalid-feedback" style={{ fontSize: 11.5 }}>{editErrors.hubKontak}</div>}
                    </div>

                    <div className="col-md-4">
                      <label className="form-label fw-medium text-secondary mb-1" style={{ fontSize: 12.5 }}>No HP Kontak <span className="text-danger">*</span></label>
                      <input
                        type="text"
                        name="noHpKontak"
                        className={`form-control rounded-3 ${editErrors.noHpKontak ? "is-invalid" : ""}`}
                        value={editPatient.noHpKontak}
                        onChange={handleEditChange}
                        style={{ fontSize: 13.5 }}
                      />
                      {editErrors.noHpKontak && <div className="invalid-feedback" style={{ fontSize: 11.5 }}>{editErrors.noHpKontak}</div>}
                    </div>

                  </div>
                </div>

                {/* Modal Footer */}
                <div className="px-4 py-3 d-flex gap-2 justify-content-end" style={{ background: "#f8fafc", borderTop: "1px solid #f1f5f9" }}>
                  <button
                    type="button"
                    className="btn btn-light rounded-pill px-4"
                    onClick={() => setEditPatient(null)}
                    style={{ fontSize: 13.5, fontWeight: "600" }}
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary rounded-pill px-4 d-flex align-items-center gap-2"
                    onClick={handleSaveEdit}
                    disabled={isSavingEdit}
                    style={{ background: "#145c9c", borderColor: "#145c9c", fontSize: 13.5, fontWeight: "600" }}
                  >
                    {isSavingEdit ? (
                      <>
                        <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" />
                        Menyimpan...
                      </>
                    ) : (
                      <>
                        <i className="bi bi-floppy" />
                        Simpan Perubahan
                      </>
                    )}
                  </button>
                </div>

              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Page: Tambah Pasien ──────────────────────────────────────────────────────
function TambahPasienPage({ setPatients, setActivePage, lang }) {
  const t = translations[lang];
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [success, setSuccess] = useState(false);
  const [generalError, setGeneralError] = useState("");

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => {
      const updated = { ...prev, [name]: value };
      // Auto-calc umur
      if (name === "tglLahir") updated.umur = calcUmur(value);
      return updated;
    });
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const validate = () => {
    const required = ["nama", "nik", "tglLahir", "jenisKelamin", "alamat", "noHp", "namaKontak", "hubKontak", "noHpKontak", "statusPasien"];
    const newErrors = {};
    required.forEach((f) => {
      if (!form[f] || !form[f].trim()) newErrors[f] = t.validationRequired;
    });
    if (form.nik && form.nik.length !== 16) newErrors.nik = t.validationNik;
    if (form.noBpjs && form.noBpjs.length !== 13)
      newErrors.noBpjs = t.validationBpjs;
    return newErrors;
  };

  const handleSubmit = async () => {
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    try {
      const visitId = await insertNewVisit(form);
      const newPatient = {
        ...form,
        id: visitId,
        patientId: '',
        umur: calcUmur(form.tglLahir),
        tglDaftar: new Date().toISOString().slice(0, 10),
        keluhan: '',
        beratBadan: '', tinggiBadan: '', imt: '', lingkarKepala: '', lingkarLengan: '', golDarah: '-',
        rr: '', spo2: '', suplemenO2: 'Tidak', suhu: '', sistolik: '', diastolik: '', nadi: '', avpu: 'Alert',
        meowsScore: 0, triageRisk: 'Low', tglTriage: '',
        diagnosa: '', statusDiagnosis: 'Belum Diperiksa'
      };
      setPatients((prev) => [newPatient, ...prev]);
      setSuccess(true);
      setForm(EMPTY_FORM);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      if (err.message.includes('23505') || err.message.includes('unique constraint')) {
        setErrors((prev) => ({ ...prev, nik: t.validationNikRegistered }));
      } else {
        console.error("Error inserting patient visit:", err.message);
        setGeneralError(t.validationSaveFailed + err.message);
        setTimeout(() => setGeneralError(""), 6000);
      }
    }
  };

  const renderField = (label, name, type = "text", placeholder = "", required = false, children = null) => (
    <div>
      <label className="form-label fw-medium" style={{ fontSize: 13, color: "#374151" }}>
        {label}{" "}
        {required && <span className="text-danger">*</span>}
      </label>
      {children || (
        <input
          type={type}
          name={name}
          className={`form-control ${errors[name] ? "is-invalid" : ""}`}
          placeholder={placeholder}
          value={form[name]}
          onChange={handleChange}
          style={{ fontSize: 13 }}
        />
      )}
      {errors[name] && (
        <div className="invalid-feedback" style={{ fontSize: 12 }}>
          {errors[name]}
        </div>
      )}
    </div>
  );

  return (
    <div>
      {success && (
        <div
          className="alert d-flex align-items-center gap-2 mb-3"
          style={{
            background: "#e8f6ef",
            border: "1px solid #b7dfca",
            color: "#166534",
            borderRadius: 10,
            fontSize: 13,
          }}
        >
          <i className="bi bi-check-circle-fill" />
          {t.patientSavedSuccess}{" "}
          <button
            className="btn btn-link p-0"
            style={{ color: "#166534", fontSize: 13 }}
            onClick={() => setActivePage("pasien")}
          >
            {t.patientData}
          </button>
        </div>
      )}

      {generalError && (
        <div
          className="alert d-flex align-items-center gap-2 mb-3"
          style={{
            background: "#fee2e2",
            border: "1px solid #fecaca",
            color: "#991b1b",
            borderRadius: 10,
            fontSize: 13,
          }}
        >
          <i className="bi bi-exclamation-triangle-fill" />
          {generalError}
        </div>
      )}

      <div
        className="p-4"
        style={{ 
          background: "#fff", 
          border: "1px solid #e5e9f0", 
          borderRadius: "20px",
          boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.03)"
        }}
      >
        <h6 className="fw-semibold mb-4" style={{ color: "#1e3a5f" }}>
          <i className="bi bi-person-plus me-2" />
          {t.patientIdentityForm}
        </h6>

        {/* Section: Data Utama */}
        <div className="mb-4">
          <div
            className="d-flex align-items-center gap-2 mb-3"
            style={{ color: "#145c9c" }}
          >
            <div
              style={{
                width: 4,
                height: 18,
                background: "#145c9c",
                borderRadius: 2,
              }}
            />
            <span className="fw-semibold" style={{ fontSize: 13 }}>
              {t.identityData}
            </span>
          </div>
          <div className="row g-3">
            <div className="col-12 col-md-6">
              {renderField(t.fullName, "nama", "text", lang === "id" ? "Contoh: Siti Rahayu" : "Example: Jane Doe", true)}
            </div>
            <div className="col-12 col-md-6">
              {renderField(t.nikKtp, "nik", "text", lang === "id" ? "16 digit NIK" : "16 digit ID Card", true, (
                <>
                  <input
                    type="text"
                    name="nik"
                    className={`form-control ${errors.nik ? "is-invalid" : ""}`}
                    placeholder={lang === "id" ? "16 digit NIK" : "16-digit ID Card"}
                    value={form.nik}
                    onChange={handleChange}
                    maxLength={16}
                    style={{ fontSize: 13, fontFamily: "monospace" }}
                  />
                  {errors.nik && (
                    <div className="invalid-feedback" style={{ fontSize: 12 }}>
                      {errors.nik}
                    </div>
                  )}
                </>
              ))}
            </div>
            <div className="col-12 col-md-6">
              {renderField(t.bpjsInsurance, "noBpjs", "text", lang === "id" ? "13 digit (opsional)" : "13-digit BPJS (optional)", false, (
                <>
                  <input
                    type="text"
                    name="noBpjs"
                    className={`form-control ${errors.noBpjs ? "is-invalid" : ""}`}
                    placeholder={lang === "id" ? "13 digit (opsional)" : "13-digit (optional)"}
                    value={form.noBpjs}
                    onChange={handleChange}
                    maxLength={13}
                    style={{ fontSize: 13, fontFamily: "monospace" }}
                  />
                  {errors.noBpjs && (
                    <div className="invalid-feedback" style={{ fontSize: 12 }}>
                      {errors.noBpjs}
                    </div>
                  )}
                </>
              ))}
            </div>
            <div className="col-6 col-md-3">
              {renderField(t.dob, "tglLahir", "date", "", true)}
            </div>
            <div className="col-6 col-md-3">
              <label className="form-label fw-medium" style={{ fontSize: 13, color: "#374151" }}>
                {t.age}
              </label>
              <div
                className="form-control"
                style={{ fontSize: 13, background: "#f8fafc", color: "#475569" }}
              >
                {form.umur !== "" ? `${form.umur} ${t.yearsOld}` : t.autoDob}
              </div>
            </div>
            <div className="col-12 col-md-6">
              <label className="form-label fw-medium" style={{ fontSize: 13, color: "#374151" }}>
                {t.gender} <span className="text-danger">*</span>
              </label>
              <select
                name="jenisKelamin"
                className={`form-select ${errors.jenisKelamin ? "is-invalid" : ""}`}
                value={form.jenisKelamin}
                onChange={handleChange}
                style={{ fontSize: 13 }}
              >
                <option value="">{t.genderSelect}</option>
                <option value="Laki-laki">{t.male}</option>
                <option value="Perempuan">{t.female}</option>
              </select>
              {errors.jenisKelamin && (
                <div className="invalid-feedback" style={{ fontSize: 12 }}>
                  {errors.jenisKelamin}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Section: Kontak */}
        <div className="mb-4">
          <div
            className="d-flex align-items-center gap-2 mb-3"
            style={{ color: "#145c9c" }}
          >
            <div
              style={{
                width: 4,
                height: 18,
                background: "#145c9c",
                borderRadius: 2,
              }}
            />
            <span className="fw-semibold" style={{ fontSize: 13 }}>
              {t.contactData}
            </span>
          </div>
          <div className="row g-3">
            <div className="col-12">
              <label className="form-label fw-medium" style={{ fontSize: 13, color: "#374151" }}>
                {t.address} <span className="text-danger">*</span>
              </label>
              <textarea
                name="alamat"
                className={`form-control ${errors.alamat ? "is-invalid" : ""}`}
                rows={2}
                placeholder={t.fullAddress}
                value={form.alamat}
                onChange={handleChange}
                style={{ fontSize: 13, resize: "none" }}
              />
              {errors.alamat && (
                <div className="invalid-feedback" style={{ fontSize: 12 }}>
                  {errors.alamat}
                </div>
              )}
            </div>
            <div className="col-12 col-md-6">
              {renderField(t.noHp, "noHp", "tel", lang === "id" ? "Contoh: 08123456789" : "Example: 08123456789", true)}
            </div>
          </div>
        </div>

        {/* Section: Kontak Darurat */}
        <div className="mb-4">
          <div
            className="d-flex align-items-center gap-2 mb-3"
            style={{ color: "#145c9c" }}
          >
            <div
              style={{
                width: 4,
                height: 18,
                background: "#145c9c",
                borderRadius: 2,
              }}
            />
            <span className="fw-semibold" style={{ fontSize: 13 }}>
              {t.emergencyContact}
            </span>
          </div>
          <div className="row g-3">
            <div className="col-12 col-md-4">
              {renderField(t.emergencyContactName, "namaKontak", "text", lang === "id" ? "Nama lengkap" : "Full name", true)}
            </div>
            <div className="col-12 col-md-4">
              {renderField(t.relationshipToPatient, "hubKontak", "text", lang === "id" ? "Contoh: Ayah, Ibu, Suami, Istri" : "Example: Father, Mother, Spouse", true)}
            </div>
            <div className="col-12 col-md-4">
              {renderField(t.emergencyContactPhone, "noHpKontak", "tel", lang === "id" ? "Contoh: 08123456789" : "Example: 08123456789", true)}
            </div>
          </div>
        </div>

        {/* Section: Status */}
        <div className="mb-4">
          <div
            className="d-flex align-items-center gap-2 mb-3"
            style={{ color: "#145c9c" }}
          >
            <div
              style={{
                width: 4,
                height: 18,
                background: "#145c9c",
                borderRadius: 2,
              }}
            />
            <span className="fw-semibold" style={{ fontSize: 13 }}>
              {t.status}
            </span>
          </div>
          <div className="row g-3">
            <div className="col-12 col-md-4">
              <label className="form-label fw-medium" style={{ fontSize: 13, color: "#374151" }}>
                Status <span className="text-danger">*</span>
              </label>
              <div className="d-flex flex-wrap gap-2">
                {["Umum", "BPJS", "Asuransi", "Perusahaan"].map((s) => {
                  const displayStatus = s === "Umum" ? (lang === "id" ? "Umum" : "Public") :
                                        s === "Asuransi" ? (lang === "id" ? "Asuransi" : "Insurance") :
                                        s === "Perusahaan" ? (lang === "id" ? "Perusahaan" : "Corporate") : s;
                  return (
                    <button
                      key={s}
                      type="button"
                      onClick={() => {
                        setForm((prev) => ({ ...prev, statusPasien: s }));
                        if (errors.statusPasien)
                          setErrors((prev) => ({ ...prev, statusPasien: "" }));
                      }}
                      className="btn btn-sm"
                      style={{
                        fontSize: 12,
                        border: "1.5px solid",
                        borderColor: form.statusPasien === s ? "#145c9c" : "#dee2e6",
                        background: form.statusPasien === s ? "#145c9c" : "#fff",
                        color: form.statusPasien === s ? "#fff" : "#374151",
                        fontWeight: form.statusPasien === s ? 600 : 400,
                        borderRadius: "30px",
                        padding: "5px 15px"
                      }}
                    >
                      {displayStatus}
                    </button>
                  );
                })}
              </div>
              {errors.statusPasien && (
                <div className="text-danger mt-1" style={{ fontSize: 12 }}>
                  {errors.statusPasien}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div
          className="d-flex gap-2 pt-3"
          style={{ borderTop: "1px solid #f0f2f5" }}
        >
          <button
            className="btn btn-outline-secondary"
            style={{ fontSize: 13, borderRadius: "30px", padding: "8px 20px" }}
            onClick={() => {
              setForm(EMPTY_FORM);
              setErrors({});
            }}
          >
            <i className="bi bi-arrow-counterclockwise me-1" />
            {t.reset}
          </button>
          <button
            className="btn text-white"
            style={{
              background: "#145c9c",
              fontSize: 13,
              padding: "8px 24px",
              borderRadius: "30px",
              border: "none",
              fontWeight: "600"
            }}
            onClick={handleSubmit}
          >
            <i className="bi bi-floppy me-2" />
            {t.savePatientData}
          </button>
        </div>
      </div>
    </div>
  );
}

function UserProfilePage({ userName, userEmail, joinedAt, onLogout, onChangePassword, role, themeColor, badgeBg, badgeColor, onUpdateProfileName }) {
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState(userName || "");
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    if (newPassword.length < 6) {
      setErrorMsg("Password baru harus minimal 6 karakter.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMsg("Konfirmasi password tidak cocok.");
      return;
    }

    setIsSubmitting(true);
    try {
      await onChangePassword(newPassword);
      setSuccessMsg("Password berhasil diperbarui!");
      setNewPassword("");
      setConfirmPassword("");
      setTimeout(() => setShowPasswordForm(false), 2000);
    } catch (err) {
      setErrorMsg(err.message || "Gagal mengubah password. Silakan coba kembali.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container py-4" style={{ maxWidth: "500px" }}>
      <div className="card border-0 shadow-sm rounded-4 overflow-hidden bg-white">
        <div style={{ height: "100px", background: `linear-gradient(135deg, ${themeColor} 0%, #1e293b 100%)` }} />
        <div className="text-center px-4 pb-4" style={{ marginTop: "-50px" }}>
          <div 
            className="d-inline-flex justify-content-center align-items-center mb-3 bg-white shadow-sm"
            style={{
              width: "100px",
              height: "100px",
              borderRadius: "50%",
              border: "4px solid #fff"
            }}
          >
            <div 
              className="d-flex justify-content-center align-items-center rounded-circle fw-bold"
              style={{
                width: "88px",
                height: "88px",
                background: badgeBg,
                color: themeColor,
                fontSize: "32px"
              }}
            >
              {getInitials(userName)}
            </div>
          </div>

          {isEditingName ? (
            <div className="d-flex align-items-center justify-content-center gap-2 mb-2">
              <input
                type="text"
                className="form-control form-control-sm text-center fw-bold fs-5"
                style={{ maxWidth: "250px" }}
                value={tempName}
                onChange={(e) => setTempName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    if (tempName.trim()) {
                      onUpdateProfileName(tempName.trim());
                      setIsEditingName(false);
                    }
                  } else if (e.key === "Escape") {
                    setIsEditingName(false);
                  }
                }}
                autoFocus
              />
              <button 
                onClick={() => {
                  if (tempName.trim()) {
                    onUpdateProfileName(tempName.trim());
                    setIsEditingName(false);
                  }
                }}
                className="btn btn-sm btn-success rounded-circle p-1"
                style={{ width: "28px", height: "28px", display: "inline-flex", alignItems: "center", justifyContent: "center" }}
              >
                <i className="bi bi-check-lg" />
              </button>
              <button 
                onClick={() => setIsEditingName(false)}
                className="btn btn-sm btn-danger rounded-circle p-1"
                style={{ width: "28px", height: "28px", display: "inline-flex", alignItems: "center", justifyContent: "center" }}
              >
                <i className="bi bi-x-lg" />
              </button>
            </div>
          ) : (
            <div className="d-flex align-items-center justify-content-center gap-2 mb-1">
              <h4 className="fw-bold mb-0 text-dark" style={{ letterSpacing: "-0.5px" }}>
                {userName || "User"}
              </h4>
              <button
                onClick={() => {
                  setTempName(userName || "");
                  setIsEditingName(true);
                }}
                className="btn btn-link p-0 text-secondary border-0"
                title="Ubah Nama Profile"
              >
                <i className="bi bi-pencil-square" style={{ fontSize: "16px" }} />
              </button>
            </div>
          )}
          
          <span 
            className="badge mb-4 px-3 py-2 rounded-pill text-uppercase fw-semibold"
            style={{
              background: badgeBg,
              color: badgeColor,
              fontSize: "11px",
              letterSpacing: "0.5px"
            }}
          >
            {role}
          </span>

          <div className="bg-light rounded-3 p-4 mb-4 text-start" style={{ border: "1px solid #e2e8f0" }}>
            <h6 className="fw-bold text-dark mb-3" style={{ fontSize: "14px" }}>Informasi Akun</h6>
            
            <div className="mb-3 d-flex align-items-center gap-3">
              <div 
                className="d-flex align-items-center justify-content-center rounded-circle" 
                style={{ width: "36px", height: "36px", background: "#fff", border: "1px solid #e2e8f0" }}
              >
                <i className="bi bi-envelope text-muted" style={{ fontSize: "16px" }} />
              </div>
              <div>
                <div className="text-muted fw-semibold" style={{ fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.3px" }}>Email</div>
                <div className="text-dark fw-semibold" style={{ fontSize: "13.5px", wordBreak: "break-all" }}>{userEmail || "-"}</div>
              </div>
            </div>

            <div className="d-flex align-items-center gap-3">
              <div 
                className="d-flex align-items-center justify-content-center rounded-circle" 
                style={{ width: "36px", height: "36px", background: "#fff", border: "1px solid #e2e8f0" }}
              >
                <i className="bi bi-calendar-event text-muted" style={{ fontSize: "16px" }} />
              </div>
              <div>
                <div className="text-muted fw-semibold" style={{ fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.3px" }}>Bergabung Sejak</div>
                <div className="text-dark fw-semibold" style={{ fontSize: "13.5px" }}>
                  {joinedAt ? new Date(joinedAt).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' }) : "-"}
                </div>
              </div>
            </div>
          </div>

          {/* Change Password Form */}
          <div className="mb-4 text-start">
            <button
              type="button"
              className="btn btn-outline-secondary btn-sm w-100 rounded-pill d-flex align-items-center justify-content-center gap-2"
              onClick={() => {
                setShowPasswordForm(!showPasswordForm);
                setErrorMsg("");
                setSuccessMsg("");
              }}
              style={{ fontSize: "13px", fontWeight: "600", padding: "10px 0" }}
            >
              <i className={`bi ${showPasswordForm ? "bi-chevron-up" : "bi-key"}`} />
              {showPasswordForm ? "Batal Ganti Password" : "Ganti Password Akun"}
            </button>

            {showPasswordForm && (
              <form onSubmit={handlePasswordSubmit} className="mt-3 p-3 border rounded-3 bg-white shadow-sm">
                <div className="mb-3">
                  <label className="form-label fw-semibold text-muted" style={{ fontSize: "12px" }}>Password Baru</label>
                  <input
                    type="password"
                    className="form-control rounded-3"
                    placeholder="Minimal 6 karakter"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    style={{ fontSize: "13.5px" }}
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label fw-semibold text-muted" style={{ fontSize: "12px" }}>Konfirmasi Password Baru</label>
                  <input
                    type="password"
                    className="form-control rounded-3"
                    placeholder="Ulangi password baru"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    style={{ fontSize: "13.5px" }}
                  />
                </div>

                {errorMsg && (
                  <div className="alert alert-danger py-2 px-3 rounded-3 d-flex align-items-center gap-2" style={{ fontSize: "12.5px" }}>
                    <i className="bi bi-exclamation-triangle" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                {successMsg && (
                  <div className="alert alert-success py-2 px-3 rounded-3 d-flex align-items-center gap-2" style={{ fontSize: "12.5px" }}>
                    <i className="bi bi-check-circle" />
                    <span>{successMsg}</span>
                  </div>
                )}

                <button
                  type="submit"
                  className="btn btn-primary w-100 rounded-pill d-flex align-items-center justify-content-center gap-2"
                  disabled={isSubmitting}
                  style={{ background: themeColor, borderColor: themeColor, fontSize: "13px", fontWeight: "600", padding: "8px 0" }}
                >
                  {isSubmitting ? (
                    <>
                      <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" />
                      Memperbarui...
                    </>
                  ) : (
                    <>
                      <i className="bi bi-save" />
                      Simpan Password Baru
                    </>
                  )}
                </button>
              </form>
            )}
          </div>

          <button 
            type="button" 
            className="btn btn-danger w-100 rounded-pill d-flex align-items-center justify-content-center gap-2 shadow-sm" 
            onClick={onLogout}
            style={{ fontSize: "14px", fontWeight: "600", padding: "12px 0" }}
          >
            <i className="bi bi-box-arrow-right" />
            Keluar dari Akun
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function AdminPanel({ onLogout, userName, userEmail, joinedAt, onChangePassword, onUpdateProfileName, lang, onToggleLanguage }) {
  const [activePage, setActivePage] = useState("dashboard");
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    async function loadData() {
      try {
        const data = await fetchActiveVisits();
        setPatients(data);
      } catch (err) {
        console.error("Error loading active visits:", err.message);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const pages = {
    dashboard: { title: "Dashboard", component: <DashboardPage patients={patients} setActivePage={setActivePage} isMobile={isMobile} userName={userName} lang={lang} /> },
    pasien: { title: "Data Pasien", component: <DataPasienPage patients={patients} setPatients={setPatients} lang={lang} /> },
    tambah: { title: "Tambah Pasien", component: <TambahPasienPage setPatients={setPatients} setActivePage={setActivePage} lang={lang} /> },
    profile: {
      title: "Profil Pengguna",
      component: (
        <UserProfilePage
          userName={userName}
          userEmail={userEmail}
          joinedAt={joinedAt}
          onLogout={onLogout}
          onChangePassword={onChangePassword}
          role="Admin"
          themeColor="#145c9c"
          badgeBg="#e0f2fe"
          badgeColor="#0369a1"
          onUpdateProfileName={onUpdateProfileName}
        />
      )
    }
  };

  const current = pages[activePage];

  return (
    <>
      {/* Bootstrap CSS */}
      <link
        rel="stylesheet"
        href="https://cdnjs.cloudflare.com/ajax/libs/bootstrap/5.3.3/css/bootstrap.min.css"
      />
      <link
        rel="stylesheet"
        href="https://cdnjs.cloudflare.com/ajax/libs/bootstrap-icons/1.11.3/font/bootstrap-icons.min.css"
      />

      <div style={{ background: "#f8fafc", minHeight: "100vh" }}>
        {!isMobile && (
          <Sidebar activePage={activePage} setActivePage={setActivePage} userName={userName} onLogout={onLogout} lang={lang} />
        )}

        {/* Main content area */}
        <div style={{ 
          marginLeft: isMobile ? 0 : 260, 
          paddingBottom: isMobile ? 80 : 0 
        }}>
          {!isMobile && <Topbar title={current.title} lang={lang} onToggleLanguage={onToggleLanguage} />}
          
          {/* Mobile Topbar for other pages */}
          {isMobile && activePage !== "dashboard" && (
            <div 
              className="d-flex align-items-center justify-content-between px-3"
              style={{
                height: 55,
                background: "#fff",
                borderBottom: "1px solid #e2e8f0",
                position: "sticky",
                top: 0,
                zIndex: 100
              }}
            >
              <button 
                className="btn btn-link p-0 text-dark" 
                onClick={() => setActivePage("dashboard")}
                style={{ fontSize: 20 }}
              >
                <i className="bi bi-chevron-left" />
              </button>
              <h6 className="mb-0 fw-bold" style={{ color: "#1e3a5f" }}>{current.title}</h6>
              <div style={{ width: 24 }} />
            </div>
          )}

          <div className={isMobile ? "p-3" : "p-4"}>
            {loading ? (
              <div className="text-center py-5" style={{ marginTop: "10%" }}>
                <div className="spinner-border text-primary" role="status">
                  <span className="visually-hidden">Loading...</span>
                </div>
              </div>
            ) : (
              current.component
            )}
          </div>
        </div>

        {/* Mobile Bottom Navigation Bar */}
        {isMobile && (
          <div 
            className="d-flex justify-content-around align-items-center bg-white border-top position-fixed bottom-0 start-0 end-0"
            style={{ height: 60, zIndex: 1000, boxShadow: "0 -2px 10px rgba(0,0,0,0.05)" }}
          >
            <button 
              onClick={() => setActivePage("dashboard")} 
              className="btn border-0 d-flex flex-column align-items-center justify-content-center p-0"
              style={{ color: activePage === "dashboard" ? "#4f46e5" : "#64748b", flex: 1 }}
            >
              <i className={`bi ${activePage === "dashboard" ? "bi-grid-fill" : "bi-grid"}`} style={{ fontSize: 18 }} />
              <span style={{ fontSize: 9, fontWeight: activePage === "dashboard" ? "600" : "500", marginTop: 2 }}>Dashboard</span>
            </button>
            <button 
              onClick={() => setActivePage("pasien")} 
              className="btn border-0 d-flex flex-column align-items-center justify-content-center p-0"
              style={{ color: activePage === "pasien" ? "#4f46e5" : "#64748b", flex: 1 }}
            >
              <i className={`bi ${activePage === "pasien" ? "bi-people-fill" : "bi-people"}`} style={{ fontSize: 18 }} />
              <span style={{ fontSize: 9, fontWeight: activePage === "pasien" ? "600" : "500", marginTop: 2 }}>Data Pasien</span>
            </button>
            <button 
              onClick={() => setActivePage("tambah")} 
              className="btn border-0 d-flex flex-column align-items-center justify-content-center p-0"
              style={{ color: activePage === "tambah" ? "#4f46e5" : "#64748b", flex: 1 }}
            >
              <i className={`bi ${activePage === "tambah" ? "bi-person-plus-fill" : "bi-person-plus"}`} style={{ fontSize: 18 }} />
              <span style={{ fontSize: 9, fontWeight: activePage === "tambah" ? "600" : "500", marginTop: 2 }}>Tambah</span>
            </button>
            <button 
              onClick={() => setActivePage("profile")} 
              className="btn border-0 d-flex flex-column align-items-center justify-content-center p-0"
              style={{ color: activePage === "profile" ? "#145c9c" : "#64748b", flex: 1 }}
            >
              <i className="bi bi-person-circle" style={{ fontSize: 18 }} />
              <span style={{ fontSize: 9, fontWeight: activePage === "profile" ? "600" : "500", marginTop: 2 }}>{userName ? userName.slice(0, 10) : "Admin"}</span>
            </button>
          </div>
        )}
      </div>
    </>
  );
}
