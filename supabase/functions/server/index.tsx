import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import { createClient } from "npm:@supabase/supabase-js@2";
import * as kv from "./kv_store.tsx";

const app = new Hono();

// 🔧 Get Supabase configuration from environment
// These are automatically injected by Supabase Edge Functions
const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';

console.log('🔍 Server initialization:');
console.log('   Supabase URL:', supabaseUrl || 'MISSING');
console.log('   Service Role Key length:', supabaseServiceKey ? supabaseServiceKey.length : 0);
console.log('   Service Role Key prefix:', supabaseServiceKey ? supabaseServiceKey.substring(0, 20) + '...' : 'MISSING');
console.log('   Anon Key length:', supabaseAnonKey ? supabaseAnonKey.length : 0);

// 🔧 CRITICAL: Validate that we have the required credentials
if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ FATAL: Missing required Supabase credentials!');
  console.error('   This will cause all auth operations to fail.');
  console.error('   URL present:', !!supabaseUrl);
  console.error('   Service key present:', !!supabaseServiceKey);
}

// Initialize Supabase client with service role for admin operations
const supabase = createClient(
  supabaseUrl,
  supabaseServiceKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false
    }
  }
);

console.log('✅ Supabase client initialized');

// 📸 CRITICAL: Ensure BOTH storage buckets exist on server startup
(async () => {
  try {
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();
    
    if (listError) {
      console.warn('⚠️ Could not list storage buckets:', listError.message);
      console.warn('   Photo/memory uploads may fail. Please create buckets manually.');
      return;
    }
    
    // 1. Check/Create profile-photos bucket (PRIVATE)
    const profileBucket = buckets?.find(b => b.name === 'make-2544f7d4-profile-photos');
    
    if (!profileBucket) {
      console.log('📸 Creating make-2544f7d4-profile-photos bucket...');
      const { data: newBucket, error: createError } = await supabase.storage.createBucket('make-2544f7d4-profile-photos', {
        public: false, // PRIVATE bucket for security
        fileSizeLimit: 15 * 1024 * 1024, // 15MB max
        allowedMimeTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
      });
      
      if (createError) {
        console.error('❌ Failed to create make-2544f7d4-profile-photos bucket:', createError.message);
        console.error('   Bucket should already exist. Check Supabase Dashboard.');
      } else {
        console.log('✅ make-2544f7d4-profile-photos bucket created successfully (PRIVATE mode)');
      }
    } else {
      console.log('✅ make-2544f7d4-profile-photos bucket already exists (PRIVATE mode)');
    }
    
    // 2. Check/Create memory files bucket (PUBLIC)
    const memoriesBucket = buckets?.find(b => b.name === 'make-2544f7d4-memory-files');
    
    if (!memoriesBucket) {
      console.log('🗂️ Creating make-2544f7d4-memory-files bucket...');
      const { data: newBucket, error: createError } = await supabase.storage.createBucket('make-2544f7d4-memory-files', {
        public: true, // PUBLIC bucket for easier access
        fileSizeLimit: 100 * 1024 * 1024, // 100MB max
        allowedMimeTypes: [
          'image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif',
          'video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm',
          'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/webm',
          'application/pdf', 'text/plain'
        ]
      });
      
      if (createError) {
        console.error('❌ Failed to create make-2544f7d4-memory-files bucket:', createError.message);
        console.error('   Bucket should already exist. Check Supabase Dashboard.');
      } else {
        console.log('✅ make-2544f7d4-memory-files bucket created successfully (PUBLIC mode)');
      }
    } else {
      console.log('✅ make-2544f7d4-memory-files bucket already exists (PUBLIC mode)');
    }
  } catch (error) {
    console.error('❌ Error checking/creating storage buckets:', error);
    console.error('   Photo/memory uploads may fall back to localStorage');
  }
})();

// Enable logger
app.use('*', logger(console.log));

// Enable CORS for all routes and methods
app.use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
    credentials: true,
  }),
);

// ✅ FIX: Explicit OPTIONS handler for CORS preflight requests
app.options("/*", (c) => {
  console.log('✅ CORS preflight request handled for:', c.req.url);
  return c.json({ ok: true });
});

// Helper function to verify user authentication
async function verifyUser(c: any) {
  const authHeader = c.req.header('Authorization');
  if (!authHeader) {
    return null;
  }
  
  const token = authHeader.split(' ')[1];
  if (!token || token === 'undefined' || token === 'null') {
    return null;
  }
  
  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) {
      console.log('❌ Auth error:', error);
      return null;
    }
    
    return user;
  } catch (error) {
    console.log('❌ Auth verification failed:', error);
    return null;
  }
}

// ==================== AUTHENTICATION ROUTES ====================

