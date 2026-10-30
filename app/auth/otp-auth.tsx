import { assignInitialIndividualCustomerPlan } from '@/helpers/individual/membership/individualCustomerPlan';
import React, { useState } from 'react';
import {
  View,
  ScrollView,
  TextInput,
  Pressable,
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Text } from '@/components/nativewindui/Text';
import {
  EnvelopeSimple,
  Key,
  ArrowRight,
  Eye,
  EyeSlash,
  Barbell,
  ChartLine,
  Heart,
  CheckCircle,
  User,
  Building,
  CaretLeft,
  Info,
  WarningCircle,
} from 'phosphor-react-native';
import { supabase } from '@/lib/supabase';
import { navigateBasedOnRole, createUser, isAllowedForOwnerLogin } from '@/helpers/otpHelper';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { useUser } from '@/context/UserContext';
import { toast } from '@/lib/toast';
import { getSelectedGym, SelectedGym, clearSelectedGym, verifyUserGymMembership } from '@/helpers/tenantHelper';
import * as Crypto from 'expo-crypto';
import { fetchGymLeadByIdentifier } from '@/helpers/gymLeads/gymLeadsHelper';
import { fetchUserAndRoleProfile } from '@/helpers/user/userProfileHelper';
import { fetchGymById } from '@/helpers/gym/gymHelper';
import { fetchGlobalTrainerLeadByIdentifier } from '@/helpers/globalTrainerLeads/globalTrainerLeadsHelper';

