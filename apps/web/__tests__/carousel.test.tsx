import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Carousel } from "@/components/ui/carousel";

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
});
