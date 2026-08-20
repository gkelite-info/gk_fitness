import React, { useState } from 'react';
import { View, ScrollView, TextInput, Pressable, KeyboardAvoidingView, Platform, Modal, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text } from '@/components/nativewindui/Text';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import {
  CaretLeft,
  User,
  EnvelopeSimple,
  Phone,
  MapPin,
  Flag,
  MapTrifold,
  GlobeHemisphereWest,
  Buildings,
  LockKey,
  Eye,
  EyeSlash,
  Barbell,
  Globe,
  MagnifyingGlass,
  X
} from 'phosphor-react-native';
import { Country, State } from 'country-state-city';

const SearchableModalPicker = ({ visible, onClose, data, onSelect, placeholder, selectedValue }: any) => {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredData = data.filter((item: any) => item.label.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 justify-end bg-black/80">
        <View className="bg-[#121212] rounded-t-3xl h-[80%] p-6">
          <View className="flex-row justify-between items-center mb-6">
            <Text className="text-white text-xl font-semibold">{placeholder}</Text>
            <Pressable onPress={onClose} className="p-2 -mr-2">
              <X size={24} color="#6B6B6B" />
            </Pressable>
          </View>
          <View className="flex-row items-center bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl px-4 py-3 mb-4">
            <MagnifyingGlass size={20} color="#6B6B6B" />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search..."
              placeholderTextColor="#6B6B6B"
              className="flex-1 text-white text-[15px] p-0 ml-3 font-medium"
              autoCapitalize="none"
            />
          </View>
          <FlatList
            data={filteredData}
            keyExtractor={item => item.value}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="always"
            renderItem={({ item }) => (
              <Pressable
                onPress={() => { onSelect(item.value); onClose(); setSearchQuery(''); }}
                className="py-4 border-b border-[#1E1E1E]"
              >
                <Text className={`text-[15px] ${selectedValue === item.value ? 'text-[#C3F400] font-semibold' : 'text-white'}`}>{item.label}</Text>
              </Pressable>
            )}
            ListEmptyComponent={
              <Text className="text-[#8E8E93] text-center mt-10 text-[15px]">No results found.</Text>
            }
          />
        </View>
      </View>
    </Modal>
  );
};

