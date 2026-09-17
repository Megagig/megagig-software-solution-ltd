import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { WhatsAppFab } from "@/components/whatsapp-fab";
import { getSiteSettings } from "@/lib/site-settings";

// Every public marketing page renders inside this shared navbar+footer
// chrome (architecture.md rule #14). SiteSettings is fetched once, here,
// server-side, and passed down — avoids an extra client round-trip for
// chrome-level content (WhatsApp number, contact info, social links).
export default async function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const settings = await getSiteSettings();

  return (
    <>
      <Navbar />
      <main className="min-h-screen">{children}</main>
      <Footer
        contactEmail={settings?.contact_email}
        contactPhone={settings?.contact_phone}
        socialLinks={settings?.social_links}
      />
      <WhatsAppFab whatsAppNumber={settings?.whatsapp_number ?? null} />
    </>
  );
}
