"""
Rule-Based MEOWS (Modified Early Obstetric Warning Score) Scoring Engine
Smart Triage System

Setiap parameter fisiologis diberi skor 0-3 berdasarkan tabel triage.
Skor total menentukan kategori risiko pasien:
    - Low Risk      : total skor 1-4
    - Moderate Risk  : total skor 5-6
    - High Risk      : total skor >= 7 ATAU ada satu parameter dengan skor 3 (red trigger)
"""


def score_respiratory_rate(rr):
    """Respiratory Rate (x/min)"""
    if rr < 12 or rr > 25:
        return 3
    elif 21 <= rr <= 25:
        return 2
    elif 12 <= rr <= 20:
        return 0
    return 0


def score_oxygen_saturation(spo2):
    """Oxygen Saturation (%)"""
    if spo2 < 92:
        return 3
    elif 92 <= spo2 <= 95:
        return 2
    elif spo2 > 95:
        return 0
    return 0


def score_oxygen_supplementation(is_supplemented):
    """Oxygen Supplementation (True/False)"""
    return 2 if is_supplemented else 0


def score_temperature(temp):
    """Temperature (°C)"""
    if temp < 36 or temp > 37.7:
        return 3
    elif 37.3 <= temp <= 37.7:
        return 2
    elif 36.1 <= temp <= 37.2:
        return 0
    return 0


def score_systolic_bp(sbp):
    """Systolic Blood Pressure (mmHg)"""
    if sbp < 90 or sbp > 160:
        return 3
    elif 151 <= sbp <= 160:
        return 2
    elif 90 <= sbp <= 150:
        return 0
    return 0


def score_diastolic_bp(dbp):
    """Diastolic Blood Pressure (mmHg)"""
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
    """Heart Rate (x/min)"""
    if hr < 50 or hr > 120:
        return 3
    elif (50 <= hr <= 60) or (111 <= hr <= 120):
        return 2
    elif 101 <= hr <= 110:
        return 1
    elif 61 <= hr <= 100:
        return 0
    return 0


def score_consciousness(avpu):
    avpu = avpu.upper()
    if avpu == 'A':
        return 0
    elif avpu == 'V':
        return 1
    elif avpu in ('P', 'U'):
        return 3
    return 0


def calculate_meows_score(patient_data: dict) -> dict:
    """
    Menghitung total skor MEOWS dan kategori risiko pasien.

    patient_data harus berisi key:
        respiratory_rate, oxygen_saturation, oxygen_supplementation,
        temperature, systolic_bp, diastolic_bp, heart_rate, consciousness

    Return:
        dict berisi rincian skor per parameter, total skor, dan kategori risiko
    """
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

    if has_red_trigger or total_score >= 7:
        risk_level = "RED"
    elif 5 <= total_score <= 6:
        risk_level = "YELLOW"
    else:
        risk_level = "GREEN"

    return {
        "scores": scores,
        "total_score": total_score,
        "has_red_trigger": has_red_trigger,
        "risk_level": risk_level,
    }


if __name__ == "__main__":
    # Contoh data dummy untuk testing manual
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
    print(result)
