import { FormEvent, ReactNode, useEffect, useMemo, useState } from "react";
import { assessApplicant, interpretCreditScore, type AssessmentOutcome } from "./financialAssessment";

type HistoricalApplicant = {
  applicant_id: string;
  monthly_income_usd: number;
  monthly_debt_obligations_usd: number;
  dti_ratio: number;
  credit_score: number;
  loan_amount_usd: number;
  employment_status: string;
};

type Submission = {
  id: string;
  name: string;
  income: number;
  debt: number;
  creditCardObligations?: number;
  score: number;
  amount: number;
  instalment: number;
  employment: string;
  employer: string;
  dti: number;
  createdAt: string;
  currency?: "AED";
  result?: Result;
  ownerEmail?: string;
};

type Result = "Within Selected Reference Checks" | "Exceeds Selected Reference Checks" | "Further Assessment Required";
type Role = "individual" | "advisor";
type SessionUser = { email: string; name: string; role: Role };
type Assessment = {
  key: string;
  id: string;
  name?: string;
  income: number;
  debt: number;
  creditCardObligations: number;
  instalment: number;
  loanAmount: number;
  dti: number;
  creditScore: number;
  employment: string;
  date?: string;
  source: "Historical CSV" | "Local assessment";
  result: Result;
  currentDTI: number;
  estimatedDTI: number | null;
};
type AppPage = "dashboard" | "applicants" | "guide" | "new" | "submitted" | "detail";
type PublicPage = "welcome" | "signup" | "login";

const USD_TO_AED = 3.6725;
const STORAGE_KEY = "verity-submitted-applications";
const money = new Intl.NumberFormat("en-AE", { style: "currency", currency: "AED", minimumFractionDigits: 2, maximumFractionDigits: 2 });
const number = new Intl.NumberFormat("en-US");

function Icon({ name, size = 19 }: { name: string; size?: number }) {
  const paths: Record<string, ReactNode> = {
    dashboard: <><rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/></>,
    users: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></>,
    explain: <><circle cx="12" cy="12" r="9"/><path d="M9.7 9a2.5 2.5 0 1 1 3.6 2.25c-.9.47-1.3.93-1.3 1.75M12 17h.01"/></>,
    plus: <path d="M12 5v14M5 12h14"/>,
    file: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M8 13h8M8 17h5"/></>,
    search: <><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></>,
    arrow: <path d="m9 18 6-6-6-6"/>,
    back: <path d="m15 18-6-6 6-6"/>,
    trend: <><path d="m3 17 6-6 4 4 8-9"/><path d="M15 6h6v6"/></>,
    wallet: <><path d="M3 6h16a2 2 0 0 1 2 2v11H5a2 2 0 0 1-2-2V6Z"/><path d="M3 6V5a2 2 0 0 1 2-2h12v3M16 12h5"/></>,
    score: <><path d="M4 19a8 8 0 1 1 16 0"/><path d="m12 15 4-5"/></>,
    check: <path d="m5 12 4 4L19 6"/>,
    info: <><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/></>,
    menu: <path d="M4 6h16M4 12h16M4 18h16"/>,
    close: <path d="m6 6 12 12M18 6 6 18"/>,
    lock: <><rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></>,
    logout: <><path d="M10 17l5-5-5-5M15 12H3M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/></>,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>{paths[name]}</svg>;
}

function parseCsv(text: string): HistoricalApplicant[] {
  const [header, ...rows] = text.replace(/^\uFEFF/, "").trim().split(/\r?\n/);
  const keys = header.split(",");
  return rows.map((row) => {
    const item = Object.fromEntries(row.split(",").map((value, i) => [keys[i], value]));
    return {
      applicant_id: item.applicant_id, monthly_income_usd: Number(item.monthly_income_usd),
      monthly_debt_obligations_usd: Number(item.monthly_debt_obligations_usd), dti_ratio: Number(item.dti_ratio),
      credit_score: Number(item.credit_score), loan_amount_usd: Number(item.loan_amount_usd), employment_status: item.employment_status,
    };
  });
}

function resultLabel(outcome: AssessmentOutcome): Result {
  if (outcome === "WITHIN_SELECTED_REFERENCES") return "Within Selected Reference Checks";
  if (outcome === "EXCEEDS_SELECTED_REFERENCES") return "Exceeds Selected Reference Checks";
  return "Further Assessment Required";
}

function buildAssessments(historical: HistoricalApplicant[], submissions: Submission[]): Assessment[] {
  const history = historical.map((a, index) => {
    const income = a.monthly_income_usd * USD_TO_AED;
    const debt = a.monthly_debt_obligations_usd * USD_TO_AED;
    const outcome = assessApplicant({ grossMonthlyIncome: income, monthlyLoanRepayments: debt, monthlyCreditCardObligations: 0, creditScore: a.credit_score });
    return {
      key: `historical-${a.applicant_id}`, id: a.applicant_id, income, debt, creditCardObligations: 0, instalment: 0,
      loanAmount: a.loan_amount_usd * USD_TO_AED, dti: outcome.currentDTI, currentDTI: outcome.currentDTI, estimatedDTI: null, creditScore: a.credit_score,
      employment: a.employment_status, source: "Historical CSV" as const, result: resultLabel(outcome.outcome), sourceIndex: index,
    };
  });
  const local = submissions.map((s) => {
    const hasProposed = Number.isFinite(s.instalment) && s.instalment > 0;
    const outcome = assessApplicant({ grossMonthlyIncome: s.income, monthlyLoanRepayments: s.debt, monthlyCreditCardObligations: s.creditCardObligations || 0, creditScore: s.score, ...(hasProposed ? { proposedMonthlyInstalment: s.instalment } : {}) });
    return {
      key: `local-${s.id}`, id: s.id, name: s.name || undefined, income: s.income, debt: s.debt, creditCardObligations: s.creditCardObligations || 0,
      instalment: s.instalment, loanAmount: s.amount, dti: outcome.estimatedDTI ?? outcome.currentDTI, currentDTI: outcome.currentDTI, estimatedDTI: outcome.estimatedDTI, creditScore: s.score,
      employment: s.employment, date: s.createdAt, source: "Local assessment" as const, result: resultLabel(outcome.outcome),
    };
  });
  return [...local, ...history];
}

function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`card ${className}`}>{children}</section>;
}
function ResultBadge({ result, large = false }: { result: Result; large?: boolean }) {
  const tone = result === "Within Selected Reference Checks" ? "green" : result === "Exceeds Selected Reference Checks" ? "red" : "amber";
  return <span className={`badge badge-${tone} ${large ? "result-large" : ""}`}><span className="badge-dot"/>{result}</span>;
}
function SourceBadge({ source }: { source: Assessment["source"] }) {
  if (source === "Historical CSV") return null;
  return <span className="source-badge local">{source}</span>;
}
function displayDate(date?: string) {
  return date ? new Date(date).toLocaleDateString("en-AE", { day: "2-digit", month: "short", year: "numeric" }) : "Not available";
}
function shortReason(a: Assessment) {
  if (a.result === "Further Assessment Required") return "Required financial information is missing or invalid.";
  if (a.result === "Within Selected Reference Checks") return "DTI is at or below 50% and monthly income meets the AED 5,000 reference.";
  const reasons = [a.dti > 50 ? "DTI exceeds 50%" : "", a.income < 5000 ? "income is below AED 5,000" : ""].filter(Boolean);
  return `${reasons.join(" and ")} under VERITY’s simplified rules.`;
}

