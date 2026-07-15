import { useState, useEffect } from "react";
import { fetchActiveVisits, updateTriageDetails } from "./supabaseHelpers";
import { translations } from "./translations";


const GOL_DARAH_OPTIONS = ["-", "A", "B", "AB", "O", "A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];



// Helper: Calculate BMI
function calcBMI(weight, height) {
  if (!weight || !height) return "";
  const hMeters = height / 100;
  const bmiVal = weight / (hMeters * hMeters);
  return Math.round(bmiVal * 10) / 10;
}

function getInitials(name) {
  if (!name) return "";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return parts[0] ? parts[0][0].toUpperCase() : "";
}

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

// Helper component: Animated Circular MEOWS Score Progress Bar
function MeowsCircleProgress({ score, risk, size = 90, strokeWidth = 6 }) {
  const maxScore = 10;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  
  // Cap score at maxScore for visual percentage representation
  const displayScore = Math.min(score, maxScore);
  const targetOffset = circumference - (displayScore / maxScore) * circumference;
  
  const [offset, setOffset] = useState(circumference);
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setOffset(targetOffset);
    }, 50);
    return () => clearTimeout(timer);
  }, [score, targetOffset]);

  const getRiskColor = (r) => {
    if (r === "High") return "#dc3545"; // Red
    if (r === "Medium") return "#ffc107"; // Yellow
    return "#198754"; // Green
  };

  const riskColor = getRiskColor(risk);

  return (
    <div className="position-relative d-inline-flex align-items-center justify-content-center" style={{ width: size, height: size, marginBottom: 12 }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        {/* Background track circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="transparent"
          stroke="#f1f5f9"
          strokeWidth={strokeWidth}
        />
        {/* Foreground progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="transparent"
          stroke={riskColor}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{
            transition: "stroke-dashoffset 1s cubic-bezier(0.4, 0, 0.2, 1), stroke 0.5s ease"
          }}
        />
      </svg>
      {/* Centered score text badge */}
      <div
        className="position-absolute d-flex align-items-center justify-content-center rounded-circle"
        style={{
          width: size - strokeWidth * 2 - 2,
          height: size - strokeWidth * 2 - 2,
          background: riskColor + "12",
          color: riskColor,
          fontWeight: 800,
          fontSize: size > 80 ? "32px" : "24px"
        }}
      >
        {score}
      </div>
    </div>
  );
}


function getBMICategory(bmi) {
  if (!bmi) return "";
  if (bmi < 18.5) return "Kurus / Underweight";
  if (bmi >= 18.5 && bmi < 25) return "Normal / Ideal";
  if (bmi >= 25 && bmi < 30) return "Gemuk / Overweight";
  return "Obesitas / Obese";
}

function getBMIBadgeColor(bmi) {
  if (!bmi) return "bg-light text-dark";
  if (bmi < 18.5) return "bg-warning text-dark";
  if (bmi >= 18.5 && bmi < 25) return "bg-success text-white";
  if (bmi >= 25 && bmi < 30) return "bg-warning text-dark";
  return "bg-danger text-white";
}

