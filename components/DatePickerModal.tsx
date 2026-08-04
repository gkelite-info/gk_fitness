import React, { useState, useEffect } from 'react';
import { View, Modal, Pressable, ScrollView } from 'react-native';
import { Text } from '@/components/nativewindui/Text';
import { CaretLeft, CaretRight, X, Check, CalendarBlank } from 'phosphor-react-native';
import { triggerLightHaptic, triggerMediumHaptic, triggerSelectionHaptic } from '@/lib/haptics';

interface DatePickerModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectDate: (dateString: string) => void;
  initialDate?: string;
  title?: string;
  minYear?: number;
  maxYear?: number;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const SHORT_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function DatePickerModal({
  visible,
  onClose,
  onSelectDate,
  initialDate,
  title = 'Select Date',
  minYear = 1940,
  maxYear = new Date().getFullYear() + 10,
}: DatePickerModalProps) {
  const parseDate = (dateStr?: string): Date => {
    if (!dateStr) return new Date(1995, 4, 15); // Default to mid May 1995 for DOBs
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
        return new Date(year, month, day);
      }
    }
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? new Date() : d;
  };

  const [selectedDate, setSelectedDate] = useState<Date>(() => parseDate(initialDate));
  const [viewMode, setViewMode] = useState<'calendar' | 'month' | 'year'>('calendar');

  // Synchronize initial date when modal becomes visible
  useEffect(() => {
    if (visible) {
      setSelectedDate(parseDate(initialDate || (title.toLowerCase().includes('birth') ? '1995-05-15' : new Date().toISOString().split('T')[0])));
      setViewMode('calendar');
    }
  }, [visible, initialDate, title]);

  const year = selectedDate.getFullYear();
  const month = selectedDate.getMonth();
  const day = selectedDate.getDate();

  // Get number of days in the currently displayed month
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  // Get weekday offset for the 1st of the month (0 = Sun, 6 = Sat)
  const firstDayOfWeek = new Date(year, month, 1).getDay();

  const handleConfirm = () => {
    triggerMediumHaptic();
    const formatted = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    onSelectDate(formatted);
    onClose();
  };

  const handleDaySelect = (newDay: number) => {
    triggerSelectionHaptic();
    const d = new Date(year, month, newDay);
    setSelectedDate(d);
  };

  const handleMonthSelect = (newMonth: number) => {
    triggerSelectionHaptic();
    const maxDayInNewMonth = new Date(year, newMonth + 1, 0).getDate();
    const nextDay = Math.min(day, maxDayInNewMonth);
    setSelectedDate(new Date(year, newMonth, nextDay));
    setViewMode('calendar');
  };

  const handleYearSelect = (newYear: number) => {
    triggerSelectionHaptic();
    const maxDayInNewMonth = new Date(newYear, month + 1, 0).getDate();
    const nextDay = Math.min(day, maxDayInNewMonth);
    setSelectedDate(new Date(newYear, month, nextDay));
    setViewMode('month'); // Transition cleanly to selecting month after year
  };

  const navigateMonth = (direction: -1 | 1) => {
    triggerSelectionHaptic();
    let nextMonth = month + direction;
    let nextYear = year;
    if (nextMonth < 0) {
      nextMonth = 11;
      nextYear -= 1;
    } else if (nextMonth > 11) {
      nextMonth = 0;
      nextYear += 1;
    }
    const maxDay = new Date(nextYear, nextMonth + 1, 0).getDate();
    setSelectedDate(new Date(nextYear, nextMonth, Math.min(day, maxDay)));
  };

  const generateYearRange = () => {
    const years: number[] = [];
    for (let y = maxYear; y >= minYear; y--) {
      years.push(y);
    }
    return years;
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 justify-center items-center bg-black/80 px-5">
        <View className="bg-[#161616] border border-[#242424] rounded-3xl w-full max-w-md overflow-hidden shadow-2xl p-5">
          {/* Header Row */}
          <View className="flex-row items-center justify-between pb-4 border-b border-[#242424] mb-4">
            <View className="flex-row items-center gap-2">
              <CalendarBlank size={22} color="#C3F400" weight="fill" />
              <Text className="text-white text-lg font-semibold">{title}</Text>
            </View>
            <Pressable
              onPress={() => {
                triggerLightHaptic();
                onClose();
              }}
              className="w-8 h-8 rounded-full bg-[#242424] items-center justify-center active:opacity-75"
            >
              <X size={16} color="#fff" />
            </Pressable>
          </View>

          {/* Current Selection Bar & View Toggle */}
          <View className="flex-row items-center justify-between bg-[#202020] p-3.5 rounded-xl mb-4 border border-[#2C2C2C]">
            <View className="flex-row items-center gap-2">
              <Pressable
                onPress={() => {
                  triggerSelectionHaptic();
                  setViewMode(viewMode === 'month' ? 'calendar' : 'month');
                }}
                className={`px-3 py-1.5 rounded-lg border ${viewMode === 'month' ? 'bg-[#C3F400] border-[#C3F400]' : 'border-[#383838] bg-[#1A1A1A]'}`}
              >
                <Text className={`font-semibold text-sm ${viewMode === 'month' ? 'text-black' : 'text-white'}`}>
                  {MONTH_NAMES[month]}
                </Text>
              </Pressable>

              <Pressable
                onPress={() => {
                  triggerSelectionHaptic();
                  setViewMode(viewMode === 'year' ? 'calendar' : 'year');
                }}
                className={`px-3 py-1.5 rounded-lg border ${viewMode === 'year' ? 'bg-[#C3F400] border-[#C3F400]' : 'border-[#383838] bg-[#1A1A1A]'}`}
              >
                <Text className={`font-semibold text-sm ${viewMode === 'year' ? 'text-black' : 'text-white'}`}>
                  {year}
                </Text>
              </Pressable>
            </View>

            {viewMode === 'calendar' && (
              <View className="flex-row items-center gap-1">
                <Pressable
                  onPress={() => navigateMonth(-1)}
                  className="w-8 h-8 rounded-lg bg-[#2A2A2A] items-center justify-center active:opacity-75"
                >
                  <CaretLeft size={16} color="#fff" />
                </Pressable>
                <Pressable
                  onPress={() => navigateMonth(1)}
                  className="w-8 h-8 rounded-lg bg-[#2A2A2A] items-center justify-center active:opacity-75"
                >
                  <CaretRight size={16} color="#fff" />
                </Pressable>
              </View>
            )}
          </View>

          {/* VIEW MODE 1: CALENDAR GRID */}
          {viewMode === 'calendar' && (
            <View>
              {/* Day Headers */}
              <View className="flex-row justify-around mb-2">
                {SHORT_DAYS.map((dayName) => (
                  <Text key={dayName} className="text-[#A1A1AA] font-semibold text-xs w-10 text-center uppercase">
                    {dayName}
                  </Text>
                ))}
              </View>

              {/* Calendar Days Matrix */}
              <View className="flex-row flex-wrap">
                {/* Empty cells for weekday offset */}
                {Array.from({ length: firstDayOfWeek }).map((_, i) => (
                  <View key={`empty-${i}`} className="w-[14.28%] h-11" />
                ))}

                {/* Day cells */}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const dayNum = i + 1;
                  const isSelected = day === dayNum;
                  return (
                    <Pressable
                      key={`day-${dayNum}`}
                      onPress={() => handleDaySelect(dayNum)}
                      className="w-[14.28%] h-11 items-center justify-center p-0.5"
                    >
                      <View
                        className={`w-9 h-9 rounded-full items-center justify-center ${isSelected ? 'bg-[#C3F400]' : 'bg-transparent'
                          }`}
                      >
                        <Text className={`font-semibold text-sm ${isSelected ? 'text-black font-semibold' : 'text-white'}`}>
                          {dayNum}
                        </Text>
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          )}

          {/* VIEW MODE 2: MONTH SELECTION */}
          {viewMode === 'month' && (
            <View className="h-64 flex-row flex-wrap justify-between gap-y-3 py-2">
              {MONTH_NAMES.map((mName, index) => {
                const isSelected = month === index;
                return (
                  <Pressable
                    key={mName}
                    onPress={() => handleMonthSelect(index)}
                    className={`w-[31%] py-3 rounded-xl border items-center justify-center ${isSelected ? 'bg-[#C3F400] border-[#C3F400]' : 'bg-[#202020] border-[#2C2C2C]'
                      }`}
                  >
                    <Text className={`text-xs font-semibold ${isSelected ? 'text-black' : 'text-white'}`}>
                      {mName.slice(0, 3).toUpperCase()}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          )}

          {/* VIEW MODE 3: YEAR SELECTION */}
          {viewMode === 'year' && (
            <ScrollView className="max-h-64 py-2" showsVerticalScrollIndicator={false}>
              <View className="flex-row flex-wrap justify-between gap-y-2">
                {generateYearRange().map((y) => {
                  const isSelected = year === y;
                  return (
                    <Pressable
                      key={y}
                      onPress={() => handleYearSelect(y)}
                      className={`w-[31%] py-2.5 rounded-xl border items-center justify-center ${isSelected ? 'bg-[#C3F400] border-[#C3F400]' : 'bg-[#202020] border-[#2C2C2C]'
                        }`}
                    >
                      <Text className={`text-xs font-semibold ${isSelected ? 'text-black' : 'text-white'}`}>
                        {y}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </ScrollView>
          )}

          {/* Quick Shortcuts for General / Joining Dates */}
          {!title.toLowerCase().includes('birth') && viewMode === 'calendar' && (
            <View className="flex-row gap-2 mt-4 pt-4 border-t border-[#242424]">
              <Pressable
                onPress={() => {
                  triggerSelectionHaptic();
                  const now = new Date();
                  setSelectedDate(now);
                }}
                className="flex-1 py-2 rounded-lg bg-[#222] border border-[#333] items-center"
              >
                <Text className="text-xs font-semibold text-[#C3F400]">Today</Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  triggerSelectionHaptic();
                  const d = new Date();
                  d.setMonth(d.getMonth() + 1);
                  setSelectedDate(d);
                }}
                className="flex-1 py-2 rounded-lg bg-[#222] border border-[#333] items-center"
              >
                <Text className="text-xs font-semibold text-[#C3F400]">+1 Month</Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  triggerSelectionHaptic();
                  const d = new Date();
                  d.setMonth(d.getMonth() + 3);
                  setSelectedDate(d);
                }}
                className="flex-1 py-2 rounded-lg bg-[#222] border border-[#333] items-center"
              >
                <Text className="text-xs font-semibold text-[#C3F400]">+3 Months</Text>
              </Pressable>
            </View>
          )}

          {/* Action Buttons */}
          <View className="flex-row gap-3 mt-6 pt-4 border-t border-[#242424]">
            <Pressable
              onPress={() => {
                triggerLightHaptic();
                onClose();
              }}
              className="flex-1 py-3.5 rounded-full border border-[#333] bg-[#222] items-center justify-center active:opacity-75"
            >
              <Text className="text-white font-semibold text-xs uppercase tracking-wider">Cancel</Text>
            </Pressable>
            <Pressable
              onPress={handleConfirm}
              className="flex-[1.5] py-3.5 rounded-full bg-[#C3F400] flex-row items-center justify-center gap-1.5 active:opacity-85"
            >
              <Check size={18} color="#000" weight="bold" />
              <Text className="text-black font-semibold text-xs uppercase tracking-wider">Confirm Date</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}
