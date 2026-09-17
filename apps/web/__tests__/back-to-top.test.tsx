import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BackToTop } from "@/components/back-to-top";

describe("BackToTop", () => {
  it("scrolls the window to the top on click", async () => {
    const scrollTo = vi.fn();
    window.scrollTo = scrollTo;
    const user = userEvent.setup();

    render(<BackToTop />);
    await user.click(screen.getByRole("button", { name: /back to top/i }));

    expect(scrollTo).toHaveBeenCalledWith({ top: 0, behavior: "smooth" });
  });
});
