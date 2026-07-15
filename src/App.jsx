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
          className="d-flex min-vh-100 w-100"
          style={{
            background: '#ffffff',
            fontFamily: "'Outfit', 'Inter', sans-serif",
            overflowX: 'hidden'
          }}
        >
          {/* Left Side: Mockup (Hidden on Mobile) */}
          <div 
            className="d-none d-lg-flex flex-column justify-content-center p-5 text-white position-relative overflow-hidden"
            style={{
              width: '50%',
              background: 'radial-gradient(circle at 10% 20%, #1e1b4b 0%, #0f0b36 100%)',
              borderRight: '1px solid rgba(255,255,255,0.05)'
            }}
          >
            {/* Ambient glows */}
            <div 
              style={{
                position: 'absolute',
                top: '-10%',
                left: '-10%',
                width: '300px',
                height: '300px',
                background: 'rgba(79, 70, 229, 0.15)',
                filter: 'blur(80px)',
                borderRadius: '50%'
              }}
            />
            <div 
              style={{
                position: 'absolute',
                bottom: '-10%',
                right: '-10%',
                width: '300px',
                height: '300px',
                background: 'rgba(236, 72, 153, 0.1)',
                filter: 'blur(80px)',
                borderRadius: '50%'
              }}
            />

            {/* Left Content Center (Brand + Mockup) */}
            <div className="text-center position-relative" style={{ zIndex: 2 }}>
              {/* Centered Brand Header */}
              <div className="d-flex flex-column align-items-center gap-2 mb-3">
                <img 
                  src="/favicon.svg" 
                  alt="Smart Triage" 
                  style={{ 
                    width: '64px', 
                    height: '64px', 
                    objectFit: 'contain',
                    filter: 'drop-shadow(0 8px 16px rgba(0,0,0,0.4))'
                  }} 
                />
                <h3 className="fw-bold mb-0 text-white" style={{ letterSpacing: '-0.5px' }}>Smart Triage</h3>
              </div>

              {/* Preview image */}
              <div 
                className="mx-auto mb-4 p-2"
                style={{
                  maxWidth: '440px',
                  background: 'rgba(255,255,255,0.03)',
                  border: '1.5px solid rgba(255,255,255,0.08)',
                  borderRadius: '16px',
                  boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
                  backdropFilter: 'blur(10px)'
                }}
              >
                <img 
                  src="/dashboard-preview.png" 
                  alt="Dashboard Preview" 
                  className="img-fluid rounded-3"
                  style={{
                    boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                    display: 'block'
                  }}
                />
              </div>

              <h2 className="fw-bold mb-2 text-white" style={{ fontSize: '28px', letterSpacing: '-0.5px' }}>
                Easy to use Dashboard
              </h2>
              <p className="text-white-50 mx-auto" style={{ maxWidth: '380px', fontSize: '13.5px', lineHeight: '1.6' }}>
                Accurate MEOWS calculation, automated risk assessment, and real-time clinical dashboards for rapid triage decision-making.
              </p>
            </div>

            {/* Left Bottom Info / Footer */}
            <div className="position-absolute" style={{ bottom: '24px', left: '40px', zIndex: 2 }}>
              <p className="text-white-50 mb-0" style={{ fontSize: '11px' }}>
                &copy; {new Date().getFullYear()} Smart Triage System. All rights reserved.
              </p>
            </div>
          </div>

          {/* Right Side: Form */}
          <div 
            className="w-100 w-lg-50 d-flex justify-content-center align-items-center p-4 p-md-5"
            style={{
              background: '#f8fafc',
              minHeight: '100vh'
            }}
          >
            <div 
              className="w-100 p-4 p-md-5 bg-white shadow-lg border"
              style={{
                maxWidth: '460px',
                borderRadius: '24px',
                border: '1px solid rgba(226, 232, 240, 0.8)'
              }}
            >
              {/* Brand Header for Mobile View (Hidden on Desktop) */}
              <div className="d-lg-none text-center mb-4">
                <div 
                  className="d-inline-flex justify-content-center align-items-center mb-2"
                  style={{
                    width: '50px',
                    height: '50px',
                    borderRadius: '14px',
                    background: '#f0fdfa',
                    border: '1px solid #ccfbf1'
                  }}
                >
                  <img src="/favicon.svg" alt="Smart Triage" style={{ width: '28px', height: '28px', objectFit: 'contain' }} />
                </div>
                <h4 className="fw-bold mb-1 text-dark">Smart Triage</h4>
                <p className="text-muted mb-0" style={{ fontSize: '11.5px' }}>Modified Early Obstetric Warning Score (MEOWS)</p>
              </div>

              {/* Form Title */}
              <div className="text-center text-lg-start mb-4">
                <h3 className="fw-bold mb-1 text-slate-800" style={{ letterSpacing: '-0.5px' }}>
                  {authMode === 'login' ? 'Sign In to Portal' : 'Create Your Account'}
                </h3>
                <p className="text-muted" style={{ fontSize: '13px' }}>
                  {authMode === 'login' ? 'Welcome back! Please enter your details.' : 'Register to get access to the clinical triage system.'}
                </p>
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
                    <div className="custom-input-group">
                      <span className="input-icon"><i className="bi bi-envelope" /></span>
                      <input 
                        type="email" 
                        placeholder="contoh@rs.co.id" 
                        value={loginEmail}
                        onChange={(e) => setLoginEmail(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div className="mb-4">
                    <label className="form-label text-muted fw-semibold" style={{ fontSize: 12 }}>Kata Sandi</label>
                    <div className="custom-input-group">
                      <span className="input-icon"><i className="bi bi-key" /></span>
                      <input 
                        type="password" 
                        placeholder="••••••••" 
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
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
                    <div className="custom-input-group">
                      <span className="input-icon"><i className="bi bi-person" /></span>
                      <input 
                        type="text" 
                        placeholder="Nama Lengkap" 
                        value={regName}
                        onChange={(e) => setRegName(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div className="mb-3">
                    <label className="form-label text-muted fw-semibold" style={{ fontSize: 12 }}>Alamat Email</label>
                    <div className="custom-input-group">
                      <span className="input-icon"><i className="bi bi-envelope" /></span>
                      <input 
                        type="email" 
                        placeholder="contoh@rs.co.id" 
                        value={regEmail}
                        onChange={(e) => setRegEmail(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div className="mb-3">
                    <label className="form-label text-muted fw-semibold" style={{ fontSize: 12 }}>Kata Sandi</label>
                    <div className="custom-input-group">
                      <span className="input-icon"><i className="bi bi-key" /></span>
                      <input 
                        type="password" 
                        placeholder="Minimal 6 karakter" 
                        value={regPassword}
                        onChange={(e) => setRegPassword(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div className="mb-4">
                    <label className="form-label text-muted fw-semibold" style={{ fontSize: 12 }}>Pilih Peran (Role)</label>
                    <div className="custom-input-group">
                      <span className="input-icon"><i className="bi bi-shield-shaded" /></span>
                      <select 
                        value={regRole}
                        onChange={(e) => setRegRole(e.target.value)}
                        required
                      >
                        <option value="NURSE">Perawat / Bidan</option>
                        <option value="DOCTOR">Dokter Spesialis / Jaga</option>
                        <option value="ADMIN">Administrator Sistem</option>
                      </select>
                    </div>
                  </div>

                  <div className="form-check mb-4 text-start">
                    <input 
                      className="form-check-input" 
                      type="checkbox" 
                      id="termsCheck" 
                      defaultChecked 
                      style={{ cursor: 'pointer' }}
                    />
                    <label className="form-check-label text-muted" htmlFor="termsCheck" style={{ fontSize: 12, cursor: 'pointer', userSelect: 'none' }}>
                      I agree to the <a href="#terms" className="text-decoration-none fw-semibold" style={{ color: '#145c9c' }}>Terms & Conditions</a>
                    </label>
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