export default function OtpAuthScreen() {
  const { role, loading: userLoading, refreshUserContext, isGymSuspended } = useUser();
  const router = useRouter();
  const params = useLocalSearchParams();
  const typeId = params.type as string;
  const [purpose, setPurpose] = useState<'login' | 'signup'>('login');
  const [loginMethod /* , setLoginMethod */] = useState<'email' | 'phone'>('email');

  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [password, setPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [authErrorMessage, setAuthErrorMessage] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  // const [phoneStep, setPhoneStep] = useState<'request' | 'verify'>('request');
  // const [otpCode, setOtpCode] = useState('');

  const [verifiedSuccess, setVerifiedSuccess] = useState(false);
  const [successTitle, setSuccessTitle] = useState('');
  const [successBody, setSuccessBody] = useState('');
  const [selectedGym, setSelectedGymState] = useState<SelectedGym | null>(null);

  const [showStatusModal, setShowStatusModal] = useState(false);
  const [statusIdentifier, setStatusIdentifier] = useState('');
  const [statusLoading, setStatusLoading] = useState(false);

  const isMounted = React.useRef(true);
  const hasNavigated = React.useRef(false);
  const isManualLoginRef = React.useRef(false);

  React.useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);
  React.useEffect(() => {
    const fetchGym = async () => {
      if (typeId === 'individual' || typeId === 'global_trainer' || typeId === 'owner') {
        await clearSelectedGym();
        if (isMounted.current) {
          setSelectedGymState(null);
        }
        return;
      }
      const gym = await getSelectedGym();
      if (isMounted.current) {
        setSelectedGymState(gym);
      }
    };
    fetchGym();
  }, [typeId]);

  React.useEffect(() => {
    const checkAndNavigate = async () => {
      if (!userLoading && !hasNavigated.current && !isManualLoginRef.current) {
        if (isGymSuspended) {
          await supabase.auth.signOut();
          if (isMounted.current) {
            toast.error('gym suspended due to subscription');
            setLoading(false);
          }
        } else if (role) {
          const normalizedRole = role.trim().toLowerCase().replace(/[\s_-]/g, '');
          const normType = (typeId || '').trim().toLowerCase().replace(/[\s_-]/g, '');

          if (normType) {
            const isUserGlobalTrainer = normalizedRole === 'globaltrainer';
            if (normType === 'globaltrainer' && !isUserGlobalTrainer) {
              await supabase.auth.signOut();
              return;
            }
            if (normType !== 'globaltrainer' && isUserGlobalTrainer) {
              await supabase.auth.signOut();
              return;
            }
            if (normType === 'owner' && normalizedRole !== 'owner' && normalizedRole !== 'superadmin') {
              await supabase.auth.signOut();
              return;
            }
            if (normType === 'customer' && normalizedRole !== 'customer') {
              await supabase.auth.signOut();
              return;
            }
            if (normType === 'gymtrainer' && normalizedRole !== 'trainer' && normalizedRole !== 'gymtrainer') {
              await supabase.auth.signOut();
              return;
            }
            if (normType === 'individual' && normalizedRole !== 'individual' && normalizedRole !== 'superadmin') {
              await supabase.auth.signOut();
              return;
            }
            if (normType !== 'individual' && normalizedRole === 'individual') {
              await supabase.auth.signOut();
              return;
            }
          }

          if (normType === 'individual' || normalizedRole === 'individual' || normType === 'owner' || normType === 'globaltrainer') {
            await clearSelectedGym();
          } else if (normalizedRole === 'customer' || normalizedRole === 'trainer' || normalizedRole === 'owner') {
            const autoSelectedGym = await getSelectedGym();
            if (autoSelectedGym?.gymId) {
              const { data: { session } } = await supabase.auth.getSession();
              const autoUserId = session?.user?.id;
              if (autoUserId) {
                const gymAuth = await verifyUserGymMembership(autoUserId, session?.user?.email, autoSelectedGym.gymId);
                if (!gymAuth.isAuthorized) {
                  await supabase.auth.signOut();
                  if (isMounted.current) {
                    toast.error('This account belongs to another gym. Please select your registered gym.');
                    setLoading(false);
                  }
                  return;
                }
              }
            }
          }
          hasNavigated.current = true;
          navigateBasedOnRole(role);
        }
      }
    };
    checkAndNavigate();
  }, [role, userLoading, isGymSuspended, typeId]);

  const handleAuth = async () => {
    isManualLoginRef.current = true;
    setAuthErrorMessage(null);
    /*
    if (loginMethod === 'phone') {
      if (!phone.trim()) {
        return Alert.alert('Validation Error', 'Phone number is required.');
      }

      let formattedPhone = phone.trim();
      if (!formattedPhone.startsWith('+')) {
        formattedPhone = '+91' + formattedPhone;
      }

      setLoading(true);
      try {
        const { error } = await supabase.auth.signInWithOtp({
          phone: formattedPhone,
        });

        if (error) throw error;

        setPhoneStep('verify');
        Alert.alert('OTP Sent', 'An OTP has been sent to your phone number.');
      } catch (err: any) {
        Alert.alert('Authentication Error', err.message || 'Operation failed.');
      } finally {
        setLoading(false);
      }
      return;
    }
    */

    const targetEmail = email.trim().toLowerCase();

    if (!targetEmail && loginMethod === 'email') {
      toast.error('Email Address is required.');
      return;
    }

    if (purpose === 'login') {
      if (!password) {
        toast.error('Password is required.');
        return;
      }
    }

    setLoading(true);

    try {
      if (purpose === 'login') {
        await supabase.auth.signOut();
        const normType = (typeId || '').trim().toLowerCase().replace(/[\s_-]/g, '');

        if (normType === 'individual') {
          await clearSelectedGym();
        }

        // 1. PRE-CHECK: Validate role & gym boundary BEFORE creating a Supabase session
        const currentSelectedGym = await getSelectedGym();
        const selectedGymId = currentSelectedGym?.gymId;

        let preAuthUserRec: any = null;

        try {
          let userQuery = supabase
            .from('users')
            .select('userId, role, email, phone');

          if (targetEmail.includes('@')) {
            userQuery = userQuery.ilike('email', targetEmail);
          } else {
            const cleanedDigits = targetEmail.replace(/[^0-9]/g, '');
            if (cleanedDigits.length >= 10) {
              const last10 = cleanedDigits.slice(-10);
              userQuery = userQuery.or(`phone.ilike.%${last10}%,email.ilike.${targetEmail}`);
            } else {
              userQuery = userQuery.ilike('email', targetEmail);
            }
          }
          const { data: uRec } = await userQuery.maybeSingle();
          preAuthUserRec = uRec;

          const preUserId = uRec?.userId;
          const preRole = uRec?.role;
          const normalizedPreRole = (preRole || '').trim().toLowerCase().replace(/[\s_-]/g, '');
          const isSuperAdmin = normalizedPreRole === 'superadmin';

          // Pure global roles are never gym-restricted
          const isGlobalRole = isSuperAdmin || normalizedPreRole === 'globaltrainer' || normalizedPreRole === 'individual' || normType === 'individual';

          if (normType === 'individual') {
            if (uRec) {
                let isBlocked = normalizedPreRole === 'owner' ||
                  normalizedPreRole === 'trainer' ||
                  normalizedPreRole === 'gymtrainer' ||
              normalizedPreRole === 'globaltrainer';

              if (normalizedPreRole === 'customer') {
                isBlocked = true;
                if (preUserId) {
                  try {
                    const { data: indPlan } = await supabase
                      .from('individual_customer_plans')
                      .select('individualCustomerPlanId')
                      .eq('userId', preUserId)
                      .is('deletedAt', null)
                      .limit(1);
                    if (indPlan && indPlan.length > 0) {
                      isBlocked = false;
                    }
                  } catch { }
                }
              }

              if (isBlocked) {
                const errText = 'Invalid credentials or check role';
                setAuthErrorMessage(errText);
                toast.error(errText);
                setLoading(false);
                isManualLoginRef.current = false;
                return;
              }
            }
          }

          if (selectedGymId && !isGlobalRole) {
            const custOr = [`email.ilike.${targetEmail}`];
            if (preUserId) {
              custOr.push(`userId.eq.${preUserId}`, `customerId.eq.${preUserId}`);
            }
            const trainerOr = [`email.ilike.${targetEmail}`];
            if (preUserId) {
              trainerOr.push(`userId.eq.${preUserId}`);
            }
            const ownerOr = [`ownerEmail.ilike.${targetEmail}`];
            if (preUserId) {
              ownerOr.push(`userId.eq.${preUserId}`, `createdBy.eq.${preUserId}`);
            }

            const [cRes, tRes, oRes] = await Promise.all([
              supabase.from('gym_customers').select('customerId, gymId, is_deleted').or(custOr.join(',')).eq('is_deleted', false),
              supabase.from('gym_trainers').select('gymTrainerId, gymId, is_deleted').or(trainerOr.join(',')).eq('is_deleted', false),
              supabase.from('gym_owners').select('gymOwnerId, gymId, is_deleted').or(ownerOr.join(',')).eq('is_deleted', false),
            ]);

            const cRows = cRes.data || [];
            const tRows = tRes.data || [];
            const oRows = oRes.data || [];

            const userGymIds = new Set<string>();
            cRows.forEach((r: any) => r.gymId && userGymIds.add(r.gymId));
            tRows.forEach((r: any) => r.gymId && userGymIds.add(r.gymId));
            oRows.forEach((r: any) => r.gymId && userGymIds.add(r.gymId));

            // If user has records in gym tables, but NONE match the currently selected gym:
            if (userGymIds.size > 0 && !userGymIds.has(selectedGymId)) {
              console.warn(`[SignIn Pre-check] Gym boundary blocked. User belongs to gym(s) ${Array.from(userGymIds).join(', ')}, but selected ${selectedGymId}`);
              const errText = 'This account belongs to another gym. Please select your registered gym to sign in.';
              setAuthErrorMessage(errText);
              setLoading(false);
              isManualLoginRef.current = false;
              return;
            }

            // If role is known to be customer/trainer/owner, ensure it matches this gym
            if (['customer', 'trainer', 'owner'].includes(normalizedPreRole)) {
              if (userGymIds.size > 0 && !userGymIds.has(selectedGymId)) {
                const errText = 'This account belongs to another gym. Please select your registered gym to sign in.';
                setAuthErrorMessage(errText);
                setLoading(false);
                isManualLoginRef.current = false;
                return;
              }
            }
          }

          if (normType && normType !== 'individual') {
            let preIsOwner = false;
            let preIsCustomer = false;
            let preIsTrainer = false;
            let preIsGlobalTrainer = false;

            if (normalizedPreRole === 'owner') preIsOwner = true;
            if (normalizedPreRole === 'customer') preIsCustomer = true;
            if (normalizedPreRole === 'trainer' || normalizedPreRole === 'gymtrainer') preIsTrainer = true;
            if (normalizedPreRole === 'globaltrainer') preIsGlobalTrainer = true;

            const userFilter = preUserId ? `,userId.eq.${preUserId}` : '';

            const [oCheck, cCheck, tCheck, gtCheck] = await Promise.all([
              supabase.from('gym_owners').select('gymOwnerId, gymId, is_deleted').or(`ownerEmail.ilike.${targetEmail}${userFilter}`).eq('is_deleted', false).limit(1),
              supabase.from('gym_customers').select('customerId, gymId, is_deleted').or(`email.ilike.${targetEmail}${userFilter}`).eq('is_deleted', false).limit(1),
              supabase.from('gym_trainers').select('gymTrainerId, gymId, is_deleted').or(`email.ilike.${targetEmail}${userFilter}`).eq('is_deleted', false).limit(1),
              supabase.from('global_trainers').select('globalTrainerId, is_deleted').or(`email.ilike.${targetEmail}${userFilter}`).eq('is_deleted', false).limit(1),
            ]);

            if (oCheck.data && oCheck.data.length > 0) preIsOwner = true;
            if (cCheck.data && cCheck.data.length > 0) preIsCustomer = true;
            if (tCheck.data && tCheck.data.length > 0) preIsTrainer = true;
            if (gtCheck.data && gtCheck.data.length > 0) preIsGlobalTrainer = true;

            let preRoleValid = false;
            if (normType === 'globaltrainer') {
              if (preIsGlobalTrainer) {
                preRoleValid = true;
              }
            } else {
              if (preIsGlobalTrainer) {
                const errText = 'Please log in using Global Trainer account type.';
                setAuthErrorMessage(errText);
                toast.error(errText);
                setLoading(false);
                isManualLoginRef.current = false;
                return;
              }

              if (normType === 'owner') {
                if (normalizedPreRole === 'owner' || isSuperAdmin || (preIsOwner && (!normalizedPreRole || normalizedPreRole === 'owner'))) preRoleValid = true;
              } else if (normType === 'customer') {
                // Allow proceeding to post-auth so we can check gym_customers with full access
                preRoleValid = true;
              } else if (normType === 'gymtrainer') {
                // Allow proceeding to post-auth so we can check gym_trainers with full access
                preRoleValid = true;
              } else {
                preRoleValid = true;
              }
            }

            if (!preRoleValid && (uRec || preIsOwner || preIsCustomer || preIsTrainer || preIsGlobalTrainer)) {
              const errText = 'Invalid credentials or check role';
              setAuthErrorMessage(errText);
              toast.error(errText);
              setLoading(false);
              isManualLoginRef.current = false;
              return;
            }
          }
        } catch (preCheckError) {
          console.error('[SignIn] Pre-check failed:', preCheckError);
        }

        let authData: any = null;
        let authError: any = null;

        // Resolve email if user entered phone number
        let signinEmail = targetEmail;
        if (!signinEmail.includes('@')) {
          const cleanedDigits = signinEmail.replace(/[^0-9]/g, '');
          if (cleanedDigits.length >= 10) {
            const last10 = cleanedDigits.slice(-10);
            try {
              const { data: phoneUser } = await supabase
                .from('users')
                .select('email')
                .or(`phone.ilike.%${last10}%,email.ilike.%${last10}%`)
                .maybeSingle();
              if (phoneUser?.email) {
                signinEmail = phoneUser.email.trim().toLowerCase();
              } else {
                const { data: phoneCust } = await supabase
                  .from('gym_customers')
                  .select('email')
                  .ilike('phone', `%${last10}%`)
                  .eq('is_deleted', false)
                  .maybeSingle();
                if (phoneCust?.email) {
                  signinEmail = phoneCust.email.trim().toLowerCase();
                }
              }
            } catch {
            }
          }
        }

        const firstAttempt = await supabase.auth.signInWithPassword({
          email: signinEmail,
          password: password,
        });

        if (!firstAttempt.error) {
          authData = firstAttempt.data;
        } else {
          let secondAttempt: any = null;
          if (password.trim() !== password) {
            secondAttempt = await supabase.auth.signInWithPassword({
              email: signinEmail,
              password: password.trim(),
            });
          }

          if (secondAttempt && !secondAttempt.error) {
            authData = secondAttempt.data;
          } else {
            try {
              const passwordHash = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, password.trim());
              const thirdAttempt = await supabase.auth.signInWithPassword({
                email: signinEmail,
                password: passwordHash,
              });

              if (!thirdAttempt.error) {
                authData = thirdAttempt.data;
              } else {
                authError = firstAttempt.error;
              }
            } catch {
              authError = firstAttempt.error;
            }
          }
        }

        if (authError) {
          console.error(authError.message || 'Unable to sign in.');
          if (isMounted.current) {
            const errText = authError.message?.toLowerCase().includes('invalid login credentials')
              ? 'Invalid email or password. Please check your credentials.'
              : (authError.message || 'Invalid credentials or check role');
            setAuthErrorMessage(errText);
            toast.error(errText);
            setLoading(false);
          }
          isManualLoginRef.current = false;
          return;
        }

        if (authData?.user?.id) {
          const userId = authData.user.id;
          const userAuthEmail = (authData.user.email || targetEmail).trim().toLowerCase();

          // Query profile by userId, and fallback to email if not matched
          let { data: profile } = await supabase
            .from('users')
            .select('role')
            .eq('userId', userId)
            .maybeSingle();

          if (!profile && userAuthEmail) {
            const { data: emailProfile } = await supabase
              .from('users')
              .select('role')
              .ilike('email', userAuthEmail)
              .maybeSingle();
            profile = emailProfile;
          }

          if (!profile && targetEmail) {
            const { data: targetProfile } = await supabase
              .from('users')
              .select('role')
              .ilike('email', targetEmail)
              .maybeSingle();
            if (targetProfile) {
              profile = targetProfile;
            }
          }

          let fetchedRole = profile?.role || preAuthUserRec?.role || authData.user.user_metadata?.role;

          if (!profile && !fetchedRole) {
            const metadata = authData.user.user_metadata || {};
            const userPhone = metadata.phone || (phone ? '+91' + phone.replace(/[^0-9]/g, '') : '');
            const fallbackRole = normType === 'globaltrainer' ? 'globaltrainer' : (normType === 'individual' ? 'individual' : 'customer');
            try {
              await createUser({
                userId: userId,
                name: metadata.name || name.trim() || 'User',
                email: authData.user.email || targetEmail,
                phone: userPhone,
                address: metadata.address || address.trim() || '',
                role: metadata.role || fallbackRole,
              });
            } catch {
            }
            fetchedRole = metadata.role || fallbackRole;
          }

          let cleanFetchedRole = (fetchedRole || '').trim().toLowerCase().replace(/[\s_-]/g, '');

          // Check if user is a global trainer
          const userAuthFilter = `userId.eq.${userId},email.ilike.${userAuthEmail}`;
          const { data: gtRecord } = await supabase
            .from('global_trainers')
            .select('globalTrainerId, is_deleted')
            .or(userAuthFilter)
            .eq('is_deleted', false)
            .maybeSingle();

          const isUserGlobalTrainer = cleanFetchedRole === 'globaltrainer' || !!gtRecord;

          // ==================== ROLE-SPECIFIC VALIDATIONS ====================

          // 1. GLOBAL TRAINER
          if (normType === 'globaltrainer') {
            if (!isUserGlobalTrainer) {
              await supabase.auth.signOut();
              if (isMounted.current) {
                const errText = 'Invalid credentials or check role';
                setAuthErrorMessage(errText);
                toast.error(errText);
                setLoading(false);
              }
              isManualLoginRef.current = false;
              return;
            }

            fetchedRole = 'globaltrainer';
            if (cleanFetchedRole !== 'globaltrainer') {
              try {
                await supabase.from('users').update({ role: 'globaltrainer' }).eq('userId', userId);
              } catch (updateRoleErr) {
                console.error('[SignIn] Error syncing globaltrainer role:', updateRoleErr);
              }
            }
            await clearSelectedGym();
          }

          // 2. INDIVIDUAL
          else if (normType === 'individual') {
            const isSuperAdminRole = cleanFetchedRole === 'superadmin' || cleanFetchedRole === 'super_admin' || cleanFetchedRole === 'super-admin' || preAuthUserRec?.role === 'superadmin';

            if (isSuperAdminRole) {
              await clearSelectedGym();
              await refreshUserContext();

              if (isMounted.current) {
                toast.success('Signed in as Super Admin!');
              }
              if (!hasNavigated.current) {
                hasNavigated.current = true;
                router.replace('/(superadmin)/dashboard');
              }
              return;
            }

            // Check if user is an individual (by role 'individual' or having an individual customer plan)
            let isIndividual = cleanFetchedRole === 'individual';
            if (!isIndividual && (cleanFetchedRole === 'customer' || !cleanFetchedRole)) {
              try {
                const { data: indPlan } = await supabase
                  .from('individual_customer_plans')
                  .select('individualCustomerPlanId')
                  .eq('userId', userId)
                  .is('deletedAt', null)
                  .limit(1);
                if (indPlan && indPlan.length > 0) {
                  isIndividual = true;
                }
              } catch { }
            }

            if (isIndividual) {
              await clearSelectedGym();
              await refreshUserContext();

                if (isMounted.current) {
                  toast.success('Signed in successfully!');
                }
                if (!hasNavigated.current) {
                  hasNavigated.current = true;
                  router.replace('/(customer)/home');
                }
                return;
              }

              // Block all other roles (owner, trainer, global trainer, or gym customer)
              await supabase.auth.signOut();
              if (isMounted.current) {
                const errText = 'Invalid credentials or check role';
                setAuthErrorMessage(errText);
                toast.error(errText);
                setLoading(false);
              }
              isManualLoginRef.current = false;
              return;
            }

            // 3. GYM OWNER
            else if (normType === 'owner') {
              // Check if credentials match role 'owner' in users table (or superadmin)
              const isOwnerRole = cleanFetchedRole === 'owner' || cleanFetchedRole === 'superadmin';

              if (!isOwnerRole) {
                // Also check gym_owners table as a fallback in case role in users wasn't synced
                const { data: oRec } = await supabase
                  .from('gym_owners')
                  .select('gymOwnerId')
                  .or(`userId.eq.${userId},ownerEmail.ilike.${userAuthEmail}`)
                  .eq('is_deleted', false)
                  .maybeSingle();

                if (!oRec) {
                  await supabase.auth.signOut();
                  if (isMounted.current) {
                    const errText = 'Invalid credentials or check role';
                    setAuthErrorMessage(errText);
                    toast.error(errText);
                    setLoading(false);
                  }
                  isManualLoginRef.current = false;
                  return;
                }

                try {
                  await supabase.from('users').update({ role: 'owner' }).eq('userId', userId);
                  fetchedRole = 'owner';
                  cleanFetchedRole = 'owner';
                } catch (updateRoleErr) {
                  console.warn('[SignIn] Non-fatal error syncing role to owner:', updateRoleErr);
                }
              }

              // Verify owner's gym status if exists
              try {
                const fullProfile = await fetchUserAndRoleProfile(userId, targetEmail);
                if (fullProfile?.gymId) {
                  const gymDetails = await fetchGymById(fullProfile.gymId);
                  if (gymDetails && gymDetails.isActive === false) {
                    await supabase.auth.signOut();
                    if (isMounted.current) {
                      toast.error('Your gym is inactive. Please contact support.');
                      setLoading(false);
                    }
                    isManualLoginRef.current = false;
                    return;
                  }
                }
              } catch (error) {
                console.error('[SignIn] Error checking gym status:', error);
              }

              await clearSelectedGym();
            }

            // 4. GYM CUSTOMER
            else if (normType === 'customer') {
              if (isUserGlobalTrainer) {
                await supabase.auth.signOut();
                if (isMounted.current) {
                  const errText = 'Please log in using Global Trainer account type.';
                  setAuthErrorMessage(errText);
                  toast.error(errText);
                  setLoading(false);
                }
                isManualLoginRef.current = false;
                return;
              }

              // Verify customer selected a gym from find-organization
              const postSelectedGym = await getSelectedGym();
              if (!postSelectedGym?.gymId) {
                await supabase.auth.signOut();
                if (isMounted.current) {
                  toast.error('Please select your gym first.');
                  setLoading(false);
                  router.replace({ pathname: '/auth/find-organization', params: { type: 'customer' } });
                }
                isManualLoginRef.current = false;
                return;
              }

              // Check if user belongs to the chosen gym in gym_customers
              const { data: customerRecords } = await supabase
                .from('gym_customers')
                .select('customerId, gymId, is_deleted')
                .or(`userId.eq.${userId},customerId.eq.${userId},email.ilike.${userAuthEmail}`)
                .eq('is_deleted', false);

              const belongsToChosenGym = customerRecords?.some((c: any) => c.gymId === postSelectedGym.gymId);

              if (!belongsToChosenGym) {
                await supabase.auth.signOut();
                if (isMounted.current) {
                  let errText = 'No membership found for this gym. Please check your credentials or select your registered gym.';
                  if (customerRecords && customerRecords.length > 0) {
                    errText = 'This account belongs to another gym. Please select your registered gym.';
                  } else if (cleanFetchedRole === 'individual') {
                    errText = 'No gym membership found for this gym. Please log in using Individual account type.';
                  }
                  setAuthErrorMessage(errText);
                  toast.error(errText);
                  setLoading(false);
                }
                isManualLoginRef.current = false;
                return;
              }

              // Successfully verified as belonging to this gym!
              // Ensure role in users table is synced to 'customer'
              if (cleanFetchedRole !== 'customer') {
                try {
                  await supabase.from('users').update({ role: 'customer' }).eq('userId', userId);
                  fetchedRole = 'customer';
                  cleanFetchedRole = 'customer';
                } catch (updateRoleErr) {
                  console.warn('[SignIn] Non-fatal error syncing role to customer:', updateRoleErr);
                }
              }

              // Check if chosen gym is active
              try {
                const gymDetails = await fetchGymById(postSelectedGym.gymId);
                if (gymDetails && gymDetails.isActive === false) {
                  await supabase.auth.signOut();
                  if (isMounted.current) {
                    toast.error('Your gym is inactive. Please contact support.');
                    setLoading(false);
                  }
                  isManualLoginRef.current = false;
                  return;
                }
              } catch (error) {
                console.error('[SignIn] Error checking gym status:', error);
              }
            }

            // 5. GYM TRAINER
            else if (normType === 'gymtrainer') {
              if (isUserGlobalTrainer) {
                await supabase.auth.signOut();
                if (isMounted.current) {
                  const errText = 'Please log in using Global Trainer account type.';
                  setAuthErrorMessage(errText);
                  toast.error(errText);
                  setLoading(false);
                }
                isManualLoginRef.current = false;
                return;
              }

              // Verify trainer selected a gym from find-organization
              const postSelectedGym = await getSelectedGym();
              if (!postSelectedGym?.gymId) {
                await supabase.auth.signOut();
                if (isMounted.current) {
                  toast.error('Please select your gym first.');
                  setLoading(false);
                  router.replace({ pathname: '/auth/find-organization', params: { type: 'gym_trainer' } });
                }
                isManualLoginRef.current = false;
                return;
              }

              // Check if trainer belongs to the chosen gym in gym_trainers
              const { data: trainerRecords } = await supabase
                .from('gym_trainers')
                .select('gymTrainerId, gymId, is_deleted')
                .or(`userId.eq.${userId},email.ilike.${userAuthEmail}`)
                .eq('is_deleted', false);

              const belongsToChosenGym = trainerRecords?.some((t: any) => t.gymId === postSelectedGym.gymId);

              if (!belongsToChosenGym) {
                await supabase.auth.signOut();
                if (isMounted.current) {
                  let errText = 'No trainer record found for this gym. Please check your credentials or select your registered gym.';
                  if (trainerRecords && trainerRecords.length > 0) {
                    errText = 'This account belongs to another gym. Please select your registered gym.';
                  }
                  setAuthErrorMessage(errText);
                  toast.error(errText);
                  setLoading(false);
                }
                isManualLoginRef.current = false;
                return;
              }

              // Successfully verified as belonging to this gym!
              // Ensure role in users table is synced to 'trainer'
              if (cleanFetchedRole !== 'trainer') {
                try {
                  await supabase.from('users').update({ role: 'trainer' }).eq('userId', userId);
                  fetchedRole = 'trainer';
                  cleanFetchedRole = 'trainer';
                } catch (updateRoleErr) {
                  console.warn('[SignIn] Non-fatal error syncing role to trainer:', updateRoleErr);
                }
              }

              // Check if chosen gym is active
              try {
                const gymDetails = await fetchGymById(postSelectedGym.gymId);
                if (gymDetails && gymDetails.isActive === false) {
                  await supabase.auth.signOut();
                  if (isMounted.current) {
                    toast.error('Your gym is inactive. Please contact support.');
                    setLoading(false);
                  }
                  isManualLoginRef.current = false;
                  return;
                }
              } catch (error) {
                console.error('[SignIn] Error checking gym status:', error);
              }
            }

            cleanFetchedRole = (fetchedRole || '').trim().toLowerCase().replace(/[\s_-]/g, '');
            if (cleanFetchedRole === 'globaltrainer' || cleanFetchedRole === 'superadmin' || cleanFetchedRole === 'individual' || normType === 'individual' || normType === 'owner') {
              await clearSelectedGym();
            }
            await refreshUserContext();
            if (isMounted.current) {
              toast.success('Signed in successfully!');
            }
            if (!hasNavigated.current) {
              hasNavigated.current = true;
              navigateBasedOnRole(fetchedRole);
            }
            return;
          }

          if (isMounted.current) {
            toast.success('Signed in successfully!');
          }
        } else if (purpose === 'signup') {
          if (!name.trim()) {
            if (isMounted.current) toast.error('Name is required.');
            return;
          }
          if (!phone.trim()) {
            if (isMounted.current) toast.error('Phone number is required.');
            return;
          }
          const cleanedPhone = phone.replace(/[^0-9]/g, '');
          if (cleanedPhone.length !== 10) {
            if (isMounted.current) toast.error('Phone number must be exactly 10 digits.');
            return;
          }
          if (!password) {
            if (isMounted.current) toast.error('Password is required.');
            return;
          }

          const hasMinLength = password.length >= 8;
          const hasNumber = /\d/.test(password);
          const hasUpper = /[A-Z]/.test(password);
          const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);

          if (!hasMinLength || !hasNumber || !hasUpper || !hasSpecial) {
            if (isMounted.current) toast.error('Password must be at least 8 characters, and contain one number, one uppercase letter, and one special character.');
            return;
          }

          const fullPhone = '+91' + cleanedPhone;

          const targetRole = typeId === 'individual' ? 'individual' : 'customer';
          const { data: authData, error: authError } = await supabase.auth.signUp({
            email: targetEmail,
            password: password,
            options: {
              data: {
                name: name.trim(),
                phone: fullPhone,
                address: address.trim(),
                role: targetRole,
              },
            },
          });

          if (authError) {
            if (isMounted.current) toast.error('Sign up failed. Please try again.');
            return;
          }

          if (authData?.user?.id) {
            try {
              await createUser({
                userId: authData.user.id,
                name: name.trim(),
                email: targetEmail,
                phone: fullPhone,
                address: address.trim(),
                role: targetRole,
              });
              if (targetRole === 'individual') {
                try {
                  await assignInitialIndividualCustomerPlan(authData.user.id);
                } catch (pErr) {
                  console.warn('[otp-auth] assignInitialIndividualCustomerPlan failed:', pErr);
                }
              }
            } catch {
            }
          }

          if (isMounted.current) {
            setSuccessTitle('Verification Email Sent!');
            setSuccessBody('Please check your email inbox and spam folder to confirm your email address and activate your account.');
            setVerifiedSuccess(true);
          }
        }
      } catch (err: any) {
        if (isMounted.current) {
          toast.error(err.message || 'Operation failed.');
        }
      } finally {
        if (isMounted.current) {
          setLoading(false);
        }
        isManualLoginRef.current = false;
      }
    };

    /*
    const handleVerifyOtp = async () => {
      if (!otpCode.trim()) {
        return Alert.alert('Validation Error', 'Please enter the OTP.');
      }
  
      let formattedPhone = phone.trim();
      if (!formattedPhone.startsWith('+')) {
        formattedPhone = '+91' + formattedPhone;
      }
  
      setLoading(true);
      try {
        const { data: authData, error: authError } = await supabase.auth.verifyOtp({
          phone: formattedPhone,
          token: otpCode.trim(),
          type: 'sms',
        });
  
        if (authError) throw authError;
  
        if (authData?.user?.id) {
          // Check if the user exists in public.users
          const { data: profile } = await supabase
            .from('users')
            .select('role')
            .eq('userId', authData.user.id)
            .maybeSingle();
  
          let fetchedRole = profile?.role;
  
          if (!profile) {
            // Profile doesn't exist, create it as 'customer'
            const { error: insertError } = await supabase
              .from('users')
              .insert([
                {
                  userId: authData.user.id,
                  name: 'User',
                  email: authData.user.email || '',
                  phone: formattedPhone,
                  role: 'customer',
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                },
              ]);
  
            if (insertError) {
              console.error('Error creating user profile:', insertError);
            }
            fetchedRole = 'customer';
          }
  
          // Refresh context in background
          refreshUserContext();
  
          if (fetchedRole) {
            navigateBasedOnRole(fetchedRole);
          }
        }
      } catch (err: any) {
        Alert.alert('Verification Error', err.message || 'Verification failed.');
      } finally {
        setLoading(false);
      }
    };
    */

    if (verifiedSuccess) {
      return (
        <View className="flex-1 bg-[#0A0A0A] items-center justify-center p-6">
          <View className="bg-[#141414] border border-[#D4FF00]/40 rounded-3xl p-6 items-center justify-center w-full py-10">
            <View className="w-16 h-16 rounded-full bg-[#D4FF00]/10 items-center justify-center mb-4 border border-[#D4FF00]/30">
              <CheckCircle size={36} color="#D4FF00" weight="fill" />
            </View>
            <Text className="text-white text-xl font-semibold mb-2">{successTitle}</Text>
            <Text className="text-[#8E8E93] text-xs text-center px-4 mb-6 leading-5">
              {successBody}
            </Text>
            <Pressable
              onPress={() => {
                setVerifiedSuccess(false);
                setPurpose('login');
                setPassword('');
              }}
              className="bg-[#D4FF00] rounded-xl py-3 px-6 active:opacity-90 w-full items-center"
            >
              <Text className="text-black font-semibold text-sm">Back to Sign In</Text>
            </Pressable>
          </View>
        </View>
      );
    }

    const handleCheckStatus = async () => {
      if (!statusIdentifier) {
        toast.error('Please enter email or mobile number.');
        return;
      }
      setStatusLoading(true);
      try {
        if (typeId === 'global_trainer') {
          const lead = await fetchGlobalTrainerLeadByIdentifier(statusIdentifier);
          if (lead) {
            setShowStatusModal(false);
            setStatusIdentifier('');
            router.push(`/auth/registration-status?globalTrainerLeadId=${lead.globalTrainerLeadId}`);
          } else {
            const identifierType = statusIdentifier.includes('@') ? 'email address' : 'mobile number';
            toast.error(`No application found for this ${identifierType}.`);
          }
        } else {
          const gymLead = await fetchGymLeadByIdentifier(statusIdentifier);
          if (gymLead) {
            setShowStatusModal(false);
            setStatusIdentifier('');
            router.push(`/auth/registration-status?gymLeadId=${gymLead.gymLeadId}`);
          } else {
            const identifierType = statusIdentifier.includes('@') ? 'email address' : 'mobile number';
            toast.error(`No application found for this ${identifierType}.`);
          }
        }
      } catch {
        toast.error('Failed to check status.');
      } finally {
        setStatusLoading(false);
      }
    };

    return (
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1 bg-[#09090B]"
      >
        <Stack.Screen options={{ headerShown: false }} />
        <ScrollView contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false} bounces={false}>
          <Pressable
            onPress={() => {
              if (router.canGoBack()) {
                router.back();
              } else {
                router.replace('/auth/account-type');
              }
            }}
            className="absolute top-12 left-6 z-10 w-10 h-10 bg-[#121212] border border-[#1E1E1E] rounded-full items-center justify-center"
          >
            <CaretLeft size={20} color="#FFFFFF" />
          </Pressable>
          <View className="h-[300px] w-full relative justify-end pb-8 px-6 mt-5">
            <View className="absolute top-0 right-0 bottom-0 opacity-40 items-end justify-center overflow-visible">
              <Image
                source={require('../../assets/login-posture.png')}
                className="w-[300px] h-full translate-x-4"
                resizeMode="cover"
              />
              <View className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#09090B] to-transparent" />
            </View>

            <Text className="text-white text-[32px] font-semibold mb-1 tracking-tight">
              {purpose === 'signup' ? 'Create Account' : 'Welcome Back!'}
            </Text>
            <Text className="text-[#8E8E93] text-[13px]">
              {purpose === 'signup'
                ? 'Sign up to start your fitness journey'
                : 'Sign in to continue your fitness journey'}
            </Text>
          </View>

          <View className="flex-1 px-6">
            {selectedGym && typeId !== 'global_trainer' && typeId !== 'individual' && typeId !== 'owner' && (
              <View className="bg-[#121212] border border-[#1E1E1E] rounded-xl p-4 mb-6 flex-row items-center justify-between">
                <View className="flex-row items-center flex-1">
                  <View className="w-10 h-10 rounded-full bg-[#1A1A1A] items-center justify-center mr-3 border border-[#2A2A2A] overflow-hidden">
                    {selectedGym.logo ? (
                      <Image source={{ uri: selectedGym.logo }} className="w-full h-full" resizeMode="cover" />
                    ) : (
                      <Building size={20} color="#6B6B6B" />
                    )}
                  </View>
                  <View className="flex-1 mr-2">
                    <Text className="text-[#8E8E93] text-[10px] uppercase tracking-wider mb-0.5">Organization</Text>
                    <Text className="text-white text-sm font-semibold" numberOfLines={1}>{selectedGym.gymName}</Text>
                  </View>
                </View>
                <Pressable
                  onPress={async () => {
                    await clearSelectedGym();
                    router.replace({ pathname: '/auth/find-organization', params: { type: typeId } });
                  }}
                  className="bg-[#2A2A2A] px-3 py-1.5 rounded-lg active:opacity-80"
                >
                  <Text className="text-white text-xs font-medium">Change</Text>
                </Pressable>
              </View>
            )}

            {/* {purpose === 'login' && (
            <View className="flex-row bg-[#121212] border border-[#1E1E1E] rounded-xl mb-6 overflow-hidden">
              <Pressable
                onPress={() => setLoginMethod('email')}
                className="flex-1 py-4 items-center justify-center relative"
              >
                <Text className={`text-[13px] tracking-wide ${loginMethod === 'email' ? 'text-[#D4FF00] font-semibold' : 'text-[#6B6B6B] font-medium'}`}>
                  Email
                </Text>
                {loginMethod === 'email' && (
                  <View className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#D4FF00]" />
                )}
              </Pressable>

              <Pressable
                onPress={() => setLoginMethod('phone')}
                className="flex-1 py-4 items-center justify-center relative"
              >
                <Text className={`text-[13px] tracking-wide ${loginMethod === 'phone' ? 'text-[#D4FF00] font-semibold' : 'text-[#6B6B6B] font-medium'}`}>
                  Phone
                </Text>
                {loginMethod === 'phone' && (
                  <View className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#D4FF00]" />
                )}
              </Pressable>
            </View>
          )} */}

            <View className="gap-3 mb-3">
              {/* {purpose === 'signup' && (
              <>
                <View className="flex-row items-center bg-[#121212] border border-[#1E1E1E] rounded-xl px-4 py-3.5 gap-3">
                  <User size={18} color="#6B6B6B" />
                  <TextInput autoCorrect={false} spellCheck={false}
                    value={name}
                    onChangeText={setName}
                    placeholder="Full Name"
                    placeholderTextColor="#6B6B6B"
                    autoCapitalize="words"
                    className="flex-1 text-white text-[14px] p-0 font-medium"
                  />
                </View>

                <View className="flex-row items-center bg-[#121212] border border-[#1E1E1E] rounded-xl px-4 py-3.5 gap-3">
                  <Phone size={18} color="#6B6B6B" />
                  <TextInput autoCorrect={false} spellCheck={false}
                    value={phone}
                    onChangeText={setPhone}
                    placeholder="Phone Number"
                    placeholderTextColor="#6B6B6B"
                    keyboardType="phone-pad"
                    maxLength={10}
                    className="flex-1 text-white text-[14px] p-0 font-medium"
                  />
                </View>

                <View className="flex-row items-center bg-[#121212] border border-[#1E1E1E] rounded-xl px-4 py-3.5 gap-3">
                  <MapPin size={18} color="#6B6B6B" />
                  <TextInput autoCorrect={false} spellCheck={false}
                    value={address}
                    onChangeText={setAddress}
                    placeholder="Address (Optional)"
                    placeholderTextColor="#6B6B6B"
                    className="flex-1 text-white text-[14px] p-0 font-medium"
                  />
                </View>
              </>
            )} */}

              {loginMethod === 'email' && (
                <View className="flex-row items-center bg-[#121212] border border-[#1E1E1E] rounded-xl px-4 py-3.5 gap-3">
                  <EnvelopeSimple size={18} color="#6B6B6B" />
                  <TextInput autoCorrect={false} spellCheck={false}
                    value={email}
                    onChangeText={(text) => {
                      setEmail(text);
                      if (authErrorMessage) setAuthErrorMessage(null);
                    }}
                    placeholder="Email Address"
                    placeholderTextColor="#6B6B6B"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    className="flex-1 text-white text-[14px] p-0 font-medium"
                  />
                </View>
              )}

              {loginMethod === 'email' && (
                <View className="flex-row items-center bg-[#121212] border border-[#1E1E1E] rounded-xl px-4 py-3.5 gap-3">
                  <Key size={18} color="#6B6B6B" />
                  <TextInput autoCorrect={false} spellCheck={false}
                    value={password}
                    onChangeText={(text) => {
                      setPassword(text);
                      if (authErrorMessage) setAuthErrorMessage(null);
                    }}
                    placeholder="Password"
                    placeholderTextColor="#6B6B6B"
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    className="flex-1 text-white text-[14px] p-0 font-medium"
                  />
                  <Pressable onPress={() => setShowPassword(!showPassword)} className="p-1">
                    {showPassword ? (
                      <Eye size={18} color="#6B6B6B" />
                    ) : (
                      <EyeSlash size={18} color="#6B6B6B" />
                    )}
                  </Pressable>
                </View>
              )}
            </View>

            {authErrorMessage && (
              <View className="bg-red-500/10 border border-red-500/30 rounded-xl p-3.5 mb-3 flex-row items-center gap-3">
                <WarningCircle size={20} color="#EF4444" weight="fill" />
                <Text className="text-[#FF6B6B] text-xs font-medium flex-1 leading-5">
                  {authErrorMessage}
                </Text>
              </View>
            )}

            {/* {purpose === 'login' && loginMethod === 'email' && (
            <Pressable onPress={() => router.push('/auth/forgot-password')} className="self-end mb-6">
              <Text className="text-[#D4FF00] text-xs font-medium">Forgot Password?</Text>
            </Pressable>
          )} */}

            <Text className="text-[#8E8E93] text-[13px] text-center mb-4 mt-2 px-4 leading-5">
              Note: If you have just created an account, please confirm your email address before signing in.
            </Text>

            <Pressable
              onPress={handleAuth}
              disabled={loading}
              className="bg-[#D4FF00] rounded-2xl py-3.5 flex-row items-center justify-center active:opacity-80 mt-1"
            >
              {loading ? (
                <ActivityIndicator color="#000000" size="small" />
              ) : (
                <View className="flex-row items-center">
                  <Text className="text-black font-semibold text-[15px] mr-2">
                    Sign In
                  </Text>
                  <ArrowRight size={16} color="#000000" weight="bold" />
                </View>
              )}
            </Pressable>

            {/* {purpose === 'login' ? (
            <Pressable onPress={() => setPurpose('signup')} className="self-center mt-6">
              <Text className="text-[#8E8E93] text-sm">
                Don&apos;t have an account? <Text className="text-[#D4FF00] font-semibold">Sign Up</Text>
              </Text>
            </Pressable>
          ) : (
            <Pressable onPress={() => setPurpose('login')} className="self-center mt-6">
              <Text className="text-[#8E8E93] text-sm">
                Already have an account? <Text className="text-[#D4FF00] font-semibold">Sign In</Text>
              </Text>
            </Pressable>
          )} */}

            {purpose === 'login' && (
              <View className="bg-[#121212] border border-[#1E1E1E] rounded-3xl p-5 mt-6 flex-row justify-between mb-4">
                <View className="items-center flex-1">
                  <View className="w-10 h-10 rounded-full bg-[#1A1A1A] items-center justify-center mb-2">
                    <Barbell size={20} color="#D4FF00" weight="regular" />
                  </View>
                  <Text className="text-[#8E8E93] text-[9px] text-center font-medium leading-[14px]">Personalized{'\n'}Workouts</Text>
                </View>

                <View className="items-center flex-1">
                  <View className="w-10 h-10 rounded-full bg-[#1A1A1A] items-center justify-center mb-2">
                    <ChartLine size={20} color="#D4FF00" weight="regular" />
                  </View>
                  <Text className="text-[#8E8E93] text-[9px] text-center font-medium leading-[14px]">Track Your{'\n'}Progress</Text>
                </View>

                <View className="items-center flex-1">
                  <View className="w-10 h-10 rounded-full bg-[#1A1A1A] items-center justify-center mb-2">
                    <Heart size={20} color="#D4FF00" weight="regular" />
                  </View>
                  <Text className="text-[#8E8E93] text-[9px] text-center font-medium leading-[14px]">Achieve Your{'\n'}Goals</Text>
                </View>
              </View>
            )}

            {purpose === 'login' && (
              <View className="mt-2 mb-4 items-center">
                {(typeId === 'individual' || typeId === 'owner' || typeId === 'global_trainer') && (
                  <Pressable onPress={() => {
                    if (typeId === 'global_trainer') {
                      router.push('/auth/global-trainer-signup');
                    } else {
                      router.push({ pathname: '/auth/signup', params: { type: typeId || 'individual' } });
                    }
                  }} className="mb-4">
                    <Text className="text-[#8E8E93] text-sm">
                      Don&apos;t have an account? <Text className="text-[#C3F400] font-semibold">Sign Up</Text>
                    </Text>
                  </Pressable>
                )}

                {(typeId === 'owner' || typeId === 'global_trainer') && (
                  <Pressable onPress={() => setShowStatusModal(true)} className="flex-row items-center justify-center p-2">
                    <Text className="text-[#8E8E93] text-sm">
                      {typeId === 'owner' ? 'Applied for Gym Owner?' : 'Applied for Trainer?'} <Text className="text-[#84CC16] font-semibold">Check Status</Text>
                    </Text>
                  </Pressable>
                )}

                {(typeId === 'customer' || typeId === 'gym_trainer') && (
                  <View className="bg-[#121214] border border-[#222226] rounded-2xl p-4 mt-2 mb-2 flex-row items-center w-full">
                    <View className="w-9 h-9 rounded-xl bg-[#1A1A1E] items-center justify-center mr-3 border border-[#2A2A30]">
                      <Info size={18} color="#D4FF00" weight="regular" />
                    </View>
                    <View className="flex-1">
                      <Text className="text-[#E4E4E7] text-[12px] font-semibold mb-0.5">
                        {typeId === 'customer' ? 'Gym Member Portal' : 'Gym Trainer Portal'}
                      </Text>
                      <Text className="text-[#8E8E93] text-[11px] leading-[15px]">
                        Accounts are issued by your gym desk. Contact your gym manager for credentials.
                      </Text>
                    </View>
                  </View>
                )}
              </View>
            )}

            <View className="flex-row justify-center items-center pb-8 mt-2">
              <Barbell size={14} color="#D4FF00" weight="fill" />
              <Text className="text-[#6B6B6B] text-xs ml-1.5 font-medium">Stronger every day, better you.</Text>
            </View>
          </View>
        </ScrollView>

        {showStatusModal && (
          <View className="absolute inset-0 bg-black/60 justify-center px-4 z-50">
            <View className="bg-[#121212] rounded-[32px] p-6 border border-[#1E1E1E]">
              <View className="flex-row justify-between items-center mb-6">
                <Text className="text-white text-xl font-semibold">Check Application Status</Text>
                <Pressable onPress={() => setShowStatusModal(false)} className="w-8 h-8 bg-[#1E1E1E] rounded-full items-center justify-center">
                  <Text className="text-[#8E8E93] text-sm font-semibold">✕</Text>
                </Pressable>
              </View>

              <Text className="text-[#8E8E93] text-[14px] mb-4 leading-5">
                Enter the email or mobile number you used during registration.
              </Text>

              <View className="flex-row items-center bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl px-4 py-3.5 mb-6">
                <User size={18} color="#6B6B6B" />
                <TextInput autoCorrect={false} spellCheck={false}
                  value={statusIdentifier}
                  onChangeText={setStatusIdentifier}
                  placeholder="Email or Mobile Number"
                  placeholderTextColor="#6B6B6B"
                  autoCapitalize="none"
                  autoComplete="off"
                  textContentType="none"
                  importantForAutofill="no"
                  className="flex-1 text-white text-[14px] p-0 font-medium ml-3"
                />
              </View>

              <Pressable
                onPress={handleCheckStatus}
                disabled={statusLoading}
                className="bg-[#84CC16] rounded-2xl py-3.5 flex-row items-center justify-center active:opacity-80"
              >
                {statusLoading ? (
                  <ActivityIndicator color="#000000" size="small" />
                ) : (
                  <Text className="text-black font-semibold text-[15px]">Check Status</Text>
                )}
              </Pressable>
            </View>
          </View>
        )}
      </KeyboardAvoidingView>
    );
  }
