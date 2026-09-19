"use client";

import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { CheckCircle2, Loader2 } from "lucide-react";
import { useCreateLead } from "@/hooks/use-leads";
import { Button } from "@/components/ui/button";
import { SERVICES } from "@/lib/services";
import { BUDGET_RANGES } from "@/lib/budget-ranges";
import { cn } from "@/lib/utils";

// Compact variant per project-requirements.md §5.1's Home contact block
// (name, email, message only). The Lead model's Create handler requires
// phone/company/project_type/budget_range server-side (binding:"required")
// — this form fills those with clearly-labeled defaults rather than
// collecting fields the compact spec doesn't ask for. Phase 6 (lead
// pipeline wiring) needs to either loosen those requirements for
// contact-sourced leads or extend this form; tracked in progress-tracker.md.
const CompactLeadSchema = z.object({
  name: z.string().min(1, "Required"),
  email: z.string().min(1, "Required").email("Enter a valid email"),
  message: z.string().min(1, "Required"),
});

type CompactLeadInput = z.infer<typeof CompactLeadSchema>;

// Full variant — matches CreateLeadSchema exactly, per library-docs.md's
// "one LeadForm, three entry points" rule (source + defaultProjectType
// props, not a forked implementation). Used by /start-project and
// /contact-us (Phase 4.6/4.7).
const FullLeadSchema = z.object({
  name: z.string().min(1, "Required"),
  email: z.string().min(1, "Required").email("Enter a valid email"),
  phone: z.string().min(1, "Required"),
  company: z.string().min(1, "Required"),
  project_type: z.string().min(1, "Required"),
  budget_range: z.string().min(1, "Required"),
  services_interested: z.array(z.string()).optional(),
  message: z.string().min(1, "Required"),
});

type FullLeadInput = z.infer<typeof FullLeadSchema>;

interface LeadFormProps {
  source: string;
  className?: string;
  /** "onBrand" is for placing the form directly on a solid `bg-brand`
   * panel (e.g. ContactBlock's redesigned "Get in touch" panel) — inputs
   * become a tinted overlay of the panel color instead of the normal
   * surface/border treatment, which would be invisible against it. */
  tone?: "surface" | "onBrand";
  /** "full" collects the complete CreateLeadSchema field set (phone,
   * company, project type, budget range, services interested) instead of
   * the Home contact block's compact name/email/message. */
  variant?: "compact" | "full";
  /** Pre-selects the project-type dropdown — used when arriving from a
   * /services/[slug] or pricing-card CTA that already knows the service. */
  defaultProjectType?: string;
}

