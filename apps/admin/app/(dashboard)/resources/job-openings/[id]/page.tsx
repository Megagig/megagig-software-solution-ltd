"use client";

import { use } from "react";
import { ResourceDetailPage } from "@/components/resource/resource-detail-page";
import { jobOpeningResource } from "@/resources/job-openings";

export default function JobOpeningsDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <ResourceDetailPage resource={jobOpeningResource} id={id} />;
}
