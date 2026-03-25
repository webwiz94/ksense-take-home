"use server";

import { getPatients, type GetPatientsResponse } from "@/lib/getPatients";
import type { AssessmentSubmissionPreview } from "@/lib/patient-risk";

const MIN_PAGE = 1;
const MIN_LIMIT = 1;
const MAX_LIMIT = 20;
const JSON_HEADERS = {
  "content-type": "application/json",
  "x-api-key": process.env.KSENSE_API_KEY!,
};

type SubmitAssessmentState = {
  status: "idle" | "success" | "error";
  message: string | null;
  responseJson: string | null;
};

export async function fetchPatientsPage(
  page: number,
  limit: number
): Promise<GetPatientsResponse> {
  const nextPage = Math.floor(page);
  const nextLimit = Math.floor(limit);

  if (!Number.isFinite(nextPage) || nextPage < MIN_PAGE) {
    throw new Error("Invalid page");
  }

  if (!Number.isFinite(nextLimit) || nextLimit < MIN_LIMIT || nextLimit > MAX_LIMIT) {
    throw new Error("Invalid limit");
  }

  return getPatients({ page: nextPage, limit: nextLimit });
}

function toCount(value: FormDataEntryValue | null) {
  const count = Number(value);
  return Number.isInteger(count) && count >= 0 ? count : null;
}

function isSubmissionPreview(value: unknown): value is AssessmentSubmissionPreview {
  if (!value || typeof value !== "object") return false;

  const preview = value as Record<string, unknown>;

  return (
    Array.isArray(preview.high_risk_patients) &&
    Array.isArray(preview.fever_patients) &&
    Array.isArray(preview.data_quality_issues)
  );
}

async function readResponseBody(response: Response) {
  const text = await response.text();
  if (!text) return { status: response.status, statusText: response.statusText };

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return { raw: text };
  }
}

export async function submitAssessment(
  _previousState: SubmitAssessmentState,
  formData: FormData
): Promise<SubmitAssessmentState> {
  const loadedPatients = toCount(formData.get("loadedPatientsCount"));
  const totalPatients = toCount(formData.get("totalPatients"));
  const hasNextPage = formData.get("hasNextPage") === "true";

  if (loadedPatients === null || totalPatients === null) {
    return {
      status: "error",
      message: "Submission metadata is missing or invalid.",
      responseJson: null,
    };
  }

  if (hasNextPage || loadedPatients < totalPatients) {
    return {
      status: "error",
      message: "Load all patients before submitting the assessment.",
      responseJson: null,
    };
  }

  const rawPreview = formData.get("submissionPreview");

  if (typeof rawPreview !== "string" || rawPreview.trim() === "") {
    return {
      status: "error",
      message: "Missing submission payload.",
      responseJson: null,
    };
  }

  let submissionPreview: AssessmentSubmissionPreview;

  try {
    const parsed = JSON.parse(rawPreview) as unknown;

    if (!isSubmissionPreview(parsed)) {
      return {
        status: "error",
        message: "Submission payload is invalid.",
        responseJson: null,
      };
    }

    submissionPreview = parsed;
  } catch {
    return {
      status: "error",
      message: "Submission payload could not be parsed.",
      responseJson: null,
    };
  }

  const response = await fetch(`${process.env.BASE_URL!}/submit-assessment`, {
    method: "POST",
    headers: JSON_HEADERS,
    body: JSON.stringify(submissionPreview),
    cache: "no-store",
  });
  const responseBody = await readResponseBody(response);

  return {
    status: response.ok ? "success" : "error",
    message: response.ok
      ? `Submission succeeded: ${response.status} ${response.statusText}`
      : `Submission failed: ${response.status} ${response.statusText}`,
    responseJson: JSON.stringify(responseBody, null, 2),
  };
}
