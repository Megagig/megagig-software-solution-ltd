"use client";

import { use } from "react";
import { ResourceDetailPage } from "@/components/resource/resource-detail-page";
import { aboutItemResource } from "@/resources/about-items";

export default function AboutItemsDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <ResourceDetailPage resource={aboutItemResource} id={id} />;
}