function Header({ title, kicker }: { title: string; kicker: string }) {
  return <header className="topbar"><div><p>{kicker}</p><h1>{title}</h1></div></header>;
}
function StatCard({ icon, label, value, sub, tone }: { icon: string; label: string; value: string; sub: string; tone: string }) {
  return <Card className="stat-card"><div className={`stat-icon stat-${tone}`}><Icon name={icon}/></div><div><div className="stat-label">{label}</div><div className="stat-value">{value}</div><div className="stat-sub">{sub}</div></div></Card>;
}

function ApplicantTable({ rows, onSelect, compact = false }: { rows: Assessment[]; onSelect: (a: Assessment) => void; compact?: boolean }) {
  return <div className="table-scroll"><table className={compact ? "compact-table" : ""}>
    <thead><tr><th>Applicant ID</th><th>Monthly income</th>{!compact && <th>Monthly debt</th>}<th>DTI ratio</th><th>Credit score</th><th>Result</th><th/></tr></thead>
    <tbody>{rows.map((a) => <tr key={a.key} onClick={() => onSelect(a)} tabIndex={0} onKeyDown={e => e.key === "Enter" && onSelect(a)}>
      <td><strong>{a.id}</strong>{a.source === "Local assessment" && <small><SourceBadge source={a.source}/></small>}</td>
      <td>{money.format(a.income)}</td>
      {!compact && <td>{money.format(a.debt)}{a.instalment > 0 && <small>+ {money.format(a.instalment)} proposed</small>}</td>}
      <td><strong className={a.dti <= 50 ? "positive-text" : "negative-text"}>{a.dti.toFixed(1)}%</strong></td>
      <td><span className="score-number">{a.creditScore}</span><small>{interpretCreditScore(a.creditScore).category}</small></td>
      <td><ResultBadge result={a.result}/></td><td><Icon name="arrow" size={16}/></td>
    </tr>)}</tbody>
  </table></div>;
}

function Dashboard({ assessments, go, select }: { assessments: Assessment[]; go: (p: AppPage) => void; select: (a: Assessment) => void }) {
  const approved = assessments.filter(a => a.result === "Within Selected Reference Checks").length;
  const rejected = assessments.filter(a => a.result === "Exceeds Selected Reference Checks").length;
  const valid = assessments.filter(a => a.result !== "Further Assessment Required");
  const avg = valid.reduce((sum, a) => sum + a.dti, 0) / Math.max(1, valid.length);
  const recent = [...assessments].sort((a, b) => (b.date ? new Date(b.date).getTime() : 0) - (a.date ? new Date(a.date).getTime() : 0)).slice(0, 6);
  return <><Header title="Financial overview" kicker="Welcome to Verity"/><main className="content">
    <div className="intro-row"><div><h2>Historical assessment overview</h2><p>Explore calculated indicators from the connected dataset.</p></div></div>
    <div className="stats-grid"><StatCard icon="users" label="Total assessments" value={number.format(assessments.length)} sub="Dataset records" tone="blue"/><StatCard icon="check" label="Within references" value={number.format(approved)} sub="Meets both selected checks" tone="green"/><StatCard icon="close" label="Exceeds references" value={number.format(rejected)} sub="Exceeds one or both checks" tone="red"/><StatCard icon="trend" label="Average DTI ratio" value={`${avg.toFixed(1)}%`} sub="Across valid records" tone="orange"/></div>
    <Card className="recent-card"><div className="card-title"><div><span>Dataset records</span><h3>Recent Applicant Records</h3></div></div><ApplicantTable rows={recent} onSelect={select} compact/><button className="view-all" onClick={() => go("applicants")}>View All Applicant Records <span>→</span></button></Card>
  </main></>;
}

function IndividualDashboard({ assessments, go, select, name }: { assessments: Assessment[]; go: (p: AppPage) => void; select: (a: Assessment) => void; name: string }) {
  const latest = assessments[0];
  return <><Header title="My Dashboard" kicker={`Welcome${name ? `, ${name.split(" ")[0]}` : ""}`}/><main className="content">
    <div className="intro-row"><div><h2>Your financial assessment</h2><p>Create an assessment or revisit your saved results and explanations.</p></div><button className="primary" onClick={() => go("new")}><Icon name="plus"/>New assessment</button></div>
    <div className="individual-overview">
      <Card className="individual-action"><div className="stat-icon stat-blue"><Icon name="trend"/></div><div><span className="eyebrow">Your assessments</span><h3>{assessments.length ? `${assessments.length} saved assessment${assessments.length === 1 ? "" : "s"}` : "Start your first assessment"}</h3><p>Calculate Current DTI, compare monthly salary and understand your AECB credit score.</p></div><button className="text-button" onClick={() => go(assessments.length ? "submitted" : "new")}>{assessments.length ? "View Assessment History" : "Create assessment"} <Icon name="arrow" size={15}/></button></Card>
      {latest && <Card className="latest-assessment"><div className="card-title"><div><span>Latest result</span><h3>{displayDate(latest.date)}</h3></div><ResultBadge result={latest.result}/></div><div className="latest-values"><div><span>{latest.estimatedDTI === null ? "Current DTI" : "Estimated DTI"}</span><strong>{latest.dti.toFixed(1)}%</strong></div><div><span>Monthly salary</span><strong>{money.format(latest.income)}</strong></div><div><span>AECB credit score</span><strong>{latest.creditScore}</strong><small>{interpretCreditScore(latest.creditScore).category}</small></div></div><button className="view-all" onClick={() => select(latest)}>Open assessment explanation →</button></Card>}
    </div>
  </main></>;
}

function Applicants({ assessments, select }: { assessments: Assessment[]; select: (a: Assessment) => void }) {
  const [query, setQuery] = useState("");
  const [result, setResult] = useState("All");
  const [sort, setSort] = useState("date-desc");
  const [page, setPage] = useState(1);
  const filtered = useMemo(() => {
    const output = assessments.filter(a => `${a.id} ${a.name || ""}`.toLowerCase().includes(query.toLowerCase()) && (result === "All" || a.result === result));
    return output.sort((a, b) => {
      if (sort === "dti-asc") return a.dti - b.dti;
      if (sort === "dti-desc") return b.dti - a.dti;
      if (sort === "score-asc") return a.creditScore - b.creditScore;
      if (sort === "score-desc") return b.creditScore - a.creditScore;
      return sort === "date-asc" ? (a.date ? new Date(a.date).getTime() : 0) - (b.date ? new Date(b.date).getTime() : 0) : (b.date ? new Date(b.date).getTime() : 0) - (a.date ? new Date(a.date).getTime() : 0);
    });
  }, [assessments, query, result, sort]);
  useEffect(() => setPage(1), [query, result, sort]);
  const pages = Math.ceil(filtered.length / 15);
  const rows = filtered.slice((page - 1) * 15, page * 15);
  return <><Header title="Loan Applicants" kicker="All assessment records"/><main className="content">
    <div className="intro-row"><div><h2>Applicant records</h2><p>Historical USD values are converted for display and assessment at USD 1 = AED 3.6725.</p></div></div>
    <Card className="table-card"><div className="filters"><label className="search"><Icon name="search"/><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search name or applicant ID…"/></label><select value={result} onChange={e => setResult(e.target.value)}><option>All</option><option>Within Selected Reference Checks</option><option>Exceeds Selected Reference Checks</option></select><select value={sort} onChange={e => setSort(e.target.value)}><option value="date-desc">Date: newest first</option><option value="date-asc">Date: oldest first</option><option value="dti-asc">DTI: low to high</option><option value="dti-desc">DTI: high to low</option><option value="score-desc">Credit score: high to low</option><option value="score-asc">Credit score: low to high</option></select></div>
      {rows.length ? <ApplicantTable rows={rows} onSelect={select}/> : <div className="empty-state table-empty"><div className="empty-icon"><Icon name="search"/></div><h3>No applicant records found</h3><p>Try changing your search, result filter or sort selection.</p></div>}
      {rows.length > 0 && <div className="pagination"><span>Page {page} of {Math.max(1, pages)}</span><div><button disabled={page === 1} onClick={() => setPage(p => p - 1)}>Previous</button><button disabled={page >= pages} onClick={() => setPage(p => p + 1)}>Next</button></div></div>}
    </Card>
  </main></>;
}

