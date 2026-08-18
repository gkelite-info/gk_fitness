import React, { useState } from 'react';
import { View, ScrollView, Pressable, ActivityIndicator, TextInput, Image, Alert } from 'react-native';
import { Text } from '@/components/nativewindui/Text';
import { useUser } from '@/context/UserContext';
import { useBiometricCredentials, useSaveBiometricCredential, useDeleteBiometricCredential } from '@/hooks/biometrics/useBiometricCredentials';
import { useBiometricDevices } from '@/hooks/biometrics/useBiometricDevices';
import { useGymCustomers } from '@/hooks/customers/useGymCustomers';
import { Fingerprint, Scan, Trash, MagnifyingGlass, HardDrives, UserFocus } from 'phosphor-react-native';
import { CustomRefreshControl } from '@/components/CustomRefreshControl';
import ConfirmModal from '@/components/ConfirmModal';
import { registerUserOnDevice, deleteUserOnDevice, uploadFingerprintToDevice, captureFingerprintOnDevice, uploadFaceToDevice, captureFaceOnDevice, deleteFaceFromDevice } from '@/helpers/biometrics/biometricAPIs';
import { toast } from '@/lib/toast';
import * as ImagePicker from 'expo-image-picker';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';

export default function CredentialsTab() {
  const { gymId } = useUser();
  const { data: devices } = useBiometricDevices(gymId ?? undefined);
  const { data: credentials, isLoading: credsLoading, refetch: refetchCredentials } = useBiometricCredentials(gymId ?? undefined);
  const { data: customers, isLoading: customersLoading, refetch: refetchCustomers } = useGymCustomers(gymId ?? undefined);
  const saveCredential = useSaveBiometricCredential();
  const deleteCredential = useDeleteBiometricCredential();

  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [deviceUserId, setDeviceUserId] = useState('');
  const [unenrollState, setUnenrollState] = useState<{ credentialId: string, deviceUserId: string } | null>(null);
  const [isCapturingFingerprint, setIsCapturingFingerprint] = useState(false);
  const [isUploadingFingerprint, setIsUploadingFingerprint] = useState(false);
  const [isCapturingFace, setIsCapturingFace] = useState(false);
  const [isUploadingFace, setIsUploadingFace] = useState(false);
  const [isDeletingFace, setIsDeletingFace] = useState(false);
  const [removeFaceState, setRemoveFaceState] = useState<{ deviceUserId: string, existingCred: any } | null>(null);

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refetchCredentials(), refetchCustomers()]);
    setRefreshing(false);
  }, [refetchCredentials, refetchCustomers]);

  if (credsLoading || customersLoading) {
    return (
      <View className="flex-1 items-center justify-center pt-20">
        <ActivityIndicator size="large" color="#CCF200" />
      </View>
    );
  }

  const device = devices && devices.length > 0 ? devices[0] : null;

  if (!device) {
    return (
      <View className="flex-1 items-center justify-center pt-20 p-4">
        <View className="w-16 h-16 rounded-full bg-[#1A1A1A] items-center justify-center mb-4">
          <HardDrives size={32} color="#EF4444" />
        </View>
        <Text className="text-white text-lg font-semibold mb-2 text-center">No Device Found</Text>
        <Text className="text-[#888888] text-center">
          You must add an Entrance Device in the previous tab before you can enroll credentials.
        </Text>
      </View>
    );
  }

  const enrolledCustomerIds = new Set(credentials?.map(c => c.customerId) || []);

  let filteredCustomers = (customers || []).filter((c: any) =>
    c.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.phone.includes(searchQuery)
  );

  const handleEnroll = async () => {
    if (!selectedCustomer || !deviceUserId) return;

    if (device) {
      try {
        await registerUserOnDevice({
          ip: device.deviceIp,
          port: device.devicePort,
          devIndex: device.deviceId,
          username: device.deviceUsername || undefined,
          password: device.devicePassword || undefined,
          employeeNo: deviceUserId,
          name: selectedCustomer.fullName
        });
        toast.success("User added to biometric device");
      } catch (err: any) {
        toast.error("Device error: " + err.message);
        return;
      }
    }

    saveCredential.mutate(
      {
        gymId: gymId as string,
        customerId: selectedCustomer.customerId,
        deviceId: device!.deviceId,
        deviceUserId: deviceUserId,
        hasFingerprint: false,
        hasFace: false,
        hasCard: false,
        rfidCardNo: undefined,
      },
      {
        onSuccess: () => {
          setSelectedCustomer(null);
          setDeviceUserId('');
          toast.success("Credential saved in system");
        }
      }
    );
  };

  const handleUnenroll = async (credentialId: string, deviceUserId: string) => {
    if (device) {
      try {
        await deleteUserOnDevice({
          ip: device.deviceIp,
          port: device.devicePort,
          devIndex: device.deviceId,
          username: device.deviceUsername || undefined,
          password: device.devicePassword || undefined,
          employeeNo: deviceUserId
        });
        toast.success("User removed from biometric device");
      } catch (err: any) {
        toast.error("Device error: " + err.message);
        console.error("Failed to delete on device", err);
        return;
      }
    }

    deleteCredential.mutate(
      { credentialId, gymId: gymId as string },
      {
        onSuccess: () => {
          toast.success("Credential removed from system");
        }
      }
    );
  };

  const handleUploadFaceMethod = async (method: 'camera' | 'library', deviceUserId: string, existingCred: any) => {
    const pickerOptions: ImagePicker.ImagePickerOptions = {
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [3, 4],
      quality: 0.4,
    };

    if (method === 'camera') {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        toast.error('Camera permission is required.');
        return;
      }
      const result = await ImagePicker.launchCameraAsync(pickerOptions);
      if (!result.canceled && result.assets[0]) {
        setIsCapturingFace(true);
        try {
          const manipResult = await manipulateAsync(
            result.assets[0].uri,
            [{ resize: { width: 600 } }],
            { compress: 0.8, format: SaveFormat.JPEG }
          );
          await processFaceImage(deviceUserId, manipResult.uri, existingCred);
        } catch (err) {
          console.error("Image manipulation error:", err);
          toast.error("Failed to process image.");
        } finally {
          setIsCapturingFace(false);
        }
      }
    } else {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        toast.error('Library permission is required.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync(pickerOptions);
      if (!result.canceled && result.assets[0]) {
        setIsCapturingFace(true);
        try {
          const manipResult = await manipulateAsync(
            result.assets[0].uri,
            [{ resize: { width: 600 } }],
            { compress: 0.8, format: SaveFormat.JPEG }
          );
          await processFaceImage(deviceUserId, manipResult.uri, existingCred);
        } catch (err) {
          console.error("Image manipulation error:", err);
          toast.error("Failed to process image.");
        } finally {
          setIsCapturingFace(false);
        }
      }
    }
  };

  const handleCaptureFaceOnDevice = async (deviceUserId: string, existingCred: any) => {
    if (!device) {
      toast.error("Device not found");
      return;
    }

    setIsUploadingFace(true);
    try {
      await registerUserOnDevice({
        ip: device.deviceIp,
        port: device.devicePort,
        devIndex: device.deviceId,
        username: device.deviceUsername || undefined,
        password: device.devicePassword || undefined,
        employeeNo: deviceUserId,
        name: selectedCustomer?.fullName || `User ${deviceUserId}`,
      });

      await captureFaceOnDevice({
        ip: device.deviceIp,
        port: device.devicePort,
        devIndex: device.deviceId,
        username: device.deviceUsername || undefined,
        password: device.devicePassword || undefined,
        employeeNo: deviceUserId,
      });

      saveCredential.mutate({
        ...existingCred,
        hasFace: true,
      });

      toast.success("Face capture triggered successfully on device!");
      setIsCapturingFace(false);
    } catch (error: any) {
      let msg = error.message || "Failed to trigger capture on device.";
      const subCode = error.subStatusCode;
      if (subCode === "faceLibraryIDError" || subCode === "deviceUserAlreadyExistFace") {
        msg = "This user already has a face registered on this device.";
      }
      toast.error(msg);
    } finally {
      setIsUploadingFace(false);
    }
  };

  const handleDeleteFace = (deviceUserId: string, existingCred: any) => {
    setRemoveFaceState({ deviceUserId, existingCred });
  };

  const confirmDeleteFace = async () => {
    if (!removeFaceState || !device) return;

    setIsDeletingFace(true);
    try {
      await deleteFaceFromDevice({
        ip: device.deviceIp,
        port: device.devicePort,
        devIndex: device.deviceId,
        username: device.deviceUsername || undefined,
        password: device.devicePassword || undefined,
        employeeNo: removeFaceState.deviceUserId,
      });

      saveCredential.mutate({
        ...removeFaceState.existingCred,
        hasFace: false,
      });

      toast.success("Face removed successfully!");
    } catch (error: any) {
      console.error("Failed to delete face:", error);
      toast.error(error.message || "Failed to remove face from device.");
    } finally {
      setIsDeletingFace(false);
      setRemoveFaceState(null);
    }
  };

  const processFaceImage = async (deviceUserId: string, imageUri: string, existingCred: any) => {
    if (!device) {
      toast.error("Device not found");
      return;
    }

    try {
      setIsUploadingFace(true);
      await registerUserOnDevice({
        ip: device.deviceIp,
        port: device.devicePort,
        devIndex: device.deviceId,
        username: device.deviceUsername || undefined,
        password: device.devicePassword || undefined,
        employeeNo: deviceUserId,
        name: selectedCustomer?.fullName || `User ${deviceUserId}`,
      });

      await uploadFaceToDevice({
        ip: device.deviceIp,
        port: device.devicePort,
        devIndex: device.deviceId,
        username: device.deviceUsername || undefined,
        password: device.devicePassword || undefined,
        employeeNo: deviceUserId,
        imageUri: imageUri,
      });

      saveCredential.mutate({
        ...existingCred,
        hasFace: true,
      });

      toast.success("Face registered successfully!");

    } catch (error: any) {
      let msg = error.message || "Failed to register face.";
      const subCode = error.subStatusCode;
      if (subCode === "faceLibraryIDError" || subCode === "deviceUserAlreadyExistFace") {
        msg = "This user already has a face registered on this device.";
      } else if (subCode === "faceNoFace") {
        msg = "No face was detected. Please use a clearer photo.";
      } else if (subCode === "facePoorQuality" || subCode === "SubpicAnalysisModelingError") {
        msg = "Face analysis failed. Ensure the face is clear, well-lit, and not too far.";
      } else if (subCode === "badJsonContent") {
        msg = "Image size might be too large or format is unsupported.";
      }
      toast.error(msg);
    } finally {
      setIsUploadingFace(false);
    }
  };

  const handleUploadFingerprint = async (deviceUserId: string) => {
    if (!device) {
      toast.error("Device not found");
      return;
    }

    const existingCred = credentials?.find(c => c.customerId === selectedCustomer?.customerId);

    setIsUploadingFingerprint(true);
    try {
      await registerUserOnDevice({
        ip: device.deviceIp,
        port: device.devicePort,
        devIndex: device.deviceId,
        username: device.deviceUsername || undefined,
        password: device.devicePassword || undefined,
        employeeNo: deviceUserId,
        name: selectedCustomer?.fullName || `User ${deviceUserId}`
      });

      await captureFingerprintOnDevice({
        ip: device.deviceIp,
        port: device.devicePort,
        devIndex: device.deviceId,
        username: device.deviceUsername || undefined,
        password: device.devicePassword || undefined,
        employeeNo: deviceUserId,
        fingerPrintID: existingCred?.fingerPrintID || 1
      });

      if (existingCred) {
        saveCredential.mutate({
          gymId: existingCred.gymId,
          customerId: existingCred.customerId,
          deviceId: existingCred.deviceId,
          deviceUserId: existingCred.deviceUserId,
          credentialId: existingCred.credentialId,
          hasFingerprint: true,
          hasFace: existingCred.hasFace,
          hasCard: existingCred.hasCard,
          rfidCardNo: existingCred.rfidCardNo,
        });
      }

      toast.success("Fingerprint added successfully!");
      setIsCapturingFingerprint(false);
    } catch (err: any) {
      toast.error("Fingerprint error: " + err.message);
      console.error(err);
    } finally {
      setIsUploadingFingerprint(false);
    }
  };

  if (selectedCustomer) {
    const isEnrolled = enrolledCustomerIds.has(selectedCustomer.customerId);
    const existingCred = credentials?.find(c => c.customerId === selectedCustomer.customerId);

    return (
      <View className="flex-1 p-4">
        <View className="bg-[#141414] rounded-2xl p-4 border border-[#2A2A2A]">
          <Text className="text-white text-lg font-semibold mb-1">{selectedCustomer.fullName}</Text>
          <Text className="text-[#888888] text-sm">{selectedCustomer.phone}</Text>

          {isEnrolled && existingCred ? (
            isCapturingFace ? (
              <View className="items-center py-6">
                <View className="w-24 h-24 bg-[#CCF200]/20 rounded-full items-center justify-center mb-6">
                  <UserFocus size={48} color="#CCF200" weight="regular" />
                </View>
                <Text className="text-white text-xl font-semibold mb-1">Register Face</Text>
                <Text className="text-[#888888] text-center mb-5 px-4">
                  Please choose a method to register a face.
                </Text>

                <View className="w-full gap-3">
                  {existingCred.hasFace ? (
                    <Pressable
                      className="w-full bg-red-500/10 border border-red-500/20 rounded-xl py-3 flex-row items-center justify-center gap-2"
                      onPress={() => handleDeleteFace(existingCred.deviceUserId, existingCred)}
                      disabled={isDeletingFace}
                    >
                      {isDeletingFace ? (
                        <ActivityIndicator size="small" color="#ef4444" />
                      ) : (
                        <Trash size={20} color="#ef4444" />
                      )}
                      <Text className="text-red-500 font-semibold">Remove Existing Face</Text>
                    </Pressable>
                  ) : (
                    <>
                      <Pressable
                        className="w-full bg-[#CCF200]/10 border border-[#CCF200]/20 rounded-xl py-3 flex-row items-center justify-center gap-2"
                        onPress={() => handleUploadFaceMethod("camera", existingCred.deviceUserId, existingCred)}
                        disabled={isUploadingFace}
                      >
                        <Text className="text-[#CCF200] font-semibold">Take Photo (Mobile)</Text>
                      </Pressable>

                      <Pressable
                        className="w-full bg-[#CCF200]/10 border border-[#CCF200]/20 rounded-xl py-3 flex-row items-center justify-center gap-2"
                        onPress={() => handleUploadFaceMethod("library", existingCred.deviceUserId, existingCred)}
                        disabled={isUploadingFace}
                      >
                        <Text className="text-[#CCF200] font-semibold">Choose from Library</Text>
                      </Pressable>
                    </>
                  )}

                  {(isUploadingFace && !isDeletingFace) ? (
                    <ActivityIndicator size="large" color="#CCF200" className="my-4" />
                  ) : null}

                  <Pressable
                    className="w-full bg-[#2A2A2A] rounded-xl py-3 items-center mt-2"
                    onPress={() => setIsCapturingFace(false)}
                    disabled={isUploadingFace || isDeletingFace}
                  >
                    <Text className="text-white font-semibold">Cancel</Text>
                  </Pressable>
                </View>
              </View>
            ) : isCapturingFingerprint ? (
              <View className="items-center py-6">
                <View className="w-24 h-24 bg-[#CCF200]/20 rounded-full items-center justify-center mb-6">
                  <Fingerprint size={48} color="#CCF200" weight="regular" />
                </View>
                <Text className="text-white text-xl font-semibold mb-2">Place finger on device</Text>
                <Text className="text-[#888888] text-center mb-8 px-4">
                  Registering fingerprint on the device scanner.
                </Text>

                <View className="w-full">
                  {isUploadingFingerprint ? (
                    <ActivityIndicator size="large" color="#CCF200" className="mb-4" />
                  ) : null}
                  <Pressable
                    className="w-full bg-[#2A2A2A] rounded-xl py-3 items-center mt-2"
                    onPress={() => setIsCapturingFingerprint(false)}
                    disabled={isUploadingFingerprint}
                  >
                    <Text className="text-white font-semibold">Cancel</Text>
                  </Pressable>
                </View>
              </View>
            ) : (
              <View>
                <View className="flex-row items-center bg-[#CCF200]/10 p-3 rounded-lg mb-4 mt-2 justify-between">
                  <View className="flex-row items-center">
                    <Scan size={24} color="#CCF200" />
                    <View className="ml-3">
                      <Text className="text-[#CCF200] font-semibold">Enrolled</Text>
                      <Text className="text-[#888888] text-xs">Device User ID: {existingCred.deviceUserId}</Text>
                    </View>
                  </View>
                  <View className="flex-row items-center gap-2">
                    <Pressable
                      onPress={() => {
                        setIsCapturingFace(true);
                      }}
                      disabled={isUploadingFace}
                      className={`p-2 rounded-full active:opacity-70 ${existingCred.hasFace ? 'bg-[#CCF200]/20' : 'bg-[#2A2A2A]'}`}
                    >
                      {isUploadingFace ? (
                        <ActivityIndicator size="small" color="#CCF200" />
                      ) : (
                        <UserFocus size={20} color={existingCred.hasFace ? "#CCF200" : "#555555"} />
                      )}
                    </Pressable>
                    <Pressable
                      onPress={() => {
                        setIsCapturingFingerprint(true);
                        handleUploadFingerprint(existingCred.deviceUserId);
                      }}
                      className={`p-2 rounded-full active:opacity-70 ${existingCred.hasFingerprint ? 'bg-[#CCF200]/20' : 'bg-[#2A2A2A]'}`}
                    >
                      <Fingerprint size={20} color={existingCred.hasFingerprint ? "#CCF200" : "#555555"} />
                    </Pressable>
                  </View>
                </View>

                <View className="flex-row items-center gap-3">
                  <Pressable
                    className="flex-1 bg-[#2A2A2A] rounded-xl py-3 items-center"
                    onPress={() => {
                      setSelectedCustomer(null);
                    }}
                  >
                    <Text className="text-white font-semibold">Cancel</Text>
                  </Pressable>
                  <Pressable
                    className="flex-1 bg-[#3A1414] rounded-xl py-3 items-center flex-row justify-center"
                    onPress={() => {
                      setUnenrollState({
                        credentialId: existingCred.credentialId,
                        deviceUserId: existingCred.deviceUserId
                      });
                    }}
                  >
                    <Trash size={18} color="#EF4444" />
                    <Text className="text-[#EF4444] font-semibold ml-2">Unenroll</Text>
                  </Pressable>
                </View>
              </View>
            )
          ) : (
            <View>
              <Text className="text-[#888888] text-xs font-medium mb-1">Device User ID</Text>
              <Text className="text-[#555555] text-xs mb-3">
                Enter the ID number assigned to this customer on the physical ZKTeco device.
              </Text>
              <TextInput
                className="w-full bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl px-4 py-3 text-white mb-6 font-sans"
                value={deviceUserId}
                onChangeText={setDeviceUserId}
                placeholder="e.g. 105"
                placeholderTextColor="#555"
                keyboardType="numeric"
              />

              <View className="flex-row items-center gap-3">
                <Pressable
                  className="flex-1 bg-[#2A2A2A] rounded-xl py-3 items-center"
                  onPress={() => {
                    setSelectedCustomer(null);
                    setDeviceUserId('');
                  }}
                >
                  <Text className="text-white font-semibold">Cancel</Text>
                </Pressable>
                <Pressable
                  className={`flex-1 rounded-xl py-3 items-center ${deviceUserId ? 'bg-[#CCF200]' : 'bg-[#CCF200]/50'}`}
                  onPress={handleEnroll}
                  disabled={!deviceUserId || saveCredential.isPending}
                >
                  <Text className="text-black font-semibold">
                    {saveCredential.isPending ? 'Saving...' : 'Enroll'}
                  </Text>
                </Pressable>
              </View>
            </View>
          )}
        </View>

        <ConfirmModal
          visible={!!unenrollState}
          onClose={() => setUnenrollState(null)}
          onConfirm={() => {
            if (unenrollState) {
              handleUnenroll(unenrollState.credentialId, unenrollState.deviceUserId);
            }
            setUnenrollState(null);
            setSelectedCustomer(null);
          }}
          title="Unenroll Customer"
          description="Are you sure you want to remove this customer from the biometric device? They will lose physical access immediately."
          confirmText="Remove Access"
          icon={
            <View className="w-12 h-12 bg-red-500/20 rounded-full items-center justify-center">
              <Trash size={24} color="#ef4444" weight="bold" />
            </View>
          }
        />

        <ConfirmModal
          visible={!!removeFaceState}
          onClose={() => setRemoveFaceState(null)}
          onConfirm={confirmDeleteFace}
          title="Remove Face"
          description="Are you sure you want to remove this face from the device? They will lose access to enter via facial recognition."
          confirmText="Remove Face"
          icon={
            <View className="w-12 h-12 bg-red-500/20 rounded-full items-center justify-center">
              <UserFocus size={24} color="#ef4444" weight="bold" />
            </View>
          }
        />
      </View>
    );
  }

  return (
    <View className="flex-1 p-4">
      <View className="flex-row items-center bg-[#141414] border border-[#2A2A2A] rounded-xl px-3 py-2.5 mb-4">
        <MagnifyingGlass size={20} color="#888888" />
        <TextInput
          className="flex-1 ml-2 text-white font-sans"
          placeholder="Search customers..."
          placeholderTextColor="#888888"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 20 }}
        refreshControl={
          <CustomRefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {filteredCustomers.length === 0 ? (
          <Text className="text-center text-[#888888] mt-10">No customers found.</Text>
        ) : (
          filteredCustomers.map((customer: any) => {
            const isEnrolled = enrolledCustomerIds.has(customer.customerId);
            const existingCred = credentials?.find(c => c.customerId === customer.customerId);
            return (
              <Pressable
                key={customer.customerId}
                onPress={() => setSelectedCustomer(customer)}
                className="flex-row items-center justify-between bg-[#141414] border border-[#2A2A2A] rounded-xl p-4 mb-3 active:opacity-70"
              >
                <View className="flex-1">
                  <Text className="text-white font-medium">{customer.fullName}</Text>
                  <Text className="text-[#888888] text-xs mt-1">{customer.phone}</Text>
                  {isEnrolled && existingCred && (
                    <Text className="text-[#888888] text-xs mt-1">
                      Device user ID: <Text className="text-white font-medium text-sm ml-2">{existingCred.deviceUserId}</Text>
                    </Text>
                  )}
                </View>
                <View>
                  {isEnrolled ? (
                    <View className="bg-[#CCF200]/20 px-3 py-1 rounded-full flex-row items-center">
                      <Fingerprint size={14} color="#CCF200" />
                      <Text className="text-[#CCF200] text-xs font-semibold ml-1">Enrolled</Text>
                    </View>
                  ) : (
                    <View className="bg-[#2A2A2A] px-3 py-1 rounded-full">
                      <Text className="text-[#888888] text-xs font-semibold">Not Enrolled</Text>
                    </View>
                  )}
                </View>
              </Pressable>
            );
          })
        )}
      </ScrollView>

      <ConfirmModal
        visible={!!unenrollState}
        onClose={() => setUnenrollState(null)}
        onConfirm={() => {
          if (unenrollState) {
            handleUnenroll(unenrollState.credentialId, unenrollState.deviceUserId);
          }
          setUnenrollState(null);
          setSelectedCustomer(null);
        }}
        title="Unenroll Customer"
        description="Are you sure you want to remove this customer from the biometric device? They will lose physical access immediately."
        confirmText="Remove Access"
        icon={
          <View className="w-12 h-12 bg-red-500/20 rounded-full items-center justify-center">
            <Trash size={24} color="#ef4444" weight="bold" />
          </View>
        }
      />
    </View>
  );
}