export function LeadForm({ source, className, tone = "surface", variant = "compact", defaultProjectType }: LeadFormProps) {
  const onBrand = tone === "onBrand";
  const full = variant === "full";
  const [submitted, setSubmitted] = useState(false);
  const [currency, setCurrency] = useState<"NGN" | "USD">("NGN");
  const createLead = useCreateLead();
  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<FullLeadInput>({
    resolver: zodResolver(full ? FullLeadSchema : CompactLeadSchema) as never,
    defaultValues: full ? { project_type: defaultProjectType, services_interested: [] } : undefined,
  });

  const onSubmit = async (values: FullLeadInput | CompactLeadInput) => {
    await createLead.mutateAsync(
      full
        ? { ...values, source, status: "new" }
        : {
            ...values,
            phone: "Not provided",
            company: "Not provided",
            project_type: "general",
            budget_range: "not_specified",
            source,
            status: "new",
          }
    );
    setSubmitted(true);
  };

  const labelClass = cn("mb-1.5 block text-sm font-medium", onBrand ? "text-brand-foreground" : "text-foreground");
  const inputClass = cn(
    "w-full rounded-md px-3 py-2.5 text-sm focus:outline-none",
    onBrand
      ? "border-0 bg-brand-foreground/10 text-brand-foreground placeholder:text-brand-foreground/50 focus:ring-2 focus:ring-brand-foreground/60"
      : "border border-border bg-surface text-foreground focus:border-brand focus:ring-1 focus:ring-brand"
  );
  // The native dropdown popup ignores the select's translucent onBrand
  // background and paints its own, but options inherit the select's white
  // text — white-on-white. Give options their own solid, theme-correct
  // colors so the list stays legible.
  const selectClass = cn(inputClass, onBrand && "[&>option]:bg-surface-raised [&>option]:text-foreground");
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
        <p className="text-lg font-semibold">{full ? "Request received" : "Message sent"}</p>
        <p className={cn("text-sm", onBrand ? "text-brand-foreground/80" : "text-foreground-muted")}>
          {full
            ? "Thanks for the details — we'll review your request and reply within 24 hours with next steps."
            : "Thanks for reaching out — we'll reply within 24 hours."}
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

      {full && (
        <>
          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label htmlFor="lead-phone" className={labelClass}>
                Phone
              </label>
              <input
                id="lead-phone"
                type="tel"
                {...register("phone")}
                aria-invalid={!!errors.phone}
                aria-describedby={errors.phone ? "lead-phone-error" : undefined}
                className={inputClass}
              />
              {errors.phone && (
                <p id="lead-phone-error" className={errorClass}>
                  {errors.phone.message}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="lead-company" className={labelClass}>
                Company
              </label>
              <input
                id="lead-company"
                type="text"
                {...register("company")}
                aria-invalid={!!errors.company}
                aria-describedby={errors.company ? "lead-company-error" : undefined}
                className={inputClass}
              />
              {errors.company && (
                <p id="lead-company-error" className={errorClass}>
                  {errors.company.message}
                </p>
              )}
            </div>
          </div>

          <div>
            <label htmlFor="lead-project-type" className={labelClass}>
              What do you need built?
            </label>
            <select
              id="lead-project-type"
              {...register("project_type")}
              aria-invalid={!!errors.project_type}
              aria-describedby={errors.project_type ? "lead-project-type-error" : undefined}
              className={selectClass}
            >
              <option value="">Select a service</option>
              {SERVICES.map((service) => (
                <option key={service.slug} value={service.title}>
                  {service.title}
                </option>
              ))}
            </select>
            {errors.project_type && (
              <p id="lead-project-type-error" className={errorClass}>
                {errors.project_type.message}
              </p>
            )}
          </div>

          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label htmlFor="lead-budget-range" className={cn(labelClass, "mb-0")}>
                Budget range
              </label>
              <div className={cn("flex items-center gap-1 rounded-full p-0.5 text-xs", onBrand ? "bg-brand-foreground/10" : "bg-surface")}>
                {(["NGN", "USD"] as const).map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCurrency(c)}
                    className={cn(
                      "rounded-full px-2.5 py-1 font-medium transition-colors",
                      currency === c
                        ? onBrand
                          ? "bg-brand-foreground text-brand"
                          : "bg-brand text-brand-foreground"
                        : onBrand
                          ? "text-brand-foreground/70"
                          : "text-foreground-muted"
                    )}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
            <select
              id="lead-budget-range"
              {...register("budget_range")}
              aria-invalid={!!errors.budget_range}
              aria-describedby={errors.budget_range ? "lead-budget-range-error" : undefined}
              className={selectClass}
            >
              <option value="">Select a budget range</option>
              {BUDGET_RANGES.map((range) => (
                <option key={range.key} value={range.key}>
                  {currency === "NGN" ? range.ngn : range.usd}
                </option>
              ))}
            </select>
            {errors.budget_range && (
              <p id="lead-budget-range-error" className={errorClass}>
                {errors.budget_range.message}
              </p>
            )}
          </div>

          <div>
            <label className={labelClass}>Anything else you might need? (optional)</label>
            <Controller
              name="services_interested"
              control={control}
              render={({ field }) => (
                <div className="grid gap-2 sm:grid-cols-2">
                  {SERVICES.map((service) => {
                    const checked = field.value?.includes(service.title) ?? false;
                    return (
                      <label
                        key={service.slug}
                        className={cn(
                          "flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm",
                          onBrand ? "bg-brand-foreground/10 text-brand-foreground" : "bg-surface text-foreground"
                        )}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => {
                            const current = field.value ?? [];
                            field.onChange(
                              e.target.checked
                                ? [...current, service.title]
                                : current.filter((t) => t !== service.title)
                            );
                          }}
                          className="h-4 w-4 rounded border-border accent-brand"
                        />
                        {service.title}
                      </label>
                    );
                  })}
                </div>
              )}
            />
          </div>
        </>
      )}

      <div>
        <label htmlFor="lead-message" className={labelClass}>
          {full ? "Tell us about your project" : "Message"}
        </label>
        <textarea
          id="lead-message"
          rows={full ? 5 : 4}
          placeholder={full ? "What are you trying to build? Any specific features, timelines, or constraints we should know about?" : undefined}
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
        ) : full ? (
          "Submit request"
        ) : (
          "Send message"
        )}
      </Button>
    </form>
  );
}
