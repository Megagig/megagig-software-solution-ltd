import { MessageCircle } from "lucide-react";

interface WhatsAppFabProps {
  whatsAppNumber: string | null;
}

// Persistent, bottom-right, deep-links to wa.me/<number> — sourced from
// SiteSettings so the number is never hardcoded (architecture.md rule #5).
// Renders nothing if SiteSettings failed to load or has no number set yet,
// rather than linking to a broken/placeholder number.
export function WhatsAppFab({ whatsAppNumber }: WhatsAppFabProps) {
  if (!whatsAppNumber) return null;

  const digits = whatsAppNumber.replace(/[^\d]/g, "");

  return (
    <a
      href={`https://wa.me/${digits}`}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat with us on WhatsApp"
      className="fixed bottom-6 right-6 z-40 inline-flex h-14 w-14 items-center justify-center rounded-full bg-accent text-accent-foreground shadow-lg transition-transform hover:scale-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand focus-visible:outline-offset-2"
    >
      <MessageCircle className="h-7 w-7" fill="currentColor" strokeWidth={0} />
    </a>
  );
}
