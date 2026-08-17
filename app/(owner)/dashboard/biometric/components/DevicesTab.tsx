import React, { useState, useEffect } from 'react';
import { View, ScrollView, Pressable, ActivityIndicator, TextInput } from 'react-native';
import { Text } from '@/components/nativewindui/Text';
import { useUser } from '@/context/UserContext';
import { useBiometricDevices, useSaveBiometricDevice, useDeleteBiometricDevice } from '@/hooks/biometrics/useBiometricDevices';
import { Plus, Trash, PencilSimple, WifiHigh, WifiSlash, HardDrives } from 'phosphor-react-native';
import { BiometricDevicePayload } from '@/helpers/biometrics/biometricDeviceAPI';
import { toast } from '@/lib/toast';
import { CustomRefreshControl } from '@/components/CustomRefreshControl';
import ConfirmModal from '@/components/ConfirmModal';

export default function DevicesTab() {
  const { gymId, userId } = useUser();
  const { data: devices, isLoading, refetch } = useBiometricDevices(gymId ?? undefined);
  const saveDevice = useSaveBiometricDevice();
  const deleteDevice = useDeleteBiometricDevice();

  const [refreshing, setRefreshing] = useState(false);
  const [isDeviceReachable, setIsDeviceReachable] = useState(false);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);

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

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center pt-20">
        <ActivityIndicator size="large" color="#CCF200" />
      </View>
    );
  }

  const device = devices && devices.length > 0 ? devices[0] : null;
  const isOnline = device ? (device.isOnline || isDeviceReachable) : false;

  useEffect(() => {
    let isMounted = true;
    const checkConnection = async () => {
      if (!device?.deviceIp) return;
      try {
        setIsTestingConnection(true);
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);
        await fetch(`http://${device.deviceIp}:${device.devicePort}`, { signal: controller.signal });
        clearTimeout(timeoutId);
        if (isMounted) setIsDeviceReachable(true);
      } catch (error) {
        if (isMounted) setIsDeviceReachable(false);
      } finally {
        if (isMounted) setIsTestingConnection(false);
      }
    };

    checkConnection();
    const intervalId = setInterval(checkConnection, 10000);
    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, [device?.deviceIp, device?.devicePort]);

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const handleSave = () => {
    if (!formState.deviceIp || !formState.deviceSerialNumber) return;
    saveDevice.mutate(
      { ...formState, gymId: gymId as string, createdBy: userId as string },
      {
        onSuccess: () => {
          setIsFormVisible(false);
          toast.success('Device saved successfully');
        }
      }
    );
  };

  const handleDelete = () => {
    if (device) {
      deleteDevice.mutate({ deviceId: device.deviceId, gymId: gymId as string });
    }
  };

  const openEdit = () => {
    if (device) {
      setFormState({
        deviceId: device.deviceId,
        gymId: device.gymId,
        deviceName: device.deviceName,
        deviceSerialNumber: device.deviceSerialNumber,
        deviceIp: device.deviceIp,
        devicePort: device.devicePort,
        deviceUsername: device.deviceUsername || '',
        devicePassword: device.devicePassword || '',
        deviceType: device.deviceType,
        gateDirection: device.gateDirection || 'in',
        deviceModel: device.deviceModel || '',
        firmwareVersion: device.firmwareVersion || '',
        createdBy: userId || '',
      });
      setIsFormVisible(true);
    }
  };

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

  return (
    <ScrollView
      className="flex-1 p-4"
      showsVerticalScrollIndicator={false}
      refreshControl={
        <CustomRefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {!device ? (
        <View className="items-center justify-center pt-20">
          <View className="w-16 h-16 rounded-full bg-[#1A1A1A] items-center justify-center mb-4">
            <HardDrives size={32} color="#CCF200" />
          </View>
          <Text className="text-white text-lg font-semibold mb-2">No Device Configured</Text>
          <Text className="text-[#888888] text-center mb-6 px-10">
            Set up the main entrance biometric device to automatically mark customer attendance.
          </Text>
          <Pressable
            onPress={() => setIsFormVisible(true)}
            className="flex-row items-center bg-[#CCF200] px-6 py-3 rounded-full active:opacity-80"
          >
            <Plus size={18} color="#000000" weight="bold" />
            <Text className="text-black font-semibold ml-2">Add Device</Text>
          </Pressable>
        </View>
      ) : (
        <View className="bg-[#141414] border border-[#2A2A2A] rounded-2xl p-4">
          <View className="flex-row items-start justify-between mb-4">
            <View className="flex-1">
              <View className="flex-row items-center gap-2 mb-1">
                <Text className="text-white text-lg font-semibold">{device.deviceName}</Text>
                {/* {isTestingConnection ? (
                  <ActivityIndicator size="small" color="#888888" />
                ) : isOnline ? (
                  <WifiHigh size={16} color="#4ADE80" />
                ) : (
                  <WifiSlash size={16} color="#EF4444" />
                )} */}
              </View>
              <Text className="text-[#888888] text-sm">SN: {device.deviceSerialNumber}</Text>
            </View>
            <View className="flex-row gap-2">
              <Pressable onPress={openEdit} className="p-2 bg-[#2A2A2A] rounded-lg active:opacity-70">
                <PencilSimple size={18} color="#FFFFFF" />
              </Pressable>
              <Pressable onPress={() => setIsDeleteModalVisible(true)} className="p-2 bg-[#3A1414] rounded-lg active:opacity-70">
                <Trash size={18} color="#EF4444" />
              </Pressable>
            </View>
          </View>

          <View className="flex-row justify-between pt-4 border-t border-[#2A2A2A]">
            <View>
              <Text className="text-[#888888] text-xs mb-1">IP Address</Text>
              <Text className="text-white text-sm font-medium">{device.deviceIp} : {device.devicePort}</Text>
            </View>
            {/* <View className="items-end">
              <Text className="text-[#888888] text-xs">Status</Text>
              <View className={`px-2 py-0.5 rounded-md mt-1 ${isOnline ? 'bg-[#4ADE80]/20' : 'bg-[#EF4444]/20'}`}>
                <Text className={`text-[10px] font-semibold ${isOnline ? 'text-[#4ADE80]' : 'text-[#EF4444]'}`}>
                  {isOnline ? 'ONLINE' : 'OFFLINE'}
                </Text>
              </View>
            </View> */}
          </View>
        </View>
      )}

      <ConfirmModal
        visible={isDeleteModalVisible}
        onClose={() => setIsDeleteModalVisible(false)}
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
    </ScrollView>
  );
}
