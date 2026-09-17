import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";

describe("Card", () => {
  it("composes header/title/description/content/footer", () => {
    render(
      <Card data-testid="card">
        <CardHeader>
          <CardTitle>PharmacyCopilot</CardTitle>
          <CardDescription>Pharmacy management, offline-first</CardDescription>
        </CardHeader>
        <CardContent>Body content</CardContent>
        <CardFooter>Explore product</CardFooter>
      </Card>
    );
    expect(screen.getByTestId("card")).toBeInTheDocument();
    expect(screen.getByText("PharmacyCopilot")).toBeInTheDocument();
    expect(screen.getByText("Pharmacy management, offline-first")).toBeInTheDocument();
    expect(screen.getByText("Body content")).toBeInTheDocument();
    expect(screen.getByText("Explore product")).toBeInTheDocument();
  });

  it("only applies hover-lift classes when interactive", () => {
    render(<Card data-testid="static">Static</Card>);
    expect(screen.getByTestId("static")).not.toHaveClass("cursor-pointer");

    render(
      <Card data-testid="interactive" interactive>
        Clickable
      </Card>
    );
    expect(screen.getByTestId("interactive")).toHaveClass("cursor-pointer", "hover:shadow-md");
  });
});
