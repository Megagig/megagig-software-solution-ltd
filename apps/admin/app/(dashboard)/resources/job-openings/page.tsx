"use client";

import { ResourcePage } from "@/components/resource/resource-page";
import { jobOpeningResource } from "@/resources/job-openings";

export default function JobOpeningsPage() {
  return <ResourcePage resource={jobOpeningResource} />;
}
