import { usersResource } from "./users";
import { blogsResource } from "./blogs";
import { teamMemberResource } from "./team-members";
import { caseStudyResource } from "./case-studies";
import { testimonialResource } from "./testimonials";
import { productResource } from "./products";
import { jobOpeningResource } from "./job-openings";
import { fAQResource } from "./faqs";
import { leadResource } from "./leads";
import { statResource } from "./stats";
import { aboutItemResource } from "./about-items";
// grit:resources

import type { ResourceDefinition } from "@/lib/resource";

export const resources: ResourceDefinition[] = [
  usersResource,
  blogsResource,
  teamMemberResource,
  caseStudyResource,
  testimonialResource,
  productResource,
  jobOpeningResource,
  fAQResource,
  leadResource,
  statResource,
  aboutItemResource,
  // grit:resource-list
];

export function getResource(slug: string): ResourceDefinition | undefined {
  return resources.find((r) => r.slug === slug);
}

export function getResourceByEndpoint(endpoint: string): ResourceDefinition | undefined {
  return resources.find((r) => r.endpoint === endpoint);
}
