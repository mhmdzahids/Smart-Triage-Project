import { useState, useEffect } from 'react'
import AdminPanel from './AdminPanel'
import NursePanel from './NursePanel'
import DoctorPanel from './DoctorPanel'
import { supabase } from './supabaseClient'

function App() {
  const [session, setSession] = useState(null)
  const [userProfile, setUserProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [lang, setLang] = useState(() => localStorage.getItem("app_lang") || "id")

  const handleToggleLanguage = (newLang) => {
    setLang(newLang);
    localStorage.setItem("app_lang", newLang);
  }

  // Switch mode visibility toggle with Ctrl + `
  const [showSwitcher, setShowSwitcher] = useState(false)
  // Dev override role state ('ADMIN', 'NURSE', 'DOCTOR')
  const [overrideRole, setOverrideRole] = useState(null)

  // Auth screen toggle: 'login' or 'register'
  const [authMode, setAuthMode] = useState('login')

  // Login form state
  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [loginError, setLoginError] = useState('')
  const [loginLoading, setLoginLoading] = useState(false)

  // Register form state
  const [regName, setRegName] = useState('')
  const [regEmail, setRegEmail] = useState('')
  const [regPassword, setRegPassword] = useState('')
  const [regRole, setRegRole] = useState('NURSE') // Default role: NURSE
  const [regError, setRegError] = useState('')
  const [regSuccess, setRegSuccess] = useState('')
  const [regLoading, setRegLoading] = useState(false)

  async function fetchProfile(userId) {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('user_id', userId)
        .single();
      
      if (error) throw error;
      setUserProfile(data);
    } catch (err) {
      console.warn("Failed to fetch user profile from table:", err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // 1. Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        fetchProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

    // 2. Listen to auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        fetchProfile(session.user.id);
      } else {
        setUserProfile(null);
        setOverrideRole(null);
        setLoading(false);
      }
    });

    // 3. Dev Switcher Keyboard Shortcut: Ctrl + `
    const handleKeyDown = (e) => {
      if (e.ctrlKey && (e.key === '`' || e.key === '~' || e.code === 'Backquote')) {
        e.preventDefault();
        setShowSwitcher(prev => !prev);
      }
    };

    // 4. Secret Gesture for Mobile: Tap top-left logo/brand area 5 times within 2s
    let tapCount = 0;
    let lastTapTime = 0;
    const handleTapToggle = (e) => {
      if (e.clientX < 150 && e.clientY < 60) {
        const now = Date.now();
        if (now - lastTapTime < 800) {
          tapCount++;
        } else {
          tapCount = 1;
        }
        lastTapTime = now;
        if (tapCount >= 5) {
          setShowSwitcher(prev => !prev);
          tapCount = 0;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('click', handleTapToggle);

    return () => {
      subscription.unsubscribe();
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('click', handleTapToggle);
    };
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!loginEmail || !loginPassword) {
      setLoginError("Email dan password wajib diisi");
      return;
    }
    setLoginError("");
    setLoginLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password: loginPassword,
      });
      if (error) throw error;
    } catch (err) {
      setLoginError(err.message || "Gagal masuk. Silakan periksa kembali email & password.");
    } finally {
      setLoginLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!regName || !regEmail || !regPassword) {
      setRegError("Semua field wajib diisi");
      return;
    }
    setRegError("");
    setRegSuccess("");
    setRegLoading(true);
    try {
      // 1. Sign up user via Supabase Auth
      const { data, error } = await supabase.auth.signUp({
        email: regEmail,
        password: regPassword,
        options: {
          data: {
            name: regName,
            role: regRole
          }
        }
      });
      if (error) throw error;

      if (data?.user) {
        // 2. Insert profile record into public.users table
        try {
          await supabase.from('users').insert({
            user_id: data.user.id,
            name: regName,
            email: regEmail,
            role: regRole,
            is_active: true
          });
        } catch (dbErr) {
          console.warn("Auto-insert into users table failed/skipped (probably handled by trigger):", dbErr);
        }

        if (data.session) {
          setRegSuccess("Registrasi berhasil! Anda telah masuk.");
          setTimeout(() => {
            setAuthMode('login');
          }, 1500);
        } else {
          setRegSuccess("Registrasi berhasil! Silakan periksa email Anda untuk verifikasi.");
          setRegName('');
          setRegEmail('');
          setRegPassword('');
        }
      }
    } catch (err) {
      setRegError(err.message || "Registrasi gagal. Silakan coba kembali.");
    } finally {
      setRegLoading(false);
    }
  };

  const handleLogout = async () => {
    setLoading(true);
    await supabase.auth.signOut();
  };

  const handleChangePassword = async (newPassword) => {
    const { error } = await supabase.auth.updateUser({
      password: newPassword
    });
    if (error) throw error;
  };

  const handleUpdateProfileName = async (newName) => {
    if (!session?.user?.id) return;
    try {
      const { error } = await supabase
        .from('users')
        .update({ name: newName })
        .eq('user_id', session.user.id);
      
      if (error) throw error;
      
      setUserProfile(prev => prev ? { ...prev, name: newName } : prev);
      
      const { error: authError } = await supabase.auth.updateUser({
        data: { name: newName }
      });
      if (authError) console.warn("Failed to update auth metadata:", authError.message);
    } catch (err) {
      console.error("Gagal memperbarui nama profil:", err.message);
      throw err;
    }
  };

  const getActiveRole = () => {
    if (overrideRole) return overrideRole;
    if (userProfile?.role) return userProfile.role;
    if (session?.user?.user_metadata?.role) return session.user.user_metadata.role;
    return null;
  };

  const activeRole = getActiveRole();
  const activeName = userProfile?.name || session?.user?.user_metadata?.name || "User";
  const activeEmail = userProfile?.email || session?.user?.email || "";
  const joinedAt = userProfile?.created_at || session?.user?.created_at || "";

  if (loading) {
    return (
      <div 
        className="d-flex justify-content-center align-items-center bg-dark text-white" 
        style={{ minHeight: '100vh', flexDirection: 'column', gap: '15px' }}
      >
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
        <div className="fw-semibold text-muted" style={{ fontSize: 13 }}>Memuat Sesi...</div>
      </div>
    );
  }

  return (
    <>
      {/* Bootstrap & Icons resources */}
      <link
        rel="stylesheet"
        href="https://cdnjs.cloudflare.com/ajax/libs/bootstrap/5.3.3/css/bootstrap.min.css"
      />
      <link
        rel="stylesheet"
        href="https://cdnjs.cloudflare.com/ajax/libs/bootstrap-icons/1.11.3/font/bootstrap-icons.min.css"
      />

      <style>{`
        @media (max-width: 767.98px) {
          .desktop-role-switcher {
            bottom: 80px !important;
            width: 90% !important;
            max-width: 360px !important;
            border-radius: 16px !important;
            flex-wrap: wrap !important;
            justify-content: center !important;
            padding: 8px !important;
          }
          .role-switch-btn {
            flex: 1 1 auto;
            justify-content: center;
          }
        }
        .role-switch-btn {
          transition: all 0.2s ease;
          border: none;
          font-size: 12px;
          font-weight: 600;
          display: inline-flex !important;
          align-items: center !important;
          gap: 6px !important;
        }
        .role-switch-btn:hover:not(.active) {
          background-color: #f1f5f9;
          color: #1e293b;
        }
      `}</style>

      {/* Floating Bottom Selector / Switcher */}
      {session && showSwitcher && (
        <div 
          className="desktop-role-switcher"
          style={{ 
            position: 'fixed', 
            bottom: '24px', 
            left: '50%', 
            transform: 'translateX(-50%)', 
            zIndex: 9999,
            boxShadow: '0 10px 30px rgba(0,0,0,0.08)',
            backgroundColor: '#ffffff',
            borderRadius: '100px',
            padding: '4px',
            border: '1px solid rgba(0,0,0,0.06)',
            display: 'flex',
            gap: '3px',
            alignItems: 'center'
          }}
        >
          <button
            onClick={() => setOverrideRole('ADMIN')}
            className={`btn btn-sm rounded-pill px-3 py-1.5 role-switch-btn ${activeRole === 'ADMIN' ? 'active' : ''}`}
            style={{
              background: activeRole === 'ADMIN' ? '#145c9c' : 'transparent',
              color: activeRole === 'ADMIN' ? '#fff' : '#64748b',
            }}
          >
            <i className={`bi ${activeRole === 'ADMIN' ? 'bi-shield-fill-check' : 'bi-shield-check'}`} style={{ fontSize: '13px' }} />
            Admin Panel
          </button>
          <button
            onClick={() => setOverrideRole('NURSE')}
            className={`btn btn-sm rounded-pill px-3 py-1.5 role-switch-btn ${activeRole === 'NURSE' ? 'active' : ''}`}
            style={{
              background: activeRole === 'NURSE' ? '#0d9488' : 'transparent',
              color: activeRole === 'NURSE' ? '#fff' : '#64748b',
            }}
          >
            <i className="bi bi-activity" style={{ fontSize: '13px' }} />
            Nurse Panel
          </button>
          <button
            onClick={() => setOverrideRole('DOCTOR')}
            className={`btn btn-sm rounded-pill px-3 py-1.5 role-switch-btn ${activeRole === 'DOCTOR' ? 'active' : ''}`}
            style={{
              background: activeRole === 'DOCTOR' ? '#6366f1' : 'transparent',
              color: activeRole === 'DOCTOR' ? '#fff' : '#64748b',
            }}
          >
            <i className="bi bi-hospital" style={{ fontSize: '13px' }} />
            Doctor Panel
          </button>
        </div>
      )}

      {/* Main Routing UI */}
      {session ? (
        <>
          {activeRole === 'ADMIN' && <AdminPanel onLogout={handleLogout} userName={activeName} userEmail={activeEmail} joinedAt={joinedAt} onChangePassword={handleChangePassword} onUpdateProfileName={handleUpdateProfileName} lang={lang} onToggleLanguage={handleToggleLanguage} />}
          {activeRole === 'NURSE' && <NursePanel onLogout={handleLogout} userName={activeName} userEmail={activeEmail} joinedAt={joinedAt} onChangePassword={handleChangePassword} onUpdateProfileName={handleUpdateProfileName} lang={lang} onToggleLanguage={handleToggleLanguage} />}
          {activeRole === 'DOCTOR' && <DoctorPanel onLogout={handleLogout} userName={activeName} userEmail={activeEmail} joinedAt={joinedAt} onChangePassword={handleChangePassword} onUpdateProfileName={handleUpdateProfileName} lang={lang} onToggleLanguage={handleToggleLanguage} />}
          {!activeRole && (
            <div 
              className="d-flex justify-content-center align-items-center text-center p-5 bg-light"
              style={{ minHeight: '100vh', flexDirection: 'column', gap: 15 }}
            >
              <i className="bi bi-shield-exclamation text-warning" style={{ fontSize: 40 }} />
              <h5 className="fw-semibold text-dark">Akses Tertunda</h5>
              <p className="text-muted max-w-md" style={{ fontSize: 13, maxWidth: 380 }}>
                Akun Anda berhasil terdaftar, namun peran (role) Anda sedang dikonfigurasi. Hubungi Admin atau gunakan shortcut dev jika Anda di lingkungan pengujian.
              </p>
              <button onClick={handleLogout} className="btn btn-primary rounded-pill btn-sm px-4">
                Keluar
              </button>
            </div>
          )}
        </>
      ) : (
        /* Styled Authentication Screen */
        <div 
          className="d-flex justify-content-center align-items-center"
          style={{
            minHeight: '100vh',
            background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
            padding: '20px'
          }}
        >
          <div 
            className="card border-0 shadow-lg"
            style={{
              width: '100%',
              maxWidth: '430px',
              borderRadius: '1.25rem',
              overflow: 'hidden',
              boxShadow: '0 20px 40px rgba(0,0,0,0.3)'
            }}
          >
            <div className="card-body p-4 p-md-5 bg-white">
              {/* Brand Header */}
              <div className="text-center mb-4">
                <div 
                  className="d-inline-flex justify-content-center align-items-center mb-3"
                  style={{
                    width: '60px',
                    height: '60px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #e0f2fe 0%, #bae6fd 100%)',
                    color: '#145c9c'
                  }}
                >
                  <i className="bi bi-heart-pulse-fill" style={{ fontSize: 26 }} />
                </div>
                <h4 className="fw-bold mb-1" style={{ color: '#1e293b' }}>Smart Triage</h4>
                <p className="text-muted mb-0" style={{ fontSize: 13 }}>Modified Early Obstetric Warning Score (MEOWS)</p>
              </div>

              {/* Login Form */}
              {authMode === 'login' && (
                <form onSubmit={handleLogin}>
                  {loginError && (
                    <div className="alert alert-danger d-flex align-items-center gap-2 mb-3" style={{ fontSize: 13, borderRadius: 10 }}>
                      <i className="bi bi-exclamation-triangle-fill" />
                      <div>{loginError}</div>
                    </div>
                  )}

                  <div className="mb-3">
                    <label className="form-label text-muted fw-semibold" style={{ fontSize: 12 }}>Alamat Email</label>
                    <div className="input-group">
                      <span className="input-group-text bg-light border-end-0 text-muted"><i className="bi bi-envelope" /></span>
                      <input 
                        type="email" 
                        className="form-control bg-light border-start-0"
                        placeholder="contoh@rs.co.id" 
                        value={loginEmail}
                        onChange={(e) => setLoginEmail(e.target.value)}
                        style={{ fontSize: 13 }}
                        required
                      />
                    </div>
                  </div>

                  <div className="mb-4">
                    <label className="form-label text-muted fw-semibold" style={{ fontSize: 12 }}>Kata Sandi</label>
                    <div className="input-group">
                      <span className="input-group-text bg-light border-end-0 text-muted"><i className="bi bi-key" /></span>
                      <input 
                        type="password" 
                        className="form-control bg-light border-start-0"
                        placeholder="••••••••" 
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        style={{ fontSize: 13 }}
                        required
                      />
                    </div>
                  </div>

                  <button 
                    type="submit" 
                    className="btn w-100 rounded-pill py-2.5 fw-semibold text-white transition-all shadow-sm"
                    style={{
                      background: 'linear-gradient(90deg, #145c9c 0%, #3b82f6 100%)',
                      border: 'none',
                      fontSize: 14
                    }}
                    disabled={loginLoading}
                  >
                    {loginLoading ? (
                      <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" />
                    ) : null}
                    Masuk Portal
                  </button>

                  <div className="text-center mt-4">
                    <p className="text-muted mb-0" style={{ fontSize: 12 }}>
                      Belum memiliki akun?{' '}
                      <button 
                        type="button" 
                        className="btn btn-link p-0 text-decoration-none fw-semibold"
                        style={{ fontSize: 12, color: '#145c9c' }}
                        onClick={() => {
                          setAuthMode('register');
                          setLoginError('');
                        }}
                      >
                        Daftar Akun
                      </button>
                    </p>
                  </div>
                </form>
              )}

              {/* Register Form */}
              {authMode === 'register' && (
                <form onSubmit={handleRegister}>
                  {regError && (
                    <div className="alert alert-danger d-flex align-items-center gap-2 mb-3" style={{ fontSize: 13, borderRadius: 10 }}>
                      <i className="bi bi-exclamation-triangle-fill" />
                      <div>{regError}</div>
                    </div>
                  )}

                  {regSuccess && (
                    <div className="alert alert-success d-flex align-items-center gap-2 mb-3" style={{ fontSize: 13, borderRadius: 10 }}>
                      <i className="bi bi-check-circle-fill" />
                      <div>{regSuccess}</div>
                    </div>
                  )}

                  <div className="mb-3">
                    <label className="form-label text-muted fw-semibold" style={{ fontSize: 12 }}>Nama Lengkap</label>
                    <div className="input-group">
                      <span className="input-group-text bg-light border-end-0 text-muted"><i className="bi bi-person" /></span>
                      <input 
                        type="text" 
                        className="form-control bg-light border-start-0"
                        placeholder="Nama Lengkap" 
                        value={regName}
                        onChange={(e) => setRegName(e.target.value)}
                        style={{ fontSize: 13 }}
                        required
                      />
                    </div>
                  </div>

                  <div className="mb-3">
                    <label className="form-label text-muted fw-semibold" style={{ fontSize: 12 }}>Alamat Email</label>
                    <div className="input-group">
                      <span className="input-group-text bg-light border-end-0 text-muted"><i className="bi bi-envelope" /></span>
                      <input 
                        type="email" 
                        className="form-control bg-light border-start-0"
                        placeholder="contoh@rs.co.id" 
                        value={regEmail}
                        onChange={(e) => setRegEmail(e.target.value)}
                        style={{ fontSize: 13 }}
                        required
                      />
                    </div>
                  </div>

                  <div className="mb-3">
                    <label className="form-label text-muted fw-semibold" style={{ fontSize: 12 }}>Kata Sandi</label>
                    <div className="input-group">
                      <span className="input-group-text bg-light border-end-0 text-muted"><i className="bi bi-key" /></span>
                      <input 
                        type="password" 
                        className="form-control bg-light border-start-0"
                        placeholder="Minimal 6 karakter" 
                        value={regPassword}
                        onChange={(e) => setRegPassword(e.target.value)}
                        style={{ fontSize: 13 }}
                        required
                      />
                    </div>
                  </div>

                  <div className="mb-4">
                    <label className="form-label text-muted fw-semibold" style={{ fontSize: 12 }}>Pilih Peran (Role)</label>
                    <div className="input-group">
                      <span className="input-group-text bg-light border-end-0 text-muted"><i className="bi bi-shield-shaded" /></span>
                      <select 
                        className="form-select bg-light border-start-0"
                        value={regRole}
                        onChange={(e) => setRegRole(e.target.value)}
                        style={{ fontSize: 13 }}
                        required
                      >
                        <option value="NURSE">Perawat / Bidan</option>
                        <option value="DOCTOR">Dokter Spesialis / Jaga</option>
                        <option value="ADMIN">Administrator Sistem</option>
                      </select>
                    </div>
                  </div>

                  <button 
                    type="submit" 
                    className="btn w-100 rounded-pill py-2.5 fw-semibold text-white transition-all shadow-sm"
                    style={{
                      background: 'linear-gradient(90deg, #145c9c 0%, #3b82f6 100%)',
                      border: 'none',
                      fontSize: 14
                    }}
                    disabled={regLoading}
                  >
                    {regLoading ? (
                      <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" />
                    ) : null}
                    Daftar Akun Baru
                  </button>

                  <div className="text-center mt-4">
                    <p className="text-muted mb-0" style={{ fontSize: 12 }}>
                      Sudah memiliki akun?{' '}
                      <button 
                        type="button" 
                        className="btn btn-link p-0 text-decoration-none fw-semibold"
                        style={{ fontSize: 12, color: '#145c9c' }}
                        onClick={() => {
                          setAuthMode('login');
                          setRegError('');
                          setRegSuccess('');
                        }}
                      >
                        Masuk Portal
                      </button>
                    </p>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default App
