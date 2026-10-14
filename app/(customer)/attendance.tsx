import React, { useState, useMemo } from 'react';
import {
  View,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Modal,
  Platform,
} from 'react-native';
import { Text } from '@/components/nativewindui/Text';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  CaretLeft,
  CaretRight,
  Check,
  Flame,
  X,
  FileText,
  Info,
  QrCode,
  Fingerprint,
  CalendarCheck,
  Clock,
} from 'phosphor-react-native';
import { useUser } from '@/context/UserContext';
import { useCustomerAttendance } from '@/hooks/attendance/useCustomerAttendance';
import { CustomRefreshControl } from '@/components/CustomRefreshControl';
import { triggerLightHaptic, triggerSelectionHaptic } from '@/lib/haptics';

export default function CustomerAttendanceScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { customerId } = useUser();

  const [currentMonthDate, setCurrentMonthDate] = useState<Date>(new Date());
  const [refreshing, setRefreshing] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showInfoModal, setShowInfoModal] = useState(false);

  const {
    data: attendanceLogs = [],
    isLoading,
    refetch,
  } = useCustomerAttendance(customerId);

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const formatDateKey = (d: Date): string => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

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

  const today = useMemo(() => new Date(), []);
  const todayKey = useMemo(() => formatDateKey(today), [today]);

  const currentStreak = useMemo(() => {
    let streak = 0;
    const checkDate = new Date();
    checkDate.setHours(0, 0, 0, 0);

    const checkTodayKey = formatDateKey(checkDate);
    if (!attendanceMap.has(checkTodayKey)) {
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

  const year = currentMonthDate.getFullYear();
  const month = currentMonthDate.getMonth();

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayIndex = (new Date(year, month, 1).getDay() + 6) % 7;

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const handlePrevMonth = () => {
    triggerSelectionHaptic();
    setCurrentMonthDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    triggerSelectionHaptic();
    setCurrentMonthDate(new Date(year, month + 1, 1));
  };

  const monthPresentCount = useMemo(() => {
    let count = 0;
    for (let day = 1; day <= daysInMonth; day++) {
      const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      if (attendanceMap.has(dateKey)) {
        count++;
      }
    }
    return count;
  }, [year, month, daysInMonth, attendanceMap]);

  const missedCount = useMemo(() => {
    const isCurrentMonth =
      today.getFullYear() === year && today.getMonth() === month;
    if (isCurrentMonth) {
      const elapsedDays = today.getDate();
      let attendedUpToToday = 0;
      for (let day = 1; day <= elapsedDays; day++) {
        const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        if (attendanceMap.has(dateKey)) {
          attendedUpToToday++;
        }
      }
      return Math.max(0, elapsedDays - attendedUpToToday);
    } else if (new Date(year, month, 1) < today) {
      return Math.max(0, daysInMonth - monthPresentCount);
    }
    return 0;
  }, [today, year, month, daysInMonth, monthPresentCount, attendanceMap]);

  const currentWeekDays = useMemo(() => {
    const now = new Date();
    const currentDayOfWeek = (now.getDay() + 6) % 7;
    const monday = new Date(now);
    monday.setDate(now.getDate() - currentDayOfWeek);
    monday.setHours(0, 0, 0, 0);

    const weekLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const days = [];
    let attendedCount = 0;

    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const key = formatDateKey(d);
      const isPresent = attendanceMap.has(key);
      if (isPresent) attendedCount++;

      days.push({
        label: weekLabels[i],
        date: d,
        key,
        isPresent,
      });
    }

    return { days, attendedCount };
  }, [attendanceMap]);

  return (
    <View className="flex-1 bg-black" style={{ paddingTop: insets.top }}>
      <View className="flex-row items-center justify-between px-5 py-3 border-b border-[#222222] bg-black">
        <Pressable
          onPress={() => {
            triggerLightHaptic();
            router.back();
          }}
          className="w-10 h-10 items-center justify-center rounded-full bg-[#121212] border border-[#222222] active:opacity-70"
        >
          <CaretLeft size={20} color="#FFFFFF" weight="bold" />
        </Pressable>

        <Text className="text-white text-lg font-semibold">Attendance</Text>

        <Pressable
          onPress={() => {
            triggerLightHaptic();
            setShowInfoModal(true);
          }}
          className="w-10 h-10 items-center justify-center rounded-full bg-[#121212] border border-[#222222] active:opacity-70"
        >
          <Info size={20} color="#FFFFFF" />
        </Pressable>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: insets.bottom + 40 }}
        refreshControl={
          <CustomRefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {isLoading && !refreshing ? (
          <View className="py-12 items-center justify-center">
            <ActivityIndicator size="large" color="#CCFF00" />
            <Text className="text-[#888888] text-sm mt-3 font-medium">Loading attendance...</Text>
          </View>
        ) : (
          <>
            <View className="flex-row gap-2.5 mb-4">
              <View className="flex-1 bg-[#121212] border border-[#222222] rounded-2xl p-3.5">
                <View className="w-8 h-8 rounded-full bg-[#CCFF00] items-center justify-center mb-1">
                  <Check size={16} color="#000000" weight="bold" />
                </View>
                <Text className="text-[#888888] text-[10px] font-semibold tracking-wider mt-2 mb-0.5">
                  PRESENT
                </Text>
                <View className="flex-row items-baseline gap-1">
                  <Text className="text-[#CCFF00] text-2xl font-semibold">{monthPresentCount}</Text>
                  <Text className="text-[#888888] text-xs font-medium">Days</Text>
                </View>
              </View>

              <View className="flex-1 bg-[#121212] border border-[#222222] rounded-2xl p-3.5">
                <View className="w-8 h-8 rounded-full bg-[#27272A] items-center justify-center mb-1">
                  <Flame size={16} color="#CCFF00" weight="fill" />
                </View>
                <Text className="text-[#888888] text-[10px] font-semibold tracking-wider mt-2 mb-0.5" numberOfLines={1}>
                  CURRENTSTREAK
                </Text>
                <View className="flex-row items-baseline gap-1">
                  <Text className="text-[#CCFF00] text-2xl font-semibold">{currentStreak}</Text>
                  <Text className="text-[#888888] text-xs font-medium">Days</Text>
                </View>
              </View>

              <View className="flex-1 bg-[#121212] border border-[#222222] rounded-2xl p-3.5">
                <View className="w-8 h-8 rounded-full bg-[#27272A] items-center justify-center mb-1">
                  <X size={15} color="#888888" weight="bold" />
                </View>
                <Text className="text-[#888888] text-[10px] font-semibold tracking-wider mt-2 mb-0.5">
                  MISSED
                </Text>
                <View className="flex-row items-baseline gap-1">
                  <Text className="text-white text-2xl font-semibold">{missedCount}</Text>
                  <Text className="text-[#888888] text-xs font-medium">Days</Text>
                </View>
              </View>
            </View>

            <View className="bg-[#121212] border border-[#222222] rounded-2xl p-4 mb-4">
              <View className="flex-row items-center justify-between mb-3.5">
                <Text className="text-white text-base font-semibold">This Week</Text>
                <Text>
                  <Text className="text-[#CCFF00] text-sm font-semibold">
                    {currentWeekDays.attendedCount}/7
                  </Text>
                  <Text className="text-[#888888] text-sm font-medium"> Days</Text>
                </Text>
              </View>

              <View className="flex-row justify-between items-center">
                {currentWeekDays.days.map((item, index) => (
                  <View key={item.key || index} className="items-center flex-1">
                    <Text className="text-[#888888] text-xs font-semibold mb-2">
                      {item.label}
                    </Text>
                    {item.isPresent ? (
                      <View className="w-10 h-10 rounded-xl bg-[#CCFF00] items-center justify-center shadow-sm">
                        <Check size={18} color="#000000" weight="bold" />
                      </View>
                    ) : (
                      <View className="w-10 h-10 rounded-xl bg-[#27272A] items-center justify-center">
                        <Text className="text-[#666666] text-lg font-semibold">-</Text>
                      </View>
                    )}
                  </View>
                ))}
              </View>
            </View>

            <View className="bg-[#121212] border border-[#222222] rounded-2xl p-4 mb-4">
              <View className="flex-row items-center justify-between mb-3">
                <Text className="text-white text-base font-semibold">Monthly Attendance</Text>

                <View className="flex-row items-center bg-[#1A1A1A] border border-[#27272A] rounded-xl px-2.5 py-1.5">
                  <Pressable
                    onPress={handlePrevMonth}
                    hitSlop={8}
                    className="p-1 active:opacity-60"
                  >
                    <CaretLeft size={13} color="#888888" weight="bold" />
                  </Pressable>
                  <Text className="text-white text-xs font-semibold mx-2">
                    {monthNames[month]} {year}
                  </Text>
                  <Pressable
                    onPress={handleNextMonth}
                    hitSlop={8}
                    className="p-1 active:opacity-60"
                  >
                    <CaretRight size={13} color="#888888" weight="bold" />
                  </Pressable>
                </View>
              </View>

              <View className="flex-row justify-between mt-2 mb-2">
                {['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map((d) => (
                  <Text
                    key={d}
                    className="text-[#888888] text-xs font-semibold text-center"
                    style={{ width: `${100 / 7}%` }}
                  >
                    {d}
                  </Text>
                ))}
              </View>

              <View className="flex-row flex-wrap">
                {Array.from({ length: firstDayIndex }).map((_, i) => (
                  <View
                    key={`empty-${i}`}
                    style={{ width: `${100 / 7}%`, aspectRatio: 1, padding: 3 }}
                  />
                ))}

                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const dayNum = i + 1;
                  const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
                  const isPresent = attendanceMap.has(dateKey);
                  const isToday = dateKey === todayKey;

                  return (
                    <View
                      key={`day-${dayNum}`}
                      style={{ width: `${100 / 7}%`, aspectRatio: 1, padding: 3 }}
                    >
                      {isPresent ? (
                        <View
                          className={`w-full h-full rounded-xl items-center justify-center bg-[#CCFF00] ${isToday ? 'border-2 border-white' : ''
                            }`}
                        >
                          <Text className="text-black text-sm font-semibold">{dayNum}</Text>
                        </View>
                      ) : isToday ? (
                        <View className="w-full h-full rounded-xl items-center justify-center bg-[#121212] border-2 border-[#CCFF00]">
                          <Text className="text-white text-sm font-semibold">{dayNum}</Text>
                        </View>
                      ) : (
                        <View className="w-full h-full rounded-xl items-center justify-center bg-[#27272A]">
                          <Text className="text-[#666666] text-sm font-semibold">{dayNum}</Text>
                        </View>
                      )}
                    </View>
                  );
                })}
              </View>

              <View className="flex-row items-center justify-center gap-6 mt-4 pt-3.5 border-t border-[#222222]">
                <View className="flex-row items-center">
                  <View className="w-3 h-3 rounded-sm bg-[#CCFF00] mr-2" />
                  <Text className="text-[#888888] text-xs font-medium">Present</Text>
                </View>
                <View className="flex-row items-center">
                  <View className="w-3 h-3 rounded-sm bg-[#27272A] mr-2" />
                  <Text className="text-[#888888] text-xs font-medium">Absent</Text>
                </View>
              </View>
            </View>

            <Pressable
              onPress={() => {
                triggerLightHaptic();
                setShowHistoryModal(true);
              }}
              className="bg-[#121212] border border-[#222222] rounded-2xl p-4 flex-row items-center justify-between active:opacity-75 mb-6"
            >
              <View className="flex-row items-center flex-1 pr-3">
                <View className="w-12 h-12 rounded-xl bg-[#27272A] border border-[#333333] items-center justify-center mr-3.5">
                  <FileText size={22} color="#CCFF00" weight="fill" />
                </View>
                <View className="flex-1">
                  <Text className="text-white text-base font-semibold">View Full History</Text>
                  <Text className="text-[#888888] text-xs mt-0.5">
                    Check detailed attendance history
                  </Text>
                </View>
              </View>
              <CaretRight size={18} color="#CCFF00" weight="bold" />
            </Pressable>
          </>
        )}
      </ScrollView>

      <Modal
        visible={showHistoryModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowHistoryModal(false)}
      >
        <View className="flex-1 justify-end bg-black/70">
          <View className="bg-[#121212] border-t border-[#222222] rounded-t-3xl max-h-[85%] p-5 pb-8">
            <View className="flex-row items-center justify-between pb-4 border-b border-[#222222] mb-3">
              <View>
                <Text className="text-white text-lg font-semibold">Attendance History</Text>
                <Text className="text-[#888888] text-xs mt-0.5">
                  {attendanceLogs.length} total check-in records
                </Text>
              </View>
              <Pressable
                onPress={() => setShowHistoryModal(false)}
                className="w-8 h-8 rounded-full bg-[#27272A] items-center justify-center active:opacity-70"
              >
                <X size={16} color="#FFFFFF" weight="bold" />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} className="max-h-[500px]">
              {attendanceLogs.length === 0 ? (
                <View className="py-12 items-center justify-center">
                  <CalendarCheck size={48} color="#666666" />
                  <Text className="text-white text-base font-semibold mt-3">No Records Yet</Text>
                  <Text className="text-[#888888] text-xs mt-1 text-center">
                    Check in at the gym using QR or biometric scanner to start your log.
                  </Text>
                </View>
              ) : (
                attendanceLogs.map((log: any, idx: number) => {
                  const markedDate = log.markedAt ? new Date(log.markedAt) : null;
                  const formattedTime = markedDate
                    ? markedDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    : '';
                  const formattedDate = markedDate
                    ? markedDate.toLocaleDateString([], {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })
                    : log.date || 'Unknown Date';

                  const isBiometric = log.source === 'biometric';

                  return (
                    <View
                      key={log.attendanceId || idx}
                      className="bg-[#18181A] border border-[#27272A] rounded-2xl p-3.5 mb-2.5 flex-row items-center justify-between"
                    >
                      <View className="flex-row items-center flex-1 pr-2">
                        <View className="w-10 h-10 rounded-xl bg-[#27272A] items-center justify-center mr-3">
                          {isBiometric ? (
                            <Fingerprint size={20} color="#CCFF00" />
                          ) : (
                            <QrCode size={20} color="#CCFF00" />
                          )}
                        </View>
                        <View>
                          <Text className="text-white text-sm font-semibold">{formattedDate}</Text>
                          <View className="flex-row items-center gap-1.5 mt-0.5">
                            <Clock size={12} color="#888888" />
                            <Text className="text-[#888888] text-xs">
                              {formattedTime || 'Logged'} • {isBiometric ? 'Biometric Device' : 'QR Check-in'}
                            </Text>
                          </View>
                        </View>
                      </View>

                      <View className="bg-[#CCFF00]/15 border border-[#CCFF00]/30 px-2.5 py-1 rounded-full">
                        <Text className="text-[#CCFF00] text-xs font-semibold">Present</Text>
                      </View>
                    </View>
                  );
                })
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showInfoModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowInfoModal(false)}
      >
        <View className="flex-1 items-center justify-center bg-black/75 px-6">
          <View className="bg-[#121212] border border-[#222222] rounded-3xl p-6 w-full max-w-sm">
            <View className="w-12 h-12 rounded-full bg-[#CCFF00]/10 border border-[#CCFF00]/30 items-center justify-center mb-4 self-center">
              <Info size={24} color="#CCFF00" weight="bold" />
            </View>

            <Text className="text-white text-lg font-semibold text-center mb-2">
              Attendance & Streaks
            </Text>
            <Text className="text-[#888888] text-xs text-center leading-5 mb-5">
              Attendance records are tracked automatically when you scan the gym&apos;s check-in QR code or use the biometric entrance scanner.
              {'\n\n'}
              Consistently checking in every day builds your active workout streak!
            </Text>

            <Pressable
              onPress={() => setShowInfoModal(false)}
              className="bg-[#CCFF00] py-3 rounded-xl items-center active:opacity-80"
            >
              <Text className="text-black font-semibold text-sm">Got it</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}