// User registration endpoint
app.post("/make-server-48a3bd07/auth/signup", async (c) => {
  try {
    const { email, password, name, phone } = await c.req.json();
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🔐 SIGNUP REQUEST STARTED');
    console.log('   Email:', email);
    console.log('   Name:', name);
    console.log('   Timestamp:', new Date().toISOString());
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    // Check if we have the required environment variables
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('❌ FATAL: Missing Supabase credentials');
      console.error('   URL:', supabaseUrl ? `Present (${supabaseUrl.length} chars)` : 'MISSING');
      console.error('   Service Key:', supabaseServiceKey ? `Present (${supabaseServiceKey.length} chars)` : 'MISSING');
      return c.json({ 
        error: 'Server configuration error: Missing Supabase credentials',
        details: {
          hasUrl: !!supabaseUrl,
          hasKey: !!supabaseServiceKey
        }
      }, 500);
    }
    
    console.log('✓ Environment variables validated');
    console.log('   URL:', supabaseUrl);
    console.log('   Service Key prefix:', supabaseServiceKey.substring(0, 30) + '...');
    console.log('   Calling admin.createUser...');
    
    const { data, error } = await supabase.auth.admin.createUser({
      email: email,
      password: password,
      user_metadata: { 
        name: name,
        phone: phone
      },
      // Automatically confirm the user's email since an email server hasn't been configured.
      email_confirm: true
    });

    if (error) {
      console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.error('❌ SUPABASE ERROR DETAILS:');
      console.error('   Message:', error.message);
      console.error('   Status:', error.status);
      console.error('   Name:', error.name);
      console.error('   Code:', (error as any).code);
      console.error('   Full error:', JSON.stringify(error, null, 2));
      console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      return c.json({ 
        error: error.message || 'Failed to create user account',
        code: error.status || 400,
        details: {
          errorName: error.name,
          errorCode: (error as any).code
        }
      }, error.status || 400);
    }

    // Create initial user profile
    const userId = data.user!.id;
    const familyId = `family_${userId}`;
    
    const userProfile = {
      id: userId,
      email: email,
      name: name,
      phone: phone || null,
      family_id: familyId,
      is_new_user: true,
      onboarding_completed: false,
      activity_count: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    const familyData = {
      id: familyId,
      name: `${name}'s Family`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      created_by: userId,
      members: [userId]
    };
    
    // Save to KV store
    await kv.set(`user:${userId}:profile`, userProfile);
    await kv.set(`family:${familyId}:data`, familyData);
    await kv.set(`family:${familyId}:memories`, []);
    await kv.set(`family:${familyId}:tree`, []);

    console.log('✅ User created successfully:', userId);
    return c.json({ 
      user: { ...data.user, ...userProfile },
      access_token: data.session?.access_token,
      message: 'Account created successfully!'
    });
    
  } catch (error) {
    console.log('❌ Signup server error:', error);
    return c.json({ error: 'Failed to create account' }, 500);
  }
});

// ==================== USER PROFILE ROUTES ====================

