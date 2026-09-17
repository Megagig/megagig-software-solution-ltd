"use client";

import { use } from "react";
import { ResourceDetailPage } from "@/components/resource/resource-detail-page";
import { teamMemberResource } from "@/resources/team-members";

export default function TeamMembersDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <ResourceDetailPage resource={teamMemberResource} id={id} />;
}
