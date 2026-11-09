
Verity: 
Explainable AI Loan Decision DashboardA professional, interactive web dashboard prototype built for an academic research project titled “Enhancing Customer Understanding of AI-Based Loan Approval Decisions.”

1. Project Purpose
The purpose of this dashboard is to demonstrate how plain-language explanations and visual factor cards help non-technical users understand AI-assisted loan approval decisions without relying on opaque "black-box" systems.This is an educational research prototype inspired by Explainable Artificial Intelligence (XAI). All applicant profiles, financial values, and outcomes are predefined illustrative scenarios (Scenarios A–E) and do not represent a live production banking system or external AI model predictions.

2. System Architecture & Data Flow
The application is implemented as a client-side web application designed to support research evaluation:Frontend Layer (src/App.tsx): Built with React, TypeScript, and Vite to deliver a responsive, multi-screen evaluation workflow (Welcome $\rightarrow$ Applicant Overview $\rightarrow$ Loan Decision $\rightarrow$ Explanation Breakdown $\rightarrow$ Educational Guide $\rightarrow$ Scenario Summary).Logic & Assessment Layer (src/financialAssessment.ts): Modular TypeScript functions that manage financial scenario attributes (Monthly Income, DTI Ratio, Credit Score) and bind them reliably across visual components.Data Layer (public/data/verity_cleaned_loan_dataset_1000.csv): Houses structured local datasets and scenario parameters to maintain deterministic, repeatable illustrative outcomes.

3. Tech Stack & Tools
Core Framework: React 18, TypeScriptBuild System: ViteStyling & Design System: Custom CSS / Tailwind CSS (Navy blue primary accent, neutral card structures, soft green/teal supportive indicators, warm amber/coral concern indicators)Testing Suite: Vitest / TypeScript assertion testing (src/financialAssessment.test.ts)Package Management: pnpm4.


   Repository Structure.
├── .figma/                          # Figma interface design references & assets
├── public/
│   ├── favicon.svg                  # Application favicon
│   └── data/
│       └── verity_cleaned_loan_dataset_1000.csv  # Pre-processed loan dataset
├── src/
│   ├── App.tsx                      # Primary dashboard UI & multi-screen flow
│   ├── financialAssessment.ts       # Modular financial logic & data helpers
│   ├── financialAssessment.test.ts  # Automated unit tests for data logic
│   ├── index.css                    # Design system styles & layout resets
│   ├── main.tsx                     # React application entry point
│   └── vite-env.d.ts                # TypeScript environment declarations
├── index.html                       # HTML base template
├── package.json                     # Dependency list & script definitions
├── pnpm-lock.yaml                   # Package lockfile
├── tsconfig.json                    # TypeScript compiler configuration
└── vite.config.ts                   # Vite bundler configuration

4. System Architecture and Data Flow

Frontend (src/App.tsx): Built with React 18, TypeScript, and Vite. Renders the responsive 6-screen workflow including Welcome, Overview, Decision, Explanation, Factor Guide, and Summary.
Logic Layer (src/financialAssessment.ts): Manages client-side state and binds applicant parameters including Income, DTI Ratio, and Credit Score to predefined outcomes and qualitative explanations.
Data Layer (public/data/verity_cleaned_loan_dataset_1000.csv): Stores local synthetic scenario data for deterministic, repeatable evaluation without live ML server dependencies.
Data Flow: Selecting an applicant scenario from A through E in App.tsx triggers financialAssessment.ts to retrieve the corresponding predefined parameters and render the plain-language factor cards and visual breakdown charts.


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
Once started, open your web browser and navigate to the local server URL displayed in your terminal (typically http://localhost:5173). You can now interactively navigate through all dashboard screens and applicant scenarios.

Step 3: Run Unit TestsTo execute automated verification of the underlying financial assessment logic and confirm artifact stability:pnpm test
This runs the test suite (src/financialAssessment.test.ts) and outputs verification results directly to the console.

6. Academic & Research DisclaimerThis artifact is developed strictly for university research and prototype evaluation. It does not run real-time machine learning inference engines, call external credit bureau APIs, or perform live SHAP/LIME calculations. All decision outputs and explanation cards are predefined illustrative examples.
