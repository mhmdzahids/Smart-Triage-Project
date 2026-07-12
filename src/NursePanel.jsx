import { useState, useEffect } from "react";
import { fetchActiveVisits, updateTriageDetails } from "./supabaseHelpers";


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
function SidebarNurse({ activePage, setActivePage, userName }) {
  const navItems = [
    { id: "dashboard", icon: "bi-activity", label: "Dashboard Nurse" },
    { id: "triage", icon: "bi-clipboard2-pulse-fill", label: "Triage & Fisik" },
  ];

  return (
    <div
      className="d-flex flex-column"
      style={{
        width: 250,
        minHeight: "100vh",
        background: "linear-gradient(160deg, #0d9488 0%, #0b665c 100%)", // Teal Medical theme
        color: "#fff",
        position: "fixed",
        top: 0,
        left: 0,
        zIndex: 100,
        boxShadow: "2px 0 12px rgba(0,0,0,0.15)",
      }}
    >
      {/* Brand */}
      <div
        className="d-flex align-items-center gap-2 px-4 py-4"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.12)" }}
      >
        <div
          style={{
            background: "#fff",
            borderRadius: 10,
            width: 36,
            height: 36,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 2px 5px rgba(0,0,0,0.1)"
          }}
        >
          <i className="bi bi-lungs-fill text-teal" style={{ fontSize: 18, color: "#0d9488" }} />
        </div>
        <div>
          <div style={{ fontWeight: 700, fontSize: 15, letterSpacing: 0.5 }}>
            Smart-Triage
          </div>
          <div style={{ fontSize: 11, opacity: 0.85 }}>Nurse Workstation</div>
        </div>
      </div>

      {/* Nav */}
      <nav className="mt-3 flex-grow-1">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActivePage(item.id)}
            className="d-flex align-items-center gap-3 w-100 border-0 text-start px-4 py-3"
            style={{
              background:
                activePage === item.id
                  ? "rgba(255,255,255,0.15)"
                  : "transparent",
              color: "#fff",
              fontWeight: activePage === item.id ? 600 : 400,
              fontSize: 14,
              borderLeft:
                activePage === item.id
                  ? "4px solid #ccfbf1" // Light teal accent line
                  : "4px solid transparent",
              cursor: "pointer",
              transition: "all 0.2s",
            }}
          >
            <i className={`bi ${item.icon}`} style={{ fontSize: 16 }} />
            {item.label}
          </button>
        ))}
      </nav>

      {/* User Info */}
      <div
        className="px-4 py-3"
        style={{ borderTop: "1px solid rgba(255,255,255,0.12)", fontSize: 12 }}
      >
        <div className="d-flex align-items-center gap-2">
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: "50%",
              background: "rgba(255,255,255,0.2)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <i className="bi bi-person-badge-fill" />
          </div>
          <div>
            <div style={{ fontWeight: 600 }}>Halo! Ns. {userName || "User"}</div>
            <div style={{ opacity: 0.75 }}>Perawat Triase</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Dashboard Subpage ───────────────────────────────────────────────────────
