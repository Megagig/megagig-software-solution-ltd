import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { FounderSpotlight, hasFounderContent } from "@/app/(marketing)/_components/founder-spotlight";

const founder = {
  founder_name: "Ada Obi",
  founder_role: "Founder, Example Ltd",
  founder_quote: "Build software people use.",
  founder_bio: "First paragraph.\n\nSecond paragraph.",
  founder_photo_url: "/photo.png",
  founder_github_url: "https://github.com/example",
  founder_linkedin_url: "",
  founder_twitter_url: "",
};

describe("FounderSpotlight", () => {
  it("renders the quote, name, role and one paragraph per blank-line-separated block", () => {
    render(<FounderSpotlight founder={founder} />);
    expect(screen.getByText(/Build software people use/)).toBeInTheDocument();
    expect(screen.getByText("Ada Obi")).toBeInTheDocument();
    expect(screen.getByText("Founder, Example Ltd")).toBeInTheDocument();
    expect(screen.getByText("First paragraph.")).toBeInTheDocument();
    expect(screen.getByText("Second paragraph.")).toBeInTheDocument();
  });

  it("only renders link buttons for URLs that are set", () => {
    render(<FounderSpotlight founder={founder} />);
    expect(screen.getByRole("link", { name: /GitHub/ })).toHaveAttribute("href", "https://github.com/example");
    expect(screen.queryByRole("link", { name: /LinkedIn/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /X/ })).not.toBeInTheDocument();
  });

  it("renders nothing when there is no name, quote or bio", () => {
    const empty = { ...founder, founder_name: "", founder_quote: "", founder_bio: " \n\n " };
    const { container } = render(<FounderSpotlight founder={empty} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders nothing when settings failed to load", () => {
    const { container } = render(<FounderSpotlight founder={null} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("hasFounderContent mirrors what the component would render", () => {
    expect(hasFounderContent(founder)).toBe(true);
    expect(hasFounderContent({ ...founder, founder_name: "", founder_quote: "", founder_bio: "" })).toBe(false);
    expect(hasFounderContent(null)).toBe(false);
  });
});
