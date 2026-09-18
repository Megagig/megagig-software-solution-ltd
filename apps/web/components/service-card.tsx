import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { Service } from "@/lib/services";

interface ServiceCardProps {
  service: Service;
  highlighted?: boolean;
}

// Shared by Home's ServicesGrid and the /services index — one card, one
// place, per code-standards.md §3 (extracted once a second real consumer
// needed the exact same card, not preemptively).
export function ServiceCard({ service, highlighted = false }: ServiceCardProps) {
  return (
    <Link href={`/services/${service.slug}`} className="group block h-full">
      <Card
        interactive
        className={cn(
          "relative flex h-full flex-col overflow-hidden p-7 transition-colors duration-standard ease-standard",
          highlighted ? "border-transparent bg-accent" : "hover:border-brand/40"
        )}
      >
        <div
          className={cn(
            "flex h-12 w-12 items-center justify-center rounded-xl transition-transform duration-standard ease-standard group-hover:-translate-y-0.5",
            highlighted ? "bg-white/15" : "bg-brand/10"
          )}
        >
          <service.icon className={cn("h-6 w-6", highlighted ? "text-accent-foreground" : "text-brand")} />
        </div>
        <h3
          className={cn(
            "mt-5 text-xl font-semibold",
            highlighted ? "text-accent-foreground" : "text-foreground"
          )}
        >
          {service.title}
        </h3>
        <p className={cn("mt-2 text-sm leading-relaxed", highlighted ? "text-accent-foreground/80" : "text-foreground-muted")}>
          {service.description}
        </p>
        <ArrowUpRight
          className={cn(
            "absolute right-6 top-7 h-5 w-5 -translate-y-1 opacity-0 transition-all duration-standard ease-standard group-hover:translate-y-0 group-hover:opacity-100",
            highlighted ? "text-accent-foreground" : "text-brand"
          )}
        />
      </Card>
    </Link>
  );
}
