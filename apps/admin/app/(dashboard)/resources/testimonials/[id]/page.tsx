"use client";

import { use } from "react";
import { ResourceDetailPage } from "@/components/resource/resource-detail-page";
import { testimonialResource } from "@/resources/testimonials";

export default function TestimonialsDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <ResourceDetailPage resource={testimonialResource} id={id} />;
}
