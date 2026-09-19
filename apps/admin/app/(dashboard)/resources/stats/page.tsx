"use client";

import { ResourcePage } from "@/components/resource/resource-page";
import { statResource } from "@/resources/stats";

export default function StatsPage() {
  return <ResourcePage resource={statResource} />;
}
