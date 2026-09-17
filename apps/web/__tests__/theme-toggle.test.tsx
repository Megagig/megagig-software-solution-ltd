import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ThemeToggle } from "@/components/theme-toggle";

describe("ThemeToggle", () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.classList.remove("dark");
  });

  it("defaults to light and flips to dark on click, persisting the choice", async () => {
    const user = userEvent.setup();
    render(<ThemeToggle />);

    await waitFor(() =>
      expect(screen.getByRole("button")).toHaveAttribute("aria-pressed", "false")
    );

    await user.click(screen.getByRole("button"));

    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(window.localStorage.getItem("megagig-theme-mode")).toBe("dark");
  });

  it("reads a stored preference on mount", async () => {
    window.localStorage.setItem("megagig-theme-mode", "dark");
    render(<ThemeToggle />);

    await waitFor(() =>
      expect(screen.getByRole("button")).toHaveAttribute("aria-pressed", "true")
    );
    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });
});
