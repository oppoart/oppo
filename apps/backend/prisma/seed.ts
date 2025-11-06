import { PrismaClient } from '@prisma/client';
import { auth } from '../src/shared/auth/better-auth';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create default user with Better Auth (handles password hashing)
  let user;
  try {
    // Try to sign up the user with Better Auth
    const signUpResult = await auth.api.signUpEmail({
      body: {
        email: 'artist@oppo.local',
        password: '1234bes',
        name: 'OPPO Artist',
      },
    });

    user = signUpResult.user;
    console.log('✅ Created user with Better Auth:', user.email);
    console.log('📧 Email: artist@oppo.local');
    console.log('🔑 Password: 1234bes');
  } catch (error) {
    // If user already exists, just get the user
    console.log('ℹ️  User already exists, fetching from database...');
    user = await prisma.user.findUnique({
      where: { email: 'artist@oppo.local' },
    });

    if (!user) {
      throw new Error('Failed to create or find user');
    }
    console.log('✅ Found existing user:', user.email);
  }

  // Delete existing profiles for this user to start fresh
  await prisma.artistProfile.deleteMany({
    where: { userId: user.id },
  });

  // Create multiple artist profiles to demonstrate multi-profile functionality
  const profiles = [
    {
      name: 'Digital Art Portfolio',
      mediums: ['generative art', 'new media art', 'AI art'],
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
      mediums: ['traditional art', 'fine art'],
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
      mediums: ['AI art', 'generative art', 'new media art'],
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

  // Add sample opportunities for testing
  const opportunities = [
    {
      title: 'Digital Art Residency at TechSpace Gallery',
      organization: 'TechSpace Gallery',
      description: 'A 3-month residency program for digital and new media artists working with emerging technologies.',
      url: 'https://techspace.gallery/residency',
      deadline: new Date('2025-03-15'),
      amount: '$5,000 stipend',
      location: 'San Francisco, CA',
      tags: ['residency', 'digital art', 'new media', 'technology'],
      sourceType: 'websearch',
      sourceUrl: 'https://techspace.gallery',
    },
    {
      title: 'AI Art Innovation Grant',
      organization: 'Future Arts Foundation',
      description: 'Grant program supporting artists exploring artificial intelligence and machine learning in creative practice.',
      url: 'https://futurearts.org/grants/ai-innovation',
      deadline: new Date('2025-02-28'),
      amount: '$10,000',
      location: 'Remote',
      tags: ['grant', 'AI art', 'innovation', 'research'],
      sourceType: 'newsletter',
      sourceUrl: 'https://futurearts.org',
    },
    {
      title: 'Traditional Painting Exhibition Call',
      organization: 'Brooklyn Art Center',
      description: 'Open call for contemporary painters working in traditional mediums.',
      url: 'https://brooklynart.center/calls/traditional-painting',
      deadline: new Date('2025-01-31'),
      amount: 'No fee',
      location: 'Brooklyn, NY',
      tags: ['exhibition', 'traditional art', 'painting'],
      sourceType: 'social',
      sourceUrl: 'https://instagram.com/brooklynartcenter',
    },
  ];

  for (const opportunityData of opportunities) {
    const opportunity = await prisma.opportunity.create({
      data: opportunityData,
    });
    console.log('✅ Created opportunity:', opportunity.title);
  }

  // Add query template groups and templates
  console.log('📋 Seeding query templates...');

  const templateGroups = [
    {
      name: 'Time-based Queries',
      description: 'Search queries based on time and deadlines',
      order: 1,
      templates: [
        { template: 'Latest [medium] Open Calls [month] [year]', placeholders: ['medium', 'month', 'year'], order: 1 },
        { template: '[medium] opportunities deadline [month] [year]', placeholders: ['medium', 'month', 'year'], order: 2 },
        { template: 'Upcoming [opportunity-type] [month] [year]', placeholders: ['opportunity-type', 'month', 'year'], order: 3 },
      ]
    },
    {
      name: 'Opportunity Types',
      description: 'Search by specific opportunity categories',
      order: 2,
      templates: [
        { template: '[medium] [grant/award/exhibition/residency] [year]', placeholders: ['medium', 'opportunity-type', 'year'], order: 1 },
        { template: 'Open call [medium] [location]', placeholders: ['medium', 'location'], order: 2 },
        { template: '[opportunity-type] for emerging artists [year]', placeholders: ['opportunity-type', 'year'], order: 3 },
      ]
    },
    {
      name: 'Geographic Queries',
      description: 'Location-based opportunity searches',
      order: 3,
      templates: [
        { template: '[medium] opportunities [city/state/country]', placeholders: ['medium', 'location'], order: 1 },
        { template: 'International [opportunity-type] [medium]', placeholders: ['opportunity-type', 'medium'], order: 2 },
        { template: '[location] art [grant/competition/exhibition] [year]', placeholders: ['location', 'opportunity-type', 'year'], order: 3 },
      ]
    },
    {
      name: 'Funding & Prize Queries',
      description: 'Searches focused on grants and prizes',
      order: 4,
      templates: [
        { template: '[amount]+ [medium] grants [year]', placeholders: ['amount', 'medium', 'year'], order: 1 },
        { template: 'Large [opportunity-type] [medium] funding', placeholders: ['opportunity-type', 'medium'], order: 2 },
        { template: '[medium] prize competition [year]', placeholders: ['medium', 'year'], order: 3 },
      ]
    },
    {
      name: 'Theme & Subject Queries',
      description: 'Searches based on artistic themes and subjects',
      order: 5,
      templates: [
        { template: '[theme/subject] [medium] [opportunity-type]', placeholders: ['theme', 'medium', 'opportunity-type'], order: 1 },
        { template: 'Contemporary [medium] [location] opportunities', placeholders: ['medium', 'location'], order: 2 },
        { template: '[social-issue] art [grant/exhibition] [year]', placeholders: ['theme', 'opportunity-type', 'year'], order: 3 },
      ]
    },
  ];

  for (const groupData of templateGroups) {
    const { templates, ...groupInfo } = groupData;

    const group = await prisma.queryTemplateGroup.create({
      data: {
        ...groupInfo,
        templates: {
          create: templates,
        },
      },
    });

    console.log(`✅ Created query template group: ${group.name} (${templates.length} templates)`);
  }

  console.log('🎉 Database seeded successfully with multi-profile structure, opportunities, and query templates!');
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