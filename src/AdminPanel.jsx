import { useState, useEffect } from "react";
import { fetchActiveVisits, insertNewVisit, deleteVisit } from "./supabaseHelpers";



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
function Sidebar({ activePage, setActivePage }) {
  const navItems = [
    { id: "dashboard", icon: "bi-speedometer2", label: "Dashboard" },
    { id: "pasien", icon: "bi-person-lines-fill", label: "Data Pasien" },
    { id: "tambah", icon: "bi-person-plus-fill", label: "Tambah Pasien" },
  ];
  return (
    <div
      className="d-flex flex-column"
      style={{
        width: 240,
        minHeight: "100vh",
        background: "linear-gradient(160deg, #0f4c81 0%, #1a6fbd 100%)",
        color: "#fff",
        position: "fixed",
        top: 0,
        left: 0,
        zIndex: 100,
        boxShadow: "2px 0 12px rgba(0,0,0,0.18)",
      }}
    >
      {/* Brand */}
      <div
        className="d-flex align-items-center gap-2 px-4 py-4"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.15)" }}
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
          }}
        >
          <i className="bi bi-heart-pulse-fill text-primary" style={{ fontSize: 18 }} />
        </div>
        <div>
          <div style={{ fontWeight: 700, fontSize: 15, letterSpacing: 0.5 }}>
            Smart-Triage
          </div>
          <div style={{ fontSize: 11, opacity: 0.7 }}>Admin Panel</div>
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
                  ? "rgba(255,255,255,0.18)"
                  : "transparent",
              color: "#fff",
              fontWeight: activePage === item.id ? 600 : 400,
              fontSize: 14,
              borderLeft:
                activePage === item.id
                  ? "3px solid #fff"
                  : "3px solid transparent",
              cursor: "pointer",
              transition: "all 0.15s",
            }}
          >
            <i className={`bi ${item.icon}`} style={{ fontSize: 16 }} />
            {item.label}
          </button>
        ))}
      </nav>

      {/* User info */}
      <div
        className="px-4 py-3"
        style={{ borderTop: "1px solid rgba(255,255,255,0.15)", fontSize: 12 }}
      >
        <div className="d-flex align-items-center gap-2">
          <div
            style={{
              width: 30,
              height: 30,
              borderRadius: "50%",
              background: "rgba(255,255,255,0.25)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <i className="bi bi-person-fill" />
          </div>
          <div>
            <div style={{ fontWeight: 600 }}>Admin RS</div>
            <div style={{ opacity: 0.65 }}>Administrator</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Topbar ───────────────────────────────────────────────────────────────────
function Topbar({ title, onLogout }) {
  return (
    <div
      className="d-flex align-items-center justify-content-between px-4"
      style={{
        height: 60,
        background: "#fff",
        borderBottom: "1px solid #e5e9f0",
        position: "sticky",
        top: 0,
        zIndex: 50,
        boxShadow: "0 1px 6px rgba(0,0,0,0.06)",
      }}
    >
      <h5 className="mb-0 fw-semibold" style={{ color: "#1e3a5f" }}>
        {title}
      </h5>
      <div className="d-flex align-items-center gap-3">
        <span
          className="badge"
          style={{ background: "#e8f4fd", color: "#0f4c81", fontSize: 12 }}
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
  );
}

// ─── Page: Dashboard ──────────────────────────────────────────────────────────
function DashboardPage({ patients, setActivePage }) {
  const byStatus = patients.reduce((acc, p) => {
    acc[p.statusPasien] = (acc[p.statusPasien] || 0) + 1;
    return acc;
  }, {});

  const stats = [
    { label: "Total Pasien", value: patients.length, icon: "bi-people-fill", color: "#0f4c81", bg: "#e8f1fb" },
    { label: "Pasien BPJS", value: byStatus["BPJS"] || 0, icon: "bi-shield-check", color: "#198754", bg: "#e8f6ef" },
    { label: "Pasien Umum", value: byStatus["Umum"] || 0, icon: "bi-person-check", color: "#6c757d", bg: "#f2f3f4" },
    { label: "Pasien Asuransi", value: byStatus["Asuransi"] || 0, icon: "bi-card-checklist", color: "#0dcaf0", bg: "#e0f8fd" },
  ];

  return (
    <div>
      {/* Stats cards */}
      <div className="row g-3 mb-4">
        {stats.map((s) => (
          <div key={s.label} className="col-6 col-xl-3">
            <div
              className="rounded-3 p-3 h-100"
              style={{ background: "#fff", border: "1px solid #e5e9f0" }}
            >
              <div className="d-flex align-items-center gap-3">
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 12,
                    background: s.bg,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <i
                    className={`bi ${s.icon}`}
                    style={{ fontSize: 20, color: s.color }}
                  />
                </div>
                <div>
                  <div style={{ fontSize: 24, fontWeight: 700, color: "#1e3a5f" }}>
                    {s.value}
                  </div>
                  <div style={{ fontSize: 12, color: "#6c757d" }}>{s.label}</div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Recent patients */}
      <div
        className="rounded-3 p-4"
        style={{ background: "#fff", border: "1px solid #e5e9f0" }}
      >
        <div className="d-flex align-items-center justify-content-between mb-3">
          <h6 className="fw-semibold mb-0" style={{ color: "#1e3a5f" }}>
            Pasien Terbaru
          </h6>
          <button
            className="btn btn-sm"
            style={{ background: "#e8f1fb", color: "#0f4c81", border: "none", fontSize: 13 }}
            onClick={() => setActivePage("pasien")}
          >
            Lihat semua <i className="bi bi-arrow-right ms-1" />
          </button>
        </div>
        <div className="table-responsive">
          <table className="table table-sm mb-0" style={{ fontSize: 13 }}>
            <thead style={{ background: "#f8fafc" }}>
              <tr>
                <th className="fw-semibold text-muted border-0 py-2">Nama</th>
                <th className="fw-semibold text-muted border-0 py-2">NIK</th>
                <th className="fw-semibold text-muted border-0 py-2">Status</th>
                <th className="fw-semibold text-muted border-0 py-2">Tgl Daftar</th>
              </tr>
            </thead>
            <tbody>
              {patients.slice(0, 5).map((p) => (
                <tr key={p.id} style={{ borderTop: "1px solid #f0f2f5" }}>
                  <td className="py-2 fw-medium">{p.nama}</td>
                  <td className="py-2 text-muted" style={{ fontFamily: "monospace" }}>
                    {p.nik}
                  </td>
                  <td className="py-2">
                    <StatusBadge status={p.statusPasien} />
                  </td>
                  <td className="py-2 text-muted">{p.tglDaftar}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── Page: Data Pasien ────────────────────────────────────────────────────────
function DataPasienPage({ patients, setPatients }) {
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("Semua");
  const [deleteId, setDeleteId] = useState(null);

  const filtered = patients.filter((p) => {
    const q = search.toLowerCase();
    const matchQ =
      !q ||
      p.nama.toLowerCase().includes(q) ||
      p.nik.includes(q) ||
      p.noBpjs.includes(q);
    const matchS = filterStatus === "Semua" || p.statusPasien === filterStatus;
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

  return (
    <div>
      {/* Toolbar */}
      <div
        className="rounded-3 p-3 mb-3 d-flex flex-wrap gap-2 align-items-center justify-content-between"
        style={{ background: "#fff", border: "1px solid #e5e9f0" }}
      >
        <div className="d-flex gap-2 flex-wrap">
          <div className="input-group" style={{ width: 240 }}>
            <span className="input-group-text border-end-0 bg-white">
              <i className="bi bi-search text-muted" style={{ fontSize: 13 }} />
            </span>
            <input
              type="text"
              className="form-control border-start-0 ps-0"
              placeholder="Cari nama, NIK, BPJS..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ fontSize: 13 }}
            />
          </div>
          <select
            className="form-select"
            style={{ width: 140, fontSize: 13 }}
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            {["Semua", "BPJS", "Umum", "Asuransi", "Perusahaan"].map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </div>
        <button
          className="btn btn-sm d-flex align-items-center gap-2"
          style={{ background: "#0f4c81", color: "#fff", fontSize: 13 }}
          onClick={() => downloadCSV(filtered)}
        >
          <i className="bi bi-download" />
          Download CSV
        </button>
      </div>

      {/* Table */}
      <div
        className="rounded-3"
        style={{ background: "#fff", border: "1px solid #e5e9f0", overflow: "hidden" }}
      >
        <div className="table-responsive">
          <table className="table mb-0" style={{ fontSize: 13 }}>
            <thead style={{ background: "#f8fafc" }}>
              <tr>
                {["#","Nama Lengkap","NIK","No BPJS","Tgl Lahir","Umur","Jenis Kelamin","No HP","Kontak Darurat","Status","Aksi"].map(
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
                    Tidak ada data pasien
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
                    <td className="py-3">{p.umur} thn</td>
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
                    <td className="py-3">
                      <button
                        className="btn btn-sm btn-outline-danger"
                        style={{ fontSize: 12 }}
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
            className="bg-white rounded-3 p-4"
            style={{ width: 340, boxShadow: "0 8px 32px rgba(0,0,0,0.18)" }}
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
                onClick={() => setDeleteId(null)}
              >
                Batal
              </button>
              <button
                className="btn btn-danger flex-fill"
                onClick={() => handleDelete(deleteId)}
              >
                Ya, Hapus
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Page: Tambah Pasien ──────────────────────────────────────────────────────
function TambahPasienPage({ setPatients, setActivePage }) {
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
      if (!form[f] || !form[f].trim()) newErrors[f] = "Wajib diisi";
    });
    if (form.nik && form.nik.length !== 16) newErrors.nik = "NIK harus 16 digit";
    if (form.noBpjs && form.noBpjs.length !== 13)
      newErrors.noBpjs = "No BPJS harus 13 digit";
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
        setErrors((prev) => ({ ...prev, nik: "NIK sudah terdaftar" }));
      } else {
        console.error("Error inserting patient visit:", err.message);
        setGeneralError("Gagal menyimpan data pasien: " + err.message);
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
          Data pasien berhasil disimpan! Lihat di halaman{" "}
          <button
            className="btn btn-link p-0"
            style={{ color: "#166534", fontSize: 13 }}
            onClick={() => setActivePage("pasien")}
          >
            Data Pasien
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
        className="rounded-3 p-4"
        style={{ background: "#fff", border: "1px solid #e5e9f0" }}
      >
        <h6 className="fw-semibold mb-4" style={{ color: "#1e3a5f" }}>
          <i className="bi bi-person-plus me-2" />
          Formulir Identitas Pasien
        </h6>

        {/* Section: Data Utama */}
        <div className="mb-4">
          <div
            className="d-flex align-items-center gap-2 mb-3"
            style={{ color: "#0f4c81" }}
          >
            <div
              style={{
                width: 4,
                height: 18,
                background: "#0f4c81",
                borderRadius: 2,
              }}
            />
            <span className="fw-semibold" style={{ fontSize: 13 }}>
              Data Identitas
            </span>
          </div>
          <div className="row g-3">
            <div className="col-12 col-md-6">
              {renderField("Nama Lengkap", "nama", "text", "Contoh: Siti Rahayu", true)}
            </div>
            <div className="col-12 col-md-6">
              {renderField("NIK / Nomor KTP", "nik", "text", "16 digit NIK", true, (
                <>
                  <input
                    type="text"
                    name="nik"
                    className={`form-control ${errors.nik ? "is-invalid" : ""}`}
                    placeholder="16 digit NIK"
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
              {renderField("Nomor BPJS / Asuransi", "noBpjs", "text", "13 digit (opsional)", false, (
                <>
                  <input
                    type="text"
                    name="noBpjs"
                    className={`form-control ${errors.noBpjs ? "is-invalid" : ""}`}
                    placeholder="13 digit (opsional)"
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
              {renderField("Tanggal Lahir", "tglLahir", "date", "", true)}
            </div>
            <div className="col-6 col-md-3">
              <label className="form-label fw-medium" style={{ fontSize: 13, color: "#374151" }}>
                Umur
              </label>
              <div
                className="form-control"
                style={{ fontSize: 13, background: "#f8fafc", color: "#475569" }}
              >
                {form.umur !== "" ? `${form.umur} tahun` : "Otomatis dari Tgl Lahir"}
              </div>
            </div>
            <div className="col-12 col-md-6">
              <label className="form-label fw-medium" style={{ fontSize: 13, color: "#374151" }}>
                Jenis Kelamin <span className="text-danger">*</span>
              </label>
              <select
                name="jenisKelamin"
                className={`form-select ${errors.jenisKelamin ? "is-invalid" : ""}`}
                value={form.jenisKelamin}
                onChange={handleChange}
                style={{ fontSize: 13 }}
              >
                <option value="">-- Pilih --</option>
                <option>Laki-laki</option>
                <option>Perempuan</option>
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
            style={{ color: "#0f4c81" }}
          >
            <div
              style={{
                width: 4,
                height: 18,
                background: "#0f4c81",
                borderRadius: 2,
              }}
            />
            <span className="fw-semibold" style={{ fontSize: 13 }}>
              Data Kontak
            </span>
          </div>
          <div className="row g-3">
            <div className="col-12">
              <label className="form-label fw-medium" style={{ fontSize: 13, color: "#374151" }}>
                Alamat <span className="text-danger">*</span>
              </label>
              <textarea
                name="alamat"
                className={`form-control ${errors.alamat ? "is-invalid" : ""}`}
                rows={2}
                placeholder="Alamat lengkap pasien"
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
              {renderField("Nomor HP", "noHp", "tel", "Contoh: 08123456789", true)}
            </div>
          </div>
        </div>

        {/* Section: Kontak Darurat */}
        <div className="mb-4">
          <div
            className="d-flex align-items-center gap-2 mb-3"
            style={{ color: "#0f4c81" }}
          >
            <div
              style={{
                width: 4,
                height: 18,
                background: "#0f4c81",
                borderRadius: 2,
              }}
            />
            <span className="fw-semibold" style={{ fontSize: 13 }}>
              Kontak Darurat
            </span>
          </div>
          <div className="row g-3">
            <div className="col-12 col-md-4">
              {renderField("Nama Kontak Darurat", "namaKontak", "text", "Nama lengkap", true)}
            </div>
            <div className="col-12 col-md-4">
              {renderField("Hubungan dengan Pasien", "hubKontak", "text", "Contoh: Ayah, Ibu, Suami, Istri", true)}
            </div>
            <div className="col-12 col-md-4">
              {renderField("Nomor HP Kontak Darurat", "noHpKontak", "tel", "Contoh: 08123456789", true)}
            </div>
          </div>
        </div>

        {/* Section: Status */}
        <div className="mb-4">
          <div
            className="d-flex align-items-center gap-2 mb-3"
            style={{ color: "#0f4c81" }}
          >
            <div
              style={{
                width: 4,
                height: 18,
                background: "#0f4c81",
                borderRadius: 2,
              }}
            />
            <span className="fw-semibold" style={{ fontSize: 13 }}>
              Status Pasien
            </span>
          </div>
          <div className="row g-3">
            <div className="col-12 col-md-4">
              <label className="form-label fw-medium" style={{ fontSize: 13, color: "#374151" }}>
                Status <span className="text-danger">*</span>
              </label>
              <div className="d-flex flex-wrap gap-2">
                {["Umum", "BPJS", "Asuransi", "Perusahaan"].map((s) => (
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
                      borderColor: form.statusPasien === s ? "#0f4c81" : "#dee2e6",
                      background: form.statusPasien === s ? "#0f4c81" : "#fff",
                      color: form.statusPasien === s ? "#fff" : "#374151",
                      fontWeight: form.statusPasien === s ? 600 : 400,
                    }}
                  >
                    {s}
                  </button>
                ))}
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
            style={{ fontSize: 13 }}
            onClick={() => {
              setForm(EMPTY_FORM);
              setErrors({});
            }}
          >
            <i className="bi bi-arrow-counterclockwise me-1" />
            Reset
          </button>
          <button
            className="btn"
            style={{
              background: "#0f4c81",
              color: "#fff",
              fontSize: 13,
              paddingLeft: 24,
              paddingRight: 24,
            }}
            onClick={handleSubmit}
          >
            <i className="bi bi-floppy me-2" />
            Simpan Data Pasien
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function AdminPanel({ onLogout }) {
  const [activePage, setActivePage] = useState("dashboard");
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);

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
    dashboard: { title: "Dashboard", component: <DashboardPage patients={patients} setActivePage={setActivePage} /> },
    pasien: { title: "Data Pasien", component: <DataPasienPage patients={patients} setPatients={setPatients} /> },
    tambah: { title: "Tambah Pasien", component: <TambahPasienPage setPatients={setPatients} setActivePage={setActivePage} /> },
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

      <div style={{ background: "#f4f7fb", minHeight: "100vh" }}>
        <Sidebar activePage={activePage} setActivePage={setActivePage} />

        {/* Main content area */}
        <div style={{ marginLeft: 240 }}>
          <Topbar title={current.title} onLogout={onLogout} />
          <div className="p-4">
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
      </div>
    </>
  );
}
