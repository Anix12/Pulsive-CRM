import { Router } from 'express';
import * as controller from './tenants.controller';
import { validate } from '@/middleware/validate';
import { authenticate, requireRole } from '@/middleware/auth';
import { requireActiveTenant } from '@/middleware/tenant';
import { UpdateTenantSchema, UpdateTwilioSchema, UpdateWhatsAppSchema, UpdateVapiSchema, InviteUserSchema, UpdateUserRoleSchema } from './tenants.service';

const router = Router();
router.use(authenticate, requireActiveTenant);

router.get('/me', controller.get);
router.patch('/me', requireRole('OWNER', 'ADMIN'), validate(UpdateTenantSchema), controller.update);
router.put('/me/twilio', requireRole('OWNER', 'ADMIN'), validate(UpdateTwilioSchema), controller.updateTwilio);
router.put('/me/whatsapp', requireRole('OWNER', 'ADMIN'), validate(UpdateWhatsAppSchema), controller.updateWhatsApp);
router.put('/me/vapi', requireRole('OWNER', 'ADMIN'), validate(UpdateVapiSchema), controller.updateVapi);

router.get('/me/users', controller.listUsers);
router.post('/me/users', requireRole('OWNER', 'ADMIN'), validate(InviteUserSchema), controller.inviteUser);
router.patch('/me/users/:userId', requireRole('OWNER', 'ADMIN'), validate(UpdateUserRoleSchema), controller.updateUserRole);
router.delete('/me/users/:userId', requireRole('OWNER', 'ADMIN'), controller.removeUser);

export default router;
