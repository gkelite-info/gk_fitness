import React, { useState, useMemo, useEffect } from 'react';
import { View, Text, ScrollView, TextInput, Pressable, Image, Platform, Modal, ActivityIndicator, FlatList } from 'react-native';
import { useRouter } from 'expo-router';
import { CaretLeft, CalendarBlank, MagnifyingGlass, CaretDown, Clock, Barbell, User } from 'phosphor-react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useUser } from '@/context/UserContext';
import { useAssignedCustomersByTrainer } from '@/hooks/customerTrainers/useCustomerTrainers';
import { useGymTrainerByUserId } from '@/hooks/trainers/useGymTrainers';
import { useTrainerSessionsForDate, useSaveTrainerSession } from '@/hooks/trainerSessions/useTrainerSessions';
import { CustomRefreshControl } from '@/components/CustomRefreshControl';
import ConfirmModal from '@/components/ConfirmModal';

export default function PTSessions() {
  const router = useRouter();
  const { userId } = useUser();
  const { data: trainerData } = useGymTrainerByUserId(userId ?? undefined);
  const loggedInGymTrainerId = trainerData?.trainer?.gymTrainerId;
  const { data: assignments, isLoading, refetch: refetchAssignments } = useAssignedCustomersByTrainer(loggedInGymTrainerId);

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

  const filteredAssignments = useMemo(() => {
    if (!assignments) return [];

    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const fullDays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const selectedDay = days[selectedDate.getDay()].toLowerCase();
    const selectedDayFull = fullDays[selectedDate.getDay()].toLowerCase();

    const startOfSelected = new Date(selectedDate);
    startOfSelected.setHours(0, 0, 0, 0);

    let filtered = assignments.filter((assignment: any) => {
      // Like home.tsx, but we also filter by the specific day of the week selected in the calendar
      const daysArr = (assignment.weekDays || []).map((d: string) => String(d).toLowerCase());

      // If we only checked isActive and expiryOn, every day would show all active customers.
      // So we check if the selected day is in their assigned weekDays.
      // NOTE: If your customer is only assigned Mon-Fri, they will NOT show up if you select Saturday!
      const isSelectedDay = daysArr.includes(selectedDay) || daysArr.includes(selectedDayFull);

      const isActive = assignment.isActive === true || String(assignment.isActive).toLowerCase() === 'true';

      let isNotExpired = true;
      if (assignment.expiryOn) {
        const expiryDate = new Date(assignment.expiryOn);
        isNotExpired = expiryDate >= startOfSelected;
      }

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

  const customerTrainerIds = useMemo(() => filteredAssignments.map((a: any) => a.customerTrainerId), [filteredAssignments]);
  const { data: dbSessions, isLoading: isLoadingSessions, refetch: refetchSessions } = useTrainerSessionsForDate(customerTrainerIds, selectedDate);
  const { mutate: saveSession } = useSaveTrainerSession();

  const [refreshing, setRefreshing] = useState(false);

  const [page, setPage] = useState(1);
  const limit = 10;

  useEffect(() => {
    setPage(1);
  }, [selectedDate, debouncedSearch]);

  const paginatedAssignments = useMemo(() => {
    return filteredAssignments.slice(0, page * limit);
  }, [filteredAssignments, page, limit]);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      refetchAssignments(),
      refetchSessions()
    ]);
    setRefreshing(false);
  };

  const getSessionStatus = (id: string) => {
    if (statuses[id]) return statuses[id];
    const dbSession = dbSessions?.find((s: any) => s.customerTrainerId === id);
    if (dbSession) {
      if (dbSession.status === 'pending') return 'Upcoming';
      if (dbSession.status === 'completed') return 'Completed';
      if (dbSession.status === 'cancelled') return 'Cancelled';
    }
    return 'Upcoming';
  };

  const completedCount = filteredAssignments.filter(a => getSessionStatus(a.customerTrainerId) === 'Completed').length;
  const upcomingCount = filteredAssignments.filter(a => getSessionStatus(a.customerTrainerId) === 'Upcoming').length;
  const cancelledCount = filteredAssignments.filter(a => getSessionStatus(a.customerTrainerId) === 'Cancelled').length;

  const formatDate = (date: Date) => {
    const parts = date.toDateString().split(' ');
    // e.g. "Sat", "Jul", "29", "2026"
    return `${parts[2]} ${parts[1]} ${parts[3]}`;
  };

  const isToday = selectedDate.toDateString() === new Date().toDateString();

  return (
    <View className="flex-1" style={{ backgroundColor: '#05070A' }}>
      <View className={`flex-row items-center justify-between px-5 pb-4 ${Platform.OS === 'ios' ? 'pt-16' : 'pt-5'}`}>
        <Pressable onPress={() => router.back()} className="p-2 -ml-2 active:opacity-70">
          <CaretLeft size={24} color="#CCFF00" weight="bold" />
        </Pressable>
        <Text className="text-white text-xl font-semibold">PT Sessions</Text>
        <Pressable onPress={() => setShowPicker(true)} className="p-2 -mr-2 active:opacity-70">
          <CalendarBlank size={24} color="#CCFF00" />
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
        keyExtractor={(item) => item.customerTrainerId}
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
                    {isLoading ? <ActivityIndicator size="small" color="#CCFF00" /> : filteredAssignments.length}
                  </Text>
                  <Text style={{ color: '#64748B' }} className="text-[10px] mt-1 font-sans">Total Sessions</Text>
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
                placeholder="Search sessions..."
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
              <Text style={{ color: '#94A3B8' }} className="text-xs font-sans">{filteredAssignments.length} Sessions</Text>
            </View>
          </>
        }
        renderItem={({ item: assignment }) => {
          const status = getSessionStatus(assignment.customerTrainerId);
          const name = assignment.customer?.fullName || 'Unknown Customer';
          const avatarUrl = assignment.customer?.users?.profilePhoto ||
            assignment.customer?.users?.profilePic ||
            assignment.customer?.profilePic ||
            assignment.customer?.profilePhoto;
          const type = 'Personal Training';

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
                  <Text className="text-white text-base font-semibold mb-1">{name}</Text>
                  <View className="flex-row items-center">
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
                    setSelectedSessionId(assignment.customerTrainerId);
                    setStatusModalVisible(true);
                  }}
                >
                  <Text style={{ color: getStatusColor(status) }} className="text-xs mr-1 font-medium">{status}</Text>
                  <CaretDown size={12} color={getStatusColor(status)} weight="bold" />
                </Pressable>
                <View className="flex-row items-center mt-2">
                  <Clock size={12} color="#64748B" style={{ marginRight: 2 }} />
                  <Text style={{ color: '#94A3B8' }} className="text-[10px] font-sans">{assignment.timings || 'TBD'}</Text>
                </View>
              </View>
            </View>
          );
        }}
        ListEmptyComponent={
          isLoading || isLoadingSessions ? (
            <ActivityIndicator size="large" color="#CCFF00" style={{ marginTop: 20 }} />
          ) : (
            <Text className="text-center text-[#94A3B8] mt-10 font-sans">No sessions scheduled for this date.</Text>
          )
        }
        onEndReached={() => {
          if (page * limit < filteredAssignments.length) {
            setPage(prev => prev + 1);
          }
        }}
        onEndReachedThreshold={0.5}
        ListFooterComponent={
          filteredAssignments.length > 0 ? (
            page * limit < filteredAssignments.length ? (
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
            const existingSession = dbSessions?.find((s: any) => s.customerTrainerId === selectedSessionId);

            saveSession({
              trainerSessionId: existingSession?.trainerSessionId,
              customerTrainerId: selectedSessionId,
              gymTrainerId: loggedInGymTrainerId!,
              sessionDate: selectedDate,
              status: backendStatus as any
            });
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
