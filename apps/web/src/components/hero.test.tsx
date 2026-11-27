import { render, screen } from "@testing-library/react";
import { Hero } from "./hero";

describe("Hero", () => {
  it("renders the title as a heading", () => {
    render(<Hero title="Web App" />);
    expect(screen.getByRole("heading", { name: "Web App" })).toBeInTheDocument();
  });
});
