import React, { useState, useMemo, useEffect } from 'react';
import { View, Text, ScrollView, TextInput, Pressable, Image, Platform, Modal, ActivityIndicator, FlatList } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { CaretLeft, CalendarBlank, MagnifyingGlass, CaretDown, Clock, Barbell, User } from 'phosphor-react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useUser } from '@/context/UserContext';
import { useAssignedCustomersByTrainer } from '@/hooks/customerTrainers/useCustomerTrainers';
import { useGymTrainerByUserId } from '@/hooks/trainers/useGymTrainers';
import { useIndividualCustomerTrainers } from '@/hooks/individual/customer-trainer/individualCustomerTrainer';
import { useTrainerSessionsForDate, useSaveTrainerSession } from '@/hooks/trainerSessions/useTrainerSessions';
import {
  useIndividualTrainerSessionsForDate,
  useSaveIndividualTrainerSession,
} from '@/hooks/individual/customer-trainer/individualTrainerSessions';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { CustomRefreshControl } from '@/components/CustomRefreshControl';
import ConfirmModal from '@/components/ConfirmModal';

function parseWeekDays(weekDays: any): string[] {
  if (!weekDays) return [];
  if (Array.isArray(weekDays)) {
    return weekDays.map((d) => String(d).trim().toLowerCase());
  }
  if (typeof weekDays === 'string') {
    const trimmed = weekDays.trim();
    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
          return parsed.map((d) => String(d).trim().toLowerCase());
        }
      } catch {
        // fallback
      }
    }
    return trimmed.split(',').map((d) => d.trim().toLowerCase()).filter(Boolean);
  }
  return [];
}

function isDayMatchingDate(weekDays: any, targetDate: Date): boolean {
  const days = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  const fullDays = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const dayIndex = targetDate.getDay();
  const todayShort = days[dayIndex];
  const todayFull = fullDays[dayIndex];
  const isoDayNumber = String(dayIndex === 0 ? 7 : dayIndex);
  const jsDayNumber = String(dayIndex);

  const parsed = parseWeekDays(weekDays);
  if (parsed.length === 0) return false;

  return parsed.some((d) => {
    return (
      d === todayShort ||
      d === todayFull ||
      d.startsWith(todayShort) ||
      todayFull.startsWith(d) ||
      d === isoDayNumber ||
      d === jsDayNumber ||
      d === 'daily' ||
      d === 'everyday' ||
      d === 'all'
    );
  });
}

function isExpiryValidForDate(expiryOn?: string | Date | null, targetDate: Date = new Date()): boolean {
  if (!expiryOn) return true;
  const expiryDate = new Date(expiryOn);
  if (isNaN(expiryDate.getTime())) return true;
  const startOfTarget = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 0, 0, 0, 0);
  const expiryEndOfDay = new Date(
    expiryDate.getFullYear(),
    expiryDate.getMonth(),
    expiryDate.getDate(),
    23,
    59,
    59,
    999
  );
  return expiryEndOfDay >= startOfTarget;
}

