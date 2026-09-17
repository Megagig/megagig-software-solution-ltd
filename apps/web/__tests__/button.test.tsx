import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Button } from "@/components/ui/button";

describe("Button", () => {
  it("renders children and defaults to the primary variant", () => {
    render(<Button>Start a project</Button>);
    const button = screen.getByRole("button", { name: "Start a project" });
    expect(button).toHaveClass("bg-brand", "text-brand-foreground");
  });

  it("applies secondary variant classes", () => {
    render(<Button variant="secondary">See our work</Button>);
    expect(screen.getByRole("button")).toHaveClass("border-border", "bg-transparent");
  });

  it("resets padding/height for the ghost variant regardless of size", () => {
    render(
      <Button variant="ghost" size="lg">
        Explore product
      </Button>
    );
    const button = screen.getByRole("button");
    expect(button).toHaveClass("h-auto", "p-0");
    expect(button).not.toHaveClass("h-12", "px-8");
  });

  it("disables and dims when the disabled prop is set", () => {
    render(<Button disabled>Submit</Button>);
    expect(screen.getByRole("button")).toBeDisabled();
  });
});
