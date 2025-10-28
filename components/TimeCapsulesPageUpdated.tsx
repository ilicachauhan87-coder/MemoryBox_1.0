// This is a helper file for the Time Capsules dynamic demo generation
// Copy these functions into TimeCapsulesPage.tsx, replacing getDemoTimeCapsules

// 🎨 Generate dynamic demo time capsules based on actual family members
const getDemoTimeCapsules = (): TimeCapsule[] => {
  // Try to load real family members
  const currentUserId = localStorage.getItem('current_user_id');
  let livingMembers: any[] = [];
  let userFamilyId = '';
  
  if (currentUserId) {
    try {
      const userProfile = localStorage.getItem(`user:${currentUserId}:profile`);
      if (userProfile) {
        const userData = JSON.parse(userProfile);
        userFamilyId = userData.family_id;
        
        if (userFamilyId) {
          const treeData = localStorage.getItem(`familyTree_${userFamilyId}`);
          if (treeData) {
            const tree = JSON.parse(treeData);
            const allMembers = Array.isArray(tree) ? tree : tree.people || [];
            // Filter for living members only (exclude deceased and exclude current user)
            livingMembers = allMembers.filter((m: any) => 
              m.status !== 'deceased' && m.id !== currentUserId
            );
          }
        }
      }
    } catch (error) {
      console.log('Could not load family members for dynamic time capsule demos');
    }
  }
  
  // If we have real family members, generate personalized capsules
  if (livingMembers.length >= 2) {
    return generatePersonalizedCapsules(livingMembers);
  }
  
  // Otherwise, use static demo data as fallback
  return getStaticDemoCapsules();
};

// 🎯 Generate personalized time capsules using actual family members
const generatePersonalizedCapsules = (members: any[]): TimeCapsule[] => {
  const capsules: TimeCapsule[] = [];
  
  // Find different types of family members
  const children = members.filter((m: any) => 
    m.relationshipToUser?.toLowerCase().includes('son') || 
    m.relationshipToUser?.toLowerCase().includes('daughter')
  );
  const grandparents = members.filter((m: any) => 
    m.relationshipToUser?.toLowerCase().includes('grand')
  );
  const parents = members.filter((m: any) => 
    m.relationshipToUser?.toLowerCase().includes('mother') || 
    m.relationshipToUser?.toLowerCase().includes('father')
  );
  
  // Capsule 1: To a child/young family member
  if (children.length > 0) {
    const child = children[0];
    const childName = child.name || child.firstName || 'Little One';
    capsules.push({
      id: '550e8400-e29b-41d4-a716-446655440001',
      title: `${childName}'s First Birthday Wishes`,
      message: `Dear future ${childName}, today you turned 1! You said "mama" for the first time and took your first steps. We are so proud of you...`,
      createdDate: new Date('2024-09-06'),
      openDate: new Date('2033-09-06'),
      status: 'sealed',
      recipients: [child.id],
      attachments: {
        photos: [
          'https://images.unsplash.com/photo-1635349135195-ea08a39fcc5c?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=1080',
          'https://images.unsplash.com/photo-1673882400966-57c83f87dda5?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=1080'
        ],
        voices: [],
        videos: []
      },
      isLocked: true,
      category: 'milestone'
    });
  }
  
  // Capsule 2: Family capsule
  capsules.push({
    id: '550e8400-e29b-41d4-a716-446655440002',
    title: 'Family Time Capsule - 2024',
    message: 'A collection of memories, hopes, and reflections from our family during these precious times...',
    createdDate: new Date('2024-03-15'),
    openDate: new Date('2029-03-15'),
    status: 'sealed',
    recipients: ['family'],
    attachments: {
      photos: [
        'https://images.unsplash.com/photo-1760080903536-736f18eddcac?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=1080',
        'https://images.unsplash.com/photo-1605362242548-3af0d67dd4c3?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=1080'
      ],
      voices: [],
      videos: []
    },
    isLocked: true,
    category: 'family'
  });
  
  // Capsule 3: To future self
  capsules.push({
    id: '550e8400-e29b-41d4-a716-446655440003',
    title: 'To My Future Self - 30th Birthday',
    message: 'Dear 30-year-old me, I wonder what you\'ve accomplished by now. Are you happy? Did you travel to Japan like you planned?...',
    createdDate: new Date('2024-01-01'),
    openDate: new Date('2025-03-31'),
    status: 'upcoming',
    recipients: ['self'],
    attachments: {
      photos: [
        'https://images.unsplash.com/photo-1635564981692-857482d9325f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=1080'
      ],
      voices: [],
      videos: []
    },
    isLocked: true,
    category: 'future-self'
  });
  
  // Capsule 4: From grandparents (if they exist)
  if (grandparents.length > 0) {
    const grandparent = grandparents[0];
    const gpName = grandparent.name || grandparent.firstName || 'Grandparents';
    capsules.push({
      id: '550e8400-e29b-41d4-a716-446655440004',
      title: `${gpName}'s Love Letters`,
      message: `Messages from ${gpName} to their great-grandchildren, filled with wisdom and love from their generation...`,
      createdDate: new Date('2023-12-25'),
      openDate: new Date('2024-12-25'),
      status: 'opened',
      recipients: ['family'],
      attachments: {
        photos: [
          'https://images.unsplash.com/photo-1630481721712-0a79d553c1ea?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=1080',
          'https://images.unsplash.com/photo-1742281257687-092746ad6021?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=1080'
        ],
        voices: [],
        videos: []
      },
      isLocked: false,
      category: 'family'
    });
  }
  
  console.log(`✨ Generated ${capsules.length} personalized demo time capsules from ${members.length} living family members`);
  return capsules;
};

