"use client";

import { ResourcePage } from "@/components/resource/resource-page";
import { usersResource } from "@/resources/users";

export default function UsersPage() {
  return <ResourcePage resource={usersResource} />;
}
