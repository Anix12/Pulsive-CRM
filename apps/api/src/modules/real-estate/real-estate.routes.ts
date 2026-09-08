import { Router } from 'express';
import * as projects from './projects.controller';
import * as units from './units.controller';
import * as siteVisits from './site-visits.controller';
import * as bookings from './bookings.controller';
import * as propertyMatch from './property-match.controller';
import * as agentTracker from './agent-tracker.controller';
import { validate } from '@/middleware/validate';
import { authenticate } from '@/middleware/auth';
import { requireActiveTenant } from '@/middleware/tenant';
import {
  CreateProjectSchema, UpdateProjectSchema,
  CreateUnitSchema, UpdateUnitSchema,
  CreateSiteVisitSchema, UpdateSiteVisitSchema, UpdateSiteVisitStatusSchema,
  CreateBookingSchema, UpdateBookingSchema,
  UpsertPropertyPreferenceSchema,
} from './real-estate.types';

const router = Router();
router.use(authenticate, requireActiveTenant);

// Projects
router.get('/projects', projects.list);
router.post('/projects', validate(CreateProjectSchema), projects.create);
router.get('/projects/:id', projects.getById);
router.patch('/projects/:id', validate(UpdateProjectSchema), projects.update);
router.delete('/projects/:id', projects.remove);

// Units (nested under a project for create/list, flat for get/update/delete)
router.get('/projects/:id/units', units.listByProject);
router.post('/projects/:id/units', validate(CreateUnitSchema), units.create);
router.get('/units/:id', units.getById);
router.patch('/units/:id', validate(UpdateUnitSchema), units.update);
router.delete('/units/:id', units.remove);

// Site Visits (static sub-paths before the /:id catch-all)
router.get('/site-visits/stats', siteVisits.stats);
router.get('/site-visits', siteVisits.list);
router.post('/site-visits', validate(CreateSiteVisitSchema), siteVisits.create);
router.get('/site-visits/:id', siteVisits.getById);
router.patch('/site-visits/:id/status', validate(UpdateSiteVisitStatusSchema), siteVisits.updateStatus);
router.patch('/site-visits/:id', validate(UpdateSiteVisitSchema), siteVisits.update);
router.delete('/site-visits/:id', siteVisits.remove);

// Bookings
router.get('/bookings/stats', bookings.stats);
router.get('/bookings', bookings.list);
router.post('/bookings', validate(CreateBookingSchema), bookings.create);
router.get('/bookings/:id', bookings.getById);
router.patch('/bookings/:id', validate(UpdateBookingSchema), bookings.update);
router.delete('/bookings/:id', bookings.remove);

// Property Match
router.get('/property-match/stats', propertyMatch.overviewStats);
router.get('/property-match/search', propertyMatch.searchLeads);
router.get('/property-match/preferences/:contactId', propertyMatch.getPreference);
router.post('/property-match/preferences', validate(UpsertPropertyPreferenceSchema), propertyMatch.upsertPreference);
router.get('/property-match/:contactId', propertyMatch.matchesForContact);

// Agent Tracker
router.get('/agent-tracker', agentTracker.overview);
router.get('/agent-tracker/performance', agentTracker.performance);

export default router;