// 📦 Static fallback demo capsules (used when family tree is small)
const getStaticDemoCapsules = (): TimeCapsule[] => [
  {
    id: '550e8400-e29b-41d4-a716-446655440001',
    title: 'Miraya\'s First Birthday Wishes',
    message: 'Dear future Miraya, today you turned 1! You said \"mama\" for the first time and took your first steps. We are so proud of you...',
    createdDate: new Date('2024-09-06'),
    openDate: new Date('2033-09-06'),
    status: 'sealed',
    recipients: ['miraya-chauhan-sinha'],
    attachments: {
      photos: [
        'https://images.unsplash.com/photo-1635349135195-ea08a39fcc5c?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=1080',
        'https://images.unsplash.com/photo-1673882400966-57c83f87dda5?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=1080'
      ],
      voices: [],
      videos: []
    },
    isLocked: true,
    category: 'milestone'
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440002',
    title: 'COVID-19 Time Capsule - 2024',
    message: 'A collection of memories, hopes, and reflections from our family during these unprecedented times...',
    createdDate: new Date('2024-03-15'),
    openDate: new Date('2029-03-15'),
    status: 'sealed',
    recipients: ['family'],
    attachments: {
      photos: [
        'https://images.unsplash.com/photo-1760080903536-736f18eddcac?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=1080',
        'https://images.unsplash.com/photo-1605362242548-3af0d67dd4c3?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=1080'
      ],
      voices: [],
      videos: []
    },
    isLocked: true,
    category: 'family'
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440003',
    title: 'To My Future Self - 30th Birthday',
    message: 'Dear 30-year-old me, I wonder what you\'ve accomplished by now. Are you happy? Did you travel to Japan like you planned?...',
    createdDate: new Date('2024-01-01'),
    openDate: new Date('2025-03-31'),
    status: 'upcoming',
    recipients: ['self'],
    attachments: {
      photos: [
        'https://images.unsplash.com/photo-1635564981692-857482d9325f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=1080'
      ],
      voices: [],
      videos: []
    },
    isLocked: true,
    category: 'future-self'
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440004',
    title: 'Grandparents\' Love Letters',
    message: 'Messages from Dadi and Dada to their great-grandchildren, filled with wisdom and love from their generation...',
    createdDate: new Date('2023-12-25'),
    openDate: new Date('2024-12-25'),
    status: 'opened',
    recipients: ['family'],
    attachments: {
      photos: [
        'https://images.unsplash.com/photo-1630481721712-0a79d553c1ea?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=1080',
        'https://images.unsplash.com/photo-1742281257687-092746ad6021?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=1080'
      ],
      voices: [],
      videos: []
    ],
    isLocked: false,
    category: 'family'
  }
];
