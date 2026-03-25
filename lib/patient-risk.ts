import type { Patient } from "@/lib/getPatients";

export type PatientRiskBreakdown = {
  patientId: string;
  bloodPressureRisk: number;
  temperatureRisk: number;
  ageRisk: number;
  totalRiskScore: number;
  hasFever: boolean;
  hasDataQualityIssue: boolean;
  issues: string[];
};

export type AssessmentSubmissionPreview = {
  high_risk_patients: string[];
  fever_patients: string[];
  data_quality_issues: string[];
};

export type PatientRiskSummary = {
  totalPatients: number;
  dataQualityCount: number;
  analyzedAt: string;
  breakdowns: PatientRiskBreakdown[];
  submissionPreview: AssessmentSubmissionPreview;
};

export function formatAssessmentSubmissionPreview(
  preview: AssessmentSubmissionPreview
): string {
  const keys: Array<keyof AssessmentSubmissionPreview> = [
    "high_risk_patients",
    "fever_patients",
    "data_quality_issues",
  ];

  return `{\n${keys
    .map((key) => {
      const values = preview[key].map((value) => JSON.stringify(value)).join(", ");
      return `  "${key}": [${values}]`;
    })
    .join(",\n")}\n}`;
}

function parseNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return null;
}

function parseBloodPressure(value: unknown) {
  if (typeof value !== "string" || value.trim() === "") {
    return { systolic: null, diastolic: null };
  }

  const [rawSystolic, rawDiastolic, ...rest] = value.split("/");
  if (rest.length > 0) {
    return { systolic: null, diastolic: null };
  }

  const systolic = parseNumber(rawSystolic?.trim());
  const diastolic = parseNumber(rawDiastolic?.trim());

  if (systolic === null || diastolic === null) {
    return { systolic: null, diastolic: null };
  }

  return { systolic, diastolic };
}

function getBloodPressureRisk(value: unknown) {
  const { systolic, diastolic } = parseBloodPressure(value);
  if (systolic === null || diastolic === null) {
    return { score: 0, issue: "blood_pressure" };
  }

  const systolicStage =
    systolic >= 140 ? 4 : systolic >= 130 ? 3 : systolic >= 120 ? 2 : 1;
  const diastolicStage = diastolic >= 90 ? 4 : diastolic >= 80 ? 3 : 1;

  return { score: Math.max(systolicStage, diastolicStage), issue: null };
}

function getTemperatureRisk(value: unknown) {
  const temperature = parseNumber(value);
  if (temperature === null) {
    return { score: 0, hasFever: false, issue: "temperature" };
  }

  if (temperature >= 101) {
    return { score: 2, hasFever: true, issue: null };
  }

  if (temperature >= 99.6) {
    return { score: 1, hasFever: true, issue: null };
  }

  return { score: 0, hasFever: false, issue: null };
}

function getAgeRisk(value: unknown) {
  const age = parseNumber(value);
  if (age === null) {
    return { score: 0, issue: "age" };
  }

  if (age > 65) {
    return { score: 2, issue: null };
  }

  return { score: 1, issue: null };
}

function getUniqueIds(values: string[]) {
  return [...new Set(values)];
}

export function analyzePatientRisk(patients: Patient[]): PatientRiskSummary {
  const breakdowns = patients.map((patient) => {
    const patientId =
      typeof patient.patient_id === "string" && patient.patient_id.trim() !== ""
        ? patient.patient_id.trim()
        : "";

    const bloodPressure = getBloodPressureRisk(patient.blood_pressure);
    const temperature = getTemperatureRisk(patient.temperature);
    const age = getAgeRisk(patient.age);
    const issues = [bloodPressure.issue, temperature.issue, age.issue].filter(
      (issue): issue is string => issue !== null
    );

    return {
      patientId,
      bloodPressureRisk: bloodPressure.score,
      temperatureRisk: temperature.score,
      ageRisk: age.score,
      totalRiskScore: bloodPressure.score + temperature.score + age.score,
      hasFever: temperature.hasFever,
      hasDataQualityIssue: issues.length > 0,
      issues,
    };
  });

  return {
    totalPatients: patients.length,
    dataQualityCount: breakdowns.filter((patient) => patient.hasDataQualityIssue).length,
    analyzedAt: new Date().toISOString(),
    breakdowns,
    submissionPreview: {
      high_risk_patients: getUniqueIds(
        breakdowns
          .filter(
            (patient) =>
              patient.patientId !== "" &&
              patient.totalRiskScore > 4 &&
              patient.bloodPressureRisk >= 3 &&
              !patient.hasDataQualityIssue
          )
          .map((patient) => patient.patientId)
      ),
      fever_patients: getUniqueIds(
        breakdowns
          .filter((patient) => patient.hasFever && patient.patientId !== "")
          .map((patient) => patient.patientId)
      ),
      data_quality_issues: getUniqueIds(
        breakdowns
          .filter((patient) => patient.hasDataQualityIssue && patient.patientId !== "")
          .map((patient) => patient.patientId)
      ),
    },
  };
}
