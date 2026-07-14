import { useState, useEffect } from "react";
import { fetchActiveVisits, saveDoctorDiagnosis, updateTriageDetails } from "./supabaseHelpers";


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



// MEOWS Clinical Response Guideline
function getMEOWSGuidance(risk) {
  if (risk === "High") {
    return {
      title: "Respon Segera - Resiko Tinggi (Merah)",
      color: "#dc3545",
      points: [
        "Lakukan resusitasi & monitoring tanda vital terus-menerus.",
        "Laporkan ke dokter penanggung jawab segera (&lt; 5 menit).",
        "Panggil tim medis darurat (Code Blue jika diperlukan)."
      ]
    };
  } else if (risk === "Medium") {
    return {
      title: "Respon Cepat - Resiko Sedang (Kuning)",
      color: "#ffc107",
      points: [
        "Konsultasikan ke tim medis senior / dokter spesialis segera.",
        "Monitor tanda vital berkala (minimal setiap 1 jam).",
        "Siapkan sarana emergency untuk antisipasi penurunan kondisi."
      ]
    };
  } else {
    return {
      title: "Respon Rutin - Resiko Rendah (Hijau)",
      color: "#198754",
      points: [
        "Lakukan monitoring berkala setiap 4-6 jam.",
        "Lanjutkan asuhan keperawatan standar ruangan.",
        "Catat perkembangan pada rekam medis pasien."
      ]
    };
  }
}

