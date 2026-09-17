import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Badge } from "@/components/ui/badge";

describe("Badge", () => {
  it("renders as a soft-tint pill, never a solid fill", () => {
    render(<Badge variant="accent">Live in production</Badge>);
    const badge = screen.getByText("Live in production");
    expect(badge).toHaveClass("bg-accent/10", "text-accent", "rounded-full");
  });

  it("supports the uppercase/tracking-wide treatment", () => {
    render(<Badge uppercase>Fintech</Badge>);
    expect(screen.getByText("Fintech")).toHaveClass("uppercase", "tracking-wide");
  });

  it("defaults to the brand variant", () => {
    render(<Badge>Default</Badge>);
    expect(screen.getByText("Default")).toHaveClass("bg-brand/10", "text-brand");
  });
});