function DtiGauge({ value }: { value: number }) {
  const capped = Math.min(Math.max(value, 0), 60);
  const angle = -90 + (capped / 60) * 180;
  return <div className="decision-gauge"><svg viewBox="0 0 300 180" role="img" aria-label={`DTI ${value.toFixed(1)} percent`}>
    <path d="M30 150 A120 120 0 0 1 270 150" pathLength="100" className="gauge-base"/>
    <path d="M30 150 A120 120 0 0 1 270 150" pathLength="100" className="gauge-low"/>
    <path d="M30 150 A120 120 0 0 1 270 150" pathLength="100" className="gauge-moderate"/>
    <path d="M30 150 A120 120 0 0 1 270 150" pathLength="100" className="gauge-high"/>
    <line x1="150" y1="150" x2="150" y2="72" transform={`rotate(${angle} 150 150)`} className="decision-needle"/><circle cx="150" cy="150" r="9" className="needle-hub"/>
    <text x="24" y="170">0%</text><rect x="123" y="42" width="54" height="22" rx="11" className="mid-label-bg"/><text x="133" y="57" className="mid-label">30%</text><text x="260" y="170">60%+</text><text x="246" y="74" className="limit-label">50% limit</text>
  </svg><div className="decision-gauge-value"><strong>{value.toFixed(1)}%</strong><span>{value < 36 ? "Low DTI" : value < 50 ? "Moderate DTI" : "High DTI"}</span></div>
    <div className="gauge-legend"><span><i className="low"/>Low &lt;36%</span><span><i className="moderate"/>Moderate 36–49%</span><span><i className="high"/>High ≥50%</span></div>
  </div>;
}

function CreditRiskScale({ score }: { score: number }) {
  const position = Math.min(100, Math.max(0, ((score - 300) / 550) * 100));
  return <div className="credit-risk-scale" aria-label={`AECB score ${score}`}>
    <div className="risk-marker" style={{ left: `${position}%` }}><span>{score}</span><i/></div>
    <div className="risk-segments"><div className="very-high"/><div className="high"/><div className="medium"/><div className="low"/><div className="very-low"/></div>
    <div className="risk-scale-labels"><span>300</span><span>524</span><span>674</span><span>756</span><span>790</span><span>850</span></div>
    <div className="risk-scale-legend"><span><i className="very-high"/>Very High</span><span><i className="high"/>High</span><span><i className="medium"/>Medium</span><span><i className="low"/>Low</span><span><i className="very-low"/>Very Low</span></div>
  </div>;
}

