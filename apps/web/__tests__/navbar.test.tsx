import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { Navbar } from "@/components/navbar";

vi.mock("next/navigation", () => ({
  usePathname: () => "/",
}));

describe("Navbar", () => {
  it("renders the brand name", () => {
    render(<Navbar />);
    expect(screen.getByText("Megagig Software Solution")).toBeInTheDocument();
  });

  it("renders every nav link", () => {
    render(<Navbar />);
    expect(screen.getByRole("link", { name: "Services" })).toHaveAttribute("href", "/services");
    expect(screen.getByRole("link", { name: "Products" })).toHaveAttribute("href", "/products");
    expect(screen.getByRole("link", { name: "Case Studies" })).toHaveAttribute("href", "/case-studies");
    expect(screen.getByRole("link", { name: "Pricing" })).toHaveAttribute("href", "/pricing");
    expect(screen.getByRole("link", { name: "Contact" })).toHaveAttribute("href", "/contact-us");
  });

  it("always renders a primary Start a project CTA", () => {
    render(<Navbar />);
    expect(screen.getAllByText("Start a project").length).toBeGreaterThan(0);
  });

  it("renders the theme toggle button", () => {
    render(<Navbar />);
    expect(screen.getAllByLabelText(/switch to (dark|light) mode/i).length).toBeGreaterThan(0);
  });
});
