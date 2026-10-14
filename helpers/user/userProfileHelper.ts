import { supabase } from '@/lib/supabase';
import { createUser } from '@/helpers/otpHelper';
import * as Crypto from 'expo-crypto';

export interface UserProfile {
  userId: string | null;
  name: string | null;
  email: string | null;
  phone: string | null;
  gender?: string | null;
  address: string | null;
  country?: string | null;
  state?: string | null;
  city?: string | null;
  pincode?: number | null;
  role: string | null;
  profilePhoto?: string | null;

  // Role-specific IDs
  gymOwnerId?: string | null;
  gymId?: string | null;
  customerId?: string | null;
  trainerId?: string | null;
  doctorId?: string | null;
  dieticianId?: string | null;

  isGymSuspended?: boolean;
}

export async function fetchUserAndRoleProfile(
  authUserId: string,
  authEmail: string | null
): Promise<UserProfile> {
  const defaultProfile: UserProfile = {
    userId: authUserId,
    name: 'User',
    email: authEmail,
    phone: null,
    gender: null,
    address: null,
    role: 'customer',
  };

  try {
    let { data: userRecord, error } = await supabase
      .from('users')
      .select('userId, name, email, phone, gender, address, country, state, city, pincode, role, profilePhoto')
      .eq('userId', authUserId)
      .maybeSingle();

    if (!userRecord && authEmail) {
      const emailRes = await supabase
        .from('users')
        .select('userId, name, email, phone, gender, address, country, state, city, pincode, role, profilePhoto')
        .eq('email', authEmail)
        .maybeSingle();
      userRecord = emailRes.data;
    }

    if (!userRecord && authUserId) {
      const { data: { session } } = await supabase.auth.getSession();
      const authUser = session?.user;

      if (authUser && authUser.id === authUserId) {
        const metadata = authUser.user_metadata || {};
        try {
          const createdProfile = await createUser({
            userId: authUserId,
            name: metadata.name || 'User',
            email: authUser.email || authEmail || '',
            phone: metadata.phone || '',
            gender: metadata.gender || 'male',
            address: metadata.address || '',
            country: metadata.country || null,
            state: metadata.state || null,
            city: metadata.city || null,
            pincode: metadata.pincode || null,
            role: metadata.role || 'customer',
          });

          if (createdProfile) {
            userRecord = createdProfile;
          }
        } catch (createError) {
          console.error('[userProfileHelper] Auto-creation failed:', createError);
        }
      }
    }

    const profile: UserProfile = {
      ...defaultProfile,
      ...userRecord,
    };

    if (userRecord && userRecord.userId) {
      try {
        // Auto-create community profile if missing
        const { data: commProfile } = await supabase
          .from('gym_community_profiles')
          .select('gymCommunityProfileId')
          .eq('userId', userRecord.userId)
          .maybeSingle();

        if (!commProfile) {
          const baseUsername = (userRecord.name || 'user').toLowerCase().replace(/[^a-z0-9._]/g, '');
          const randomSuffix = Math.floor(1000 + Math.random() * 9000);
          const username = `${baseUsername.slice(0, 20)}_${randomSuffix}`;

          await supabase.from('gym_community_profiles').insert({
            gymCommunityProfileId: Crypto.randomUUID(),
            userId: userRecord.userId,
            username,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          });
        }
      } catch (commErr) {
        console.error('[userProfileHelper] Non-fatal error creating community profile:', commErr);
      }
    }

    if (!userRecord) {
      console.warn('[userProfileHelper] Profile missing in DB. Fallback to superadmin.');
      profile.role = 'superadmin';
    }

    if (profile.role) {
      const normalizedRole = (profile.role || '').trim().toLowerCase().replace(/[\s_-]/g, '');
      switch (normalizedRole) {
        case 'owner': {
          let ownerData: { gymOwnerId?: string | null; gymId: string } | null = null;
          if (profile.userId) {
            const { data } = await supabase
              .from('gym_owners')
              .select('gymOwnerId, gymId')
              .eq('userId', profile.userId)
              .eq('is_deleted', false)
              .maybeSingle();
            ownerData = data;
          }
          if (!ownerData?.gymId && profile.email) {
            const { data } = await supabase
              .from('gym_owners')
              .select('gymOwnerId, gymId')
              .ilike('ownerEmail', profile.email.trim())
              .eq('is_deleted', false)
              .maybeSingle();
            ownerData = data;
          }
          if (!ownerData?.gymId && profile.userId) {
            const { data } = await supabase
              .from('gym_owners')
              .select('gymOwnerId, gymId')
              .eq('createdBy', profile.userId)
              .eq('is_deleted', false)
              .maybeSingle();
            ownerData = data;
          }
          if (!ownerData?.gymId && profile.userId) {
            const { data: gymRec } = await supabase
              .from('gyms')
              .select('gymId')
              .eq('createdBy', profile.userId)
              .eq('is_deleted', false)
              .maybeSingle();
            if (gymRec?.gymId) {
              ownerData = { gymOwnerId: null, gymId: gymRec.gymId };
            }
          }
          profile.gymOwnerId = ownerData?.gymOwnerId || null;
          profile.gymId = ownerData?.gymId || null;
          break;
        }
        case 'customer': {
          let customerData: { customerId?: string | null; gymId: string } | null = null;
          if (profile.userId) {
            const { data } = await supabase
              .from('gym_customers')
              .select('customerId, gymId')
              .eq('userId', profile.userId)
              .eq('is_deleted', false)
              .maybeSingle();
            customerData = data;
          }
          if (!customerData?.gymId && profile.userId) {
            const { data } = await supabase
              .from('gym_customers')
              .select('customerId, gymId')
              .eq('customerId', profile.userId)
              .eq('is_deleted', false)
              .maybeSingle();
            customerData = data;
          }
          if (!customerData?.gymId && profile.email) {
            const { data } = await supabase
              .from('gym_customers')
              .select('customerId, gymId')
              .ilike('email', profile.email.trim())
              .eq('is_deleted', false)
              .maybeSingle();
            customerData = data;
          }
          profile.customerId = customerData?.customerId || null;
          profile.gymId = customerData?.gymId || null;
          break;
        }
        case 'trainer': {
          let trainerData: { gymTrainerId?: string | null; gymId: string } | null = null;
          if (profile.userId) {
            const { data } = await supabase
              .from('gym_trainers')
              .select('gymTrainerId, gymId')
              .eq('userId', profile.userId)
              .eq('is_deleted', false)
              .maybeSingle();
            trainerData = data;
          }
          if (!trainerData?.gymId && profile.email) {
            const { data } = await supabase
              .from('gym_trainers')
              .select('gymTrainerId, gymId')
              .ilike('email', profile.email.trim())
              .eq('is_deleted', false)
              .maybeSingle();
            trainerData = data;
          }
          profile.trainerId = trainerData?.gymTrainerId || null;
          profile.gymId = trainerData?.gymId || null;
          break;
        }
        case 'doctor': {
          // TODO: Implement doctor table fetch when available
          break;
        }
        case 'dietician': {
          // TODO: Implement dietician table fetch when available
          break;
        }
        case 'superadmin':
        case 'globaltrainer':
        case 'individual':
        default:
          // Global/superadmin roles do not have a gymId
          break;
      }
    }

    if (profile.gymId) {
      const { data: gymData } = await supabase.from('gyms').select('isActive').eq('gymId', profile.gymId).maybeSingle();
      if (gymData && gymData.isActive === false) {
        profile.role = null;
        profile.isGymSuspended = true;
      }
    }

    return profile;
  } catch (err) {
    console.error('[userProfileHelper] Failed to fetch user profile:', err);
    return {
      ...defaultProfile,
      role: 'superadmin',
    };
  }
}
