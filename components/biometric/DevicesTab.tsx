import React, { useState, useEffect } from 'react';
import { View, ScrollView, Pressable, ActivityIndicator, TextInput, FlatList } from 'react-native';
import { Text } from '@/components/nativewindui/Text';
import { useUser } from '@/context/UserContext';
import { useBiometricDevicesPaginated, useSaveBiometricDevice, useDeleteBiometricDevice } from '@/hooks/biometrics/useBiometricDevices';
import { Plus, Trash, PencilSimple, WifiHigh, WifiSlash, HardDrives, ArrowsClockwise } from 'phosphor-react-native';
import { BiometricDevicePayload } from '@/helpers/biometrics/biometricDeviceAPI';
import { toast } from '@/lib/toast';
import { CustomRefreshControl } from '@/components/CustomRefreshControl';
import ConfirmModal from '@/components/ConfirmModal';

export default function DevicesTab() {
  const { gymId, userId } = useUser();

  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [accumulatedDevices, setAccumulatedDevices] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);
  const [deviceToDelete, setDeviceToDelete] = useState<any>(null);

  const [isFormVisible, setIsFormVisible] = useState(false);
  const [formState, setFormState] = useState<BiometricDevicePayload>({
    gymId: gymId || '',
    deviceName: 'Main Entrance Device',
    deviceSerialNumber: '',
    deviceIp: '',
    devicePort: 80,
    deviceUsername: 'admin',
    devicePassword: '',
    deviceType: 'multi',
    gateDirection: 'in',
    deviceModel: '',
    firmwareVersion: '',
    createdBy: userId || '',
  });

  const { data: devicesData, isLoading, refetch, isFetching } = useBiometricDevicesPaginated(gymId ?? undefined, page, limit);
  const saveDevice = useSaveBiometricDevice();
  const deleteDevice = useDeleteBiometricDevice();

  useEffect(() => {
    if (devicesData?.data) {
      if (page === 1) {
        setAccumulatedDevices(devicesData.data);
      } else {
        setAccumulatedDevices((prev) => {
          const prevIds = new Set(prev.map((d) => d.deviceId));
          const newUnique = devicesData.data.filter((d) => !prevIds.has(d.deviceId));
          return [...prev, ...newUnique];
        });
      }
    }
  }, [devicesData, page]);

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    if (page === 1) {
      await refetch();
    } else {
      setPage(1);
    }
    setRefreshing(false);
  }, [refetch, page]);

  const handleSave = () => {
    if (!formState.deviceIp || !formState.deviceSerialNumber) return;
    saveDevice.mutate(
      { ...formState, gymId: gymId as string, createdBy: userId as string },
      {
        onSuccess: () => {
          setIsFormVisible(false);
          setPage(1); // Refresh list
          toast.success('Device saved successfully');
        }
      }
    );
  };

  const handleDelete = () => {
    if (deviceToDelete) {
      deleteDevice.mutate(
        { deviceId: deviceToDelete.deviceId, gymId: gymId as string },
        {
          onSuccess: () => {
            setDeviceToDelete(null);
            setPage(1); // Refresh list
            toast.success('Device deleted successfully');
          }
        }
      );
    }
  };

  const openEdit = (dev: any) => {
    setFormState({
      deviceId: dev.deviceId,
      gymId: dev.gymId,
      deviceName: dev.deviceName,
      deviceSerialNumber: dev.deviceSerialNumber,
      deviceIp: dev.deviceIp,
      devicePort: dev.devicePort,
      deviceUsername: dev.deviceUsername || '',
      devicePassword: dev.devicePassword || '',
      deviceType: dev.deviceType,
      gateDirection: dev.gateDirection || 'in',
      deviceModel: dev.deviceModel || '',
      firmwareVersion: dev.firmwareVersion || '',
      createdBy: userId || '',
    });
    setIsFormVisible(true);
  };

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center pt-20">
        <ActivityIndicator size="large" color="#CCF200" />
      </View>
    );
  }

  if (isFormVisible) {
    return (
      <ScrollView className="flex-1 p-4" showsVerticalScrollIndicator={false}>
        <View className="bg-[#141414] rounded-2xl p-4 border border-[#2A2A2A] mb-[128px]">
          <Text className="text-white text-lg font-semibold mb-4">
            {formState.deviceId ? 'Edit Device' : 'Add Entrance Device'}
          </Text>

          <Text className="text-[#888888] text-xs font-medium mb-1">Device Name</Text>
          <TextInput
            className="w-full bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl px-4 py-3 text-white mb-4 font-sans"
            value={formState.deviceName}
            onChangeText={(text) => setFormState(p => ({ ...p, deviceName: text }))}
            placeholder="e.g. Main Entrance"
            placeholderTextColor="#555"
          />

          <Text className="text-[#888888] text-xs font-medium mb-1">Serial Number</Text>
          <TextInput
            className="w-full bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl px-4 py-3 text-white mb-4 font-sans"
            value={formState.deviceSerialNumber}
            onChangeText={(text) => setFormState(p => ({ ...p, deviceSerialNumber: text }))}
            placeholder="Enter Device Serial No"
            placeholderTextColor="#555"
          />

          <Text className="text-[#888888] text-xs font-medium mb-1">IP Address</Text>
          <TextInput
            className="w-full bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl px-4 py-3 text-white mb-4 font-sans"
            value={formState.deviceIp}
            onChangeText={(text) => setFormState(p => ({ ...p, deviceIp: text }))}
            placeholder="e.g. 192.168.1.201"
            placeholderTextColor="#555"
            keyboardType="numbers-and-punctuation"
          />

          <Text className="text-[#888888] text-xs font-medium mb-1">Port</Text>
          <TextInput
            className="w-full bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl px-4 py-3 text-white mb-4 font-sans"
            value={formState.devicePort?.toString() || ''}
            onChangeText={(text) => setFormState(p => ({ ...p, devicePort: text ? parseInt(text) : ('' as any) }))}
            placeholder="e.g. 4370 or 80"
            placeholderTextColor="#555"
            keyboardType="numeric"
          />

          <Text className="text-[#888888] text-xs font-medium mb-1">Username (Hikvision/ZKTeco)</Text>
          <TextInput
            className="w-full bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl px-4 py-3 text-white mb-4 font-sans"
            value={formState.deviceUsername}
            onChangeText={(text) => setFormState(p => ({ ...p, deviceUsername: text }))}
            placeholder="e.g. admin"
            placeholderTextColor="#555"
            autoCapitalize="none"
          />

          <Text className="text-[#888888] text-xs font-medium mb-1">Password</Text>
          <TextInput
            className="w-full bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl px-4 py-3 text-white mb-6 font-sans"
            value={formState.devicePassword}
            onChangeText={(text) => setFormState(p => ({ ...p, devicePassword: text }))}
            placeholder="Enter Device Password"
            placeholderTextColor="#555"
            secureTextEntry
          />

          <View className="flex-row items-center gap-3">
            <Pressable
              className="flex-1 bg-[#2A2A2A] rounded-xl py-3 items-center"
              onPress={() => setIsFormVisible(false)}
            >
              <Text className="text-white font-semibold">Cancel</Text>
            </Pressable>
            <Pressable
              className="flex-1 bg-[#CCF200] rounded-xl py-3 items-center"
              onPress={handleSave}
              disabled={saveDevice.isPending}
            >
              <Text className="text-black font-semibold">
                {saveDevice.isPending ? 'Saving...' : 'Save'}
              </Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    );
  }

  const total = devicesData?.total || 0;
  const totalPages = Math.ceil(total / limit) || 1;
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
    if (accumulatedDevices.length > 0) {
      return (
        <View className="py-6 items-center">
          <Text className="text-[#666666] text-xs font-sans">You've reached the end of the list</Text>
        </View>
      );
    }
    return null;
  };

  return (
    <View className="flex-1 p-4">
      {/* Header Add Button */}
      <View className="flex-row justify-between items-center mb-4">
        <Text className="text-white text-base font-semibold">Registered Devices</Text>
        <Pressable
          onPress={() => {
            setFormState({
              gymId: gymId || '',
              deviceName: 'Main Entrance Device',
              deviceSerialNumber: '',
              deviceIp: '',
              devicePort: 80,
              deviceUsername: 'admin',
              devicePassword: '',
              deviceType: 'multi',
              gateDirection: 'in',
              deviceModel: '',
              firmwareVersion: '',
              createdBy: userId || '',
            });
            setIsFormVisible(true);
          }}
          className="flex-row items-center bg-[#CCF200] px-4 py-2 rounded-xl active:opacity-85"
        >
          <Plus size={16} color="#000000" weight="bold" />
          <Text className="text-black font-semibold text-xs ml-1.5">Add Device</Text>
        </Pressable>
      </View>

      {accumulatedDevices.length === 0 ? (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ flexGrow: 1, alignItems: 'center', justifyContent: 'center' }}
          refreshControl={
            <CustomRefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          <View className="w-16 h-16 rounded-full bg-[#1A1A1A] items-center justify-center mb-4">
            <HardDrives size={32} color="#CCF200" />
          </View>
          <Text className="text-white text-lg font-semibold mb-2">No Device Configured</Text>
          <Text className="text-[#888888] text-center px-10">
            Set up a biometric device to automatically mark customer attendance.
          </Text>
        </ScrollView>
      ) : (
        <FlatList
          data={accumulatedDevices}
          keyExtractor={(item) => item.deviceId}
          refreshControl={
            <CustomRefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          contentContainerStyle={{ paddingBottom: 100 }}
          ListFooterComponent={renderFooter}
          renderItem={({ item: dev }) => (
            <View className="bg-[#141414] border border-[#2A2A2A] rounded-2xl p-4 mb-3">
              <View className="flex-row items-start justify-between mb-4">
                <View className="flex-1">
                  <Text className="text-white text-lg font-semibold mb-1">{dev.deviceName}</Text>
                  <Text className="text-[#888888] text-sm">SN: {dev.deviceSerialNumber}</Text>
                </View>
                <View className="flex-row gap-2">
                  <Pressable onPress={() => openEdit(dev)} className="p-2 bg-[#2A2A2A] rounded-lg active:opacity-70">
                    <PencilSimple size={18} color="#FFFFFF" />
                  </Pressable>
                  <Pressable
                    onPress={() => {
                      setDeviceToDelete(dev);
                      setIsDeleteModalVisible(true);
                    }}
                    className="p-2 bg-[#3A1414] rounded-lg active:opacity-70"
                  >
                    <Trash size={18} color="#EF4444" />
                  </Pressable>
                </View>
              </View>
              <View className="flex-row justify-between pt-4 border-t border-[#2A2A2A]">
                <View>
                  <Text className="text-[#888888] text-xs mb-1">IP Address</Text>
                  <Text className="text-white text-sm font-medium">{dev.deviceIp} : {dev.devicePort}</Text>
                </View>
              </View>
            </View>
          )}
        />
      )}

      <ConfirmModal
        visible={isDeleteModalVisible}
        onClose={() => {
          setIsDeleteModalVisible(false);
          setDeviceToDelete(null);
        }}
        onConfirm={() => {
          setIsDeleteModalVisible(false);
          handleDelete();
        }}
        title="Delete Device"
        description="Are you sure you want to delete this biometric device? Customers will no longer be able to check in via this device."
        confirmText="Delete Device"
        icon={
          <View className="w-12 h-12 bg-red-500/20 rounded-full items-center justify-center">
            <Trash size={24} color="#ef4444" weight="bold" />
          </View>
        }
      />
    </View>
  );
}
