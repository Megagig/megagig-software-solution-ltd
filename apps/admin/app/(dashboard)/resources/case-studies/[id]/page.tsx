"use client";

import { use } from "react";
import { ResourceDetailPage } from "@/components/resource/resource-detail-page";
import { caseStudyResource } from "@/resources/case-studies";

export default function CaseStudiesDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <ResourceDetailPage resource={caseStudyResource} id={id} />;
}
