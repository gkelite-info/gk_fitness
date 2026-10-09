import React, { useState } from 'react';
import { View, ScrollView, Pressable, FlatList, TextInput, Modal, ActivityIndicator } from 'react-native';
import { Text } from '@/components/nativewindui/Text';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CaretLeft, Phone, User, Tag, Calendar, ChatCircle, Fire, Snowflake, Clock, MagnifyingGlass, CaretDown, TrendUp, TrendDown, Minus, ShareNetwork, UserPlus, Eye, Pen } from 'phosphor-react-native';
import { router } from 'expo-router';
import { useEnquiries } from '@/hooks/enquiries/useEnquiries';
import { GymEnquiryAttributes } from '@/helpers/enquiries/enquiriesHelper';
import { useDebounce } from '@/hooks/useDebounce';
import { format } from 'date-fns';

const FILTER_OPTIONS = {
  category: [
    { label: "All Categories", value: "all" },
    { label: "Hot", value: "hot" },
    { label: "Warm", value: "warm" },
    { label: "Cold", value: "cold" }
  ],
  source: [
    { label: "All Sources", value: "all" },
    { label: "Instagram", value: "instagram" },
    { label: "Google", value: "google" },
    { label: "Facebook", value: "facebook" },
    { label: "Owner Added", value: "owner" },
    { label: "Referral", value: "referral" },
    { label: "Walk-in", value: "walkin" }
  ],
  status: [
    { label: "All Statuses", value: "all" },
    { label: "New", value: "new" },
    { label: "Follow-up", value: "followup" },
    { label: "In Progress", value: "inprogress" },
    { label: "Converted", value: "converted" },
    { label: "Not Interested", value: "notinterested" }
  ]
};

const getCategoryColor = (category: string) => {
  switch (category?.toLowerCase()) {
    case 'hot': return { bg: '#321317', text: '#EF4444' };
    case 'warm': return { bg: '#2E2012', text: '#F59E0B' };
    case 'cold': return { bg: '#0C2433', text: '#0EA5E9' };
    default: return { bg: '#1C2631', text: '#94A3B8' };
  }
};

const getStatusColor = (status: string) => {
  switch (status?.toLowerCase()) {
    case 'new': return { bg: '#0B2545', text: '#38BDF8' };
    case 'followup': return { bg: '#33240F', text: '#F59E0B' };
    case 'inprogress': return { bg: '#2C103D', text: '#C084FC' };
    case 'converted': return { bg: '#082E20', text: '#10B981' };
    case 'notinterested': return { bg: '#321317', text: '#EF4444' };
    default: return { bg: '#1C2631', text: '#94A3B8' };
  }
};

const INTERESTS_MAP: Record<string, string> = {
  membership: 'Gym Membership',
  personaltraining: 'Personal Training',
  groupclass: 'Group Class',
  others: 'Other'
};

const SOURCES_MAP: Record<string, string> = {
  walkin: 'Walk-in',
  instagram: 'Instagram',
  facebook: 'Facebook',
  google: 'Google',
  referral: 'Referral',
  owner: 'Owner Added',
  socialmedia: 'Social Media',
  others: 'Other'
};

const ADDED_VIA_MAP: Record<string, string> = {
  socialmedia: 'Social Media',
  walkin: 'Walk-in',
  owner: 'Owner Added'
};

const STATUS_MAP: Record<string, string> = {
  new: 'New',
  followup: 'Follow-up',
  inprogress: 'In Progress',
  converted: 'Converted',
  notinterested: 'Not Interested'
};

