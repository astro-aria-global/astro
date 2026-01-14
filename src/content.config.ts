import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

// This is definition of post frontmatters

const posts = defineCollection({
  // Posts file should always be in src/contents
  loader: glob({ base: "./src/contents", pattern: "**/*.md" }),

  schema: () =>
    z.object({
      title: z.string(),
      description: z.string(),
      pubDate: z.coerce.date(),
      updatedDate: z.coerce.date().optional(),
      draft: z.boolean().optional().default(false),
      encrypt: z.boolean().optional().default(false),
      password: z.string().optional(),
      question: z.string().optional(),
      slug: z.string().optional(),
    }),
});

export const collections = { posts };