function DecisionDetail({ applicant, back }: { applicant: Assessment; back: (p: AppPage) => void }) {
  const totalDebt = applicant.debt + applicant.creditCardObligations + applicant.instalment;
  const remaining = Math.max(0, applicant.income - totalDebt);
  const committedPercent = applicant.income > 0 ? (totalDebt / applicant.income) * 100 : 0;
  const debtShare = Math.min(100, committedPercent);
  const remainingPercent = Math.max(0, 100 - committedPercent);
  const shortfall = Math.max(0, totalDebt - applicant.income);
  const incomeScale = Math.max(applicant.income, 5000) * 1.12;
  const dtiPass = applicant.dti <= 50;
  const incomePass = applicant.income >= 5000;
  const accepted = applicant.result === "Within Selected Reference Checks";
  const needsAssessment = applicant.result === "Further Assessment Required";
  const outcomeText = accepted ? "Accepted under Selected Reference Checks" : needsAssessment ? "Further Assessment Required" : "Not Accepted under Selected Reference Checks";
  const credit = interpretCreditScore(applicant.creditScore);
  const creditInfluence = applicant.creditScore >= 756 ? "positive" : applicant.creditScore >= 674 ? "neutral" : "negative";
  const creditSummaryText = creditInfluence === "positive"
    ? "This score positively contributes to your overall assessment and reflects stronger credit management. It remains one factor within the wider assessment."
    : creditInfluence === "neutral"
      ? "This score indicates a developing credit profile and contributes neutrally to the assessment. The final outcome also depends on your monthly income and DTI."
      : "This score may reduce the strength of your overall assessment and suggests that credit-related factors could be affecting your financial profile. Monthly income and DTI are also considered.";
  const dtiPosition = applicant.dti < 30 ? "favourable" : applicant.dti <= 50 ? "moderate" : "high";
  const incomeDifference = Math.abs(applicant.income - 5000);
  const incomeStatus = applicant.income > 5000 ? "Excellent Income Position" : applicant.income === 5000 ? "Meets Reference" : "Below Reference";
  return <><Header title="Loan Decision & Explanation" kicker="Individual assessment"/><main className="content detail-page">
    <div className="detail-breadcrumb"><button onClick={() => back("dashboard")}><Icon name="back" size={15}/>Dashboard</button><span>/</span><button onClick={() => back("applicants")}>Loan Applicants</button></div>
    <Card className={`outcome-card ${accepted ? "accepted" : needsAssessment ? "neutral" : "not-accepted"}`}><div className="outcome-icon"><Icon name={accepted ? "check" : needsAssessment ? "info" : "close"} size={28}/></div><div><span className="eyebrow">Assessment Outcome</span><h2>{outcomeText}</h2><p>{shortReason(applicant)} This outcome reflects the selected reference checks only.</p></div><div className="outcome-applicant"><strong>{applicant.id}</strong><SourceBadge source={applicant.source}/></div></Card>
    <div className="summary-strip"><div><span>{applicant.estimatedDTI === null ? "Current DTI" : "Estimated DTI"}</span><strong>{applicant.dti.toFixed(1)}%</strong></div><div><span>Monthly salary</span><strong>{money.format(applicant.income)}</strong></div><div><span>Loan repayments</span><strong>{money.format(applicant.debt)}</strong></div><div><span>Credit-card obligations</span><strong>{money.format(applicant.creditCardObligations)}</strong></div>{applicant.instalment > 0 && <div><span>Proposed instalment</span><strong>{money.format(applicant.instalment)}</strong></div>}<div><span>AECB credit score</span><strong>{applicant.creditScore}</strong></div></div>
    <div className="visual-grid">
      <Card className="visual-card dti-visual"><div className="card-title"><div><span>Debt-to-Income Ratio</span><h3>{applicant.estimatedDTI === null ? "Current DTI" : "Estimated DTI"} against the 50% reference</h3></div><span className={`status-label ${dtiPass ? "pass" : "fail"}`}>{dtiPass ? "Within selected reference" : "Exceeds selected reference"}</span></div><DtiGauge value={applicant.dti}/><div className="explanation-copy"><h4>DTI Assessment</h4><p>Your {applicant.estimatedDTI === null ? "current" : "estimated"} DTI is {applicant.dti.toFixed(1)}%, meaning {money.format(totalDebt)} of your {money.format(applicant.income)} monthly income is committed to debt repayments. This is a {dtiPosition} position: it is {applicant.dti < 30 ? "below the recommended 30% threshold and the selected 50% reference" : applicant.dti <= 50 ? "above the recommended 30% threshold but within the selected 50% reference" : "above both the recommended 30% threshold and the selected 50% reference"}.</p><div className="calculation-line">({money.format(applicant.debt)} + {money.format(applicant.creditCardObligations)}{applicant.instalment > 0 ? ` + ${money.format(applicant.instalment)}` : ""}) ÷ {money.format(applicant.income)} × 100 = <strong>{applicant.dti.toFixed(1)}%</strong></div><p>{dtiPosition === "favourable" ? "A larger portion of income remains available after debt commitments, so DTI contributes positively to affordability and financial flexibility." : dtiPosition === "moderate" ? "Debt commitments remain manageable but occupy a noticeable share of monthly income, giving this DTI a moderate influence while lower commitments would provide greater flexibility." : "A significant portion of monthly income is already committed to debt, which negatively affects affordability and limits flexibility for savings, living costs or future borrowing."} {applicant.estimatedDTI === null ? "No proposed instalment was entered, so the displayed figure represents Current DTI." : `The quoted ${money.format(applicant.instalment)} instalment is included in this Estimated DTI.`}</p></div></Card>
      <Card className="visual-card"><div className="card-title"><div><span>Monthly Financial Breakdown</span><h3>Committed debt and remaining income</h3></div></div><div className="breakdown-wrap"><div className="breakdown-donut" style={{ background: `conic-gradient(${debtShare <= 50 ? "#e19a42" : "#d75b60"} 0 ${debtShare}%, #3eb58b ${debtShare}% 100%)` }}><div><strong>{committedPercent.toFixed(1)}%</strong><span>committed</span></div></div><div className="breakdown-legend"><div><i className="debt"/><span>Monthly debt</span><strong>{money.format(totalDebt)}</strong></div><div><i className="remain"/><span>Remaining income</span><strong>{money.format(remaining)}</strong></div><div><i className="income"/><span>Total income</span><strong>{money.format(applicant.income)}</strong></div></div></div><div className="key-insights"><h4>Key Insights</h4><ul><li>{committedPercent.toFixed(1)}% of monthly income ({money.format(totalDebt)}) is allocated to debt payments, while {remainingPercent.toFixed(1)}% ({money.format(remaining)}) remains available for other priorities.</li><li>The {applicant.estimatedDTI === null ? "current" : "estimated"} debt position is {committedPercent < 36 ? "healthy" : committedPercent <= 50 ? "moderate" : "high"} relative to monthly income based on the selected DTI ranges.</li><li>{shortfall > 0 ? `Monthly obligations exceed income by ${money.format(shortfall)}, limiting flexibility and indicating a need to reduce commitments.` : `The remaining ${money.format(remaining)} provides capacity for living costs, savings and future financial goals.`}</li></ul></div></Card>
      <Card className="visual-card wide-visual"><div className="card-title"><div><span>Monthly income</span><h3>Income Assessment</h3></div><span className={`status-label ${incomePass ? "pass" : "fail"}`}>{incomeStatus}</span></div><div className="income-chart"><div className="income-axis"><span>AED 0</span><span>{money.format(incomeScale)}</span></div><div className="income-track"><div className={`income-fill ${incomePass ? "pass" : "fail"}`} style={{ width: `${(applicant.income / incomeScale) * 100}%` }}><span>{money.format(applicant.income)}</span></div><div className="income-marker" style={{ left: `${(5000 / incomeScale) * 100}%` }}><i/><span>AED 5,000 selected reference</span></div></div><div className="difference-row"><span>Difference from reference</span><strong className={incomePass ? "positive-text" : "negative-text"}>{applicant.income >= 5000 ? "+" : "−"}{money.format(incomeDifference)}</strong></div></div><div className="explanation-copy"><h4>{incomeStatus}</h4><p>Your reported monthly income of {money.format(applicant.income)} {applicant.income > 5000 ? `exceeds the selected reference of ${money.format(5000)} by ${money.format(incomeDifference)}, indicating strong repayment capacity and contributing positively to affordability.` : applicant.income === 5000 ? `meets the selected reference of ${money.format(5000)}, aligning with the minimum affordability requirement and contributing positively to the assessment.` : `falls below the selected reference of ${money.format(5000)} by ${money.format(incomeDifference)}, which may reduce repayment capacity and negatively influence affordability.`}</p><p>Income is reviewed alongside DTI and the AECB credit score to provide a more complete view of financial stability and the ability to manage existing commitments and potential future repayments.</p></div></Card>
      <Card className="visual-card wide-visual"><div className="card-title"><div><span>AECB Credit Score 3i</span><h3>AECB Credit Score Assessment</h3></div><strong className={`score-callout ${credit.supportsProfile ? "supportive" : "concerning"}`}>{applicant.creditScore}</strong></div><div className={`aecb-score-panel ${credit.supportsProfile ? "supportive" : "concerning"}`}><div className="score-pulse"><Icon name="score" size={28}/><strong>{applicant.creditScore}</strong><span>{credit.category}</span></div><div><strong className="credit-category">{credit.category}</strong><p>{creditSummaryText}</p></div></div><CreditRiskScale score={applicant.creditScore}/><div className="explanation-copy credit-understanding"><h4>Understanding Your Credit Score</h4><p>Your AECB credit score of {applicant.creditScore} falls within Verity's {credit.category} category. {credit.risk === "Strong credit profile" ? "This indicates a strong credit profile and positively contributes to the broader financial assessment." : credit.risk === "Lower credit risk" ? "This indicates lower credit risk and provides positive support to the broader financial assessment." : credit.risk === "Moderate credit risk" ? "This indicates a moderate credit profile that is considered alongside affordability and repayment capacity." : credit.risk === "Higher credit risk" ? "This may make lenders more cautious because the credit profile indicates a greater likelihood of repayment difficulty." : "This indicates a weaker credit profile and may make lenders more cautious when reviewing a loan application."}</p><p>Your credit score provides additional information about your credit history. However, it does not independently determine your Verity assessment outcome; that outcome is based on your monthly income and DTI ratio.</p><p>{creditInfluence === "positive" ? "Maintaining consistent repayments and controlled outstanding balances may help preserve this credit position." : "Maintaining consistent repayments and reducing outstanding credit obligations may help strengthen your credit profile over time."} Actual loan eligibility depends on the lender's individual assessment criteria.</p></div></Card>
    </div>
    <Card className="factor-explanation"><div className="card-title"><div><span>How each indicator contributed</span><h3>Assessment Summary</h3></div></div><div className="factor-rows">
      <div className="factor-row prominent"><div><strong>Debt-to-Income Ratio</strong><span>{applicant.dti.toFixed(1)}%</span></div><div className={`factor-band ${dtiPass ? "support" : "concern"}`}/><p>{applicant.dti < 30 ? `Your DTI of ${applicant.dti.toFixed(1)}% is below the recommended 30% threshold, indicating a manageable debt share and a strong positive affordability contribution.` : dtiPass ? `Your DTI of ${applicant.dti.toFixed(1)}% remains within the selected 50% threshold, although repayments account for a noticeable portion of income and provide a moderate positive contribution.` : `Your DTI of ${applicant.dti.toFixed(1)}% exceeds the selected 50% threshold, negatively affecting affordability by committing a larger share of income to debt.`}</p></div>
      <div className="factor-row"><div><strong>Monthly Income</strong><span>{money.format(applicant.income)}</span></div><div className={`factor-band ${incomePass ? "support" : "concern"}`}/><p>{applicant.income > 5000 ? `Your monthly income of ${money.format(applicant.income)} exceeds the selected ${money.format(5000)} reference, strongly improving affordability and repayment capacity.` : applicant.income === 5000 ? `Your monthly income of ${money.format(applicant.income)} meets the selected reference and positively supports affordability.` : `Your monthly income of ${money.format(applicant.income)} falls below the selected ${money.format(5000)} reference, negatively affecting available repayment capacity.`}</p></div>
      <div className="factor-row"><div><strong>AECB Credit Score</strong><span>{applicant.creditScore} · {credit.category}</span></div><div className={`factor-band ${credit.supportsProfile ? "support" : "concern"}`}/><p>Your AECB score of {applicant.creditScore} falls within the {credit.category} category and indicates {credit.risk.toLowerCase()}, providing {creditInfluence} context alongside income and DTI.</p></div>
    </div></Card>
    <Card className="overall-dashboard"><div className="overall-heading"><div className={`overall-status-icon ${accepted ? "passed" : "failed"}`}><Icon name={accepted ? "check" : "info"} size={24}/></div><div><span className="eyebrow">Overall Assessment</span><h3>Understanding Your Assessment</h3><p>Your assessment combines affordability checks with credit-profile context to provide a balanced view of your financial position.</p></div><div className={`decision-pill ${accepted ? "passed" : "failed"}`}>{outcomeText}</div></div><div className="overall-divider"/><div className="eligibility-section"><span className="eyebrow">Financial Eligibility</span><div className="eligibility-grid"><div><div className={`eligibility-icon ${dtiPass ? "passed" : "failed"}`}><Icon name={dtiPass ? "check" : "info"}/></div><span>DTI Ratio</span><strong>{applicant.dti.toFixed(1)}%</strong><small>Reference: 50%</small><b className={`mini-status ${dtiPass ? "passed" : "failed"}`}>{dtiPass ? "Passed" : "Failed"}</b></div><div><div className={`eligibility-icon ${incomePass ? "passed" : "failed"}`}><Icon name={incomePass ? "check" : "info"}/></div><span>Monthly Income</span><strong>{money.format(applicant.income)}</strong><small>Minimum reference: AED 5,000</small><b className={`mini-status ${incomePass ? "passed" : "failed"}`}>{incomePass ? "Passed" : "Failed"}</b></div></div></div><div className="overall-divider"/><div className={`credit-overall ${credit.supportsProfile ? "supportive" : "concerning"}`}><div><span className="eyebrow">AECB Credit Assessment</span><strong>{applicant.creditScore}</strong></div><div><h4>{credit.category}</h4><p>{credit.risk}. AECB contributes to the broader credit-risk assessment alongside income and DTI and does not independently determine loan acceptance.</p></div></div></Card>
  </main></>;
}