function NurseDashboard({ patients, setActivePage, setSelectedId, isMobile, userName }) {
  const triagedCount = patients.filter(p => p.meowsScore !== undefined).length;
  const highRiskCount = patients.filter(p => p.triageRisk === "High").length;
  const medRiskCount = patients.filter(p => p.triageRisk === "Medium").length;
  const lowRiskCount = patients.filter(p => p.triageRisk === "Low").length;

  const stats = [
    { label: "Pasien Ditriase", value: triagedCount, icon: "bi-clipboard2-check", color: "#0d9488", bg: "#f0fdfa" },
    { label: "Resiko Tinggi (MEOWS >= 7)", value: highRiskCount, icon: "bi-exclamation-octagon-fill", color: "#dc3545", bg: "#fdf2f2" },
    { label: "Resiko Sedang (MEOWS 5-6)", value: medRiskCount, icon: "bi-exclamation-triangle-fill", color: "#ffc107", bg: "#fffbeb" },
    { label: "Resiko Rendah (MEOWS 0-4)", value: lowRiskCount, icon: "bi-check-circle-fill", color: "#198754", bg: "#f0fdf4" }
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
                  <div className="fw-bold" style={{ fontSize: 24, color: "#1e293b", lineHeight: 1.1 }}>{s.value}</div>
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

  // Original desktop layout (kept original)
  const statsDesktop = [
    { label: "Pasien Ditriase", value: triagedCount, icon: "bi-clipboard2-check", color: "#0d9488", bg: "#f0fdfa" },
    { label: "Resiko Tinggi (MEOWS >= 7)", value: highRiskCount, icon: "bi-exclamation-octagon-fill", color: "#dc3545", bg: "#fdf2f2" },
    { label: "Resiko Sedang (MEOWS 5-6)", value: medRiskCount, icon: "bi-exclamation-triangle-fill", color: "#ffc107", bg: "#fffbeb" },
    { label: "Resiko Rendah (MEOWS 0-4)", value: lowRiskCount, icon: "bi-check-circle-fill", color: "#198754", bg: "#f0fdf4" }
  ];

  return (
    <div>
      {/* Stats row */}
      <div className="row g-3 mb-4">
        {statsDesktop.map((s) => (
          <div key={s.label} className="col-6 col-xl-3">
            <div
              className="rounded-3 p-3 h-100 shadow-sm"
              style={{ background: "#fff", border: "1px solid #e2e8f0" }}
            >
              <div className="d-flex align-items-center gap-3">
                <div
                  style={{
                    width: 46,
                    height: 46,
                    borderRadius: 12,
                    background: s.bg,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <i className={`bi ${s.icon}`} style={{ fontSize: 20, color: s.color }} />
                </div>
                <div>
                  <div style={{ fontSize: 24, fontWeight: 700, color: "#0f766e" }}>
                    {s.value}
                  </div>
                  <div style={{ fontSize: 12, color: "#64748b" }}>{s.label}</div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Patient Triage Summary */}
      <div
        className="rounded-3 p-4 shadow-sm"
        style={{ background: "#fff", border: "1px solid #e2e8f0" }}
      >
        <div className="d-flex align-items-center justify-content-between mb-3">
          <h6 className="fw-semibold mb-0" style={{ color: "#0f766e", fontSize: 16 }}>
            <i className="bi bi-clock-history me-2" />
            Triage Pasien Terbaru
          </h6>
          <button
            className="btn btn-sm btn-teal"
            style={{
              background: "#ccfbf1",
              color: "#0f766e",
              border: "none",
              fontWeight: 500,
              fontSize: 13,
            }}
            onClick={() => setActivePage("triage")}
          >
            Mulai Triase Baru <i className="bi bi-arrow-right ms-1" />
          </button>
        </div>

        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0" style={{ fontSize: 13 }}>
            <thead style={{ background: "#f8fafc" }}>
              <tr>
                <th className="fw-semibold text-muted border-0 py-2">Nama Pasien</th>
                <th className="fw-semibold text-muted border-0 py-2">Umur</th>
                <th className="fw-semibold text-muted border-0 py-2">Tinggi / Berat</th>
                <th className="fw-semibold text-muted border-0 py-2">Suhu</th>
                <th className="fw-semibold text-muted border-0 py-2">SpO2 / Tensi</th>
                <th className="fw-semibold text-muted border-0 py-2 text-center">MEOWS Score</th>
                <th className="fw-semibold text-muted border-0 py-2 text-center">Triage Risk</th>
                <th className="fw-semibold text-muted border-0 py-2">Diagnosis Dokter</th>
                <th className="fw-semibold text-muted border-0 py-2 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {patients.map((p) => {
                const bmi = calcBMI(p.beratBadan, p.tinggiBadan);
                return (
                  <tr key={p.id} style={{ borderTop: "1px solid #f1f5f9" }}>
                    <td className="py-3 fw-semibold text-dark">{p.nama}</td>
                    <td className="py-3 text-muted">{p.umur} tahun</td>
                    <td className="py-3 text-muted">
                      {p.tinggiBadan ? `${p.tinggiBadan} cm` : "-"} / {p.beratBadan ? `${p.beratBadan} kg` : "-"}
                      {bmi && <span className="badge ms-1 bg-light text-muted" style={{ fontSize: 10 }}>BMI {bmi}</span>}
                    </td>
                    <td className="py-3">
                      {p.suhu ? `${p.suhu} °C` : <span className="text-muted">-</span>}
                    </td>
                    <td className="py-3">
                      {p.spo2 ? (
                        <div>
                          <div>SpO2: {p.spo2}%</div>
                          <div className="text-muted" style={{ fontSize: 11 }}>
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
                            fontSize: 13,
                            fontWeight: 600,
                            padding: "4px 8px"
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
                          className={`badge ${p.triageRisk === "High"
                            ? "bg-danger text-white"
                            : p.triageRisk === "Medium"
                              ? "bg-warning text-dark"
                              : "bg-success text-white"
                            }`}
                          style={{ fontSize: 11, padding: "5px 10px" }}
                        >
                          {p.triageRisk === "High" ? "Resiko Tinggi (Red)" : p.triageRisk === "Medium" ? "Resiko Sedang (Yellow)" : "Resiko Rendah (Green)"}
                        </span>
                      ) : (
                        <span className="badge bg-secondary text-white">Belum Triase</span>
                      )}
                    </td>
                    <td className="py-3">
                      {p.statusDiagnosis === "Sudah Diperiksa" ? (
                        <span className="badge bg-success-subtle text-success border border-success-subtle fw-semibold text-wrap d-inline-block p-2" style={{ fontSize: 11, maxWidth: 180 }}>
                          {p.diagnosa || "Sudah Didiagnosa"}
                        </span>
                      ) : (
                        <span className="badge bg-warning-subtle text-warning-emphasis border border-warning-subtle fw-medium d-inline-block p-2" style={{ fontSize: 11 }}>
                          Belum Didiagnosa
                        </span>
                      )}
                    </td>
                    <td className="py-3 text-center">
                      <button
                        className="btn btn-sm btn-outline-teal d-inline-flex align-items-center gap-1"
                        style={{ borderColor: "#0d9488", color: "#0d9488", fontSize: 12 }}
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
function TriageWorkspace({ patients, setPatients, selectedId, setSelectedId }) {
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
          className="rounded-3 shadow-sm p-3"
          style={{ background: "#fff", border: "1px solid #e2e8f0", minHeight: "60vh" }}
        >
          <h6 className="fw-semibold mb-3 px-1" style={{ color: "#0f766e", fontSize: 14 }}>
            <i className="bi bi-people-fill me-2" />
            Daftar Pasien
          </h6>
          <div className="d-flex flex-column gap-2" style={{ maxHeight: "65vh", overflowY: "auto" }}>
            {patients.map((p) => {
              const isActive = p.id === activePatient?.id;
              const hasTriage = p.meowsScore !== undefined;
              return (
                <button
                  key={p.id}
                  onClick={() => handleSelectPatient(p)}
                  className="btn text-start p-2 rounded-3 border-0 transition-all"
                  style={{
                    background: isActive ? "#ccfbf1" : "#f8fafc",
                    color: isActive ? "#0f766e" : "#334155",
                    cursor: "pointer",
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
                    <span>{p.umur} thn • {p.jenisKelamin}</span>
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
            className="rounded-3 shadow-sm p-4"
            style={{ background: "#fff", border: "1px solid #e2e8f0" }}
          >
            {saveSuccess && (
              <div className="alert alert-success d-flex align-items-center gap-2 mb-3" style={{ fontSize: 13, borderRadius: 8 }}>
                <i className="bi bi-check-circle-fill" />
                Catatan Triage & Fisik untuk <strong>{activePatient.nama}</strong> berhasil disimpan!
              </div>
            )}

            {/* Header / Demographics Card */}
            <div className="p-3 mb-4 rounded-3 d-flex flex-wrap align-items-center justify-content-between gap-3" style={{ background: "#f0fdfa", border: "1.5px dashed #99f6e4" }}>
              <div>
                <h5 className="fw-bold mb-1" style={{ color: "#0f766e" }}>{activePatient.nama}</h5>
                <p className="text-muted mb-0" style={{ fontSize: 12 }}>
                  NIK: <span className="font-monospace">{activePatient.nik}</span> | No BPJS: <span className="font-monospace">{activePatient.noBpjs || "-"}</span> | Kontak: {activePatient.noHp}
                </p>
              </div>
              <button
                className="btn btn-sm btn-teal d-flex align-items-center gap-2"
                style={{ background: "#0d9488", color: "#fff" }}
                onClick={() => downloadTriageCSV(activePatient)}
              >
                <i className="bi bi-download" />
                Export CSV
              </button>
            </div>

            {/* Hasil Diagnosis Dokter */}
            <div className="mb-4 p-3 rounded-3" style={{ background: activePatient.statusDiagnosis === "Sudah Diperiksa" ? "#f0fdf4" : "#fffbeb", border: `1.5px solid ${activePatient.statusDiagnosis === "Sudah Diperiksa" ? "#bbf7d0" : "#fef3c7"}` }}>
              <div className="d-flex align-items-center gap-2 mb-2">
                <i className={`bi ${activePatient.statusDiagnosis === "Sudah Diperiksa" ? "bi-check-circle-fill text-success" : "bi-hourglass-split text-warning"}`} style={{ fontSize: 16 }} />
                <span className="fw-bold text-dark" style={{ fontSize: 13 }}>Status Diagnosa Dokter</span>
              </div>
              <div className="p-2 bg-white rounded border shadow-sm" style={{ fontSize: 13, minHeight: 40 }}>
                {activePatient.statusDiagnosis === "Sudah Diperiksa" ? (
                  <div>
                    <div className="fw-semibold text-success mb-1">Diagnosis Utama / ICD-10:</div>
                    <div className="text-dark fw-bold">{activePatient.diagnosa || "-"}</div>
                  </div>
                ) : (
                  <span className="text-muted italic"><i className="bi bi-info-circle me-1" />Pasien belum didiagnosa oleh dokter jaga.</span>
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
                    <span className="fw-bold" style={{ fontSize: 14 }}>Keluhan Utama / Deskripsi Keluhan</span>
                  </div>
                  <textarea
                    className="form-control"
                    rows={2}
                    placeholder="Tuliskan keluhan utama pasien secara detail (contoh: nyeri dada menjalar ke lengan kiri, sesak napas, pusing berputar, dll.)"
                    value={keluhan}
                    onChange={(e) => setKeluhan(e.target.value)}
                    style={{ fontSize: 13, resize: "none" }}
                  />
                </div>

                {/* 1. Antropometri Data */}
                <div className="mb-4">
                  <div className="d-flex align-items-center gap-2 mb-3" style={{ color: "#0f766e" }}>
                    <div style={{ width: 4, height: 16, background: "#0d9488", borderRadius: 2 }} />
                    <span className="fw-bold" style={{ fontSize: 14 }}>1. Data Fisik & Antropometri</span>
                  </div>

                  <div className="row g-3">
                    <div className="col-6 col-sm-4">
                      <label className="form-label text-muted fw-medium mb-1" style={{ fontSize: 12 }}>Berat Badan (kg)</label>
                      <input
                        type="number"
                        className="form-control"
                        placeholder="Contoh: 60"
                        value={beratBadan}
                        onChange={(e) => setBeratBadan(e.target.value)}
                        style={{ fontSize: 13 }}
                      />
                    </div>
                    <div className="col-6 col-sm-4">
                      <label className="form-label text-muted fw-medium mb-1" style={{ fontSize: 12 }}>Tinggi Badan (cm)</label>
                      <input
                        type="number"
                        className="form-control"
                        placeholder="Contoh: 165"
                        value={tinggiBadan}
                        onChange={(e) => setTinggiBadan(e.target.value)}
                        style={{ fontSize: 13 }}
                      />
                    </div>
                    <div className="col-12 col-sm-4">
                      <label className="form-label text-muted fw-medium mb-1" style={{ fontSize: 12 }}>BMI / IMT (Kategori)</label>
                      <div className="d-flex align-items-center gap-2">
                        <span className={`badge py-2 px-3 fw-bold rounded-2 ${getBMIBadgeColor(currentBmi)}`} style={{ fontSize: 12 }}>
                          {currentBmi ? `${currentBmi} (${currentBmiCat})` : "Belum dihitung"}
                        </span>
                      </div>
                    </div>

                    <div className="col-6 col-sm-4">
                      <label className="form-label text-muted fw-medium mb-1" style={{ fontSize: 12 }}>Lingkar Kepala (cm)</label>
                      <input
                        type="number"
                        className="form-control"
                        placeholder="Biasanya untuk bayi"
                        value={lingkarKepala}
                        onChange={(e) => setLingkarKepala(e.target.value)}
                        style={{ fontSize: 13 }}
                      />
                    </div>
                    <div className="col-6 col-sm-4">
                      <label className="form-label text-muted fw-medium mb-1" style={{ fontSize: 12 }}>Lingkar Lengan Atas (cm)</label>
                      <input
                        type="number"
                        className="form-control"
                        placeholder="LiLA"
                        value={lingkarLengan}
                        onChange={(e) => setLingkarLengan(e.target.value)}
                        style={{ fontSize: 13 }}
                      />
                    </div>
                    <div className="col-12 col-sm-4">
                      <label className="form-label text-muted fw-medium mb-1" style={{ fontSize: 12 }}>Golongan Darah</label>
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
                    <span className="fw-bold" style={{ fontSize: 14 }}>2. Parameter Vital & Triage</span>
                  </div>

                  <div className="row g-3">
                    <div className="col-6 col-md-4">
                      <label className="form-label text-muted fw-medium mb-1" style={{ fontSize: 12 }}>Respiratory Rate (x/mnt)</label>
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
                      <label className="form-label text-muted fw-medium mb-1" style={{ fontSize: 12 }}>Oxygen Saturation (SpO2 %)</label>
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
                      <label className="form-label text-muted fw-medium mb-1" style={{ fontSize: 12 }}>Terapi Oksigen Tambahan</label>
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
                              fontWeight: suplemenO2 === val ? 600 : 400
                            }}
                          >
                            {val === "Tidak" ? "Udara Ruangan" : "Suplemen O2"}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="col-6 col-sm-4">
                      <label className="form-label text-muted fw-medium mb-1" style={{ fontSize: 12 }}>Suhu Tubuh (°C)</label>
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
                      <label className="form-label text-muted fw-medium mb-1" style={{ fontSize: 12 }}>Tekanan Darah (Sistolik)</label>
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
                      <label className="form-label text-muted fw-medium mb-1" style={{ fontSize: 12 }}>Tekanan Darah (Diastolik)</label>
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
                      <label className="form-label text-muted fw-medium mb-1" style={{ fontSize: 12 }}>Heart Rate / Nadi (x/mnt)</label>
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
                      <label className="form-label text-muted fw-medium mb-1" style={{ fontSize: 12 }}>Tingkat Kesadaran (AVPU)</label>
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
                  className="rounded-3 p-4 h-100 d-flex flex-column justify-content-between shadow-sm"
                  style={{
                    background: "#fafbfc",
                    border: "1.5px solid #e2e8f0",
                    position: "sticky",
                    top: 80
                  }}
                >
                  <div className="text-center mb-4">
                    <h6 className="fw-bold text-muted mb-3" style={{ fontSize: 13 }}>
                      KALKULATOR MEOWS (TRIAGE)
                    </h6>
                    <div
                      className="d-inline-flex align-items-center justify-content-center rounded-circle"
                      style={{
                        width: 90,
                        height: 90,
                        background: getRiskColor(currentMeows.risk) + "12",
                        border: `4px solid ${getRiskColor(currentMeows.risk)}`,
                        color: getRiskColor(currentMeows.risk),
                        fontWeight: 800,
                        fontSize: 32,
                        marginBottom: 12
                      }}
                    >
                      {currentMeows.score}
                    </div>
                    <h5 className="fw-bold mt-1" style={{ color: getRiskColor(currentMeows.risk) }}>
                      {currentMeows.risk === "High" ? "Resiko Tinggi (Red)" : currentMeows.risk === "Medium" ? "Resiko Sedang (Yellow)" : "Resiko Rendah (Green)"}
                    </h5>
                  </div>

                  {/* Clinical Response Guidance */}
                  <div className="p-3 rounded-3 mb-4 bg-white" style={{ border: "1px solid #e2e8f0", fontSize: 12 }}>
                    <div className="fw-bold mb-1 text-dark">Pedoman Respon Klinis:</div>
                    {currentMeows.risk === "High" ? (
                      <ul className="ps-3 mb-0 text-danger fw-semibold">
                        <li>Lakukan resusitasi & monitoring terus-menerus.</li>
                        <li>Laporkan ke dokter penanggung jawab segera (&lt; 5 mnt).</li>
                        <li>Aktifkan tim medis darurat (Code Blue jika perlu).</li>
                      </ul>
                    ) : currentMeows.risk === "Medium" ? (
                      <ul className="ps-3 mb-0 text-warning-emphasis">
                        <li>Konsultasikan ke tim medis / dokter jaga segera.</li>
                        <li>Monitor tanda vital setiap 1 jam.</li>
                        <li>Siapkan sarana emergency untuk kemungkinan deteriorasi.</li>
                      </ul>
                    ) : (
                      <ul className="ps-3 mb-0 text-success">
                        <li>Monitor berkala setiap 4-6 jam sekali.</li>
                        <li>Lanjutkan asuhan keperawatan standar ruangan.</li>
                        <li>Catat perkembangan pada medical record.</li>
                      </ul>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="d-flex flex-column gap-2 mt-auto">
                    <button
                      className="btn btn-teal w-100 py-2 d-flex align-items-center justify-content-center gap-2 text-white"
                      style={{ background: "#0d9488", fontWeight: 600, border: "none" }}
                      onClick={handleSave}
                    >
                      <i className="bi bi-floppy-fill" />
                      Simpan Catatan Triage
                    </button>
                    <button
                      className="btn btn-outline-secondary w-100 py-2"
                      style={{ fontSize: 12 }}
                      onClick={() => handleSelectPatient(activePatient)}
                    >
                      Reset Form
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-5 text-muted" style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 8 }}>
            <i className="bi bi-person-exclamation d-block mb-2" style={{ fontSize: 36 }} />
            Pilih pasien di samping untuk memulai triase
          </div>
        )}
      </div>
    </div>
  );
}

export default function NursePanel({ onLogout, userName }) {
  const [activePage, setActivePage] = useState("dashboard");
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

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
      title: "Dashboard Pemantauan & Triage Perawat",
      component: <NurseDashboard patients={patients} setActivePage={setActivePage} setSelectedId={handleSelectFromDashboard} isMobile={isMobile} userName={userName} />
    },
    triage: {
      title: "Workspace Triase & Pemeriksaan Fisik",
      component: (
        <TriageWorkspace
          patients={patients}
          setPatients={setPatients}
          selectedId={selectedId}
          setSelectedId={setSelectedId}
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

      <div style={{ background: "#f4f7f6", minHeight: "100vh" }}>
        {!isMobile && (
          <SidebarNurse activePage={activePage} setActivePage={setActivePage} userName={userName} />
        )}

        {/* Main Content Area */}
        <div style={{ 
          marginLeft: isMobile ? 0 : 250,
          paddingBottom: isMobile ? 80 : 0
        }}>
          {/* Desktop Topbar */}
          {!isMobile && (
            <div
              className="d-flex align-items-center justify-content-between px-4"
              style={{
                height: 60,
                background: "#fff",
                borderBottom: "1px solid #e2e8f0",
                position: "sticky",
                top: 0,
                zIndex: 50,
                boxShadow: "0 1px 6px rgba(0,0,0,0.04)",
              }}
            >
              <h5 className="mb-0 fw-semibold text-dark" style={{ color: "#0f766e" }}>
                {current.title}
              </h5>
              <div className="d-flex align-items-center gap-3">
                <span
                  className="badge"
                  style={{ background: "#e6f4ea", color: "#137333", fontSize: 12 }}
                >
                  <i className="bi bi-calendar3 me-1" />
                  {new Date().toLocaleDateString("id-ID", {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </span>
                {onLogout && (
                  <button
                    onClick={onLogout}
                    className="btn btn-outline-danger btn-sm d-flex align-items-center gap-1 px-3 py-1.5"
                    style={{ borderRadius: "20px", fontSize: "12px", fontWeight: "600" }}
                  >
                    <i className="bi bi-box-arrow-right" />
                    Keluar
                  </button>
                )}
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
              onClick={() => setShowLogoutModal(true)} 
              className="btn border-0 d-flex flex-column align-items-center justify-content-center p-0"
              style={{ color: "#64748b", flex: 1 }}
            >
              <i className="bi bi-person-circle" style={{ fontSize: 18 }} />
              <span style={{ fontSize: 9, fontWeight: "500", marginTop: 2 }}>{userName ? userName.slice(0, 10) : "Perawat"}</span>
            </button>
          </div>
        )}

        {/* Premium Logout Confirmation Modal */}
        {showLogoutModal && (
          <>
            <div 
              className="modal-backdrop show" 
              style={{ zIndex: 1040 }} 
              onClick={() => setShowLogoutModal(false)}
            />
            <div 
              className="modal show d-block" 
              tabIndex="-1" 
              style={{ zIndex: 1050, top: "25%" }}
            >
              <div className="modal-dialog modal-dialog-centered px-3" style={{ maxWidth: 340 }}>
                <div className="modal-content border-0 shadow-lg rounded-4 p-3 bg-white">
                  <div className="text-center p-3">
                    <div 
                      className="d-inline-flex justify-content-center align-items-center mb-3"
                      style={{
                        width: "55px",
                        height: "55px",
                        borderRadius: "50%",
                        background: "#fee2e2",
                        color: "#dc3545"
                      }}
                    >
                      <i className="bi bi-box-arrow-right" style={{ fontSize: 24 }} />
                    </div>
                    <h5 className="fw-bold mb-2" style={{ color: "#1e293b" }}>Keluar dari Portal?</h5>
                    <p className="text-muted px-2" style={{ fontSize: 12.5 }}>
                      Apakah Anda yakin ingin keluar dari aplikasi Smart Triage? Sesi Anda akan berakhir.
                    </p>
                  </div>
                  <div className="d-flex gap-2">
                    <button 
                      type="button" 
                      className="btn btn-light rounded-pill flex-1 w-50" 
                      onClick={() => setShowLogoutModal(false)}
                      style={{ fontSize: 13, fontWeight: "600", padding: "10px 0" }}
                    >
                      Batal
                    </button>
                    <button 
                      type="button" 
                      className="btn btn-danger rounded-pill flex-1 w-50" 
                      onClick={() => {
                        setShowLogoutModal(false);
                        onLogout();
                      }}
                      style={{ fontSize: 13, fontWeight: "600", padding: "10px 0" }}
                    >
                      Keluar
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}
