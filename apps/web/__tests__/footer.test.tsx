import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Footer } from "@/components/footer";

describe("Footer", () => {
  it("renders without crashing and shows the current year", () => {
    render(<Footer />);
    const year = new Date().getFullYear().toString();
    expect(screen.getByText(new RegExp(year))).toBeInTheDocument();
  });

  it("never renders Grit branding", () => {
    render(<Footer />);
    expect(screen.queryByText(/built with grit/i)).not.toBeInTheDocument();
  });

  it("renders all four sitemap columns", () => {
    render(<Footer />);
    // "Services" and "Products" are both the column heading AND a link
    // inside that column (the index page) — scope to the heading role to
    // disambiguate rather than asserting on text alone.
    expect(screen.getByRole("heading", { name: "Services" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Products" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Resources" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Company" })).toBeInTheDocument();
  });

  it("omits contact info and socials when SiteSettings has none", () => {
    render(<Footer />);
    expect(screen.queryByLabelText("github")).not.toBeInTheDocument();
  });

  it("renders contact info and socials when provided", () => {
    render(
      <Footer
        contactEmail="hello@megagig-software-solution.dev"
        contactPhone="+234 000 000 0000"
        socialLinks={{ github: "https://github.com/megagig-software-solution" }}
      />
    );
    expect(screen.getByText("hello@megagig-software-solution.dev")).toBeInTheDocument();
    expect(screen.getByText("+234 000 000 0000")).toBeInTheDocument();
    expect(screen.getByLabelText("github")).toHaveAttribute(
      "href",
      "https://github.com/megagig-software-solution"
    );
  });
});