function Guide({ applicant }: { applicant?: Assessment }) {
  const guideCredit = applicant ? interpretCreditScore(applicant.creditScore) : null;
  const guideDtiPass = applicant ? applicant.dti <= 50 : false;
  const guideIncomePass = applicant ? applicant.income >= 5000 : false;
  return <><Header title="How VERITY Assesses" kicker="Loan explanations"/><main className="content methodology-page">
    <div className="methodology-intro"><span className="eyebrow">Transparent methodology</span><h2>How VERITY Assesses</h2><h3>Understanding the financial factors behind your assessment.</h3><p>VERITY uses a transparent, rule-based approach to explain three financial indicators that provide insight into an applicant's financial situation. Each indicator is assessed individually before the selected reference checks are combined to produce an overall assessment outcome.</p></div>
    <div className="method-sections">
      <Card className="method-card"><div className="method-number">01</div><div className="method-icon blue"><Icon name="trend" size={23}/></div><div className="method-content"><span className="eyebrow">Indicator 01</span><h3>Debt-to-Income (DTI) Ratio</h3><p><strong>What it measures.</strong> DTI measures the proportion of gross monthly income committed to existing monthly loan repayments and relevant credit-card obligations.</p><p><strong>Why it matters.</strong> A lower DTI means a smaller share of income is committed to debt. A higher DTI means a larger share is already committed.</p><div className="formula-card"><span>DTI</span><strong>(Monthly loan repayments + Monthly credit-card obligations)</strong><i>÷</i><strong>Gross monthly income</strong><b>× 100</b></div><p><strong>How VERITY evaluates it.</strong> VERITY uses 50% as the selected reference. If a proposed monthly instalment is entered, it is included in Estimated DTI. Without one, VERITY displays Current DTI.</p></div></Card>
      <Card className="method-card"><div className="method-number">02</div><div className="method-icon green"><Icon name="wallet" size={23}/></div><div className="method-content"><span className="eyebrow">Indicator 02</span><h3>Monthly Income</h3><p><strong>What it measures.</strong> Gross monthly income is the applicant's salary before deductions.</p><p><strong>Why it matters.</strong> Income provides context for understanding financial capacity relative to existing monthly commitments.</p><div className="reference-panel"><span>Selected income reference</span><strong>AED 5,000 per month</strong></div><p><strong>How VERITY evaluates it.</strong> The submitted gross monthly income is checked against the selected reference to determine whether it meets or falls below AED 5,000 per month.</p></div></Card>
      <Card className="method-card"><div className="method-number">03</div><div className="method-icon violet"><Icon name="score" size={23}/></div><div className="method-content"><span className="eyebrow">Indicator 03</span><h3>AECB Credit Score 3i</h3><p><strong>What it represents.</strong> The score provides additional information about credit history and repayment behaviour.</p><p><strong>Why it matters.</strong> A higher score generally indicates a stronger credit profile, while a lower score may indicate greater credit risk that lenders may consider.</p><div className="credit-ranges five"><span><b>790–850</b> Very Low Risk</span><span><b>756–789</b> Low Risk</span><span><b>674–755</b> Medium Risk</span><span><b>524–673</b> High Risk</span><span><b>300–523</b> Very High Risk</span></div><p><strong>How VERITY evaluates it.</strong> The score and risk category provide supporting credit-profile information; they do not need to meet a separate pass/fail threshold.</p></div></Card>
    </div>
    <Card className="together-section"><div className="card-title"><div><span>Combined Reference Checks</span><h3>How the Three Factors Work Together</h3></div></div><div className="combined-factor-details"><div><div className="method-icon green"><Icon name="wallet"/></div><h4>Monthly Income – Income Eligibility</h4><p>Your monthly income is checked against Verity's minimum income requirement of AED 5,000. An income of AED 5,000 or above meets this requirement, while an income below AED 5,000 does not.</p></div><div><div className="method-icon blue"><Icon name="trend"/></div><h4>DTI Ratio – Debt Affordability</h4><p>Your Debt-to-Income (DTI) ratio shows how much of your gross monthly income is committed to existing debt repayments. A DTI of 50% or below meets Verity's reference requirement, while a DTI above 50% does not.</p></div><div><div className="method-icon violet"><Icon name="score"/></div><h4>AECB Credit Score – Credit Profile</h4><p>Your AECB credit score provides additional information about your credit history and repayment behaviour. A higher score generally indicates a stronger credit profile, while a lower score may indicate greater credit risk.</p></div></div><div className="decision-flow"><div><Icon name="trend"/><strong>DTI Ratio</strong><span>50% reference</span></div><b>+</b><div><Icon name="wallet"/><strong>Monthly Income</strong><span>AED 5,000 requirement</span></div><b>+</b><div className="neutral-step"><Icon name="score"/><strong>AECB Score</strong><span>Supporting information</span></div><b>→</b><div className="outcome-step"><Icon name="explain"/><strong>Assessment Outcome</strong><span>Income and DTI combined</span></div></div><div className="condition-grid two"><div className="condition-card within"><Icon name="check"/><div><h4>ACCEPTED</h4><ul><li>Monthly income is AED 5,000 or above.</li><li>DTI is 50% or below.</li><li>Both conditions must be met.</li></ul></div></div><div className="condition-card exceeds"><Icon name="close"/><div><h4>NOT ACCEPTED</h4><ul><li>Monthly income is below AED 5,000, or</li><li>DTI is above 50%.</li><li>Either condition results in this outcome.</li></ul></div></div></div><p className="combined-rule-note">To receive an Accepted outcome, both the monthly income and DTI requirements must be met. The AECB score provides additional insight into the credit profile but does not change this rule-based outcome or guarantee approval by a lender.</p>{applicant && guideCredit && <div className="dynamic-checks"><div className="dynamic-checks-head"><div><span className="eyebrow">Applicant-specific explanation</span><h4>{applicant.id}</h4></div><span className={`decision-pill ${guideDtiPass && guideIncomePass ? "passed" : "failed"}`}>{guideDtiPass && guideIncomePass ? "Accepted" : "Not Accepted"}</span></div><div className="dynamic-check-grid"><div><span>Monthly income</span><strong>{money.format(applicant.income)}</strong><b className={`mini-status ${guideIncomePass ? "passed" : "failed"}`}>{guideIncomePass ? "Passed" : "Not Met"}</b></div><div><span>DTI ratio</span><strong>{applicant.dti.toFixed(1)}%</strong><b className={`mini-status ${guideDtiPass ? "passed" : "failed"}`}>{guideDtiPass ? "Passed" : "Not Met"}</b></div><div><span>AECB credit profile</span><strong>{applicant.creditScore}</strong><small>{guideCredit.category}</small></div></div><p>{guideDtiPass && guideIncomePass ? "This applicant meets both the monthly income and DTI requirements, resulting in an Accepted outcome under Verity's selected checks." : `This applicant received a Not Accepted outcome because ${!guideIncomePass && !guideDtiPass ? "both the income and DTI requirements were not met" : !guideIncomePass ? "monthly income is below AED 5,000" : "DTI is above 50%"}.`} The AECB score is shown separately as supporting credit-profile information.</p></div>}</Card>
  </main></>;
}

