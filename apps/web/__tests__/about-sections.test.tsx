import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import type { AboutItem } from "@repo/shared/types";
import { ProcessSteps } from "@/app/(marketing)/about-us/_components/process-steps";
import { Timeline } from "@/app/(marketing)/about-us/_components/timeline";
import { ValuesGrid } from "@/components/values-grid";
import { AboutStory } from "@/app/(marketing)/about-us/_components/about-story";

const item = (n: number, kind: AboutItem["kind"], extra: Partial<AboutItem> = {}): AboutItem => ({
  id: `item-${kind}-${n}`,
  kind,
  title: `Title ${n}`,
  description: `Description ${n}`,
  label: "",
  published: true,
  sort_order: n,
  created_at: "",
  updated_at: "",
  ...extra,
});

describe("About sections", () => {
  it("each section renders nothing when it has no items", () => {
    expect(render(<ValuesGrid values={[]} tone="surface" />).container).toBeEmptyDOMElement();
    expect(render(<Timeline milestones={[]} tone="surface" />).container).toBeEmptyDOMElement();
    expect(render(<ProcessSteps steps={[]} tone="surface" />).container).toBeEmptyDOMElement();
  });

  it("ProcessSteps numbers steps 01, 02, 03 from their order", () => {
    render(<ProcessSteps steps={[1, 2, 3].map((n) => item(n, "step"))} tone="surface" />);
    expect(screen.getByText("01")).toBeInTheDocument();
    expect(screen.getByText("03")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Title 2" })).toBeInTheDocument();
  });

  it("Timeline shows the free-form label only when set", () => {
    render(
      <Timeline
        milestones={[item(1, "milestone", { label: "2023" }), item(2, "milestone")]}
        tone="background"
      />
    );
    expect(screen.getByText("2023")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Title 2" })).toBeInTheDocument();
  });

  it("ValuesGrid renders every value", () => {
    render(<ValuesGrid values={[item(1, "value"), item(2, "value")]} tone="surface" />);
    expect(screen.getByRole("heading", { name: "Title 1" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Title 2" })).toBeInTheDocument();
  });

  it("AboutStory splits paragraphs on blank lines and hides when blank", () => {
    render(<AboutStory story={"One.\n\nTwo."} tone="surface" />);
    expect(screen.getByText("One.")).toBeInTheDocument();
    expect(screen.getByText("Two.")).toBeInTheDocument();
    expect(render(<AboutStory story={"  \n\n "} tone="surface" />).container).toBeEmptyDOMElement();
  });
});