// Get user profile
app.get("/make-server-48a3bd07/users/:userId/profile", async (c) => {
  const user = await verifyUser(c);
  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  
  try {
    const userId = c.req.param('userId');
    
    if (user.id !== userId) {
      return c.json({ error: 'Access denied' }, 403);
    }
    
    // ✅ DATABASE-FIRST FIX: Fetch from public.users table (primary storage)
    const { data: profile, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (error || !profile) {
      console.log('⚠️ Profile not found in database, trying KV store fallback:', error?.message);
      
      // Fallback to KV store for backward compatibility
      const kvProfile = await kv.get(`user:${userId}:profile`);
      if (kvProfile) {
        console.log('📦 Using KV store fallback (should migrate to database)');
        return c.json({ profile: kvProfile });
      }
      
      return c.json({ error: 'Profile not found' }, 404);
    }
    
    console.log('✅ Retrieved user profile from database:', {
      id: userId.substring(0, 8) + '...',
      onboarding_completed: profile.onboarding_completed,
      first_name: profile.first_name || 'NOT SET',
      gender: profile.gender || 'NOT SET'
    });
    
    // ✅ Cache in KV store for fast access (secondary storage)
    await kv.set(`user:${userId}:profile`, profile);
    
    return c.json({ profile });
    
  } catch (error) {
    console.log('❌ Get profile error:', error);
    return c.json({ error: 'Failed to retrieve profile' }, 500);
  }
});

// Update user profile
app.put("/make-server-48a3bd07/users/:userId/profile", async (c) => {
  const user = await verifyUser(c);
  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  
  try {
    const userId = c.req.param('userId');
    
    if (user.id !== userId) {
      return c.json({ error: 'Access denied' }, 403);
    }
    
    const updates = await c.req.json();
    
    // ✅ DATABASE-FIRST FIX: Update public.users table FIRST (primary storage)
    const { data: updatedProfile, error } = await supabase
      .from('users')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .select()
      .single();
    
    if (error) {
      console.log('⚠️ Failed to update profile in database, trying KV fallback:', error.message);
      
      // Fallback to KV store for backward compatibility
      const existingProfile = await kv.get(`user:${userId}:profile`);
      if (!existingProfile) {
        return c.json({ error: 'Profile not found' }, 404);
      }
      
      const fallbackProfile = {
        ...existingProfile,
        ...updates,
        updated_at: new Date().toISOString()
      };
      
      await kv.set(`user:${userId}:profile`, fallbackProfile);
      
      console.log('📦 Profile updated in KV store (fallback mode)');
      return c.json({ 
        success: true,
        profile: fallbackProfile
      });
    }
    
    console.log('✅ Profile updated in database:', {
      id: userId.substring(0, 8) + '...',
      onboarding_completed: updatedProfile.onboarding_completed,
      first_name: updatedProfile.first_name || 'NOT SET'
    });
    
    // ✅ THEN update KV store cache (secondary storage)
    await kv.set(`user:${userId}:profile`, updatedProfile);
    
    return c.json({ 
      success: true,
      profile: updatedProfile
    });
    
  } catch (error) {
    console.log('❌ Update profile error:', error);
    return c.json({ error: 'Failed to update profile' }, 500);
  }
});

// ==================== FAMILY DATA ROUTES ====================

// Get family data
app.get("/make-server-48a3bd07/families/:familyId", async (c) => {
  const user = await verifyUser(c);
  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  
  try {
    const familyId = c.req.param('familyId');
    const familyData = await kv.get(`family:${familyId}:data`);
    
    if (!familyData) {
      return c.json({ error: 'Family not found' }, 404);
    }
    
    // Verify user is member of this family
    const userProfile = await kv.get(`user:${user.id}:profile`);
    if (!userProfile || userProfile.family_id !== familyId) {
      return c.json({ error: 'Access denied' }, 403);
    }
    
    console.log('✅ Retrieved family data:', familyId);
    return c.json({ family: familyData });
    
  } catch (error) {
    console.log('❌ Get family error:', error);
    return c.json({ error: 'Failed to retrieve family' }, 500);
  }
});

// ==================== FAMILY TREE ROUTES ====================

// Get family tree
app.get("/make-server-48a3bd07/families/:familyId/tree", async (c) => {
  const user = await verifyUser(c);
  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  
  try {
    const familyId = c.req.param('familyId');
    
    // Verify user is member of this family
    const userProfile = await kv.get(`user:${user.id}:profile`);
    if (!userProfile || userProfile.family_id !== familyId) {
      return c.json({ error: 'Access denied' }, 403);
    }
    
    // ✅ DATABASE-FIRST FIX: Read from database (primary storage)
    console.log('💾 Loading family tree from DATABASE (primary storage)...');
    
    // Get family members from database
    const { data: people, error: peopleError } = await supabase
      .from('family_members')
      .select('*')
      .eq('family_id', familyId);
    
    // Get relationships from database
    const { data: relationships, error: relsError } = await supabase
      .from('family_relationships')
      .select('*')
      .eq('family_id', familyId);
    
    if (peopleError) {
      console.warn('⚠️ Failed to load people from database, trying KV fallback:', peopleError.message);
      const kvTree = await kv.get(`family:${familyId}:tree`) || [];
      console.log('📦 Using KV store fallback:', Array.isArray(kvTree) ? kvTree.length : 0, 'members');
      return c.json({ tree: kvTree, from_database: false });
    }
    
    console.log(`✅ Loaded ${people?.length || 0} people from database`);
    console.log(`✅ Loaded ${relationships?.length || 0} relationships from database`);
    
    // Convert database format to app format
    const peopleMap = {};
    (people || []).forEach((person: any) => {
      peopleMap[person.id] = {
        id: person.id,
        firstName: person.first_name,
        lastName: person.last_name,
        name: person.name,
        gender: person.gender,
        dateOfBirth: person.date_of_birth,
        dateOfDeath: person.date_of_death,
        status: person.status,
        generation: person.generation,
        profilePhotoUrl: person.profile_photo_url,
        gridSlot: person.grid_slot,
        position: person.position_x && person.position_y ? {
          x: person.position_x,
          y: person.position_y
        } : null,
        isRoot: person.is_root,
        created_at: person.created_at,
        updated_at: person.updated_at
      };
    });
    
    // Convert relationships
    const relationshipsArray = (relationships || []).map((rel: any) => ({
      person1: rel.person_id,
      person2: rel.related_person_id,
      type: rel.relationship_type,
      created_at: rel.created_at,
      updated_at: rel.updated_at
    }));
    
    const tree = {
      people: peopleMap,
      relationships: relationshipsArray
    };
    
    // Cache in KV store for fast access
    await kv.set(`family:${familyId}:tree`, tree);
    
    console.log('✅ Retrieved family tree from database:', familyId, people?.length || 0, 'members');
    return c.json({ tree, from_database: true });
    
  } catch (error) {
    console.log('❌ Get family tree error:', error);
    return c.json({ error: 'Failed to retrieve family tree' }, 500);
  }
});

// Save/Update family tree
app.post("/make-server-48a3bd07/families/:familyId/tree", async (c) => {
  const user = await verifyUser(c);
  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  
  try {
    const familyId = c.req.param('familyId');
    const { tree } = await c.req.json();
    
    // Verify user is member of this family
    const userProfile = await kv.get(`user:${user.id}:profile`);
    if (!userProfile || userProfile.family_id !== familyId) {
      return c.json({ error: 'Access denied' }, 403);
    }
    
    // ✅ DATABASE-FIRST FIX: Save to database FIRST (primary storage)
    console.log('💾 Saving family tree to DATABASE (primary storage)...');
    console.log(`   Family: ${familyId}`);
    console.log(`   Members: ${Array.isArray(tree) ? tree.length : 0}`);
    
    // Parse tree data structure
    const peopleArray = Array.isArray(tree) 
      ? tree 
      : (tree?.people ? Object.values(tree.people) : []);
    
    const relationshipsArray = Array.isArray(tree)
      ? [] // Old format has no relationships array
      : (tree?.relationships || []);
    
    console.log(`   Parsed: ${peopleArray.length} people, ${relationshipsArray.length} relationships`);
    
    // Save each person to family_members table
    for (const person of peopleArray) {
      const { data: existingMember } = await supabase
        .from('family_members')
        .select('id')
        .eq('id', person.id)
        .eq('family_id', familyId)
        .single();
      
      const memberData = {
        id: person.id,
        family_id: familyId,
        first_name: person.firstName || person.name?.split(' ')[0] || '',
        last_name: person.lastName || person.name?.split(' ').slice(1).join(' ') || '',
        name: person.name || `${person.firstName || ''} ${person.lastName || ''}`.trim(),
        gender: person.gender || null,
        date_of_birth: person.dateOfBirth || person.date_of_birth || null,
        date_of_death: person.dateOfDeath || person.date_of_death || null,
        status: person.status || 'Living',
        generation: person.generation ?? 0,
        profile_photo_url: person.profilePhotoUrl || person.profile_photo_url || null,
        grid_slot: person.gridSlot ?? null,
        position_x: person.position?.x ?? null,
        position_y: person.position?.y ?? null,
        is_root: person.isRoot || false,
        created_at: person.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      if (existingMember) {
        // Update existing member
        await supabase
          .from('family_members')
          .update(memberData)
          .eq('id', person.id)
          .eq('family_id', familyId);
      } else {
        // Insert new member
        await supabase
          .from('family_members')
          .insert(memberData);
      }
    }
    
    console.log(`✅ Saved ${peopleArray.length} people to database`);
    
    // Save relationships to family_relationships table
    if (relationshipsArray.length > 0) {
      // Delete old relationships for this family
      await supabase
        .from('family_relationships')
        .delete()
        .eq('family_id', familyId);
      
      // Insert new relationships
      const relationshipData = relationshipsArray.map((rel: any) => ({
        family_id: familyId,
        person_id: rel.person1 || rel.personId,
        related_person_id: rel.person2 || rel.relatedPersonId,
        relationship_type: rel.type || rel.relationshipType,
        created_at: rel.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString()
      }));
      
      if (relationshipData.length > 0) {
        await supabase
          .from('family_relationships')
          .insert(relationshipData);
        
        console.log(`✅ Saved ${relationshipData.length} relationships to database`);
      }
    }
    
    // ✅ THEN cache in KV store (secondary storage)
    await kv.set(`family:${familyId}:tree`, tree);
    console.log('✅ Cached tree in KV store');
    
    // 📊 CRITICAL: Update family_members_count in user_activity
    try {
      const { data: existingActivity } = await supabase
        .from('user_activity')
        .select('*')
        .eq('user_id', user.id)
        .single();
      
      const familyMembersCount = peopleArray.length;
      
      if (existingActivity) {
        await supabase
          .from('user_activity')
          .update({
            family_members_count: familyMembersCount,
            last_active_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('user_id', user.id);
        
        console.log('📊 Updated family_members_count:', familyMembersCount);
      } else {
        // Create new user_activity record
        await supabase
          .from('user_activity')
          .insert({
            user_id: user.id,
            email: user.email,
            family_members_count: familyMembersCount,
            memories_count: 0,
            journal_entries_count: 0,
            time_capsules_count: 0,
            is_activated: false,
            last_active_at: new Date().toISOString(),
            first_login_at: new Date().toISOString(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
        
        console.log('📊 Created user_activity with family_members_count:', familyMembersCount);
      }
    } catch (metricsError) {
      console.warn('⚠️ Failed to update family metrics (non-critical):', metricsError);
    }
    
    console.log('✅ DATABASE-FIRST: Family tree saved to database:', familyId, peopleArray.length, 'members');
    return c.json({ 
      success: true,
      message: 'Family tree saved successfully',
      saved_to_database: true,
      people_count: peopleArray.length,
      relationships_count: relationshipsArray.length
    });
    
  } catch (error) {
    console.log('❌ Save family tree error:', error);
    return c.json({ error: 'Failed to save family tree', details: error.message }, 500);
  }
});

// ==================== MEMORIES ROUTES ====================

// Get family memories
app.get("/make-server-48a3bd07/families/:familyId/memories", async (c) => {
  const user = await verifyUser(c);
  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  
  try {
    const familyId = c.req.param('familyId');
    
    // Verify user is member of this family
    const userProfile = await kv.get(`user:${user.id}:profile`);
    if (!userProfile || userProfile.family_id !== familyId) {
      return c.json({ error: 'Access denied' }, 403);
    }
    
    const memories = await kv.get(`family:${familyId}:memories`) || [];
    
    console.log('✅ Retrieved memories:', familyId, memories.length, 'items');
    return c.json({ memories });
    
  } catch (error) {
    console.log('❌ Get memories error:', error);
    return c.json({ error: 'Failed to retrieve memories' }, 500);
  }
});

// Add memory
app.post("/make-server-48a3bd07/families/:familyId/memories", async (c) => {
  const user = await verifyUser(c);
  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  
  try {
    const familyId = c.req.param('familyId');
    const memoryData = await c.req.json();
    
    // Verify user is member of this family
    const userProfile = await kv.get(`user:${user.id}:profile`);
    if (!userProfile || userProfile.family_id !== familyId) {
      return c.json({ error: 'Access denied' }, 403);
    }
    
    const memories = await kv.get(`family:${familyId}:memories`) || [];
    
    const newMemory = {
      id: `memory_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`,
      ...memoryData,
      created_by: user.id,
      family_id: familyId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    memories.push(newMemory);
    await kv.set(`family:${familyId}:memories`, memories);
    
    // 📊 CRITICAL: Update user_activity metrics when memory is added
    try {
      // Check if user_activity record exists
      const { data: existingActivity } = await supabase
        .from('user_activity')
        .select('*')
        .eq('user_id', user.id)
        .single();
      
      if (existingActivity) {
        // Increment memories_count
        await supabase
          .from('user_activity')
          .update({
            memories_count: (existingActivity.memories_count || 0) + 1,
            is_activated: true, // User is activated after first memory
            last_active_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('user_id', user.id);
        
        console.log('📊 Updated user_activity metrics for:', user.id);
      } else {
        // Create new user_activity record
        await supabase
          .from('user_activity')
          .insert({
            user_id: user.id,
            email: user.email,
            memories_count: 1,
            is_activated: true,
            family_members_count: 0,
            journal_entries_count: 0,
            time_capsules_count: 0,
            last_active_at: new Date().toISOString(),
            first_login_at: new Date().toISOString(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
        
        console.log('📊 Created user_activity record for:', user.id);
      }
    } catch (metricsError) {
      console.warn('⚠️ Failed to update metrics (non-critical):', metricsError);
      // Don't fail the memory upload if metrics update fails
    }
    
    console.log('✅ Added memory:', newMemory.id);
    return c.json({ 
      success: true,
      memory: newMemory
    });
    
  } catch (error) {
    console.log('❌ Add memory error:', error);
    return c.json({ error: 'Failed to add memory' }, 500);
  }
});

// Delete memory
app.delete("/make-server-48a3bd07/families/:familyId/memories/:memoryId", async (c) => {
  const user = await verifyUser(c);
  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  
  try {
    const familyId = c.req.param('familyId');
    const memoryId = c.req.param('memoryId');
    
    // Verify user is member of this family
    const userProfile = await kv.get(`user:${user.id}:profile`);
    if (!userProfile || userProfile.family_id !== familyId) {
      return c.json({ error: 'Access denied' }, 403);
    }
    
    const memories = await kv.get(`family:${familyId}:memories`) || [];
    const updatedMemories = memories.filter((m: any) => m.id !== memoryId);
    
    await kv.set(`family:${familyId}:memories`, updatedMemories);
    
    // 📊 CRITICAL: Update user_activity metrics when memory is deleted
    try {
      const { data: existingActivity } = await supabase
        .from('user_activity')
        .select('*')
        .eq('user_id', user.id)
        .single();
      
      if (existingActivity && existingActivity.memories_count > 0) {
        await supabase
          .from('user_activity')
          .update({
            memories_count: existingActivity.memories_count - 1,
            is_activated: (existingActivity.memories_count - 1) > 0, // Deactivate if no memories left
            last_active_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('user_id', user.id);
        
        console.log('📊 Decremented memories_count for:', user.id);
      }
    } catch (metricsError) {
      console.warn('⚠️ Failed to update metrics (non-critical):', metricsError);
    }
    
    console.log('✅ Deleted memory:', memoryId);
    return c.json({ 
      success: true,
      message: 'Memory deleted successfully'
    });
    
  } catch (error) {
    console.log('❌ Delete memory error:', error);
    return c.json({ error: 'Failed to delete memory' }, 500);
  }
});

// ==================== JOURNAL ROUTES ====================

// Get user journals
app.get("/make-server-48a3bd07/users/:userId/journals", async (c) => {
  const user = await verifyUser(c);
  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  
  try {
    const userId = c.req.param('userId');
    
    if (user.id !== userId) {
      return c.json({ error: 'Access denied' }, 403);
    }
    
    const journals = await kv.get(`user:${userId}:journals`) || [];
    
    console.log('✅ Retrieved journals:', userId, journals.length, 'entries');
    return c.json({ journals });
    
  } catch (error) {
    console.log('❌ Get journals error:', error);
    return c.json({ error: 'Failed to retrieve journals' }, 500);
  }
});

// Save journals
app.post("/make-server-48a3bd07/users/:userId/journals", async (c) => {
  const user = await verifyUser(c);
  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  
  try {
    const userId = c.req.param('userId');
    
    if (user.id !== userId) {
      return c.json({ error: 'Access denied' }, 403);
    }
    
    const { journals } = await c.req.json();
    
    await kv.set(`user:${userId}:journals`, journals);
    
    // 📊 CRITICAL: Update journal_entries_count in user_activity
    try {
      const { data: existingActivity } = await supabase
        .from('user_activity')
        .select('*')
        .eq('user_id', user.id)
        .single();
      
      const journalCount = Array.isArray(journals) ? journals.length : 0;
      
      if (existingActivity) {
        await supabase
          .from('user_activity')
          .update({
            journal_entries_count: journalCount,
            last_active_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('user_id', user.id);
        
        console.log('📊 Updated journal_entries_count:', journalCount);
      } else {
        // Create new user_activity record
        await supabase
          .from('user_activity')
          .insert({
            user_id: user.id,
            email: user.email,
            journal_entries_count: journalCount,
            memories_count: 0,
            family_members_count: 0,
            time_capsules_count: 0,
            is_activated: false,
            last_active_at: new Date().toISOString(),
            first_login_at: new Date().toISOString(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
        
        console.log('📊 Created user_activity with journal_entries_count:', journalCount);
      }
    } catch (metricsError) {
      console.warn('⚠️ Failed to update journal metrics (non-critical):', metricsError);
    }
    
    console.log('✅ Saved journals:', userId, journals.length, 'entries');
    return c.json({ 
      success: true,
      message: 'Journals saved successfully'
    });
    
  } catch (error) {
    console.log('❌ Save journals error:', error);
    return c.json({ error: 'Failed to save journals' }, 500);
  }
});

// ==================== JOURNEY ROUTES ====================

// Get journey progress
app.get("/make-server-48a3bd07/users/:userId/journeys/:journeyType", async (c) => {
  const user = await verifyUser(c);
  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  
  try {
    const userId = c.req.param('userId');
    const journeyType = c.req.param('journeyType');
    
    if (user.id !== userId) {
      return c.json({ error: 'Access denied' }, 403);
    }
    
    const progress = await kv.get(`user:${userId}:journey:${journeyType}`) || {};
    
    console.log('✅ Retrieved journey progress:', userId, journeyType);
    return c.json({ progress });
    
  } catch (error) {
    console.log('❌ Get journey error:', error);
    return c.json({ error: 'Failed to retrieve journey progress' }, 500);
  }
});

// Save journey progress
app.post("/make-server-48a3bd07/users/:userId/journeys/:journeyType", async (c) => {
  const user = await verifyUser(c);
  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  
  try {
    const userId = c.req.param('userId');
    const journeyType = c.req.param('journeyType');
    
    if (user.id !== userId) {
      return c.json({ error: 'Access denied' }, 403);
    }
    
    const { progress } = await c.req.json();
    
    await kv.set(`user:${userId}:journey:${journeyType}`, progress);
    
    console.log('✅ Saved journey progress:', userId, journeyType);
    return c.json({ 
      success: true,
      message: 'Journey progress saved successfully'
    });
    
  } catch (error) {
    console.log('❌ Save journey error:', error);
    return c.json({ error: 'Failed to save journey progress' }, 500);
  }
});

// ==================== TIME CAPSULES ROUTES ====================

// Get time capsules
app.get("/make-server-48a3bd07/families/:familyId/capsules", async (c) => {
  const user = await verifyUser(c);
  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  
  try {
    const familyId = c.req.param('familyId');
    
    // Verify user is member of this family
    const userProfile = await kv.get(`user:${user.id}:profile`);
    if (!userProfile || userProfile.family_id !== familyId) {
      return c.json({ error: 'Access denied' }, 403);
    }
    
    const capsules = await kv.get(`family:${familyId}:capsules`) || [];
    
    console.log('✅ Retrieved time capsules:', familyId, capsules.length, 'items');
    return c.json({ capsules });
    
  } catch (error) {
    console.log('❌ Get capsules error:', error);
    return c.json({ error: 'Failed to retrieve time capsules' }, 500);
  }
});

// Save time capsules
app.post("/make-server-48a3bd07/families/:familyId/capsules", async (c) => {
  const user = await verifyUser(c);
  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  
  try {
    const familyId = c.req.param('familyId');
    
    // Verify user is member of this family
    const userProfile = await kv.get(`user:${user.id}:profile`);
    if (!userProfile || userProfile.family_id !== familyId) {
      return c.json({ error: 'Access denied' }, 403);
    }
    
    const { capsules } = await c.req.json();
    
    await kv.set(`family:${familyId}:capsules`, capsules);
    
    // 📊 CRITICAL: Update time_capsules_count in user_activity
    try {
      const { data: existingActivity } = await supabase
        .from('user_activity')
        .select('*')
        .eq('user_id', user.id)
        .single();
      
      const capsulesCount = Array.isArray(capsules) ? capsules.length : 0;
      
      if (existingActivity) {
        await supabase
          .from('user_activity')
          .update({
            time_capsules_count: capsulesCount,
            last_active_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('user_id', user.id);
        
        console.log('📊 Updated time_capsules_count:', capsulesCount);
      } else {
        // Create new user_activity record
        await supabase
          .from('user_activity')
          .insert({
            user_id: user.id,
            email: user.email,
            time_capsules_count: capsulesCount,
            memories_count: 0,
            family_members_count: 0,
            journal_entries_count: 0,
            is_activated: false,
            last_active_at: new Date().toISOString(),
            first_login_at: new Date().toISOString(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
        
        console.log('📊 Created user_activity with time_capsules_count:', capsulesCount);
      }
    } catch (metricsError) {
      console.warn('⚠️ Failed to update capsule metrics (non-critical):', metricsError);
    }
    
    console.log('✅ Saved time capsules:', familyId, capsules.length, 'items');
    return c.json({ 
      success: true,
      message: 'Time capsules saved successfully'
    });
    
  } catch (error) {
    console.log('❌ Save capsules error:', error);
    return c.json({ error: 'Failed to save time capsules' }, 500);
  }
});

// ==================== MVP VALIDATION METRICS ROUTES ====================

// Get Supabase storage usage metrics
app.get("/make-server-78eb8d05/metrics/storage", async (c) => {
  try {
    console.log('📊 Calculating storage metrics...');
    
    // Get all files from both buckets
    const profileBucket = 'make-2544f7d4-profile-photos';
    const memoryBucket = 'make-2544f7d4-memory-files';
    
    let totalBytes = 0;
    let fileCount = 0;
    
    // Calculate profile photos storage
    try {
      const { data: profileFiles, error: profileError } = await supabase
        .storage
        .from(profileBucket)
        .list('', {
          limit: 1000,
          sortBy: { column: 'created_at', order: 'desc' }
        });
      
      if (!profileError && profileFiles) {
        profileFiles.forEach(file => {
          if (file.metadata && file.metadata.size) {
            totalBytes += file.metadata.size;
            fileCount++;
          }
        });
        console.log(`✅ Profile photos: ${profileFiles.length} files`);
      } else if (profileError) {
        console.warn(`⚠️ Could not list profile photos: ${profileError.message}`);
      }
    } catch (error) {
      console.warn('⚠️ Error listing profile photos:', error);
    }
    
    // Calculate memory files storage
    try {
      const { data: memoryFiles, error: memoryError } = await supabase
        .storage
        .from(memoryBucket)
        .list('', {
          limit: 1000,
          sortBy: { column: 'created_at', order: 'desc' }
        });
      
      if (!memoryError && memoryFiles) {
        memoryFiles.forEach(file => {
          if (file.metadata && file.metadata.size) {
            totalBytes += file.metadata.size;
            fileCount++;
          }
        });
        console.log(`✅ Memory files: ${memoryFiles.length} files`);
      } else if (memoryError) {
        console.warn(`⚠️ Could not list memory files: ${memoryError.message}`);
      }
    } catch (error) {
      console.warn('⚠️ Error listing memory files:', error);
    }
    
    // Convert to GB (free tier = 1 GB)
    const usedGB = totalBytes / (1024 * 1024 * 1024);
    const totalGB = 1; // Supabase free tier
    const remainingGB = Math.max(0, totalGB - usedGB);
    const usagePercentage = Math.min(100, (usedGB / totalGB) * 100);
    
    const metrics = {
      used_gb: parseFloat(usedGB.toFixed(3)),
      total_gb: totalGB,
      remaining_gb: parseFloat(remainingGB.toFixed(3)),
      usage_percentage: parseFloat(usagePercentage.toFixed(1)),
      file_count: fileCount
    };
    
    console.log('✅ Storage metrics:', metrics);
    return c.json({ storage: metrics });
    
  } catch (error) {
    console.error('❌ Error calculating storage metrics:', error);
    return c.json({ 
      error: 'Failed to calculate storage metrics',
      storage: {
        used_gb: 0,
        total_gb: 1,
        remaining_gb: 1,
        usage_percentage: 0,
        file_count: 0
      }
    }, 500);
  }
});

// Initialize user activity tracking
app.post("/make-server-78eb8d05/metrics/init-user", async (c) => {
  try {
    const { user_id, email, batch_no } = await c.req.json();
    
    console.log('📊 Initializing user activity:', { user_id, email, batch_no });
    
    // Insert or update user activity
    const { data, error } = await supabase
      .from('user_activity')
      .upsert({
        user_id: user_id,
        email: email,
        batch_no: batch_no || 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id'
      });
    
    if (error) {
      console.error('❌ Error initializing user activity:', error);
      return c.json({ error: error.message }, 500);
    }
    
    console.log('✅ User activity initialized');
    return c.json({ success: true });
    
  } catch (error) {
    console.error('❌ Init user error:', error);
    return c.json({ error: 'Failed to initialize user activity' }, 500);
  }
});

// Update user activity
app.post("/make-server-78eb8d05/metrics/update-activity", async (c) => {
  try {
    const { user_id, memories_count, family_members_count, journal_entries_count, time_capsules_count } = await c.req.json();
    
    console.log('📊 Updating user activity:', { user_id });
    
    // Get current values
    const { data: currentData } = await supabase
      .from('user_activity')
      .select('*')
      .eq('user_id', user_id)
      .single();
    
    // Increment counts
    const updates: any = {
      last_active_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    if (memories_count) {
      updates.memories_count = (currentData?.memories_count || 0) + memories_count;
      updates.is_activated = true;
    }
    if (family_members_count) {
      updates.family_members_count = (currentData?.family_members_count || 0) + family_members_count;
    }
    if (journal_entries_count) {
      updates.journal_entries_count = (currentData?.journal_entries_count || 0) + journal_entries_count;
    }
    if (time_capsules_count) {
      updates.time_capsules_count = (currentData?.time_capsules_count || 0) + time_capsules_count;
    }
    
    const { error } = await supabase
      .from('user_activity')
      .update(updates)
      .eq('user_id', user_id);
    
    if (error) {
      console.error('❌ Error updating user activity:', error);
      return c.json({ error: error.message }, 500);
    }
    
    console.log('✅ User activity updated');
    return c.json({ success: true });
    
  } catch (error) {
    console.error('❌ Update activity error:', error);
    return c.json({ error: 'Failed to update activity' }, 500);
  }
});

// Get all user metrics (admin only)
app.get("/make-server-78eb8d05/metrics/all-users", async (c) => {
  try {
    console.log('📊 Fetching all user metrics...');
    
    // Call the database function
    const { data, error } = await supabase
      .rpc('get_all_user_metrics');
    
    if (error) {
      console.error('❌ Error fetching user metrics:', error);
      return c.json({ error: error.message, metrics: [] }, 500);
    }
    
    // Add created_at field for each user
    const metricsWithDates = data.map((user: any) => ({
      ...user,
      created_at: new Date(Date.now() - user.days_since_signup * 24 * 60 * 60 * 1000).toISOString()
    }));
    
    console.log(`✅ Fetched ${data?.length || 0} user metrics`);
    return c.json({ metrics: metricsWithDates || [] });
    
  } catch (error) {
    console.error('❌ Get all users error:', error);
    return c.json({ error: 'Failed to fetch user metrics', metrics: [] }, 500);
  }
});

// Get aggregated metrics (admin only)
app.get("/make-server-78eb8d05/metrics/aggregated", async (c) => {
  try {
    console.log('📊 Fetching aggregated metrics...');
    
    // Call the database function
    const { data, error } = await supabase
      .rpc('get_aggregated_metrics');
    
    if (error) {
      console.error('❌ Error fetching aggregated metrics:', error);
      return c.json({ 
        error: error.message,
        metrics: {
          total_users: 0,
          activated_users: 0,
          activation_rate: 0,
          avg_memories_per_user: 0,
          total_memories: 0,
          recommend_yes: 0,
          total_feedback: 0,
          recommend_percentage: 0,
          avg_emotional_score: 0
        }
      }, 500);
    }
    
    const metrics = data && data.length > 0 ? data[0] : {
      total_users: 0,
      activated_users: 0,
      activation_rate: 0,
      avg_memories_per_user: 0,
      total_memories: 0,
      recommend_yes: 0,
      total_feedback: 0,
      recommend_percentage: 0,
      avg_emotional_score: 0
    };
    
    console.log('✅ Aggregated metrics:', metrics);
    return c.json({ metrics });
    
  } catch (error) {
    console.error('❌ Get aggregated metrics error:', error);
    return c.json({ 
      error: 'Failed to fetch aggregated metrics',
      metrics: {
        total_users: 0,
        activated_users: 0,
        activation_rate: 0,
        avg_memories_per_user: 0,
        total_memories: 0,
        recommend_yes: 0,
        total_feedback: 0,
        recommend_percentage: 0,
        avg_emotional_score: 0
      }
    }, 500);
  }
});

// Get all feedback (admin only)
app.get("/make-server-78eb8d05/metrics/all-feedback", async (c) => {
  try {
    console.log('📊 Fetching all feedback...');
    
    const { data, error } = await supabase
      .from('feedback')
      .select('*')
      .order('submitted_at', { ascending: false });
    
    if (error) {
      console.error('❌ Error fetching feedback:', error);
      return c.json({ error: error.message, feedback: [] }, 500);
    }
    
    console.log(`✅ Fetched ${data?.length || 0} feedback entries`);
    return c.json({ feedback: data || [] });
    
  } catch (error) {
    console.error('❌ Get feedback error:', error);
    return c.json({ error: 'Failed to fetch feedback', feedback: [] }, 500);
  }
});

// ==================== HEALTH CHECK ====================

app.get("/make-server-48a3bd07/health", (c) => {
  return c.json({ 
    status: "ok",
    service: "MemoryBox API",
    timestamp: new Date().toISOString(),
    environment: {
      hasSupabaseUrl: !!supabaseUrl,
      hasServiceKey: !!supabaseServiceKey,
      hasAnonKey: !!supabaseAnonKey,
      supabaseUrlLength: supabaseUrl.length,
      serviceKeyLength: supabaseServiceKey.length
    }
  });
});

Deno.serve(app.fetch);
