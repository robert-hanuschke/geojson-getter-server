import { z } from 'zod';

const EnvSchema = z.object({
  OVERPASS_USER_AGENT: z.string().min(1),
  PORT: z.coerce.number().default(3000),
  OVERPASS_API_URLS: z.string().optional(),
});

export const env = EnvSchema.parse(process.env);
