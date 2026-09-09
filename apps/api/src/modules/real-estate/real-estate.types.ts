import { z } from 'zod';

// ─── Projects ─────────────────────────────────────────────────────────────────

export const PROJECT_STATUSES = ['UPCOMING', 'UNDER_CONSTRUCTION', 'READY', 'COMPLETED'] as const;

export const CreateProjectSchema = z.object({
  name: z.string().min(1).max(200),
  developer: z.string().max(200).optional(),
  location: z.string().max(200).optional(),
  city: z.string().max(100).optional(),
  status: z.enum(PROJECT_STATUSES).optional(),
  description: z.string().max(2000).optional(),
  totalUnits: z.number().int().positive().optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  geofenceMeters: z.number().int().positive().optional(),
  amenities: z.array(z.string().max(50)).max(50).optional(),
});

export const UpdateProjectSchema = CreateProjectSchema.partial();

export type CreateProjectInput = z.infer<typeof CreateProjectSchema>;
export type UpdateProjectInput = z.infer<typeof UpdateProjectSchema>;

// ─── Units ────────────────────────────────────────────────────────────────────

export const CreateUnitSchema = z.object({
  unitNumber: z.string().min(1).max(50),
  tower: z.string().max(50).optional(),
  floor: z.number().int().optional(),
  type: z.string().max(50).optional(),
  areaSqft: z.number().positive().optional(),
  price: z.number().positive().optional(),
  facing: z.string().max(20).optional(),
  status: z.enum(['AVAILABLE', 'HOLD', 'BOOKED', 'SOLD']).optional(),
});

export const UpdateUnitSchema = CreateUnitSchema.partial();

export type CreateUnitInput = z.infer<typeof CreateUnitSchema>;
export type UpdateUnitInput = z.infer<typeof UpdateUnitSchema>;

// ─── Site Visits ──────────────────────────────────────────────────────────────

export const SITE_VISIT_STATUSES = [
  'SCHEDULED', 'ON_THE_WAY', 'AT_SITE', 'VISITING', 'VISIT_DONE', 'RETURNING', 'COMPLETED', 'CANCELLED', 'NO_SHOW',
] as const;

export const CreateSiteVisitSchema = z.object({
  contactId: z.string().min(1),
  projectId: z.string().min(1),
  unitId: z.string().optional().nullable(),
  agentId: z.string().optional().nullable(),
  scheduledAt: z.string().min(1),
  status: z.enum(SITE_VISIT_STATUSES).optional(),
  travelMinutes: z.number().int().nonnegative().optional(),
  visitMinutes: z.number().int().nonnegative().optional(),
  interestLevel: z.enum(['LOW', 'MEDIUM', 'HIGH']).optional().nullable(),
  rating: z.number().int().min(1).max(5).optional(),
  feedback: z.string().max(2000).optional(),
});

export const UpdateSiteVisitSchema = CreateSiteVisitSchema.partial();

export const UpdateSiteVisitStatusSchema = z.object({
  status: z.enum(SITE_VISIT_STATUSES),
});

export type CreateSiteVisitInput = z.infer<typeof CreateSiteVisitSchema>;
export type UpdateSiteVisitInput = z.infer<typeof UpdateSiteVisitSchema>;

// ─── Bookings ─────────────────────────────────────────────────────────────────

export const BOOKING_STATUSES = ['TOKEN_RECEIVED', 'BOOKED', 'AGREEMENT_DONE', 'REGISTERED', 'CANCELLED'] as const;

export const CreateBookingSchema = z.object({
  contactId: z.string().min(1),
  projectId: z.string().min(1),
  unitId: z.string().min(1),
  agentId: z.string().optional().nullable(),
  bookingAmount: z.number().positive().optional(),
  totalAmount: z.number().positive().optional(),
  status: z.enum(BOOKING_STATUSES).optional(),
  brokeragePercent: z.number().min(0).max(100).optional(),
  brokerageAmount: z.number().nonnegative().optional(),
  brokerageReceived: z.number().nonnegative().optional(),
  bookingDate: z.string().optional(),
});

export const UpdateBookingSchema = CreateBookingSchema.partial();

export type CreateBookingInput = z.infer<typeof CreateBookingSchema>;
export type UpdateBookingInput = z.infer<typeof UpdateBookingSchema>;

// ─── Property Preferences (Property Match) ─────────────────────────────────────

export const UpsertPropertyPreferenceSchema = z.object({
  contactId: z.string().min(1),
  preferredCity: z.string().max(100).optional(),
  preferredType: z.string().max(50).optional(),
  budgetMin: z.number().positive().optional(),
  budgetMax: z.number().positive().optional(),
  preferredFloor: z.number().int().optional(),
  facing: z.string().max(20).optional(),
  amenities: z.array(z.string().max(50)).max(50).optional(),
  commutePreference: z.string().max(200).optional(),
  notes: z.string().max(2000).optional(),
});

export type UpsertPropertyPreferenceInput = z.infer<typeof UpsertPropertyPreferenceSchema>;

// A Unit scored against a contact's PropertyPreference, returned by matchesForContact.
export interface ScoredUnitMatch {
  id: string;
  fitScore: number;
  fitReasons: string[];
  [key: string]: unknown;
}

// ─── Lead Stage Funnel ──────────────────────────────────────────────────────────

// Order matters: index in this array is the funnel's "rank", used to prevent a
// contact's stage from ever moving backwards (see real-estate-stage.service.ts).
export const REAL_ESTATE_LEAD_STAGES = [
  'NEW', 'CONTACTED', 'QUALIFIED', 'PROPERTY_SHARED', 'VISIT_SCHEDULED',
  'VISIT_DONE', 'NEGOTIATION', 'BOOKING', 'CLOSED_WON', 'CLOSED_LOST',
] as const;

export type RealEstateLeadStageValue = (typeof REAL_ESTATE_LEAD_STAGES)[number];
