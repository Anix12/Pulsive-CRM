import { z } from 'zod';

export const ImportMappingSchema = z.record(z.string());

export type ImportMappingInput = z.infer<typeof ImportMappingSchema>;
