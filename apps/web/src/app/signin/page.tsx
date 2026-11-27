import { redirect } from "next/navigation";
import { SignInPanel, type SignInState } from "@/components/sign-in-panel";
import { auth0 } from "@/lib/auth0";

type SearchParams = { reason?: string; error?: string };

function initialState({ reason, error }: SearchParams): SignInState {
  if (error === "signin-failed") return "error";
  if (reason === "session-ended" || reason === "signed-out") return reason;
  return "default";
}

export default async function SignInPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  if (await auth0.getSession()) redirect("/organizations");
  return <SignInPanel initial={initialState(await searchParams)} />;
}
