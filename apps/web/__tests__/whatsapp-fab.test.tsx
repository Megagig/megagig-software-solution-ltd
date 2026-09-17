import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { WhatsAppFab } from "@/components/whatsapp-fab";

describe("WhatsAppFab", () => {
  it("renders nothing when no number is available", () => {
    const { container } = render(<WhatsAppFab whatsAppNumber={null} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("links to wa.me with digits only, stripping formatting characters", () => {
    render(<WhatsAppFab whatsAppNumber="+234 000 000 0000" />);
    expect(screen.getByRole("link")).toHaveAttribute("href", "https://wa.me/2340000000000");
  });
});
