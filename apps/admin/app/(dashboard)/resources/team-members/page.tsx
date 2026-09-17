"use client";

import { ResourcePage } from "@/components/resource/resource-page";
import { teamMemberResource } from "@/resources/team-members";

export default function TeamMembersPage() {
  return <ResourcePage resource={teamMemberResource} />;
}
