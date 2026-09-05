import { Router } from 'express';
import * as controller from './messaging.controller';
import { validate } from '@/middleware/validate';
import { authenticate } from '@/middleware/auth';
import { requireActiveTenant } from '@/middleware/tenant';
import {
  SendMessageSchema,
  CreateTemplateSchema,
  UpdateTemplateSchema,
  AiDraftEmailSchema,
  EmailConfigSchema,
} from './messaging.types';

const router = Router();

// Public inbound webhooks
router.post('/webhook/:provider', controller.inboundWebhook);

router.use(authenticate, requireActiveTenant);

router.get('/', controller.list);
router.post('/', validate(SendMessageSchema), controller.send);

router.get('/templates', controller.listTemplates);
router.post('/templates', validate(CreateTemplateSchema), controller.createTemplate);
router.post('/templates/ai-draft', validate(AiDraftEmailSchema), controller.aiDraftEmail);
router.patch('/templates/:id', validate(UpdateTemplateSchema), controller.updateTemplate);
router.delete('/templates/:id', controller.deleteTemplate);

router.get('/email-config', controller.getEmailConfig);
router.put('/email-config', validate(EmailConfigSchema), controller.updateEmailConfig);

export default router;
