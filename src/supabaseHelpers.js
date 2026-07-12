import { supabase } from './supabaseClient'

function calcUmur(tglLahir) {
  if (!tglLahir) return 0;
  const today = new Date();
  const birth = new Date(tglLahir);
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

function mapGenderToDb(gender) {
  if (gender === 'Laki-laki') return 'MALE';
  if (gender === 'Perempuan') return 'FEMALE';
  return 'UNKNOWN';
}

function mapGenderToFrontend(gender) {
  if (gender === 'MALE') return 'Laki-laki';
  if (gender === 'FEMALE') return 'Perempuan';
  return 'Laki-laki';
}

function mapPatientStatusToDb(status) {
  if (status === 'BPJS') return 'BPJS';
  if (status === 'Umum') return 'GENERAL';
  if (status === 'Asuransi') return 'INSURANCE';
  if (status === 'Perusahaan') return 'COMPANY';
  return 'UNKNOWN';
}

function mapPatientStatusToFrontend(status) {
  if (status === 'BPJS') return 'BPJS';
  if (status === 'GENERAL') return 'Umum';
  if (status === 'INSURANCE') return 'Asuransi';
  if (status === 'COMPANY') return 'Perusahaan';
  return 'Umum';
}

function mapBloodTypeToDb(bt) {
  if (!bt || bt === '-') return 'UNKNOWN';
  const clean = bt.replace(/[+-]/g, '').trim();
  if (['A', 'B', 'AB', 'O'].includes(clean)) return clean;
  return 'UNKNOWN';
}

function mapBloodTypeToFrontend(bt) {
  if (!bt || bt === 'UNKNOWN') return '-';
  return bt;
}

function mapAVPUToDb(avpu) {
  if (avpu === 'Alert') return 'A';
  if (avpu === 'Voice') return 'V';
  if (avpu === 'Pain') return 'P';
  if (avpu === 'Unresponsive') return 'U';
  return null;
}

function mapAVPUToFrontend(avpu) {
  if (avpu === 'A') return 'Alert';
  if (avpu === 'V') return 'Voice';
  if (avpu === 'P') return 'Pain';
  if (avpu === 'U') return 'Unresponsive';
  return 'Alert';
}

function mapTriageLevelToDb(risk) {
  if (risk === 'High') return 'RED';
  if (risk === 'Medium') return 'YELLOW';
  return 'GREEN';
}

function mapTriageLevelToFrontend(level) {
  if (level === 'RED') return 'High';
  if (level === 'YELLOW') return 'Medium';
  return 'Low';
}

export async function fetchActiveVisits() {
  const { data, error } = await supabase
    .from('patient_visits')
    .select(`
      visit_id,
      arrival_time,
      chief_complaint,
      visit_status,
      patient:patients (
        patient_id,
        full_name,
        nik,
        insurance_number,
        date_of_birth,
        gender,
        address,
        phone_number,
        emergency_contact_name,
        emergency_contact_relation,
        patient_status
      ),
      anthropometric:anthropometric_records (
        record_id,
        weight_kg,
        height_cm,
        bmi,
        head_circumference,
        upper_arm_circumference,
        blood_type
      ),
      vitals:vital_signs (
        vital_id,
        respiratory_rate,
        oxygen_saturation,
        oxygen_supplementation,
        temperature,
        systolic_bp,
        diastolic_bp,
        heart_rate,
        avpu
      ),
      triage:triage_results (
        triage_id,
        total_score,
        triage_level,
        red_trigger,
        score_breakdown,
        recommended_actions
      ),
      assessments:doctor_assessments (
        assessment_id,
        clinical_notes
      )
    `)
    .order('arrival_time', { ascending: false });

  if (error) {
    console.error('Error fetching visits:', error.message);
    return [];
  }

  return (data || []).map(visit => {
    const p = visit.patient || {};
    const anthro = visit.anthropometric || {};
    // Get the most recent vitals (ordered by recorded_at or simply take the last element)
    const vitals = (visit.vitals && visit.vitals[visit.vitals.length - 1]) || {};
    const triage = visit.triage || {};
    // Get the most recent assessment
    const assessment = (visit.assessments && visit.assessments[visit.assessments.length - 1]) || {};

    return {
      id: visit.visit_id,
      patientId: p.patient_id,
      nama: p.full_name || '',
      nik: p.nik || '',
      noBpjs: p.insurance_number || '',
      tglLahir: p.date_of_birth || '',
      umur: calcUmur(p.date_of_birth),
      jenisKelamin: mapGenderToFrontend(p.gender),
      alamat: p.address || '',
      noHp: p.phone_number || '',
      namaKontak: p.emergency_contact_name || '',
      hubKontak: p.emergency_contact_relation || '',
      noHpKontak: p.phone_number || '', // default to phone_number
      statusPasien: mapPatientStatusToFrontend(p.patient_status),
      tglDaftar: visit.arrival_time ? visit.arrival_time.slice(0, 10) : '',

      keluhan: visit.chief_complaint || '',
      beratBadan: anthro.weight_kg !== undefined && anthro.weight_kg !== null ? anthro.weight_kg : '',
      tinggiBadan: anthro.height_cm !== undefined && anthro.height_cm !== null ? anthro.height_cm : '',
      imt: anthro.bmi !== undefined && anthro.bmi !== null ? anthro.bmi : '',
      lingkarKepala: anthro.head_circumference !== undefined && anthro.head_circumference !== null ? anthro.head_circumference : '',
      lingkarLengan: anthro.upper_arm_circumference !== undefined && anthro.upper_arm_circumference !== null ? anthro.upper_arm_circumference : '',
      golDarah: mapBloodTypeToFrontend(anthro.blood_type),

      rr: vitals.respiratory_rate !== undefined && vitals.respiratory_rate !== null ? vitals.respiratory_rate : '',
      spo2: vitals.oxygen_saturation !== undefined && vitals.oxygen_saturation !== null ? vitals.oxygen_saturation : '',
      suplemenO2: vitals.oxygen_supplementation ? 'Ya' : 'Tidak',
      suhu: vitals.temperature !== undefined && vitals.temperature !== null ? vitals.temperature : '',
      sistolik: vitals.systolic_bp !== undefined && vitals.systolic_bp !== null ? vitals.systolic_bp : '',
      diastolik: vitals.diastolik !== undefined && vitals.diastolik !== null ? vitals.diastolik : '',
      nadi: vitals.heart_rate !== undefined && vitals.heart_rate !== null ? vitals.heart_rate : '',
      avpu: mapAVPUToFrontend(vitals.avpu),

      meowsScore: triage.total_score || 0,
      triageRisk: mapTriageLevelToFrontend(triage.triage_level),
      tglTriage: visit.arrival_time ? new Date(visit.arrival_time).toLocaleDateString("id-ID", {
        year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit"
      }) : '',

      diagnosa: assessment.clinical_notes || '',
      statusDiagnosis: assessment.clinical_notes ? 'Sudah Diperiksa' : 'Belum Diperiksa'
    };
  });
}

export async function insertNewVisit(formData) {
  const patientRecord = {
    full_name: formData.nama,
    nik: formData.nik,
    insurance_number: formData.noBpjs || null,
    date_of_birth: formData.tglLahir || null,
    gender: mapGenderToDb(formData.jenisKelamin),
    address: formData.alamat || null,
    phone_number: formData.noHp || null,
    emergency_contact_name: formData.namaKontak || null,
    emergency_contact_relation: formData.hubKontak || null,
    patient_status: mapPatientStatusToDb(formData.statusPasien)
  };

  let patientId;
  const { data: existingPatients, error: searchError } = await supabase
    .from('patients')
    .select('patient_id')
    .eq('nik', formData.nik);
    
  if (searchError) {
    throw new Error('Error searching patients: ' + searchError.message);
  }

  if (existingPatients && existingPatients.length > 0) {
    patientId = existingPatients[0].patient_id;
    const { error: updateError } = await supabase
      .from('patients')
      .update(patientRecord)
      .eq('patient_id', patientId);
    if (updateError) {
      throw new Error('Error updating patient: ' + updateError.message);
    }
  } else {
    const { data: newPatients, error: insertError } = await supabase
      .from('patients')
      .insert([patientRecord])
      .select('patient_id');
    if (insertError) {
      throw new Error('Error creating patient: ' + insertError.message);
    }
    patientId = newPatients[0].patient_id;
  }

  const visitRecord = {
    patient_id: patientId,
    chief_complaint: '',
    visit_status: 'WAITING'
  };

  const { data: newVisits, error: visitError } = await supabase
    .from('patient_visits')
    .insert([visitRecord])
    .select('visit_id');

  if (visitError) {
    throw new Error('Error creating visit: ' + visitError.message);
  }

  return newVisits[0].visit_id;
}

export async function updateTriageDetails(visitId, triageData) {
  const { error: visitError } = await supabase
    .from('patient_visits')
    .update({
      chief_complaint: triageData.keluhan,
      visit_status: 'IN_TREATMENT'
    })
    .eq('visit_id', visitId);

  if (visitError) {
    throw new Error('Error updating visit complaint: ' + visitError.message);
  }

  const anthroRecord = {
    visit_id: visitId,
    weight_kg: triageData.beratBadan !== '' ? parseFloat(triageData.beratBadan) : null,
    height_cm: triageData.tinggiBadan !== '' ? parseFloat(triageData.tinggiBadan) : null,
    head_circumference: triageData.lingkarKepala !== '' ? parseFloat(triageData.lingkarKepala) : null,
    upper_arm_circumference: triageData.lingkarLengan !== '' ? parseFloat(triageData.lingkarLengan) : null,
    blood_type: mapBloodTypeToDb(triageData.golDarah)
  };

  const { error: anthroError } = await supabase
    .from('anthropometric_records')
    .upsert([anthroRecord], { onConflict: 'visit_id' });

  if (anthroError) {
    throw new Error('Error updating anthropometric records: ' + anthroError.message);
  }

  const vitalRecord = {
    visit_id: visitId,
    respiratory_rate: triageData.rr !== '' ? parseInt(triageData.rr) : null,
    oxygen_saturation: triageData.spo2 !== '' ? parseFloat(triageData.spo2) : null,
    oxygen_supplementation: triageData.suplemenO2 === 'Ya',
    temperature: triageData.suhu !== '' ? parseFloat(triageData.suhu) : null,
    systolic_bp: triageData.sistolik !== '' ? parseInt(triageData.sistolik) : null,
    diastolic_bp: triageData.diastolik !== '' ? parseInt(triageData.diastolik) : null,
    heart_rate: triageData.nadi !== '' ? parseInt(triageData.nadi) : null,
    avpu: mapAVPUToDb(triageData.avpu)
  };

  const { data: newVitals, error: vitalError } = await supabase
    .from('vital_signs')
    .insert([vitalRecord])
    .select('vital_id');

  if (vitalError) {
    throw new Error('Error recording vital signs: ' + vitalError.message);
  }

  const vitalId = newVitals[0].vital_id;

  const triageRecord = {
    visit_id: visitId,
    vital_id: vitalId,
    total_score: triageData.meowsScore || 0,
    triage_level: mapTriageLevelToDb(triageData.triageRisk),
    red_trigger: triageData.meowsScore >= 7
  };

  const { error: triageError } = await supabase
    .from('triage_results')
    .upsert([triageRecord], { onConflict: 'visit_id' });

  if (triageError) {
    throw new Error('Error recording triage results: ' + triageError.message);
  }
}

export async function saveDoctorDiagnosis(visitId, clinicalNotes) {
  const assessmentRecord = {
    visit_id: visitId,
    clinical_notes: clinicalNotes
  };

  const { error: assessmentError } = await supabase
    .from('doctor_assessments')
    .insert([assessmentRecord]);

  if (assessmentError) {
    throw new Error('Error recording doctor assessment: ' + assessmentError.message);
  }

  const { error: visitError } = await supabase
    .from('patient_visits')
    .update({
      visit_status: 'DISCHARGED'
    })
    .eq('visit_id', visitId);

  if (visitError) {
    throw new Error('Error updating visit status: ' + visitError.message);
  }
}

export async function deleteVisit(visitId) {
  await supabase.from('doctor_assessments').delete().eq('visit_id', visitId);
  await supabase.from('triage_results').delete().eq('visit_id', visitId);
  await supabase.from('vital_signs').delete().eq('visit_id', visitId);
  await supabase.from('anthropometric_records').delete().eq('visit_id', visitId);
  
  const { error } = await supabase
    .from('patient_visits')
    .delete()
    .eq('visit_id', visitId);
    
  if (error) {
    throw new Error('Error deleting visit: ' + error.message);
  }
}
