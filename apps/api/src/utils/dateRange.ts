import { Request } from 'express';

export interface DateRangeBounds {
  from?: Date;
  to?: Date;
}

export interface ParseDateRangeOptions {
  /** Computes a fallback `from` when the raw value is missing. Omit to leave `from` undefined. */
  defaultFrom?: () => Date;
  /** Computes a fallback `to` when the raw value is missing. Omit to leave `to` undefined. */
  defaultTo?: () => Date;
}

/**
 * Parses optional `from`/`to` date strings into `Date`s.
 *
 * With no options, a missing bound stays `undefined` — this is the behavior
 * `calls.service.ts` and `real-estate/site-visits.service.ts` already relied on
 * ("no date filter unless the caller passed one").
 *
 * Pass `defaultFrom`/`defaultTo` to fall back to a computed default instead — this is
 * the behavior `reports.service.ts` already relied on ("defaults to month-to-date").
 */
export const parseDateRange = (
  from?: string,
  to?: string,
  options: ParseDateRangeOptions = {},
): DateRangeBounds => {
  const bounds: DateRangeBounds = {};

  if (from) bounds.from = new Date(from);
  else if (options.defaultFrom) bounds.from = options.defaultFrom();

  if (to) bounds.to = new Date(to);
  else if (options.defaultTo) bounds.to = options.defaultTo();

  return bounds;
};

/** Reads `from`/`to` (or custom param names) directly off `req.query` and parses them. */
export const parseDateRangeFromQuery = (
  req: Request,
  options: ParseDateRangeOptions & { fromParam?: string; toParam?: string } = {},
): DateRangeBounds => {
  const { fromParam = 'from', toParam = 'to', ...parseOptions } = options;
  const query = req.query as Record<string, string>;
  return parseDateRange(query[fromParam], query[toParam], parseOptions);
};

/**
 * Converts `{from, to}` into a Prisma `{gte, lte}` filter, or `undefined` when both are
 * empty — so the caller can omit the field entirely rather than filtering on an
 * open-ended range (matches `real-estate/site-visits.service.ts`'s prior `dateRangeWhere`).
 */
export const toPrismaDateFilter = (bounds: DateRangeBounds): { gte?: Date; lte?: Date } | undefined => {
  if (!bounds.from && !bounds.to) return undefined;
  const filter: { gte?: Date; lte?: Date } = {};
  if (bounds.from) filter.gte = bounds.from;
  if (bounds.to) filter.lte = bounds.to;
  return filter;
};