const EnquiryCard = ({ item }: { item: GymEnquiryAttributes }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const catColor = getCategoryColor(item.enquiryCategory);
  const statColor = getStatusColor(item.status);

  const displayId = item.gymEnquiryId ? item.gymEnquiryId.substring(0, 6).toUpperCase() : '---';
  const displayDate = item.followUpDate ? format(new Date(item.followUpDate), 'dd MMM yyyy') : 'None';

  return (
    <Pressable 
      onPress={() => setIsExpanded(!isExpanded)}
      className="bg-[#10161C] border border-[#1C2631] rounded-xl p-4 mb-3"
    >
      <View className="flex-row justify-between items-start mb-3">
        <View className="flex-row items-start gap-3">
          <View className="bg-[#1A2330] px-2 py-1 rounded">
            <Text className="text-[#5A697A] text-[10px] font-bold">#{displayId}</Text>
          </View>
          <View>
            <Text className="text-white font-semibold text-lg">{item.fullName}</Text>
            <View className="flex-row items-center gap-1 mt-1">
              <Phone size={12} color="#5A697A" />
              <Text className="text-[#A8B7C7] text-xs">{item.mobile}</Text>
            </View>
          </View>
        </View>
        <View style={{ backgroundColor: statColor.bg }} className="px-2 py-1 rounded-full">
          <Text style={{ color: statColor.text }} className="text-[10px] font-bold uppercase">{STATUS_MAP[item.status] || item.status}</Text>
        </View>
      </View>

      <View className="flex-row flex-wrap gap-2 mb-4">
        <View className="flex-row items-center gap-1 bg-[#1A1A1A] px-2 py-1 rounded border border-[#2A2A2A]">
          <Tag size={12} color="#888888" />
          <Text className="text-gray-400 text-xs">{INTERESTS_MAP[item.interestedIn] || item.interestedIn}</Text>
        </View>
        <View style={{ backgroundColor: catColor.bg }} className="px-2 py-1 rounded">
          <Text style={{ color: catColor.text }} className="text-[10px] font-bold uppercase">{item.enquiryCategory}</Text>
        </View>
      </View>

      <View className="flex-row justify-between mb-2">
        <View className="flex-1">
          <Text className="text-[#5A697A] text-[9px] uppercase font-bold mb-1.5 tracking-wider">Added Via</Text>
          <View className="flex-row items-center gap-1">
            {item.addedThrough === 'socialmedia' ? <ShareNetwork size={12} color="#22C55E"/> : <UserPlus size={12} color="#F97316"/>}
            <Text className={`text-xs font-semibold ${item.addedThrough === 'socialmedia' ? 'text-[#22C55E]' : 'text-[#F97316]'}`}>{ADDED_VIA_MAP[item.addedThrough] || item.addedThrough}</Text>
          </View>
        </View>
        <View className="flex-1">
          <Text className="text-[#5A697A] text-[9px] uppercase font-bold mb-1.5 tracking-wider">Source</Text>
          <View className="flex-row items-center gap-1">
            <User size={12} color="#888888" />
            <Text className="text-gray-400 text-xs font-semibold">{SOURCES_MAP[item.enquirySource] || item.enquirySource}</Text>
          </View>
        </View>
        <View className="flex-1">
          <Text className="text-[#5A697A] text-[9px] uppercase font-bold mb-1.5 tracking-wider">Follow-up</Text>
          <View className="flex-row items-center gap-1">
            <Calendar size={12} color="#A8B7C7" />
            <Text className="text-[#A8B7C7] text-xs font-semibold">{displayDate}</Text>
          </View>
        </View>
      </View>

      {isExpanded && (
        <View className="border-t border-[#1C2631] pt-4 mt-2">
          <View className="flex-row items-center gap-3">
            <Pressable onPress={() => router.push(`/(owner)/dashboard/enquiries/view?id=${item.gymEnquiryId}`)} className="flex-1 bg-[#1A2330] border border-[#2B3648] rounded-lg py-2.5 items-center flex-row justify-center gap-2 active:opacity-75">
               <Eye size={16} color="#A8B7C7" />
               <Text className="text-[#A8B7C7] font-bold text-xs">View Details</Text>
            </Pressable>
            <Pressable onPress={() => router.push(`/(owner)/dashboard/enquiries/add?id=${item.gymEnquiryId}&edit=true`)} className="flex-1 bg-[#CCF200] rounded-lg py-2.5 items-center flex-row justify-center gap-2 active:opacity-75 shadow-sm">
               <Pen size={16} color="#000000" weight="bold" />
               <Text className="text-black font-bold text-xs">Edit Enquiry</Text>
            </Pressable>
          </View>
        </View>
      )}

      <View className="items-center mt-1">
        <CaretDown size={14} color="#5A697A" style={{ transform: [{ rotate: isExpanded ? '180deg' : '0deg' }] }} />
      </View>
    </Pressable>
  );
};

