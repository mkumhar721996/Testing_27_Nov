import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SignInScreen } from "./sign-in-screen";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

const fetchMock = vi.fn();

function reply(status: number, body: unknown) {
  fetchMock.mockResolvedValue(new Response(JSON.stringify(body), { status }));
}

function fillSignIn(email = "amara.okafor@example.com", password = "test-password") {
  fireEvent.change(screen.getByLabelText("Email"), { target: { value: email } });
  fireEvent.change(screen.getByLabelText("Password"), { target: { value: password } });
  fireEvent.click(screen.getByRole("button", { name: "Continue with Auth0" }));
}

function openSignUp() {
  fireEvent.click(screen.getByRole("tab", { name: "Create account" }));
}

function fillSignUp() {
  fireEvent.change(screen.getByLabelText("Full name"), { target: { value: "Lena Hartmann" } });
  fireEvent.change(screen.getByLabelText("Email"), {
    target: { value: "lena.hartmann@example.com" },
  });
  fireEvent.change(screen.getByLabelText("Password"), { target: { value: "test-password" } });
  fireEvent.click(screen.getByRole("button", { name: "Sign up with Auth0" }));
}

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  render(<SignInScreen />);
});

afterEach(() => {
  fetchMock.mockReset();
  push.mockReset();
  vi.unstubAllGlobals();
});

describe("Sign in screen", () => {
  it("shows the sign-in and sign-up tabs and the Auth0 buttons, with no social option", () => {
    expect(screen.getByRole("tab", { name: "Sign in" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Create account" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Continue with Auth0" })).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /google|facebook|apple|github|social/i }),
    ).toBeNull();
    openSignUp();
    expect(screen.getByRole("button", { name: "Sign up with Auth0" })).toBeInTheDocument();
    expect(screen.getByText("At least 8 characters.")).toBeInTheDocument();
  });

  it("goes to the profile after a successful sign-in", async () => {
    reply(200, { ok: true });
    fillSignIn();
    await waitFor(() => expect(push).toHaveBeenCalledWith("/profile"));
  });

  it("shows a field error and does not call Auth0 for an empty password", () => {
    fillSignIn("amara.okafor@example.com", "");
    expect(screen.getByText("Enter your password.")).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("shows both Auth0 buttons loading and disabled while waiting", () => {
    fetchMock.mockReturnValue(new Promise(() => {}));
    fillSignIn();
    const buttons = screen.getAllByRole("button", { name: /with Auth0, loading/ });
    expect(buttons).toHaveLength(2);
    buttons.forEach((b) => expect(b).toBeDisabled());
    expect(
      screen.getByRole("heading", { name: "Contacting Auth0" }).closest("[aria-busy]"),
    ).toHaveAttribute("aria-busy", "true");
  });

  it("shows the sign-in error and Try again returns to the Sign in form", async () => {
    reply(401, { code: "invalid_credentials" });
    fillSignIn();
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Sign-in failed. Check your details and try again.",
    );
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(screen.getByRole("heading", { name: "Sign in to your account" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Sign in", selected: true })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Continue with Auth0" })).toBeInTheDocument();
  });

  it("tells an unverified traveller to verify their email address", async () => {
    reply(403, { code: "email_not_verified", email: "unverified@example.com" });
    fillSignIn("unverified@example.com");
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(/verify your email address/i);
    expect(alert).toHaveTextContent("unverified@example.com");
    expect(push).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(screen.getByRole("tab", { name: "Sign in", selected: true })).toBeInTheDocument();
  });

  it("asks the new traveller to verify their email after sign-up", async () => {
    reply(201, { code: "verify_email", email: "lena.hartmann@example.com" });
    openSignUp();
    fillSignUp();
    expect(
      await screen.findByText(/verify your email address to finish creating your account/i),
    ).toBeInTheDocument();
    expect(screen.getByText("lena.hartmann@example.com")).toBeInTheDocument();
  });

  it("shows the sign-up error and Try again returns to the Create account tab", async () => {
    reply(400, { code: "sign_up_rejected" });
    openSignUp();
    fillSignUp();
    expect(await screen.findByRole("alert")).toHaveTextContent("Sign-up failed.");
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(screen.getByRole("tab", { name: "Create account", selected: true })).toBeInTheDocument();
  });

  it("treats an unavailable Auth0 as a sign-in error", async () => {
    reply(502, { code: "unavailable" });
    fillSignIn();
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Sign-in failed.");
    expect(alert).toHaveTextContent("try again in a moment");
    expect(screen.queryByText("The email or password did not match an account.")).toBeNull();
  });

  it("tells the traveller to wait, not to check their details, when rate limited", async () => {
    reply(429, { code: "too_many_attempts" });
    fillSignIn();
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Too many sign-in attempts");
    expect(screen.queryByText("The email or password did not match an account.")).toBeNull();
  });

  it("moves between the tabs with the arrow keys", () => {
    const signInTab = screen.getByRole("tab", { name: "Sign in" });
    signInTab.focus();
    fireEvent.keyDown(signInTab, { key: "ArrowRight" });
    const createTab = screen.getByRole("tab", { name: "Create account", selected: true });
    expect(createTab).toHaveFocus();
    fireEvent.keyDown(createTab, { key: "ArrowLeft" });
    expect(screen.getByRole("tab", { name: "Sign in", selected: true })).toHaveFocus();
    fireEvent.keyDown(screen.getByRole("tab", { name: "Sign in" }), { key: "End" });
    expect(screen.getByRole("tab", { name: "Create account", selected: true })).toHaveFocus();
    fireEvent.keyDown(screen.getByRole("tab", { name: "Create account" }), { key: "Home" });
    expect(screen.getByRole("tab", { name: "Sign in", selected: true })).toHaveFocus();
  });
});
