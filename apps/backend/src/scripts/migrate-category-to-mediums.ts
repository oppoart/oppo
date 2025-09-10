import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function migrateCategoryToMediums() {
  try {
    console.log('Starting migration from category to mediums...');

    // Get all profiles
    const profiles = await prisma.artistProfile.findMany({
      select: { id: true, category: true, mediums: true }
    });

    console.log(`Found ${profiles.length} profiles to migrate`);

    // Update each profile to set mediums array from category
    for (const profile of profiles) {
      if (profile.category && (profile.mediums.length === 0 || profile.mediums[0] === 'other')) {
        console.log(`Migrating profile ${profile.id}: ${profile.category} -> [${profile.category}]`);
        
        await prisma.artistProfile.update({
          where: { id: profile.id },
          data: {
            mediums: [profile.category]
          }
        });
      }
    }

    console.log('Migration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

migrateCategoryToMediums();