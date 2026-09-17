import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { SectionHeading } from "@/components/ui/section-heading";

describe("SectionHeading", () => {
  it("renders the title as a heading", () => {
    render(<SectionHeading title="What we build" />);
    expect(screen.getByRole("heading", { name: "What we build" })).toBeInTheDocument();
  });

  it("renders eyebrow and subhead only when provided", () => {
    const { rerender } = render(<SectionHeading title="Services" />);
    expect(screen.queryByText("What we do")).not.toBeInTheDocument();

    rerender(
      <SectionHeading eyebrow="What we do" title="Services" subhead="End-to-end delivery" />
    );
    expect(screen.getByText("What we do")).toBeInTheDocument();
    expect(screen.getByText("End-to-end delivery")).toBeInTheDocument();
  });

  it("centers the subhead only in center alignment", () => {
    render(<SectionHeading title="Services" subhead="Centered copy" align="center" />);
    expect(screen.getByText("Centered copy")).toHaveClass("mx-auto");
  });
});
