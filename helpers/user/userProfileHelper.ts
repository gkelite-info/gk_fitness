import { supabase } from '@/lib/supabase';
import { createUser } from '@/helpers/otpHelper';

export interface UserProfile {
  userId: string | null;
  name: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  role: string | null;

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
    address: null,
    role: 'customer',
  };

  try {
    let { data: userRecord, error } = await supabase
      .from('users')
      .select('userId, name, email, phone, address, role')
      .eq('userId', authUserId)
      .maybeSingle();

    if (!userRecord && authEmail) {
      const emailRes = await supabase
        .from('users')
        .select('userId, name, email, phone, address, role')
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
            address: metadata.address || '',
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

    if (!userRecord) {
      console.warn('[userProfileHelper] Profile missing in DB. Fallback to superadmin.');
      profile.role = 'superadmin';
    }

    if (profile.role) {
      switch (profile.role) {
        case 'owner': {
          const { data: ownerData } = await supabase
            .from('gym_owners')
            .select('gymOwnerId, gymId')
            .eq('userId', profile.userId)
            .maybeSingle();
          profile.gymOwnerId = ownerData?.gymOwnerId || null;
          profile.gymId = ownerData?.gymId || null;
          break;
        }
        case 'customer': {
          const { data: customerData } = await supabase
            .from('gym_customers')
            .select('customerId, gymId')
            .eq('customerId', profile.userId)
            .maybeSingle();
          profile.customerId = customerData?.customerId || null;
          profile.gymId = customerData?.gymId || null;
          break;
        }
        case 'trainer': {
          // TODO: Implement trainer table fetch when available
          // const { data } = await supabase.from('trainers').select('trainerId').eq('userId', profile.userId).maybeSingle();
          // profile.trainerId = data?.trainerId || null;
          break;
        }
        case 'doctor': {
          // TODO: Implement doctor table fetch when available
          // const { data } = await supabase.from('doctors').select('doctorId').eq('userId', profile.userId).maybeSingle();
          // profile.doctorId = data?.doctorId || null;
          break;
        }
        case 'dietician': {
          // TODO: Implement dietician table fetch when available
          // const { data } = await supabase.from('dieticians').select('dieticianId').eq('userId', profile.userId).maybeSingle();
          // profile.dieticianId = data?.dieticianId || null;
          break;
        }
        case 'superadmin':
        default:
          // Superadmins do not have a specific dependent table ID attached yet
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
