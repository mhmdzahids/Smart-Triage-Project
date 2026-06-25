import { useState } from 'react'
import AdminPanel from './AdminPanel'
import NursePanel from './NursePanel'
import DoctorPanel from './DoctorPanel'

function App() {
  const [role, setRole] = useState('admin')

  return (
    <>
      {/* Floating Role Switcher */}
      <div 
        style={{ 
          position: 'fixed', 
          bottom: '20px', 
          right: '20px', 
          zIndex: 9999,
          boxShadow: '0 4px 20px rgba(0,0,0,0.15)'
        }}
        className="rounded-pill p-1 bg-white border d-flex gap-1"
      >
        <button
          onClick={() => setRole('admin')}
          className="btn btn-sm rounded-pill px-3 transition-all"
          style={{
            background: role === 'admin' ? '#0f4c81' : 'transparent',
            color: role === 'admin' ? '#fff' : '#64748b',
            border: 'none',
            fontSize: '12px',
            fontWeight: '600'
          }}
        >
          <i className="bi bi-shield-lock me-1" />
          Admin Panel
        </button>
        <button
          onClick={() => setRole('nurse')}
          className="btn btn-sm rounded-pill px-3 transition-all"
          style={{
            background: role === 'nurse' ? '#0d9488' : 'transparent',
            color: role === 'nurse' ? '#fff' : '#64748b',
            border: 'none',
            fontSize: '12px',
            fontWeight: '600'
          }}
        >
          <i className="bi bi-activity me-1" />
          Nurse Panel
        </button>
        <button
          onClick={() => setRole('doctor')}
          className="btn btn-sm rounded-pill px-3 transition-all"
          style={{
            background: role === 'doctor' ? '#4f46e5' : 'transparent',
            color: role === 'doctor' ? '#fff' : '#64748b',
            border: 'none',
            fontSize: '12px',
            fontWeight: '600'
          }}
        >
          <i className="bi bi-shield-shaded me-1" />
          Doctor Panel
        </button>
      </div>

      {role === 'admin' && <AdminPanel />}
      {role === 'nurse' && <NursePanel />}
      {role === 'doctor' && <DoctorPanel />}
    </>
  )
}

export default App



