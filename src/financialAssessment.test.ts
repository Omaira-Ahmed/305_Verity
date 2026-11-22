import assert from "node:assert/strict";
import test from "node:test";
import { assessApplicant, calculateDTI, checkMonthlyIncome, interpretCreditScore, validateCreditScore } from "./financialAssessment.ts";

const base = { grossMonthlyIncome: 10000, monthlyLoanRepayments: 2000, monthlyCreditCardObligations: 500, creditScore: 650 };

test("calculates DTI below 50%", () => assert.equal(calculateDTI(2500, 10000), 25));
test("accepts DTI exactly at 50%", () => assert.equal(assessApplicant({ ...base, monthlyLoanRepayments: 4500 }).dtiReferenceMet, true));
test("identifies DTI above 50%", () => assert.equal(assessApplicant({ ...base, monthlyLoanRepayments: 5000 }).outcome, "EXCEEDS_SELECTED_REFERENCES"));
test("accepts salary exactly AED 5,000", () => assert.equal(checkMonthlyIncome(5000), true));
test("identifies salary below AED 5,000", () => assert.equal(checkMonthlyIncome(4999), false));
test("supports no existing loans or credit cards", () => assert.equal(assessApplicant({ ...base, monthlyLoanRepayments: 0, monthlyCreditCardObligations: 0 }).currentDTI, 0));
test("calculates estimated DTI with an optional proposed instalment", () => {
  const result = assessApplicant({ ...base, proposedMonthlyInstalment: 1000 });
  assert.equal(result.currentDTI, 25);
  assert.equal(result.estimatedDTI, 35);
});
test("returns further assessment for invalid financial information", () => assert.equal(assessApplicant({ ...base, grossMonthlyIncome: 0 }).outcome, "FURTHER_ASSESSMENT_REQUIRED"));
test("rejects an invalid AECB credit score", () => {
  assert.throws(() => validateCreditScore(299), /300 to 850/);
  assert.throws(() => validateCreditScore(851), /300 to 850/);
});
test("credit score does not independently change the outcome", () => {
  const low = assessApplicant({ ...base, creditScore: 300 });
  const high = assessApplicant({ ...base, creditScore: 850 });
  assert.equal(low.outcome, high.outcome);
  assert.equal(low.outcome, "WITHIN_SELECTED_REFERENCES");
});
test("assigns consistent project credit-score categories", () => {
  assert.equal(interpretCreditScore(790).category, "Very Low Risk");
  assert.equal(interpretCreditScore(789).category, "Low Risk");
  assert.equal(interpretCreditScore(756).category, "Low Risk");
  assert.equal(interpretCreditScore(755).category, "Medium Risk");
  assert.equal(interpretCreditScore(674).category, "Medium Risk");
  assert.equal(interpretCreditScore(673).category, "High Risk");
  assert.equal(interpretCreditScore(524).category, "High Risk");
  assert.equal(interpretCreditScore(523).category, "Very High Risk");
});
