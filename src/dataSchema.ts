import { z } from "zod/v4";

export const dataSchema = z
  .object({
    headers: z.array(z.string()),
    rows: z.array(
      z.object({
        date: z.iso.date(),
        values: z.record(z.string(), z.number().positive()),
      })
    ),
  })
  .refine((data) => {
    return data.rows.every((row) => {
      const rowKeys = Object.keys(row.values);
      return rowKeys.every((key) => data.headers.includes(key));
    });
  }, {});

export type Data = z.infer<typeof dataSchema>;
