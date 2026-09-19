export type AboutItemKind = "value" | "milestone" | "step";

export interface AboutItem {
  id: string;
  kind: AboutItemKind;
  title: string;
  description: string;
  // Free-form text ("2023", "Since then"); only milestones use it.
  label: string;
  published: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}
