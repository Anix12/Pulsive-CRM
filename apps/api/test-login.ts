import bcrypt from 'bcryptjs';
import prisma from './src/db/client';

async function main() {
  const user = await prisma.user.findFirst({
    where: {
      email: 'owner@demo.com',
      status: 'ACTIVE'
    }
  });

  console.log('User found:', !!user);

  if (user) {
    console.log('Email:', user.email);
    console.log('Status:', user.status);
    console.log(
      'Password matches Demo@123:',
      await bcrypt.compare('Demo@123', user.passwordHash)
    );
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
