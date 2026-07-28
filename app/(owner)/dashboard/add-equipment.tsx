import React, { useState } from 'react';
import { View, ScrollView, TextInput, Pressable, KeyboardAvoidingView, Platform, Image, ActivityIndicator } from 'react-native';
import { Text } from '@/components/nativewindui/Text';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { toast } from '@/lib/toast';
import {
  CaretLeft,
  CloudArrowUp,
  Minus,
  Plus,
  CalendarBlank,
  CaretRight,
  FileText,
  X
} from 'phosphor-react-native';
import { useUser } from '@/context/UserContext';
import { supabase } from '@/lib/supabase';
import { base64ToArrayBuffer } from '@/components/imageCompressor';
import { saveGymInventory, uploadEquipmentImage } from '@/helpers/gymInventory/gymInventory';
import * as FileSystem from 'expo-file-system/legacy';
import * as Crypto from 'expo-crypto';
import * as ImageManipulator from 'expo-image-manipulator';

export default function AddEquipmentScreen() {
  const { userId } = useUser();
  const [image, setImage] = useState<string | null>(null);
  const [equipmentName, setEquipmentName] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState('');
  const [purchaseDate, setPurchaseDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const formatDate = (date: Date) => {
    const day = date.getDate();
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    const month = months[date.getMonth()];
    const year = date.getFullYear();
    return `${day} ${month} ${year}`;
  };

  const onDateChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
    if (selectedDate) {
      setPurchaseDate(selectedDate);
    }
  };

  const pickImage = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (permissionResult.granted === false) {
        toast.error('Permission to access camera roll is required!');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 1,
      });

      if (!result.canceled) {
        setImage(result.assets[0].uri);
      }
    } catch {
      toast.error('Failed to pick image');
    }
  };

  const handleMinus = () => {
    if (quantity > 1) {
      setQuantity(quantity - 1);
    }
  };

  const handlePlus = () => {
    setQuantity(quantity + 1);
  };

  const handleSave = async () => {
    if (!equipmentName.trim()) {
      toast.error('Equipment Name is required');
      return;
    }
    if (!userId) {
      toast.error('User not authenticated');
      return;
    }

    try {
      setIsSubmitting(true);

      const { data: gymOwner, error: gymOwnerError } = await supabase
        .from('gym_owners')
        .select('gymId')
        .eq('userId', userId)
        .eq('is_deleted', false)
        .maybeSingle();

      if (gymOwnerError || !gymOwner?.gymId) {
        toast.error('Could not find associated gym for this user');
        setIsSubmitting(false);
        return;
      }

      const gymId = gymOwner.gymId;
      const gymInventoryId = Crypto.randomUUID();
      let imageUrl = null;

      if (image) {
        const manipResult = await ImageManipulator.manipulateAsync(
          image,
          [{ resize: { width: 800 } }],
          { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
        );

        const base64 = await FileSystem.readAsStringAsync(manipResult.uri, {
          encoding: 'base64',
        });
        const arrayBuffer = base64ToArrayBuffer(base64);
        const fileExt = 'jpg';
        const fileName = `${gymInventoryId}.${fileExt}`;

        imageUrl = await uploadEquipmentImage(arrayBuffer, fileName);
      }

      const payload = {
        gymInventoryId,
        gymId,
        createdBy: userId,
        equipmentName: equipmentName.trim(),
        quantity,
        purchaseDate: purchaseDate.toISOString().split('T')[0],
        notes: notes.trim() || null,
        image: imageUrl,
      };

      await saveGymInventory(payload);

      toast.success('Equipment added successfully');
      router.back();
    } catch (error) {
      toast.error('Failed to save equipment');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View className="flex-1 bg-[#0A0A0A]">
      <View className="px-5 pt-6 pb-4 flex-row items-center border-b border-[#161616]">
        <Pressable
          onPress={() => router.back()}
          className="w-10 h-10 rounded-full bg-[#161616] items-center justify-center mr-4 active:opacity-70"
        >
          <CaretLeft size={20} color="#fff" />
        </Pressable>
        <View>
          <Text className="text-xl font-semibold text-white mb-0.5">Add Equipment</Text>
          <Text className="text-xs text-[#888]">Add new equipment to your inventory</Text>
        </View>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView className="flex-1" contentContainerStyle={{ padding: 20, paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
          <View className="mb-6">
            <Text className="text-white text-sm mb-3">Equipment Image</Text>
            {image ? (
              <View className="border border-[#242424] rounded-2xl min-h-[160px] bg-[#0A0A0A] overflow-hidden relative">
                <Image source={{ uri: image }} className="w-full h-full absolute" resizeMode="cover" />
                <Pressable
                  onPress={() => setImage(null)}
                  className="absolute top-3 right-3 w-8 h-8 bg-black/60 rounded-full items-center justify-center active:opacity-70"
                >
                  <X size={16} color="#fff" weight="bold" />
                </Pressable>
              </View>
            ) : (
              <Pressable
                onPress={pickImage}
                className="border border-dashed border-[#242424] rounded-2xl p-6 items-center justify-center min-h-[160px] bg-[#0A0A0A] overflow-hidden"
              >
                <View className="mb-3">
                  <CloudArrowUp size={32} color="#D4F129" weight="regular" />
                </View>
                <Text className="text-[#D4F129] font-semibold text-sm mb-1">Upload Photo</Text>
                <Text className="text-[#666] text-xs mb-3">JPG, PNG up to 5MB</Text>
                <Text className="text-[#444] text-[10px] text-center max-w-[150px]">
                  Adding a clear image helps with easy identification
                </Text>
              </Pressable>
            )}
          </View>

          <View className="mb-6">
            <Text className="text-white text-sm mb-3">Equipment Name <Text className="text-[#EF4444]">*</Text></Text>
            <TextInput
              placeholder="Enter equipment name"
              placeholderTextColor="#666"
              value={equipmentName}
              onChangeText={setEquipmentName}
              className="bg-[#161616] text-white font-medium px-4 py-4 rounded-xl border border-[#242424]"
            />
          </View>

          <View className="mb-8">
            <Text className="text-white text-sm mb-3">Quantity (Total Units) <Text className="text-[#EF4444]">*</Text></Text>
            <View className="flex-row items-center">
              <View className="bg-[#161616] flex-row items-center border border-[#242424] rounded-xl px-4 py-2">
                <Pressable onPress={handleMinus} className="p-2 active:opacity-70">
                  <Minus size={16} color="#888" />
                </Pressable>
                <Text className="text-white text-lg font-semibold mx-6 w-6 text-center">{quantity}</Text>
                <Pressable onPress={handlePlus} className="p-2 active:opacity-70">
                  <Plus size={16} color="#D4F129" weight="bold" />
                </Pressable>
              </View>
              <Text className="text-[#666] text-[10px] ml-4 flex-1">
                Total number of this equipment in your gym
              </Text>
            </View>
          </View>

          <View className="bg-[#161616] rounded-xl border border-[#242424] overflow-hidden mb-6">
            <Pressable
              onPress={() => setShowDatePicker(!showDatePicker)}
              className="flex-row items-center justify-between p-4 border-b border-[#242424] active:opacity-80 bg-[#161616]"
            >
              <View className="flex-row items-center">
                <View className="w-10 h-10 rounded-lg bg-[#25280B] border border-[#373F0E] items-center justify-center mr-3">
                  <CalendarBlank size={20} color="#D4F129" />
                </View>
                <View>
                  <Text className="text-[#888] text-xs mb-0.5">Purchase Date <Text className="text-[#EF4444]">*</Text></Text>
                  <Text className="text-white text-sm font-semibold">{formatDate(purchaseDate)}</Text>
                </View>
              </View>
              <CaretRight size={20} color="#888" style={{ transform: [{ rotate: showDatePicker ? '90deg' : '0deg' }] }} />
            </Pressable>

            {showDatePicker && Platform.OS === 'ios' && (
              <View className="bg-[#1c1c1e] p-3 items-center border-b border-[#242424]">
                <DateTimePicker
                  value={purchaseDate}
                  mode="date"
                  display="inline"
                  themeVariant="dark"
                  onChange={onDateChange}
                />
              </View>
            )}

            {showDatePicker && Platform.OS === 'android' && (
              <DateTimePicker
                value={purchaseDate}
                mode="date"
                display="default"
                onChange={onDateChange}
              />
            )}

            <View className="p-4 bg-[#161616]">
              <View className="flex-row items-center mb-3">
                <View className="w-10 h-10 rounded-lg bg-[#25280B] border border-[#373F0E] items-center justify-center mr-3">
                  <FileText size={20} color="#D4F129" />
                </View>
                <Text className="text-white text-sm font-semibold">Notes <Text className="text-[#888] font-normal">(Optional)</Text></Text>
              </View>

              <View className="border border-[#242424] rounded-xl bg-[#0A0A0A] p-3 h-32 relative">
                <TextInput
                  placeholder="Add any additional notes about this equipment..."
                  placeholderTextColor="#666"
                  multiline
                  maxLength={200}
                  value={notes}
                  onChangeText={setNotes}
                  className="text-[#888] text-sm h-full font-medium"
                  textAlignVertical="top"
                />
                <Text className="absolute bottom-3 right-3 text-[#666] text-xs">
                  {notes.length}/200
                </Text>
              </View>
            </View>
          </View>

          <View className="flex-row gap-3 p-4 bg-[#0A0A0A] border-t border-[#161616]">
            <Pressable
              disabled={isSubmitting}
              onPress={() => router.back()}
              className="flex-1 items-center justify-center py-4 rounded-full border border-[#242424] bg-[#161616] active:opacity-80 disabled:opacity-40"
            >
              <Text className="text-white font-semibold">CANCEL</Text>
            </Pressable>
            <Pressable
              disabled={isSubmitting}
              onPress={handleSave}
              className="flex-[1.5] flex-row gap-2 items-center justify-center py-4 rounded-full bg-[#D4F129] active:opacity-80 disabled:opacity-50"
            >
              {isSubmitting && <ActivityIndicator color="#000" size="small" />}
              <Text className="text-black font-semibold">SAVE EQUIPMENT</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
