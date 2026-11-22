export type ApplicantFinancials = {
  grossMonthlyIncome: number;
  monthlyLoanRepayments: number;
  monthlyCreditCardObligations: number;
  creditScore: number;
  proposedMonthlyInstalment?: number;
};

export type AssessmentOutcome =
  | "WITHIN_SELECTED_REFERENCES"
  | "EXCEEDS_SELECTED_REFERENCES"
  | "FURTHER_ASSESSMENT_REQUIRED";

export type AssessmentResult = {
  currentDTI: number;
  estimatedDTI: number | null;
  salaryReferenceMet: boolean;
  dtiReferenceMet: boolean;
  creditScoreValid: boolean;
  outcome: AssessmentOutcome;
};

export type CreditScoreInterpretation = {
  category: string;
  risk: string;
  supportsProfile: boolean;
};

export function calculateDTI(monthlyCommitments: number, grossMonthlyIncome: number): number {
  if (!Number.isFinite(monthlyCommitments) || !Number.isFinite(grossMonthlyIncome) || monthlyCommitments < 0 || grossMonthlyIncome <= 0) {
    throw new Error("Enter valid financial information.");
  }
  return (monthlyCommitments / grossMonthlyIncome) * 100;
}

export function checkMonthlyIncome(monthlyIncome: number): boolean {
  if (!Number.isFinite(monthlyIncome) || monthlyIncome <= 0) throw new Error("Enter a valid monthly income.");
  return monthlyIncome >= 5000;
}

export function validateCreditScore(score: number): boolean {
  if (!Number.isFinite(score) || score < 300 || score > 850) throw new Error("Enter a valid AECB credit score from 300 to 850.");
  return true;
}

export function interpretCreditScore(score: number): CreditScoreInterpretation {
  if (score >= 790 && score <= 850) return { category: "Very Low Risk", risk: "Strong credit profile", supportsProfile: true };
  if (score >= 756) return { category: "Low Risk", risk: "Lower credit risk", supportsProfile: true };
  if (score >= 674) return { category: "Medium Risk", risk: "Moderate credit risk", supportsProfile: false };
  if (score >= 524) return { category: "High Risk", risk: "Higher credit risk", supportsProfile: false };
  if (score >= 300) return { category: "Very High Risk", risk: "Significantly higher credit risk", supportsProfile: false };
  return { category: "Score requires review", risk: "Enter a score from 300 to 850", supportsProfile: false };
}

export function assessApplicant(data: ApplicantFinancials): AssessmentResult {
  try {
    const { grossMonthlyIncome, monthlyLoanRepayments, monthlyCreditCardObligations, creditScore, proposedMonthlyInstalment } = data;
    const values = [grossMonthlyIncome, monthlyLoanRepayments, monthlyCreditCardObligations, creditScore, ...(proposedMonthlyInstalment === undefined ? [] : [proposedMonthlyInstalment])];
    if (values.some(value => !Number.isFinite(value) || value < 0) || grossMonthlyIncome <= 0) throw new Error("Invalid assessment information.");
    const monthlyCommitments = monthlyLoanRepayments + monthlyCreditCardObligations;
    const currentDTI = calculateDTI(monthlyCommitments, grossMonthlyIncome);
    const estimatedDTI = proposedMonthlyInstalment === undefined ? null : calculateDTI(monthlyCommitments + proposedMonthlyInstalment, grossMonthlyIncome);
    const relevantDTI = estimatedDTI ?? currentDTI;
    const salaryReferenceMet = checkMonthlyIncome(grossMonthlyIncome);
    const dtiReferenceMet = relevantDTI <= 50;
    return {
      currentDTI, estimatedDTI, salaryReferenceMet, dtiReferenceMet,
      creditScoreValid: validateCreditScore(creditScore),
      outcome: salaryReferenceMet && dtiReferenceMet ? "WITHIN_SELECTED_REFERENCES" : "EXCEEDS_SELECTED_REFERENCES",
    };
  } catch {
    return { currentDTI: 0, estimatedDTI: null, salaryReferenceMet: false, dtiReferenceMet: false, creditScoreValid: false, outcome: "FURTHER_ASSESSMENT_REQUIRED" };
  }
}
