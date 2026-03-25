export type PatientFilters = {
  page?: number; // default 1
  limit?: number; // default 20, max 20
};

export type Patient = {
  patient_id: string;
  name?: string | null;
  age?: number | string | null;
  gender?: string | null;
  blood_pressure?: string | null;
  temperature?: number | string | null;
  visit_date?: string | null;
  diagnosis?: string | null;
  medications?: string | null;
  [key: string]: unknown;
};

export type PatientsPagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
};

export type PatientsMetadata = {
  timestamp: string;
  version: string;
  requestId: string;
};

export type GetPatientsResponse = {
  data: Patient[];
  pagination: PatientsPagination;
  metadata: PatientsMetadata;
};

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 20;

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function toFiniteNumber(value: unknown): number | null {
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

function toStringOrNull(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function normalizePatient(rawPatient: unknown): Patient {
  if (!isObject(rawPatient)) {
    return {
      patient_id: "",
      name: null,
      age: null,
      gender: null,
      blood_pressure: null,
      temperature: null,
      visit_date: null,
      diagnosis: null,
      medications: null,
    };
  }

  const patientId = toStringOrNull(rawPatient.patient_id)?.trim();

  return {
    ...rawPatient,
    patient_id: patientId ?? "",
    name: toStringOrNull(rawPatient.name),
    age:
      typeof rawPatient.age === "number" || typeof rawPatient.age === "string"
        ? rawPatient.age
        : null,
    gender: toStringOrNull(rawPatient.gender),
    blood_pressure: toStringOrNull(rawPatient.blood_pressure),
    temperature:
      typeof rawPatient.temperature === "number" ||
      typeof rawPatient.temperature === "string"
        ? rawPatient.temperature
        : null,
    visit_date: toStringOrNull(rawPatient.visit_date),
    diagnosis: toStringOrNull(rawPatient.diagnosis),
    medications: toStringOrNull(rawPatient.medications),
  };
}

function normalizePatientsResponse(
  body: unknown,
  requestedPage: number,
  requestedLimit: number
): GetPatientsResponse {
  const responseObject = isObject(body) ? body : {};
  const rawData = Array.isArray(responseObject.data)
    ? responseObject.data
    : Array.isArray(responseObject.patients)
      ? responseObject.patients
      : Array.isArray(body)
        ? body
        : [];

  const rawPagination = isObject(responseObject.pagination) ? responseObject.pagination : {};
  const page = toFiniteNumber(rawPagination.page) ?? requestedPage;
  const limit = toFiniteNumber(rawPagination.limit) ?? requestedLimit;
  const total = toFiniteNumber(rawPagination.total) ?? rawData.length;
  const totalPages =
    toFiniteNumber(rawPagination.totalPages) ?? Math.max(1, Math.ceil(total / limit));

  const rawMetadata = isObject(responseObject.metadata) ? responseObject.metadata : {};

  return {
    data: rawData.map(normalizePatient),
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNext:
        typeof rawPagination.hasNext === "boolean"
          ? rawPagination.hasNext
          : page < totalPages,
      hasPrevious:
        typeof rawPagination.hasPrevious === "boolean"
          ? rawPagination.hasPrevious
          : page > 1,
    },
    metadata: {
      timestamp: toStringOrNull(rawMetadata.timestamp) ?? "",
      version: toStringOrNull(rawMetadata.version) ?? "",
      requestId: toStringOrNull(rawMetadata.requestId) ?? "",
    },
  };
}

export async function getPatients(
  filters: PatientFilters = {}
): Promise<GetPatientsResponse> {
  const page = Math.max(DEFAULT_PAGE, Math.floor(filters.page ?? DEFAULT_PAGE));
  const limit = Math.min(
    MAX_LIMIT,
    Math.max(1, Math.floor(filters.limit ?? DEFAULT_LIMIT))
  );
  const queryParams = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });
  const response = await fetch(
    `${process.env.BASE_URL!}/patients?${queryParams.toString()}`,
    {
      cache: "no-store",
      headers: {
        "x-api-key": process.env.KSENSE_API_KEY!,
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch patients: ${response.status} ${response.statusText}`);
  }

  const body = (await response.json()) as unknown;

  return normalizePatientsResponse(body, page, limit);
}
