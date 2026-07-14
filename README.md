# Smart-Triage (Modified Early Obstetric Warning Score - MEOWS)

Smart-Triage is a modern, web-based clinical triage system designed for Emergency Departments (IGD) to monitor and categorize obstetric patients. By utilizing the **Modified Early Obstetric Warning Score (MEOWS)** algorithm, the platform helps medical staff dynamically assess patient deterioration risk and triggers immediate clinical response pathways.

---

## 🌟 Key Features

The platform is designed around three dedicated portals tailored to distinct hospital roles:

### 1. 🛡️ Admin Portal
* **Dashboard Analytics**: Real-time summary cards highlighting overall registered patient counts categorized by payment status (BPJS, Umum, Asuransi, Perusahaan).
* **Patient Management (`Data Pasien`)**: Comprehensive database panel to search, filter, edit, or delete patient details. Includes a **CSV exporter** for reports.
* **Patient Registration (`Tambah Pasien`)**: Clean identity intake forms covering demographics, BPJS verification, and emergency contact mappings.

### 2. 🩺 Nurse Portal (`Triage & Fisik`)
* **Live IGD Queue**: Responsive sidebar list of active patients with risk indicator tags.
* **Physical & Vital Monitoring**: Input logs for vital parameters:
  * Anthropometry (Weight, Height, Auto-calculated BMI indicator badge).
  * Vital Signs (Respiratory Rate, SpO2, Oxygen Support toggles, Temp, Blood Pressure, Heart Rate, and AVPU score).
* **Automatic MEOWS Triage Calculator**: Real-time calculation of MEOWS scores mapping patients into distinct risk groups:
  * 🔴 **High Risk (Red)**: Score 6+ or any trigger parameters. Immediate response pathway activated.
  * 🟡 **Medium Risk (Yellow)**: Score 4-5. Frequent vital sign checks required.
  * 🟢 **Low Risk (Green)**: Score 0-3. Standard observation queue.
* **Clinical Response Guidance**: Displays standard clinical response guidelines based on the severity tier.

### 3. 🥼 Doctor Portal (`Diagnosis & Perawatan`)
* **Priority Queue**: Dynamic dashboard listing patients sorted by clinical urgency (High Risk/Red prioritized at the top).
* **Physical & Vital Logs**: Read-only display of nurse vital check inputs.
* **Inline Edits**: Allows doctors to correct or update parameters directly if necessary.
* **Diagnosis Form**: Workspace for entering chief complaints and diagnosing main conditions / ICD-10 notes.

---

## 🛠️ Tech Stack & Architecture

* **Frontend Framework**: [React.js](https://react.dev/) initialized with [Vite](https://vitejs.dev/) for fast HMR.
* **Styling**: [Bootstrap 5](https://getbootstrap.com/) for grid structure coupled with a custom modern design system (Inter and Plus Jakarta Sans typography, custom card shadows, and smooth transitions).
* **Icons**: [Bootstrap Icons](https://icons.getbootstrap.com/).
* **Backend Database**: [Supabase](https://supabase.com/) (PostgreSQL) for secure auth session management, real-time sync, and relational tables.

---

## ⚙️ Developer Tools & Debugging Shortcut

To assist during development, testing, and role simulation:
* **Role Switcher**: A floating selector panel sits at the bottom of the viewport allowing developers to swap roles between **Admin**, **Perawat**, and **Dokter**.
* **Keystroke Toggle (Desktop)**: Press `Ctrl + \`` (Ctrl + Backtick) to show or hide the switcher.
* **Tap Gesture Toggle (Mobile/Remote Debug)**: Tapping the top-left **"Smart-Triage"** logo area 5 times within 2 seconds toggles the visibility of the switcher.

---

## 🚀 Setup & Installation

### Prerequisites
Make sure you have [Node.js](https://nodejs.org/) (v16+) and [npm](https://www.npmjs.com/) installed.

### 1. Clone the Repository
```bash
git clone https://github.com/mhmdzahids/smart-triage.git
cd smart-triage
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Configure Supabase Environment Variables
Create a `.env` file in the root folder and add your credentials:
```env
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

### 4. Database Setup
Initialize the database schemas by importing the SQL structure from the [`schema.sql`](file:///c:/Users/Zahid/smart-triage/schema.sql) file into your Supabase SQL Editor.

### 5. Run the Local Development Server
```bash
npm run dev
```
Open your browser and navigate to `http://localhost:5173`.

---

## 🔒 Default Test Accounts

For testing the portals, you can log in using:
* **Email**: `mhmdzahids@gmail.com`
* **Password**: `test123`
