"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { CheckCircle2, Loader2 } from "lucide-react";
import { useCreateLead } from "@/hooks/use-leads";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Compact variant per project-requirements.md §5.1's Home contact block
// (name, email, message only). The Lead model's Create handler requires
// phone/company/project_type/budget_range server-side (binding:"required")
// — this form fills those with clearly-labeled defaults rather than
// collecting fields the compact spec doesn't ask for. Phase 6 (lead
// pipeline wiring) needs to either loosen those requirements for
// contact-sourced leads or extend this form; tracked in progress-tracker.md.
//
// A "full" variant (matching CreateLeadSchema exactly, for /start-project
// and /contact-us) extends this same component when Phase 4.6 builds it —
// per library-docs.md's "one LeadForm, three entry points" rule, not a
// forked implementation.
const CompactLeadSchema = z.object({
  name: z.string().min(1, "Required"),
  email: z.string().min(1, "Required").email("Enter a valid email"),
  message: z.string().min(1, "Required"),
});

type CompactLeadInput = z.infer<typeof CompactLeadSchema>;

interface LeadFormProps {
  source: string;
  className?: string;
  /** "onBrand" is for placing the form directly on a solid `bg-brand`
   * panel (e.g. ContactBlock's redesigned "Get in touch" panel) — inputs
   * become a tinted overlay of the panel color instead of the normal
   * surface/border treatment, which would be invisible against it. */
  tone?: "surface" | "onBrand";
}

export function LeadForm({ source, className, tone = "surface" }: LeadFormProps) {
  const onBrand = tone === "onBrand";
  const [submitted, setSubmitted] = useState(false);
  const createLead = useCreateLead();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CompactLeadInput>({
    resolver: zodResolver(CompactLeadSchema),
  });

  const onSubmit = async (values: CompactLeadInput) => {
    await createLead.mutateAsync({
      ...values,
      phone: "Not provided",
      company: "Not provided",
      project_type: "general",
      budget_range: "not_specified",
      source,
      status: "new",
    });
    setSubmitted(true);
  };

  const labelClass = cn("mb-1.5 block text-sm font-medium", onBrand ? "text-brand-foreground" : "text-foreground");
  const inputClass = cn(
    "w-full rounded-md px-3 py-2.5 text-sm focus:outline-none",
    onBrand
      ? "border-0 bg-brand-foreground/10 text-brand-foreground placeholder:text-brand-foreground/50 focus:ring-2 focus:ring-brand-foreground/60"
      : "border border-border bg-surface text-foreground focus:border-brand focus:ring-1 focus:ring-brand"
  );
  const errorClass = cn("mt-1.5 text-sm", onBrand ? "text-brand-foreground" : "text-danger");

  if (submitted) {
    return (
      <div
        className={cn(
          "flex flex-col items-center gap-3 py-8 text-center",
          onBrand && "text-brand-foreground",
          className
        )}
      >
        <CheckCircle2 className={cn("h-10 w-10", onBrand ? "text-brand-foreground" : "text-success")} />
        <p className="text-lg font-semibold">Message sent</p>
        <p className={cn("text-sm", onBrand ? "text-brand-foreground/80" : "text-foreground-muted")}>
          Thanks for reaching out — we&apos;ll reply within 24 hours.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className={cn("space-y-5", className)}>
      <div>
        <label htmlFor="lead-name" className={labelClass}>
          Name
        </label>
        <input
          id="lead-name"
          type="text"
          {...register("name")}
          aria-invalid={!!errors.name}
          aria-describedby={errors.name ? "lead-name-error" : undefined}
          className={inputClass}
        />
        {errors.name && (
          <p id="lead-name-error" className={errorClass}>
            {errors.name.message}
          </p>
        )}
      </div>

      <div>
        <label htmlFor="lead-email" className={labelClass}>
          Email
        </label>
        <input
          id="lead-email"
          type="email"
          {...register("email")}
          aria-invalid={!!errors.email}
          aria-describedby={errors.email ? "lead-email-error" : undefined}
          className={inputClass}
        />
        {errors.email && (
          <p id="lead-email-error" className={errorClass}>
            {errors.email.message}
          </p>
        )}
      </div>

      <div>
        <label htmlFor="lead-message" className={labelClass}>
          Message
        </label>
        <textarea
          id="lead-message"
          rows={4}
          {...register("message")}
          aria-invalid={!!errors.message}
          aria-describedby={errors.message ? "lead-message-error" : undefined}
          className={inputClass}
        />
        {errors.message && (
          <p id="lead-message-error" className={errorClass}>
            {errors.message.message}
          </p>
        )}
      </div>

      <Button
        type="submit"
        disabled={isSubmitting}
        className={cn("w-full", onBrand && "bg-accent text-accent-foreground hover:shadow-none")}
      >
        {isSubmitting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Sending…
          </>
        ) : (
          "Send message"
        )}
      </Button>
    </form>
  );
}
