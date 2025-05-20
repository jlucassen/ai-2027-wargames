import { z } from "zod/v4-mini";

export const dataSchema = z
  .object({
    headers: z.array(z.string()),
    rows: z.array(
      z.object({
        date: z.iso.date(),
        values: z.record(z.string(), z.number().check(z.positive())),
        hidden: z.optional(z.boolean()),
      })
    ),
  })
  .check(
    z.refine((data: Data) => {
      return data.rows.every((row) => {
        const rowKeys = Object.keys(row.values);
        return rowKeys.every((key) => data.headers.includes(key));
      });
    }, {})
  );

export type Data = z.infer<typeof dataSchema>;
