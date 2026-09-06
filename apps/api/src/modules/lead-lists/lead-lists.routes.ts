import { Router } from 'express';
import multer from 'multer';
import * as controller from './lead-lists.controller';
import { authenticate } from '@/middleware/auth';
import { requireActiveTenant } from '@/middleware/tenant';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const isCsv = file.mimetype === 'text/csv' || file.originalname.endsWith('.csv');
    const isExcel =
      file.mimetype.includes('spreadsheetml') ||
      file.mimetype === 'application/vnd.ms-excel' ||
      /\.(xlsx|xls)$/i.test(file.originalname);
    if (isCsv || isExcel) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV or Excel files are allowed'));
    }
  },
});

const router = Router();
router.use(authenticate, requireActiveTenant);

router.get('/', controller.listLists);
router.post('/import', upload.single('file'), controller.importFile);
router.delete('/:id', controller.deleteList);

export default router;
