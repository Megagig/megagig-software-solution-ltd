"use client";

import { ResourcePage } from "@/components/resource/resource-page";
import { leadResource } from "@/resources/leads";

export default function LeadsPage() {
  return <ResourcePage resource={leadResource} />;
}