function Field({ label, name, type = "number", min, max, step = "0.01", placeholder, required = true, disabled = false }: { label: string; name: string; type?: string; min?: number; max?: number; step?: string; placeholder?: string; required?: boolean; disabled?: boolean }) {
  return <label className="field"><span>{label}</span><input name={name} type={type} min={min} max={max} step={step} placeholder={placeholder} required={required} disabled={disabled}/></label>;
}
function NewApplication({ save, ownerEmail, applicantName }: { save: (s: Submission) => void; ownerEmail: string; applicantName: string }) {
  const [values, setValues] = useState({ income: 0, debt: 0, cards: 0, instalment: undefined as number | undefined, score: 0 });
  const [noLoans, setNoLoans] = useState(false);
  const [noCards, setNoCards] = useState(false);
  const [done, setDone] = useState(false);
  const current = assessApplicant({ grossMonthlyIncome: values.income, monthlyLoanRepayments: values.debt, monthlyCreditCardObligations: values.cards, creditScore: values.score, ...(values.instalment === undefined ? {} : { proposedMonthlyInstalment: values.instalment }) });
  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault(); const fd = new FormData(e.currentTarget);
    const instalmentValue = String(fd.get("instalment") || "").trim();
    const item: Submission = { id: `VA-${Date.now().toString().slice(-8)}`, name: applicantName, income: Number(fd.get("income")), debt: Number(fd.get("debt")), creditCardObligations: Number(fd.get("cards")), score: Number(fd.get("score")), amount: 0, instalment: instalmentValue ? Number(instalmentValue) : 0, employment: "", employer: "", dti: current.estimatedDTI ?? current.currentDTI, result: resultLabel(current.outcome), currency: "AED", createdAt: new Date().toISOString(), ownerEmail };
    save(item); setDone(true); e.currentTarget.reset(); setNoLoans(false); setNoCards(false); setValues({ income: 0, debt: 0, cards: 0, instalment: undefined, score: 0 }); window.scrollTo(0, 0);
  };
  const liveDTI = current.estimatedDTI ?? current.currentDTI;
  return <><Header title="New Assessment" kicker="Your financial indicators"/><main className="content">{done && <div className="success"><Icon name="check"/><div><strong>Assessment saved</strong><p>Open Assessment History to revisit the result and explanation.</p></div><button onClick={() => setDone(false)}><Icon name="close"/></button></div>}<div className="intro-row"><div><h2>Enter your financial information</h2><p>All monetary values are entered directly in AED.</p></div></div>
    <form onSubmit={submit} onInput={e => { const fd = new FormData(e.currentTarget); const proposed = String(fd.get("instalment") || "").trim(); setValues({ income: Number(fd.get("income")), debt: Number(fd.get("debt")), cards: Number(fd.get("cards")), instalment: proposed ? Number(proposed) : undefined, score: Number(fd.get("score")) }); }}><div className="form-layout"><div className="form-stack">
      <Card><div className="form-heading"><span>01</span><div><h3>Monthly income</h3><p>Gross monthly salary means income before deductions.</p></div></div><Field label="Gross Monthly Salary (AED)" name="income" min={1} placeholder="8,000"/></Card>
      <Card><div className="form-heading"><span>02</span><div><h3>Monthly obligations</h3><p>Enter payment obligations, not total outstanding balances.</p></div></div><div className="form-grid two"><div><Field label="Existing Monthly Loan Repayments (AED)" name="debt" min={0} placeholder="0" disabled={noLoans}/><label className="zero-check"><input type="checkbox" checked={noLoans} onChange={e => { setNoLoans(e.target.checked); if (e.target.checked) setValues(v => ({ ...v, debt: 0 })); }}/><span>No existing loans</span></label></div><div><Field label="Monthly Credit Card Payment Obligations (AED)" name="cards" min={0} placeholder="0" disabled={noCards}/><label className="zero-check"><input type="checkbox" checked={noCards} onChange={e => { setNoCards(e.target.checked); if (e.target.checked) setValues(v => ({ ...v, cards: 0 })); }}/><span>No credit cards</span></label></div></div></Card>
      <Card><div className="form-heading"><span>03</span><div><h3>Credit and optional quotation</h3><p>Enter the AECB Credit Score 3i shown on your report for an established credit history.</p></div></div><div className="form-grid two"><Field label="Credit Score (AECB)" name="score" min={300} max={850} step="1" placeholder="300–850"/><Field label="Proposed Monthly Loan Instalment (AED) — optional" name="instalment" min={0} placeholder="Only if quoted by a bank" required={false}/></div></Card>
      <button className="primary submit" type="submit"><Icon name="file"/>Save and view assessment</button></div>
      <aside className="calculation-card"><span className="eyebrow">Live calculation</span><h3>{values.instalment === undefined ? "Current DTI" : "Estimated DTI"}</h3><DtiGauge value={liveDTI}/><ResultBadge result={values.income > 0 && values.score >= 300 && values.score <= 850 ? resultLabel(current.outcome) : "Further Assessment Required"} large/><div className="calc-details"><div><span>Monthly commitments</span><strong>{money.format(values.debt + values.cards + (values.instalment || 0))}</strong></div><div><span>DTI reference</span><strong>{values.income ? `${liveDTI.toFixed(1)}% · ${liveDTI <= 50 ? "Within" : "Exceeds"}` : "Awaiting figures"}</strong></div><div><span>Income reference</span><strong>{values.income ? `${money.format(values.income)} · ${values.income >= 5000 ? "Meets" : "Below"}` : "Awaiting figures"}</strong></div><div><span>AECB credit score</span><strong>{values.score >= 300 && values.score <= 850 ? `${values.score} · ${interpretCreditScore(values.score).category}` : "Enter a score from 300 to 850"}</strong></div></div></aside></div></form></main></>;
}

