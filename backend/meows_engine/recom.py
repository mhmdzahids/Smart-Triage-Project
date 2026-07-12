def score_respiratory_rate(rr):
    if rr < 12 or rr > 25:
        return 3
    elif 21 <= rr <= 25:
        return 2
    elif 12 <= rr <= 20:
        return 0
    return 0

def score_oxygen_saturation(spo2):
    if spo2 < 92:
        return 3
    elif 92 <= spo2 <= 95:
        return 2
    elif spo2 > 95:
        return 0
    return 0

def score_oxygen_supplementation(is_supplemented):
    return 2 if is_supplemented else 0

def score_temperature(temp):
    # FIX: lower bound of Normal band widened to 36.0 (was 36.1, left a gap)
    # FIX: the 37.2 < temp < 37.3 zone is undefined in the source table;
    # scored as Sedang(2) as a conservative (safer) default.
    if temp < 36 or temp > 37.7:
        return 3
    elif temp > 37.2 and temp <= 37.7:
        return 2
    elif 36 <= temp <= 37.2:
        return 0
    return 0

def score_systolic_bp(sbp):
    if sbp < 90 or sbp > 160:
        return 3
    elif 151 <= sbp <= 160:
        return 2
    elif 90 <= sbp <= 150:
        return 0
    return 0

def score_diastolic_bp(dbp):
    if dbp < 60 or dbp > 110:
        return 3
    elif 101 <= dbp <= 110:
        return 2
    elif 91 <= dbp <= 100:
        return 1
    elif 60 <= dbp <= 90:
        return 0
    return 0

def score_heart_rate(hr):
    # FIX: Sedang(2) lower band was 50-60 (overlapped Normal's 60), now 50-59
    # FIX: Normal band now starts at 60 (was 61, excluding 60 itself)
    if hr < 50 or hr > 120:
        return 3
    elif (50 <= hr <= 59) or (111 <= hr <= 120):
        return 2
    elif 101 <= hr <= 110:
        return 1
    elif 60 <= hr <= 100:
        return 0
    return 0

def score_consciousness(avpu):
    # FIX: was comparing the WHOLE string ("alert","pain",...) to 'A'/'V'/'P'/'U',
    # so anything except exactly "A"/"V"/"P"/"U" silently fell through to 0.
    # Now only the first letter (case-insensitive) is checked.
    code = avpu.strip().upper()[0]
    if code == 'A':
        return 0
    elif code == 'V':
        return 1
    elif code in ('P', 'U'):
        return 3
    return 0

RECOMMENDATIONS = {
    "NORMAL": {
        "label": "Normal",
        "icon": "\U0001F7E2",
        "actions": [
            "Observasi: Lanjutkan pemantauan tanda vital sesuai jadwal rutin ruangan.",
            "Edukasi: Berikan edukasi pasien terkait tanda bahaya maternal (kehamilan, persalinan, nifas).",
            "Dokumentasi: Catat seluruh hasil pemeriksaan pada rekam medis.",
        ],
    },
    "LOW": {
        "label": "Low Risk",
        "icon": "\U0001F7E1",
        "actions": [
            "Re-asesmen: Lakukan penilaian ulang terhadap kondisi klinis pasien secara menyeluruh.",
            "Re-evaluasi TTV: Ulangi pemeriksaan tanda vital dalam 4-6 jam.",
            "Etiologi: Identifikasi dan analisis kemungkinan penyebab deviasi/abnormalitas.",
            "Eskalasi: Laporkan kepada DPJP atau bidan penanggung jawab jika skor EWS meningkat atau klinis memburuk.",
        ],
    },
    "MODERATE": {
        "label": "Moderate Risk",
        "icon": "\U0001F7E0",
        "actions": [
            "Monitoring Ketat: Tingkatkan frekuensi pemantauan tanda vital menjadi setiap 1-2 jam.",
            "Notifikasi Segera: Segera laporkan kondisi pasien kepada dokter jaga ruangan/residen terkait.",
            "Diagnostik: Jadwalkan atau lakukan pemeriksaan diagnostik tambahan yang relevan.",
        ],
    },
    "HIGH": {
        "label": "High Risk",
        "icon": "\U0001F534",
        "actions": [
            "Panggil Bantuan: Segera aktivasi Tim Kegawatdaruratan Maternal (Code Blue Maternal).",
            "Kontinu TTV: Monitor tanda vital secara kontinu atau minimal setiap 15-30 menit.",
            "Konsul Spesialis: Laporkan langsung (via telepon/SBAR) ke DPJP Obstetri & Ginekologi (Sp.OG) dan/atau Dokter Spesialis Anestesi.",
            "Stabilisasi: Pastikan akses IV line adekuat (pasang jalur infus ganda jika diperlukan), berikan terapi oksigenasi optimal, dan siapkan peralatan resusitasi di dekat pasien.",
        ],
    },
}

def calculate_meows_score(patient_data: dict) -> dict:
    scores = {
        "respiratory_rate": score_respiratory_rate(patient_data["respiratory_rate"]),
        "oxygen_saturation": score_oxygen_saturation(patient_data["oxygen_saturation"]),
        "oxygen_supplementation": score_oxygen_supplementation(patient_data["oxygen_supplementation"]),
        "temperature": score_temperature(patient_data["temperature"]),
        "systolic_bp": score_systolic_bp(patient_data["systolic_bp"]),
        "diastolic_bp": score_diastolic_bp(patient_data["diastolic_bp"]),
        "heart_rate": score_heart_rate(patient_data["heart_rate"]),
        "consciousness": score_consciousness(patient_data["consciousness"]),
    }
    total_score = sum(scores.values())
    has_red_trigger = any(s == 3 for s in scores.values())

    if total_score == 0:
        risk_key = "NORMAL"
    elif has_red_trigger or total_score >= 7:
        risk_key = "HIGH"
    elif 5 <= total_score <= 6:
        risk_key = "MODERATE"
    else:
        risk_key = "LOW"

    return {
        "scores": scores,
        "total_score": total_score,
        "has_red_trigger": has_red_trigger,
        "risk_level": risk_key,
        "risk_label": RECOMMENDATIONS[risk_key]["label"],
        "recommendations": RECOMMENDATIONS[risk_key]["actions"],
    }

if __name__ == "__main__":
    sample_patient = {
        "respiratory_rate": 22,
        "oxygen_saturation": 94,
        "oxygen_supplementation": True,
        "temperature": 37.5,
        "systolic_bp": 145,
        "diastolic_bp": 95,
        "heart_rate": 105,
        "consciousness": "alert",
    }
    result = calculate_meows_score(sample_patient)
    print("Hasil Skor MEOWS:")
    for k, v in result.items():
        print(f"  {k}: {v}")
