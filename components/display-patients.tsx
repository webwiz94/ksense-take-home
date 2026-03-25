import { getPatients, type GetPatientsResponse } from "@/lib/getPatients";
import { Suspense } from "react";
import { DisplayPatientsClient } from "./display-patients-client";

const PAGE_SIZE = 20;

function SkeletonJsonLine({
  width,
  indent = 0,
}: {
  width: string;
  indent?: number;
}) {
  return (
    <div
      className="skeleton h-4"
      style={{ width, marginLeft: `${indent}rem` }}
    />
  );
}

export function DisplayPatientsSkeleton() {
  return (
    <div className="w-full space-y-4">
      <div className="w-full rounded-lg border border-base-300 bg-base-100 p-4">
        <div className="skeleton h-5 w-40" />
        <div className="mt-3">
          <div className="skeleton h-9 w-44" />
        </div>
      </div>

      <div className="w-full rounded-lg border border-base-300 bg-base-100 p-4">
        <div className="skeleton h-5 w-44" />
        <div className="mt-3 rounded bg-base-200 p-3">
          <div className="space-y-2 font-mono text-xs">
            <SkeletonJsonLine width="1rem" />
            <SkeletonJsonLine width="1rem" indent={1} />
            <SkeletonJsonLine width="11rem" indent={2} />
            <SkeletonJsonLine width="9rem" indent={2} />
            <SkeletonJsonLine width="8rem" indent={2} />
            <SkeletonJsonLine width="12rem" indent={2} />
            <SkeletonJsonLine width="1rem" indent={1} />
            <SkeletonJsonLine width="1rem" indent={1} />
            <SkeletonJsonLine width="10rem" indent={2} />
            <SkeletonJsonLine width="8rem" indent={2} />
            <SkeletonJsonLine width="9rem" indent={2} />
            <SkeletonJsonLine width="11rem" indent={2} />
            <SkeletonJsonLine width="1rem" indent={1} />
            <SkeletonJsonLine width="1rem" />
          </div>
        </div>
      </div>

      <div className="w-full rounded-lg border border-base-300 bg-base-100 p-4">
        <div className="skeleton h-5 w-40" />
        <div className="mt-3 rounded bg-base-200 p-3">
          <div className="space-y-2 font-mono text-xs">
            <SkeletonJsonLine width="12rem" />
            <SkeletonJsonLine width="16rem" />
            <SkeletonJsonLine width="8rem" />
          </div>
        </div>
      </div>
    </div>
  );
}

export async function DisplayPatientsContent() {
  let initial: GetPatientsResponse | null = null;
  let initialError: string | null = null;

  try {
    initial = await getPatients({ page: 1, limit: PAGE_SIZE });
  } catch (error) {
    initialError =
      error instanceof Error ? error.message : "Failed to fetch the first page of patients";
  }

  return (
    <DisplayPatientsClient
      initialPatients={initial?.data ?? []}
      initialPagination={
        initial?.pagination ?? {
          page: 0,
          limit: PAGE_SIZE,
          total: 0,
          totalPages: 1,
          hasNext: true,
          hasPrevious: false,
        }
      }
      initialError={initialError}
    />
  );
}

export function DisplayPatients() {
  return (
    <Suspense fallback={<DisplayPatientsSkeleton />}>
      <DisplayPatientsContent />
    </Suspense>
  );
}
