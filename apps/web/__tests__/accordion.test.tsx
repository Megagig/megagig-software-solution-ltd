import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";

function Faq() {
  return (
    <Accordion type="single" collapsible>
      <AccordionItem value="q1">
        <AccordionTrigger>How long does a typical project take?</AccordionTrigger>
        <AccordionContent>It depends on scope.</AccordionContent>
      </AccordionItem>
      <AccordionItem value="q2">
        <AccordionTrigger>Do you offer post-launch support?</AccordionTrigger>
        <AccordionContent>Yes, always.</AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}

describe("Accordion", () => {
  it("starts fully collapsed", () => {
    render(<Faq />);
    expect(screen.queryByText("It depends on scope.")).not.toBeInTheDocument();
  });

  it("expands an item on click and collapses the previous one (single-expand)", async () => {
    const user = userEvent.setup();
    render(<Faq />);

    await user.click(screen.getByRole("button", { name: "How long does a typical project take?" }));
    expect(screen.getByText("It depends on scope.")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Do you offer post-launch support?" }));
    expect(screen.getByText("Yes, always.")).toBeInTheDocument();
    expect(screen.queryByText("It depends on scope.")).not.toBeInTheDocument();
  });
});
