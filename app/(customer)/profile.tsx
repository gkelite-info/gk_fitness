import { useState, useCallback } from 'react';
import { View, ScrollView, Pressable, ActivityIndicator, Modal, Platform } from 'react-native';
import { Text } from '@/components/nativewindui/Text';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  PencilSimple, Scales, Fire, CalendarBlank,
  User, Target, BookOpen, Star, Bell, ShieldCheck, Question, SignOut, CaretRight, ClipboardText, WarningCircle,
  UserGear
} from 'phosphor-react-native';

import { mockProfileData } from '@/constants/mockProfileData';
import { useTrainerStore } from '@/constants/trainerStore';
import { useUser } from '@/context/UserContext';
import { supabase } from '@/lib/supabase';
import { toast } from '@/lib/toast';
import { useCustomerProfile } from '@/hooks/auth/useCustomerProfile';
import { usePersonalTrainerRequestsByUser } from '@/hooks/personalTrainerRequests/usePersonalTrainerRequests';
import { useAssignedTrainersByCustomer } from '@/hooks/customerTrainers/useCustomerTrainers';
import { useAssignedGlobalTrainersByUser } from '@/hooks/individual/customer-trainer/individualCustomerTrainer';
import { queryClient } from '@/lib/react-query';
import { Skeleton } from '@/components/ui/Skeleton';
import { StaticAvatar } from '@/components/ui/StaticAvatar';
import { useWorkoutStreak } from '@/hooks/customerWorkouts/useWorkoutStreak';
import { unregisterPushToken } from '@/lib/services/notificationService';
import { CustomRefreshControl } from '@/components/CustomRefreshControl';

export default function ProfileScreen() {
  const userContext = useUser();
  const userId = userContext.userId;
  const { data, isLoading, refetch: refetchProfile } = useCustomerProfile(userId);

  return <ProfileView
    data={mockProfileData}
    customerData={data?.customerData}
    onboardingData={data?.onboardingData}
    loading={isLoading}
    fallbackUser={userContext}
    refetchProfile={refetchProfile}
  />;
}

