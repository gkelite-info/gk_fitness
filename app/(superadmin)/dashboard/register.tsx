import React, { useState } from 'react';
import { View, ScrollView, Pressable, TextInput, Image, Modal, FlatList, Alert } from 'react-native';
import { Text } from '@/components/nativewindui/Text';
import { useRouter, useLocalSearchParams } from 'expo-router';
import {
  MagnifyingGlass,
  Funnel,
  Plus,
  CaretDown,
  MapPin,
  Calendar,
  CaretRight,
  ArrowLeft,
  UploadSimple,
  X,
} from 'phosphor-react-native';
import * as ImagePicker from 'expo-image-picker';
import { State } from 'country-state-city';
import * as FileSystem from 'expo-file-system/legacy';

export default function RegisterGymScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ openForm?: string }>();

  const [viewMode, setViewMode] = useState<'list' | 'form'>('list');

  const [selectedFilter, setSelectedFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const [gymName, setGymName] = useState('');
  const [gymEmail, setGymEmail] = useState('');
  const [phoneCode, setPhoneCode] = useState('+91');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [altPhoneCode, setAltPhoneCode] = useState('+91');
  const [altPhoneNumber, setAltPhoneNumber] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [stateName, setStateName] = useState('Telangana');
  const [pinCode, setPinCode] = useState('');

  const [ownerName, setOwnerName] = useState('');
  const [ownerEmail, setOwnerEmail] = useState('');
  const [ownerPhoneCode, setOwnerPhoneCode] = useState('+91');
  const [ownerPhone, setOwnerPhone] = useState('');
  const [ownerAltPhoneCode, setOwnerAltPhoneCode] = useState('+91');
  const [ownerAltPhone, setOwnerAltPhone] = useState('');

  const [branches, setBranches] = useState('');
  const [establishedYear, setEstablishedYear] = useState('');
  const [notes, setNotes] = useState('');

  const [logoUri, setLogoUri] = useState<string | null>(null);
  const [stateModalVisible, setStateModalVisible] = useState(false);
  const [stateSearchQuery, setStateSearchQuery] = useState('');
  const [yearModalVisible, setYearModalVisible] = useState(false);

  const indianStates = State.getStatesOfCountry('IN');

  const pickImage = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert('Permission Required', 'Permission to access photos is needed to upload a gym logo.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];

        const maxSizeBytes = 2097152;

        const fileInfo = await FileSystem.getInfoAsync(asset.uri);
        const fileSize = fileInfo.exists ? fileInfo.size : asset.fileSize;

        if (fileSize && fileSize > maxSizeBytes) {
          Alert.alert('File Too Large', 'Please select an image smaller than 2MB.');
          return;
        }

        setLogoUri(asset.uri);
      }
    } catch (error: any) {
      Alert.alert('Error', `Something went wrong while picking the image: ${error?.message || error}`);
    }
  };

  const handlePhoneChange = (text: string, setter: (val: string) => void) => {
    const cleaned = text.replace(/[^0-9]/g, '');
    if (cleaned.length > 0) {
      const firstDigit = cleaned.charAt(0);
      if (firstDigit !== '6' && firstDigit !== '7' && firstDigit !== '8' && firstDigit !== '9') {
        return;
      }
    }
    if (cleaned.length <= 10) {
      setter(cleaned);
    }
  };

  const gymsList = [
    {
      id: '1',
      name: 'PowerHouse Gym',
      owner: 'Rahul Sharma',
      location: 'Hyderabad, Telangana',
      registeredDate: '20 Jul 2026',
      status: 'ACTIVE',
      members: 325,
      trainers: 12,
      doctors: 6,
    },
  ];

  return (
    <View className="flex-1 bg-[#0A0A0A]">
      {viewMode === 'list' ? (
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 20, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}>
          <View className="mb-4">
            <View className="flex-row items-center gap-2 mb-1">
              {router.canGoBack() && (
                <Pressable
                  onPress={() => router.back()}
                  className="w-8 h-8 rounded-full bg-[#111622] border border-[#1F293D] items-center justify-center">
                  <ArrowLeft size={16} color="#FFFFFF" />
                </Pressable>
              )}
              <Text className="text-2xl font-semibold text-white">Registered Gyms</Text>
            </View>
            <Text className={`text-sm text-[#888888] ${router.canGoBack() ? 'ml-10' : ''}`}>
              View and manage all registered gyms.
            </Text>
          </View>

          <View className="flex-row items-center gap-2 mb-4">
            <View className="flex-1 bg-[#0F0F0F] border border-[#1F293D] rounded-xl px-3.5 py-2.5 flex-row items-center gap-2">
              <MagnifyingGlass size={18} color="#888888" />
              <TextInput
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Search gym by name, owner or city..."
                placeholderTextColor="#6B7280"
                className="flex-1 text-white text-sm py-0"
              />
            </View>

            <Pressable className="bg-[#111622] border border-[#1F293D] rounded-xl px-3.5 py-2.5 flex-row items-center gap-2 active:opacity-70">
              <Funnel size={16} color="#888888" />
              <Text className="text-white text-sm font-medium">Filter</Text>
              <CaretDown size={12} color="#888888" />
            </Pressable>
          </View>

          <View className="flex-row items-center justify-between gap-2 mb-4">
            <View className="flex-row items-center gap-2">
              <Pressable
                onPress={() => setSelectedFilter('all')}
                className={`px-4 py-2 rounded-full flex-row items-center justify-center ${selectedFilter === 'all'
                  ? 'bg-[#CCFF00]'
                  : 'bg-[#111622] border border-[#1F293D]'
                  }`}>
                <Text
                  className={`text-xs font-semibold ${selectedFilter === 'all' ? 'text-black' : 'text-white'
                    }`}>
                  All
                </Text>
              </Pressable>

              <Pressable
                onPress={() => setSelectedFilter('active')}
                className={`px-3.5 py-2 rounded-full flex-row items-center gap-1.5 ${selectedFilter === 'active'
                  ? 'bg-[#CCFF00]'
                  : 'bg-[#111622] border border-[#1F293D]'
                  }`}>
                <View className="w-2 h-2 rounded-full bg-[#22C55E]" />
                <Text
                  className={`text-xs font-medium ${selectedFilter === 'active' ? 'text-black font-semibold' : 'text-white'
                    }`}>
                  Active
                </Text>
              </Pressable>

              <Pressable
                onPress={() => setSelectedFilter('inactive')}
                className={`px-3.5 py-2 rounded-full flex-row items-center gap-1.5 ${selectedFilter === 'inactive'
                  ? 'bg-[#CCFF00]'
                  : 'bg-[#111622] border border-[#1F293D]'
                  }`}>
                <View className="w-2 h-2 rounded-full bg-[#EF4444]" />
                <Text
                  className={`text-xs font-medium ${selectedFilter === 'inactive' ? 'text-black font-semibold' : 'text-white'
                    }`}>
                  Inactive
                </Text>
              </Pressable>
            </View>

            <Pressable
              onPress={() => setViewMode('form')}
              className="border border-[#CCFF00] bg-[#111622] px-3 py-2 rounded-full flex-row items-center gap-1.5 active:opacity-80">
              <View className="w-4 h-4 rounded-full border border-[#CCFF00] items-center justify-center">
                <Plus size={10} color="#CCFF00" weight="bold" />
              </View>
              <Text className="text-[#CCFF00] font-semibold text-[11px] tracking-wide">
                REGISTER GYM
              </Text>
            </Pressable>
          </View>

          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-xs text-white font-medium">
              Total Gyms: <Text className="text-[#CCFF00] font-semibold">120</Text>
            </Text>

            <Pressable className="flex-row items-center gap-1">
              <Text className="text-xs text-[#888888]">Sort by: </Text>
              <Text className="text-xs text-white font-semibold">Newest First</Text>
              <CaretDown size={12} color="#FFFFFF" />
            </Pressable>
          </View>

          {gymsList.map((gym) => (
            <View
              key={gym.id}
              className="bg-[#0F0F0F] border border-[#1F293D] rounded-2xl p-4 mb-3">
              <View className="flex-row items-start justify-between">
                <View className="flex-row items-start gap-3 flex-1 pr-2">
                  <View className="w-14 h-14 rounded-xl bg-white items-center justify-center" />
                  <View className="flex-1">
                    <Text className="text-lg font-semibold text-white leading-5">{gym.name}</Text>
                    <Text className="text-xs text-[#888888] mt-0.5">Owner: {gym.owner}</Text>

                    <View className="flex-row items-center gap-1 mt-1.5">
                      <MapPin size={14} color="#888888" />
                      <Text className="text-xs text-[#888888]">{gym.location}</Text>
                    </View>

                    <View className="flex-row items-center gap-1 mt-1">
                      <Calendar size={14} color="#888888" />
                      <Text className="text-xs text-[#888888]">
                        Registered: {gym.registeredDate}
                      </Text>
                    </View>
                  </View>
                </View>

                <View className="bg-[#064E3B]/40 border border-[#059669]/30 px-2.5 py-1 rounded-full flex-row items-center gap-1.5">
                  <View className="w-1.5 h-1.5 rounded-full bg-[#10B981]" />
                  <Text className="text-[#10B981] text-[10px] font-semibold tracking-wider">
                    {gym.status}
                  </Text>
                </View>
              </View>

              <View className="h-[1px] bg-[#1F293D] my-3.5" />

              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center gap-8">
                  <View>
                    <Text className="text-[#888888] text-[10px] font-semibold tracking-wider mb-0.5">
                      MEMBERS
                    </Text>
                    <Text className="text-white text-lg font-semibold">{gym.members}</Text>
                  </View>

                  <View>
                    <Text className="text-[#888888] text-[10px] font-semibold tracking-wider mb-0.5">
                      TRAINERS
                    </Text>
                    <Text className="text-white text-lg font-semibold">{gym.trainers}</Text>
                  </View>

                  <View>
                    <Text className="text-[#888888] text-[10px] font-semibold tracking-wider mb-0.5">
                      DOCTORS
                    </Text>
                    <Text className="text-white text-lg font-semibold">{gym.doctors}</Text>
                  </View>
                </View>

                <CaretRight size={18} color="#888888" />
              </View>
            </View>
          ))}
        </ScrollView>
      ) : (
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 20, paddingBottom: 50 }}
          showsVerticalScrollIndicator={false}>
          <View className="flex-row items-center gap-3 mb-6">
            <Pressable
              onPress={() => setViewMode('list')}
              className="w-9 h-9 rounded-full bg-[#111622] border border-[#1F293D] items-center justify-center active:opacity-70">
              <ArrowLeft size={18} color="#FFFFFF" />
            </Pressable>
            <View className="flex-1">
              <Text className="text-xl font-semibold text-white">Register New Gym</Text>
              <Text className="text-xs text-[#888888] mt-0.5">
                Add a new gym organization to the platform.
              </Text>
            </View>
          </View>

          <Text className="text-xs font-semibold text-[#CCFF00] tracking-wider mb-3">
            GYM INFORMATION
          </Text>

          <Text className="text-xs text-[#888888] mb-1.5">Gym Logo <Text className='text-red-500 text-sm'>*</Text></Text>
          {logoUri ? (
            <View className="border border-dashed border-[#1F293D] bg-[#0F0F0F] rounded-2xl p-6 items-center justify-center mb-4 relative">
              <Pressable
                onPress={() => setLogoUri(null)}
                className="absolute top-3 right-3 p-1.5 bg-[#1F293D] rounded-full active:opacity-75 z-10"
                hitSlop={8}
              >
                <X size={14} color="#FFFFFF" />
              </Pressable>
              <Pressable onPress={pickImage} className="items-center justify-center active:opacity-90">
                <Image
                  source={{ uri: logoUri }}
                  className="w-16 h-16 rounded-xl mb-2"
                  resizeMode="cover"
                />
                <Text className="text-xs font-semibold text-[#CCFF00]">Change Logo</Text>
              </Pressable>
            </View>
          ) : (
            <Pressable
              onPress={pickImage}
              className="border border-dashed border-[#1F293D] bg-[#0F0F0F] rounded-2xl p-6 items-center justify-center mb-4 active:opacity-90 overflow-hidden"
            >
              <View className="w-10 h-10 rounded-full bg-[#111622] border border-[#1F293D] items-center justify-center mb-2">
                <UploadSimple size={20} color="#888888" />
              </View>
              <Text className="text-sm font-semibold text-[#CCFF00]">Upload Logo</Text>
              <Text className="text-[11px] text-[#888888] mt-0.5">PNG, JPG up to 2MB</Text>
            </Pressable>
          )}

          <Text className="text-xs text-[#888888] mb-1.5">Gym Name <Text className='text-red-500 text-sm'>*</Text></Text>
          <TextInput
            value={gymName}
            onChangeText={setGymName}
            placeholder="Enter gym name"
            placeholderTextColor="#6B7280"
            className="bg-[#0F0F0F] border border-[#1F293D] rounded-xl p-3.5 text-white text-sm mb-4"
          />

          <Text className="text-xs text-[#888888] mb-1.5">Gym Email <Text className='text-red-500 text-sm'>*</Text></Text>
          <TextInput
            value={gymEmail}
            onChangeText={setGymEmail}
            placeholder="info@powerhousegym.com"
            placeholderTextColor="#6B7280"
            keyboardType="email-address"
            className="bg-[#0F0F0F] border border-[#1F293D] rounded-xl p-3.5 text-white text-sm mb-4"
          />

          <Text className="text-xs text-[#888888] mb-1.5">Phone Number <Text className='text-red-500 text-sm'>*</Text></Text>
          <View className="flex-row items-center gap-2 mb-4">
            <View className="bg-[#0F0F0F] border border-[#1F293D] rounded-xl px-3 py-3.5 flex-row items-center gap-1">
              <Text className="text-white text-sm font-medium">{phoneCode}</Text>
              <CaretDown size={12} color="#888888" />
            </View>
            <TextInput
              value={phoneNumber}
              onChangeText={(text) => handlePhoneChange(text, setPhoneNumber)}
              placeholder="Enter phone number"
              placeholderTextColor="#6B7280"
              keyboardType="phone-pad"
              maxLength={10}
              className="flex-1 bg-[#0F0F0F] border border-[#1F293D] rounded-xl p-3.5 text-white text-sm"
            />
          </View>

          <Text className="text-xs text-[#888888] mb-1.5">Alternate Phone Number ( Optional )</Text>
          <View className="flex-row items-center gap-2 mb-4">
            <View className="bg-[#0F0F0F] border border-[#1F293D] rounded-xl px-3 py-3.5 flex-row items-center gap-1">
              <Text className="text-white text-sm font-medium">{altPhoneCode}</Text>
              <CaretDown size={12} color="#888888" />
            </View>
            <TextInput
              value={altPhoneNumber}
              onChangeText={(text) => handlePhoneChange(text, setAltPhoneNumber)}
              placeholder="Enter alternate phone number"
              placeholderTextColor="#6B7280"
              keyboardType="phone-pad"
              maxLength={10}
              className="flex-1 bg-[#0F0F0F] border border-[#1F293D] rounded-xl p-3.5 text-white text-sm"
            />
          </View>

          <Text className="text-xs text-[#888888] mb-1.5">Address <Text className='text-red-500 text-sm'>*</Text></Text>
          <TextInput
            value={address}
            onChangeText={setAddress}
            placeholder="Plot No. 45, Begumpet road, Ameerpet"
            placeholderTextColor="#6B7280"
            className="bg-[#0F0F0F] border border-[#1F293D] rounded-xl p-3.5 text-white text-sm mb-4"
          />

          <View className="flex-row items-center gap-2 mb-4">
            <View className="flex-1">
              <Text className="text-xs text-[#888888] mb-1.5">City <Text className='text-red-500 text-sm'>*</Text></Text>
              <TextInput
                value={city}
                onChangeText={setCity}
                placeholder="Hyderabad"
                placeholderTextColor="#6B7280"
                className="bg-[#0F0F0F] border border-[#1F293D] rounded-xl p-3.5 text-white text-sm"
              />
            </View>

            <Pressable
              onPress={() => {
                setStateSearchQuery('');
                setStateModalVisible(true);
              }}
              className="flex-1"
            >
              <Text className="text-xs text-[#888888] mb-1.5">State <Text className='text-red-500 text-sm'>*</Text></Text>
              <View className="bg-[#0F0F0F] border border-[#1F293D] rounded-xl p-3.5 flex-row items-center justify-between">
                <Text className="text-white text-sm">{stateName || 'Select State'}</Text>
                <CaretDown size={12} color="#888888" />
              </View>
            </Pressable>

            <View className="flex-1">
              <Text className="text-xs text-[#888888] mb-1.5">PIN Code <Text className='text-red-500 text-sm'>*</Text></Text>
              <TextInput
                value={pinCode}
                onChangeText={setPinCode}
                placeholder="500016"
                placeholderTextColor="#6B7280"
                keyboardType="numeric"
                className="bg-[#0F0F0F] border border-[#1F293D] rounded-xl p-3.5 text-white text-sm"
              />
            </View>
          </View>

          <Text className="text-xs font-semibold text-[#CCFF00] tracking-wider mb-3 mt-2">
            OWNER INFORMATION
          </Text>

          <Text className="text-xs text-[#888888] mb-1.5">Owner Full Name <Text className='text-red-500 text-sm'>*</Text></Text>
          <TextInput
            value={ownerName}
            onChangeText={setOwnerName}
            placeholder="Enter owner full name"
            placeholderTextColor="#6B7280"
            className="bg-[#0F0F0F] border border-[#1F293D] rounded-xl p-3.5 text-white text-sm mb-4"
          />

          <Text className="text-xs text-[#888888] mb-1.5">Email Address <Text className='text-red-500 text-sm'>*</Text></Text>
          <TextInput
            value={ownerEmail}
            onChangeText={setOwnerEmail}
            placeholder="Enter email address"
            placeholderTextColor="#6B7280"
            keyboardType="email-address"
            className="bg-[#0F0F0F] border border-[#1F293D] rounded-xl p-3.5 text-white text-sm mb-4"
          />

          <Text className="text-xs text-[#888888] mb-1.5">Phone Number <Text className='text-red-500 text-sm'>*</Text></Text>
          <View className="flex-row items-center gap-2 mb-4">
            <View className="bg-[#0F0F0F] border border-[#1F293D] rounded-xl px-3 py-3.5 flex-row items-center gap-1">
              <Text className="text-white text-sm font-medium">{ownerPhoneCode}</Text>
              <CaretDown size={12} color="#888888" />
            </View>
            <TextInput
              value={ownerPhone}
              onChangeText={(text) => handlePhoneChange(text, setOwnerPhone)}
              placeholder="Enter phone number"
              placeholderTextColor="#6B7280"
              keyboardType="phone-pad"
              maxLength={10}
              className="flex-1 bg-[#0F0F0F] border border-[#1F293D] rounded-xl p-3.5 text-white text-sm"
            />
          </View>

          <Text className="text-xs text-[#888888] mb-1.5">Alternate Phone Number ( Optional )</Text>
          <View className="flex-row items-center gap-2 mb-4">
            <View className="bg-[#0F0F0F] border border-[#1F293D] rounded-xl px-3 py-3.5 flex-row items-center gap-1">
              <Text className="text-white text-sm font-medium">{ownerAltPhoneCode}</Text>
              <CaretDown size={12} color="#888888" />
            </View>
            <TextInput
              value={ownerAltPhone}
              onChangeText={(text) => handlePhoneChange(text, setOwnerAltPhone)}
              placeholder="Enter alternate phone number"
              placeholderTextColor="#6B7280"
              keyboardType="phone-pad"
              maxLength={10}
              className="flex-1 bg-[#0F0F0F] border border-[#1F293D] rounded-xl p-3.5 text-white text-sm"
            />
          </View>

          <Text className="text-xs font-semibold text-[#CCFF00] tracking-wider mb-3 mt-2">
            ADDITIONAL INFORMATION
          </Text>

          <Text className="text-xs text-[#888888] mb-1.5">Number of Branches</Text>
          <TextInput
            value={branches}
            onChangeText={setBranches}
            placeholder="Enter number of branches"
            placeholderTextColor="#6B7280"
            keyboardType="numeric"
            className="bg-[#0F0F0F] border border-[#1F293D] rounded-xl p-3.5 text-white text-sm mb-4"
          />

          <Text className="text-xs text-[#888888] mb-1.5">Established Year (Optional)</Text>
          <Pressable 
            onPress={() => setYearModalVisible(true)}
            className="bg-[#0F0F0F] border border-[#1F293D] rounded-xl p-3.5 flex-row items-center justify-between mb-4 active:opacity-80"
          >
            <Text className={`flex-1 text-sm py-0 ${establishedYear ? 'text-white' : 'text-[#6B7280]'}`}>
              {establishedYear || 'Select year'}
            </Text>
            <Calendar size={16} color="#888888" />
          </Pressable>

          <View className="flex-row items-center justify-between mb-1.5">
            <Text className="text-xs text-[#888888]">Notes (Optional)</Text>
            <Text className="text-xs text-[#888888]">{notes.length}/250</Text>
          </View>
          <TextInput
            value={notes}
            onChangeText={setNotes}
            maxLength={250}
            multiline
            numberOfLines={4}
            placeholder="Add any additional notes..."
            placeholderTextColor="#6B7280"
            textAlignVertical="top"
            className="bg-[#0F0F0F] border border-[#1F293D] rounded-xl p-3.5 text-white text-sm min-h-[90px] mb-6"
          />

          <Pressable
            onPress={() => setViewMode('list')}
            className="bg-[#0F0F0F] border border-[#1F293D] rounded-xl py-3.5 items-center justify-center mb-3 active:opacity-80">
            <Text className="text-white text-sm font-semibold">Cancel</Text>
          </Pressable>

          <Pressable
            onPress={() => setViewMode('list')}
            className="bg-[#CCFF00] rounded-xl py-3.5 flex-row items-center justify-center gap-2 active:opacity-90">
            <View className="w-4 h-4 rounded-full border border-black items-center justify-center">
              <Plus size={10} color="#000000" weight="bold" />
            </View>
            <Text className="text-black text-sm font-semibold">Create Gym</Text>
          </Pressable>
        </ScrollView>
      )}

      {/* State Selector Modal */}
      <Modal
        visible={stateModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setStateModalVisible(false)}
      >
        <Pressable
          onPress={() => setStateModalVisible(false)}
          className="flex-1 bg-black/60 justify-center items-center p-4"
        >
          <Pressable
            onPress={(e) => e.stopPropagation()}
            className="w-full max-w-sm bg-[#0F0F0F] border border-[#1F293D] rounded-2xl p-4 max-h-[70%]"
          >
            <View className="flex-row items-center justify-between mb-4 border-b border-[#1F293D] pb-3">
              <Text className="text-lg font-semibold text-white">Select State</Text>
              <Pressable onPress={() => setStateModalVisible(false)}>
                <Text className="text-[#CCFF00] font-semibold text-sm">Close</Text>
              </Pressable>
            </View>

            <View className="bg-[#111622] border border-[#1F293D] rounded-xl px-3.5 py-2 mb-3 flex-row items-center gap-2">
              <MagnifyingGlass size={16} color="#888888" />
              <TextInput
                value={stateSearchQuery}
                onChangeText={setStateSearchQuery}
                placeholder="Search state..."
                placeholderTextColor="#6B7280"
                className="flex-1 text-white text-sm py-1.5"
              />
            </View>

            <FlatList
              data={indianStates.filter(s =>
                s.name.toLowerCase().includes(stateSearchQuery.toLowerCase())
              )}
              keyExtractor={(item) => item.isoCode}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => {
                    setStateName(item.name);
                    setStateModalVisible(false);
                  }}
                  className="py-3 px-2 border-b border-[#1F293D]/50 active:bg-[#111622] rounded-lg"
                >
                  <Text className="text-white text-sm">{item.name}</Text>
                </Pressable>
              )}
              ListEmptyComponent={
                <View className="py-6 items-center">
                  <Text className="text-[#888888] text-sm">No states found</Text>
                </View>
              }
            />
          </Pressable>
        </Pressable>
      </Modal>
      {/* Year Selector Modal */}
      <Modal
        visible={yearModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setYearModalVisible(false)}
      >
        <Pressable 
          onPress={() => setYearModalVisible(false)} 
          className="flex-1 bg-black/60 justify-center items-center p-4"
        >
          <Pressable 
            onPress={(e) => e.stopPropagation()} 
            className="w-full max-w-sm bg-[#0F0F0F] border border-[#1F293D] rounded-2xl p-4 max-h-[60%]"
          >
            <View className="flex-row items-center justify-between mb-4 border-b border-[#1F293D] pb-3">
              <Text className="text-lg font-semibold text-white">Select Year</Text>
              <Pressable onPress={() => setYearModalVisible(false)}>
                <Text className="text-[#CCFF00] font-semibold text-sm">Close</Text>
              </Pressable>
            </View>

            <FlatList
              data={Array.from({ length: 100 }, (_, i) => (new Date().getFullYear() - i).toString())}
              keyExtractor={(item) => item}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => {
                    setEstablishedYear(item);
                    setYearModalVisible(false);
                  }}
                  className={`py-3 px-2 border-b border-[#1F293D]/50 rounded-lg ${establishedYear === item ? 'bg-[#111622]' : 'active:bg-[#111622]'}`}
                >
                  <Text className={`text-sm ${establishedYear === item ? 'text-[#CCFF00] font-semibold' : 'text-white'}`}>{item}</Text>
                </Pressable>
              )}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