export default function EnquiriesScreen() {
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 500);
  
  const [filters, setFilters] = useState({
    category: "all",
    source: "all",
    status: "all"
  });

  const [activeDropdown, setActiveDropdown] = useState<keyof typeof FILTER_OPTIONS | null>(null);

  const { data: enquiriesData, isLoading } = useEnquiries(1, 100, debouncedSearch, filters.status, filters.category, filters.source);
  const enquiries = enquiriesData?.data || [];

  const METRICS = [
    { id: 'total', title: "Total Enquiries", value: enquiriesData?.total || 0, trend: "none", trendValue: "", trendLabel: "", icon: ChatCircle, iconBg: "#063327", iconColor: "#22C55E" },
    { id: 'converted', title: "Total converted", value: enquiries.filter(e => e.status === 'converted').length, trend: "none", trendValue: "", trendLabel: "", icon: Clock, iconBg: "#27173B", iconColor: "#A855F7", isLink: true }
  ];

  return (
    <View className="flex-1 bg-[#0A0A0A]">
      <View className="flex-row items-center justify-between px-4 pt-6 pb-4 bg-[#0A0A0A] border-b border-[#1F293D]">
        <Pressable onPress={() => router.back()} className="w-10 h-10 items-start justify-center">
          <CaretLeft size={24} color="#FFFFFF" />
        </Pressable>
        <Text className="text-white text-lg font-bold">Enquiries</Text>
        <View className="w-10 h-10" />
      </View>

      <View className="px-4 py-4">
        {/* KPI Cards */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-6">
          <View className="flex-row gap-3">
            {METRICS.map((metric) => {
              const IconComp = metric.icon;
              return (
                <Pressable 
                  key={metric.id}
                  onPress={() => metric.isLink ? router.push('/(owner)/dashboard/enquiries/converted') : null}
                  className={`bg-[#10161C] border border-[#1C2631] rounded-xl p-3 w-40 ${metric.isLink ? 'active:opacity-75' : ''}`}
                >
                  <View className="flex-row items-center justify-between mb-3">
                    <Text className="text-xs text-[#94A3B8] font-medium w-24" numberOfLines={2}>{metric.title}</Text>
                    <View style={{ backgroundColor: metric.iconBg }} className="w-7 h-7 rounded-full items-center justify-center">
                      <IconComp size={14} color={metric.iconColor} weight="fill" />
                    </View>
                  </View>
                  <Text className="text-2xl font-bold text-white mb-2">{metric.value}</Text>
                </Pressable>
              );
            })}
          </View>
        </ScrollView>

        {/* Search Bar */}
        <View className="flex-row items-center px-3 gap-2 w-full h-[42px] bg-[#10161C] border border-[#1C2631] rounded-lg mb-4">
          <MagnifyingGlass size={16} color="#5A697A" />
          <TextInput 
            placeholder="Search by name or phone number..."
            placeholderTextColor="#5A697A"
            value={search}
            onChangeText={setSearch}
            className="flex-1 text-white text-sm"
          />
        </View>

        {/* Dropdown Filters */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-2">
          <View className="flex-row gap-2">
            {(Object.keys(FILTER_OPTIONS) as Array<keyof typeof FILTER_OPTIONS>).map((key) => {
              const currentVal = FILTER_OPTIONS[key].find(o => o.value === filters[key])?.label || filters[key];
              return (
                <View key={key} className="flex-col gap-1">
                  <Text className="text-[9px] text-[#667688] font-bold uppercase tracking-wider px-1">
                    {key}
                  </Text>
                  <Pressable
                    onPress={() => setActiveDropdown(key)}
                    className="flex-row items-center justify-between px-3 h-[38px] min-w-[120px] bg-[#10161C] border border-[#1C2631] rounded-lg active:bg-[#1A2330]"
                  >
                    <Text className="text-white text-xs">{currentVal}</Text>
                    <CaretDown size={12} color="#5A697A" />
                  </Pressable>
                </View>
              );
            })}
          </View>
        </ScrollView>
      </View>

      <View className="flex-1 px-4">
        {isLoading ? (
          <View className="flex-1 items-center justify-center mb-20">
            <ActivityIndicator color="#CCF200" />
          </View>
        ) : enquiries.length === 0 ? (
          <View className="flex-1 items-center justify-center mb-20">
            <Text className="text-gray-500">No enquiries match your filters.</Text>
          </View>
        ) : (
          <FlatList
            data={enquiries}
            keyExtractor={(item) => item.gymEnquiryId!}
            renderItem={({ item }) => <EnquiryCard item={item} />}
            contentContainerStyle={{ paddingBottom: 150 }}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>

      <Pressable
        onPress={() => router.push('/(owner)/dashboard/enquiries/add')}
        className="absolute bottom-28 right-6 w-14 h-14 bg-[#CCF200] rounded-full items-center justify-center shadow-lg active:scale-95"
      >
        <Text className="text-black text-3xl mb-1">+</Text>
      </Pressable>

      {/* Custom Dropdown Modal */}
      {activeDropdown && (
        <Modal transparent animationType="fade" visible={!!activeDropdown} onRequestClose={() => setActiveDropdown(null)}>
          <Pressable className="flex-1 bg-black/60 justify-end" onPress={() => setActiveDropdown(null)}>
            <View className="bg-[#10161C] rounded-t-2xl p-4 border-t border-[#1C2631] max-h-[50%]">
              <View className="w-10 h-1 bg-[#2C3A4A] rounded-full self-center mb-4" />
              <Text className="text-white font-bold text-lg mb-4 capitalize">
                Select {activeDropdown}
              </Text>
              <ScrollView>
                {FILTER_OPTIONS[activeDropdown].map((opt) => (
                  <Pressable
                    key={opt.value}
                    onPress={() => {
                      setFilters({ ...filters, [activeDropdown]: opt.value });
                      setActiveDropdown(null);
                    }}
                    className={`px-4 py-4 border-b border-[#1C2631] flex-row items-center justify-between ${filters[activeDropdown] === opt.value ? 'bg-[#1A2330]' : ''}`}
                  >
                    <Text className={`text-base ${filters[activeDropdown] === opt.value ? 'text-[#CCF200] font-bold' : 'text-white'}`}>{opt.label}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          </Pressable>
        </Modal>
      )}
    </View>
  );
}
