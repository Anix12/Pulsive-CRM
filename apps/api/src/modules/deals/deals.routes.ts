import { Router } from 'express';
import * as controller from './deals.controller';
import { validate } from '@/middleware/validate';
import { authenticate } from '@/middleware/auth';
import { requireActiveTenant } from '@/middleware/tenant';
import { CreateDealSchema, UpdateDealSchema, CreateStageSchema, UpdateStageSchema, ReorderStagesSchema } from './deals.types';

const router = Router();
router.use(authenticate, requireActiveTenant);

router.get('/pipelines', controller.listPipelines);

// Stage management
router.get('/stages', controller.getStages);
router.post('/stages', validate(CreateStageSchema), controller.createStage);
router.put('/stages/reorder', validate(ReorderStagesSchema), controller.reorderStages);
router.patch('/stages/:stageId', validate(UpdateStageSchema), controller.updateStage);
router.delete('/stages/:stageId', controller.deleteStage);

// Deal CRUD
router.get('/', controller.list);
router.get('/:id', controller.getById);
router.post('/', validate(CreateDealSchema), controller.create);
router.patch('/:id', validate(UpdateDealSchema), controller.update);
router.delete('/:id', controller.remove);

export default router;
