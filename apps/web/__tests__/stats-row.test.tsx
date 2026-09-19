import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import type { Stat } from "@repo/shared/types";
import { StatsRow } from "@/components/stats-row";

const stat = (n: number): Stat => ({
  id: `stat-${n}`,
  value: `${n}0+`,
  label: `Label ${n}`,
  published: true,
  sort_order: n,
  created_at: "",
  updated_at: "",
});

describe("StatsRow", () => {
  it("renders nothing when there are no stats", () => {
    const { container } = render(<StatsRow stats={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("caps at 4 stats per ui-rules.md §10, keeping curated order", () => {
    render(<StatsRow stats={[1, 2, 3, 4, 5, 6].map(stat)} />);
    expect(screen.getByText("Label 1")).toBeInTheDocument();
    expect(screen.getByText("Label 4")).toBeInTheDocument();
    expect(screen.queryByText("Label 5")).not.toBeInTheDocument();
  });

  it("honours a lower max (Home's Our Story shows 2)", () => {
    render(<StatsRow stats={[1, 2, 3, 4].map(stat)} max={2} />);
    expect(screen.getByText("Label 2")).toBeInTheDocument();
    expect(screen.queryByText("Label 3")).not.toBeInTheDocument();
  });

  it("sizes the grid to the number shown so few stats stay centred", () => {
    const { container } = render(<StatsRow stats={[1, 2].map(stat)} />);
    expect(container.firstChild).toHaveClass("sm:grid-cols-2");
  });
});