function Submitted({ rows, select, clear }: { rows: Assessment[]; select: (a: Assessment) => void; clear: () => void }) {
  return <><Header title="Assessment History" kicker="Your saved assessments"/><main className="content"><div className="intro-row"><div><h2>Your assessment history</h2><p>Open any saved assessment to review its financial information and explanation.</p></div>{rows.length > 0 && <button className="secondary danger" onClick={clear}>Clear history</button>}</div>{rows.length ? <Card className="table-card"><ApplicantTable rows={rows} onSelect={select}/></Card> : <Card className="empty-state"><div className="empty-icon"><Icon name="file"/></div><h3>No saved assessments yet</h3><p>Create a new assessment to begin your history.</p></Card>}</main></>;
}

function Brand({ dark = false }: { dark?: boolean }) {
  return <div className={`brand ${dark ? "brand-dark" : ""}`}><div className="brand-mark"><span>V</span></div><div><strong>Verity</strong><small>Financial clarity</small></div></div>;
}
function PublicFooter() {
  return <footer className="public-footer"><Brand/><p>Transparent financial explanations for a clearer lending journey.</p></footer>;
}
function Welcome({ navigate }: { navigate: (p: PublicPage) => void }) {
  return <div className="public-page"><header className="public-nav"><Brand dark/><nav><a href="#how">How it works</a><button className="login-link" onClick={() => navigate("login")}>Log In</button><button className="primary" onClick={() => navigate("signup")}>Get Started</button></nav></header><main>
    <section className="welcome-hero"><div className="hero-copy"><span className="welcome-tag">Making Loan Decisions Easier to Understand.</span><h1>Understand the reasons behind your loan decision.</h1><p>VERITY turns three important financial factors into a clear, visual explanation—so DTI, monthly income and credit score are easier to understand.</p><div><button className="primary hero-button" onClick={() => navigate("signup")}>Get Started <span>→</span></button><button className="secondary hero-button" onClick={() => navigate("login")}>Log In</button></div></div>
    <div className="welcome-visual"><div className="visual-orbit"><div className="orbit-center"><div className="brand-mark"><span>V</span></div><strong>Clear decisions</strong><span>Simple explanations</span></div><div className="orbit-card orbit-one"><Icon name="trend"/><div><strong>DTI Ratio</strong><span>Repayment balance</span></div></div><div className="orbit-card orbit-two"><Icon name="wallet"/><div><strong>Income</strong><span>Monthly capacity</span></div></div><div className="orbit-card orbit-three"><Icon name="score"/><div><strong>Credit Score</strong><span>Credit context</span></div></div></div></div></section>
    <section className="how-section" id="how"><span className="eyebrow">How it works</span><h2>Financial clarity in three steps</h2><p className="section-lead">VERITY brings the most important financial signals together in one understandable view.</p><div className="how-grid welcome-factors"><article><span>01</span><div className="factor-icon blue"><Icon name="trend"/></div><h3>Understand Your Debt-to-Income Ratio (DTI)</h3><p>See how much of your monthly income goes towards existing debt payments, including loan repayments and credit-card obligations. Compare your DTI with the 50% reference to understand how much of your income is already committed to debt.</p><b className="reference-chip blue-chip">50% DTI Reference</b><small>A lower DTI means a smaller proportion of your income is committed to monthly debt payments.</small></article><article><span>02</span><div className="factor-icon green"><Icon name="wallet"/></div><h3>Monthly Income Assessment</h3><p>Your gross monthly salary is compared with the AED 5,000 reference to determine whether it meets the selected minimum income requirement.</p><b className="reference-chip green-chip">AED 5,000/month – Selected Income Reference</b></article><article><span>03</span><div className="factor-icon violet"><Icon name="score"/></div><h3>AECB Credit Score Assessment</h3><p>Your AECB credit score provides additional insight into your credit history and potential repayment risk. Explore how your score contributes to the overall financial assessment.</p><b className="reference-chip violet-chip">Supporting financial context</b><small>A higher score generally indicates lower credit risk, while a lower score may indicate higher credit risk. It does not independently determine the assessment outcome.</small></article></div></section>
  </main><PublicFooter/></div>;
}

