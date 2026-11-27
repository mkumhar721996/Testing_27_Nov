export type Profile = {
  name: string;
  email: string;
  seat: string | null;
  cabin: string | null;
  diet: string | null;
  roles: string[];
};
export type ProfileDraft = Omit<Profile, "roles">;

export const SEAT_OPTIONS = ["Window", "Aisle", "Middle"] as const;
export const CABIN_OPTIONS = ["Economy", "Premium economy", "Business", "First"] as const;
export const DIET_OPTIONS = [
  "Vegetarian",
  "Vegan",
  "Halal",
  "Kosher",
  "Gluten-free",
  "Dairy-free",
] as const;

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// The sign-in item stores the Identity Provider's access token here after sign-in.
const getAccessToken = () => sessionStorage.getItem("access_token");
export const clearAccessToken = () => sessionStorage.removeItem("access_token");

async function request(method: "GET" | "PUT", body?: ProfileDraft): Promise<Profile> {
  const response = await fetch(`${API_URL}/me/profile`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(getAccessToken() && { Authorization: `Bearer ${getAccessToken()}` }),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!response.ok) throw new Error(`Profile request failed with ${response.status}`);
  return response.json();
}

export const fetchProfile = () => request("GET");
export const saveProfile = (draft: ProfileDraft) => request("PUT", draft);

export function validateDraft(draft: ProfileDraft): { name?: string; email?: string } {
  const errors: { name?: string; email?: string } = {};
  if (!draft.name.trim()) errors.name = "Enter your name.";
  if (!EMAIL_PATTERN.test(draft.email.trim())) errors.email = "Enter a valid email address.";
  return errors;
}
