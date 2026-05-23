import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

async function main() {
  // ── Facilities catalogue ────────────────────────────────────────────────
  const facilities = await Promise.all(
    [
      ['swimming-pool', 'Swimming Pool', 'Recreation'],
      ['clubhouse', 'Clubhouse', 'Community'],
      ['bowling-green', 'Bowling Green', 'Recreation'],
      ['gymnasium', 'Gymnasium', 'Wellness'],
      ['library', 'Library', 'Community'],
      ['pet-park', 'Pet Park', 'Community'],
      ['caravan-storage', 'Caravan & Boat Storage', 'Practical'],
      ['tennis-court', 'Tennis Court', 'Recreation'],
    ].map(([slug, name, category]) =>
      db.facility.upsert({
        where: { slug },
        update: {},
        create: { slug, name, category },
      }),
    ),
  );

  // ── Suburbs ─────────────────────────────────────────────────────────────
  const suburbs = await Promise.all([
    db.suburb.upsert({
      where: { slug: 'mandurah-wa' },
      update: {},
      create: { slug: 'mandurah-wa', name: 'Mandurah', state: 'WA', postcode: '6210', latitude: -32.5269, longitude: 115.7217 },
    }),
    db.suburb.upsert({
      where: { slug: 'hervey-bay-qld' },
      update: {},
      create: { slug: 'hervey-bay-qld', name: 'Hervey Bay', state: 'QLD', postcode: '4655', latitude: -25.2882, longitude: 152.8265 },
    }),
    db.suburb.upsert({
      where: { slug: 'port-macquarie-nsw' },
      update: {},
      create: { slug: 'port-macquarie-nsw', name: 'Port Macquarie', state: 'NSW', postcode: '2444', latitude: -31.4333, longitude: 152.9000 },
    }),
  ]);

  // ── Operator ────────────────────────────────────────────────────────────
  const operator = await db.operator.upsert({
    where: { slug: 'coastal-living-co' },
    update: {},
    create: {
      slug: 'coastal-living-co',
      name: 'Coastal Living Co.',
      contactEmail: 'hello@example.com.au',
      verified: true,
      subscriptionTier: 'FEATURED',
    },
  });

  // ── Sample communities ──────────────────────────────────────────────────
  const samples = [
    {
      slug: 'banksia-grove-mandurah',
      name: 'Banksia Grove',
      suburb: suburbs[0],
      addressLine1: '12 Banksia Drive',
      petFriendly: true,
      over50sOnly: true,
      coastal: true,
      siteFeesMin: 16500,
      siteFeesMax: 18900,
      feeFrequency: 'WEEKLY' as const,
      totalHomes: 220,
      yearEstablished: 2012,
      shortDescription: 'A coastal over-50s community in Mandurah, WA.',
      description:
        'Banksia Grove is a friendly over-50s land lease community minutes from Mandurah Foreshore. ' +
        'Enjoy resort-style facilities including a heated pool, clubhouse, bowling green and a vibrant social calendar.',
      featured: true,
    },
    {
      slug: 'whitehaven-hervey-bay',
      name: 'Whitehaven Lifestyle Village',
      suburb: suburbs[1],
      addressLine1: '88 Whitehaven Way',
      petFriendly: true,
      over50sOnly: true,
      coastal: true,
      siteFeesMin: 17200,
      siteFeesMax: 19500,
      feeFrequency: 'WEEKLY' as const,
      totalHomes: 180,
      yearEstablished: 2015,
      shortDescription: 'Resort-style over-50s living on the Fraser Coast.',
      description:
        'Whitehaven offers low-maintenance manufactured homes in a secure, gated community a short drive from Hervey Bay marina.',
      featured: true,
    },
    {
      slug: 'lighthouse-grove-port-macquarie',
      name: 'Lighthouse Grove',
      suburb: suburbs[2],
      addressLine1: '5 Lighthouse Road',
      petFriendly: false,
      over50sOnly: true,
      coastal: true,
      siteFeesMin: 19500,
      siteFeesMax: 22500,
      feeFrequency: 'WEEKLY' as const,
      totalHomes: 140,
      yearEstablished: 2018,
      shortDescription: 'Boutique coastal community in Port Macquarie.',
      description:
        'Lighthouse Grove is a boutique land lease community offering architect-designed homes within walking distance of Port Macquarie beaches.',
      featured: true,
    },
  ];

  for (const s of samples) {
    const community = await db.community.upsert({
      where: { slug: s.slug },
      update: {},
      create: {
        slug: s.slug,
        name: s.name,
        kind: 'LAND_LEASE',
        status: 'PUBLISHED',
        operatorId: operator.id,
        addressLine1: s.addressLine1,
        suburbId: s.suburb.id,
        state: s.suburb.state,
        postcode: s.suburb.postcode,
        latitude: s.suburb.latitude,
        longitude: s.suburb.longitude,
        shortDescription: s.shortDescription,
        description: s.description,
        petFriendly: s.petFriendly,
        over50sOnly: s.over50sOnly,
        coastal: s.coastal,
        siteFeesMin: s.siteFeesMin,
        siteFeesMax: s.siteFeesMax,
        feeFrequency: s.feeFrequency,
        totalHomes: s.totalHomes,
        yearEstablished: s.yearEstablished,
        featured: s.featured,
      },
    });

    // Attach a few facilities
    for (const f of facilities.slice(0, 5)) {
      await db.communityFacility.upsert({
        where: { communityId_facilityId: { communityId: community.id, facilityId: f.id } },
        update: {},
        create: { communityId: community.id, facilityId: f.id },
      });
    }

    await db.communityFAQ.createMany({
      data: [
        {
          communityId: community.id,
          question: 'What are the site fees?',
          answer: 'Site fees vary by home size and location within the community. Contact us for the latest schedule.',
          order: 0,
        },
        {
          communityId: community.id,
          question: 'Are pets allowed?',
          answer: s.petFriendly ? 'Yes, small to medium pets are welcome subject to community guidelines.' : 'Pets are not permitted in this community.',
          order: 1,
        },
      ],
      skipDuplicates: true,
    });
  }

  console.log('Seeded', samples.length, 'sample communities.');
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