function AuthPage({ mode, navigate, authenticate }: { mode: "signup" | "login"; navigate: (p: PublicPage) => void; authenticate: (user: SessionUser, remember: boolean) => void }) {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault(); const fd = new FormData(e.currentTarget); const next: Record<string, string> = {};
    const email = String(fd.get("email")); const password = String(fd.get("password"));
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) next.email = "Enter a valid email address.";
    if (password.length < 8) next.password = "Password must be at least 8 characters.";
    if (mode === "signup") { if (!String(fd.get("name")).trim()) next.name = "Full name is required."; if (password !== fd.get("confirm")) next.confirm = "Passwords do not match."; if (!fd.get("consent")) next.consent = "Consent is required to continue."; }
    const role = String(fd.get("role") || "") as Role;
    if (!role) next.role = "Select Individual Applicant or Loan Advisor.";
    setErrors(next); if (!Object.keys(next).length) authenticate({ email: email.toLowerCase(), name: String(fd.get("name") || email.split("@")[0]), role }, Boolean(fd.get("remember")));
  };
  return <div className="auth-page"><header className="public-nav"><Brand dark/><button className="login-link" onClick={() => navigate("welcome")}><Icon name="back" size={15}/>Back to home</button></header><main className="auth-main"><div className="auth-intro"><span className="welcome-tag">Making Loan Decisions Easier to Understand.</span><h1>{mode === "signup" ? "Start with financial clarity." : "Welcome back to Verity."}</h1><p>Choose the experience that matches how you use VERITY.</p><div className="auth-points"><span><Icon name="check"/>Individual assessment history</span><span><Icon name="check"/>Advisor dataset exploration</span><span><Icon name="check"/>Clear DTI explanations</span></div></div><Card className="auth-card"><div className="auth-icon"><Icon name="lock"/></div><h2>{mode === "signup" ? "Create your account" : "Log in to Verity"}</h2><p>Enter your details and select your role.</p><form onSubmit={submit}>
    {mode === "signup" && <label className="field"><span>Full Name</span><input name="name" type="text" placeholder="Your full name"/>{errors.name && <em>{errors.name}</em>}</label>}
    <label className="field"><span>Email Address</span><input name="email" type="email" placeholder="you@example.com"/>{errors.email && <em>{errors.email}</em>}</label>
    <label className="field"><span>User Role</span><select name="role" defaultValue=""><option value="" disabled>Select your role</option><option value="individual">Individual Loan Applicant</option><option value="advisor">Loan Advisor</option></select>{errors.role && <em>{errors.role}</em>}</label>
    <label className="field"><span>Password</span><input name="password" type="password" placeholder="Minimum 8 characters"/>{errors.password && <em>{errors.password}</em>}</label>
    {mode === "signup" && <label className="field"><span>Confirm Password</span><input name="confirm" type="password" placeholder="Repeat your password"/>{errors.confirm && <em>{errors.confirm}</em>}</label>}
    {mode === "signup" ? <label className="check-field"><input name="consent" type="checkbox"/><span>I consent to the collection and storage of my financial information in this browser for future access.</span>{errors.consent && <em>{errors.consent}</em>}</label> : <div className="auth-options"><label className="check-field"><input name="remember" type="checkbox"/><span>Remember Me</span></label><button type="button" onClick={() => alert("Password recovery is not available for this local sign-in.")}>Forgot Password?</button></div>}
    <button className="primary auth-submit" type="submit">{mode === "signup" ? "Create Account" : "Log In"} <span>→</span></button>
  </form><div className="auth-switch">{mode === "signup" ? "Already have an account?" : "New to Verity?"} <button onClick={() => navigate(mode === "signup" ? "login" : "signup")}>{mode === "signup" ? "Log In" : "Sign Up"}</button></div></Card></main><PublicFooter/></div>;
}

export default function App() {
  const [historical, setHistorical] = useState<HistoricalApplicant[]>([]);
  const [loadError, setLoadError] = useState("");
  const [publicPage, setPublicPage] = useState<PublicPage>("welcome");
  const [user, setUser] = useState<SessionUser | null>(() => {
    try {
      const raw = localStorage.getItem("verity-session") || sessionStorage.getItem("verity-session");
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  });
  const [page, setPage] = useState<AppPage>("dashboard");
  const [selected, setSelected] = useState<Assessment | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [submissions, setSubmissions] = useState<Submission[]>(() => { try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); } catch { return []; } });
  useEffect(() => { fetch("/data/verity_cleaned_loan_dataset_1000.csv").then(r => { if (!r.ok) throw new Error(); return r.text(); }).then(t => setHistorical(parseCsv(t))).catch(() => setLoadError("The historical dataset could not be loaded.")); }, []);
  const ownSubmissions = useMemo(() => user?.role === "individual" ? submissions.filter(s => s.ownerEmail === user.email || (!s.ownerEmail && s.name === user.name)) : [], [submissions, user]);
  const historicalRows = useMemo(() => buildAssessments(historical, []), [historical]);
  const localRows = useMemo(() => buildAssessments([], ownSubmissions), [ownSubmissions]);
  const go = (p: AppPage) => { setPage(p); setMenuOpen(false); window.scrollTo(0, 0); };
  const select = (a: Assessment) => { setSelected(a); go("detail"); };
  const authenticate = (nextUser: SessionUser, remember: boolean) => { (remember ? localStorage : sessionStorage).setItem("verity-session", JSON.stringify(nextUser)); setUser(nextUser); setPage("dashboard"); };
  const logout = () => { localStorage.removeItem("verity-session"); sessionStorage.removeItem("verity-session"); setUser(null); setPublicPage("welcome"); };
  const save = (s: Submission) => { const next = [s, ...submissions]; setSubmissions(next); localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); setSelected(buildAssessments([], [s])[0]); setPage("detail"); };
  const clear = () => { if (window.confirm("Remove your locally stored assessments?")) { const next = submissions.filter(s => s.ownerEmail !== user?.email && !(!s.ownerEmail && s.name === user?.name)); setSubmissions(next); localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } };
  if (!user) return publicPage === "welcome" ? <Welcome navigate={setPublicPage}/> : <AuthPage mode={publicPage} navigate={setPublicPage} authenticate={authenticate}/>;
  if (loadError) return <div className="loading error"><Icon name="info" size={28}/><h2>Dataset unavailable</h2><p>{loadError}</p></div>;
  if (!historical.length) return <div className="loading"><div className="spinner"/><h2>Loading Verity</h2><p>Preparing assessment records…</p></div>;
  const nav = user.role === "advisor"
    ? [{ id: "dashboard" as AppPage, label: "Advisor Dashboard", icon: "dashboard" }, { id: "applicants" as AppPage, label: "Historical Applicants", icon: "users" }, { id: "new" as AppPage, label: "New Assessment", icon: "plus" }, { id: "guide" as AppPage, label: "Loan Explanations", icon: "explain" }]
    : [{ id: "dashboard" as AppPage, label: "My Dashboard", icon: "dashboard" }, { id: "new" as AppPage, label: "New Assessment", icon: "plus" }, { id: "submitted" as AppPage, label: "Assessment History", icon: "file" }, { id: "guide" as AppPage, label: "Loan Explanations", icon: "explain" }];
  return <div className="app-shell">{menuOpen && <div className="mobile-overlay" onClick={() => setMenuOpen(false)}/>}<aside className={`sidebar ${menuOpen ? "open" : ""}`}><Brand/><nav><span className="nav-label">{user.role === "advisor" ? "Advisor workspace" : "Individual workspace"}</span>{nav.map(item => <button key={item.id} className={(page === item.id || (page === "detail" && item.id === (user.role === "advisor" ? "applicants" : "submitted"))) ? "active" : ""} onClick={() => go(item.id)}><Icon name={item.icon}/><span>{item.label}</span>{item.id === "submitted" && localRows.length > 0 && <b>{localRows.length}</b>}</button>)}</nav><button className="logout-button" onClick={logout}><Icon name="logout"/>Log out</button><div className="sidebar-foot"><span className="status-dot"/><div><strong>{user.role === "advisor" ? "Dataset connected" : user.name}</strong><small>{user.role === "advisor" ? "1,000 records" : "Individual applicant"}</small></div></div></aside>
    <div className="main-shell"><div className="mobile-header"><button onClick={() => setMenuOpen(true)}><Icon name="menu"/></button><Brand/></div>
      {page === "dashboard" && (user.role === "advisor" ? <Dashboard assessments={historicalRows} go={go} select={select}/> : <IndividualDashboard assessments={localRows} go={go} select={select} name={user.name}/>)}
      {page === "applicants" && user.role === "advisor" && <Applicants assessments={historicalRows} select={select}/>}
      {page === "guide" && <Guide applicant={user.role === "advisor" ? selected || historicalRows[0] : localRows[0]}/>} {page === "new" && <NewApplication save={save} ownerEmail={user.email} applicantName={user.name}/>}
      {page === "submitted" && <Submitted rows={localRows} select={select} clear={clear}/>}
      {page === "detail" && selected && <DecisionDetail applicant={selected} back={go}/>}
    </div></div>;
}