function ProfileView({
  data,
  customerData,
  onboardingData,
  loading,
  fallbackUser,
  refetchProfile
}: {
  data: typeof mockProfileData,
  customerData: any,
  onboardingData: any,
  loading: boolean,
  fallbackUser: any,
  refetchProfile?: () => Promise<any>
}) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { trainer } = useTrainerStore();
  const userId = customerData?.userId || fallbackUser?.userId;
  const { data: trainerRequests, refetch: refetchTrainerRequests } = usePersonalTrainerRequestsByUser(userId);

  const customerId = customerData?.customerId || userId;
  const { data: assignedTrainers, refetch: refetchAssignedTrainers } = useAssignedTrainersByCustomer(customerId, userId);
  const { data: individualTrainers, refetch: refetchIndividualTrainers } = useAssignedGlobalTrainersByUser(userId);
  const { data: streakData, refetch: refetchStreak } = useWorkoutStreak();

  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([
      typeof refetchProfile === 'function' ? refetchProfile() : Promise.resolve(),
      typeof refetchAssignedTrainers === 'function' ? refetchAssignedTrainers() : Promise.resolve(),
      typeof refetchIndividualTrainers === 'function' ? refetchIndividualTrainers() : Promise.resolve(),
      typeof refetchTrainerRequests === 'function' ? refetchTrainerRequests() : Promise.resolve(),
      typeof refetchStreak === 'function' ? refetchStreak() : Promise.resolve(),
      queryClient.invalidateQueries({ queryKey: ['customerProfile', userId] }),
      queryClient.invalidateQueries({ queryKey: ['assignedGlobalTrainers'] }),
      queryClient.invalidateQueries({ queryKey: ['assignedTrainers'] }),
      queryClient.invalidateQueries({ queryKey: ['personalTrainerRequests'] }),
      queryClient.invalidateQueries({ queryKey: ['workoutStreak'] }),
    ]);
    setRefreshing(false);
  }, [refetchProfile, refetchAssignedTrainers, refetchIndividualTrainers, refetchTrainerRequests, refetchStreak, userId]);

  useFocusEffect(
    useCallback(() => {
      if (typeof refetchAssignedTrainers === 'function') refetchAssignedTrainers();
      if (typeof refetchIndividualTrainers === 'function') refetchIndividualTrainers();
      if (typeof refetchTrainerRequests === 'function') refetchTrainerRequests();
      if (typeof refetchStreak === 'function') refetchStreak();
    }, [refetchAssignedTrainers, refetchIndividualTrainers, refetchTrainerRequests, refetchStreak])
  );

  const activeIndividualAssignment = individualTrainers?.find((a: any) => {
    if (a.is_deleted) return false;
    if (a.isActive === false) return false;
    if (a.status === 'rejected' || a.status === 'cancelled') return false;
    const isApproved = a.status === 'approved' || (a.status !== 'pending' && !!a.assignedOn);
    if (!isApproved) return false;
    if (a.expiryOn) {
      const exp = new Date(a.expiryOn);
      if (exp.getTime() < Date.now()) return false;
    }
    return true;
  }) || individualTrainers?.find((a: any) => !a.is_deleted && a.isActive !== false && a.status === 'approved');

  const pendingIndividualAssignment = individualTrainers?.find(
    (a: any) => !a.is_deleted && (a.status === 'pending' || (a.status == null && a.isActive !== false))
  );

  const activeGymAssignment = assignedTrainers?.find((a: any) => a.isActive !== false && !a.is_deleted) || assignedTrainers?.[0];
  const activeAssignment = activeIndividualAssignment || activeGymAssignment;
  const assignedTrainer = activeIndividualAssignment ? activeIndividualAssignment.globalTrainer : activeGymAssignment?.trainer;
  const hasAssignedTrainer = !!activeAssignment;

  const activeRequest = trainerRequests?.[0];
  const realStatus = activeIndividualAssignment
    ? 'approved'
    : pendingIndividualAssignment
      ? 'submitted'
      : (activeRequest ? activeRequest.applicationStatus : 'none');

  const trainerDisplayName =
    activeIndividualAssignment?.globalTrainer?.fullName ||
    assignedTrainer?.fullName ||
    activeRequest?.gymTrainer?.name ||
    pendingIndividualAssignment?.globalTrainer?.fullName ||
    trainer.name;


  const [modalVisible, setModalVisible] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await unregisterPushToken(userId ?? undefined).catch(() => {});
      const { error } = await supabase.auth.signOut();
      if (error) {
        toast.error(error.message || 'Failed to sign out.');
        setModalVisible(false);
      } else {
        queryClient.clear();
        setModalVisible(false);
        router.replace('/auth/account-type');
      }
    } catch (err: any) {
      toast.error(err.message || 'An error occurred while signing out.');
      setModalVisible(false);
    } finally {
      setSigningOut(false);
    }
  };

  const displayFullName = customerData?.fullName || fallbackUser?.name || data.user.fullName;
  const displayEmail = customerData?.email || fallbackUser?.email || data.user.email;

  const displayAvatar = data.user.avatarUrl;

  const currentStreak = streakData?.currentStreak ?? 0;

  const rawWeight = onboardingData?.weight;
  const displayWeight = rawWeight
    ? (rawWeight.toString().toLowerCase().includes('kg') ? rawWeight.toString() : `${rawWeight} kg`)
    : '0';

  const displayStreak = currentStreak > 0 ? currentStreak.toString() : '0';
  const displayStreakSuffix = currentStreak > 0 ? 'days' : '';
  const displayStreakSubtitle = currentStreak > 0 ? 'Days Active' : 'Streak';

  const activeSinceDate = customerData?.createdAt || fallbackUser?.createdAt;
  const displayActiveSince = activeSinceDate
    ? new Date(activeSinceDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
    : '0';
  const displayActiveSinceSubtitle = activeSinceDate ? 'Joined' : 'Active';

  return (
    <View className="flex-1 bg-[#0F0F0F]" style={{ paddingTop: insets.top }}>
      <View className="flex-row justify-between items-center px-5 py-4">
        <Text className="text-white text-3xl font-semibold">Profile</Text>
        <View className="w-7 h-7" />
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 140 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<CustomRefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View className="bg-[#1A1A1A] rounded-3xl p-5 flex-row items-center mt-2 border border-[#27272A]">
          <StaticAvatar
            uri={fallbackUser?.profilePhoto}
            name={displayFullName}
            size={80}
            className="w-20 h-20 rounded-full"
          />
          <View className="ml-4 flex-1 justify-center">
            {loading ? (
              <>
                <Skeleton className="w-40 h-6 mb-2" />
                <Skeleton className="w-32 h-4" />
              </>
            ) : (
              <>
                <Text className="text-white text-xl font-semibold">{displayFullName}</Text>
                <Text className="text-[#A1A1AA] text-sm mt-1">{displayEmail}</Text>
              </>
            )}
            <Pressable
              onPress={() => router.push('/(customer)/edit-profile')}
              className="mt-3 flex-row items-center border border-[#D4FF00] rounded-full px-4 py-1.5 self-start"
            >
              <PencilSimple size={14} color="#D4FF00" weight="bold" />
              <Text className="text-white text-xs font-semibold ml-2">Edit Profile</Text>
            </Pressable>
          </View>
        </View>

        <Text className="text-white text-lg font-semibold mt-8 mb-4">Your Progress Overview</Text>
        <View className="flex-row justify-between gap-x-3">
          <ProgressCard
            icon={<Scales size={24} color="#D4FF00" />}
            title="Current Weight"
            value={displayWeight}
            subtitle={rawWeight ? "Current" : "Weight"}
            subtitleColor="#D4FF00"
          />
          <ProgressCard
            icon={<Fire size={24} color="#D4FF00" />}
            title="Workout Streak"
            value={displayStreak}
            subtitle={displayStreakSubtitle}
            subtitleColor="#D4FF00"
            valueHighlight={displayStreak}
            valueSuffix={displayStreakSuffix}
          />
          <ProgressCard
            icon={<CalendarBlank size={24} color="#D4FF00" />}
            title="Active Since"
            value={displayActiveSince}
            subtitle={displayActiveSinceSubtitle}
            subtitleColor="#D4FF00"
          />
        </View>

        <Text className="text-white text-lg font-semibold mt-8 mb-4">Manage Your Account</Text>
        <View className="bg-[#1A1A1A] rounded-3xl overflow-hidden border border-[#27272A]">
          {!loading && (!onboardingData || !onboardingData.primaryGoal || onboardingData.primaryGoal === 'Not specified') && (
            <MenuItem
              icon={<ClipboardText size={20} color="#000000" weight="bold" />}
              title="Complete Onboarding"
              subtitle="Finish setting up your personalized plan"
              isNew={true}
              iconContainerStyle="bg-[#FF9F0A]"
              onPress={() => router.push('/(customer)/(onboarding)/step1')}
            />
          )}
          <MenuItem icon={<User size={20} color="#D4FF00" />} title="Personal Information" subtitle="Update your personal details" onPress={() => router.push('/(customer)/edit-profile')} />
          <MenuItem icon={<Target size={20} color="#D4FF00" />} title="Goals & Preferences" subtitle="Manage your fitness goals and preferences" onPress={() => router.push('/(customer)/goals-preferences')} />
          {hasAssignedTrainer || realStatus === 'approved' ? (
            <MenuItem
              icon={<User size={20} color="#000000" weight="bold" />}
              title="My Trainer"
              subtitle={`Active: ${trainerDisplayName}`}
              iconContainerStyle="bg-[#D4FF00]"
              onPress={() => router.push('/(customer)/my-trainer')}
            />
          ) : pendingIndividualAssignment || realStatus === 'submitted' || realStatus === 'pending' ? (
            <MenuItem
              icon={<BookOpen size={20} color="#000000" weight="bold" />}
              title="Trainer Request"
              subtitle={pendingIndividualAssignment ? `Request pending with ${trainerDisplayName}` : "Request pending gym approval"}
              iconContainerStyle="bg-[#FF9F0A]"
              onPress={() => router.push(pendingIndividualAssignment ? '/(customer)/trainer/book-trainer' : '/(customer)/trainer/trainer-request')}
            />
          ) : (
            <MenuItem
              icon={<BookOpen size={20} color="#000000" weight="bold" />}
              title="Book Trainer"
              subtitle="Find and book a personal trainer"
              isNew={true}
              iconContainerStyle="bg-[#D4FF00]"
              onPress={() => router.push('/(customer)/trainer/book-trainer')}
            />
          )}
          <MenuItem
            icon={<Star size={20} color="#D4FF00" />}
            title="Membership & Subscription"
            subtitle={Platform.OS === 'ios' ? 'View membership status' : 'Manage your plan and billing'}
            onPress={() => router.push('/(customer)/memberships' as any)}
          />
          <MenuItem icon={<Bell size={20} color="#D4FF00" />} title="Notifications" subtitle="Manage your notification preferences" onPress={() => router.push('/(customer)/notifications/preferences' as any)} />
          <MenuItem
            icon={<ShieldCheck size={20} color="#D4FF00" />}
            title="Privacy & Security"
            subtitle="Manage your privacy and security settings"
            onPress={() => router.push('/(customer)/privacy-policy')}
          />
          <MenuItem
            icon={<Question size={20} color="#D4FF00" />}
            title="Help & Support"
            subtitle="Get help and support"
            onPress={() => router.push('/(customer)/help-support')}
          />
          <MenuItem
            icon={<UserGear size={20} color="#D4FF00" />}
            title="Manage Account"
            subtitle="Account deletion and data management"
            onPress={() => router.push('/(customer)/manage-account')}
          />
          <MenuItem
            icon={<SignOut size={20} color="#FF3B30" />}
            title="Logout"
            subtitle="Sign out from your account"
            titleColor="#FF3B30"
            hideBorder={true}
            iconContainerStyle="bg-[#2A1515]"
            onPress={() => setModalVisible(true)}
          />
        </View>
      </ScrollView>

      <Modal
        animationType="fade"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View className="flex-1 bg-black/70 justify-center items-center px-6">
          <View className="bg-[#1A1A1A] border border-[#27272A] w-full max-w-[340px] rounded-3xl p-6 items-center shadow-2xl">
            <View className="w-12 h-12 rounded-full bg-red-500/10 items-center justify-center mb-4 border border-red-500/20">
              <WarningCircle size={28} color="#EF4444" weight="fill" />
            </View>
            <Text className="text-white text-lg font-semibold mb-2">Sign Out</Text>
            <Text className="text-[#8E8E93] text-sm text-center mb-6 leading-5">
              Are you sure you want to sign out of your account? You will need to log in again to access the platform.
            </Text>

            <View className="flex-row gap-3 w-full">
              <Pressable
                onPress={() => setModalVisible(false)}
                className="flex-1 bg-[#27272A] rounded-2xl py-3.5 items-center active:opacity-80"
              >
                <Text className="text-white font-semibold">Cancel</Text>
              </Pressable>
              <Pressable
                onPress={handleSignOut}
                disabled={signingOut}
                className="flex-1 bg-red-500 rounded-2xl py-3.5 items-center active:opacity-80 flex-row justify-center gap-2"
              >
                {signingOut ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text className="text-white font-semibold">Sign Out</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function ProgressCard({ icon, title, value, subtitle, subtitleColor, valueHighlight, valueSuffix }: any) {
  return (
    <View className="bg-[#1A1A1A] rounded-2xl p-4 flex-1 items-center justify-center border border-[#27272A]">
      <View className="mb-2">
        {icon}
      </View>
      <Text className="text-[#8E8E93] text-[10px] mb-2 font-medium">{title}</Text>
      {valueHighlight ? (
        <View className="flex-row items-baseline mb-2">
          <Text className="text-white text-xl font-semibold">{valueHighlight}</Text>
          <Text className="text-white text-[10px] ml-1">{valueSuffix}</Text>
        </View>
      ) : (
        <Text className="text-white text-base font-semibold text-center mb-2">{value}</Text>
      )}
      <Text className="text-[9px] text-center font-semibold" style={{ color: subtitleColor }}>{subtitle}</Text>
    </View>
  );
}

function MenuItem({ icon, title, subtitle, isNew, hideBorder, titleColor, onPress, iconContainerStyle }: any) {
  return (
    <Pressable onPress={onPress} className={`flex-row items-center p-4 ${!hideBorder ? 'border-b border-[#27272A]' : ''}`}>
      <View className={`w-10 h-10 rounded-full items-center justify-center mr-4 ${iconContainerStyle || 'bg-[#222222]'}`}>
        {icon}
      </View>
      <View className="flex-1 pr-2">
        <Text className="text-sm font-semibold" style={{ color: titleColor || '#FFFFFF' }}>{title}</Text>
        <Text className="text-[#8E8E93] text-[11px] mt-0.5">{subtitle}</Text>
      </View>
      {isNew && (
        <View className="bg-[#D4FF00] rounded-full px-2 py-0.5 mr-3">
          <Text className="text-black text-[10px] font-semibold">New</Text>
        </View>
      )}
      <CaretRight size={16} color="#48484A" weight="bold" />
    </Pressable>
  );
}