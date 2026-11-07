import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, Pressable, TextInput, ActivityIndicator, FlatList, Image } from 'react-native';
import { ArrowLeft, MagnifyingGlass, Funnel, CalendarBlank, ArrowRight, User } from 'phosphor-react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useUser } from '@/context/UserContext';
import { usePaginatedAssignedCustomersByTrainer } from '@/hooks/customerTrainers/useCustomerTrainers';
import { useGymTrainerByUserId } from '@/hooks/trainers/useGymTrainers';
import { useIndividualCustomerTrainers } from '@/hooks/individual/customer-trainer/individualCustomerTrainer';
import { useTrainerWorkoutPlansByCreator } from '@/hooks/trainerWorkoutPlans/useTrainerWorkoutPlans';
import { useIndividualTrainerWorkoutPlans } from '@/hooks/individualTrainerWorkoutPlans';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { CustomRefreshControl } from '@/components/CustomRefreshControl';

export default function CreateWorkoutPlanScreen() {
  const router = useRouter();
  const { userId, email, role, globalTrainerId: userGlobalTrainerId } = useUser();

  // Resolve Global Trainer Record
  const { data: globalTrainerRecord, refetch: refetchGlobalTrainerRecord } = useQuery({
    queryKey: ['myGlobalTrainerId', userId, email],
    queryFn: async () => {
      if (!userId && !email) return null;
      let query = supabase.from('global_trainers').select('globalTrainerId');
      if (userId && email) {
        query = query.or(`userId.eq.${userId},email.eq.${email}`);
      } else if (userId) {
        query = query.eq('userId', userId);
      } else {
        query = query.eq('email', email);
      }
      const { data: gt } = await query.maybeSingle();
      return gt;
    },
    enabled: !!(userId || email),
  });

  const effectiveGlobalTrainerId = globalTrainerRecord?.globalTrainerId || userGlobalTrainerId;
  const isGlobalTrainerRole = (role || '').toLowerCase().replace(/[\s_-]/g, '') === 'globaltrainer';
  const isGlobalTrainer = isGlobalTrainerRole || !!effectiveGlobalTrainerId;

  // Resolve Gym Trainer ID
  const { data: trainerData } = useGymTrainerByUserId(userId ?? undefined);
  const loggedInGymTrainerId = trainerData?.trainer?.gymTrainerId;
  const effectiveGymTrainerId = loggedInGymTrainerId || userId;

  const [activeTab, setActiveTab] = useState<'gym' | 'individual'>(isGlobalTrainer ? 'individual' : 'gym');

  useEffect(() => {
    if (isGlobalTrainer) {
      setActiveTab('individual');
    }
  }, [isGlobalTrainer]);

  const { data: trainerPlans, refetch: refetchTrainerPlans } = useTrainerWorkoutPlansByCreator(userId ?? undefined);
  const { data: individualTrainerPlans, refetch: refetchIndividualTrainerPlans } =
    useIndividualTrainerWorkoutPlans(
      undefined,
      effectiveGlobalTrainerId ?? undefined,
      undefined,
      { enabled: !!effectiveGlobalTrainerId }
    );

  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);

  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  const [accumulatedCustomers, setAccumulatedCustomers] = useState<any[]>([]);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 600);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  // 1. Gym Trainer Assigned Customers
  const {
    data: gymData,
    isLoading: isLoadingGym,
    isFetching: isFetchingGym,
    refetch: refetchGym,
  } = usePaginatedAssignedCustomersByTrainer(effectiveGymTrainerId ?? undefined, page, limit, debouncedSearch);

  // 2. Individual Customer Trainer Assigned Customers
  const {
    data: individualAssignments,
    isLoading: loadingIndividual,
    refetch: refetchIndividual,
  } = useIndividualCustomerTrainers(
    effectiveGlobalTrainerId
      ? { globalTrainerId: effectiveGlobalTrainerId }
      : undefined,
    { enabled: !!effectiveGlobalTrainerId }
  );

  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([
      activeTab === 'gym' ? (page === 1 ? refetchGym() : setPage(1)) : refetchIndividual(),
      refetchTrainerPlans(),
      refetchIndividualTrainerPlans(),
      refetchGlobalTrainerRecord(),
    ]);
    setRefreshing(false);
  }, [activeTab, page, refetchGym, refetchIndividual, refetchTrainerPlans, refetchIndividualTrainerPlans, refetchGlobalTrainerRecord]);

  useFocusEffect(
    useCallback(() => {
      // Do not re-fetch on focus to avoid continuous background reload
    }, [])
  );

  const gymTotal = gymData?.total || 0;
  const totalPages = Math.ceil(gymTotal / limit) || 1;

  useEffect(() => {
    if (gymData?.data) {
      if (page === 1) {
        setAccumulatedCustomers(gymData.data);
      } else {
        setAccumulatedCustomers((prev) => {
          const prevIds = new Set(prev.map((a: any) => a.customerTrainerId));
          const newUnique = gymData.data.filter((a: any) => !prevIds.has(a.customerTrainerId));
          return [...prev, ...newUnique];
        });
      }
    }
  }, [gymData, page]);

  const hasMore = page < totalPages;

  // Filter individual customers (approved status + search query)
  const filteredIndividual = useMemo(() => {
    if (!individualAssignments) return [];
    const approvedOnly = individualAssignments.filter(
      (a: any) => !a.status || a.status.toLowerCase() === 'approved'
    );
    if (!debouncedSearch.trim()) return approvedOnly;
    const q = debouncedSearch.toLowerCase().trim();
    return approvedOnly.filter((a: any) => {
      const name = (a.user?.name || a.user?.fullName || '').toLowerCase();
      const em = (a.user?.email || '').toLowerCase();
      const ph = a.user?.phone || '';
      return name.includes(q) || em.includes(q) || ph.includes(q);
    });
  }, [individualAssignments, debouncedSearch]);

  const individualTotal = individualAssignments?.filter(
    (a: any) => !a.status || a.status.toLowerCase() === 'approved'
  )?.length || 0;

  const currentTotal = activeTab === 'gym' ? gymTotal : (filteredIndividual?.length || 0);
  const currentList = activeTab === 'gym' ? accumulatedCustomers : filteredIndividual;
  const isLoadingCurrent = activeTab === 'gym' ? (isLoadingGym && page === 1) : loadingIndividual;

  const renderHeader = () => (
    <>
      <View className="flex-row items-center mb-8 pt-2">
        <Pressable
          onPress={() => router.push('/(trainer)/home')}
          className="w-10 h-10 rounded-full border border-[#2A2A2A] items-center justify-center mr-4 active:opacity-70 bg-[#1A1A1A]"
        >
          <ArrowLeft size={20} color="#CCFF00" />
        </Pressable>
        <View>
          <Text className="text-white text-2xl font-semibold">Create Workout Plan</Text>
          <Text className="text-[#6B7280] text-[11px] mt-1">Select a PT customer to create a workout plan for.</Text>
        </View>
      </View>

      <View className="flex-row items-center mb-5">
        <View className="flex-1 flex-row items-center bg-[#1A1A1A] rounded-2xl px-4 py-1.5 border border-[#2A2A2A] mr-3">
          <MagnifyingGlass size={20} color="#6B7280" />
          <TextInput
            placeholder="Search assigned customers.."
            placeholderTextColor="#6B7280"
            className="flex-1 text-white ml-3 text-sm font-sans"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
        <Pressable className="w-[52px] h-[52px] rounded-2xl bg-[#1A1A1A] border border-[#2A2A2A] items-center justify-center active:opacity-70">
          <Funnel size={20} color="#CCFF00" />
        </Pressable>
      </View>

      {/* Tabs for Gym and Individual Clients */}
      <View className="flex-row mb-6 gap-3">
        <Pressable
          onPress={() => {
            setActiveTab('gym');
            setSelectedCustomerId(null);
          }}
          className={`flex-1 py-3 rounded-xl items-center border active:opacity-80 ${activeTab === 'gym' ? 'bg-[#CCFF00] border-[#CCFF00]' : 'bg-[#18181B] border-[#27272A]'}`}
        >
          <Text className={`text-xs font-semibold ${activeTab === 'gym' ? 'text-black' : 'text-[#A3A3A3]'}`}>
            Gym Clients ({gymTotal})
          </Text>
        </Pressable>

        <Pressable
          onPress={() => {
            setActiveTab('individual');
            setSelectedCustomerId(null);
          }}
          className={`flex-1 py-3 rounded-xl items-center border active:opacity-80 ${activeTab === 'individual' ? 'bg-[#CCFF00] border-[#CCFF00]' : 'bg-[#18181B] border-[#27272A]'}`}
        >
          <Text className={`text-xs font-semibold ${activeTab === 'individual' ? 'text-black' : 'text-[#A3A3A3]'}`}>
            Individual Clients ({individualTotal})
          </Text>
        </Pressable>
      </View>

      <View className="flex-row items-center justify-between mb-4">
        <Text className="text-white text-base font-medium">
          {activeTab === 'gym' ? 'Assigned Gym Customers' : 'Assigned Individual Clients'}
        </Text>
        <Text className="text-[#CCFF00] text-xs font-semibold">{currentTotal} Customers</Text>
      </View>

      {!isLoadingCurrent && currentList.length === 0 && (
        <View className="py-10 items-center justify-center">
          <Text className="text-[#6B7280] text-sm">No customers found.</Text>
        </View>
      )}
    </>
  );

  const renderFooter = () => {
    if (activeTab === 'gym') {
      if (isFetchingGym) {
        return (
          <View className="py-4 items-center">
            <ActivityIndicator size="small" color="#CCFF00" />
          </View>
        );
      }
      if (!hasMore && accumulatedCustomers.length > 0) {
        return (
          <View className="py-6 items-center">
            <Text className="text-[#6B7280] text-xs font-medium">You've reached the end of the list</Text>
          </View>
        );
      }
    } else {
      if (loadingIndividual) {
        return (
          <View className="py-4 items-center">
            <ActivityIndicator size="small" color="#CCFF00" />
          </View>
        );
      }
      if (filteredIndividual.length > 0) {
        return (
          <View className="py-6 items-center">
            <Text className="text-[#6B7280] text-xs font-medium">You've reached the end of the list</Text>
          </View>
        );
      }
    }
    return null;
  };

  const renderItem = ({ item }: { item: any }) => {
    const isInd = activeTab === 'individual' || !!item.individualCustomerTrainerId;

    let targetId: string;
    let customerName: string;
    let subtitle: string;
    let profilePic: string | null = null;
    let hasActivePlan = false;
    let isExpired = false;

    if (isInd) {
      targetId = item.userId || item.user?.userId || item.individualCustomerTrainerId;
      customerName = item.user?.name || item.user?.fullName || 'Customer';
      subtitle = item.timings ? item.timings : 'Individual PT';

      let image = item.user?.profilePic || item.user?.profilePhoto || null;
      if (image && typeof image === 'string' && !image.startsWith('http') && !image.startsWith('file:') && !image.startsWith('data:')) {
        const pathInBucket = image.includes('/') ? image : `${targetId}/${image}`;
        const { data: pUrl } = supabase.storage.from('profile_photos').getPublicUrl(pathInBucket);
        image = pUrl?.publicUrl || null;
      }
      profilePic = image;

      if (item.expiryOn) {
        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
        const expDate = new Date(item.expiryOn);
        const expiryEndOfDay = new Date(expDate.getFullYear(), expDate.getMonth(), expDate.getDate(), 23, 59, 59, 999);
        isExpired = expiryEndOfDay < startOfToday;
      }

      // For individual clients / global trainer, STRICTLY check individualTrainerPlans (individual_trainer_workout_plans)
      const hasIndPlan = !!individualTrainerPlans?.some(
        (plan: any) =>
          (plan.userId === targetId ||
            plan.userId === item.individualCustomerTrainerId ||
            plan.userId === item.userId ||
            plan.userId === item.user?.userId) &&
          plan.isActive
      );
      hasActivePlan = hasIndPlan;
    } else {
      const customer = item.customer;
      if (!customer) return null;
      targetId = customer.userId || customer.customerId || item.customerId;
      customerName = customer.fullName || 'Unknown';
      subtitle = customer.customId || 'No ID';
      profilePic = customer.users?.profilePhoto || customer.users?.profilePic || null;

      const hasTrainerPlan = !!trainerPlans?.some(
        (plan: any) =>
          (plan.userId === targetId ||
            plan.userId === customer.customerId ||
            plan.userId === customer.userId ||
            plan.userId === item.customerId) &&
          plan.isActive
      );
      hasActivePlan = hasTrainerPlan;
    }

    const isSelected = selectedCustomerId === targetId;

    return (
      <Pressable
        onPress={() => setSelectedCustomerId(targetId)}
        className={`bg-[#1A1A1A] rounded-[20px] p-4 mb-3 flex-row items-center border active:opacity-80 ${isSelected ? 'border-[#CCFF00]' : 'border-[#1A1A1A]'}`}
      >
        <View className="w-14 h-14 bg-[#2A2A2A] rounded-full items-center justify-center mr-4 overflow-hidden border border-[#3A3A3A]">
          {profilePic ? (
            <Image source={{ uri: profilePic }} className="w-full h-full" />
          ) : (
            <User size={24} color="#6B7280" weight="fill" />
          )}
        </View>

        <View className="flex-1">
          <Text className="text-white text-[17px] font-semibold mb-1">{customerName}</Text>
          <View className="flex-row items-center mb-2">
            <View className="bg-[#2A2A2A] self-start px-2 py-0.5 rounded-md mr-2">
              <Text className="text-[#CCFF00] text-[10px] font-medium">{subtitle}</Text>
            </View>
            {isExpired && (
              <View className="bg-red-950/60 border border-red-500/40 px-2 py-0.5 rounded-md">
                <Text className="text-red-400 text-[10px] font-medium">Expired</Text>
              </View>
            )}
          </View>
          <View className="flex-row items-center">
            <CalendarBlank size={12} color={hasActivePlan ? '#10B981' : '#CCFF00'} weight="regular" />
            <Text className={`text-[11px] ml-1.5 font-medium ${hasActivePlan ? 'text-[#10B981]' : 'text-[#CCFF00]'}`}>
              {hasActivePlan ? 'Active workout plan' : 'No workout plan yet'}
            </Text>
          </View>
        </View>

        <View
          className={`w-[22px] h-[22px] rounded-full border-[2px] items-center justify-center ${isSelected ? 'border-[#CCFF00]' : 'border-[#6B7280]'}`}
        >
          {isSelected && <View className="w-[12px] h-[12px] rounded-full bg-[#CCFF00]" />}
        </View>
      </Pressable>
    );
  };

  const handleContinue = async () => {
    if (!selectedCustomerId) {
      console.warn('[CreateWorkoutPlan] handleContinue pressed with no selected customer');
      return;
    }
    let customerName = 'Customer';
    let chosenUserId = selectedCustomerId;
    let customerGender: 'male' | 'female' = 'male';

    if (activeTab === 'individual') {
      const selected = filteredIndividual.find(
        (a: any) =>
          (a.userId || a.user?.userId || a.individualCustomerTrainerId) === selectedCustomerId ||
          a.userId === selectedCustomerId
      );
      customerName = selected?.user?.name || selected?.user?.fullName || 'Customer';
      chosenUserId = selected?.userId || selected?.user?.userId || selectedCustomerId;
      const rawGender = selected?.user?.gender || (selected as any)?.gender;
      if (rawGender && typeof rawGender === 'string') {
        const lower = rawGender.toLowerCase().trim();
        if (lower === 'female' || lower === 'male') {
          customerGender = lower as 'male' | 'female';
        }
      }
    } else {
      const selected = accumulatedCustomers.find(
        (c: any) =>
          (c.customer?.userId || c.customer?.customerId || c.customerId) === selectedCustomerId ||
          c.customer?.userId === selectedCustomerId ||
          c.customer?.customerId === selectedCustomerId ||
          c.customerId === selectedCustomerId
      );
      customerName = selected?.customer?.fullName || 'Customer';
      chosenUserId =
        selected?.customer?.userId ||
        selected?.customer?.customerId ||
        selected?.customerId ||
        selectedCustomerId;
      const rawGender = selected?.customer?.gender || selected?.customer?.users?.gender || selected?.gender;
      if (rawGender && typeof rawGender === 'string') {
        const lower = rawGender.toLowerCase().trim();
        if (lower === 'female' || lower === 'male') {
          customerGender = lower as 'male' | 'female';
        }
      }
    }

    // Explicitly check DB to strictly verify customer's gender
    try {
      // 1. Check gym_customers table
      const { data: gc } = await supabase
        .from('gym_customers')
        .select('gender, userId')
        .or(`customerId.eq.${selectedCustomerId},userId.eq.${chosenUserId},customerId.eq.${chosenUserId}`)
        .maybeSingle();

      if (gc?.gender) {
        const g = gc.gender.toLowerCase().trim();
        if (g === 'female' || g === 'male') {
          customerGender = g as 'male' | 'female';
          if (gc.userId) chosenUserId = gc.userId;
        }
      }

      // 2. Check individual_customer_trainers table
      if (activeTab === 'individual' || !gc?.gender) {
        const { data: ict } = await supabase
          .from('individual_customer_trainers')
          .select('userId, user:users!individual_customer_trainers_userId_fkey(gender)')
          .or(`individualCustomerTrainerId.eq.${selectedCustomerId},userId.eq.${chosenUserId},userId.eq.${selectedCustomerId}`)
          .maybeSingle();

        const indGender = (ict as any)?.user?.gender;
        if (indGender) {
          const g = indGender.toLowerCase().trim();
          if (g === 'female' || g === 'male') {
            customerGender = g as 'male' | 'female';
            if (ict?.userId) chosenUserId = ict.userId;
          }
        }
      }

      // 3. Check public.users table directly
      const idForUsers = chosenUserId || selectedCustomerId;
      if (idForUsers) {
        const { data: u } = await supabase
          .from('users')
          .select('userId, gender')
          .eq('userId', idForUsers)
          .maybeSingle();
        if (u?.gender) {
          const g = u.gender.toLowerCase().trim();
          if (g === 'female' || g === 'male') {
            customerGender = g as 'male' | 'female';
          }
        }
      }
    } catch (err) {
      console.warn('[CreateWorkoutPlan] Could not verify gender from DB:', err);
    }

    router.push({
      pathname: '/(trainer)/workoutPlan' as any,
      params: {
        targetUserId: chosenUserId,
        customerName,
        customerGender,
        isGlobalTrainer: isGlobalTrainer ? 'true' : 'false',
        globalTrainerId: effectiveGlobalTrainerId || '',
      },
    });
  };

  return (
    <View className="flex-1 bg-[#09090B]">
      <FlatList
        data={currentList}
        keyExtractor={(item) =>
          item.individualCustomerTrainerId ||
          item.customerTrainerId ||
          item.userId ||
          item.customer?.customerId ||
          Math.random().toString()
        }
        renderItem={renderItem}
        ListHeaderComponent={renderHeader}
        ListFooterComponent={renderFooter}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 120, paddingTop: 10 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<CustomRefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        onEndReached={() => {
          if (activeTab === 'gym' && hasMore && !isFetchingGym) {
            setPage((p) => p + 1);
          }
        }}
        onEndReachedThreshold={0.5}
      />
      <View className="absolute bottom-28 left-5 right-5">
        <Pressable
          onPress={handleContinue}
          disabled={!selectedCustomerId}
          className={`rounded-[24px] flex-row items-center justify-center py-4 active:opacity-80 ${selectedCustomerId ? 'bg-[#CCFF00]' : 'bg-[#2A2A2A] opacity-50'
            }`}
        >
          <Text className={`text-[17px] font-semibold mr-2 ${selectedCustomerId ? 'text-black' : 'text-[#6B7280]'}`}>
            Continue
          </Text>
          <ArrowRight size={20} color={selectedCustomerId ? '#000' : '#6B7280'} weight="bold" />
        </Pressable>
      </View>
    </View>
  );
}
