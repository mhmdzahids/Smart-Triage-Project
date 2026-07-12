from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from meows_engine.recom import calculate_meows_score

app = FastAPI(title="Smart Triage MEOWS Engine API")

# Enable CORS for the React development server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class PatientData(BaseModel):
    respiratory_rate: int
    oxygen_saturation: int
    oxygen_supplementation: bool
    temperature: float
    systolic_bp: int
    diastolic_bp: int
    heart_rate: int
    consciousness: str

@app.post("/calculate")
def calculate_score(data: PatientData):
    try:
        patient_dict = {
            "respiratory_rate": data.respiratory_rate,
            "oxygen_saturation": data.oxygen_saturation,
            "oxygen_supplementation": data.oxygen_supplementation,
            "temperature": data.temperature,
            "systolic_bp": data.systolic_bp,
            "diastolic_bp": data.diastolic_bp,
            "heart_rate": data.heart_rate,
            "consciousness": data.consciousness,
        }
        result = calculate_meows_score(patient_dict)
        return result
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
