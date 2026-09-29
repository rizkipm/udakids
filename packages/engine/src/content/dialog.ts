import { z } from 'zod';

// content/dialog/momo.id.json — kalimat Momo, di-key dengan audioKey.
export const dialogFileSchema = z.object({
  lang: z.string(),
  lines: z.record(
    z.string().regex(/^[a-z0-9_]+$/),
    z.object({ text: z.string().min(1), mood: z.string().optional() }),
  ),
});

export type DialogFile = z.infer<typeof dialogFileSchema>;
