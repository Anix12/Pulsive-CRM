import { Router } from 'express';
import multer from 'multer';
import * as controller from './campaigns.controller';
import { validate } from '@/middleware/validate';
import { authenticate } from '@/middleware/auth';
import { requireActiveTenant } from '@/middleware/tenant';
import { CreateCampaignSchema, UpdateCampaignSchema } from './campaigns.types';

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

router.get('/', controller.list);
router.get('/intelligence', controller.intelligence);
router.get('/categories', controller.categories);
router.get('/:id', controller.getById);
router.post('/', validate(CreateCampaignSchema), controller.create);
router.post('/:id/import', upload.single('file'), controller.importCsv);
router.post('/:id/pin', controller.togglePin);
router.post('/:id/webhook-token', controller.generateWebhookToken);
router.patch('/:id', validate(UpdateCampaignSchema), controller.update);
router.delete('/:id', controller.remove);

export default router;
