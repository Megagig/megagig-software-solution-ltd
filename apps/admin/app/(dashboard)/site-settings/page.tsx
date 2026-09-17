"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useSiteSettings, useUpdateSiteSettings } from "@/hooks/use-site-settings";
import { PageHeader } from "@/components/chrome/PageHeader";
import { Save, Loader2, Mail, Globe, Sparkles } from "@/lib/icons";

const SiteSettingsFormSchema = z.object({
  contact_email: z.string().email("Enter a valid email").or(z.literal("")),
  contact_phone: z.string().optional().default(""),
  whatsapp_number: z.string().optional().default(""),
  address: z.string().optional().default(""),
  hero_headline: z.string().optional().default(""),
  hero_subhead: z.string().optional().default(""),
  linkedin: z.string().optional().default(""),
  github: z.string().optional().default(""),
  youtube: z.string().optional().default(""),
  facebook: z.string().optional().default(""),
  twitter: z.string().optional().default(""),
});
type SiteSettingsFormValues = z.infer<typeof SiteSettingsFormSchema>;

const inputClass =
  "w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-foreground placeholder:text-foreground-subtle focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand";
const errorInputClass =
  "w-full rounded-lg border border-danger/50 bg-surface px-3 py-2.5 text-sm text-foreground placeholder:text-foreground-subtle focus:border-danger focus:outline-none focus:ring-1 focus:ring-danger";

export default function SiteSettingsPage() {
  const { data: settings, isLoading } = useSiteSettings();
  const updateSettings = useUpdateSiteSettings();

  const form = useForm<SiteSettingsFormValues>({
    resolver: zodResolver(SiteSettingsFormSchema),
    defaultValues: {
      contact_email: "",
      contact_phone: "",
      whatsapp_number: "",
      address: "",
      hero_headline: "",
      hero_subhead: "",
      linkedin: "",
      github: "",
      youtube: "",
      facebook: "",
      twitter: "",
    },
  });

  useEffect(() => {
    if (settings) {
      form.reset({
        contact_email: settings.contact_email || "",
        contact_phone: settings.contact_phone || "",
        whatsapp_number: settings.whatsapp_number || "",
        address: settings.address || "",
        hero_headline: settings.hero_headline || "",
        hero_subhead: settings.hero_subhead || "",
        linkedin: settings.social_links?.linkedin || "",
        github: settings.social_links?.github || "",
        youtube: settings.social_links?.youtube || "",
        facebook: settings.social_links?.facebook || "",
        twitter: settings.social_links?.twitter || "",
      });
    }
  }, [settings]);

  const onSubmit = (data: SiteSettingsFormValues) => {
    updateSettings.mutate({
      contact_email: data.contact_email,
      contact_phone: data.contact_phone,
      whatsapp_number: data.whatsapp_number,
      address: data.address,
      hero_headline: data.hero_headline,
      hero_subhead: data.hero_subhead,
      social_links: {
        linkedin: data.linkedin,
        github: data.github,
        youtube: data.youtube,
        facebook: data.facebook,
        twitter: data.twitter,
      },
    });
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-foreground-subtle" />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Site Settings"
        subtitle="Contact details, hero copy, and social links the public site reads live — no deploy needed."
      />

      <form onSubmit={form.handleSubmit(onSubmit)}>
        <SettingsCard icon={<Mail className="h-4 w-4" />} title="Contact" description="How visitors reach Megagig — used in the footer, contact page, and the WhatsApp floating button.">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field label="Contact email" error={form.formState.errors.contact_email?.message}>
              <input
                type="email"
                {...form.register("contact_email")}
                className={form.formState.errors.contact_email ? errorInputClass : inputClass}
                placeholder="hello@megagig.com.ng"
              />
            </Field>
            <Field label="Contact phone">
              <input {...form.register("contact_phone")} className={inputClass} placeholder="+234..." />
            </Field>
            <Field label="WhatsApp number">
              <input {...form.register("whatsapp_number")} className={inputClass} placeholder="234..." />
            </Field>
            <Field label="Address">
              <input {...form.register("address")} className={inputClass} placeholder="Office address" />
            </Field>
          </div>
        </SettingsCard>

        <SettingsCard icon={<Sparkles className="h-4 w-4" />} title="Hero copy" description="The headline and subhead shown on the Home page hero — tweak copy without a redeploy.">
          <div className="space-y-4">
            <Field label="Hero headline">
              <input {...form.register("hero_headline")} className={inputClass} placeholder="We build software your team actually adopts" />
            </Field>
            <Field label="Hero subhead">
              <textarea {...form.register("hero_subhead")} rows={3} className={inputClass} placeholder="Short supporting line under the headline" />
            </Field>
          </div>
        </SettingsCard>

        <SettingsCard icon={<Globe className="h-4 w-4" />} title="Social links" description="Shown in the footer. Leave a field blank to hide that icon.">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field label="LinkedIn">
              <input {...form.register("linkedin")} className={inputClass} placeholder="https://linkedin.com/company/..." />
            </Field>
            <Field label="GitHub">
              <input {...form.register("github")} className={inputClass} placeholder="https://github.com/..." />
            </Field>
            <Field label="YouTube">
              <input {...form.register("youtube")} className={inputClass} placeholder="https://youtube.com/@..." />
            </Field>
            <Field label="Facebook">
              <input {...form.register("facebook")} className={inputClass} placeholder="https://facebook.com/..." />
            </Field>
            <Field label="Twitter / X">
              <input {...form.register("twitter")} className={inputClass} placeholder="https://x.com/..." />
            </Field>
          </div>
        </SettingsCard>

        <div className="flex items-center justify-end gap-3">
          {updateSettings.isSuccess && (
            <span className="text-sm font-medium text-success">Saved</span>
          )}
          <button
            type="submit"
            disabled={updateSettings.isPending}
            className="inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:brightness-90 disabled:opacity-50"
          >
            {updateSettings.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save changes
          </button>
        </div>
      </form>
    </div>
  );
}

function SettingsCard({
  icon, title, description, children,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-6 rounded-2xl border border-border bg-surface-raised">
      <header className="flex items-start gap-3 border-b border-border px-6 py-4">
        <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand">
          {icon}
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground">{title}</p>
          <p className="mt-0.5 text-xs text-foreground-subtle">{description}</p>
        </div>
      </header>
      <div className="px-6 py-5">{children}</div>
    </section>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-foreground-subtle">{label}</span>
      {children}
      {error && <p className="mt-1 text-xs text-danger">{error}</p>}
    </label>
  );
}
