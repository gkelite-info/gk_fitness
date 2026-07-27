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
  ShieldCheck,
  IdentificationCard,
  LockKey,
  Info
} from 'phosphor-react-native';

export default function AddCustomerScreen() {
  const [activeTab, setActiveTab] = useState('customers');

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
          <Text className="text-xl font-bold text-white mb-0.5">Add New Customer</Text>
          <Text className="text-xs text-[#888]">Add customer details and create their account</Text>
        </View>
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ padding: 20, paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
        {/* Top Tabs */}
        <View className="flex-row bg-[#161616] rounded-xl p-1 mb-8">
          <Pressable
            className={`flex-1 flex-row items-center justify-center py-2.5 rounded-lg ${activeTab === 'customers' ? 'bg-[#C3F400]' : ''}`}
            onPress={() => setActiveTab('customers')}
          >
            <Users size={18} color={activeTab === 'customers' ? '#000' : '#A1A1AA'} weight={activeTab === 'customers' ? 'fill' : 'regular'} />
            <Text className={`ml-2 font-semibold text-xs ${activeTab === 'customers' ? 'text-black' : 'text-[#A1A1AA]'}`}>Customers</Text>
          </Pressable>
          <Pressable
            className={`flex-1 flex-row items-center justify-center py-2.5 rounded-lg ${activeTab === 'trainers' ? 'bg-[#C3F400]' : ''}`}
            onPress={() => router.replace('/(owner)/dashboard/add-trainer')}
          >
            <Barbell size={18} color={activeTab === 'trainers' ? '#000' : '#A1A1AA'} />
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

          <View className="flex-row gap-4 mb-4">
            <View className="flex-1">
              <Text className="text-white text-xs mb-2">Full Name *</Text>
              <TextInput
                placeholder="Enter full name"
                placeholderTextColor="#666"
                className="bg-[#161616] text-white px-4 py-3.5 rounded-xl border border-[#242424]"
              />
            </View>
            <View className="flex-1">
              <Text className="text-white text-xs mb-2">Customer ID *</Text>
              <TextInput
                placeholder="Auto generated"
                placeholderTextColor="#666"
                editable={false}
                className="bg-[#161616] text-white px-4 py-3.5 rounded-xl border border-[#242424] opacity-70"
              />
            </View>
          </View>

          <View className="flex-row gap-4">
            <View className="flex-1">
              <Text className="text-white text-xs mb-2">Date of Birth *</Text>
              <View className="bg-[#161616] flex-row items-center px-4 rounded-xl border border-[#242424]">
                <TextInput
                  placeholder="DD / MM / YYYY"
                  placeholderTextColor="#666"
                  className="flex-1 text-white py-3.5"
                />
                <CalendarBlank size={18} color="#A1A1AA" />
              </View>
            </View>
            <View className="flex-1">
              <Text className="text-white text-xs mb-2">Gender *</Text>
              <Pressable className="bg-[#161616] flex-row items-center justify-between px-4 py-3.5 rounded-xl border border-[#242424]">
                <Text className="text-[#666]">Select gender</Text>
                <CaretDown size={18} color="#A1A1AA" />
              </Pressable>
            </View>
          </View>
        </View>

        {/* CONTACT INFORMATION */}
        <View className="mb-8">
          <View className="flex-row items-center mb-4">
            <Phone size={20} color="#C3F400" weight="fill" />
            <Text className="text-[#C3F400] font-bold tracking-wider ml-2 uppercase text-sm">Contact Information</Text>
          </View>

          <View className="flex-row gap-4">
            <View className="flex-1">
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
            <View className="flex-1">
              <Text className="text-white text-xs mb-2">Email Address</Text>
              <TextInput
                placeholder="Enter email address"
                placeholderTextColor="#666"
                keyboardType="email-address"
                className="bg-[#161616] text-white px-4 py-3.5 rounded-xl border border-[#242424]"
              />
            </View>
          </View>
        </View>

        {/* EMERGENCY CONTACT */}
        <View className="mb-8">
          <View className="flex-row items-center mb-4">
            <ShieldCheck size={20} color="#C3F400" weight="fill" />
            <Text className="text-[#C3F400] font-bold tracking-wider ml-2 uppercase text-sm">Emergency Contact</Text>
          </View>

          <View className="flex-row gap-4 mb-4">
            <View className="flex-1">
              <Text className="text-white text-xs mb-2">Contact Name *</Text>
              <TextInput
                placeholder="Enter contact name"
                placeholderTextColor="#666"
                className="bg-[#161616] text-white px-4 py-3.5 rounded-xl border border-[#242424]"
              />
            </View>
            <View className="flex-1">
              <Text className="text-white text-xs mb-2">Relationship *</Text>
              <Pressable className="bg-[#161616] flex-row items-center justify-between px-4 py-3.5 rounded-xl border border-[#242424]">
                <Text className="text-[#666]">Select relationship</Text>
                <CaretDown size={18} color="#A1A1AA" />
              </Pressable>
            </View>
          </View>

          <View className="w-1/2 pr-2">
            <Text className="text-white text-xs mb-2">Contact Phone *</Text>
            <View className="flex-row gap-2">
              <Pressable className="bg-[#161616] flex-row items-center px-3 py-3.5 rounded-xl border border-[#242424]">
                <Text className="text-white mr-1">+91</Text>
                <CaretDown size={14} color="#A1A1AA" />
              </Pressable>
              <TextInput
                placeholder="Enter contact number"
                placeholderTextColor="#666"
                keyboardType="phone-pad"
                className="flex-1 bg-[#161616] text-white px-4 py-3.5 rounded-xl border border-[#242424]"
              />
            </View>
          </View>
        </View>

        {/* CUSTOMERSHIP INFORMATION */}
        <View className="mb-8">
          <View className="flex-row items-center mb-4">
            <IdentificationCard size={20} color="#C3F400" weight="fill" />
            <Text className="text-[#C3F400] font-bold tracking-wider ml-2 uppercase text-sm">Customership Information</Text>
          </View>

          <View className="mb-4">
            <Text className="text-white text-xs mb-2">Customership Plan *</Text>
            <Pressable className="bg-[#161616] flex-row items-center justify-between px-4 py-3.5 rounded-xl border border-[#242424]">
              <Text className="text-[#666]">Select customership plan</Text>
              <CaretDown size={18} color="#A1A1AA" />
            </Pressable>
          </View>

          <View className="flex-row gap-4">
            <View className="flex-1">
              <Text className="text-white text-xs mb-2">Start Date *</Text>
              <View className="bg-[#161616] flex-row items-center px-4 rounded-xl border border-[#242424]">
                <TextInput
                  placeholder="DD / MM / YYYY"
                  placeholderTextColor="#666"
                  className="flex-1 text-white py-3.5"
                />
                <CalendarBlank size={18} color="#A1A1AA" />
              </View>
            </View>
            <View className="flex-1">
              <Text className="text-white text-xs mb-2">Expiry Date *</Text>
              <View className="bg-[#161616] flex-row items-center px-4 rounded-xl border border-[#242424]">
                <TextInput
                  placeholder="DD / MM / YYYY"
                  placeholderTextColor="#666"
                  className="flex-1 text-white py-3.5"
                />
                <CalendarBlank size={18} color="#A1A1AA" />
              </View>
            </View>
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
              Login crederntials will be generated automatically and shared with the customer.
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
          <Text className="text-black font-bold">SAVE CUSTOMER</Text>
        </Pressable>
      </View>
    </View>
  );
}
