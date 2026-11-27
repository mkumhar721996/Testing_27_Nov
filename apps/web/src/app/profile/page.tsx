import { cookies } from "next/headers";
import { redirect } from "next/navigation";

type Me = { name: string; email: string };

async function loadMe(): Promise<Me> {
  const token = (await cookies()).get("session")?.value;
  if (!token) redirect("/sign-in");

  const res = await fetch(`${process.env.API_BASE_URL}/api/me`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  }).catch(() => null);
  if (!res?.ok) redirect("/sign-in");
  return res.json();
}

export default async function Profile() {
  const me = await loadMe();
  return (
    <div className="auth-page">
      <header className="auth-header">
        <strong className="auth-logo">Product</strong>
      </header>
      <main className="auth-main">
        <div className="card auth-card">
          <h1>Traveller profile</h1>
          <div className="field">
            <label htmlFor="profile-name">Name</label>
            <input id="profile-name" className="input" defaultValue={me.name} readOnly />
          </div>
          <div className="field">
            <label htmlFor="profile-email">Email</label>
            <input id="profile-email" className="input" defaultValue={me.email} readOnly />
          </div>
          <p>
            Preferences <span className="badge badge-primary">Optional</span>
          </p>
        </div>
      </main>
    </div>
  );
}
