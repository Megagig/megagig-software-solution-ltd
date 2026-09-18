import { useState } from "react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Carousel } from "@/components/ui/carousel";

// Mirrors FeaturedProjects' actual usage: a parent-owned `active` index
// fed back into Carousel via `index`, so an external control (a pill
// button) can jump the carousel instead of only waiting for auto-advance.
function ControlledCarousel() {
  const [active, setActive] = useState(0);
  return (
    <div>
      <button type="button" onClick={() => setActive(1)}>
        Jump to B
      </button>
      <Carousel index={active} onIndexChange={setActive}>
        <div>Slide A</div>
        <div>Slide B</div>
      </Carousel>
    </div>
  );
}

describe("Carousel", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders every slide", () => {
    render(
      <Carousel>
        <div>Slide A</div>
        <div>Slide B</div>
      </Carousel>
    );
    expect(screen.getByText("Slide A")).toBeInTheDocument();
    expect(screen.getByText("Slide B")).toBeInTheDocument();
  });

  it("hides prev/next controls and dots for a single slide (never a fake carousel)", () => {
    render(
      <Carousel>
        <div>Only slide</div>
      </Carousel>
    );
    expect(screen.queryByRole("button", { name: "Next slide" })).not.toBeInTheDocument();
  });

  it("advances via the next control", async () => {
    const user = userEvent.setup();
    render(
      <Carousel>
        <div>Slide A</div>
        <div>Slide B</div>
      </Carousel>
    );
    await user.click(screen.getByRole("button", { name: "Next slide" }));
    expect(screen.getByRole("button", { name: "Go to slide 2" })).toHaveAttribute(
      "aria-current",
      "true"
    );
  });

  it("jumps to the slide commanded by an external index (e.g. a caller's own clickable pill list)", async () => {
    const user = userEvent.setup();
    render(<ControlledCarousel />);

    expect(screen.getByRole("button", { name: "Go to slide 1" })).toHaveAttribute("aria-current", "true");

    await user.click(screen.getByRole("button", { name: "Jump to B" }));

    expect(screen.getByRole("button", { name: "Go to slide 2" })).toHaveAttribute("aria-current", "true");
  });
});
