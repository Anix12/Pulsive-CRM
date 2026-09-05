import { Router } from 'express';
import multer from 'multer';
import * as controller from './contacts.controller';
import { validate } from '@/middleware/validate';
import { authenticate } from '@/middleware/auth';
import { requireActiveTenant } from '@/middleware/tenant';
import { CreateContactSchema, UpdateContactSchema } from './contacts.types';

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
router.get('/overview', controller.overview);
router.get('/:id', controller.getById);
router.post('/', validate(CreateContactSchema), controller.create);
router.post('/import', upload.single('file'), controller.importCsv);
router.patch('/:id', validate(UpdateContactSchema), controller.update);
router.delete('/:id', controller.remove);

export default router;