function downloadTriageCSV(patient) {
  const headers = [
    "ID", "Nama Pasien", "NIK", "No BPJS", "Umur", "Jenis Kelamin",
    "Keluhan Utama",
    "Berat Badan (kg)", "Tinggi Badan (cm)", "BMI / IMT", "Kategori BMI", "Lingkar Kepala (cm)", "Lingkar Lengan (cm)", "Gol Darah",
    "Respiratory Rate (x/mnt)", "SpO2 (%)", "Oksigen Tambahan", "Suhu (°C)", "Tekanan Darah Sistolik", "Tekanan Darah Diastolik", "Nadi (x/mnt)", "Kesadaran (AVPU)",
    "MEOWS Score", "Triage Risk Level", "Waktu Triase"
  ];

  const bmi = calcBMI(patient.beratBadan, patient.tinggiBadan);
  const bmiCat = getBMICategory(bmi);

  const row = [
    patient.id, patient.nama, patient.nik, patient.noBpjs || "-", patient.umur, patient.jenisKelamin,
    patient.keluhan || "-",
    patient.beratBadan || "-", patient.tinggiBadan || "-", bmi || "-", bmiCat || "-", patient.lingkarKepala || "-", patient.lingkarLengan || "-", patient.golDarah || "-",
    patient.rr || "-", patient.spo2 || "-", patient.suplemenO2 || "-", patient.suhu || "-", patient.sistolik || "-", patient.diastolik || "-", patient.nadi || "-", patient.avpu || "-",
    patient.meowsScore !== undefined ? patient.meowsScore : "-", patient.triageRisk || "-", patient.tglTriage || "-"
  ].map(val => typeof val === "string" ? `"${val.replace(/"/g, '""')}"` : val).join(",");

  const csv = [headers.join(","), row].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `triage-${patient.nama.replace(/\s+/g, "_")}-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Sidebar Component (Nurse Teal Vibes) ────────────────────────────────────
function SidebarNurse({ activePage, setActivePage, userName, onLogout, lang }) {
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const navItems = [
    { id: "dashboard", icon: "bi-grid-fill", label: translations[lang].dashboardNurse },
    { id: "triage", icon: "bi-clipboard2-pulse-fill", label: translations[lang].triagePhysical },
  ];

  return (
    <div
      className="d-flex flex-column"
      style={{
        width: 260,
        minHeight: "100vh",
        background: "linear-gradient(180deg, #0b4c46 0%, #032b27 100%)", // Teal Medical theme
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
            background: "#0d9488",
            borderRadius: 10,
            width: 36,
            height: 36,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 2px 6px rgba(13, 148, 136, 0.4)"
          }}
        >
          <i className="bi bi-lungs-fill text-white" style={{ fontSize: 18 }} />
        </div>
        <div>
          <div style={{ fontWeight: 700, fontSize: 15, letterSpacing: 0.5 }}>
            Smart-Triage
          </div>
          <div style={{ fontSize: 11, opacity: 0.7 }}>Nurse Workstation</div>
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
                borderLeft: isActive ? "4px solid #0d9488" : "4px solid transparent",
                borderRadius: "0px",
                margin: "0px"
              }}
            >
              <i
                className={`bi ${item.icon}`}
                style={{
                  fontSize: 16,
                  color: isActive ? "#2dd4bf" : "rgba(255, 255, 255, 0.65)",
                  transition: "color 0.2s"
                }}
              />
              {item.label}
            </button>
          );
        })}
      </nav>

      {/* User Info & dropdown popover */}
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
                {userName ? `Ns. ${userName}` : "Perawat"}
              </div>
              <div style={{ opacity: 0.5, fontSize: 10 }}>Perawat Triase</div>
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

// ─── Dashboard Subpage ───────────────────────────────────────────────────────
function NurseDashboard({ patients, setActivePage, setSelectedId, isMobile, userName, lang }) {
  const triagedCount = patients.filter(p => p.triageRisk).length;
  const highRiskCount = patients.filter(p => p.triageRisk === "High").length;
  const medRiskCount = patients.filter(p => p.triageRisk === "Medium").length;
  const lowRiskCount = patients.filter(p => p.triageRisk === "Low").length;

  const t = translations[lang];

  const stats = [
    { label: t.triagedPatients, value: triagedCount, icon: "bi-clipboard2-check", color: "#0d9488", bg: "#f0fdfa" },
    { label: `${t.highRisk} (MEOWS >= 7)`, value: highRiskCount, icon: "bi-exclamation-octagon-fill", color: "#dc3545", bg: "#fdf2f2" },
    { label: `${t.mediumRisk} (MEOWS 5-6)`, value: medRiskCount, icon: "bi-exclamation-triangle-fill", color: "#ffc107", bg: "#fffbeb" },
    { label: `${t.lowRisk} (MEOWS 0-4)`, value: lowRiskCount, icon: "bi-check-circle-fill", color: "#198754", bg: "#f0fdf4" }
  ];

  if (isMobile) {
    return (
      <div style={{ background: "#f8fafc", minHeight: "100vh", padding: "10px 5px" }}>
        {/* Mobile Header */}
        <div className="mb-4 px-1">
          <h3 className="fw-bold mb-1" style={{ color: "#0f766e", fontSize: "24px" }}>Halo, Ns. {userName || "Perawat"}</h3>
          <div className="text-muted d-flex align-items-center gap-1.5" style={{ fontSize: "13px", fontWeight: "500" }}>
            <i className="bi bi-calendar3 text-secondary me-1" />
            {new Date().toLocaleDateString("id-ID", {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </div>
        </div>

        {/* 2x2 stats */}
        <div className="row g-3 mb-4">
          {stats.map((s) => (
            <div key={s.label} className="col-6">
              <div className="card border-0 shadow-sm rounded-4 p-3 h-100 bg-white" style={{ border: "1px solid #f1f5f9" }}>
                <div className="d-flex align-items-center justify-content-start mb-3">
                  <div style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    background: s.bg,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center"
                  }}>
                    <i className={`bi ${s.icon}`} style={{ fontSize: 16, color: s.color }} />
                  </div>
                </div>
                <div>
                  <div className="text-muted fw-semibold mb-1" style={{ fontSize: 11 }}>{s.label.split(" (")[0]}</div>
                  <div className="fw-bold" style={{ fontSize: 24, color: "#1e293b", lineHeight: 1.1 }}><AnimatedCounter value={s.value} /></div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Recent Patients List */}
        <div className="mb-4">
          <div className="d-flex align-items-center justify-content-between mb-3 px-1">
            <h5 className="fw-bold mb-0" style={{ color: "#1e293b", fontSize: "16px" }}>Triage Pasien Terbaru</h5>
            <button
              className="btn btn-link p-0 text-decoration-none fw-semibold"
              style={{ color: "#0d9488", fontSize: "13px" }}
              onClick={() => {
                setSelectedId(null);
                setActivePage("triage");
              }}
            >
              Mulai Triase
            </button>
          </div>

          {patients.length === 0 ? (
            <div className="text-center py-4 bg-white rounded-4 shadow-sm text-muted" style={{ fontSize: 12 }}>
              Belum ada pasien terdaftar
            </div>
          ) : (
            patients.map((p) => {
              // Risk level color mapping
              let riskBadgeBg = "#f1f5f9";
              let riskBadgeText = "#64748b";
              let riskLabel = "Belum Ditriase";
              if (p.triageRisk === "High") {
                riskBadgeBg = "#fee2e2";
                riskBadgeText = "#dc3545";
                riskLabel = "Tinggi";
              } else if (p.triageRisk === "Medium") {
                riskBadgeBg = "#fef3c7";
                riskBadgeText = "#d97706";
                riskLabel = "Sedang";
              } else if (p.triageRisk === "Low") {
                riskBadgeBg = "#dcfce7";
                riskBadgeText = "#15803d";
                riskLabel = "Rendah";
              }

              return (
                <div
                  key={p.id}
                  className="card border-0 shadow-sm rounded-4 mb-2 bg-white"
                  style={{ padding: "12px 16px", border: "1px solid #f1f5f9", cursor: "pointer" }}
                  onClick={() => {
                    setSelectedId(p.id);
                    setActivePage("triage");
                  }}
                >
                  <div className="d-flex align-items-center justify-content-between">
                    <div className="d-flex align-items-center gap-3">
                      {/* Avatar with initials */}
                      <div
                        className="fw-bold d-flex align-items-center justify-content-center"
                        style={{
                          width: 42,
                          height: 42,
                          borderRadius: "50%",
                          background: "#f0fdfa",
                          color: "#0d9488",
                          fontSize: 14
                        }}
                      >
                        {getInitials(p.nama)}
                      </div>

                      {/* Patient info */}
                      <div>
                        <div className="fw-bold" style={{ color: "#1e293b", fontSize: 14 }}>{p.nama}</div>
                        <div className="text-muted" style={{ fontSize: 11, marginTop: 2 }}>
                          {p.umur} thn • {p.tinggiBadan || "-"} cm / {p.beratBadan || "-"} kg
                        </div>
                      </div>
                    </div>

                    {/* Risk Badge and chevron */}
                    <div className="d-flex align-items-center gap-2">
                      <span
                        className="badge fw-semibold"
                        style={{
                          background: riskBadgeBg,
                          color: riskBadgeText,
                          fontSize: 10,
                          padding: "4px 8px",
                          borderRadius: 6
                        }}
                      >
                        {riskLabel}
                      </span>
                      {p.meowsScore !== undefined && (
                        <span
                          className="badge text-white"
                          style={{
                            background: p.meowsScore >= 7 ? "#dc3545" : p.meowsScore >= 5 ? "#ffc107" : "#198754",
                            fontSize: 10,
                            borderRadius: 4
                          }}
                        >
                          M: {p.meowsScore}
                        </span>
                      )}
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
          onClick={() => {
            setSelectedId(null);
            setActivePage("triage");
          }}
          className="btn shadow-lg d-flex align-items-center justify-content-center"
          style={{
            position: "fixed",
            bottom: "85px",
            right: "20px",
            width: "55px",
            height: "55px",
            borderRadius: "50%",
            background: "#0d9488",
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

  // Original desktop layout (updated to match mock)
  const statsDesktop = [
    { label: t.triagedPatients, value: triagedCount, icon: "bi-clipboard2-check-fill", color: "#0d9488", bg: "#f0fdfa", extraIcon: "bi-check-circle", extraIconColor: "#2dd4bf" },
    { label: `${t.highRisk} (MEOWS >= 7)`, value: highRiskCount, icon: "bi-exclamation-octagon-fill", color: "#ef4444", bg: "#fdf2f2", extraIcon: "bi-exclamation-octagon", extraIconColor: "#fca5a5" },
    { label: `${t.mediumRisk} (MEOWS 5-6)`, value: medRiskCount, icon: "bi-exclamation-triangle-fill", color: "#f59e0b", bg: "#fffbeb", extraIcon: "bi-exclamation-triangle", extraIconColor: "#fcd34d" },
    { label: `${t.lowRisk} (MEOWS 0-4)`, value: lowRiskCount, icon: "bi-check-circle-fill", color: "#10b981", bg: "#f0fdf4", extraIcon: "bi-shield-check", extraIconColor: "#6ee7b7" }
  ];

  return (
    <div>
      {/* Stats row */}
      <div className="row g-3 mb-4">
        {statsDesktop.map((s) => (
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
                  <i className={`bi ${s.icon}`} style={{ fontSize: 18, color: s.color }} />
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

      {/* Patient Triage Summary */}
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
              {t.triageRecentPatients}
            </h5>
            <div className="text-muted" style={{ fontSize: 13 }}>
              {t.triageRecentSub}
            </div>
          </div>
          <button
            className="btn btn-sm text-white fw-bold d-flex align-items-center gap-1.5 px-4 py-2 rounded-pill"
            style={{
              background: "#0d9488",
              border: "none",
              fontSize: 13,
              boxShadow: "0 4px 12px rgba(13, 148, 136, 0.25)"
            }}
            onClick={() => setActivePage("triage")}
          >
            {t.startNewTriage} <i className="bi bi-arrow-right" />
          </button>
        </div>

        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0" style={{ fontSize: 13.5 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #f1f5f9" }}>
                <th className="fw-bold text-uppercase pb-3 border-0" style={{ color: "#94a3b8", fontSize: 10, letterSpacing: "0.5px" }}>{t.patientName}</th>
                <th className="fw-bold text-uppercase pb-3 border-0" style={{ color: "#94a3b8", fontSize: 10, letterSpacing: "0.5px" }}>{t.age.toUpperCase()}</th>
                <th className="fw-bold text-uppercase pb-3 border-0" style={{ color: "#94a3b8", fontSize: 10, letterSpacing: "0.5px" }}>{t.heightWeight}</th>
                <th className="fw-bold text-uppercase pb-3 border-0" style={{ color: "#94a3b8", fontSize: 10, letterSpacing: "0.5px" }}>{t.temp.toUpperCase()}</th>
                <th className="fw-bold text-uppercase pb-3 border-0" style={{ color: "#94a3b8", fontSize: 10, letterSpacing: "0.5px" }}>{t.spo2Tens}</th>
                <th className="fw-bold text-uppercase pb-3 border-0 text-center" style={{ color: "#94a3b8", fontSize: 10, letterSpacing: "0.5px" }}>{t.meows.toUpperCase()}</th>
                <th className="fw-bold text-uppercase pb-3 border-0 text-center" style={{ color: "#94a3b8", fontSize: 10, letterSpacing: "0.5px" }}>{t.riskLevel}</th>
                <th className="fw-bold text-uppercase pb-3 border-0 text-center" style={{ color: "#94a3b8", fontSize: 10, letterSpacing: "0.5px" }}>{t.doctorDiagnosis}</th>
                <th className="fw-bold text-uppercase pb-3 border-0 text-center" style={{ color: "#94a3b8", fontSize: 10, letterSpacing: "0.5px" }}>{t.action.toUpperCase()}</th>
              </tr>
            </thead>
            <tbody>
              {patients.map((p) => {
                const bmi = calcBMI(p.beratBadan, p.tinggiBadan);

                // Risk-based styling for avatar and badge
                let riskStyle = { bg: "#f1f5f9", color: "#64748b", text: "Belum Ditriase" };
                if (p.triageRisk === "High") {
                  riskStyle = { bg: "#fde8e8", color: "#dc3545", text: "Tinggi" };
                } else if (p.triageRisk === "Medium") {
                  riskStyle = { bg: "#fff8e1", color: "#d97706", text: "Sedang" };
                } else if (p.triageRisk === "Low") {
                  riskStyle = { bg: "#e6f4ea", color: "#198754", text: "Rendah" };
                }

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
                            background: riskStyle.bg,
                            color: riskStyle.color,
                            fontSize: 12
                          }}
                        >
                          {getInitials(p.nama)}
                        </div>
                        <span className="fw-bold text-dark">{p.nama}</span>
                      </div>
                    </td>
                    <td className="py-3 text-secondary">{p.umur} tahun</td>
                    <td className="py-3 text-secondary">
                      {p.tinggiBadan ? `${p.tinggiBadan} cm` : "-"} / {p.beratBadan ? `${p.beratBadan} kg` : "-"}
                      {bmi && <span className="badge ms-1.5 bg-light text-secondary" style={{ fontSize: 9.5 }}>BMI {bmi}</span>}
                    </td>
                    <td className="py-3 text-secondary">
                      {p.suhu ? `${p.suhu} °C` : <span className="text-muted">-</span>}
                    </td>
                    <td className="py-3 text-secondary">
                      {p.spo2 ? (
                        <div>
                          <div className="fw-semibold">SpO2: {p.spo2}%</div>
                          <div className="text-muted" style={{ fontSize: 10.5 }}>
                            BP: {p.sistolik}/{p.diastolik} mmHg
                          </div>
                        </div>
                      ) : (
                        <span className="text-muted">Belum diperiksa</span>
                      )}
                    </td>
                    <td className="py-3 text-center">
                      {p.meowsScore !== undefined ? (
                        <span
                          className="badge"
                          style={{
                            background: p.meowsScore >= 7 ? "#fde8e8" : p.meowsScore >= 5 ? "#fff8e1" : "#e6f4ea",
                            color: p.meowsScore >= 7 ? "#c53030" : p.meowsScore >= 5 ? "#b7791f" : "#137333",
                            fontSize: 12,
                            fontWeight: 700,
                            padding: "5px 9px",
                            borderRadius: "6px"
                          }}
                        >
                          {p.meowsScore}
                        </span>
                      ) : (
                        <span className="text-muted">-</span>
                      )}
                    </td>
                    <td className="py-3 text-center">
                      {p.triageRisk ? (
                        <span
                          className="badge text-uppercase fw-bold"
                          style={{
                            background: riskStyle.bg,
                            color: riskStyle.color,
                            fontSize: 10,
                            padding: "5px 10px",
                            borderRadius: "20px"
                          }}
                        >
                          {riskStyle.text}
                        </span>
                      ) : (
                        <span className="badge bg-light text-secondary fw-bold" style={{ fontSize: 10, padding: "5px 10px", borderRadius: "20px" }}>Belum Triase</span>
                      )}
                    </td>
                    <td className="py-3 text-center">
                      {p.statusDiagnosis === "Sudah Diperiksa" ? (
                        <span className="badge bg-success-subtle text-success border border-success-subtle fw-bold p-2 text-wrap" style={{ fontSize: 10.5, maxWidth: 180 }}>
                          {p.diagnosa || "Sudah Didiagnosa"}
                        </span>
                      ) : (
                        <span className="badge bg-warning-subtle text-warning-emphasis border border-warning-subtle fw-semibold p-2" style={{ fontSize: 10.5 }}>
                          Belum Didiagnosa
                        </span>
                      )}
                    </td>
                    <td className="py-3 text-center">
                      <button
                        className="btn btn-sm btn-outline-teal d-inline-flex align-items-center"
                        style={{ borderColor: "#0d9488", color: "#0d9488", fontSize: 12, borderRadius: "20px", fontWeight: "600", padding: "5px 12px", gap: "8px" }}
                        onClick={() => {
                          setSelectedId(p.id);
                          setActivePage("triage");
                        }}
                      >
                        <i className="bi bi-pencil-square" />
                        Edit Triage
                      </button>
                    </td>
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

// ─── Triage Workspace Subpage ────────────────────────────────────────────────
function TriageWorkspace({ patients, setPatients, selectedId, setSelectedId, lang }) {
  const t = translations[lang];
  const activePatient = patients.find(p => p.id === selectedId) || patients[0];

  // Forms local states
  const [beratBadan, setBeratBadan] = useState(activePatient?.beratBadan || "");
  const [tinggiBadan, setTinggiBadan] = useState(activePatient?.tinggiBadan || "");
  const [lingkarKepala, setLingkarKepala] = useState(activePatient?.lingkarKepala || "");
  const [lingkarLengan, setLingkarLengan] = useState(activePatient?.lingkarLengan || "");
  const [golDarah, setGolDarah] = useState(activePatient?.golDarah || "-");
  const [keluhan, setKeluhan] = useState(activePatient?.keluhan || "");

  const [rr, setRr] = useState(activePatient?.rr || "");
  const [spo2, setSpo2] = useState(activePatient?.spo2 || "");
  const [suplemenO2, setSuplemenO2] = useState(activePatient?.suplemenO2 || "Tidak");
  const [suhu, setSuhu] = useState(activePatient?.suhu || "");
  const [sistolik, setSistolik] = useState(activePatient?.sistolik || "");
  const [diastolik, setDiastolik] = useState(activePatient?.diastolik || "");
  const [nadi, setNadi] = useState(activePatient?.nadi || "");
  const [avpu, setAvpu] = useState(activePatient?.avpu || "Alert");

  const [saveSuccess, setSaveSuccess] = useState(false);
  const [currentMeows, setCurrentMeows] = useState({ score: activePatient?.meowsScore || 0, risk: activePatient?.triageRisk || "Low" });

  const [isAiGenerating, setIsAiGenerating] = useState(false);
  const [prevTrack, setPrevTrack] = useState({ score: null, patientId: null });

  useEffect(() => {
    if (currentMeows.score !== prevTrack.score || activePatient?.id !== prevTrack.patientId) {
      setIsAiGenerating(true);
      setPrevTrack({ score: currentMeows.score, patientId: activePatient?.id });
      const timer = setTimeout(() => {
        setIsAiGenerating(false);
      }, 1200);
      return () => clearTimeout(timer);
    }
  }, [currentMeows.score, activePatient?.id]);

  useEffect(() => {
    let active = true;
    async function calculateScore() {
      const sbpVal = sistolik !== "" ? parseInt(sistolik) : 120;
      const dbpVal = diastolik !== "" ? parseInt(diastolik) : 80;
      const hrVal = nadi !== "" ? parseInt(nadi) : 80;
      const rrVal = rr !== "" ? parseInt(rr) : 16;
      const spo2Val = spo2 !== "" ? parseInt(spo2) : 98;
      const tempVal = suhu !== "" ? parseFloat(suhu) : 36.5;
      const avpuVal = avpu === "Alert" ? "A" : avpu === "Voice" ? "V" : avpu === "Pain" ? "P" : avpu === "Unresponsive" ? "U" : "A";

      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL}/calculate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            respiratory_rate: rrVal,
            oxygen_saturation: spo2Val,
            oxygen_supplementation: suplemenO2 === "Ya",
            temperature: tempVal,
            systolic_bp: sbpVal,
            diastolic_bp: dbpVal,
            heart_rate: hrVal,
            consciousness: avpuVal
          })
        });
        if (!res.ok) throw new Error("API error");
        const resData = await res.json();

        if (active) {
          let riskLabel = "Low";
          if (resData.risk_level === "HIGH") riskLabel = "High";
          else if (resData.risk_level === "MODERATE") riskLabel = "Medium";

          setCurrentMeows({
            score: resData.total_score,
            risk: riskLabel
          });
        }
      } catch (err) {
        console.error("Error calculating MEOWS:", err);
      }
    }
    calculateScore();
    return () => { active = false; };
  }, [rr, spo2, suplemenO2, suhu, sistolik, diastolik, nadi, avpu]);

  // Sync forms state when selected patient changes
  const handleSelectPatient = (p) => {
    setSelectedId(p.id);
    setBeratBadan(p.beratBadan || "");
    setTinggiBadan(p.tinggiBadan || "");
    setLingkarKepala(p.lingkarKepala || "");
    setLingkarLengan(p.lingkarLengan || "");
    setGolDarah(p.golDarah || "-");
    setKeluhan(p.keluhan || "");

    setRr(p.rr || "");
    setSpo2(p.spo2 || "");
    setSuplemenO2(p.suplemenO2 || "Tidak");
    setSuhu(p.suhu || "");
    setSistolik(p.sistolik || "");
    setDiastolik(p.diastolik || "");
    setNadi(p.nadi || "");
    setAvpu(p.avpu || "Alert");
    setSaveSuccess(false);

    setCurrentMeows({
      score: p.meowsScore || 0,
      risk: p.triageRisk || "Low"
    });
  };

  // Live calculated variables
  const currentBmi = calcBMI(beratBadan, tinggiBadan);
  const currentBmiCat = getBMICategory(currentBmi);

  const handleSave = async () => {
    const triageData = {
      beratBadan: beratBadan !== "" ? parseFloat(beratBadan) : "",
      tinggiBadan: tinggiBadan !== "" ? parseFloat(tinggiBadan) : "",
      imt: currentBmi !== "" ? parseFloat(currentBmi) : "",
      lingkarKepala: lingkarKepala !== "" ? parseFloat(lingkarKepala) : "",
      lingkarLengan: lingkarLengan !== "" ? parseFloat(lingkarLengan) : "",
      golDarah: golDarah,
      keluhan: keluhan,

      rr: rr !== "" ? parseInt(rr) : "",
      spo2: spo2 !== "" ? parseInt(spo2) : "",
      suplemenO2: suplemenO2,
      suhu: suhu !== "" ? parseFloat(suhu) : "",
      sistolik: sistolik !== "" ? parseInt(sistolik) : "",
      diastolik: diastolik !== "" ? parseInt(diastolik) : "",
      nadi: nadi !== "" ? parseInt(nadi) : "",
      avpu: avpu,
      meowsScore: currentMeows.score,
      triageRisk: currentMeows.risk
    };

    try {
      await updateTriageDetails(activePatient.id, triageData);
      setPatients((prev) =>
        prev.map((p) => {
          if (p.id === activePatient.id) {
            return {
              ...p,
              ...triageData,
              tglTriage: new Date().toLocaleDateString("id-ID", {
                year: "numeric",
                month: "2-digit",
                day: "2-digit",
                hour: "2-digit",
                minute: "2-digit"
              })
            };
          }
          return p;
        })
      );
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error("Error saving triage details:", err.message);
    }
  };

  const getRiskColor = (risk) => {
    if (risk === "High") return "#dc3545"; // Red
    if (risk === "Medium") return "#ffc107"; // Yellow/Amber
    return "#198754"; // Green
  };

  return (
    <div className="row g-4">
      {/* Left Patient List */}
      <div className="col-12 col-lg-3">
        <div
          className="shadow-sm p-3 bg-white"
          style={{
            border: "1px solid rgba(0,0,0,0.01)",
            borderRadius: "20px",
            minHeight: "60vh",
            boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.03)"
          }}
        >
          <h6 className="fw-semibold mb-3 px-1" style={{ color: "#0f766e", fontSize: 14 }}>
            <i className="bi bi-people-fill me-2" />
            {t.patientList}
          </h6>
          <div className="d-flex flex-column gap-2" style={{ maxHeight: "65vh", overflowY: "auto" }}>
            {patients.map((p) => {
              const isActive = p.id === activePatient?.id;
              const hasTriage = p.meowsScore !== undefined;
              return (
                <button
                  key={p.id}
                  onClick={() => handleSelectPatient(p)}
                  className="btn text-start p-2 border-0 transition-all"
                  style={{
                    background: isActive ? "#ccfbf1" : "#f8fafc",
                    color: isActive ? "#0f766e" : "#334155",
                    cursor: "pointer",
                    borderRadius: "12px",
                    boxShadow: isActive ? "0 2px 4px rgba(13,148,136,0.12)" : "none",
                  }}
                >
                  <div className="d-flex align-items-center justify-content-between mb-1">
                    <span className="fw-semibold" style={{ fontSize: 13, textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>
                      {p.nama}
                    </span>
                    {hasTriage && (
                      <span
                        className="rounded-circle d-inline-block"
                        style={{
                          width: 10,
                          height: 10,
                          background: getRiskColor(p.triageRisk)
                        }}
                        title={`Triage: ${p.triageRisk}`}
                      />
                    )}
                  </div>
                  <div className="d-flex align-items-center justify-content-between text-muted" style={{ fontSize: 11 }}>
                    <span>{p.umur} {t.yearsOld} • {p.jenisKelamin === "Laki-laki" ? t.male : p.jenisKelamin === "Perempuan" ? t.female : p.jenisKelamin}</span>
                    {hasTriage && <span className="fw-medium">MEOWS: {p.meowsScore}</span>}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Right Workspace Form */}
      <div className="col-12 col-lg-9">
        {activePatient ? (
          <div
            className="shadow-sm p-4 bg-white"
            style={{
              border: "1px solid rgba(0,0,0,0.01)",
              borderRadius: "20px",
              boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.03)"
            }}
          >
            {saveSuccess && (
              <div className="alert alert-success d-flex align-items-center gap-2 mb-3" style={{ fontSize: 13, borderRadius: "12px" }}>
                <i className="bi bi-check-circle-fill" />
                {t.triageNotesSaved} (<strong>{activePatient.nama}</strong>)
              </div>
            )}

            {/* Header / Demographics Card */}
            <div className="p-3 mb-4 d-flex flex-wrap align-items-center justify-content-between gap-3" style={{ background: "#f0fdfa", border: "1.5px dashed #99f6e4", borderRadius: "16px" }}>
              <div>
                <h5 className="fw-bold mb-1" style={{ color: "#0f766e" }}>{activePatient.nama}</h5>
                <p className="text-muted mb-0" style={{ fontSize: 12 }}>
                  NIK: <span className="font-monospace">{activePatient.nik}</span> | {t.bpjsNum}: <span className="font-monospace">{activePatient.noBpjs || "-"}</span> | {t.noHp}: {activePatient.noHp}
                </p>
              </div>
              <button
                className="btn btn-sm btn-teal d-flex align-items-center gap-2 text-white"
                style={{ background: "#0d9488", border: "none", borderRadius: "30px", padding: "6px 16px", fontWeight: "600" }}
                onClick={() => downloadTriageCSV(activePatient)}
              >
                <i className="bi bi-download" />
                {t.downloadCsv}
              </button>
            </div>

            {/* Hasil Diagnosis Dokter */}
            <div className="mb-4 p-3" style={{ background: activePatient.statusDiagnosis === "Sudah Diperiksa" ? "#f0fdf4" : "#fffbeb", border: `1.5px solid ${activePatient.statusDiagnosis === "Sudah Diperiksa" ? "#bbf7d0" : "#fef3c7"}`, borderRadius: "16px" }}>
              <div className="d-flex align-items-center gap-2 mb-2">
                <i className={`bi ${activePatient.statusDiagnosis === "Sudah Diperiksa" ? "bi-check-circle-fill text-success" : "bi-hourglass-split text-warning"}`} style={{ fontSize: 16 }} />
                <span className="fw-bold text-dark" style={{ fontSize: 13 }}>{t.doctorDiagnosisStatus}</span>
              </div>
              <div className="p-2 bg-white border shadow-sm" style={{ fontSize: 13, minHeight: 40, borderRadius: "10px" }}>
                {activePatient.statusDiagnosis === "Sudah Diperiksa" ? (
                  <div>
                    <div className="fw-semibold text-success mb-1">{t.primaryICD10}</div>
                    <div className="text-dark fw-bold">{activePatient.diagnosa || "-"}</div>
                  </div>
                ) : (
                  <span className="text-muted italic"><i className="bi bi-info-circle me-1" />{t.patientNotDiagnosed}</span>
                )}
              </div>
            </div>

            <div className="row g-4">
              {/* Left Column: Anthropometric & Vitals Forms */}
              <div className="col-12 col-xl-8">
                {/* Keluhan Utama */}
                <div className="mb-4">
                  <div className="d-flex align-items-center gap-2 mb-2" style={{ color: "#0f766e" }}>
                    <div style={{ width: 4, height: 16, background: "#0d9488", borderRadius: 2 }} />
                    <span className="fw-bold" style={{ fontSize: 14 }}>{t.chiefComplaintDesc}</span>
                  </div>
                  <textarea
                    className="form-control"
                    rows={2}
                    placeholder={t.chiefComplaintPlaceholder}
                    value={keluhan}
                    onChange={(e) => setKeluhan(e.target.value)}
                    style={{ fontSize: 13, resize: "none" }}
                  />
                </div>

                {/* 1. Antropometri Data */}
                <div className="mb-4">
                  <div className="d-flex align-items-center gap-2 mb-3" style={{ color: "#0f766e" }}>
                    <div style={{ width: 4, height: 16, background: "#0d9488", borderRadius: 2 }} />
                    <span className="fw-bold" style={{ fontSize: 14 }}>{t.physicalAnthropometricData}</span>
                  </div>

                  <div className="row g-3">
                    <div className="col-6 col-sm-4">
                      <label className="form-label text-muted fw-medium mb-1" style={{ fontSize: 12 }}>{t.bodyWeight}</label>
                      <input
                        type="number"
                        className="form-control"
                        placeholder={lang === "id" ? "Contoh: 60" : "Example: 60"}
                        value={beratBadan}
                        onChange={(e) => setBeratBadan(e.target.value)}
                        style={{ fontSize: 13 }}
                      />
                    </div>
                    <div className="col-6 col-sm-4">
                      <label className="form-label text-muted fw-medium mb-1" style={{ fontSize: 12 }}>{t.bodyHeight}</label>
                      <input
                        type="number"
                        className="form-control"
                        placeholder={lang === "id" ? "Contoh: 165" : "Example: 165"}
                        value={tinggiBadan}
                        onChange={(e) => setTinggiBadan(e.target.value)}
                        style={{ fontSize: 13 }}
                      />
                    </div>
                    <div className="col-12 col-sm-4">
                      <label className="form-label text-muted fw-medium mb-1" style={{ fontSize: 12 }}>{t.bmiCategory}</label>
                      <div className="d-flex align-items-center gap-2">
                        <span className={`badge py-2 px-3 fw-bold rounded-2 ${getBMIBadgeColor(currentBmi)}`} style={{ fontSize: 12 }}>
                          {currentBmi ? `${currentBmi} (${currentBmiCat})` : t.notCalculated}
                        </span>
                      </div>
                    </div>

                    <div className="col-6 col-sm-4">
                      <label className="form-label text-muted fw-medium mb-1" style={{ fontSize: 12 }}>{t.headCircumference}</label>
                      <input
                        type="number"
                        className="form-control"
                        placeholder={lang === "id" ? "Biasanya untuk bayi" : "Usually for infants"}
                        value={lingkarKepala}
                        onChange={(e) => setLingkarKepala(e.target.value)}
                        style={{ fontSize: 13 }}
                      />
                    </div>
                    <div className="col-6 col-sm-4">
                      <label className="form-label text-muted fw-medium mb-1" style={{ fontSize: 12 }}>{t.muac}</label>
                      <input
                        type="number"
                        className="form-control"
                        placeholder="MUAC"
                        value={lingkarLengan}
                        onChange={(e) => setLingkarLengan(e.target.value)}
                        style={{ fontSize: 13 }}
                      />
                    </div>
                    <div className="col-12 col-sm-4">
                      <label className="form-label text-muted fw-medium mb-1" style={{ fontSize: 12 }}>{t.bloodType}</label>
                      <select
                        className="form-select"
                        value={golDarah}
                        onChange={(e) => setGolDarah(e.target.value)}
                        style={{ fontSize: 13 }}
                      >
                        {GOL_DARAH_OPTIONS.map((g) => (
                          <option key={g} value={g}>{g}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* 2. Vital Parameters Form */}
                <div className="mb-4">
                  <div className="d-flex align-items-center gap-2 mb-3" style={{ color: "#0f766e" }}>
                    <div style={{ width: 4, height: 16, background: "#0d9488", borderRadius: 2 }} />
                    <span className="fw-bold" style={{ fontSize: 14 }}>{t.vitalTriageParameters}</span>
                  </div>

                  <div className="row g-3">
                    <div className="col-6 col-md-4">
                      <label className="form-label text-muted fw-medium mb-1" style={{ fontSize: 12 }}>{t.respiratoryRate}</label>
                      <input
                        type="number"
                        className="form-control"
                        placeholder="Normal: 12-20"
                        value={rr}
                        onChange={(e) => setRr(e.target.value)}
                        style={{ fontSize: 13 }}
                      />
                    </div>
                    <div className="col-6 col-md-4">
                      <label className="form-label text-muted fw-medium mb-1" style={{ fontSize: 12 }}>{t.oxygenSaturation}</label>
                      <input
                        type="number"
                        className="form-control"
                        placeholder="Normal: >= 96"
                        value={spo2}
                        onChange={(e) => setSpo2(e.target.value)}
                        style={{ fontSize: 13 }}
                      />
                    </div>
                    <div className="col-12 col-md-4">
                      <label className="form-label text-muted fw-medium mb-1" style={{ fontSize: 12 }}>{t.oxygenTherapy}</label>
                      <div className="d-flex gap-2">
                        {["Tidak", "Ya"].map(val => (
                          <button
                            key={val}
                            type="button"
                            className="btn btn-sm flex-fill"
                            onClick={() => setSuplemenO2(val)}
                            style={{
                              border: "1.5px solid",
                              borderColor: suplemenO2 === val ? "#0d9488" : "#dee2e6",
                              background: suplemenO2 === val ? "#0d9488" : "#fff",
                              color: suplemenO2 === val ? "#fff" : "#475569",
                              fontSize: 12,
                              fontWeight: suplemenO2 === val ? 600 : 400,
                              borderRadius: "30px"
                            }}
                          >
                            {val === "Tidak" ? t.roomAir : t.supplementalO2}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="col-6 col-sm-4">
                      <label className="form-label text-muted fw-medium mb-1" style={{ fontSize: 12 }}>{t.bodyTemp}</label>
                      <input
                        type="number"
                        step="0.1"
                        className="form-control"
                        placeholder="Contoh: 36.5"
                        value={suhu}
                        onChange={(e) => setSuhu(e.target.value)}
                        style={{ fontSize: 13 }}
                      />
                    </div>
                    <div className="col-6 col-sm-4">
                      <label className="form-label text-muted fw-medium mb-1" style={{ fontSize: 12 }}>{t.bpSystolic}</label>
                      <input
                        type="number"
                        className="form-control"
                        placeholder="Sistolik (mmHg)"
                        value={sistolik}
                        onChange={(e) => setSistolik(e.target.value)}
                        style={{ fontSize: 13 }}
                      />
                    </div>
                    <div className="col-6 col-sm-4">
                      <label className="form-label text-muted fw-medium mb-1" style={{ fontSize: 12 }}>{t.bpDiastolic}</label>
                      <input
                        type="number"
                        className="form-control"
                        placeholder="Diastolik (mmHg)"
                        value={diastolik}
                        onChange={(e) => setDiastolik(e.target.value)}
                        style={{ fontSize: 13 }}
                      />
                    </div>

                    <div className="col-6 col-sm-6">
                      <label className="form-label text-muted fw-medium mb-1" style={{ fontSize: 12 }}>{t.heartRate}</label>
                      <input
                        type="number"
                        className="form-control"
                        placeholder="Normal: 51-90"
                        value={nadi}
                        onChange={(e) => setNadi(e.target.value)}
                        style={{ fontSize: 13 }}
                      />
                    </div>
                    <div className="col-6 col-sm-6">
                      <label className="form-label text-muted fw-medium mb-1" style={{ fontSize: 12 }}>{t.consciousnessLevel}</label>
                      <select
                        className="form-select"
                        value={avpu}
                        onChange={(e) => setAvpu(e.target.value)}
                        style={{ fontSize: 13 }}
                      >
                        <option value="Alert">Alert (A)</option>
                        <option value="Voice">Voice (V)</option>
                        <option value="Pain">Pain (P)</option>
                        <option value="Unresponsive">Unresponsive (U)</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Triage Score & Clinical Response Panel */}
              <div className="col-12 col-xl-4">
                <div
                  className="p-4 h-100 d-flex flex-column justify-content-between shadow-sm"
                  style={{
                    background: "#fafbfc",
                    border: "1.5px solid #e2e8f0",
                    position: "sticky",
                    top: 80,
                    borderRadius: "20px"
                  }}
                >
                  <div className="text-center mb-4">
                    <h6 className="fw-bold text-muted mb-3" style={{ fontSize: 13 }}>
                      {t.meowsTriageCalculator}
                    </h6>
                    <MeowsCircleProgress score={currentMeows.score} risk={currentMeows.risk} size={90} />
                    <h5 className="fw-bold mt-1" style={{ color: getRiskColor(currentMeows.risk) }}>
                      {currentMeows.risk === "High" ? t.highRiskAlert : currentMeows.risk === "Medium" ? t.mediumRiskAlert : t.lowRiskAlert}
                    </h5>
                  </div>

                  {/* Clinical Response Guidance */}
                  <div className="p-3 mb-4 bg-white" style={{ border: "1px solid #e2e8f0", fontSize: 12, borderRadius: "16px", minHeight: "135px", display: "flex", flexDirection: "column" }}>
                    <div className="d-flex align-items-center justify-content-between mb-2 pb-1 border-bottom" style={{ fontSize: 12 }}>
                      <div className="fw-bold text-dark d-flex align-items-center">
                        <img 
                          src="https://cdn-icons-png.flaticon.com/512/18561/18561814.png" 
                          alt="Sparkling Star" 
                          className="sparkles-pulse" 
                          style={{ width: "16px", height: "16px", marginRight: "8px" }} 
                        />
                        <span className="ai-gradient-text fw-bold">{t.aiClinicalGuidance}</span>
                      </div>
                      <span className="badge bg-light text-muted border" style={{ fontSize: 9 }}>{t.responseGuideline}</span>
                    </div>

                    {isAiGenerating ? (
                      <div className="ai-shimmer-text flex-grow-1 d-flex flex-column justify-content-center py-2">
                        <div className="d-flex align-items-center gap-2 mb-2 text-muted fw-medium" style={{ fontSize: 11 }}>
                          <span className="spinner-grow spinner-grow-sm text-primary" role="status" style={{ width: 10, height: 10 }} />
                          {t.analyzingClinicalFactors}
                        </div>
                        <div style={{ height: 6, background: "#f1f5f9", borderRadius: 4, width: "90%", marginBottom: 6 }} />
                        <div style={{ height: 6, background: "#f1f5f9", borderRadius: 4, width: "75%", marginBottom: 6 }} />
                        <div style={{ height: 6, background: "#f1f5f9", borderRadius: 4, width: "80%" }} />
                      </div>
                    ) : (
                      <div style={{ animation: "fadeIn 0.5s ease" }}>
                        {currentMeows.risk === "High" ? (
                          <ul className="ps-3 mb-0 text-danger fw-semibold">
                            <li>{lang === "id" ? "Lakukan resusitasi & monitoring terus-menerus." : "Perform resuscitation & continuous monitoring."}</li>
                            <li>{lang === "id" ? "Laporkan ke dokter penanggung jawab segera (< 5 mnt)." : "Report to the attending physician immediately (< 5 min)."}</li>
                            <li>{lang === "id" ? "Aktifkan tim medis darurat (Code Blue jika perlu)." : "Activate emergency medical team (Code Blue if necessary)."}</li>
                          </ul>
                        ) : currentMeows.risk === "Medium" ? (
                          <ul className="ps-3 mb-0 text-warning-emphasis fw-medium">
                            <li>{lang === "id" ? "Konsultasikan ke tim medis / dokter jaga segera." : "Consult the medical team / attending doctor immediately."}</li>
                            <li>{lang === "id" ? "Monitor tanda vital setiap 1 jam." : "Monitor vitals every hour."}</li>
                            <li>{lang === "id" ? "Siapkan sarana emergency untuk kemungkinan deteriorasi." : "Prepare emergency equipment for potential deterioration."}</li>
                          </ul>
                        ) : (
                          <ul className="ps-3 mb-0 text-success fw-medium">
                            <li>{lang === "id" ? "Monitor berkala setiap 4-6 jam sekali." : "Monitor periodically every 4-6 hours."}</li>
                            <li>{lang === "id" ? "Lanjutkan asuhan keperawatan standar ruangan." : "Continue standard ward nursing care."}</li>
                            <li>{lang === "id" ? "Catat perkembangan pada medical record." : "Document progress in the medical record."}</li>
                          </ul>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="d-flex flex-column gap-2 mt-auto">
                    <button
                      className="btn btn-teal w-100 py-2.5 d-flex align-items-center justify-content-center gap-2 text-white"
                      style={{ background: "#0d9488", fontWeight: 600, border: "none", borderRadius: "15px" }}
                      onClick={handleSave}
                    >
                      <i className="bi bi-floppy-fill" />
                      {t.saveTriageNotes}
                    </button>
                    <button
                      className="btn btn-outline-secondary w-100 py-2"
                      style={{ fontSize: 12, borderRadius: "15px" }}
                      onClick={() => handleSelectPatient(activePatient)}
                    >
                      {t.resetForm}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-5 text-muted" style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 8 }}>
            <i className="bi bi-person-exclamation d-block mb-2" style={{ fontSize: 36 }} />
            {t.selectPatientToStart}
          </div>
        )}
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

export default function NursePanel({ onLogout, userName, userEmail, joinedAt, onChangePassword, onUpdateProfileName, lang, onToggleLanguage }) {
  const [activePage, setActivePage] = useState("dashboard");
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState(null);
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
        if (data.length > 0) {
          setSelectedId(data[0].id);
        }
      } catch (err) {
        console.error("Error loading active visits:", err.message);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  function handleSelectFromDashboard(id) {
    setSelectedId(id);
    setActivePage("triage");
  }

  const subpages = {
    dashboard: {
      title: translations[lang].dashboardNurse,
      component: <NurseDashboard patients={patients} setActivePage={setActivePage} setSelectedId={handleSelectFromDashboard} isMobile={isMobile} userName={userName} lang={lang} />
    },
    triage: {
      title: translations[lang].triagePhysical,
      component: (
        <TriageWorkspace
          patients={patients}
          setPatients={setPatients}
          selectedId={selectedId}
          setSelectedId={setSelectedId}
          lang={lang}
        />
      )
    },
    profile: {
      title: translations[lang].userProfile,
      component: (
        <UserProfilePage
          userName={userName}
          userEmail={userEmail}
          joinedAt={joinedAt}
          onLogout={onLogout}
          onChangePassword={onChangePassword}
          role="Perawat"
          themeColor="#0d9488"
          badgeBg="#ccfbf1"
          badgeColor="#0f766e"
          onUpdateProfileName={onUpdateProfileName}
        />
      )
    }
  };

  const current = subpages[activePage];

  return (
    <>
      {/* Bootstrap CSS (if not already globally loaded) */}
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
          <SidebarNurse activePage={activePage} setActivePage={setActivePage} userName={userName} onLogout={onLogout} lang={lang} />
        )}

        {/* Main Content Area */}
        <div style={{
          marginLeft: isMobile ? 0 : 260,
          paddingBottom: isMobile ? 80 : 0
        }}>
          {/* Desktop Topbar */}
          {!isMobile && (
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
                  {activePage === "profile" ? translations[lang].userProfile : activePage === "dashboard" ? translations[lang].dashboardNurse : translations[lang].triagePhysical}
                </h3>
                <div className="text-muted" style={{ fontSize: 13, marginTop: 2 }}>
                  {activePage === "dashboard"
                    ? translations[lang].subNurseDashboard
                    : activePage === "triage"
                      ? translations[lang].subNurseTriage
                      : translations[lang].subUserProfile}
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
                    background: "#e6f4ea",
                    color: "#0f766e",
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
          )}

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
              <h6 className="mb-0 fw-bold" style={{ color: "#0f766e" }}>{current.title}</h6>
              <div style={{ width: 24 }} />
            </div>
          )}

          {/* Subpage component */}
          <div className={isMobile ? "p-3" : "p-4"}>
            {loading ? (
              <div className="text-center py-5" style={{ marginTop: "10%" }}>
                <div className="spinner-border text-info" role="status" style={{ color: "#0f766e" }}>
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
              style={{ color: activePage === "dashboard" ? "#0d9488" : "#64748b", flex: 1 }}
            >
              <i className={`bi ${activePage === "dashboard" ? "bi-grid-fill" : "bi-grid"}`} style={{ fontSize: 18 }} />
              <span style={{ fontSize: 9, fontWeight: activePage === "dashboard" ? "600" : "500", marginTop: 2 }}>Dashboard</span>
            </button>
            <button
              onClick={() => setActivePage("triage")}
              className="btn border-0 d-flex flex-column align-items-center justify-content-center p-0"
              style={{ color: activePage === "triage" ? "#0d9488" : "#64748b", flex: 1 }}
            >
              <i className={`bi ${activePage === "triage" ? "bi-clipboard2-pulse-fill" : "bi-clipboard2-pulse"}`} style={{ fontSize: 18 }} />
              <span style={{ fontSize: 9, fontWeight: activePage === "triage" ? "600" : "500", marginTop: 2 }}>Triage & Fisik</span>
            </button>
            <button
              onClick={() => setActivePage("profile")}
              className="btn border-0 d-flex flex-column align-items-center justify-content-center p-0"
              style={{ color: activePage === "profile" ? "#0d9488" : "#64748b", flex: 1 }}
            >
              <i className="bi bi-person-circle" style={{ fontSize: 18 }} />
              <span style={{ fontSize: 9, fontWeight: activePage === "profile" ? "600" : "500", marginTop: 2 }}>{userName ? userName.slice(0, 10) : "Perawat"}</span>
            </button>
          </div>
        )}
      </div>
    </>
  );
}
