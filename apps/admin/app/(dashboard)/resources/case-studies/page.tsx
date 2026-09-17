"use client";

import { ResourcePage } from "@/components/resource/resource-page";
import { caseStudyResource } from "@/resources/case-studies";

export default function CaseStudiesPage() {
  return <ResourcePage resource={caseStudyResource} />;
}
