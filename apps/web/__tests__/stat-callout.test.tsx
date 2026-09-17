import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { StatCallout } from "@/components/ui/stat-callout";

describe("StatCallout", () => {
  it("renders the value and label", () => {
    render(<StatCallout value="50+" label="Projects shipped" />);
    expect(screen.getByText("50+")).toBeInTheDocument();
    expect(screen.getByText("Projects shipped")).toBeInTheDocument();
  });

  it("uses foreground tone instead of brand when requested", () => {
    render(<StatCallout value="99.9%" label="Uptime" tone="foreground" />);
    expect(screen.getByText("99.9%")).toHaveClass("text-foreground");
    expect(screen.getByText("99.9%")).not.toHaveClass("text-brand");
  });
});
