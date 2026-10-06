import React, { useState } from 'react';
import { View, ScrollView, Pressable, FlatList, TextInput, Modal } from 'react-native';
import { Text } from '@/components/nativewindui/Text';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CaretLeft, Phone, User, Tag, Calendar, ChatCircle, Fire, Snowflake, Clock, MagnifyingGlass, CaretDown, TrendUp, TrendDown, Minus, ShareNetwork, UserPlus, Eye, Pen } from 'phosphor-react-native';
import { router } from 'expo-router';

const mockData = [
  { id: "01", name: "Rahul Sharma", phone: "9876543210", interestedIn: "Gym Membership", addedVia: "Social Media", source: "Instagram", enquiryCategory: "Hot", followUpDate: "22 Sep 2026", status: "New" },
  { id: "02", name: "Sneha Patel", phone: "9876543211", interestedIn: "Personal Training", addedVia: "Owner Added", source: "Owner Added", enquiryCategory: "Warm", followUpDate: "23 Sep 2026", status: "Follow-up" },
  { id: "03", name: "Amit Kumar", phone: "9876543212", interestedIn: "Gym Membership", addedVia: "Social Media", source: "Google", enquiryCategory: "Cold", followUpDate: "25 Sep 2026", status: "New" },
  { id: "04", name: "Neha Kapoor", phone: "9876543213", interestedIn: "Group Class", addedVia: "Social Media", source: "Facebook", enquiryCategory: "Warm", followUpDate: "21 Sep 2026", status: "Follow-up" },
  { id: "05", name: "Vikram Singh", phone: "9876543214", interestedIn: "Gym Membership", addedVia: "Owner Added", source: "Walk-in", enquiryCategory: "Hot", followUpDate: "20 Sep 2026", status: "In Progress" },
  { id: "06", name: "Priya Nair", phone: "9876543215", interestedIn: "Personal Training", addedVia: "Social Media", source: "Instagram", enquiryCategory: "Warm", followUpDate: "24 Sep 2026", status: "New" },
  { id: "07", name: "Karan Mehta", phone: "9876543216", interestedIn: "Gym Membership", addedVia: "Owner Added", source: "Owner Added", enquiryCategory: "Cold", followUpDate: "26 Sep 2026", status: "Follow-up" },
  { id: "08", name: "Ananya Reddy", phone: "9876543217", interestedIn: "Other", addedVia: "Social Media", source: "Referral", enquiryCategory: "Other", followUpDate: "28 Sep 2026", status: "New" },
  { id: "09", name: "Rohit Verma", phone: "9876543218", interestedIn: "Group Class", addedVia: "Social Media", source: "Google", enquiryCategory: "Warm", followUpDate: "22 Sep 2026", status: "In Progress" },
  { id: "10", name: "Pooja Desai", phone: "9876543219", interestedIn: "Gym Membership", addedVia: "Owner Added", source: "Owner Added", enquiryCategory: "Hot", followUpDate: "23 Sep 2026", status: "New" }
];

const METRICS = [
  { id: 'total', title: "Total Enquiries", value: 48, trend: "up", trendValue: "12%", trendLabel: "vs last month", icon: ChatCircle, iconBg: "#063327", iconColor: "#22C55E" },
  { id: 'hot', title: "Hot Enquiries", value: 12, trend: "up", trendValue: "3", trendLabel: "this week", icon: Fire, iconBg: "#38161A", iconColor: "#EF4444" },
  { id: 'warm', title: "Warm Enquiries", value: 18, trend: "up", trendValue: "5", trendLabel: "this week", icon: User, iconBg: "#332211", iconColor: "#F59E0B" },
  { id: 'cold', title: "Cold Enquiries", value: 10, trend: "none", trendValue: "No change", trendLabel: "", icon: Snowflake, iconBg: "#0C2D3A", iconColor: "#38BDF8" },
  { id: 'converted', title: "Total converted", value: 8, trend: "up", trendValue: "5", trendLabel: "this week", icon: Clock, iconBg: "#27173B", iconColor: "#A855F7", isLink: true }
];

const FILTER_OPTIONS = {
  category: ["All Categories", "Hot", "Warm", "Cold"],
  source: ["All Sources", "Instagram", "Google", "Facebook", "Owner Added"],
  status: ["All Statuses", "New", "Follow-up", "In Progress"],
  date: ["All Time", "Today", "This Week", "This Month"]
};

