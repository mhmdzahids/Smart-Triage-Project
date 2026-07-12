import { useState, useEffect } from "react";
import { fetchActiveVisits, saveDoctorDiagnosis, updateTriageDetails } from "./supabaseHelpers";


// Helper: Calculate BMI
function calcBMI(weight, height) {
  if (!weight || !height) return "";
  const hMeters = height / 100;
  const bmiVal = weight / (hMeters * hMeters);
  return Math.round(bmiVal * 10) / 10;
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
function SidebarDoctor({ activePage, setActivePage }) {
  const navItems = [
    { id: "dashboard", icon: "bi-shield-shaded", label: "Dashboard Dokter" },
    { id: "diagnose", icon: "bi-heart-pulse-fill", label: "Pasien & Diagnosis" },
  ];

  return (
    <div
      className="d-flex flex-column"
      style={{
        width: 250,
        minHeight: "100vh",
        background: "linear-gradient(160deg, #312e81 0%, #1e1b4b 100%)", // Deep Indigo/Navy Doctor Vibes
        color: "#fff",
        position: "fixed",
        top: 0,
        left: 0,
        zIndex: 100,
        boxShadow: "2px 0 12px rgba(0,0,0,0.2)",
      }}
    >
      {/* Brand */}
      <div
        className="d-flex align-items-center gap-2 px-4 py-4"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.1)" }}
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
            boxShadow: "0 2px 6px rgba(0,0,0,0.15)"
          }}
        >
          <i className="bi bi-shield-shaded text-indigo" style={{ fontSize: 18, color: "#4f46e5" }} />
        </div>
        <div>
          <div style={{ fontWeight: 700, fontSize: 15, letterSpacing: 0.5 }}>
            Smart-Triage
          </div>
          <div style={{ fontSize: 11, opacity: 0.8 }}>Doctor Clinical Portal</div>
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
                  ? "4px solid #818cf8" // Indigo accent line
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
        style={{ borderTop: "1px solid rgba(255,255,255,0.1)", fontSize: 12 }}
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
            <i className="bi bi-person-fill" />
          </div>
          <div>
            <div style={{ fontWeight: 600 }}>dr. Adrian, Sp.PD</div>
            <div style={{ opacity: 0.7 }}>Dokter Jaga IGD</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Doctor Dashboard Subpage ────────────────────────────────────────────────
