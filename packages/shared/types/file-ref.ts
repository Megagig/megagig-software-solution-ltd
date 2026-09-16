// FileRef — re-export of the Zod-inferred type for code that only
// needs the type, not the schema. The schema lives in
// schemas/file-ref.ts; importing the type from here avoids pulling in
// Zod just to get a type definition.

export type FileRef = {
  url: string;
  key: string;
  name: string;
  mime: string;
  size: number;
  width?: number;
  height?: number;
  duration?: number;
  thumbnail_url?: string;
};
