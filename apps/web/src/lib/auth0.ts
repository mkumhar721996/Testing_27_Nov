// Server-side Auth0 client. Sign-in and token issuing happen only at Auth0 (ADR-0005).

export type SignInResult =
  | { kind: "ok"; accessToken: string; expiresIn: number }
  | { kind: "invalid_credentials" }
  | { kind: "email_not_verified" }
  | { kind: "unavailable" };

export type SignUpResult = { kind: "created" } | { kind: "rejected" } | { kind: "unavailable" };

const PASSWORD_REALM_GRANT = "http://auth0.com/oauth/grant-type/password-realm";
const UNVERIFIED_DESCRIPTION = /verify your email/i;

function config() {
  const domain = process.env.AUTH0_DOMAIN;
  const clientId = process.env.AUTH0_CLIENT_ID;
  if (!domain || !clientId) return null;
  return {
    domain,
    clientId,
    clientSecret: process.env.AUTH0_CLIENT_SECRET ?? "",
    audience: process.env.AUTH0_AUDIENCE ?? "",
    connection: process.env.AUTH0_DB_CONNECTION ?? "Username-Password-Authentication",
  };
}

function post(url: string, body: unknown) {
  return fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

export async function passwordSignIn(email: string, password: string): Promise<SignInResult> {
  const c = config();
  if (!c) return { kind: "unavailable" };
  try {
    const res = await post(`https://${c.domain}/oauth/token`, {
      grant_type: PASSWORD_REALM_GRANT,
      realm: c.connection,
      username: email,
      password,
      audience: c.audience,
      scope: "openid profile email",
      client_id: c.clientId,
      client_secret: c.clientSecret,
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok && typeof data.access_token === "string") {
      return { kind: "ok", accessToken: data.access_token, expiresIn: Number(data.expires_in) || 3600 };
    }
    if (data.error === "access_denied" && UNVERIFIED_DESCRIPTION.test(data.error_description ?? "")) {
      return { kind: "email_not_verified" };
    }
    if (res.status === 400 || res.status === 401 || res.status === 403) {
      return { kind: "invalid_credentials" };
    }
    return { kind: "unavailable" };
  } catch {
    return { kind: "unavailable" };
  }
}

export async function signUp(name: string, email: string, password: string): Promise<SignUpResult> {
  const c = config();
  if (!c) return { kind: "unavailable" };
  try {
    const res = await post(`https://${c.domain}/dbconnections/signup`, {
      client_id: c.clientId,
      connection: c.connection,
      email,
      password,
      name,
    });
    if (res.ok) return { kind: "created" };
    return res.status >= 500 ? { kind: "unavailable" } : { kind: "rejected" };
  } catch {
    return { kind: "unavailable" };
  }
}
