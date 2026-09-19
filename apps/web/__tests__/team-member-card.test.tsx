import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import type { TeamMember } from "@repo/shared/types";
import { TeamMemberCard } from "@/app/(marketing)/team/_components/team-member-card";
import { TeamHero } from "@/app/(marketing)/team/_components/team-hero";
import { TeamStory } from "@/app/(marketing)/team/_components/team-story";
import { splitParagraphs } from "@/lib/text";

const member: TeamMember = {
  id: "1",
  name: "Ada Obi",
  role: "Backend Engineer",
  photo_url: "/ada.png",
  linkedin_url: "",
  github_url: "https://github.com/ada",
  twitter_url: "",
  published: true,
  sort_order: 1,
  created_at: "",
  updated_at: "",
};

describe("splitParagraphs", () => {
  it("splits on blank lines, trims, and drops empties", () => {
    expect(splitParagraphs(" One. \n\n\n Two.\n\n  \n")).toEqual(["One.", "Two."]);
    expect(splitParagraphs("  \n\n ")).toEqual([]);
  });
});

describe("TeamMemberCard", () => {
  it("renders the name, role and a photo with a descriptive alt", () => {
    render(<TeamMemberCard member={member} />);
    expect(screen.getByRole("heading", { name: "Ada Obi" })).toBeInTheDocument();
    expect(screen.getByText("Backend Engineer")).toBeInTheDocument();
    expect(screen.getByAltText("Ada Obi, Backend Engineer")).toBeInTheDocument();
  });

  it("only renders social buttons for links that are set", () => {
    render(<TeamMemberCard member={member} />);
    expect(screen.getByRole("link", { name: "Ada Obi on GitHub" })).toHaveAttribute("href", "https://github.com/ada");
    expect(screen.queryByRole("link", { name: /LinkedIn/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /on X/ })).not.toBeInTheDocument();
  });

  it("renders no social row at all when no links are set", () => {
    render(<TeamMemberCard member={{ ...member, github_url: "" }} />);
    expect(screen.queryAllByRole("link")).toHaveLength(0);
  });

  it("falls back to initials instead of a broken image when there is no photo", () => {
    render(<TeamMemberCard member={{ ...member, photo_url: "" }} />);
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    expect(screen.getByText("AO")).toBeInTheDocument();
  });
});

describe("TeamHero", () => {
  it("renders the headline, and hides the optional description and location when unset", () => {
    render(<TeamHero stats={[]} />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Meet the Nigerian team");
    expect(screen.getByRole("link", { name: /Start a project/ })).toHaveAttribute("href", "/start-project");
    expect(screen.getByRole("link", { name: "Join our team" })).toHaveAttribute("href", "/careers");
    expect(screen.queryByText("Lagos, Nigeria")).not.toBeInTheDocument();
  });

  it("shows the mission line, location and stats from admin data when set", () => {
    render(
      <TeamHero
        missionStatement="Software Nigerian businesses trust."
        location="Lagos, Nigeria"
        stats={[{ id: "s1", value: "10+", label: "Products", published: true, sort_order: 1, created_at: "", updated_at: "" }]}
      />
    );
    expect(screen.getByText("Software Nigerian businesses trust.")).toBeInTheDocument();
    expect(screen.getByText("Lagos, Nigeria")).toBeInTheDocument();
    expect(screen.getByText("10+")).toBeInTheDocument();
  });
});

describe("TeamStory", () => {
  it("renders one paragraph per block and hides when blank", () => {
    render(<TeamStory story={"One.\n\nTwo."} />);
    expect(screen.getByText("One.")).toBeInTheDocument();
    expect(screen.getByText("Two.")).toBeInTheDocument();
    expect(render(<TeamStory story="  " />).container).toBeEmptyDOMElement();
  });
});
