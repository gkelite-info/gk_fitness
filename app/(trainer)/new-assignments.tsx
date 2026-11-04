import React, { useMemo } from 'react';
import { View, ScrollView, Text, Image, Pressable, ActivityIndicator } from 'react-native';
import { CaretLeft, CaretRight, User } from 'phosphor-react-native';
import { useRouter } from 'expo-router';
import { useUser } from '@/context/UserContext';
import { useAssignedCustomersByTrainer } from '@/hooks/customerTrainers/useCustomerTrainers';
import { useGymTrainerByUserId } from '@/hooks/trainers/useGymTrainers';
import { useIndividualCustomerTrainers } from '@/hooks/individual/customer-trainer/individualCustomerTrainer';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

function getAddedDateString(dateStr?: string | Date | null): string {
  if (!dateStr) return 'Recently assigned';
  const d = new Date(dateStr);
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfYesterday = new Date(startOfToday);
  startOfYesterday.setDate(startOfYesterday.getDate() - 1);

  const startOfD = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  if (startOfD.getTime() === startOfToday.getTime()) {
    return 'Added today';
  } else if (startOfD.getTime() === startOfYesterday.getTime()) {
    return 'Added yesterday';
  } else {
    return `Added on ${d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}`;
  }
}

export default function NewAssignmentsScreen() {
  const router = useRouter();
  const { userId, email, role, globalTrainerId: userGlobalTrainerId } = useUser();

  const { data: globalTrainerRecord } = useQuery({
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

  const { data: trainerData } = useGymTrainerByUserId(userId ?? undefined);
  const loggedInGymTrainerId = trainerData?.trainer?.gymTrainerId;
  const effectiveGymTrainerId = loggedInGymTrainerId || userId;

  const { data: assignments, isLoading: loadingGym } = useAssignedCustomersByTrainer(effectiveGymTrainerId ?? undefined);

  const { data: individualAssignments, isLoading: loadingIndividual } = useIndividualCustomerTrainers(
    effectiveGlobalTrainerId ? { globalTrainerId: effectiveGlobalTrainerId } : undefined,
    { enabled: !!effectiveGlobalTrainerId }
  );

  const allAssignments = useMemo(() => {
    const list = isGlobalTrainer
      ? (individualAssignments || [])
      : (assignments && assignments.length > 0 ? assignments : (individualAssignments || []));

    return [...list].sort((a: any, b: any) => {
      const dateA = new Date(a.assignedOn || a.createdAt || 0).getTime();
      const dateB = new Date(b.assignedOn || b.createdAt || 0).getTime();
      return dateB - dateA;
    });
  }, [isGlobalTrainer, assignments, individualAssignments]);

  const isResolvingGlobalTrainer = isGlobalTrainerRole && !effectiveGlobalTrainerId;
  const isLoading = isGlobalTrainer
    ? (loadingIndividual || isResolvingGlobalTrainer)
    : (loadingGym || (loadingIndividual && isResolvingGlobalTrainer));

  return (
    <View className="flex-1 bg-[#09090B] pb-10">
      <View className="flex-row items-center px-5 pt-12 pb-4">
        <Pressable
          onPress={() => router.back()}
          className="w-10 h-10 rounded-xl border border-[#333333] items-center justify-center active:opacity-70"
        >
          <CaretLeft size={20} color="#CCFF00" />
        </Pressable>
        <Text className="flex-1 text-white text-xl font-semibold text-center mr-10">New Assignments</Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40, paddingTop: 10 }} showsVerticalScrollIndicator={false}>
        <View className="bg-[#141414] rounded-[20px] border border-[#1A1A1A] overflow-hidden mb-8">
          {isLoading ? (
            <View className="py-12 items-center justify-center">
              <ActivityIndicator size="large" color="#CCFF00" />
            </View>
          ) : allAssignments.length === 0 ? (
            <View className="py-12 items-center justify-center px-4">
              <User size={36} color="#666666" style={{ marginBottom: 8 }} />
              <Text className="text-[#A3A3A3] text-sm font-sans text-center">No assignments found</Text>
            </View>
          ) : (
            allAssignments.map((assignment: any, index: number) => {
              const isInd = !!assignment.individualCustomerTrainerId;
              const name = isInd ? (assignment.user?.name || 'Customer') : (assignment.customer?.fullName || 'Customer');
              const subtitle = isInd
                ? (assignment.timings || 'Individual PT')
                : (assignment.customer?.customId || 'Gym Client');

              let image = isInd
                ? (assignment.user?.profilePic || assignment.user?.profilePhoto || null)
                : (assignment.customer?.users?.profilePhoto || assignment.customer?.users?.profilePic || null);

              if (image && typeof image === 'string' && !image.startsWith('http') && !image.startsWith('file:') && !image.startsWith('data:')) {
                const pathInBucket = image.includes('/')
                  ? image
                  : `${isInd ? (assignment.user?.userId || assignment.userId) : (assignment.customer?.users?.userId || assignment.customer?.userId)}/${image}`;
                const { data: pUrl } = supabase.storage.from('profile_photos').getPublicUrl(pathInBucket);
                image = pUrl?.publicUrl || null;
              }

              const addedText = getAddedDateString(assignment.assignedOn || assignment.createdAt);
              const isLast = index === allAssignments.length - 1;
              const isPending = assignment.status === 'pending';

              return (
                <Pressable
                  key={assignment.individualCustomerTrainerId || assignment.customerTrainerId || index}
                  className={`flex-row items-center p-4 active:opacity-80 ${!isLast ? 'border-b border-[#1A1A1A]' : ''}`}
                  onPress={() => router.push('/(trainer)/pt-customers' as any)}
                >
                  <View className="w-12 h-12 bg-gray-700 rounded-full mr-4 overflow-hidden items-center justify-center">
                    {image ? (
                      <Image source={{ uri: image }} className="w-full h-full" />
                    ) : (
                      <User size={22} color="#A3A3A3" weight="fill" />
                    )}
                  </View>
                  <View className="flex-1 justify-center">
                    <View className="flex-row items-center mb-1">
                      <Text className="text-white text-base font-semibold mr-2" numberOfLines={1}>{name}</Text>
                      <View className={`${isPending ? 'bg-[#CCFF00]/20' : 'bg-[#4D5900]'} px-1.5 py-0.5 rounded`}>
                        <Text className="text-[#CCFF00] text-[10px] font-semibold">{isPending ? 'PENDING' : 'NEW'}</Text>
                      </View>
                    </View>
                    <Text className="text-[#A3A3A3] text-[11px] mb-0.5" numberOfLines={1}>{subtitle}</Text>
                    <Text className="text-[#A3A3A3] text-[11px]">{addedText}</Text>
                  </View>
                  <CaretRight size={16} color="#A3A3A3" style={{ marginLeft: 2 }} />
                </Pressable>
              );
            })
          )}
        </View>
      </ScrollView>
    </View>
  );
}