function DoctorDashboard({ patients, setActivePage, setSelectedId }) {
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

  return (
    <div>
      {/* Stats cards */}
      <div className="row g-3 mb-4">
        {stats.map((s) => (
          <div key={s.label} className="col-6 col-xl-3">
            <div
              className="rounded-3 p-3 h-100 shadow-sm bg-white"
              style={{ border: "1px solid #e2e8f0" }}
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
                  <div style={{ fontSize: 24, fontWeight: 700, color: "#1e1b4b" }}>
                    {s.value}
                  </div>
                  <div style={{ fontSize: 12, color: "#64748b" }}>{s.label}</div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Priority Patient Queue */}
      <div
        className="rounded-3 p-4 shadow-sm bg-white"
        style={{ border: "1px solid #e2e8f0" }}
      >
        <div className="d-flex align-items-center justify-content-between mb-3">
          <h6 className="fw-semibold mb-0" style={{ color: "#312e81", fontSize: 16 }}>
            <i className="bi bi-list-stars me-2" />
            Antrean Pemeriksaan IGD (Prioritas MEOWS)
          </h6>
          <span className="badge bg-light text-muted border py-2 px-3" style={{ fontSize: 11 }}>
            Diurutkan Otomatis Berdasarkan Tingkat Keparahan MEOWS
          </span>
        </div>

        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0" style={{ fontSize: 13 }}>
            <thead style={{ background: "#f8fafc" }}>
              <tr>
                <th className="fw-semibold text-muted border-0 py-2">Nama Pasien</th>
                <th className="fw-semibold text-muted border-0 py-2">Waktu Triase</th>
                <th className="fw-semibold text-muted border-0 py-2">Keluhan Utama</th>
                <th className="fw-semibold text-muted border-0 py-2 text-center">MEOWS Score</th>
                <th className="fw-semibold text-muted border-0 py-2 text-center">Tingkat Resiko</th>
                <th className="fw-semibold text-muted border-0 py-2 text-center">Status Dokter</th>
                <th className="fw-semibold text-muted border-0 py-2 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {sortedPatients.map((p) => (
                <tr key={p.id} style={{ borderTop: "1px solid #f1f5f9" }}>
                  <td className="py-3">
                    <div className="fw-bold text-dark">{p.nama}</div>
                    <div className="text-muted" style={{ fontSize: 11 }}>{p.umur} tahun • {p.jenisKelamin}</div>
                  </td>
                  <td className="py-3 text-muted">{p.tglTriage || "Belum Triase"}</td>
                  <td className="py-3 text-truncate" style={{ maxWidth: 220 }}>
                    {p.keluhan || <span className="text-muted italic">Tidak ada keluhan</span>}
                  </td>
                  <td className="py-3 text-center">
                    <span
                      className="badge font-monospace"
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
                  </td>
                  <td className="py-3 text-center">
                    <span
                      className={`badge ${p.triageRisk === "High"
                        ? "bg-danger"
                        : p.triageRisk === "Medium"
                          ? "bg-warning text-dark"
                          : "bg-success"
                        }`}
                      style={{ fontSize: 11 }}
                    >
                      {p.triageRisk === "High" ? "Tinggi (Red)" : p.triageRisk === "Medium" ? "Sedang (Yellow)" : "Rendah (Green)"}
                    </span>
                  </td>
                  <td className="py-3 text-center">
                    <span
                      className={`badge ${p.statusDiagnosis === "Sudah Diperiksa"
                        ? "bg-success-subtle text-success border border-success-subtle"
                        : "bg-warning-subtle text-warning-emphasis border border-warning-subtle"
                        }`}
                      style={{ fontSize: 11, padding: "4px 8px" }}
                    >
                      {p.statusDiagnosis}
                    </span>
                  </td>
                  <td className="py-3 text-center">
                    <button
                      className="btn btn-sm btn-indigo"
                      style={{ background: "#4f46e5", color: "#fff", border: "none", fontSize: 12 }}
                      onClick={() => {
                        setSelectedId(p.id);
                        setActivePage("diagnose");
                      }}
                    >
                      <i className="bi bi-journal-medical me-1" />
                      Periksa & Diagnosa
                    </button>
                  </td>
                </tr>
              ))}
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
          className="rounded-3 shadow-sm p-3 bg-white"
          style={{ border: "1px solid #e2e8f0", minHeight: "60vh" }}
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
                    className="btn text-start p-2 rounded-3 border-0 transition-all"
                    style={{
                      background: isActive ? "#e0e7ff" : "#f8fafc",
                      color: isActive ? "#312e81" : "#334155",
                      cursor: "pointer",
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
            className="rounded-3 shadow-sm p-4 bg-white"
            style={{ border: "1px solid #e2e8f0" }}
          >
            {saveSuccess && (
              <div className="alert alert-success d-flex align-items-center gap-2 mb-3" style={{ fontSize: 13, borderRadius: 8 }}>
                <i className="bi bi-check-circle-fill" />
                Diagnosis dan tanda vital untuk <strong>{activePatient.nama}</strong> berhasil disimpan!
              </div>
            )}

            {/* Demographics Summary */}
            <div className="p-3 mb-4 rounded-3 d-flex flex-wrap align-items-center justify-content-between gap-3" style={{ background: "#f5f3ff", border: "1.5px dashed #c084fc" }}>
              <div>
                <h5 className="fw-bold mb-1" style={{ color: "#312e81" }}>{activePatient.nama}</h5>
                <p className="text-muted mb-0" style={{ fontSize: 12 }}>
                  NIK: <span className="font-monospace">{activePatient.nik}</span> | No BPJS: <span className="font-monospace">{activePatient.noBpjs || "-"}</span> | Kontak: {activePatient.noHp}
                </p>
              </div>
              <button
                className="btn btn-sm btn-indigo d-flex align-items-center gap-2 text-white"
                style={{ background: "#4f46e5", border: "none" }}
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
                  className="rounded-3 p-3 text-center h-100 d-flex flex-column justify-content-center align-items-center"
                  style={{
                    background: currentMeows.risk === "High" ? "#fef2f2" : currentMeows.risk === "Medium" ? "#fffbeb" : "#f0fdf4",
                    border: `1.5px solid ${currentMeows.risk === "High" ? "#fee2e2" : currentMeows.risk === "Medium" ? "#fef3c7" : "#dcfce7"}`
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
                <div className="rounded-3 p-3 h-100 bg-light border">
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
                <div className="mb-4 bg-light p-3 rounded-3 border">
                  <div className="fw-bold text-dark mb-1" style={{ fontSize: 13 }}>
                    <i className="bi bi-chat-left-text-fill text-indigo me-2" style={{ color: "#4f46e5" }} />
                    Keluhan Utama / Alasan Masuk IGD
                  </div>
                  <div className="text-muted p-2 bg-white rounded border" style={{ fontSize: 13, minHeight: 45 }}>
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
                          className="btn btn-sm btn-success py-1 px-2 d-flex align-items-center gap-1"
                          style={{ fontSize: 12, background: "#10b981", border: "none", color: "#fff" }}
                          onClick={handleSaveAnthro}
                        >
                          <i className="bi bi-check-lg" /> Simpan
                        </button>
                        <button
                          className="btn btn-sm btn-outline-secondary py-1 px-2 d-flex align-items-center gap-1"
                          style={{ fontSize: 12 }}
                          onClick={handleCancelAnthro}
                        >
                          <i className="bi bi-x-lg" /> Batal
                        </button>
                      </div>
                    ) : (
                      <button
                        className="btn btn-sm btn-outline-primary py-1 px-2 d-flex align-items-center gap-1"
                        style={{ fontSize: 12, borderColor: "#4f46e5", color: "#4f46e5" }}
                        onClick={() => setIsEditingAnthro(true)}
                      >
                        <i className="bi bi-pencil-square" /> Edit Parameter
                      </button>
                    )}
                  </div>

                  <div className="row g-3">
                    {/* Berat Badan */}
                    <div className="col-4 col-sm-3">
                      <div className={`border rounded p-2 text-center ${isEditingAnthro ? "bg-white shadow-sm" : "bg-light"}`}>
                        <label className="text-muted d-block mb-1" style={{ fontSize: 10 }}>Berat Badan (kg)</label>
                        {isEditingAnthro ? (
                          <input
                            type="number"
                            className="form-control form-control-sm text-center fw-bold"
                            style={{ fontSize: 12, padding: "2px 5px", height: 26 }}
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
                      <div className={`border rounded p-2 text-center ${isEditingAnthro ? "bg-white shadow-sm" : "bg-light"}`}>
                        <label className="text-muted d-block mb-1" style={{ fontSize: 10 }}>Tinggi Badan (cm)</label>
                        {isEditingAnthro ? (
                          <input
                            type="number"
                            className="form-control form-control-sm text-center fw-bold"
                            style={{ fontSize: 12, padding: "2px 5px", height: 26 }}
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
                      <div className="border rounded p-2 text-center bg-light">
                        <label className="text-muted d-block mb-1" style={{ fontSize: 10 }}>BMI / IMT</label>
                        <div className={`fw-bold badge ${getBMIBadgeColor(isEditingAnthro ? currentBmi : bmiVal)}`} style={{ fontSize: 11, display: "block", padding: "6px", height: 26, lineHeight: "14px" }}>
                          {isEditingAnthro ? (currentBmi ? `${currentBmi}` : "-") : (bmiVal ? `${bmiVal}` : "-")}
                        </div>
                      </div>
                    </div>

                    {/* Kategori BMI */}
                    <div className="col-12 col-sm-3">
                      <div className="border rounded p-2 text-center bg-light">
                        <label className="text-muted d-block mb-1" style={{ fontSize: 10 }}>Kategori BMI</label>
                        <div className="fw-semibold text-truncate" style={{ fontSize: 11, height: 26, lineHeight: "26px" }} title={isEditingAnthro ? currentBmiCat : bmiCat}>
                          {(isEditingAnthro ? currentBmiCat : bmiCat) || "-"}
                        </div>
                      </div>
                    </div>

                    {/* Lingkar Kepala */}
                    <div className="col-4">
                      <div className={`border rounded p-2 text-center ${isEditingAnthro ? "bg-white shadow-sm" : "bg-light"}`}>
                        <label className="text-muted d-block mb-1" style={{ fontSize: 10 }}>Lingkar Kepala</label>
                        {isEditingAnthro ? (
                          <input
                            type="number"
                            className="form-control form-control-sm text-center fw-bold"
                            style={{ fontSize: 12, padding: "2px 5px", height: 26 }}
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
                      <div className={`border rounded p-2 text-center ${isEditingAnthro ? "bg-white shadow-sm" : "bg-light"}`}>
                        <label className="text-muted d-block mb-1" style={{ fontSize: 10 }}>Lingkar Lengan (LiLA)</label>
                        {isEditingAnthro ? (
                          <input
                            type="number"
                            step="0.1"
                            className="form-control form-control-sm text-center fw-bold"
                            style={{ fontSize: 12, padding: "2px 5px", height: 26 }}
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
                      <div className={`border rounded p-2 text-center ${isEditingAnthro ? "bg-white shadow-sm" : "bg-light"}`}>
                        <label className="text-muted d-block mb-1" style={{ fontSize: 10 }}>Golongan Darah</label>
                        {isEditingAnthro ? (
                          <select
                            className="form-select form-select-sm text-center fw-bold p-0"
                            style={{ fontSize: 12, height: 26 }}
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
                          className="btn btn-sm btn-success py-1 px-2 d-flex align-items-center gap-1"
                          style={{ fontSize: 12, background: "#10b981", border: "none", color: "#fff" }}
                          onClick={handleSaveVitals}
                        >
                          <i className="bi bi-check-lg" /> Simpan
                        </button>
                        <button
                          className="btn btn-sm btn-outline-secondary py-1 px-2 d-flex align-items-center gap-1"
                          style={{ fontSize: 12 }}
                          onClick={handleCancelVitals}
                        >
                          <i className="bi bi-x-lg" /> Batal
                        </button>
                      </div>
                    ) : (
                      <button
                        className="btn btn-sm btn-outline-primary py-1 px-2 d-flex align-items-center gap-1"
                        style={{ fontSize: 12, borderColor: "#4f46e5", color: "#4f46e5" }}
                        onClick={() => setIsEditingVitals(true)}
                      >
                        <i className="bi bi-pencil-square" /> Edit Vital
                      </button>
                    )}
                  </div>

                  <div className="row g-2">
                    {/* RR */}
                    <div className="col-6 col-sm-4 col-md-3">
                      <div className={`border rounded p-2 d-flex align-items-center gap-2 ${isEditingVitals ? "bg-white shadow-sm" : "bg-light"}`}>
                        <i className="bi bi-lungs" style={{ color: "#4f46e5", fontSize: 16 }} />
                        <div className="flex-grow-1">
                          <label className="text-muted" style={{ fontSize: 9, display: "block" }}>Resp. Rate (RR)</label>
                          {isEditingVitals ? (
                            <div className="d-flex align-items-center gap-1">
                              <input
                                type="number"
                                className="form-control form-control-sm text-center fw-bold p-1"
                                style={{ fontSize: 12, height: 26 }}
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
                      <div className={`border rounded p-2 d-flex align-items-center gap-2 ${isEditingVitals ? "bg-white shadow-sm" : "bg-light"}`}>
                        <i className="bi bi-activity" style={{ color: "#4f46e5", fontSize: 16 }} />
                        <div className="flex-grow-1">
                          <label className="text-muted" style={{ fontSize: 9, display: "block" }}>Saturasi SpO2</label>
                          {isEditingVitals ? (
                            <div className="d-flex align-items-center gap-1">
                              <input
                                type="number"
                                className="form-control form-control-sm text-center fw-bold p-1"
                                style={{ fontSize: 12, height: 26 }}
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
                      <div className={`border rounded p-2 d-flex align-items-center gap-2 ${isEditingVitals ? "bg-white shadow-sm" : "bg-light"}`}>
                        <i className="bi bi-heart-arrow" style={{ color: "#4f46e5", fontSize: 16 }} />
                        <div className="flex-grow-1">
                          <label className="text-muted" style={{ fontSize: 9, display: "block" }}>Terapi Oksigen</label>
                          {isEditingVitals ? (
                            <select
                              className="form-select form-select-sm fw-bold p-1"
                              style={{ fontSize: 11, height: 26 }}
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
                      <div className={`border rounded p-2 d-flex align-items-center gap-2 ${isEditingVitals ? "bg-white shadow-sm" : "bg-light"}`}>
                        <i className="bi bi-thermometer-half" style={{ color: "#4f46e5", fontSize: 16 }} />
                        <div className="flex-grow-1">
                          <label className="text-muted" style={{ fontSize: 9, display: "block" }}>Suhu Tubuh</label>
                          {isEditingVitals ? (
                            <div className="d-flex align-items-center gap-1">
                              <input
                                type="number"
                                step="0.1"
                                className="form-control form-control-sm text-center fw-bold p-1"
                                style={{ fontSize: 12, height: 26 }}
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
                      <div className={`border rounded p-2 d-flex align-items-center gap-2 ${isEditingVitals ? "bg-white shadow-sm" : "bg-light"}`}>
                        <i className="bi bi-heart-pulse" style={{ color: "#4f46e5", fontSize: 16 }} />
                        <div className="flex-grow-1">
                          <label className="text-muted" style={{ fontSize: 9, display: "block" }}>Tekanan Darah</label>
                          {isEditingVitals ? (
                            <div className="d-flex align-items-center gap-1">
                              <input
                                type="number"
                                placeholder="Sys"
                                className="form-control form-control-sm text-center fw-bold p-1"
                                style={{ fontSize: 11, height: 26, minWidth: 0 }}
                                value={sistolik}
                                onChange={(e) => setSistolik(e.target.value)}
                              />
                              <span style={{ fontSize: 9 }} className="text-muted">/</span>
                              <input
                                type="number"
                                placeholder="Dias"
                                className="form-control form-control-sm text-center fw-bold p-1"
                                style={{ fontSize: 11, height: 26, minWidth: 0 }}
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
                      <div className={`border rounded p-2 d-flex align-items-center gap-2 ${isEditingVitals ? "bg-white shadow-sm" : "bg-light"}`}>
                        <i className="bi bi-droplet-half" style={{ color: "#4f46e5", fontSize: 16 }} />
                        <div className="flex-grow-1">
                          <label className="text-muted" style={{ fontSize: 9, display: "block" }}>Nadi / HR</label>
                          {isEditingVitals ? (
                            <div className="d-flex align-items-center gap-1">
                              <input
                                type="number"
                                className="form-control form-control-sm text-center fw-bold p-1"
                                style={{ fontSize: 12, height: 26 }}
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
                      <div className={`border rounded p-2 d-flex align-items-center gap-2 ${isEditingVitals ? "bg-white shadow-sm" : "bg-light"}`}>
                        <i className="bi bi-brain" style={{ color: "#4f46e5", fontSize: 16 }} />
                        <div className="flex-grow-1">
                          <label className="text-muted" style={{ fontSize: 9, display: "block" }}>Kesadaran</label>
                          {isEditingVitals ? (
                            <select
                              className="form-select form-select-sm fw-bold p-1"
                              style={{ fontSize: 11, height: 26 }}
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
                  className="rounded-3 p-4 h-100 d-flex flex-column shadow-sm border"
                  style={{ background: "#fcfdff", borderColor: "#e0e7ff" }}
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
                      style={{ fontSize: 13, resize: "none" }}
                    />
                  </div>

                  <button
                    className="btn w-100 py-2 d-flex align-items-center justify-content-center gap-2 text-white mt-auto"
                    style={{ background: "#4f46e5", fontWeight: 600, border: "none" }}
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
          <div className="text-center py-5 text-muted bg-white rounded border">
            <i className="bi bi-search d-block mb-2" style={{ fontSize: 36 }} />
            Pilih pasien untuk meninjau status klinis
          </div>
        )}
      </div>
    </div>
  );
}

export default function DoctorPanel({ onLogout }) {
  const [activePage, setActivePage] = useState("dashboard");
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState(null);

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

  const subpages = {
    dashboard: {
      title: "Papan Pemantauan Pasien IGD Dokter",
      component: <DoctorDashboard patients={patients} setActivePage={setActivePage} setSelectedId={handleSelectFromDashboard} />
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
    }
  };

  function handleSelectFromDashboard(id) {
    setSelectedId(id);
    setActivePage("diagnose");
  }

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

      <div style={{ background: "#f5f6fa", minHeight: "100vh" }}>
        <SidebarDoctor activePage={activePage} setActivePage={setActivePage} />

        {/* Main Content Area */}
        <div style={{ marginLeft: 250 }}>
          {/* Topbar */}
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
            <h5 className="mb-0 fw-semibold text-indigo" style={{ color: "#312e81" }}>
              {current.title}
            </h5>
            <div className="d-flex align-items-center gap-3">
              <span
                className="badge"
                style={{ background: "#eef2ff", color: "#4f46e5", fontSize: 12 }}
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

          {/* Subpage component */}
          <div className="p-4">
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
      </div>
    </>
  );
}
