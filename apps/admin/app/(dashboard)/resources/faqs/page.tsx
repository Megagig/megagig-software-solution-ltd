"use client";

import { ResourcePage } from "@/components/resource/resource-page";
import { fAQResource } from "@/resources/faqs";

export default function FaqsPage() {
  return <ResourcePage resource={fAQResource} />;
}
