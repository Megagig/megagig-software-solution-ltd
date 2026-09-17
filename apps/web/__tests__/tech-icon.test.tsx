import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { TechStackStrip } from "@/components/ui/tech-icon";

describe("TechStackStrip", () => {
  it("renders one item per entry", () => {
    render(
      <TechStackStrip
        items={[
          { icon: <svg data-testid="icon-next" />, label: "Next.js" },
          { icon: <svg data-testid="icon-go" />, label: "Go" },
        ]}
      />
    );
    expect(screen.getByText("Next.js")).toBeInTheDocument();
    expect(screen.getByText("Go")).toBeInTheDocument();
    expect(screen.getByTestId("icon-next")).toBeInTheDocument();
    expect(screen.getByTestId("icon-go")).toBeInTheDocument();
  });
});
