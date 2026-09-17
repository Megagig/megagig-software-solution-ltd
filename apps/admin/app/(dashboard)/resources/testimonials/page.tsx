"use client";

import { ResourcePage } from "@/components/resource/resource-page";
import { testimonialResource } from "@/resources/testimonials";

export default function TestimonialsPage() {
  return <ResourcePage resource={testimonialResource} />;
}
