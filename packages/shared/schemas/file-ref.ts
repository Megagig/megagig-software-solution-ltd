import { z } from "zod";

// FileRef — canonical shape of a stored file. The API's POST /api/uploads
// returns this; resource forms embed it in their submit body.
//
// Fields width / height / duration / thumbnail_url are populated by the
// server when the source format makes them cheap to compute (images get
// dimensions, audio gets duration). They're optional because not every
// upload has them — a PDF has no width, a CSV has no thumbnail.
export const FileRefSchema = z.object({
  url: z.string().url(),
  key: z.string().min(1),
  name: z.string().min(1),
  mime: z.string().min(1),
  size: z.number().int().nonnegative(),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
  duration: z.number().int().nonnegative().optional(),
  thumbnail_url: z.string().url().optional(),
});

export type FileRef = z.infer<typeof FileRefSchema>;
