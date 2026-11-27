import { getAccessToken } from "@/lib/session";

export type EmploymentType = "Full time" | "Part time" | "Contract";

export type JobOpening = {
  id: number;
  reference: string;
  title: string;
  department: string;
  location: string;
  employment_type: EmploymentType;
  description: string;
  status: "open" | "closed";
  candidate_count: number;
  in_progress_count: number;
};

export type JobOpeningDetails = {
  title: string;
  department: string;
  location: string;
  employment_type: EmploymentType | "";
  description: string;
};

export class ForbiddenError extends Error {}

export class ValidationError extends Error {
  constructor(readonly fields: Record<string, string>) {
    super("Validation failed");
  }
}

export class CloseRefusedError extends Error {
  constructor(readonly inProgress: number) {
    super("Close refused");
  }
}

const FIELD_MESSAGES: Record<string, string> = {
  title: "Enter a job title.",
  department: "Enter a department.",
  location: 'Enter a location, or "Remote".',
  employment_type: "Choose an employment type.",
};

async function request(path: string, init: RequestInit = {}): Promise<Response> {
  const token = await getAccessToken();
  const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL ?? ""}${path}`, {
    ...init,
    headers: {
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (response.status === 401 || response.status === 403) throw new ForbiddenError();
  if (response.status === 422) {
    const body = await response.json();
    const fields: Record<string, string> = {};
    for (const issue of body.detail ?? []) {
      const field = String(issue.loc?.[issue.loc.length - 1]);
      fields[field] = FIELD_MESSAGES[field] ?? issue.msg;
    }
    throw new ValidationError(fields);
  }
  if (response.status === 409) {
    const body = await response.json();
    throw new CloseRefusedError(body.detail?.in_progress ?? 0);
  }
  if (!response.ok) throw new Error(`Request failed with status ${response.status}`);
  return response;
}

export async function listJobOpenings(): Promise<JobOpening[]> {
  return (await request("/job-openings")).json();
}

export async function createJobOpening(details: JobOpeningDetails): Promise<JobOpening> {
  return (await request("/job-openings", { method: "POST", body: JSON.stringify(details) })).json();
}

export async function updateJobOpening(
  id: number,
  details: JobOpeningDetails,
): Promise<JobOpening> {
  return (
    await request(`/job-openings/${id}`, { method: "PATCH", body: JSON.stringify(details) })
  ).json();
}

export async function openJobOpening(id: number): Promise<JobOpening> {
  return (await request(`/job-openings/${id}/open`, { method: "POST" })).json();
}

export async function closeJobOpening(id: number): Promise<JobOpening> {
  return (await request(`/job-openings/${id}/close`, { method: "POST" })).json();
}
