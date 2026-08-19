import React, { useState, useEffect, useCallback } from 'react';
import { View, ScrollView, Pressable, ActivityIndicator, TextInput, FlatList, Platform, Modal } from 'react-native';
import { Text } from '@/components/nativewindui/Text';
import { useUser } from '@/context/UserContext';
import { useBiometricAttendanceLogs } from '@/hooks/biometrics/useBiometricAttendanceLogs';
import { useBiometricDevices } from '@/hooks/biometrics/useBiometricDevices';
import { Clock, Calendar, MagnifyingGlass, ArrowsClockwise, CaretLeft, CaretRight, CheckCircle, WarningCircle, ArrowDownLeft, ArrowUpRight, CaretDown, Check } from 'phosphor-react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { CustomRefreshControl } from '@/components/CustomRefreshControl';
import { syncDeviceLogs } from '@/helpers/biometrics/biometricScanHelper';
import { BiometricAttendanceLogRow } from '@/helpers/biometrics/biometricAttendanceLogAPI';

export default function LogsTab() {
  const { gymId } = useUser();

  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedDevice, setSelectedDevice] = useState<string>('');
  const [selectedLogType, setSelectedLogType] = useState<string>('');

  const [fromDate, setFromDate] = useState<Date | null>(null);
  const [toDate, setToDate] = useState<Date | null>(null);
  const [showFromPicker, setShowFromPicker] = useState(false);
  const [showToPicker, setShowToPicker] = useState(false);
  const [showDevicePicker, setShowDevicePicker] = useState(false);

  const [refreshing, setRefreshing] = useState(false);
  const [accumulatedLogs, setAccumulatedLogs] = useState<BiometricAttendanceLogRow[]>([]);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 2000);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  const { data: devices } = useBiometricDevices(gymId ?? undefined);

  const filters = {
    deviceId: selectedDevice || undefined,
    logType: selectedLogType || undefined,
    fromDate: fromDate ? fromDate.toISOString() : undefined,
    toDate: toDate ? toDate.toISOString() : undefined,
    searchQuery: debouncedSearch || undefined,
  };

  useEffect(() => {
    setPage(1);
  }, [selectedDevice, selectedLogType, fromDate, toDate, debouncedSearch]);

  const { data, isLoading, refetch, isFetching } = useBiometricAttendanceLogs(gymId ?? undefined, page, limit, filters);

  const total = data?.total || 0;
  const totalPages = Math.ceil(total / limit) || 1;

  useEffect(() => {
    if (data?.data) {
      if (page === 1) {
        setAccumulatedLogs(data.data);
      } else {
        setAccumulatedLogs((prev) => {
          const prevIds = new Set(prev.map((l) => l.logId));
          const newUnique = data.data.filter((l) => !prevIds.has(l.logId));
          return [...prev, ...newUnique];
        });
      }
    }
  }, [data, page]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      if (devices && devices.length > 0) {
        await Promise.allSettled(
          devices.map((device) => syncDeviceLogs(device.deviceId))
        );
      }
    } catch (err) {
      console.error('[LogsTab] Error syncing device logs:', err);
    }
    if (page === 1) {
      await refetch();
    } else {
      setPage(1);
    }
    setRefreshing(false);
  }, [devices, page, refetch]);

  const handleReset = () => {
    setSearchQuery('');
    setSelectedDevice('');
    setSelectedLogType('');
    setFromDate(null);
    setToDate(null);
    setPage(1);
  };

  const formatDateString = (date: Date) => {
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatTime = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
    } catch {
      return '--:--';
    }
  };

  const formatDate = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return '';
    }
  };

  const formatAuthMethod = (method: string | undefined | null) => {
    if (!method) return 'Unknown';
    const lower = method.toLowerCase();
    if (lower === 'face') return 'Face';
    if (lower === 'fingerprint' || lower === 'fp') return 'Fingerprint';
    if (lower === 'card') return 'Card';
    if (lower === 'pw' || lower === 'password') return 'Password';
    if (lower === 'faceorfporcardorpw') return 'Any (Device)';
    return method.charAt(0).toUpperCase() + method.slice(1);
  };

  const hasMore = page < totalPages;

  const renderFooter = () => {
    if (isFetching) {
      return (
        <View className="py-4 items-center">
          <ActivityIndicator size="small" color="#CCF200" />
        </View>
      );
    }
    if (hasMore) {
      return (
        <View className="py-4 items-center">
          <Pressable
            onPress={() => setPage((p) => p + 1)}
            className="flex-row items-center gap-x-2 bg-[#141414] border border-[#2A2A2A] px-4 py-2.5 rounded-xl active:opacity-70"
          >
            <ArrowsClockwise size={16} color="#CCF200" />
            <Text className="text-white text-sm font-semibold">Load More</Text>
          </Pressable>
        </View>
      );
    }
    if (accumulatedLogs.length > 0) {
      return (
        <View className="py-6 items-center">
          <Text className="text-[#666666] text-xs font-sans">You've reached the end of the logs</Text>
        </View>
      );
    }
    return null;
  };

  return (
    <View className="flex-1 bg-[#0A0A0A]">
      <View className="p-4 bg-[#141414] border-b border-[#2A2A2A] gap-y-3">
        <View className="flex-row items-center gap-x-2">
          <View className="flex-1 flex-row items-center bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl px-3 py-2">
            <MagnifyingGlass size={20} color="#888888" />
            <TextInput
              className="flex-1 text-white ml-2 text-sm py-1 font-sans"
              placeholder="Search customer name..."
              placeholderTextColor="#555555"
              value={searchQuery}
              onChangeText={(text) => {
                setSearchQuery(text);
              }}
            />
          </View>
          <Pressable
            onPress={() => refetch()}
            className="p-3 bg-[#2A2A2A] rounded-xl active:opacity-70"
          >
            <ArrowsClockwise size={20} color="#FFFFFF" />
          </Pressable>
        </View>

        <View className="flex-row gap-x-2">
          <Pressable
            onPress={() => { setShowFromPicker(true); setShowToPicker(false); }}
            className="flex-1 flex-row items-center justify-between bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl px-3 py-2.5"
          >
            <View className="flex-row items-center">
              <Calendar size={18} color="#888888" />
              <Text className="text-white text-xs ml-2 font-medium">
                {fromDate ? formatDateString(fromDate) : 'From Date'}
              </Text>
            </View>
            {fromDate && (
              <Pressable onPress={(e) => { e.stopPropagation(); setFromDate(null); setPage(1); }}>
                <Text className="text-[#EF4444] text-[10px] font-semibold">Clear</Text>
              </Pressable>
            )}
          </Pressable>

          <Pressable
            onPress={() => { setShowToPicker(true); setShowFromPicker(false); }}
            className="flex-1 flex-row items-center justify-between bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl px-3 py-2.5"
          >
            <View className="flex-row items-center">
              <Calendar size={18} color="#888888" />
              <Text className="text-white text-xs ml-2 font-medium">
                {toDate ? formatDateString(toDate) : 'To Date'}
              </Text>
            </View>
            {toDate && (
              <Pressable onPress={(e) => { e.stopPropagation(); setToDate(null); setPage(1); }}>
                <Text className="text-[#EF4444] text-[10px] font-semibold">Clear</Text>
              </Pressable>
            )}
          </Pressable>
        </View>

        {showFromPicker && Platform.OS === 'ios' && (
          <View className="bg-[#1c1c1e] p-3 items-center border border-[#2A2A2A] rounded-xl mt-2">
            <DateTimePicker
              value={fromDate || new Date()}
              mode="date"
              display="inline"
              themeVariant="dark"
              onChange={(event, date) => {
                if (date) {
                  setFromDate(date);
                  setPage(1);
                }
              }}
            />
            <Pressable onPress={() => setShowFromPicker(false)} className="mt-2 py-1.5 px-4 bg-[#CCF200] rounded-lg">
              <Text className="text-black font-semibold text-xs">Done</Text>
            </Pressable>
          </View>
        )}

        {showFromPicker && Platform.OS === 'android' && (
          <DateTimePicker
            value={fromDate || new Date()}
            mode="date"
            display="default"
            onChange={(event, date) => {
              setShowFromPicker(false);
              if (date) {
                setFromDate(date);
                setPage(1);
              }
            }}
          />
        )}

        {showToPicker && Platform.OS === 'ios' && (
          <View className="bg-[#1c1c1e] p-3 items-center border border-[#2A2A2A] rounded-xl mt-2">
            <DateTimePicker
              value={toDate || new Date()}
              mode="date"
              display="inline"
              themeVariant="dark"
              onChange={(event, date) => {
                if (date) {
                  setToDate(date);
                  setPage(1);
                }
              }}
            />
            <Pressable onPress={() => setShowToPicker(false)} className="mt-2 py-1.5 px-4 bg-[#CCF200] rounded-lg">
              <Text className="text-black font-semibold text-xs">Done</Text>
            </Pressable>
          </View>
        )}

        {showToPicker && Platform.OS === 'android' && (
          <DateTimePicker
            value={toDate || new Date()}
            mode="date"
            display="default"
            onChange={(event, date) => {
              setShowToPicker(false);
              if (date) {
                setToDate(date);
                setPage(1);
              }
            }}
          />
        )}

        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="py-1">
          <Pressable
            onPress={() => { setSelectedLogType(''); setPage(1); }}
            className={`px-3 py-1.5 rounded-full mr-2 border ${selectedLogType === '' ? 'bg-[#CCF200] border-[#CCF200]' : 'bg-[#2A2A2A] border-[#2A2A2A]'}`}
          >
            <Text className={`text-xs font-semibold ${selectedLogType === '' ? 'text-black' : 'text-white'}`}>All Types</Text>
          </Pressable>
          <Pressable
            onPress={() => { setSelectedLogType('check_in'); setPage(1); }}
            className={`px-3 py-1.5 rounded-full mr-2 border ${selectedLogType === 'check_in' ? 'bg-[#CCF200] border-[#CCF200]' : 'bg-[#2A2A2A] border-[#2A2A2A]'}`}
          >
            <Text className={`text-xs font-semibold ${selectedLogType === 'check_in' ? 'text-black' : 'text-white'}`}>Check In</Text>
          </Pressable>
          <Pressable
            onPress={() => { setSelectedLogType('check_out'); setPage(1); }}
            className={`px-3 py-1.5 rounded-full mr-2 border ${selectedLogType === 'check_out' ? 'bg-[#CCF200] border-[#CCF200]' : 'bg-[#2A2A2A] border-[#2A2A2A]'}`}
          >
            <Text className={`text-xs font-semibold ${selectedLogType === 'check_out' ? 'text-black' : 'text-white'}`}>Check Out</Text>
          </Pressable>

          {/* <View className="w-[1px] bg-[#2A2A2A] mx-2 h-6 self-center" /> */}

          <Pressable
            onPress={() => setShowDevicePicker(true)}
            className="flex-row items-center px-3 py-1.5 rounded-full mr-2 border bg-[#2A2A2A] border-[#2A2A2A]"
          >
            <Text className="text-xs font-semibold text-white mr-1">
              {selectedDevice ? devices?.find(d => d.deviceId === selectedDevice)?.deviceName || 'All Devices' : 'All Devices'}
            </Text>
            <CaretDown size={12} color="#FFFFFF" />
          </Pressable>
        </ScrollView>

        {(searchQuery || selectedDevice || selectedLogType || fromDate || toDate) && (
          <Pressable onPress={handleReset} className="items-end py-1">
            <Text className="text-[#CCF200] text-xs font-semibold">Reset Filters</Text>
          </Pressable>
        )}
      </View>

      {isLoading && page === 1 ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#CCF200" />
        </View>
      ) : accumulatedLogs.length === 0 ? (
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ flexGrow: 1, alignItems: 'center', justifyContent: 'flex-start', padding: 20, paddingTop: 35 }}
          refreshControl={<CustomRefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          <View className="w-16 h-16 rounded-full bg-[#1A1A1A] items-center justify-center mb-2">
            <Clock size={32} color="#888888" />
          </View>
          <Text className="text-white text-lg font-semibold mb-2">No Logs Found</Text>
          <Text className="text-[#888888] text-center px-10">
            No biometric device logs match the selected filters.
          </Text>
        </ScrollView>
      ) : (
        <View className="flex-1">
          <FlatList
            data={accumulatedLogs}
            keyExtractor={(item) => item.logId}
            refreshControl={<CustomRefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
            ListFooterComponent={renderFooter}
            renderItem={({ item }) => {
              const isCheckIn = item.logType === 'check_in';
              const isAccepted = item.processedStatus === 'Accepted';
              const isRejected = item.processedStatus === 'Rejected';

              return (
                <View className="bg-[#141414] border border-[#2A2A2A] rounded-2xl p-4 mb-3">
                  <View className="flex-row items-center justify-between mb-2">
                    <View className="flex-1 mr-2">
                      <Text className="text-white font-semibold text-base">{item.customer?.fullName || 'Unknown Customer'}</Text>
                      <Text className="text-[#888888] text-xs mt-0.5">{item.customer?.phone || 'No phone'}</Text>
                    </View>

                    <View className={`flex-row items-center gap-x-1 px-2.5 py-1 rounded-full ${isCheckIn ? 'bg-emerald-500/10' : 'bg-orange-500/10'}`}>
                      {isCheckIn ? (
                        <ArrowDownLeft size={12} color="#10B981" weight="bold" />
                      ) : (
                        <ArrowUpRight size={12} color="#F97316" weight="bold" />
                      )}
                      <Text className={`text-xs font-semibold ${isCheckIn ? 'text-emerald-500' : 'text-orange-500'}`}>
                        {isCheckIn ? 'Check In' : 'Check Out'}
                      </Text>
                    </View>
                  </View>

                  <View className="border-t border-[#2A2A2A] my-2" />

                  <View className="flex-row justify-between items-center mt-1">
                    <View className="gap-y-1 flex-1 pr-2">
                      <Text className="text-[#888888] text-[10px] uppercase font-semibold tracking-wider">Device</Text>
                      <Text className="text-white text-xs font-semibold" numberOfLines={1}>{item.device?.deviceName || 'Entrance Device'}</Text>
                      <View className="flex-row items-center mt-0.5">
                        <Text className="text-[#888888] text-[10px] font-medium mr-1">Auth: </Text>
                        <Text className="text-[#CCF200] text-[10px] font-semibold">{formatAuthMethod(item.authMethod)}</Text>
                      </View>
                    </View>

                    <View className="gap-y-1 items-center mr-2">
                      <Text className="text-[#888888] text-[10px] uppercase font-semibold tracking-wider">Scan Time</Text>
                      <Text className="text-white text-xs font-semibold">{formatTime(item.scanTimestamp)}</Text>
                      <Text className="text-[#888888] text-[10px]">{formatDate(item.scanTimestamp)}</Text>
                    </View>

                    <View className="gap-y-1 items-end">
                      <Text className="text-[#888888] text-[10px] uppercase font-semibold tracking-wider">Status</Text>
                      <View className="flex-row items-center gap-x-1 mt-0.5">
                        {isAccepted ? (
                          <CheckCircle size={14} color="#10B981" weight="fill" />
                        ) : isRejected ? (
                          <WarningCircle size={14} color="#EF4444" weight="fill" />
                        ) : (
                          <Clock size={14} color="#F59E0B" weight="fill" />
                        )}
                        <Text className={`text-xs font-semibold ${isAccepted ? 'text-emerald-500' : isRejected ? 'text-red-500' : 'text-amber-500'}`}>
                          {item.processedStatus}
                        </Text>
                      </View>
                      {item.rejectionReason && (
                        <Text className="text-red-500 text-[10px] mt-0.5 max-w-[100px] truncate">
                          {item.rejectionReason}
                        </Text>
                      )}
                    </View>
                  </View>
                </View>
              );
            }}
          />
        </View>
      )}

      <Modal
        visible={showDevicePicker}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowDevicePicker(false)}
      >
        <Pressable
          className="flex-1 bg-black/60 justify-end"
          onPress={() => setShowDevicePicker(false)}
        >
          <Pressable
            className="bg-[#141414] rounded-t-3xl border-t border-[#2A2A2A] max-h-[70%]"
            onPress={(e) => e.stopPropagation()}
          >
            <View className="p-5 py-3 border-b border-[#2A2A2A] flex-row items-center justify-between">
              <Text className="text-white text-lg font-semibold">Select Device</Text>
              <Pressable onPress={() => setShowDevicePicker(false)} className="p-1.5">
                <Text className="text-[#888888] font-semibold text-lg px-1">✕</Text>
              </Pressable>
            </View>
            <ScrollView className="p-4" contentContainerStyle={{ paddingBottom: 40 }}>
              <Pressable
                onPress={() => { setSelectedDevice(''); setPage(1); setShowDevicePicker(false); }}
                className={`flex-row items-center justify-between p-4 rounded-xl mb-3 border ${selectedDevice === '' ? 'bg-[#CCF200]/10 border-[#CCF200]/30' : 'bg-[#1A1A1A] border-[#2A2A2A]'}`}
              >
                <Text className={`font-semibold text-base ${selectedDevice === '' ? 'text-[#CCF200]' : 'text-white'}`}>All Devices</Text>
                {selectedDevice === '' && <Check size={20} color="#CCF200" weight="bold" />}
              </Pressable>

              {devices?.map((dev) => (
                <Pressable
                  key={dev.deviceId}
                  onPress={() => { setSelectedDevice(dev.deviceId); setPage(1); setShowDevicePicker(false); }}
                  className={`flex-row items-center justify-between p-4 rounded-xl mb-3 border ${selectedDevice === dev.deviceId ? 'bg-[#CCF200]/10 border-[#CCF200]/30' : 'bg-[#1A1A1A] border-[#2A2A2A]'}`}
                >
                  <View>
                    <Text className={`font-semibold text-base ${selectedDevice === dev.deviceId ? 'text-[#CCF200]' : 'text-white'}`}>{dev.deviceName}</Text>
                    <Text className="text-[#888888] text-xs mt-1">{dev.deviceSerialNumber}</Text>
                  </View>
                  {selectedDevice === dev.deviceId && <Check size={20} color="#CCF200" weight="bold" />}
                </Pressable>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
