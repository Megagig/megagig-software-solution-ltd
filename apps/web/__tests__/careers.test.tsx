import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import type { JobOpening } from "@repo/shared/types";
import { RoleCard } from "@/app/(marketing)/careers/_components/role-card";
import { RolesSection } from "@/app/(marketing)/careers/_components/roles-section";
import { CareersHero } from "@/app/(marketing)/careers/_components/careers-hero";
import { CvBand } from "@/app/(marketing)/careers/_components/cv-band";
import { getApplyHref, getCvHref } from "@/lib/job-openings";

const role = (n: number, extra: Partial<JobOpening> = {}): JobOpening => ({
  id: `role-${n}`,
  title: `Role ${n}`,
  department: "Engineering",
  location: "Lagos, Nigeria",
  employment_type: "Full-time",
  description: "First paragraph.\n\nSecond paragraph.",
  apply_url: "",
  is_open: true,
  created_at: "",
  updated_at: "",
  ...extra,
});

describe("apply / CV links", () => {
  it("uses the role's own apply_url when set", () => {
    expect(getApplyHref(role(1, { apply_url: "https://forms.example.com/apply" }), "hi@x.ng")).toBe(
      "https://forms.example.com/apply"
    );
  });

  it("falls back to the CV email with the role title in the subject", () => {
    expect(getApplyHref(role(1, { title: "Full-Stack Developer" }), "hi@x.ng")).toBe(
      "mailto:hi@x.ng?subject=Application%3A%20Full-Stack%20Developer"
    );
  });

  it("falls back to the contact page when there is no email either", () => {
    expect(getApplyHref(role(1), null)).toBe("/contact-us");
    expect(getCvHref(undefined)).toBe("/contact-us");
    expect(getCvHref("hi@x.ng")).toBe("mailto:hi@x.ng?subject=CV%20%2F%20Application");
  });

  it("treats a whitespace-only apply_url as unset", () => {
    expect(getApplyHref(role(1, { apply_url: "   " }), "hi@x.ng")).toContain("mailto:hi@x.ng");
  });
});

describe("RoleCard", () => {
  it("renders the title, meta line, type pill and expandable description", () => {
    const { container } = render(<RoleCard role={role(1)} contactEmail="hi@x.ng" />);
    expect(screen.getByRole("heading", { name: "Role 1" })).toBeInTheDocument();
    expect(screen.getByText("Full-time")).toBeInTheDocument();
    expect(screen.getByText("Engineering")).toBeInTheDocument();
    expect(screen.getByText("Lagos, Nigeria")).toBeInTheDocument();
    expect(screen.getByText("First paragraph.")).toBeInTheDocument();
    expect(container.querySelector("details")).not.toHaveAttribute("open");
  });

  it("starts expanded when asked (a single open role)", () => {
    const { container } = render(<RoleCard role={role(1)} contactEmail="hi@x.ng" defaultOpen />);
    expect(container.querySelector("details")).toHaveAttribute("open");
  });

  it("external apply links open in a new tab; mailto links do not", () => {
    const { unmount } = render(<RoleCard role={role(1, { apply_url: "https://forms.example.com/a" })} />);
    const external = screen.getByRole("link", { name: /Apply for this role/ });
    expect(external).toHaveAttribute("target", "_blank");
    unmount();

    render(<RoleCard role={role(1)} contactEmail="hi@x.ng" />);
    const mail = screen.getByRole("link", { name: /Apply for this role/ });
    expect(mail.getAttribute("href")).toMatch(/^mailto:hi@x\.ng/);
    expect(mail).not.toHaveAttribute("target");
  });
});

describe("RolesSection", () => {
  it("lists open roles, expanding a lone role by default", () => {
    const { container } = render(<RolesSection roles={[role(1)]} contactEmail="hi@x.ng" tone="surface" />);
    expect(screen.getByRole("heading", { name: "Role 1" })).toBeInTheDocument();
    expect(container.querySelector("details")).toHaveAttribute("open");
    expect(container.querySelector("#roles")).toBeInTheDocument();
  });

  it("collapses roles by default when there are several", () => {
    const { container } = render(<RolesSection roles={[role(1), role(2)]} contactEmail="hi@x.ng" tone="surface" />);
    container.querySelectorAll("details").forEach((d) => expect(d).not.toHaveAttribute("open"));
  });

  it("shows a designed empty state (not a bare message) when nothing is open", () => {
    render(<RolesSection roles={[]} contactEmail="hi@x.ng" tone="surface" />);
    expect(screen.getByRole("heading", { name: "No open roles right now" })).toBeInTheDocument();
    expect(screen.getByText("Nothing open at the moment")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Apply for this role/ })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /IT training & internships/ })).toHaveAttribute(
      "href",
      "/services/it-training-internships"
    );
  });
});

describe("CareersHero and CvBand", () => {
  it("hero links to the roles anchor and the CV mailto", () => {
    render(<CareersHero cvHref="mailto:hi@x.ng?subject=CV" />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Join the team");
    expect(screen.getByRole("link", { name: /See open roles/ })).toHaveAttribute("href", "#roles");
    expect(screen.getByRole("link", { name: "Send your CV" })).toHaveAttribute("href", "mailto:hi@x.ng?subject=CV");
  });

  it("CV band mails the contact email, or links to the contact page without one", () => {
    const { unmount } = render(<CvBand contactEmail="hi@x.ng" />);
    expect(screen.getByRole("link", { name: "Send your CV" }).getAttribute("href")).toMatch(/^mailto:hi@x\.ng/);
    expect(screen.getByText("hi@x.ng")).toBeInTheDocument();
    unmount();

    render(<CvBand contactEmail={null} />);
    expect(screen.getByRole("link", { name: "Send your CV" })).toHaveAttribute("href", "/contact-us");
  });
});