// Download Report (Identity, Triage, Physical, Diagnosis)
function downloadMedicalRecordCSV(p) {
  const headers = [
    "ID Pasien", "Nama Pasien", "NIK", "No BPJS", "Umur", "Jenis Kelamin",
    "Keluhan Utama",
    "Berat Badan (kg)", "Tinggi Badan (cm)", "IMT / BMI", "Kategori BMI", "Lingkar Kepala (cm)", "Lingkar Lengan (cm)", "Golongan Darah",
    "Respiratory Rate (x/mnt)", "SpO2 (%)", "Oksigen Tambahan", "Suhu Tubuh (°C)", "Tekanan Darah Sistolik (mmHg)", "Tekanan Darah Diastolik (mmHg)", "Heart Rate (x/mnt)", "Kesadaran (AVPU)",
    "MEOWS Score", "Triage Risk Level", "Waktu Triase",
    "Diagnosis Dokter", "Status Pemeriksaan"
  ];

  const bmiVal = calcBMI(p.beratBadan, p.tinggiBadan);
  const bmiCat = getBMICategory(bmiVal);

  const row = [
    p.id, p.nama, p.nik, p.noBpjs || "-", p.umur, p.jenisKelamin,
    p.keluhan || "-",
    p.beratBadan || "-", p.tinggiBadan || "-", bmiVal || "-", bmiCat || "-", p.lingkarKepala || "-", p.lingkarLengan || "-", p.golDarah || "-",
    p.rr || "-", p.spo2 || "-", p.suplemenO2 || "-", p.suhu || "-", p.sistolik || "-", p.diastolik || "-", p.nadi || "-", p.avpu || "-",
    p.meowsScore !== undefined ? p.meowsScore : "-", p.triageRisk || "-", p.tglTriage || "-",
    p.diagnosa || "Belum Diinput", p.statusDiagnosis
  ].map(val => typeof val === "string" ? `"${val.replace(/"/g, '""')}"` : val).join(",");

  const csv = [headers.join(","), row].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `medical-record-${p.nama.replace(/\s+/g, "_")}-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Sidebar Component (Doctor Indigo Vibes) ─────────────────────────────────
function SidebarDoctor({ activePage, setActivePage, userName, onLogout }) {
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const navItems = [
    { id: "dashboard", icon: "bi-grid-fill", label: "Dashboard Dokter" },
    { id: "diagnose", icon: "bi-heart-pulse-fill", label: "Pasien & Diagnosis" },
  ];

  return (
    <div
      className="d-flex flex-column"
      style={{
        width: 260,
        minHeight: "100vh",
        background: "linear-gradient(180deg, #1e1b4b 0%, #0c0a21 100%)", // Deep Indigo Doctor Vibes
        color: "#fff",
        position: "fixed",
        top: 0,
        left: 0,
        zIndex: 100,
        boxShadow: "4px 0 20px rgba(0,0,0,0.2)",
      }}
    >
      {/* Brand */}
      <div
        className="d-flex align-items-center gap-2 px-4 py-4"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}
      >
        <div
          style={{
            background: "#6366f1",
            borderRadius: 10,
            width: 36,
            height: 36,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 2px 6px rgba(99, 102, 241, 0.4)"
          }}
        >
          <i className="bi bi-shield-shaded text-white" style={{ fontSize: 18 }} />
        </div>
        <div>
          <div style={{ fontWeight: 700, fontSize: 15, letterSpacing: 0.5 }}>
            Smart-Triage
          </div>
          <div style={{ fontSize: 11, opacity: 0.7 }}>Doctor Clinical Portal</div>
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
                borderLeft: isActive ? "4px solid #6366f1" : "4px solid transparent",
                borderRadius: "0px",
                margin: "0px"
              }}
            >
              <i
                className={`bi ${item.icon}`}
                style={{
                  fontSize: 16,
                  color: isActive ? "#818cf8" : "rgba(255, 255, 255, 0.65)",
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
                {userName ? `Dr. ${userName}` : "Dokter"}
              </div>
              <div style={{ opacity: 0.5, fontSize: 10 }}>Dokter Jaga IGD</div>
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

// ─── Doctor Dashboard Subpage ────────────────────────────────────────────────
function DoctorDashboard({ patients, setActivePage, setSelectedId, isMobile, userName }) {
  // Stats
  const totalCount = patients.length;
  const waitingDiagnose = patients.filter(p => p.statusDiagnosis === "Belum Diperiksa").length;
  const diagnosedCount = patients.filter(p => p.statusDiagnosis === "Sudah Diperiksa").length;

  const urgentCount = patients.filter(p => p.triageRisk === "High" && p.statusDiagnosis === "Belum Diperiksa").length;

  const stats = [
    { label: "Total Pasien IGD", value: totalCount, icon: "bi-people", color: "#4f46e5", bg: "#eef2ff" },
    { label: "Menunggu Diagnosis", value: waitingDiagnose, icon: "bi-hourglass-split", color: "#f59e0b", bg: "#fffbeb" },
    { label: "Sudah Didokumentasi", value: diagnosedCount, icon: "bi-check2-square", color: "#10b981", bg: "#ecfdf5" },
    { label: "Resiko Tinggi IGD (Waiting)", value: urgentCount, icon: "bi-exclamation-triangle", color: "#ef4444", bg: "#fef2f2" }
  ];

  // Clinical priority sorting: MEOWS score high -> low, undiagnosed first
  const sortedPatients = [...patients].sort((a, b) => {
    // 1. Sort by diagnosis status (undiagnosed first)
    if (a.statusDiagnosis !== b.statusDiagnosis) {
      return a.statusDiagnosis === "Belum Diperiksa" ? -1 : 1;
    }
    // 2. Sort by MEOWS score (highest first)
    return b.meowsScore - a.meowsScore;
  });

  if (isMobile) {
    return (
      <div style={{ background: "#f8fafc", minHeight: "100vh", padding: "10px 5px" }}>
        {/* Mobile Header */}
        <div className="mb-4 px-1">
          <h3 className="fw-bold mb-1" style={{ color: "#312e81", fontSize: "24px" }}>Halo, Dr. {userName || "Dokter"}</h3>
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
                  <div className="fw-bold" style={{ fontSize: 24, color: "#1e293b", lineHeight: 1.1 }}>{s.value}</div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Recent Patients List */}
        <div className="mb-4">
          <div className="d-flex align-items-center justify-content-between mb-3 px-1">
            <h5 className="fw-bold mb-0" style={{ color: "#1e293b", fontSize: "16px" }}>Antrean Pemeriksaan IGD</h5>
            <span className="badge bg-light text-muted border py-1.5 px-2" style={{ fontSize: 10 }}>Prioritas MEOWS</span>
          </div>

          {sortedPatients.length === 0 ? (
            <div className="text-center py-4 bg-white rounded-4 shadow-sm text-muted" style={{ fontSize: 12 }}>
              Belum ada pasien antrean
            </div>
          ) : (
            sortedPatients.map((p) => {
              let riskBadgeText = "#64748b";
              let riskLabel = "Belum Ditriase";
              if (p.triageRisk === "High") {
                riskBadgeText = "#dc3545";
                riskLabel = "Tinggi";
              } else if (p.triageRisk === "Medium") {
                riskBadgeText = "#d97706";
                riskLabel = "Sedang";
              } else if (p.triageRisk === "Low") {
                riskBadgeText = "#15803d";
                riskLabel = "Rendah";
              }

              const isChecked = p.statusDiagnosis === "Sudah Diperiksa";

              return (
                <div
                  key={p.id}
                  className="card border-0 shadow-sm rounded-4 mb-2 bg-white"
                  style={{ padding: "12px 16px", border: "1px solid #f1f5f9", cursor: "pointer" }}
                  onClick={() => {
                    setSelectedId(p.id);
                    setActivePage("diagnose");
                  }}
                >
                  <div className="d-flex align-items-center justify-content-between">
                    <div className="d-flex align-items-center gap-3">
                      <div
                        className="fw-bold d-flex align-items-center justify-content-center"
                        style={{
                          width: 42,
                          height: 42,
                          borderRadius: "50%",
                          background: isChecked ? "#ecfdf5" : "#eef2ff",
                          color: isChecked ? "#10b981" : "#4f46e5",
                          fontSize: 14
                        }}
                      >
                        {getInitials(p.nama)}
                      </div>

                      <div>
                        <div className="fw-bold" style={{ color: "#1e293b", fontSize: 14 }}>{p.nama}</div>
                        <div className="text-muted" style={{ fontSize: 11, marginTop: 2 }}>
                          Score: {p.meowsScore !== undefined ? p.meowsScore : "-"} • Risk: <span style={{ color: riskBadgeText, fontWeight: "600" }}>{riskLabel}</span>
                        </div>
                      </div>
                    </div>

                    <div className="d-flex align-items-center gap-2">
                      <span
                        className="badge fw-semibold"
                        style={{
                          background: isChecked ? "#ecfdf5" : "#fffbeb",
                          color: isChecked ? "#10b981" : "#d97706",
                          fontSize: 9,
                          padding: "4px 8px",
                          borderRadius: 6,
                          border: isChecked ? "1px solid #a7f3d0" : "1px solid #fde68a"
                        }}
                      >
                        {isChecked ? "Selesai" : "Menunggu"}
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
          onClick={() => {
            if (sortedPatients.length > 0) {
              setSelectedId(sortedPatients[0].id);
            }
            setActivePage("diagnose");
          }}
          className="btn shadow-lg d-flex align-items-center justify-content-center"
          style={{
            position: "fixed",
            bottom: "85px",
            right: "20px",
            width: "55px",
            height: "55px",
            borderRadius: "50%",
            background: "#4f46e5",
            color: "#fff",
            zIndex: 999,
            border: "none"
          }}
        >
          <i className="bi bi-clipboard2-pulse-fill" style={{ fontSize: 22 }} />
        </button>
      </div>
    );
  }

  return (
    <div>
      {/* Stats cards */}
      <div className="row g-3 mb-4">
        {stats.map((s) => {
          let extraIcon = "bi-graph-up-arrow";
          let extraIconColor = "#cbd5e1";
          if (s.label === "Total Pasien IGD") {
            extraIcon = "bi-people";
          } else if (s.label === "Menunggu Diagnosis") {
            extraIcon = "bi-hourglass";
            extraIconColor = "#fcd34d";
          } else if (s.label === "Sudah Didokumentasi") {
            extraIcon = "bi-check-circle";
            extraIconColor = "#6ee7b7";
          } else if (s.label === "Resiko Tinggi IGD (Waiting)") {
            extraIcon = "bi-exclamation-triangle";
            extraIconColor = "#fca5a5";
          }

          return (
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
                  <i className={`bi ${extraIcon}`} style={{ fontSize: 16, color: extraIconColor }} />
                </div>
                <div>
                  <div className="fw-bold text-dark" style={{ fontSize: 32, lineHeight: 1.2 }}>
                    {s.value}
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
          );
        })}
      </div>

      {/* Priority Patient Queue */}
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
              Antrean Pemeriksaan IGD
            </h5>
            <div className="text-muted" style={{ fontSize: 13 }}>
              Diurutkan otomatis berdasarkan prioritas & tingkat keparahan MEOWS
            </div>
          </div>
          <button
            className="btn btn-sm text-white fw-bold d-flex align-items-center gap-1.5 px-4 py-2 rounded-pill"
            style={{
              background: "#4f46e5",
              border: "none",
              fontSize: 13,
              boxShadow: "0 4px 12px rgba(79, 70, 229, 0.25)"
            }}
            onClick={() => {
              if (sortedPatients.length > 0) {
                setSelectedId(sortedPatients[0].id);
              }
              setActivePage("diagnose");
            }}
          >
            Mulai Diagnosis <i className="bi bi-arrow-right" />
          </button>
        </div>

        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0" style={{ fontSize: 13.5 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #f1f5f9" }}>
                <th className="fw-bold text-uppercase pb-3 border-0" style={{ color: "#94a3b8", fontSize: 10, letterSpacing: "0.5px" }}>NAMA PASIEN</th>
                <th className="fw-bold text-uppercase pb-3 border-0" style={{ color: "#94a3b8", fontSize: 10, letterSpacing: "0.5px" }}>WAKTU TRIASE</th>
                <th className="fw-bold text-uppercase pb-3 border-0" style={{ color: "#94a3b8", fontSize: 10, letterSpacing: "0.5px" }}>KELUHAN UTAMA</th>
                <th className="fw-bold text-uppercase pb-3 border-0 text-center" style={{ color: "#94a3b8", fontSize: 10, letterSpacing: "0.5px" }}>MEOWS</th>
                <th className="fw-bold text-uppercase pb-3 border-0 text-center" style={{ color: "#94a3b8", fontSize: 10, letterSpacing: "0.5px" }}>TINGKAT RESIKO</th>
                <th className="fw-bold text-uppercase pb-3 border-0 text-center" style={{ color: "#94a3b8", fontSize: 10, letterSpacing: "0.5px" }}>STATUS DOKTER</th>
                <th className="fw-bold text-uppercase pb-3 border-0 text-center" style={{ color: "#94a3b8", fontSize: 10, letterSpacing: "0.5px" }}>AKSI</th>
              </tr>
            </thead>
            <tbody>
              {sortedPatients.map((p) => {
                let riskStyle = { bg: "#f1f5f9", color: "#64748b", text: "Belum Ditriase" };
                if (p.triageRisk === "High") {
                  riskStyle = { bg: "#fde8e8", color: "#dc3545", text: "Tinggi" };
                } else if (p.triageRisk === "Medium") {
                  riskStyle = { bg: "#fff8e1", color: "#d97706", text: "Sedang" };
                } else if (p.triageRisk === "Low") {
                  riskStyle = { bg: "#e6f4ea", color: "#198754", text: "Rendah" };
                }

                const isChecked = p.statusDiagnosis === "Sudah Diperiksa";

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
                        <div>
                          <div className="fw-bold text-dark">{p.nama}</div>
                          <div className="text-muted" style={{ fontSize: 11 }}>{p.umur} tahun • {p.jenisKelamin}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 text-secondary">{p.tglTriage || "Belum Triase"}</td>
                    <td className="py-3 text-secondary text-truncate" style={{ maxWidth: 220 }}>
                      {p.keluhan || <span className="text-muted italic">Tidak ada keluhan</span>}
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
                      <span
                        className="badge text-uppercase fw-bold"
                        style={{
                          background: isChecked ? "#e6f4ea" : "#fff8e1",
                          color: isChecked ? "#10b981" : "#d97706",
                          fontSize: 10,
                          padding: "5px 10px",
                          borderRadius: "20px"
                        }}
                      >
                        {isChecked ? "Selesai" : "Menunggu"}
                      </span>
                    </td>
                    <td className="py-3 text-center">
                      <button
                        className="btn btn-sm btn-outline-indigo d-inline-flex align-items-center gap-1.5"
                        style={{ borderColor: "#4f46e5", color: "#4f46e5", fontSize: 12, borderRadius: "20px", fontWeight: "600", padding: "5px 12px" }}
                        onClick={() => {
                          setSelectedId(p.id);
                          setActivePage("diagnose");
                        }}
                      >
                        <i className="bi bi-journal-medical" />
                        Periksa & Diagnosa
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

// ─── Diagnose Workspace Subpage ──────────────────────────────────────────────
function DiagnoseWorkspace({ patients, setPatients, selectedId, setSelectedId }) {
  const activePatient = patients.find(p => p.id === selectedId) || patients[0];

  // Diagnosis inputs states
  const [diagnosa, setDiagnosa] = useState(activePatient?.diagnosa || "");
  const [beratBadan, setBeratBadan] = useState(activePatient?.beratBadan || "");
  const [tinggiBadan, setTinggiBadan] = useState(activePatient?.tinggiBadan || "");
  const [lingkarKepala, setLingkarKepala] = useState(activePatient?.lingkarKepala || "");
  const [lingkarLengan, setLingkarLengan] = useState(activePatient?.lingkarLengan || "");
  const [golDarah, setGolDarah] = useState(activePatient?.golDarah || "");

  const [rr, setRr] = useState(activePatient?.rr || "");
  const [spo2, setSpo2] = useState(activePatient?.spo2 || "");
  const [suplemenO2, setSuplemenO2] = useState(activePatient?.suplemenO2 || "Tidak");
  const [suhu, setSuhu] = useState(activePatient?.suhu || "");
  const [sistolik, setSistolik] = useState(activePatient?.sistolik || "");
  const [diastolik, setDiastolik] = useState(activePatient?.diastolik || "");
  const [nadi, setNadi] = useState(activePatient?.nadi || "");
  const [avpu, setAvpu] = useState(activePatient?.avpu || "Alert");

  const [isEditingAnthro, setIsEditingAnthro] = useState(false);
  const [isEditingVitals, setIsEditingVitals] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [currentMeows, setCurrentMeows] = useState({ score: activePatient?.meowsScore || 0, risk: activePatient?.triageRisk || "Low" });

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

  // Sync state when activePatient changes
  const handleSelectPatient = (p) => {
    setSelectedId(p.id);
    setDiagnosa(p.diagnosa || "");
    setBeratBadan(p.beratBadan || "");
    setTinggiBadan(p.tinggiBadan || "");
    setLingkarKepala(p.lingkarKepala || "");
    setLingkarLengan(p.lingkarLengan || "");
    setGolDarah(p.golDarah || "");

    setRr(p.rr || "");
    setSpo2(p.spo2 || "");
    setSuplemenO2(p.suplemenO2 || "Tidak");
    setSuhu(p.suhu || "");
    setSistolik(p.sistolik || "");
    setDiastolik(p.diastolik || "");
    setNadi(p.nadi || "");
    setAvpu(p.avpu || "Alert");

    setIsEditingAnthro(false);
    setIsEditingVitals(false);
    setSaveSuccess(false);

    setCurrentMeows({
      score: p.meowsScore || 0,
      risk: p.triageRisk || "Low"
    });
  };

  const handleSaveAnthro = () => {
    setPatients((prev) =>
      prev.map((p) => {
        if (p.id === activePatient.id) {
          return {
            ...p,
            beratBadan: beratBadan !== "" ? parseFloat(beratBadan) : "",
            tinggiBadan: tinggiBadan !== "" ? parseFloat(tinggiBadan) : "",
            lingkarKepala: lingkarKepala !== "" ? parseFloat(lingkarKepala) : "",
            lingkarLengan: lingkarLengan !== "" ? parseFloat(lingkarLengan) : "",
            golDarah: golDarah
          };
        }
        return p;
      })
    );
    setIsEditingAnthro(false);
  };

  const handleCancelAnthro = () => {
    setBeratBadan(activePatient?.beratBadan || "");
    setTinggiBadan(activePatient?.tinggiBadan || "");
    setLingkarKepala(activePatient?.lingkarKepala || "");
    setLingkarLengan(activePatient?.lingkarLengan || "");
    setGolDarah(activePatient?.golDarah || "");
    setIsEditingAnthro(false);
  };

  const handleSaveVitals = () => {
    setPatients((prev) =>
      prev.map((p) => {
        if (p.id === activePatient.id) {
          return {
            ...p,
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
        }
        return p;
      })
    );
    setIsEditingVitals(false);
  };

  const handleCancelVitals = () => {
    setRr(activePatient?.rr || "");
    setSpo2(activePatient?.spo2 || "");
    setSuplemenO2(activePatient?.suplemenO2 || "Tidak");
    setSuhu(activePatient?.suhu || "");
    setSistolik(activePatient?.sistolik || "");
    setDiastolik(activePatient?.diastolik || "");
    setNadi(activePatient?.nadi || "");
    setAvpu(activePatient?.avpu || "Alert");
    setIsEditingVitals(false);
  };

  const handleSave = async () => {
    const triageData = {
      beratBadan: beratBadan !== "" ? parseFloat(beratBadan) : "",
      tinggiBadan: tinggiBadan !== "" ? parseFloat(tinggiBadan) : "",
      imt: currentBmi !== "" ? parseFloat(currentBmi) : "",
      lingkarKepala: lingkarKepala !== "" ? parseFloat(lingkarKepala) : "",
      lingkarLengan: lingkarLengan !== "" ? parseFloat(lingkarLengan) : "",
      golDarah: golDarah,
      keluhan: activePatient.keluhan,

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
      await saveDoctorDiagnosis(activePatient.id, diagnosa);

      setPatients((prev) =>
        prev.map((p) => {
          if (p.id === activePatient.id) {
            return {
              ...p,
              ...triageData,
              diagnosa: diagnosa,
              statusDiagnosis: "Sudah Diperiksa"
            };
          }
          return p;
        })
      );
      setIsEditingAnthro(false);
      setIsEditingVitals(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error("Error saving doctor diagnosis:", err.message);
    }
  };

  const guidance = getMEOWSGuidance(currentMeows.risk);
  const currentBmi = calcBMI(beratBadan, tinggiBadan);
  const currentBmiCat = getBMICategory(currentBmi);
  const bmiVal = calcBMI(activePatient?.beratBadan, activePatient?.tinggiBadan);
  const bmiCat = getBMICategory(bmiVal);

  return (
    <div className="row g-4">
      {/* Patient List (Ordered by Severity MEOWS) */}
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
          <h6 className="fw-semibold mb-3 px-1" style={{ color: "#312e81", fontSize: 14 }}>
            <i className="bi bi-people-fill me-2" />
            Daftar Pasien IGD
          </h6>
          <div className="d-flex flex-column gap-2" style={{ maxHeight: "65vh", overflowY: "auto" }}>
            {[...patients]
              .sort((a, b) => b.meowsScore - a.meowsScore)
              .map((p) => {
                const isActive = p.id === activePatient?.id;
                const hasDiagnosis = p.statusDiagnosis === "Sudah Diperiksa";
                return (
                  <button
                    key={p.id}
                    onClick={() => handleSelectPatient(p)}
                    className="btn text-start p-2 border-0 transition-all"
                    style={{
                      background: isActive ? "#e0e7ff" : "#f8fafc",
                      color: isActive ? "#312e81" : "#334155",
                      cursor: "pointer",
                      borderRadius: "12px",
                      boxShadow: isActive ? "0 2px 4px rgba(79,70,229,0.1)" : "none",
                    }}
                  >
                    <div className="d-flex align-items-center justify-content-between mb-1">
                      <span className="fw-semibold" style={{ fontSize: 13, textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>
                        {p.nama}
                      </span>
                      <span
                        className="badge"
                        style={{
                          background: p.triageRisk === "High" ? "#fee2e2" : p.triageRisk === "Medium" ? "#fef3c7" : "#dcfce7",
                          color: p.triageRisk === "High" ? "#b91c1c" : p.triageRisk === "Medium" ? "#b45309" : "#15803d",
                          fontSize: 10
                        }}
                      >
                        MEOWS: {p.meowsScore}
                      </span>
                    </div>
                    <div className="d-flex align-items-center justify-content-between text-muted" style={{ fontSize: 11 }}>
                      <span>{p.umur} thn • {p.jenisKelamin}</span>
                      <span className={`fw-medium ${hasDiagnosis ? "text-success" : "text-warning"}`}>
                        {hasDiagnosis ? "Diagnosed" : "Waiting"}
                      </span>
                    </div>
                  </button>
                );
              })}
          </div>
        </div>
      </div>

      {/* Patient Case Sheet & Diagnostic Workspace */}
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
                Diagnosis dan tanda vital untuk <strong>{activePatient.nama}</strong> berhasil disimpan!
              </div>
            )}

            {/* Demographics Summary */}
            <div className="p-3 mb-4 d-flex flex-wrap align-items-center justify-content-between gap-3" style={{ background: "#f5f3ff", border: "1.5px dashed #c084fc", borderRadius: "16px" }}>
              <div>
                <h5 className="fw-bold mb-1" style={{ color: "#312e81" }}>{activePatient.nama}</h5>
                <p className="text-muted mb-0" style={{ fontSize: 12 }}>
                  NIK: <span className="font-monospace">{activePatient.nik}</span> | No BPJS: <span className="font-monospace">{activePatient.noBpjs || "-"}</span> | Kontak: {activePatient.noHp}
                </p>
              </div>
              <button
                className="btn btn-sm btn-indigo d-flex align-items-center gap-2 text-white"
                style={{ background: "#4f46e5", border: "none", borderRadius: "30px", padding: "6px 16px", fontWeight: "600" }}
                onClick={() => downloadMedicalRecordCSV(activePatient)}
              >
                <i className="bi bi-download" />
                Download Laporan (CSV)
              </button>
            </div>

            {/* Medical Info & Triage Stats */}
            <div className="row g-4 mb-4">
              {/* Triage Alert Box */}
              <div className="col-12 col-md-4">
                <div
                  className="p-3 text-center h-100 d-flex flex-column justify-content-center align-items-center"
                  style={{
                    background: currentMeows.risk === "High" ? "#fef2f2" : currentMeows.risk === "Medium" ? "#fffbeb" : "#f0fdf4",
                    border: `1.5px solid ${currentMeows.risk === "High" ? "#fee2e2" : currentMeows.risk === "Medium" ? "#fef3c7" : "#dcfce7"}`,
                    borderRadius: "16px"
                  }}
                >
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b" }} className="mb-2">STATUS MEOWS</div>
                  <div
                    className="d-inline-flex align-items-center justify-content-center rounded-circle mb-2"
                    style={{
                      width: 70,
                      height: 70,
                      border: `3px solid ${guidance.color}`,
                      color: guidance.color,
                      fontWeight: 800,
                      fontSize: 26,
                    }}
                  >
                    {currentMeows.score}
                  </div>
                  <h6 className="fw-bold mb-0" style={{ color: guidance.color }}>
                    Resiko {currentMeows.risk === "High" ? "Tinggi" : currentMeows.risk === "Medium" ? "Sedang" : "Rendah"}
                  </h6>
                  <span className="text-muted mt-1" style={{ fontSize: 10 }}>Ditriase: {activePatient.tglTriage || "-"}</span>
                </div>
              </div>

              {/* Triage Clinical Action Recommendation */}
              <div className="col-12 col-md-8">
                <div className="p-3 h-100 bg-light" style={{ border: "1px solid #e2e8f0", borderRadius: "16px" }}>
                  <div className="fw-bold mb-2 text-dark" style={{ fontSize: 12 }}>
                    <i className="bi bi-shield-exclamation me-1" />
                    Rekomendasi Triage MEOWS:
                  </div>
                  <ul className="ps-3 mb-0" style={{ fontSize: 12, color: "#334155" }}>
                    {guidance.points.map((pt, index) => (
                      <li key={index} className="mb-1">{pt}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            {/* Diagnostics details row */}
            <div className="row g-4">
              <div className="col-12 col-xl-8">
                {/* 1. Keluhan Utama */}
                <div className="mb-4 bg-light p-3" style={{ border: "1px solid #e2e8f0", borderRadius: "16px" }}>
                  <div className="fw-bold text-dark mb-1" style={{ fontSize: 13 }}>
                    <i className="bi bi-chat-left-text-fill text-indigo me-2" style={{ color: "#4f46e5" }} />
                    Keluhan Utama / Alasan Masuk IGD
                  </div>
                  <div className="text-muted p-2 bg-white" style={{ fontSize: 13, minHeight: 45, border: "1px solid #e2e8f0", borderRadius: "10px" }}>
                    {activePatient.keluhan || "Tidak ada data keluhan."}
                  </div>
                </div>

                {/* 2. Data Fisik & Antropometri */}
                <div className="mb-4">
                  <div className="d-flex align-items-center justify-content-between mb-3">
                    <div className="d-flex align-items-center gap-2" style={{ color: "#312e81" }}>
                      <div style={{ width: 4, height: 16, background: "#4f46e5", borderRadius: 2 }} />
                      <span className="fw-bold" style={{ fontSize: 14 }}>Parameter Antropometri / Fisik</span>
                    </div>
                    {isEditingAnthro ? (
                      <div className="d-flex gap-2">
                        <button
                          className="btn btn-sm btn-success py-1 px-3 d-flex align-items-center gap-1"
                          style={{ fontSize: 12, background: "#10b981", border: "none", color: "#fff", borderRadius: "30px", fontWeight: "500" }}
                          onClick={handleSaveAnthro}
                        >
                          <i className="bi bi-check-lg" /> Simpan
                        </button>
                        <button
                          className="btn btn-sm btn-outline-secondary py-1 px-3 d-flex align-items-center gap-1"
                          style={{ fontSize: 12, borderRadius: "30px", fontWeight: "500" }}
                          onClick={handleCancelAnthro}
                        >
                          <i className="bi bi-x-lg" /> Batal
                        </button>
                      </div>
                    ) : (
                      <button
                        className="btn btn-sm btn-outline-primary py-1 px-3 d-flex align-items-center gap-1"
                        style={{ fontSize: 12, borderColor: "#4f46e5", color: "#4f46e5", borderRadius: "30px", fontWeight: "500" }}
                        onClick={() => setIsEditingAnthro(true)}
                      >
                        <i className="bi bi-pencil-square" /> Edit
                      </button>
                    )}
                  </div>

                  <div className="row g-3">
                    {/* Berat Badan */}
                    <div className="col-4 col-sm-3">
                      <div className={`border p-2 text-center ${isEditingAnthro ? "bg-white shadow-sm" : "bg-light"}`} style={{ borderRadius: "12px" }}>
                        <label className="text-muted d-block mb-1" style={{ fontSize: 10 }}>Berat Badan (kg)</label>
                        {isEditingAnthro ? (
                          <input
                            type="number"
                            className="form-control form-control-sm text-center fw-bold"
                            style={{ fontSize: 12, padding: "2px 5px", height: 26, borderRadius: "6px" }}
                            value={beratBadan}
                            onChange={(e) => setBeratBadan(e.target.value)}
                          />
                        ) : (
                          <div className="fw-bold" style={{ fontSize: 13, height: 26, lineHeight: "26px" }}>
                            {activePatient.beratBadan ? `${activePatient.beratBadan} kg` : "-"}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Tinggi Badan */}
                    <div className="col-4 col-sm-3">
                      <div className={`border p-2 text-center ${isEditingAnthro ? "bg-white shadow-sm" : "bg-light"}`} style={{ borderRadius: "12px" }}>
                        <label className="text-muted d-block mb-1" style={{ fontSize: 10 }}>Tinggi Badan (cm)</label>
                        {isEditingAnthro ? (
                          <input
                            type="number"
                            className="form-control form-control-sm text-center fw-bold"
                            style={{ fontSize: 12, padding: "2px 5px", height: 26, borderRadius: "6px" }}
                            value={tinggiBadan}
                            onChange={(e) => setTinggiBadan(e.target.value)}
                          />
                        ) : (
                          <div className="fw-bold" style={{ fontSize: 13, height: 26, lineHeight: "26px" }}>
                            {activePatient.tinggiBadan ? `${activePatient.tinggiBadan} cm` : "-"}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* BMI / IMT */}
                    <div className="col-4 col-sm-3">
                      <div className="border p-2 text-center bg-light" style={{ borderRadius: "12px" }}>
                        <label className="text-muted d-block mb-1" style={{ fontSize: 10 }}>BMI / IMT</label>
                        <div className={`fw-bold badge ${getBMIBadgeColor(isEditingAnthro ? currentBmi : bmiVal)}`} style={{ fontSize: 11, display: "block", padding: "6px", height: 26, lineHeight: "14px", borderRadius: "6px" }}>
                          {isEditingAnthro ? (currentBmi ? `${currentBmi}` : "-") : (bmiVal ? `${bmiVal}` : "-")}
                        </div>
                      </div>
                    </div>

                    {/* Kategori BMI */}
                    <div className="col-12 col-sm-3">
                      <div className="border p-2 text-center bg-light" style={{ borderRadius: "12px" }}>
                        <label className="text-muted d-block mb-1" style={{ fontSize: 10 }}>Kategori BMI</label>
                        <div className="fw-semibold text-truncate" style={{ fontSize: 11, height: 26, lineHeight: "26px" }} title={isEditingAnthro ? currentBmiCat : bmiCat}>
                          {(isEditingAnthro ? currentBmiCat : bmiCat) || "-"}
                        </div>
                      </div>
                    </div>

                    {/* Lingkar Kepala */}
                    <div className="col-4">
                      <div className={`border p-2 text-center ${isEditingAnthro ? "bg-white shadow-sm" : "bg-light"}`} style={{ borderRadius: "12px" }}>
                        <label className="text-muted d-block mb-1" style={{ fontSize: 10 }}>Lingkar Kepala</label>
                        {isEditingAnthro ? (
                          <input
                            type="number"
                            className="form-control form-control-sm text-center fw-bold"
                            style={{ fontSize: 12, padding: "2px 5px", height: 26, borderRadius: "6px" }}
                            value={lingkarKepala}
                            onChange={(e) => setLingkarKepala(e.target.value)}
                          />
                        ) : (
                          <div className="fw-bold" style={{ fontSize: 13, height: 26, lineHeight: "26px" }}>
                            {activePatient.lingkarKepala ? `${activePatient.lingkarKepala} cm` : "-"}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Lingkar Lengan */}
                    <div className="col-4">
                      <div className={`border p-2 text-center ${isEditingAnthro ? "bg-white shadow-sm" : "bg-light"}`} style={{ borderRadius: "12px" }}>
                        <label className="text-muted d-block mb-1" style={{ fontSize: 10 }}>Lingkar Lengan (LiLA)</label>
                        {isEditingAnthro ? (
                          <input
                            type="number"
                            step="0.1"
                            className="form-control form-control-sm text-center fw-bold"
                            style={{ fontSize: 12, padding: "2px 5px", height: 26, borderRadius: "6px" }}
                            value={lingkarLengan}
                            onChange={(e) => setLingkarLengan(e.target.value)}
                          />
                        ) : (
                          <div className="fw-bold" style={{ fontSize: 13, height: 26, lineHeight: "26px" }}>
                            {activePatient.lingkarLengan ? `${activePatient.lingkarLengan} cm` : "-"}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Golongan Darah */}
                    <div className="col-4">
                      <div className={`border p-2 text-center ${isEditingAnthro ? "bg-white shadow-sm" : "bg-light"}`} style={{ borderRadius: "12px" }}>
                        <label className="text-muted d-block mb-1" style={{ fontSize: 10 }}>Golongan Darah</label>
                        {isEditingAnthro ? (
                          <select
                            className="form-select form-select-sm text-center fw-bold p-0"
                            style={{ fontSize: 12, height: 26, borderRadius: "6px" }}
                            value={golDarah}
                            onChange={(e) => setGolDarah(e.target.value)}
                          >
                            <option value="">-</option>
                            <option value="A">A</option>
                            <option value="B">B</option>
                            <option value="AB">AB</option>
                            <option value="O">O</option>
                            <option value="A+">A+</option>
                            <option value="A-">A-</option>
                            <option value="B+">B+</option>
                            <option value="B-">B-</option>
                            <option value="AB+">AB+</option>
                            <option value="AB-">AB-</option>
                            <option value="O+">O+</option>
                            <option value="O-">O-</option>
                          </select>
                        ) : (
                          <div className="fw-bold" style={{ fontSize: 13, height: 26, lineHeight: "26px" }}>
                            {activePatient.golDarah || "-"}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* 3. Parameter Tanda Vital */}
                <div className="mb-4">
                  <div className="d-flex align-items-center justify-content-between mb-3">
                    <div className="d-flex align-items-center gap-2" style={{ color: "#312e81" }}>
                      <div style={{ width: 4, height: 16, background: "#4f46e5", borderRadius: 2 }} />
                      <span className="fw-bold" style={{ fontSize: 14 }}>Tanda-tanda Vital (Vitals Monitor)</span>
                    </div>
                    {isEditingVitals ? (
                      <div className="d-flex gap-2">
                        <button
                          className="btn btn-sm btn-success py-1 px-3 d-flex align-items-center gap-1"
                          style={{ fontSize: 12, background: "#10b981", border: "none", color: "#fff", borderRadius: "30px", fontWeight: "500" }}
                          onClick={handleSaveVitals}
                        >
                          <i className="bi bi-check-lg" /> Simpan
                        </button>
                        <button
                          className="btn btn-sm btn-outline-secondary py-1 px-3 d-flex align-items-center gap-1"
                          style={{ fontSize: 12, borderRadius: "30px", fontWeight: "500" }}
                          onClick={handleCancelVitals}
                        >
                          <i className="bi bi-x-lg" /> Batal
                        </button>
                      </div>
                    ) : (
                      <button
                        className="btn btn-sm btn-outline-primary py-1 px-3 d-flex align-items-center gap-1"
                        style={{ fontSize: 12, borderColor: "#4f46e5", color: "#4f46e5", borderRadius: "30px", fontWeight: "500" }}
                        onClick={() => setIsEditingVitals(true)}
                      >
                        <i className="bi bi-pencil-square" /> Edit
                      </button>
                    )}
                  </div>

                  <div className="row g-2">
                    {/* RR */}
                    <div className="col-6 col-sm-4 col-md-3">
                      <div className={`border p-2 d-flex align-items-center gap-2 ${isEditingVitals ? "bg-white shadow-sm" : "bg-light"}`} style={{ borderRadius: "12px" }}>
                        <i className="bi bi-lungs" style={{ color: "#4f46e5", fontSize: 16 }} />
                        <div className="flex-grow-1">
                          <label className="text-muted" style={{ fontSize: 9, display: "block" }}>Resp. Rate (RR)</label>
                          {isEditingVitals ? (
                            <div className="d-flex align-items-center gap-1">
                              <input
                                type="number"
                                className="form-control form-control-sm text-center fw-bold p-1"
                                style={{ fontSize: 12, height: 26, borderRadius: "6px" }}
                                value={rr}
                                onChange={(e) => setRr(e.target.value)}
                              />
                              <span style={{ fontSize: 9 }} className="text-muted">/m</span>
                            </div>
                          ) : (
                            <div className="fw-bold" style={{ fontSize: 12, height: 26, lineHeight: "26px" }}>
                              {activePatient.rr ? `${activePatient.rr} x/mnt` : "-"}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* SpO2 */}
                    <div className="col-6 col-sm-4 col-md-3">
                      <div className={`border p-2 d-flex align-items-center gap-2 ${isEditingVitals ? "bg-white shadow-sm" : "bg-light"}`} style={{ borderRadius: "12px" }}>
                        <i className="bi bi-activity" style={{ color: "#4f46e5", fontSize: 16 }} />
                        <div className="flex-grow-1">
                          <label className="text-muted" style={{ fontSize: 9, display: "block" }}>Saturasi SpO2</label>
                          {isEditingVitals ? (
                            <div className="d-flex align-items-center gap-1">
                              <input
                                type="number"
                                className="form-control form-control-sm text-center fw-bold p-1"
                                style={{ fontSize: 12, height: 26, borderRadius: "6px" }}
                                value={spo2}
                                onChange={(e) => setSpo2(e.target.value)}
                              />
                              <span style={{ fontSize: 9 }} className="text-muted">%</span>
                            </div>
                          ) : (
                            <div className="fw-bold" style={{ fontSize: 12, height: 26, lineHeight: "26px" }}>
                              {activePatient.spo2 ? `${activePatient.spo2} %` : "-"}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Terapi Oksigen */}
                    <div className="col-6 col-sm-4 col-md-3">
                      <div className={`border p-2 d-flex align-items-center gap-2 ${isEditingVitals ? "bg-white shadow-sm" : "bg-light"}`} style={{ borderRadius: "12px" }}>
                        <i className="bi bi-heart-arrow" style={{ color: "#4f46e5", fontSize: 16 }} />
                        <div className="flex-grow-1">
                          <label className="text-muted" style={{ fontSize: 9, display: "block" }}>Terapi Oksigen</label>
                          {isEditingVitals ? (
                            <select
                              className="form-select form-select-sm fw-bold p-1"
                              style={{ fontSize: 11, height: 26, borderRadius: "6px" }}
                              value={suplemenO2}
                              onChange={(e) => setSuplemenO2(e.target.value)}
                            >
                              <option value="Tidak">Tidak</option>
                              <option value="Ya">Ya</option>
                            </select>
                          ) : (
                            <div className="fw-bold" style={{ fontSize: 12, height: 26, lineHeight: "26px" }}>
                              {activePatient.suplemenO2 || "-"}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Suhu */}
                    <div className="col-6 col-sm-4 col-md-3">
                      <div className={`border p-2 d-flex align-items-center gap-2 ${isEditingVitals ? "bg-white shadow-sm" : "bg-light"}`} style={{ borderRadius: "12px" }}>
                        <i className="bi bi-thermometer-half" style={{ color: "#4f46e5", fontSize: 16 }} />
                        <div className="flex-grow-1">
                          <label className="text-muted" style={{ fontSize: 9, display: "block" }}>Suhu Tubuh</label>
                          {isEditingVitals ? (
                            <div className="d-flex align-items-center gap-1">
                              <input
                                type="number"
                                step="0.1"
                                className="form-control form-control-sm text-center fw-bold p-1"
                                style={{ fontSize: 12, height: 26, borderRadius: "6px" }}
                                value={suhu}
                                onChange={(e) => setSuhu(e.target.value)}
                              />
                              <span style={{ fontSize: 9 }} className="text-muted">°C</span>
                            </div>
                          ) : (
                            <div className="fw-bold" style={{ fontSize: 12, height: 26, lineHeight: "26px" }}>
                              {activePatient.suhu ? `${activePatient.suhu} °C` : "-"}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Tekanan Darah (Sistolik / Diastolik) */}
                    <div className="col-6 col-sm-4 col-md-3">
                      <div className={`border p-2 d-flex align-items-center gap-2 ${isEditingVitals ? "bg-white shadow-sm" : "bg-light"}`} style={{ borderRadius: "12px" }}>
                        <i className="bi bi-heart-pulse" style={{ color: "#4f46e5", fontSize: 16 }} />
                        <div className="flex-grow-1">
                          <label className="text-muted" style={{ fontSize: 9, display: "block" }}>Tekanan Darah</label>
                          {isEditingVitals ? (
                            <div className="d-flex align-items-center gap-1">
                              <input
                                type="number"
                                placeholder="Sys"
                                className="form-control form-control-sm text-center fw-bold p-1"
                                style={{ fontSize: 11, height: 26, minWidth: 0, borderRadius: "6px" }}
                                value={sistolik}
                                onChange={(e) => setSistolik(e.target.value)}
                              />
                              <span style={{ fontSize: 9 }} className="text-muted">/</span>
                              <input
                                type="number"
                                placeholder="Dias"
                                className="form-control form-control-sm text-center fw-bold p-1"
                                style={{ fontSize: 11, height: 26, minWidth: 0, borderRadius: "6px" }}
                                value={diastolik}
                                onChange={(e) => setDiastolik(e.target.value)}
                              />
                            </div>
                          ) : (
                            <div className="fw-bold" style={{ fontSize: 12, height: 26, lineHeight: "26px" }}>
                              {activePatient.sistolik && activePatient.diastolik ? `${activePatient.sistolik}/${activePatient.diastolik} mmHg` : "-"}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Nadi / HR */}
                    <div className="col-6 col-sm-4 col-md-3">
                      <div className={`border p-2 d-flex align-items-center gap-2 ${isEditingVitals ? "bg-white shadow-sm" : "bg-light"}`} style={{ borderRadius: "12px" }}>
                        <i className="bi bi-droplet-half" style={{ color: "#4f46e5", fontSize: 16 }} />
                        <div className="flex-grow-1">
                          <label className="text-muted" style={{ fontSize: 9, display: "block" }}>Nadi / HR</label>
                          {isEditingVitals ? (
                            <div className="d-flex align-items-center gap-1">
                              <input
                                type="number"
                                className="form-control form-control-sm text-center fw-bold p-1"
                                style={{ fontSize: 12, height: 26, borderRadius: "6px" }}
                                value={nadi}
                                onChange={(e) => setNadi(e.target.value)}
                              />
                              <span style={{ fontSize: 9 }} className="text-muted">/m</span>
                            </div>
                          ) : (
                            <div className="fw-bold" style={{ fontSize: 12, height: 26, lineHeight: "26px" }}>
                              {activePatient.nadi ? `${activePatient.nadi} x/mnt` : "-"}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* AVPU */}
                    <div className="col-6 col-sm-4 col-md-3">
                      <div className={`border p-2 d-flex align-items-center gap-2 ${isEditingVitals ? "bg-white shadow-sm" : "bg-light"}`} style={{ borderRadius: "12px" }}>
                        <i className="bi bi-brain" style={{ color: "#4f46e5", fontSize: 16 }} />
                        <div className="flex-grow-1">
                          <label className="text-muted" style={{ fontSize: 9, display: "block" }}>Kesadaran</label>
                          {isEditingVitals ? (
                            <select
                              className="form-select form-select-sm fw-bold p-1"
                              style={{ fontSize: 11, height: 26, borderRadius: "6px" }}
                              value={avpu}
                              onChange={(e) => setAvpu(e.target.value)}
                            >
                              <option value="Alert">Alert (A)</option>
                              <option value="Voice">Voice (V)</option>
                              <option value="Pain">Pain (P)</option>
                              <option value="Unresponsive">Unresponsive (U)</option>
                            </select>
                          ) : (
                            <div className="fw-bold" style={{ fontSize: 12, height: 26, lineHeight: "26px" }}>
                              {activePatient.avpu || "-"}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Doctor Form Input Diagnosis */}
              <div className="col-12 col-xl-4">
                <div
                  className="p-4 h-100 d-flex flex-column shadow-sm"
                  style={{ background: "#fcfdff", border: "1px solid #e2e8f0", borderRadius: "20px" }}
                >
                  <h6 className="fw-bold text-indigo mb-3" style={{ fontSize: 13, color: "#4338ca" }}>
                    <i className="bi bi-capsule-therapeutic me-1" />
                    FORMULIR DIAGNOSIS MEDIS
                  </h6>

                  <div className="mb-4">
                    <label className="form-label fw-semibold text-muted mb-1" style={{ fontSize: 12 }}>
                      Diagnosis Utama / ICD-10 <span className="text-danger">*</span>
                    </label>
                    <textarea
                      className="form-control"
                      rows={6}
                      placeholder="Masukkan diagnosa medis..."
                      value={diagnosa}
                      onChange={(e) => setDiagnosa(e.target.value)}
                      style={{ fontSize: 13, resize: "none", borderRadius: "12px" }}
                    />
                  </div>

                  <button
                    className="btn w-100 py-2.5 d-flex align-items-center justify-content-center gap-2 text-white mt-auto"
                    style={{ background: "#4f46e5", fontWeight: 600, border: "none", borderRadius: "15px" }}
                    onClick={handleSave}
                  >
                    <i className="bi bi-file-earmark-medical-fill" />
                    Simpan Diagnosis & Tanda Vital
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-5 text-muted bg-white border" style={{ borderRadius: "20px", boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.03)" }}>
            <i className="bi bi-search d-block mb-2" style={{ fontSize: 36 }} />
            Pilih pasien untuk meninjau status klinis
          </div>
        )}
      </div>
    </div>
  );
}

function UserProfilePage({ userName, userEmail, joinedAt, onLogout, onChangePassword, role, themeColor, badgeBg, badgeColor }) {
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

          <h4 className="fw-bold mb-1 text-dark" style={{ letterSpacing: "-0.5px" }}>
            {userName || "User"}
          </h4>

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

export default function DoctorPanel({ onLogout, userName, userEmail, joinedAt, onChangePassword }) {
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
          const sorted = [...data].sort((a, b) => b.meowsScore - a.meowsScore);
          setSelectedId(sorted[0].id);
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
    setActivePage("diagnose");
  }

  const subpages = {
    dashboard: {
      title: "Papan Pemantauan Pasien IGD Dokter",
      component: <DoctorDashboard patients={patients} setActivePage={setActivePage} setSelectedId={handleSelectFromDashboard} isMobile={isMobile} userName={userName} />
    },
    diagnose: {
      title: "Lembar Catatan Medis & Diagnosis Pasien",
      component: (
        <DiagnoseWorkspace
          patients={patients}
          setPatients={setPatients}
          selectedId={selectedId}
          setSelectedId={setSelectedId}
        />
      )
    },
    profile: {
      title: "Profil Pengguna",
      component: (
        <UserProfilePage
          userName={userName}
          userEmail={userEmail}
          joinedAt={joinedAt}
          onLogout={onLogout}
          onChangePassword={onChangePassword}
          role="Dokter"
          themeColor="#4f46e5"
          badgeBg="#e0e7ff"
          badgeColor="#4338ca"
        />
      )
    }
  };

  const current = subpages[activePage];

  return (
    <>
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
          <SidebarDoctor activePage={activePage} setActivePage={setActivePage} userName={userName} onLogout={onLogout} />
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
                  {activePage === "profile" ? "Profil Pengguna" : activePage === "dashboard" ? "Dashboard Dokter" : "Pasien & Diagnosis"}
                </h3>
                <div className="text-muted" style={{ fontSize: 13, marginTop: 2 }}>
                  {activePage === "dashboard"
                    ? "Overview of clinical priority & IGD queue"
                    : activePage === "diagnose"
                      ? "Workspace for inputting clinical diagnosis and medical notes"
                      : "Manage your profile details and change password"}
                </div>
              </div>
              <div className="d-flex align-items-center gap-3">
                <span
                  className="badge d-flex align-items-center gap-2 px-3 py-2"
                  style={{
                    background: "#eef2ff",
                    color: "#4f46e5",
                    fontSize: "12.5px",
                    fontWeight: "600",
                    borderRadius: "30px",
                    border: "none"
                  }}
                >
                  <i className="bi bi-calendar3" />
                  {new Date().toLocaleDateString("id-ID", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </span>
              </div>
            </div>
          )}

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
              <h6 className="mb-0 fw-bold" style={{ color: "#312e81" }}>{current.title}</h6>
              <div style={{ width: 24 }} />
            </div>
          )}

          <div className={isMobile ? "p-3" : "p-4"}>
            {loading ? (
              <div className="text-center py-5" style={{ marginTop: "10%" }}>
                <div className="spinner-border text-primary" role="status" style={{ color: "#4f46e5" }}>
                  <span className="visually-hidden">Loading...</span>
                </div>
              </div>
            ) : (
              current.component
            )}
          </div>
        </div>

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
              onClick={() => setActivePage("diagnose")}
              className="btn border-0 d-flex flex-column align-items-center justify-content-center p-0"
              style={{ color: activePage === "diagnose" ? "#4f46e5" : "#64748b", flex: 1 }}
            >
              <i className={`bi ${activePage === "diagnose" ? "bi-heart-pulse-fill" : "bi-heart-pulse"}`} style={{ fontSize: 18 }} />
              <span style={{ fontSize: 9, fontWeight: activePage === "diagnose" ? "600" : "500", marginTop: 2 }}>Diagnosis</span>
            </button>
            <button
              onClick={() => setActivePage("profile")}
              className="btn border-0 d-flex flex-column align-items-center justify-content-center p-0"
              style={{ color: activePage === "profile" ? "#4f46e5" : "#64748b", flex: 1 }}
            >
              <i className="bi bi-person-circle" style={{ fontSize: 18 }} />
              <span style={{ fontSize: 9, fontWeight: activePage === "profile" ? "600" : "500", marginTop: 2 }}>{userName ? userName.slice(0, 10) : "Dokter"}</span>
            </button>
          </div>
        )}
      </div>
    </>
  );
}