const getCategoryColor = (category: string) => {
  switch (category) {
    case 'Hot': return { bg: '#321317', text: '#EF4444' };
    case 'Warm': return { bg: '#2E2012', text: '#F59E0B' };
    case 'Cold': return { bg: '#0C2433', text: '#0EA5E9' };
    default: return { bg: '#1C2631', text: '#94A3B8' };
  }
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'New': return { bg: '#0B2545', text: '#38BDF8' };
    case 'Follow-up': return { bg: '#33240F', text: '#F59E0B' };
    case 'In Progress': return { bg: '#2C103D', text: '#C084FC' };
    case 'Converted': return { bg: '#082E20', text: '#10B981' };
    default: return { bg: '#1C2631', text: '#94A3B8' };
  }
};

const EnquiryCard = ({ item }: { item: typeof mockData[0] }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const catColor = getCategoryColor(item.enquiryCategory);
  const statColor = getStatusColor(item.status);

  return (
    <Pressable 
      onPress={() => setIsExpanded(!isExpanded)}
      className="bg-[#10161C] border border-[#1C2631] rounded-xl p-4 mb-3"
    >
      <View className="flex-row justify-between items-start mb-3">
        <View className="flex-row items-start gap-3">
          <View className="bg-[#1A2330] px-2 py-1 rounded">
            <Text className="text-[#5A697A] text-[10px] font-bold">#{item.id}</Text>
          </View>
          <View>
            <Text className="text-white font-semibold text-lg">{item.name}</Text>
            <View className="flex-row items-center gap-1 mt-1">
              <Phone size={12} color="#5A697A" />
              <Text className="text-[#A8B7C7] text-xs">{item.phone}</Text>
            </View>
          </View>
        </View>
        <View style={{ backgroundColor: statColor.bg }} className="px-2 py-1 rounded-full">
          <Text style={{ color: statColor.text }} className="text-[10px] font-bold uppercase">{item.status}</Text>
        </View>
      </View>

      <View className="flex-row flex-wrap gap-2 mb-4">
        <View className="flex-row items-center gap-1 bg-[#1A1A1A] px-2 py-1 rounded border border-[#2A2A2A]">
          <Tag size={12} color="#888888" />
          <Text className="text-gray-400 text-xs">{item.interestedIn}</Text>
        </View>
        <View style={{ backgroundColor: catColor.bg }} className="px-2 py-1 rounded">
          <Text style={{ color: catColor.text }} className="text-[10px] font-bold uppercase">{item.enquiryCategory}</Text>
        </View>
      </View>

      <View className="flex-row justify-between mb-2">
        <View className="flex-1">
          <Text className="text-[#5A697A] text-[9px] uppercase font-bold mb-1.5 tracking-wider">Added Via</Text>
          <View className="flex-row items-center gap-1">
            {item.addedVia === 'Social Media' ? <ShareNetwork size={12} color="#22C55E"/> : <UserPlus size={12} color="#F97316"/>}
            <Text className={`text-xs font-semibold ${item.addedVia === 'Social Media' ? 'text-[#22C55E]' : 'text-[#F97316]'}`}>{item.addedVia}</Text>
          </View>
        </View>
        <View className="flex-1">
          <Text className="text-[#5A697A] text-[9px] uppercase font-bold mb-1.5 tracking-wider">Source</Text>
          <View className="flex-row items-center gap-1">
            <User size={12} color="#888888" />
            <Text className="text-gray-400 text-xs font-semibold">{item.source}</Text>
          </View>
        </View>
        <View className="flex-1">
          <Text className="text-[#5A697A] text-[9px] uppercase font-bold mb-1.5 tracking-wider">Follow-up</Text>
          {item.followUpDate ? (
            <View className="flex-row items-center gap-1">
              <Calendar size={12} color="#A8B7C7" />
              <Text className="text-[#A8B7C7] text-xs font-semibold">{item.followUpDate}</Text>
            </View>
          ) : (
            <Text className="text-[#5A697A] text-xs font-semibold">None</Text>
          )}
        </View>
      </View>

      {isExpanded && (
        <View className="border-t border-[#1C2631] pt-4 mt-2">
          <View className="flex-row items-center gap-3">
            <Pressable onPress={() => router.push('/(owner)/dashboard/enquiries/view')} className="flex-1 bg-[#1A2330] border border-[#2B3648] rounded-lg py-2.5 items-center flex-row justify-center gap-2 active:opacity-75">
               <Eye size={16} color="#A8B7C7" />
               <Text className="text-[#A8B7C7] font-bold text-xs">View Details</Text>
            </Pressable>
            <Pressable onPress={() => router.push('/(owner)/dashboard/enquiries/add')} className="flex-1 bg-[#CCF200] rounded-lg py-2.5 items-center flex-row justify-center gap-2 active:opacity-75 shadow-sm">
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
  
  const [filters, setFilters] = useState({
    category: "All Categories",
    source: "All Sources",
    status: "All Statuses",
    date: "All Time"
  });

  const [activeDropdown, setActiveDropdown] = useState<keyof typeof FILTER_OPTIONS | null>(null);

  const filteredData = mockData.filter((item) => {
    if (search && !item.name.toLowerCase().includes(search.toLowerCase()) && !item.phone.includes(search)) return false;
    if (filters.category !== "All Categories" && item.enquiryCategory !== filters.category) return false;
    if (filters.source !== "All Sources" && item.source !== filters.source) return false;
    if (filters.status !== "All Statuses" && item.status !== filters.status) return false;
    return true;
  });

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
                  
                  <View className="flex-row items-center gap-1">
                    {metric.trend === 'up' && <TrendUp size={12} color="#22C55E" weight="bold" />}
                    {metric.trend === 'down' && <TrendDown size={12} color="#EF4444" weight="bold" />}
                    {metric.trend === 'none' && <Minus size={12} color="#94A3B8" weight="bold" />}
                    
                    <Text className={`text-[10px] font-medium ${metric.trend === 'up' ? 'text-[#22C55E]' : metric.trend === 'down' ? 'text-[#EF4444]' : 'text-[#94A3B8]'}`}>
                      {metric.trendValue}
                    </Text>
                    {metric.trendLabel ? (
                      <Text className="text-[10px] text-[#5A697A] ml-1">{metric.trendLabel}</Text>
                    ) : null}
                  </View>
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

        {/* Dropdown Filters (Horizontal Scroll) */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-2">
          <View className="flex-row gap-2">
            {(Object.keys(FILTER_OPTIONS) as Array<keyof typeof FILTER_OPTIONS>).map((key) => (
              <View key={key} className="flex-col gap-1">
                <Text className="text-[9px] text-[#667688] font-bold uppercase tracking-wider px-1">
                  {key === 'date' ? 'Follow-Up Date' : key}
                </Text>
                <Pressable
                  onPress={() => setActiveDropdown(key)}
                  className="flex-row items-center justify-between px-3 h-[38px] min-w-[120px] bg-[#10161C] border border-[#1C2631] rounded-lg active:bg-[#1A2330]"
                >
                  <Text className="text-white text-xs">{filters[key]}</Text>
                  <CaretDown size={12} color="#5A697A" />
                </Pressable>
              </View>
            ))}
          </View>
        </ScrollView>
      </View>

      <View className="flex-1 px-4">
        {filteredData.length === 0 ? (
          <View className="flex-1 items-center justify-center mb-20">
            <Text className="text-gray-500">No enquiries match your filters.</Text>
          </View>
        ) : (
          <FlatList
            data={filteredData}
            keyExtractor={(item) => item.id}
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
                Select {activeDropdown === 'date' ? 'Follow-Up Date' : activeDropdown}
              </Text>
              <ScrollView>
                {FILTER_OPTIONS[activeDropdown].map((opt) => (
                  <Pressable
                    key={opt}
                    onPress={() => {
                      setFilters({ ...filters, [activeDropdown]: opt });
                      setActiveDropdown(null);
                    }}
                    className={`px-4 py-4 border-b border-[#1C2631] flex-row items-center justify-between ${filters[activeDropdown] === opt ? 'bg-[#1A2330]' : ''}`}
                  >
                    <Text className={`text-base ${filters[activeDropdown] === opt ? 'text-[#CCF200] font-bold' : 'text-white'}`}>{opt}</Text>
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
