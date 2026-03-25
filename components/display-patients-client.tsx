"use client";

import type { Patient, PatientsPagination } from "@/lib/getPatients";
import {
  analyzePatientRisk,
  formatAssessmentSubmissionPreview,
} from "@/lib/patient-risk";
import { fetchPatientsPage, submitAssessment } from "@/lib/patient-actions";
import { useActionState, useState } from "react";
import { SubmitButton } from "./submit-button";

type DisplayPatientsClientProps = {
  initialPatients: Patient[];
  initialPagination: PatientsPagination;
  initialError: string | null;
};

const initialSubmitState = {
  status: "idle" as const,
  message: null,
  responseJson: null,
};

export function DisplayPatientsClient({
  initialPatients,
  initialPagination,
  initialError,
}: DisplayPatientsClientProps) {
  const [patients, setPatients] = useState(initialPatients);
  const [pagination, setPagination] = useState(initialPagination);
  const [error, setError] = useState(initialError);
  const [loading, setLoading] = useState(false);
  const [submitState, submitFormAction] = useActionState(submitAssessment, initialSubmitState);

  const summary = analyzePatientRisk(patients);
  const submissionPayload = summary.submissionPreview;
  const submissionPreview = formatAssessmentSubmissionPreview(submissionPayload);
  const nextPage = patients.length === 0 ? 1 : pagination.page + 1;
  const canLoadMore = patients.length === 0 || pagination.hasNext;
  const canSubmit = !canLoadMore && patients.length >= pagination.total;

  async function loadMore() {
    if (loading || !canLoadMore) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetchPatientsPage(nextPage, 20);
      setPatients((prev) =>
        nextPage === 1 ? response.data : [...prev, ...response.data],
      );
      setPagination(response.pagination);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Failed to fetch patients. Try the button again.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-base-300 bg-base-100 p-4">
        <p className="font-medium text-base-content">
          Loaded {patients.length}
          {pagination.total > 0 ? ` of ${pagination.total}` : ""} patients
        </p>
        {error ? (
          <p className="mt-2 text-sm text-error">
            {error}. You can retry with the same button.
          </p>
        ) : null}
        <div className="mt-3">
          {canLoadMore ? (
            <button
              type="button"
              className="btn btn-sm btn-primary"
              disabled={loading}
              onClick={() => void loadMore()}
            >
              {loading ? "Loading..." : "Load More Patients"}
            </button>
          ) : (
            <p className="text-sm text-success">All pages loaded.</p>
          )}
        </div>
      </div>

      <div className="rounded-lg border border-base-300 bg-base-100 p-4">
        <h3 className="font-semibold">Loaded Patients JSON</h3>
        <pre className="mt-3 max-h-96 overflow-auto rounded bg-base-200 p-3 font-mono text-xs whitespace-pre-wrap">
          {JSON.stringify(patients, null, 2)}
        </pre>
      </div>

      <form
        action={submitFormAction}
        className="rounded-lg border border-base-300 bg-base-100 p-4"
      >
        <h3 className="font-semibold">POST Request Preview</h3>
        <input
          type="hidden"
          name="submissionPreview"
          value={JSON.stringify(submissionPayload)}
        />
        <input
          type="hidden"
          name="loadedPatientsCount"
          value={String(patients.length)}
        />
        <input
          type="hidden"
          name="totalPatients"
          value={String(pagination.total)}
        />
        <input
          type="hidden"
          name="hasNextPage"
          value={String(pagination.hasNext)}
        />
        <pre className="mt-3 overflow-auto rounded bg-base-200 p-3 font-mono text-xs whitespace-pre-wrap">
          {submissionPreview}
        </pre>
        <div className="mt-3 flex items-center gap-3">
          <SubmitButton disabled={!canSubmit} />
          {submitState.message ? (
            <p
              className={
                submitState.status === "error"
                  ? "text-sm text-error"
                  : "text-sm text-success"
              }
            >
              {submitState.message}
            </p>
          ) : null}
        </div>
        {!canSubmit ? (
          <p className="mt-2 text-sm text-warning">
            Load every page of patients before submitting the assessment.
          </p>
        ) : null}
        {submitState.responseJson ? (
          <div className="mt-4">
            <h4 className="font-medium">Response JSON</h4>
            <pre className="mt-3 overflow-auto rounded bg-base-200 p-3 font-mono text-xs whitespace-pre-wrap">
              {submitState.responseJson}
            </pre>
          </div>
        ) : null}
      </form>
    </div>
  );
}