export default function PTSessions() {
  const router = useRouter();
  const { userId, email, role, globalTrainerId: userGlobalTrainerId } = useUser();

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

  const { data: trainerData } = useGymTrainerByUserId(userId ?? undefined);
  const loggedInGymTrainerId = trainerData?.trainer?.gymTrainerId;
  const effectiveGymTrainerId = loggedInGymTrainerId || userId;

  const { data: assignments, isLoading: loadingGym, refetch: refetchAssignments } = useAssignedCustomersByTrainer(effectiveGymTrainerId ?? undefined);

  const {
    data: individualAssignments,
    isLoading: loadingIndividual,
    refetch: refetchIndividual,
  } = useIndividualCustomerTrainers(
    effectiveGlobalTrainerId ? { globalTrainerId: effectiveGlobalTrainerId } : undefined,
    { enabled: !!effectiveGlobalTrainerId }
  );

  const [activeTab, setActiveTab] = useState<'gym' | 'individual'>(
    isGlobalTrainerRole ? 'individual' : 'gym'
  );

  useEffect(() => {
    if (isGlobalTrainer) {
      setActiveTab('individual');
    }
  }, [isGlobalTrainer]);

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date());

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
    }, 600);
    return () => clearTimeout(handler);
  }, [search]);

  const [showPicker, setShowPicker] = useState(false);

  const [statuses, setStatuses] = useState<Record<string, string>>({});
  const [statusModalVisible, setStatusModalVisible] = useState(false);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);

  const [confirmModalVisible, setConfirmModalVisible] = useState(false);
  const [pendingStatusChange, setPendingStatusChange] = useState<string | null>(null);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Completed': return '#10B981';
      case 'Upcoming': return '#FBBF24';
      case 'Cancelled': return '#F43F5E';
      default: return '#94A3B8';
    }
  };

  const getStatusBg = (status: string) => {
    switch (status) {
      case 'Completed': return 'rgba(16, 185, 129, 0.1)';
      case 'Upcoming': return 'rgba(251, 191, 36, 0.1)';
      case 'Cancelled': return 'rgba(244, 63, 94, 0.1)';
      default: return 'transparent';
    }
  };

  // 1. Filtered Gym Assignments
  const filteredGymAssignments = useMemo(() => {
    if (!assignments) return [];

    let filtered = assignments.filter((assignment: any) => {
      const isSelectedDay = isDayMatchingDate(assignment.weekDays, selectedDate);
      const isActive = assignment.isActive === true || String(assignment.isActive).toLowerCase() === 'true';
      const isNotExpired = isExpiryValidForDate(assignment.expiryOn, selectedDate);

      return isSelectedDay && isActive && isNotExpired;
    });

    if (debouncedSearch.trim() !== '') {
      const lowerSearch = debouncedSearch.toLowerCase();
      filtered = filtered.filter((a: any) => {
        const name = (a.customer?.fullName || '').toLowerCase();
        return name.includes(lowerSearch);
      });
    }

    return filtered;
  }, [assignments, selectedDate, debouncedSearch]);

  // 2. Filtered Individual Assignments (from table individual_customer_trainers)
  const filteredIndividualAssignments = useMemo(() => {
    if (!individualAssignments) return [];

    let filtered = individualAssignments.filter((assignment: any) => {
      const isApproved = !assignment.status || assignment.status.toLowerCase() === 'approved';
      const isActive = assignment.isActive !== false && String(assignment.isActive).toLowerCase() !== 'false';
      const isNotExpired = isExpiryValidForDate(assignment.expiryOn, selectedDate);
      const isSelectedDay = isDayMatchingDate(assignment.weekDays, selectedDate);
      const hasTimings = !!(assignment.timings && String(assignment.timings).trim() !== '');

      return isApproved && isActive && isNotExpired && isSelectedDay && hasTimings;
    });

    if (debouncedSearch.trim() !== '') {
      const lowerSearch = debouncedSearch.toLowerCase();
      filtered = filtered.filter((a: any) => {
        const name = (a.user?.name || a.user?.fullName || '').toLowerCase();
        const em = (a.user?.email || '').toLowerCase();
        const ph = (a.user?.phone || '').toLowerCase();
        return name.includes(lowerSearch) || em.includes(lowerSearch) || ph.includes(lowerSearch);
      });
    }

    return filtered;
  }, [individualAssignments, selectedDate, debouncedSearch]);

  const activeAssignments = activeTab === 'gym' ? filteredGymAssignments : filteredIndividualAssignments;

  // Gym Session IDs & Queries
  const gymIds = useMemo(() => {
    return filteredGymAssignments.map((a: any) => a.customerTrainerId).filter(Boolean) as string[];
  }, [filteredGymAssignments]);
  const { data: dbGymSessions, isLoading: isLoadingGymSessions, refetch: refetchGymSessions } = useTrainerSessionsForDate(gymIds, selectedDate);
  const { mutate: saveGymSession } = useSaveTrainerSession();

  // Individual Session IDs & Queries (for individual_trainer_sessions table)
  const individualIds = useMemo(() => {
    return filteredIndividualAssignments.map((a: any) => a.individualCustomerTrainerId).filter(Boolean) as string[];
  }, [filteredIndividualAssignments]);
  const {
    data: dbIndividualSessions,
    isLoading: isLoadingIndividualSessions,
    refetch: refetchIndividualSessions,
  } = useIndividualTrainerSessionsForDate(individualIds, selectedDate);
  const { mutate: saveIndividualSession } = useSaveIndividualTrainerSession();

  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const limit = 10;

  useEffect(() => {
    setPage(1);
  }, [activeTab, selectedDate, debouncedSearch]);

  const paginatedAssignments = useMemo(() => {
    return activeAssignments.slice(0, page * limit);
  }, [activeAssignments, page, limit]);

  useFocusEffect(
    React.useCallback(() => {
      // Do not re-fetch on every focus to prevent continuous background loading
    }, [])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      refetchAssignments(),
      refetchGlobalTrainerRecord?.(),
      refetchIndividual?.(),
      refetchGymSessions?.(),
      refetchIndividualSessions?.(),
    ]);
    setRefreshing(false);
  };

  const getSessionStatus = (id: string) => {
    if (statuses[id]) return statuses[id];

    const dbIndSession = dbIndividualSessions?.find((s: any) => s.individualCustomerTrainerId === id);
    if (dbIndSession) {
      if (dbIndSession.status === 'pending') return 'Upcoming';
      if (dbIndSession.status === 'completed') return 'Completed';
      if (dbIndSession.status === 'cancelled') return 'Cancelled';
    }

    const dbGymSession = dbGymSessions?.find((s: any) => s.customerTrainerId === id);
    if (dbGymSession) {
      if (dbGymSession.status === 'pending') return 'Upcoming';
      if (dbGymSession.status === 'completed') return 'Completed';
      if (dbGymSession.status === 'cancelled') return 'Cancelled';
    }

    return 'Upcoming';
  };

  const completedCount = activeAssignments.filter(a => getSessionStatus(a.individualCustomerTrainerId || a.customerTrainerId) === 'Completed').length;
  const upcomingCount = activeAssignments.filter(a => getSessionStatus(a.individualCustomerTrainerId || a.customerTrainerId) === 'Upcoming').length;
  const cancelledCount = activeAssignments.filter(a => getSessionStatus(a.individualCustomerTrainerId || a.customerTrainerId) === 'Cancelled').length;

  const formatDate = (date: Date) => {
    const parts = date.toDateString().split(' ');
    return `${parts[2]} ${parts[1]} ${parts[3]}`;
  };

  const isToday = selectedDate.toDateString() === new Date().toDateString();
  const isResolvingGlobalTrainer = isGlobalTrainerRole && !effectiveGlobalTrainerId;
  const isLoadingCurrent = activeTab === 'gym'
    ? (loadingGym || isLoadingGymSessions)
    : (loadingIndividual || isResolvingGlobalTrainer || isLoadingIndividualSessions);

  return (
    <View className="flex-1" style={{ backgroundColor: '#05070A' }}>
      <View className={`flex-row items-center justify-between px-5 pb-4 ${Platform.OS === 'ios' ? 'pt-16' : 'pt-5'}`}>
        <Pressable onPress={() => router.push('/(trainer)/home')} className="p-2 -ml-2 active:opacity-70">
          <CaretLeft size={24} color="#CCFF00" weight="bold" />
        </Pressable>
        <Text className="text-white text-xl font-semibold">PT Sessions</Text>
        <Pressable onPress={() => setShowPicker(true)} className="p-2 -mr-2 active:opacity-70">
          <CalendarBlank size={24} color="#CCFF00" />
        </Pressable>
      </View>

      <View className="flex-row px-5 mb-4 gap-3">
        <Pressable
          onPress={() => setActiveTab('gym')}
          className={`flex-1 py-3 rounded-xl items-center border active:opacity-80 ${activeTab === 'gym' ? 'bg-[#CCFF00] border-[#CCFF00]' : 'bg-[#121722] border-[#1E2637]'}`}
        >
          <Text className={`text-xs font-semibold ${activeTab === 'gym' ? 'text-black' : 'text-[#A3A3A3]'}`}>
            Gym Sessions ({filteredGymAssignments.length})
          </Text>
        </Pressable>

        <Pressable
          onPress={() => setActiveTab('individual')}
          className={`flex-1 py-3 rounded-xl items-center border active:opacity-80 ${activeTab === 'individual' ? 'bg-[#CCFF00] border-[#CCFF00]' : 'bg-[#121722] border-[#1E2637]'}`}
        >
          <Text className={`text-xs font-semibold ${activeTab === 'individual' ? 'text-black' : 'text-[#A3A3A3]'}`}>
            Individual Sessions ({filteredIndividualAssignments.length})
          </Text>
        </Pressable>
      </View>

      {showPicker && (
        <DateTimePicker
          value={selectedDate}
          mode="date"
          display="default"
          onValueChange={(event: any, selected?: Date) => {
            if (Platform.OS === 'android') {
              setShowPicker(false);
            }
            if (selected) {
              setSelectedDate(selected);
            }
          }}
          onDismiss={() => setShowPicker(false)}
        />
      )}

      <FlatList
        data={paginatedAssignments}
        keyExtractor={(item) => item.individualCustomerTrainerId || item.customerTrainerId}
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 40, paddingHorizontal: 20, paddingTop: 8 }}
        refreshControl={<CustomRefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListHeaderComponent={
          <>
            <View className="rounded-2xl p-4 flex-row items-center justify-between mb-6" style={{ backgroundColor: '#121722', borderColor: '#1E2637', borderWidth: 1 }}>
              <View className="flex-row items-center flex-1 pr-4 border-r" style={{ borderColor: '#1E2637' }}>
                <View className="w-12 h-12 rounded-full border-2 items-center justify-center mr-3" style={{ borderColor: '#CCFF00' }}>
                  <CalendarBlank size={24} color="#CCFF00" />
                </View>
                <View>
                  <Text style={{ color: '#94A3B8' }} className="text-xs font-sans">
                    {isToday ? "Today's\nSessions" : "Selected Date\nSessions"}
                  </Text>
                  <Text className="text-white text-2xl font-semibold mt-1">
                    {isLoadingCurrent ? <ActivityIndicator size="small" color="#CCFF00" /> : activeAssignments.length}
                  </Text>
                  <Text style={{ color: '#64748B' }} className="text-[10px] mt-1 font-sans">
                    {activeTab === 'individual' ? 'Individual PT' : 'Gym Total'}
                  </Text>
                </View>
              </View>
              <View className="flex-row justify-around flex-1 pl-2 gap-1.5">
                <View className="items-center">
                  <Text className="text-white text-lg font-semibold">{completedCount}</Text>
                  <View className="w-2 h-2 rounded-full mb-1 mt-1" style={{ backgroundColor: '#10B981' }} />
                  <Text style={{ color: '#94A3B8' }} className="text-[10px] font-sans">Completed</Text>
                </View>
                <View className="items-center">
                  <Text className="text-white text-lg font-semibold">{upcomingCount}</Text>
                  <View className="w-2 h-2 rounded-full mb-1 mt-1" style={{ backgroundColor: '#FBBF24' }} />
                  <Text style={{ color: '#94A3B8' }} className="text-[10px] font-sans">Upcoming</Text>
                </View>
                <View className="items-center">
                  <Text className="text-white text-lg font-semibold">{cancelledCount}</Text>
                  <View className="w-2 h-2 rounded-full mb-1 mt-1" style={{ backgroundColor: '#F43F5E' }} />
                  <Text style={{ color: '#94A3B8' }} className="text-[10px] font-sans">Cancelled</Text>
                </View>
              </View>
            </View>

            <View className="flex-row items-center rounded-xl px-4 py-1.5 mb-6" style={{ backgroundColor: '#121722', borderColor: '#1E2637', borderWidth: 1 }}>
              <MagnifyingGlass size={20} color="#64748B" />
              <TextInput
                placeholder={activeTab === 'individual' ? "Search individual sessions..." : "Search sessions..."}
                placeholderTextColor="#64748B"
                className="flex-1 ml-2 text-white font-sans"
                value={search}
                onChangeText={setSearch}
              />
            </View>

            <View className="flex-row justify-between items-center mb-4 px-1">
              <Text className="text-white font-semibold">
                <Text style={{ color: '#CCFF00' }}>{isToday ? 'Today' : selectedDate.toDateString().split(' ')[0]}</Text> <Text style={{ color: '#64748B' }}>• {formatDate(selectedDate)}</Text>
              </Text>
              <Text style={{ color: '#94A3B8' }} className="text-xs font-sans">{activeAssignments.length} Sessions</Text>
            </View>
          </>
        }
        renderItem={({ item: assignment }) => {
          const isIndividual = !!assignment.individualCustomerTrainerId;
          const sessionId = assignment.individualCustomerTrainerId || assignment.customerTrainerId;
          const status = getSessionStatus(sessionId);
          const name = isIndividual
            ? (assignment.user?.name || assignment.user?.fullName || 'Customer')
            : (assignment.customer?.fullName || 'Unknown Customer');

          let avatarUrl = isIndividual
            ? (assignment.user?.profilePic || assignment.user?.profilePhoto || null)
            : (assignment.customer?.users?.profilePhoto ||
              assignment.customer?.users?.profilePic ||
              assignment.customer?.profilePic ||
              assignment.customer?.profilePhoto || null);

          if (avatarUrl && typeof avatarUrl === 'string' && !avatarUrl.startsWith('http') && !avatarUrl.startsWith('file:') && !avatarUrl.startsWith('data:')) {
            const pathInBucket = avatarUrl.includes('/')
              ? avatarUrl
              : `${isIndividual ? (assignment.user?.userId || assignment.userId) : (assignment.customer?.users?.userId || assignment.customer?.userId)}/${avatarUrl}`;
            const { data: pUrl } = supabase.storage.from('profile_photos').getPublicUrl(pathInBucket);
            avatarUrl = pUrl?.publicUrl || null;
          }

          const type = isIndividual ? 'Individual PT' : 'Personal Training';

          return (
            <View className="rounded-2xl p-4 mb-3 flex-row justify-between" style={{ backgroundColor: '#121722', borderColor: '#1E2637', borderWidth: 1 }}>
              <View className="flex-row flex-1">
                {avatarUrl ? (
                  <Image source={{ uri: avatarUrl }} className="w-12 h-12 rounded-full mr-3 bg-gray-700" />
                ) : (
                  <View className="w-12 h-12 rounded-full mr-3 bg-[#1A1A1A] items-center justify-center border border-[#2A2A2A]">
                    <User size={24} color="#64748B" />
                  </View>
                )}
                <View className="justify-center flex-1">
                  <Text className="text-white text-base font-semibold mb-1" numberOfLines={1}>{name}</Text>
                  <View className="flex-row items-center">
                    {isIndividual ? (
                      <View className="bg-[#CCFF00]/10 px-1.5 py-0.5 rounded border border-[#CCFF00]/30 mr-1.5">
                        <Text className="text-[#CCFF00] text-[10px] font-semibold">Individual</Text>
                      </View>
                    ) : null}
                    <Barbell size={12} color="#64748B" style={{ marginRight: 2 }} />
                    <Text style={{ color: '#94A3B8' }} className="text-xs font-sans">{type}</Text>
                  </View>
                </View>
              </View>

              <View className="items-end justify-between py-1">
                <Pressable
                  className="px-3 py-1 rounded-full flex-row items-center border active:opacity-70"
                  style={{ backgroundColor: getStatusBg(status), borderColor: getStatusColor(status) }}
                  onPress={() => {
                    setSelectedSessionId(sessionId);
                    setStatusModalVisible(true);
                  }}
                >
                  <Text style={{ color: getStatusColor(status) }} className="text-xs mr-1 font-medium">{status}</Text>
                  <CaretDown size={12} color={getStatusColor(status)} weight="bold" />
                </Pressable>
                <View className="flex-row items-center mt-2">
                  <Clock size={12} color="#64748B" style={{ marginRight: 2 }} />
                  <Text style={{ color: '#94A3B8' }} className="text-[10px] font-sans">{assignment.timings || 'Flexible Schedule'}</Text>
                </View>
              </View>
            </View>
          );
        }}
        ListEmptyComponent={
          isLoadingCurrent ? (
            <ActivityIndicator size="large" color="#CCFF00" style={{ marginTop: 20 }} />
          ) : (
            <Text className="text-center text-[#94A3B8] mt-10 font-sans">No sessions scheduled for this date.</Text>
          )
        }
        onEndReached={() => {
          if (page * limit < activeAssignments.length) {
            setPage(prev => prev + 1);
          }
        }}
        onEndReachedThreshold={0.5}
        ListFooterComponent={
          activeAssignments.length > 0 ? (
            page * limit < activeAssignments.length ? (
              <ActivityIndicator size="small" color="#CCFF00" style={{ marginTop: 20, marginBottom: 20 }} />
            ) : (
              <Text className="text-center text-[#64748B] text-xs font-sans mt-4 mb-8">
                — End of Records —
              </Text>
            )
          ) : null
        }
      />

      <Modal visible={statusModalVisible} transparent={true} animationType="fade">
        <Pressable className="flex-1 bg-black/50 justify-center items-center" onPress={() => setStatusModalVisible(false)}>
          <View className="bg-[#121722] border border-[#1E2637] w-64 rounded-2xl p-2 overflow-hidden">
            <Text className="text-white font-semibold mb-2 mt-2 text-center font-sans text-lg">Change Status</Text>
            {['Upcoming', 'Completed', 'Cancelled'].map((status, index) => (
              <Pressable
                key={status}
                className={`py-3 items-center ${index !== 2 ? 'border-b border-[#1A1A1A]' : ''}`}
                onPress={() => {
                  if (selectedSessionId) {
                    setPendingStatusChange(status);
                    setConfirmModalVisible(true);
                  }
                  setStatusModalVisible(false);
                }}
              >
                <Text style={{ color: getStatusColor(status) }} className="font-medium">{status}</Text>
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>

      <ConfirmModal
        visible={confirmModalVisible}
        onClose={() => {
          setConfirmModalVisible(false);
          setPendingStatusChange(null);
        }}
        onConfirm={() => {
          if (selectedSessionId && pendingStatusChange) {
            setStatuses(prev => ({ ...prev, [selectedSessionId]: pendingStatusChange }));

            const backendStatus = pendingStatusChange === 'Upcoming' ? 'pending' : pendingStatusChange.toLowerCase();

            // Find the selected assignment
            const selectedAssignment =
              filteredIndividualAssignments.find((a: any) => a.individualCustomerTrainerId === selectedSessionId) ||
              filteredGymAssignments.find((a: any) => a.customerTrainerId === selectedSessionId) ||
              activeAssignments.find((a: any) => (a.individualCustomerTrainerId || a.customerTrainerId) === selectedSessionId);

            const isIndividual =
              activeTab === 'individual' ||
              isGlobalTrainer ||
              !!selectedAssignment?.individualCustomerTrainerId;

            if (isIndividual) {
              const existingSession = dbIndividualSessions?.find(
                (s: any) => s.individualCustomerTrainerId === selectedSessionId
              );

              const targetGlobalTrainerId =
                selectedAssignment?.globalTrainerId ||
                effectiveGlobalTrainerId ||
                globalTrainerRecord?.globalTrainerId ||
                userGlobalTrainerId ||
                '';

              saveIndividualSession(
                {
                  individualTrainerSessionId: existingSession?.individualTrainerSessionId,
                  individualCustomerTrainerId: selectedSessionId,
                  globalTrainerId: targetGlobalTrainerId,
                  sessionDate: selectedDate,
                  status: backendStatus as any,
                },
                {
                  onSuccess: () => {
                    refetchIndividualSessions();
                  },
                  onError: (err) => {
                    console.error('[PTSessions] Failed to save individual session:', err);
                  },
                }
              );
            } else {
              const existingSession = dbGymSessions?.find(
                (s: any) => s.customerTrainerId === selectedSessionId
              );

              saveGymSession(
                {
                  trainerSessionId: existingSession?.trainerSessionId,
                  customerTrainerId: selectedSessionId,
                  gymTrainerId: loggedInGymTrainerId || effectiveGymTrainerId || '',
                  sessionDate: selectedDate,
                  status: backendStatus as any,
                },
                {
                  onSuccess: () => {
                    refetchGymSessions();
                  },
                  onError: (err) => {
                    console.error('[PTSessions] Failed to save gym session:', err);
                  },
                }
              );
            }
          }
          setConfirmModalVisible(false);
          setPendingStatusChange(null);
        }}
        title="Change Status"
        description={`Are you sure you want to change the status to ${pendingStatusChange}?`}
        confirmText="Confirm"
        confirmButtonColor="bg-[#CCFF00]"
        confirmTextColor="text-black"
      />
    </View>
  );
}
