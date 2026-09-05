import { Router } from 'express';
import multer from 'multer';
import * as controller from './marketing.controller';
import { validate } from '@/middleware/validate';
import { authenticate } from '@/middleware/auth';
import { requireActiveTenant } from '@/middleware/tenant';
import {
  CreateMarketingListSchema,
  UpdateMarketingListSchema,
  CreateMarketingCampaignSchema,
  UpdateMarketingCampaignSchema,
} from './marketing.types';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'));
    }
  },
});

const router = Router();
router.use(authenticate, requireActiveTenant);

// Lists
router.get('/lists', controller.listLists);
router.get('/lists/:id', controller.getListById);
router.post('/lists', validate(CreateMarketingListSchema), controller.createList);
router.post('/lists/:id/upload', upload.single('file'), controller.uploadCsv);
router.patch('/lists/:id', validate(UpdateMarketingListSchema), controller.updateList);
router.delete('/lists/:id', controller.removeList);

// Campaigns (bulk sends)
router.get('/campaigns', controller.listCampaigns);
router.get('/campaigns/:id', controller.getCampaignById);
router.post('/campaigns', validate(CreateMarketingCampaignSchema), controller.createCampaign);
router.patch('/campaigns/:id', validate(UpdateMarketingCampaignSchema), controller.updateCampaign);
router.delete('/campaigns/:id', controller.removeCampaign);

export default router;
