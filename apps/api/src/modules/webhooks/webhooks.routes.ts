import { Router } from 'express';
import * as controller from './webhooks.controller';

const router = Router();

// All webhook routes are public — platforms call these directly
router.post('/indiamart/:tenantId', controller.indiamart);
router.post('/justdial/:tenantId', controller.justdial);
router.post('/tradeindia/:tenantId', controller.tradeindia);
router.post('/sulekha/:tenantId', controller.sulekha);
router.post('/acres-99/:tenantId', controller.acres99);
router.post('/magicbricks/:tenantId', controller.magicbricks);
router.post('/housing/:tenantId', controller.housing);
router.post('/google-ads/:tenantId', controller.googleAds);
router.get('/facebook-leads/:tenantId', controller.facebookVerify);
router.post('/facebook-leads/:tenantId', controller.facebookLeads);
router.post('/google-forms/:tenantId', controller.googleForms);
router.post('/custom/:tenantId', controller.custom);

export default router;