export default function SignupScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const typeId = (params.type as string) || 'individual';

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [country, setCountry] = useState('');
  const [state, setState] = useState('');
  const [pinCode, setPinCode] = useState('');
  const [city, setCity] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [countryModalVisible, setCountryModalVisible] = useState(false);
  const [stateModalVisible, setStateModalVisible] = useState(false);

  const getAccountTypeLabel = () => {
    switch (typeId) {
      case 'owner': return 'Gym Owner';
      case 'global_trainer': return 'Global Trainer';
      case 'individual':
      default: return 'Individual Customer';
    }
  };

  const getAccountTypeIcon = () => {
    switch (typeId) {
      case 'owner': return Buildings;
      case 'global_trainer': return Globe;
      case 'individual':
      default: return User;
    }
  };

  const AccountIcon = getAccountTypeIcon();

  const countries = Country.getAllCountries().map(c => ({ label: c.name, value: c.isoCode }));
  const states = country ? State.getStatesOfCountry(country).map(s => ({ label: s.name, value: s.isoCode })) : [];

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1 bg-[#09090B]">
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView className="flex-1">
        <ScrollView contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 24, paddingBottom: 40 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <View className="pt-14 pb-6">
            <Pressable
              onPress={() => router.back()}
              className="w-10 h-10 bg-[#121212] border border-[#1E1E1E] rounded-full items-center justify-center mb-6"
            >
              <CaretLeft size={20} color="#FFFFFF" />
            </Pressable>

            <Text className="text-white text-3xl font-semibold mb-2">
              <Text className="text-[#C3F400] text-3xl">Create</Text> Your Account
            </Text>
            <Text className="text-[#8E8E93] text-[13px]">
              Join GK-Gym Life and start your fitness journey.
            </Text>
          </View>

          <View className="flex-row items-center bg-[#121212] border border-[#1E1E1E] rounded-xl p-4 mb-8">
            <View className="w-10 h-10 rounded-full border border-[#D4FF00]/30 items-center justify-center bg-[#D4FF00]/10 mr-4">
              <AccountIcon size={20} color="#C3F400" weight="regular" />
            </View>
            <Text className="text-white text-base font-semibold">{getAccountTypeLabel()}</Text>
          </View>

          <View className="gap-5 mb-8">
            <View>
              <Text className="text-white text-[13px] font-medium mb-2">Full Name</Text>
              <View className="flex-row items-center bg-[#121212] border border-[#1E1E1E] rounded-xl px-4 py-3.5 gap-3">
                <User size={18} color="#6B6B6B" />
                <TextInput
                  value={fullName}
                  onChangeText={(val) => setFullName(val.replace(/[0-9]/g, ''))}
                  placeholder="Enter your full name"
                  placeholderTextColor="#6B6B6B"
                  className="flex-1 text-white text-[14px] p-0 font-medium"
                />
              </View>
            </View>

            <View>
              <Text className="text-white text-[13px] font-medium mb-2">Email</Text>
              <View className="flex-row items-center bg-[#121212] border border-[#1E1E1E] rounded-xl px-4 py-3.5 gap-3">
                <EnvelopeSimple size={18} color="#6B6B6B" />
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  placeholder="Enter your email"
                  placeholderTextColor="#6B6B6B"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  className="flex-1 text-white text-[14px] p-0 font-medium"
                />
              </View>
            </View>

            <View>
              <Text className="text-white text-[13px] font-medium mb-2">Phone Number</Text>
              <View className="flex-row items-center bg-[#121212] border border-[#1E1E1E] rounded-xl px-4 py-3.5 gap-3">
                <Phone size={18} color="#6B6B6B" />
                <TextInput
                  value={phone}
                  onChangeText={(val) => setPhone(val.replace(/[^0-9]/g, ''))}
                  placeholder="Enter your phone number"
                  placeholderTextColor="#6B6B6B"
                  keyboardType="phone-pad"
                  maxLength={10}
                  className="flex-1 text-white text-[14px] p-0 font-medium"
                />
              </View>
            </View>

            <View>
              <Text className="text-white text-[13px] font-medium mb-2">Address</Text>
              <View className="flex-row items-center bg-[#121212] border border-[#1E1E1E] rounded-xl px-4 py-3.5 gap-3 mb-3">
                <MapPin size={18} color="#6B6B6B" />
                <TextInput
                  value={address}
                  onChangeText={setAddress}
                  placeholder="House / Flat / Building / Street"
                  placeholderTextColor="#6B6B6B"
                  className="flex-1 text-white text-[14px] p-0 font-medium"
                />
              </View>

              <View className="flex-row gap-3 mb-3">
                <View className="flex-1">
                  <Pressable onPress={() => setCountryModalVisible(true)}>
                    <View className="flex-row items-center bg-[#121212] border border-[#1E1E1E] rounded-xl px-4 py-3.5 gap-3">
                      <Flag size={18} color="#6B6B6B" />
                      <TextInput
                        value={country ? Country.getCountryByCode(country)?.name : ''}
                        placeholder="Country"
                        placeholderTextColor="#6B6B6B"
                        className="flex-1 text-white text-[14px] p-0 font-medium"
                        editable={false}
                        pointerEvents="none"
                      />
                    </View>
                  </Pressable>

                  <SearchableModalPicker
                    visible={countryModalVisible}
                    onClose={() => setCountryModalVisible(false)}
                    data={countries}
                    onSelect={(val: string) => { setCountry(val); setState(''); }}
                    placeholder="Select Country"
                    selectedValue={country}
                  />
                </View>

                <View className="flex-1">
                  <Pressable onPress={() => { if (country) setStateModalVisible(true); }}>
                    <View className={`flex-row items-center bg-[#121212] border border-[#1E1E1E] rounded-xl px-4 py-3.5 gap-3 ${!country ? 'opacity-50' : ''}`}>
                      <MapTrifold size={18} color="#6B6B6B" />
                      <TextInput
                        value={country && state ? State.getStateByCodeAndCountry(state, country)?.name : ''}
                        placeholder="State"
                        placeholderTextColor="#6B6B6B"
                        className="flex-1 text-white text-[14px] p-0 font-medium"
                        editable={false}
                        pointerEvents="none"
                      />
                    </View>
                  </Pressable>

                  <SearchableModalPicker
                    visible={stateModalVisible}
                    onClose={() => setStateModalVisible(false)}
                    data={states}
                    onSelect={(val: string) => setState(val)}
                    placeholder="Select State"
                    selectedValue={state}
                  />
                </View>
              </View>

              <View className="flex-row gap-3">
                <View className="flex-row items-center bg-[#121212] border border-[#1E1E1E] rounded-xl px-4 py-3.5 gap-3 flex-1">
                  <Buildings size={18} color="#6B6B6B" />
                  <TextInput
                    value={city}
                    onChangeText={setCity}
                    placeholder="City"
                    placeholderTextColor="#6B6B6B"
                    className="flex-1 text-white text-[14px] p-0 font-medium"
                  />
                </View>
                <View className="flex-row items-center bg-[#121212] border border-[#1E1E1E] rounded-xl px-4 py-3.5 gap-3 flex-1">
                  <GlobeHemisphereWest size={18} color="#6B6B6B" />
                  <TextInput
                    value={pinCode}
                    onChangeText={(val) => setPinCode(val.replace(/[^0-9]/g, ''))}
                    placeholder="PIN Code"
                    placeholderTextColor="#6B6B6B"
                    keyboardType="number-pad"
                    maxLength={6}
                    className="flex-1 text-white text-[14px] p-0 font-medium"
                  />
                </View>
              </View>
            </View>

            <View>
              <Text className="text-white text-[13px] font-medium mb-2">Password</Text>
              <View className="flex-row items-center bg-[#121212] border border-[#1E1E1E] rounded-xl px-4 py-3.5 gap-3">
                <LockKey size={18} color="#6B6B6B" />
                <TextInput
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Enter your password"
                  placeholderTextColor="#6B6B6B"
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  className="flex-1 text-white text-[14px] p-0 font-medium"
                />
                <Pressable onPress={() => setShowPassword(!showPassword)} className="p-1">
                  {showPassword ? <Eye size={18} color="#6B6B6B" /> : <EyeSlash size={18} color="#6B6B6B" />}
                </Pressable>
              </View>
            </View>

            <View>
              <Text className="text-white text-[13px] font-medium mb-2">Confirm Password</Text>
              <View className="flex-row items-center bg-[#121212] border border-[#1E1E1E] rounded-xl px-4 py-3.5 gap-3">
                <LockKey size={18} color="#6B6B6B" />
                <TextInput
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder="Confirm your password"
                  placeholderTextColor="#6B6B6B"
                  secureTextEntry={!showConfirmPassword}
                  autoCapitalize="none"
                  className="flex-1 text-white text-[14px] p-0 font-medium"
                />
                <Pressable onPress={() => setShowConfirmPassword(!showConfirmPassword)} className="p-1">
                  {showConfirmPassword ? <Eye size={18} color="#6B6B6B" /> : <EyeSlash size={18} color="#6B6B6B" />}
                </Pressable>
              </View>
            </View>
          </View>

          <Pressable className="bg-[#C3F400] rounded-xl py-3.5 items-center active:opacity-80 mb-6">
            <Text className="text-black font-semibold text-[15px]">Sign Up</Text>
          </Pressable>

          <View className="flex-row items-center justify-center">
            <View className="flex-1 h-[1px] bg-[#1E1E1E]" />
            <Text className="text-[#6B6B6B] text-[13px] mx-4">Already have an account?</Text>
            <View className="flex-1 h-[1px] bg-[#1E1E1E]" />
          </View>

          <Pressable onPress={() => router.back()} className="items-center mt-4 p-2">
            <Text className="text-[#C3F400] font-semibold text-[14px]">Login</Text>
          </Pressable>

        </ScrollView>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}
