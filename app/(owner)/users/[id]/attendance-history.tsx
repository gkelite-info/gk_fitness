import React, { useState, useMemo } from 'react';
import { View, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { Text } from '@/components/nativewindui/Text';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  CaretLeft,
  CaretRight,
  CalendarBlank,
  Flame,
  CheckCircle,
  XCircle,
  Clock,
  CalendarCheck,
} from 'phosphor-react-native';
import { useGymCustomerById } from '@/hooks/customers/useGymCustomers';
import { useCustomerAttendance } from '@/hooks/attendance/useCustomerAttendance';
import { triggerLightHaptic, triggerSelectionHaptic } from '@/lib/haptics';

export default function UserAttendanceHistoryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  const { data: customer, isLoading: isCustomerLoading } = useGymCustomerById(id);
  const { data: attendanceLogs = [], isLoading: isAttendanceLoading } = useCustomerAttendance(id);

  const formatDateKey = (d: Date): string => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Map of date strings -> list of logs
  const attendanceMap = useMemo(() => {
    const map = new Map<string, any[]>();
    attendanceLogs.forEach((log: any) => {
      const dateStr = log.date || (log.markedAt ? log.markedAt.slice(0, 10) : null);
      if (dateStr) {
        if (!map.has(dateStr)) {
          map.set(dateStr, []);
        }
        map.get(dateStr)!.push(log);
      }
    });
    return map;
  }, [attendanceLogs]);

  // Total attended unique days
  const totalDaysAttended = attendanceMap.size;

  // Streak calculation
  const currentStreak = useMemo(() => {
    let streak = 0;
    const checkDate = new Date();
    checkDate.setHours(0, 0, 0, 0);

    const todayKey = formatDateKey(checkDate);
    if (!attendanceMap.has(todayKey)) {
      // Check if marked yesterday
      checkDate.setDate(checkDate.getDate() - 1);
      if (!attendanceMap.has(formatDateKey(checkDate))) {
        return 0;
      }
    }

    while (true) {
      const key = formatDateKey(checkDate);
      if (attendanceMap.has(key)) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }

    return streak;
  }, [attendanceMap]);

  // Calendar math
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayIndex = (new Date(year, month, 1).getDay() + 6) % 7; // Monday = 0

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const handlePrevMonth = () => {
    triggerSelectionHaptic();
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    triggerSelectionHaptic();
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const selectedKey = formatDateKey(selectedDate);
  const selectedDayLogs = attendanceMap.get(selectedKey) || [];
  const isSelectedDayPresent = selectedDayLogs.length > 0;

  const isLoading = isCustomerLoading || isAttendanceLoading;

  if (isLoading) {
    return (
      <View className="flex-1 bg-[#0A0A0A] items-center justify-center">
        <ActivityIndicator size="large" color="#CCF200" />
        <Text className="text-gray-400 text-sm mt-3 font-medium">Loading attendance history...</Text>
      </View>
    );
  }

  const initials = customer?.fullName
    ? customer.fullName.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase()
    : '??';

  return (
    <View className="flex-1 bg-[#0A0A0A]" style={{ paddingTop: insets.top }}>
      {/* Header */}
      <View className="flex-row items-center justify-between px-5 py-3 border-b border-[#1F1F22]">
        <Pressable
          onPress={() => router.back()}
          className="w-10 h-10 bg-[#161616] border border-[#242424] rounded-full items-center justify-center active:opacity-70"
        >
          <CaretLeft size={20} color="#FFFFFF" weight="bold" />
        </Pressable>
        <Text className="text-white text-lg font-bold">Attendance History</Text>
        <View className="w-10" />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100 }}
      >
        {/* Member Summary Card */}
        <View className="bg-[#141416] border border-[#242424] rounded-3xl p-5 mt-4">
          <View className="flex-row items-center justify-between mb-4">
            <View className="flex-row items-center flex-1 mr-3">
              <View className="w-12 h-12 rounded-xl bg-[#1C1F26] border border-[#333] items-center justify-center mr-3">
                <Text className="text-[#CCF200] text-base font-bold">{initials}</Text>
              </View>
              <View className="flex-1">
                <Text className="text-white text-base font-bold" numberOfLines={1}>
                  {customer?.fullName || 'Customer'}
                </Text>
                <Text className="text-gray-400 text-xs mt-0.5">
                  {customer?.is_Active ? 'Active Member' : 'Inactive'}
                </Text>
              </View>
            </View>
          </View>

          {/* Stats Badges */}
          <View className="flex-row gap-3 pt-3 border-t border-[#222226]">
            <View className="flex-1 bg-[#1C1F26] border border-[#2A2E38] rounded-xl p-3 items-center">
              <View className="flex-row items-center gap-1.5 mb-1">
                <CalendarCheck size={16} color="#CCF200" weight="fill" />
                <Text className="text-gray-400 text-xs font-medium">Attended</Text>
              </View>
              <Text className="text-white text-lg font-bold">{totalDaysAttended} Days</Text>
            </View>

            <View className="flex-1 bg-[#1C1F26] border border-[#2A2E38] rounded-xl p-3 items-center">
              <View className="flex-row items-center gap-1.5 mb-1">
                <Flame size={16} color="#F97316" weight="fill" />
                <Text className="text-gray-400 text-xs font-medium">Streak</Text>
              </View>
              <Text className="text-white text-lg font-bold">{currentStreak} Days</Text>
            </View>
          </View>
        </View>

        {/* Calendar Card */}
        <View className="bg-[#141416] border border-[#242424] rounded-3xl p-4 mt-4">
          {/* Month Header Controls */}
          <View className="flex-row items-center justify-between mb-4 px-2">
            <Text className="text-white text-base font-bold">
              {monthNames[month]} {year}
            </Text>
            <View className="flex-row gap-1">
              <Pressable
                onPress={handlePrevMonth}
                className="w-8 h-8 rounded-lg bg-[#1C1F26] border border-[#2A2E38] items-center justify-center active:opacity-70"
              >
                <CaretLeft size={16} color="#FFFFFF" weight="bold" />
              </Pressable>
              <Pressable
                onPress={handleNextMonth}
                className="w-8 h-8 rounded-lg bg-[#1C1F26] border border-[#2A2E38] items-center justify-center active:opacity-70"
              >
                <CaretRight size={16} color="#FFFFFF" weight="bold" />
              </Pressable>
            </View>
          </View>

          {/* Weekday Labels */}
          <View className="flex-row justify-between mb-2">
            {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, idx) => (
              <View key={idx} className="w-10 items-center justify-center py-1">
                <Text className="text-gray-400 text-xs font-semibold">{day}</Text>
              </View>
            ))}
          </View>

          {/* Days Grid */}
          <View className="flex-row flex-wrap justify-start">
            {/* Empty offset padding cells */}
            {Array.from({ length: firstDayIndex }).map((_, i) => (
              <View key={`empty-${i}`} className="w-[14.28%] h-11" />
            ))}

            {/* Days of current month */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const dayNum = i + 1;
              const cellDate = new Date(year, month, dayNum);
              const cellKey = formatDateKey(cellDate);
              const hasAttended = attendanceMap.has(cellKey);
              const isSelected = cellKey === selectedKey;

              return (
                <Pressable
                  key={`day-${dayNum}`}
                  onPress={() => {
                    triggerLightHaptic();
                    setSelectedDate(cellDate);
                  }}
                  className={`w-[14.28%] h-11 items-center justify-center relative rounded-xl ${
                    isSelected ? 'bg-[#CCF200]/20 border border-[#CCF200]' : ''
                  }`}
                >
                  <Text
                    className={`text-sm font-semibold ${
                      isSelected
                        ? 'text-[#CCF200]'
                        : hasAttended
                        ? 'text-white'
                        : 'text-gray-400'
                    }`}
                  >
                    {dayNum}
                  </Text>
                  {hasAttended && (
                    <View
                      className={`w-1.5 h-1.5 rounded-full absolute bottom-1.5 ${
                        isSelected ? 'bg-[#CCF200]' : 'bg-[#CCF200]'
                      }`}
                    />
                  )}
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Selected Day Details Card */}
        <View className="bg-[#141416] border border-[#242424] rounded-2xl p-4 mt-4">
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-white text-sm font-bold">
              {selectedDate.toLocaleDateString('en-GB', {
                weekday: 'short',
                day: '2-digit',
                month: 'short',
                year: 'numeric',
              })}
            </Text>
            <View
              className={`px-2.5 py-0.5 rounded-md flex-row items-center gap-1 ${
                isSelectedDayPresent ? 'bg-[#373F0E]' : 'bg-[#2A2A2E]'
              }`}
            >
              {isSelectedDayPresent ? (
                <>
                  <CheckCircle size={12} color="#CCF200" weight="fill" />
                  <Text className="text-[#CCF200] text-xs font-bold">Present</Text>
                </>
              ) : (
                <>
                  <XCircle size={12} color="#A1A1AA" weight="fill" />
                  <Text className="text-gray-400 text-xs font-bold">Absent / Rest Day</Text>
                </>
              )}
            </View>
          </View>

          {isSelectedDayPresent ? (
            <View className="gap-2 pt-2 border-t border-[#222226]">
              {selectedDayLogs.map((log: any, idx: number) => {
                const timeStr = log.markedAt
                  ? new Date(log.markedAt).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  : 'Recorded';

                return (
                  <View
                    key={log.attendanceId || idx}
                    className="flex-row items-center justify-between py-2"
                  >
                    <View className="flex-row items-center">
                      <Clock size={16} color="#CCF200" />
                      <Text className="text-gray-300 text-xs ml-2 font-medium">Check-In Time</Text>
                    </View>
                    <Text className="text-white text-sm font-bold">{timeStr}</Text>
                  </View>
                );
              })}
            </View>
          ) : (
            <Text className="text-gray-400 text-xs py-2">
              No check-in recorded for this date.
            </Text>
          )}
        </View>

        {/* Recent Attendance Logs */}
        <Text className="text-white text-sm font-bold mt-6 mb-3">Recent Check-Ins</Text>
        <View className="bg-[#141416] border border-[#242424] rounded-2xl overflow-hidden">
          {attendanceLogs.length === 0 ? (
            <View className="p-6 items-center">
              <CalendarBlank size={32} color="#444" />
              <Text className="text-gray-400 text-xs mt-2">No attendance history recorded.</Text>
            </View>
          ) : (
            attendanceLogs.slice(0, 10).map((log: any, index: number) => {
              const formattedDate = log.markedAt
                ? new Date(log.markedAt).toLocaleDateString('en-GB', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                  })
                : log.date || '-';

              const formattedTime = log.markedAt
                ? new Date(log.markedAt).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                : 'Recorded';

              return (
                <View
                  key={log.attendanceId || index}
                  className={`flex-row items-center justify-between p-3.5 ${
                    index < 9 ? 'border-b border-[#222226]' : ''
                  }`}
                >
                  <View className="flex-row items-center">
                    <View className="w-8 h-8 rounded-lg bg-[#1C1F26] items-center justify-center mr-3">
                      <CheckCircle size={16} color="#CCF200" weight="fill" />
                    </View>
                    <View>
                      <Text className="text-white text-xs font-bold">{formattedDate}</Text>
                      <Text className="text-gray-400 text-[11px] mt-0.5">Biometric Scanner / QR</Text>
                    </View>
                  </View>
                  <View className="bg-[#1C1F26] px-2.5 py-1 rounded-md border border-[#2A2E38]">
                    <Text className="text-[#CCF200] text-xs font-semibold">{formattedTime}</Text>
                  </View>
                </View>
              );
            })
          )}
        </View>
      </ScrollView>
    </View>
  );
}
