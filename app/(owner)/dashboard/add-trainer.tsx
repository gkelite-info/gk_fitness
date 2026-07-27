import React, { useState } from 'react';
import { View, ScrollView, TextInput, Pressable } from 'react-native';
import { Text } from '@/components/nativewindui/Text';
import { router } from 'expo-router';
import {
  CaretLeft,
  Users,
  Barbell,
  FirstAidKit,
  User,
  CalendarBlank,
  CaretDown,
  Phone,
  Briefcase,
  Clock,
  FileText,
  LockKey,
  Info
} from 'phosphor-react-native';

export default function AddTrainerScreen() {
  const [activeTab, setActiveTab] = useState('trainers');
  const [activeShift, setActiveShift] = useState('morning');
  const [activeDays, setActiveDays] = useState(['mon', 'tue', 'wed', 'thu', 'fri']);
  const [activeSpec, setActiveSpec] = useState('crossfit');

  const toggleDay = (day: string) => {
    if (activeDays.includes(day)) {
      setActiveDays(activeDays.filter(d => d !== day));
    } else {
      setActiveDays([...activeDays, day]);
    }
  };

  return (
    <View className="flex-1 bg-[#0A0A0A]">
      {/* Header */}
      <View className="px-5 pt-6 pb-4 flex-row items-center border-b border-[#161616]">
        <Pressable 
          onPress={() => router.back()} 
          className="w-10 h-10 rounded-full bg-[#161616] items-center justify-center mr-4 active:opacity-70"
        >
          <CaretLeft size={20} color="#fff" />
        </Pressable>
        <View>
          <Text className="text-xl font-bold text-white mb-0.5">Add New Trainer</Text>
          <Text className="text-xs text-[#888]">Add trainer details and create their account</Text>
        </View>
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ padding: 20, paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
        {/* Top Tabs */}
        <View className="flex-row bg-[#161616] rounded-xl p-1 mb-8">
          <Pressable 
            className={`flex-1 flex-row items-center justify-center py-2.5 rounded-lg ${activeTab === 'customers' ? 'bg-[#C3F400]' : ''}`}
            onPress={() => router.replace('/(owner)/dashboard/add-customer')}
          >
            <Users size={18} color={activeTab === 'customers' ? '#000' : '#A1A1AA'} />
            <Text className={`ml-2 font-semibold text-xs ${activeTab === 'customers' ? 'text-black' : 'text-[#A1A1AA]'}`}>Customers</Text>
          </Pressable>
          <Pressable 
            className={`flex-1 flex-row items-center justify-center py-2.5 rounded-lg ${activeTab === 'trainers' ? 'bg-[#C3F400]' : ''}`}
            onPress={() => setActiveTab('trainers')}
          >
            <Barbell size={18} color={activeTab === 'trainers' ? '#000' : '#A1A1AA'} weight={activeTab === 'trainers' ? 'fill' : 'regular'} />
            <Text className={`ml-2 font-semibold text-xs ${activeTab === 'trainers' ? 'text-black' : 'text-[#A1A1AA]'}`}>Trainers</Text>
          </Pressable>
          <Pressable 
            className={`flex-1 flex-row items-center justify-center py-2.5 rounded-lg ${activeTab === 'doctors' ? 'bg-[#C3F400]' : ''}`}
            onPress={() => setActiveTab('doctors')}
          >
            <FirstAidKit size={18} color={activeTab === 'doctors' ? '#000' : '#A1A1AA'} />
            <Text className={`ml-2 font-semibold text-xs ${activeTab === 'doctors' ? 'text-black' : 'text-[#A1A1AA]'}`}>Doctors</Text>
          </Pressable>
        </View>

        {/* PERSONAL INFORMATION */}
        <View className="mb-8">
          <View className="flex-row items-center mb-4">
            <User size={20} color="#C3F400" weight="fill" />
            <Text className="text-[#C3F400] font-bold tracking-wider ml-2 uppercase text-sm">Personal Information</Text>
          </View>
          
          <View className="mb-4">
            <Text className="text-white text-xs mb-2">Full Name *</Text>
            <TextInput
              placeholder="Enter full name"
              placeholderTextColor="#666"
              className="bg-[#161616] text-white px-4 py-3.5 rounded-xl border border-[#242424]"
            />
          </View>
          
          <View className="flex-row gap-4 mb-4">
            <View className="flex-1">
              <Text className="text-white text-xs mb-2">Trainer ID *</Text>
              <TextInput
                value="T-2024-001"
                editable={false}
                className="bg-[#161616] text-white px-4 py-3.5 rounded-xl border border-[#242424] opacity-70"
              />
            </View>
            <View className="flex-1">
              <Text className="text-white text-xs mb-2">Date of Birth *</Text>
              <View className="bg-[#161616] flex-row items-center px-4 rounded-xl border border-[#242424]">
                <TextInput
                  placeholder="mm/dd/yyyy"
                  placeholderTextColor="#666"
                  className="flex-1 text-white py-3.5"
                />
              </View>
            </View>
          </View>
          
          <View className="mb-4">
            <Text className="text-white text-xs mb-2">Gender *</Text>
            <Pressable className="bg-[#161616] flex-row items-center justify-between px-4 py-3.5 rounded-xl border border-[#242424]">
              <Text className="text-[#666]">Select gender</Text>
              <CaretDown size={18} color="#A1A1AA" />
            </Pressable>
          </View>
        </View>

        {/* CONTACT INFORMATION */}
        <View className="mb-8">
          <View className="flex-row items-center mb-4">
            <Phone size={20} color="#C3F400" weight="fill" />
            <Text className="text-[#C3F400] font-bold tracking-wider ml-2 uppercase text-sm">Contact Information</Text>
          </View>
          
          <View className="flex-row gap-4 mb-4">
            <View className="flex-[1.2]">
              <Text className="text-white text-xs mb-2">Phone Number *</Text>
              <View className="flex-row gap-2">
                <Pressable className="bg-[#161616] flex-row items-center px-3 py-3.5 rounded-xl border border-[#242424]">
                  <Text className="text-white mr-1">+91</Text>
                  <CaretDown size={14} color="#A1A1AA" />
                </Pressable>
                <TextInput
                  placeholder="Enter phone number"
                  placeholderTextColor="#666"
                  keyboardType="phone-pad"
                  className="flex-1 bg-[#161616] text-white px-4 py-3.5 rounded-xl border border-[#242424]"
                />
              </View>
            </View>
          </View>

          <View className="mb-4">
            <Text className="text-white text-xs mb-2">Email Address</Text>
            <TextInput
              placeholder="Enter email address"
              placeholderTextColor="#666"
              keyboardType="email-address"
              className="bg-[#161616] text-white px-4 py-3.5 rounded-xl border border-[#242424]"
            />
          </View>
        </View>

        {/* PROFESSIONAL INFORMATION */}
        <View className="mb-8">
          <View className="flex-row items-center mb-4">
            <Briefcase size={20} color="#C3F400" weight="fill" />
            <Text className="text-[#C3F400] font-bold tracking-wider ml-2 uppercase text-sm">Professional Information</Text>
          </View>
          
          <View className="mb-4">
            <Text className="text-white text-xs mb-2">Specialization</Text>
            <View className="flex-row flex-wrap gap-2">
              <Pressable 
                onPress={() => setActiveSpec('strength')}
                className={`px-4 py-2 rounded-full border ${activeSpec === 'strength' ? 'bg-[#C3F400] border-[#C3F400]' : 'border-[#242424]'}`}
              >
                <Text className={`text-xs ${activeSpec === 'strength' ? 'text-black font-semibold' : 'text-[#888]'}`}>Strength Training</Text>
              </Pressable>
              <Pressable 
                onPress={() => setActiveSpec('fatloss')}
                className={`px-4 py-2 rounded-full border ${activeSpec === 'fatloss' ? 'bg-[#C3F400] border-[#C3F400]' : 'border-[#242424]'}`}
              >
                <Text className={`text-xs ${activeSpec === 'fatloss' ? 'text-black font-semibold' : 'text-[#888]'}`}>Fat Loss</Text>
              </Pressable>
              <Pressable 
                onPress={() => setActiveSpec('crossfit')}
                className={`px-4 py-2 rounded-full border ${activeSpec === 'crossfit' ? 'bg-[#C3F400] border-[#C3F400]' : 'border-[#242424]'}`}
              >
                <Text className={`text-xs ${activeSpec === 'crossfit' ? 'text-black font-semibold' : 'text-[#888]'}`}>Cross Fit</Text>
              </Pressable>
            </View>
          </View>
          
          <View className="flex-row gap-4 mb-4">
            <View className="flex-1">
              <Text className="text-white text-xs mb-2">Experience (Years)</Text>
              <TextInput
                placeholder="e.g. 5"
                placeholderTextColor="#666"
                keyboardType="numeric"
                className="bg-[#161616] text-white px-4 py-3.5 rounded-xl border border-[#242424]"
              />
            </View>
            <View className="flex-1">
              <Text className="text-white text-xs mb-2">Joining Date</Text>
              <TextInput
                placeholder="mm/dd/yyyy"
                placeholderTextColor="#666"
                className="bg-[#161616] text-white px-4 py-3.5 rounded-xl border border-[#242424]"
              />
            </View>
          </View>
          
          <View className="mb-4">
            <Text className="text-white text-xs mb-2">Qualification / Certification</Text>
            <TextInput
              placeholder="NASM Certified Trainer, BSc Sports Science"
              placeholderTextColor="#666"
              className="bg-[#161616] text-white px-4 py-3.5 rounded-xl border border-[#242424]"
            />
          </View>
        </View>

        {/* WORKING SCHEDULE */}
        <View className="mb-8">
          <View className="flex-row items-center mb-4">
            <Clock size={20} color="#C3F400" weight="fill" />
            <Text className="text-[#C3F400] font-bold tracking-wider ml-2 uppercase text-sm">Working Schedule</Text>
          </View>
          
          <View className="bg-[#161616] border border-[#242424] rounded-xl p-4">
            <Text className="text-white text-xs mb-3">Shift Preference</Text>
            
            <Pressable className="flex-row items-center mb-3" onPress={() => setActiveShift('morning')}>
              <View className="w-5 h-5 rounded-full border border-[#242424] items-center justify-center mr-3">
                {activeShift === 'morning' && <View className="w-3 h-3 rounded-full bg-[#C3F400]" />}
              </View>
              <Text className="text-[#A1A1AA] text-sm">Morning (06:00 AM – 02:00 PM)</Text>
            </Pressable>
            
            <Pressable className="flex-row items-center mb-5" onPress={() => setActiveShift('evening')}>
              <View className="w-5 h-5 rounded-full border border-[#242424] items-center justify-center mr-3">
                {activeShift === 'evening' && <View className="w-3 h-3 rounded-full bg-[#C3F400]" />}
              </View>
              <Text className="text-[#A1A1AA] text-sm">Evening (02:00 PM – 10:00 PM)</Text>
            </Pressable>
            
            <Text className="text-white text-xs mb-3">Working Days</Text>
            <View className="flex-row flex-wrap gap-2">
              {['mon', 'tue', 'wed', 'thu', 'fri', 'sat'].map((day) => {
                const isActive = activeDays.includes(day);
                return (
                  <Pressable 
                    key={day}
                    onPress={() => toggleDay(day)}
                    className={`w-[45px] h-9 items-center justify-center rounded border ${isActive ? 'bg-[#C3F400] border-[#C3F400]' : 'border-[#242424]'}`}
                  >
                    <Text className={`text-[10px] font-bold uppercase ${isActive ? 'text-black' : 'text-[#888]'}`}>{day}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </View>

        {/* ADDITIONAL INFORMATION */}
        <View className="mb-8">
          <View className="flex-row items-center mb-4">
            <FileText size={20} color="#C3F400" weight="fill" />
            <Text className="text-[#C3F400] font-bold tracking-wider ml-2 uppercase text-sm">Additional Information</Text>
          </View>
          
          <View className="mb-4">
            <Text className="text-white text-xs mb-2">Bio / About Trainer</Text>
            <TextInput
              placeholder="Brief history of achievements..."
              placeholderTextColor="#666"
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              className="bg-[#161616] text-white px-4 py-3.5 rounded-xl border border-[#242424] min-h-[100px]"
            />
          </View>
          
          <View className="mb-4">
            <Text className="text-white text-xs mb-2">Languages Spoken</Text>
            <Pressable className="bg-[#161616] flex-row items-center justify-between px-4 py-3.5 rounded-xl border border-[#242424]">
              <Text className="text-[#666]">English, Spanish</Text>
              <CaretDown size={18} color="#A1A1AA" />
            </Pressable>
          </View>
        </View>

        {/* ACCOUNT INFORMATION */}
        <View className="mb-8">
          <View className="flex-row items-center mb-4">
            <LockKey size={20} color="#C3F400" weight="fill" />
            <Text className="text-[#C3F400] font-bold tracking-wider ml-2 uppercase text-sm">Account Information</Text>
          </View>
          
          <View className="flex-row items-start p-4 border border-dashed border-[#242424] rounded-xl bg-[#0A0A0A]">
            <Info size={18} color="#C3F400" style={{ marginTop: 2 }} />
            <Text className="text-[#888] text-xs ml-3 flex-1 leading-5">
              Login credentials will be generated automatically and shared with the trainer via the provided email address upon creation.
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Footer Buttons */}
      <View className="flex-row gap-3 p-4 bg-[#0A0A0A] border-t border-[#161616]">
        <Pressable 
          onPress={() => router.back()}
          className="flex-1 items-center justify-center py-4 rounded-full border border-[#242424] bg-[#161616] active:opacity-80"
        >
          <Text className="text-white font-bold">CANCEL</Text>
        </Pressable>
        <Pressable className="flex-[1.5] items-center justify-center py-4 rounded-full bg-[#C3F400] active:opacity-80">
          <Text className="text-black font-bold">SAVE TRAINER</Text>
        </Pressable>
      </View>
    </View>
  );
}
