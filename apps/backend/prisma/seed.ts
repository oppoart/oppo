import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create default user (betterAuth handles passwords differently)
  const user = await prisma.user.upsert({
    where: { email: 'artist@oppo.local' },
    update: {},
    create: {
      email: 'artist@oppo.local',
      name: 'OPPO Artist',
      emailVerified: true,
    },
  });

  console.log('✅ Created user:', user.email);

  // Delete existing profiles for this user to start fresh
  await prisma.artistProfile.deleteMany({
    where: { userId: user.id },
  });

  // Create multiple artist profiles to demonstrate multi-profile functionality
  const profiles = [
    {
      name: 'Digital Art Portfolio',
      category: 'digital art',
      bio: 'Exploring the intersection of technology and creativity through digital mediums.',
      artistStatement: 'My digital art journey focuses on creating immersive experiences that challenge traditional boundaries.',
      skills: ['Digital Painting', 'NFT Creation', '3D Modeling', 'Animation'],
      interests: ['Blockchain Art', 'Virtual Reality', 'Interactive Media', 'Tech Art'],
      experience: '5 years in digital art, exhibited in 3 virtual galleries',
      location: 'New York, NY',
      website: 'https://digitalart.example.com',
      portfolioUrl: 'https://portfolio.digitalart.example.com',
    },
    {
      name: 'Traditional Art Practice',
      category: 'traditional art',
      bio: 'Creating contemporary works with classical techniques and materials.',
      artistStatement: 'I believe in the enduring power of traditional mediums to convey modern themes.',
      skills: ['Oil Painting', 'Watercolor', 'Charcoal Drawing', 'Printmaking'],
      interests: ['Gallery Exhibitions', 'Art Residencies', 'Teaching', 'Community Art'],
      experience: '10 years painting, MFA from renowned art school',
      location: 'Brooklyn, NY',
      website: 'https://traditional.example.com',
      portfolioUrl: 'https://portfolio.traditional.example.com',
    },
    {
      name: 'AI Art Experiments',
      category: 'AI art',
      bio: 'Pushing the boundaries of creativity through artificial intelligence and machine learning.',
      artistStatement: 'Exploring the collaborative relationship between human creativity and artificial intelligence.',
      skills: ['Machine Learning', 'Prompt Engineering', 'Generative Models', 'Data Visualization'],
      interests: ['AI Ethics', 'Creative Coding', 'Technology Art', 'Innovation'],
      experience: '2 years in AI art, background in computer science',
      location: 'San Francisco, CA',
      website: 'https://aiart.example.com',
      portfolioUrl: 'https://portfolio.aiart.example.com',
    },
  ];

  for (const profileData of profiles) {
    const profile = await prisma.artistProfile.create({
      data: {
        userId: user.id,
        ...profileData,
        preferences: {
          maxTravelDistance: 500,
          minFundingAmount: 1000,
          preferredOpportunityTypes: ['Residency', 'Grant', 'Exhibition'],
          availabilityStart: '2025-01-01',
          availabilityEnd: '2025-12-31'
        },
        settings: {
          emailNotifications: true,
          weeklyDigest: true,
          instantAlerts: false,
          matchThreshold: 0.7
        }
      },
    });

    console.log('✅ Created artist profile:', profile.name);
  }

  console.log('🎉 Database seeded successfully with multi-profile structure!');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('❌ Error seeding database:', e);
    await prisma.$disconnect();
    process.exit(1);
  });