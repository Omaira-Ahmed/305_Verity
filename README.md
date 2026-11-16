# README

Verity: Explainable AI Loan Decision DashboardA professional, interactive web dashboard prototype built for an academic research project titled “Enhancing Customer Understanding of AI-Based Loan Approval Decisions.”

1. Project Purpose
   The purpose of this dashboard is to demonstrate how plain-language explanations and visual factor cards help users understand loan assessment outcomes without relying on opaque "black-box" systems. 
Verity uses applicant records from a Kaggle loan dataset and applies rule-based decision logic to determine assessment outcomes. It is an educational research prototype and does not represent a live banking system or a trained AI loan prediction model.

2. Tech Stack & Tools
   Core Framework: React 18, TypeScriptBuild System: ViteStyling & Design System: Custom CSS / Tailwind CSS (Navy blue primary accent, neutral card structures, soft green/teal supportive indicators, warm amber/coral concern indicators)Testing Suite: Vitest / TypeScript assertion testing (src/financialAssessment.test.ts)Package Management: pnpm4.


3.  Repository Structure. 
├── .figma/                         
├── public/
│   ├── favicon.svg                
│   └── data/
│       └── verity_cleaned_loan_dataset_1000.csv  
├── src/
│   ├── App.tsx                     
│   ├── financialAssessment.ts       
│   ├── financialAssessment.test.ts  
│   ├── index.css                    
│   ├── main.tsx                    
│   └── vite-env.d.ts               
├── index.html                    
├── package.json                   
├── pnpm-lock.yaml                 
├── tsconfig.json                 
└── vite.config.ts                  

4. System Architecture and Data Flow
* **Frontend Layer (`src/App.tsx`):** Built with React 18, TypeScript, and Vite to deliver a responsive evaluation workflow.
* **Logic Layer (`src/financialAssessment.ts`):** Manages client-side state and evaluates applicant financial information. Rule-based conditions determine the Accepted or Not Accepted outcome, and Debt-to-Income (DTI) is calculated using the applicant's existing monthly debt obligations and gross monthly income.
* **Data Layer (`public/data/verity_cleaned_loan_dataset_1000.csv`):** Stores applicant records sampled from Kaggle. 
  * *Data Source Attribution:* [Insert Kaggle Dataset Link / Source Reference Here]
* **Data Flow:** The application loads applicant rows from the Kaggle dataset, processes them via rule-based logic in `financialAssessment.ts`, and renders the assessment outcome alongside plain-language explanations and visual factor breakdowns.


5. Implementation Records & Technical Documentation
   Configuration Files: The project is set up with Vite (vite.config.ts) for fast bundling, strict TypeScript rules (tsconfig.json), and version control exclusions (.gitignore).
Dependencies: Managed and locked using pnpm (package.json, pnpm-lock.yaml) with packages like React, Vite, and Tailwind CSS.
Code Structure: The UI components live in src/App.tsx, the core financial logic resides in src/financialAssessment.ts, and unit tests are handled in src/financialAssessment.test.ts.


6. How to Reproduce and Run the Artefact Locally
   
   Follow these steps to set up, run, and evaluate the artifact on your local machine.

   Prerequisites
   - Node.js (v18.0.0 or higher)
   - pnpm (installed globally via npm install -g pnpm or corepack enable)

   Step 1: Install DependenciesOpen your terminal in the project root directory and execute: pnpm install
           This installs all required packages and dependencies defined in package.json.

   Step 2: Run the Development ServerLaunch the local development environment:pnpm dev
           Once started, open your web browser and navigate to the local server URL displayed in your terminal (typically http://localhost:5173). You can now                interactively navigate through all dashboard screens and applicant scenarios.

   Step 3: Run Unit TestsTo execute automated verification of the underlying financial assessment logic and confirm artifact stability:pnpm test
           This runs the test suite (src/financialAssessment.test.ts) and outputs verification results directly to the console.

7. Academic & Research Disclaimer

Verity is an academic research prototype designed to demonstrate how financial information and clear explanations can support users' understanding of loan assessment outcomes. It uses rule-based decision logic rather than a trained AI loan prediction model. It does not perform real-time machine learning inference, access external credit bureau APIs, or calculate actual SHAP/LIME explanations. Its assessment outcomes are based on the rules implemented within the prototype and should not be interpreted as actual bank lending decisions.

