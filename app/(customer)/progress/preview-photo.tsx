import React, { useState, useEffect, useMemo } from 'react';
import { View, ScrollView, Pressable, Image, ActivityIndicator, Modal, Platform, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '@/components/nativewindui/Text';
import { useRouter } from 'expo-router';
import { X, CalendarBlank, CaretRight, CheckCircle, Camera } from 'phosphor-react-native';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useUploadProgressPhoto } from '@/hooks/fitness/useUpdateProgress';
import { useUser } from '@/context/UserContext';
import { toast } from '@/lib/toast';
import { ActionSheetModal } from '@/components/community/ActionSheetModal';
import { supabase } from '@/lib/supabase';
import { compressImage } from '@/components/imageCompressor';
import * as FileSystem from 'expo-file-system/legacy';
import { CustomRefreshControl } from '@/components/CustomRefreshControl';

const PROGRESS_DAYS = [1, 30, 40, 60, 90];

const formatDateDisplay = (date: Date) => {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};

export default function PreviewProgressPhotoModal() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { userId, createdAt: contextCreatedAt } = useUser();
  const [selectedDay, setSelectedDay] = useState(40);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [showDatePicker, setShowDatePicker] = useState<boolean>(false);
  const [photoOptionsVisible, setPhotoOptionsVisible] = useState<boolean>(false);
  const [isImageEnlarged, setIsImageEnlarged] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [base64Image, setBase64Image] = useState<string | null>(null);
  const { mutateAsync: uploadPhoto, isPending } = useUploadProgressPhoto();

  const [userCreatedAt, setUserCreatedAt] = useState<Date | null>(() => {
    if (contextCreatedAt) {
      const d = new Date(contextCreatedAt);
      if (!isNaN(d.getTime())) return d;
    }
    return null;
  });

  const fetchUserCreatedAt = async () => {
    if (!userId) return;
    try {
      const { data, error } = await supabase
        .from('users')
        .select('createdAt')
        .eq('userId', userId)
        .maybeSingle();

      if (data?.createdAt) {
        const d = new Date(data.createdAt);
        if (!isNaN(d.getTime())) {
          setUserCreatedAt(d);
        }
      }
    } catch (err) {
      console.warn('[PreviewProgressPhoto] Failed to fetch user createdAt:', err);
    }
  };

  // Query users table for logged-in user's createdAt timestamp
  useEffect(() => {
    fetchUserCreatedAt();
  }, [userId]);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await fetchUserCreatedAt();
    } catch (err) {
      console.warn('[PreviewProgressPhoto] Refresh error:', err);
    } finally {
      setRefreshing(false);
    }
  };

  // Minimum allowed date: start of the user's account creation day
  const minAllowedDate = useMemo(() => {
    if (!userCreatedAt) return undefined;
    const min = new Date(userCreatedAt);
    min.setHours(0, 0, 0, 0);
    return min;
  }, [userCreatedAt]);

  // Maximum allowed date: end of today
  const maxAllowedDate = useMemo(() => {
    const max = new Date();
    max.setHours(23, 59, 59, 999);
    return max;
  }, []);

  // Ensure selectedDate is not earlier than account creation date
  useEffect(() => {
    if (minAllowedDate && selectedDate < minAllowedDate) {
      setSelectedDate(minAllowedDate);
    }
  }, [minAllowedDate]);

  const handleTakeImage = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      toast.error('Camera permission is required to take photos.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      const rawUri = result.assets[0].uri;
      try {
        const compressed = await compressImage(rawUri, {
          maxWidth: 1200,
          compress: 0.7,
        });
        setImageUri(compressed.uri);
        const base64 = await FileSystem.readAsStringAsync(compressed.uri, {
          encoding: 'base64',
        });
        setBase64Image(base64);
      } catch (compErr) {
        console.warn('[PreviewProgressPhoto] Compression error, using original:', compErr);
        setImageUri(rawUri);
        const base64 = await FileSystem.readAsStringAsync(rawUri, {
          encoding: 'base64',
        });
        setBase64Image(base64);
      }
    }
  };

  const handlePickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      toast.error('Gallery permission is required to select photos.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      const rawUri = result.assets[0].uri;
      try {
        const compressed = await compressImage(rawUri, {
          maxWidth: 1200,
          compress: 0.7,
        });
        setImageUri(compressed.uri);
        const base64 = await FileSystem.readAsStringAsync(compressed.uri, {
          encoding: 'base64',
        });
        setBase64Image(base64);
      } catch (compErr) {
        console.warn('[PreviewProgressPhoto] Compression error, using original:', compErr);
        setImageUri(rawUri);
        const base64 = await FileSystem.readAsStringAsync(rawUri, {
          encoding: 'base64',
        });
        setBase64Image(base64);
      }
    }
  };

  const handleSave = async () => {
    if (!userId) return;
    if (!base64Image) {
      toast.error('Please select an image first.');
      return;
    }

    try {
      const fileName = `progress-${Date.now()}.jpg`;
      const saveDate = new Date(selectedDate);
      const now = new Date();
      saveDate.setHours(now.getHours(), now.getMinutes(), now.getSeconds(), now.getMilliseconds());

      if (minAllowedDate && saveDate < minAllowedDate) {
        toast.error('Cannot select a date prior to your account creation date.');
        return;
      }

      await uploadPhoto({
        userId: userId,
        base64Image,
        fileName,
        loggedAt: saveDate.toISOString(),
      });
      toast.success('Progress photo saved successfully!');
      router.back();
    } catch (error: any) {
      console.error(error);
      toast.error(error?.message || 'Failed to upload photo.');
    }
  };

  return (
    <View className="flex-1 bg-[#09090B] pt-8 px-5">

      <View className="flex-row justify-between items-center mb-6">
        <View className="w-8 h-8" />
        <Text className="text-white text-xl font-semibold tracking-tight">Preview Progress Photo</Text>
        <Pressable
          className="w-8 h-8 rounded-full bg-[#1C1C1E] items-center justify-center active:opacity-70"
          onPress={() => router.back()}
        >
          <X size={16} color="#8E8E93" weight="bold" />
        </Pressable>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
        refreshControl={
          <CustomRefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View className="w-full h-64 bg-[#1C1C1E] rounded-3xl overflow-hidden mb-6 border border-[#2A2A2D]/50 relative">
          {imageUri ? (
            <>
              <Pressable
                onPress={() => setIsImageEnlarged(true)}
                className="w-full h-full active:opacity-90"
              >
                <Image
                  source={{ uri: imageUri }}
                  style={{ width: '100%', height: '100%' }}
                  resizeMode="cover"
                />
              </Pressable>
              {/* Floating Change Button */}
              <Pressable
                onPress={() => setPhotoOptionsVisible(true)}
                className="absolute bottom-3 right-3 bg-black/80 px-3.5 py-2 rounded-full flex-row items-center gap-1.5 border border-white/20 active:opacity-70"
              >
                <Camera size={15} color="#D4FF00" weight="bold" />
                <Text className="text-white text-xs font-semibold">Change</Text>
              </Pressable>
            </>
          ) : (
            <Pressable
              onPress={() => setPhotoOptionsVisible(true)}
              className="w-full h-full items-center justify-center active:opacity-80"
            >
              <Camera size={48} color="#D4FF00" />
              <Text className="text-[#D4FF00] mt-4 text-sm font-semibold">Tap to select photo</Text>
            </Pressable>
          )}
        </View>

        <Pressable
          onPress={() => setShowDatePicker(true)}
          className="bg-[#1C1C1E] rounded-2xl p-5 flex-row items-center justify-between mb-8 border border-[#2A2A2D]/50 active:opacity-80"
        >
          <View className="flex-row items-center gap-4">
            <CalendarBlank size={20} color="#8E8E93" weight="regular" />
            <Text className="text-white text-[15px]">Date</Text>
          </View>
          <View className="flex-row items-center gap-2">
            <Text className="text-[#8E8E93] text-[15px]">{formatDateDisplay(selectedDate)}</Text>
            <CaretRight size={16} color="#6B6B6B" weight="bold" />
          </View>
        </Pressable>

        <Text className="text-white text-[17px] font-semibold mb-1">Progress Day</Text>
        <Text className="text-[#8E8E93] text-[13px] mb-4 font-sans">Track your journey by selecting the day number.</Text>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="mb-10"
          contentContainerStyle={{ gap: 12, paddingRight: 20 }}
        >
          {PROGRESS_DAYS.map((day) => {
            const isSelected = day === selectedDay;
            return (
              <Pressable
                key={day}
                onPress={() => setSelectedDay(day)}
                className={`w-[72px] h-[80px] rounded-2xl items-center justify-center relative ${isSelected ? 'bg-[#1C1C1E] border border-[#D4FF00]' : 'bg-[#1C1C1E] border border-[#2A2A2D]/50'
                  }`}
              >
                {isSelected && (
                  <View className="absolute -top-2 -right-2 bg-[#09090B] rounded-full">
                    <CheckCircle size={18} weight="fill" color="#D4FF00" />
                  </View>
                )}
                <Text className={`${isSelected ? 'text-white' : 'text-white'} text-[15px] mb-0.5`}>Day</Text>
                <Text className={`${isSelected ? 'text-[#D4FF00]' : 'text-white'} text-[17px] font-semibold`}>{day}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <View className="gap-3">
          <Pressable
            className={`rounded-2xl py-4 items-center justify-center active:opacity-80 shadow-lg ${isPending ? 'bg-[#D4FF00]/50' : 'bg-[#D4FF00]'}`}
            onPress={handleSave}
            disabled={isPending}
          >
            {isPending ? (
              <ActivityIndicator color="#09090B" />
            ) : (
              <Text className="text-[#09090B] text-[17px] font-semibold">Save Progress Photo</Text>
            )}
          </Pressable>
          <Pressable
            className="bg-[#1C1C1E] rounded-2xl py-4 items-center justify-center active:opacity-80 border border-[#2A2A2D]/50"
            onPress={() => router.back()}
          >
            <Text className="text-white text-[17px] font-semibold">Cancel</Text>
          </Pressable>
        </View>
      </ScrollView>

      {/* Date Picker - Android */}
      {showDatePicker && Platform.OS !== 'ios' && (
        <DateTimePicker
          value={selectedDate}
          mode="date"
          display="default"
          minimumDate={minAllowedDate}
          maximumDate={maxAllowedDate}
          onChange={(event: DateTimePickerEvent, date?: Date) => {
            setShowDatePicker(false);
            if (event.type === 'set' && date) {
              if (minAllowedDate && date < minAllowedDate) {
                toast.error('Cannot select a date prior to your account creation date.');
                return;
              }
              const now = new Date();
              const picked = new Date(date);
              picked.setHours(now.getHours(), now.getMinutes(), now.getSeconds(), now.getMilliseconds());
              setSelectedDate(picked);
            }
          }}
        />
      )}

      {/* Date Picker - iOS Modal */}
      {showDatePicker && Platform.OS === 'ios' && (
        <Modal visible={true} transparent={true} animationType="fade">
          <View className="flex-1 justify-end bg-black/60">
            <View className="bg-[#1C1C1E] p-4 rounded-t-3xl pb-8 border-t border-[#2A2A2D]">
              <View className="flex-row justify-between items-center mb-4 px-2">
                <Pressable onPress={() => setShowDatePicker(false)}>
                  <Text className="text-gray-400 text-base">Cancel</Text>
                </Pressable>
                <Text className="text-white font-semibold text-base">Select Date</Text>
                <Pressable onPress={() => setShowDatePicker(false)}>
                  <Text className="text-[#D4FF00] font-bold text-base">Done</Text>
                </Pressable>
              </View>
              <DateTimePicker
                value={selectedDate}
                mode="date"
                display="inline"
                themeVariant="dark"
                minimumDate={minAllowedDate}
                maximumDate={maxAllowedDate}
                onChange={(_event: DateTimePickerEvent, date?: Date) => {
                  if (date) {
                    if (minAllowedDate && date < minAllowedDate) {
                      toast.error('Cannot select a date prior to your account creation date.');
                      return;
                    }
                    const now = new Date();
                    const picked = new Date(date);
                    picked.setHours(now.getHours(), now.getMinutes(), now.getSeconds(), now.getMilliseconds());
                    setSelectedDate(picked);
                  }
                }}
              />
            </View>
          </View>
        </Modal>
      )}
      {/* Photo Picker Modal */}
      <ActionSheetModal
        visible={photoOptionsVisible}
        onClose={() => setPhotoOptionsVisible(false)}
        title="Upload Progress Photo"
        options={[
          { label: 'Take Photo', onPress: handleTakeImage },
          { label: 'Choose from Gallery', onPress: handlePickImage },
          ...(imageUri ? [
            {
              label: 'Remove Photo',
              destructive: true,
              onPress: () => {
                setImageUri(null);
                setBase64Image(null);
              },
            }
          ] : []),
        ]}
      />

      {/* Enlarged Image Preview Modal */}
      {isImageEnlarged && !!imageUri && (
        <Modal
          visible={isImageEnlarged}
          transparent={true}
          animationType="fade"
          presentationStyle="overFullScreen"
          onRequestClose={() => setIsImageEnlarged(false)}
          statusBarTranslucent
        >
          <View className="flex-1 bg-black/95 items-center justify-center p-4">
            {/* Top Bar with Close Button */}
            <View
              className="absolute left-5 right-5 z-30 flex-row justify-between items-center"
              style={{ top: Math.max(insets.top + 10, 44) }}
            >
              <Text className="text-white text-base font-semibold">Photo Preview</Text>
              <Pressable
                onPress={() => setIsImageEnlarged(false)}
                className="w-10 h-10 rounded-full bg-[#1C1C1E] border border-white/20 items-center justify-center active:opacity-70"
              >
                <X size={20} color="#FFFFFF" weight="bold" />
              </Pressable>
            </View>

            {/* Backdrop Tap to Close */}
            <Pressable
              className="absolute inset-0"
              onPress={() => setIsImageEnlarged(false)}
            />

            {/* Enlarged Image */}
            <Image
              source={{ uri: imageUri }}
              style={{
                width: Dimensions.get('window').width * 0.94,
                height: Dimensions.get('window').height * 0.78,
              }}
              resizeMode="contain"
              className="rounded-2xl"
            />
          </View>
        </Modal>
      )}
    </View>
  );
}
