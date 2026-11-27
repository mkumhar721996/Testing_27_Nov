// Seam for the signed-in person's access token. Sign-in itself belongs to the identity
// provider and is not wired up yet; until it is, no token is available.
export async function getAccessToken(): Promise<string | null> {
  return null;
}
