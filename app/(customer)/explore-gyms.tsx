import React, { useState, useMemo } from 'react';
import {
  View,
  ScrollView,
  Pressable,
  TextInput,
  Image,
  ActivityIndicator,
  Modal,
  Linking,
  Platform,
} from 'react-native';
import { Text } from '@/components/nativewindui/Text';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  MapPin,
  MagnifyingGlass,
  Star,
  CaretDown,
  Faders,
  ArrowRight,
  X,
  Clock,
  CheckCircle,
  CalendarBlank,
} from 'phosphor-react-native';
import { useGyms } from '@/hooks/gyms/useGyms';
import { CustomRefreshControl } from '@/components/CustomRefreshControl';
import { triggerLightHaptic, triggerSelectionHaptic } from '@/lib/haptics';
import { toast } from '@/lib/toast';

// Curated high quality gym showcase images matching Image 2
const GYM_SHOWCASE_PHOTOS = [
  'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=600&auto=format&fit=crop', // Gold Fitness look
  'https://images.unsplash.com/photo-1540497077202-7c8a3999166f?q=80&w=600&auto=format&fit=crop', // Power House cardio/treadmills
  'https://images.unsplash.com/photo-1571902943202-507ec2618e8f?q=80&w=600&auto=format&fit=crop', // Strength & weights
  'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?q=80&w=600&auto=format&fit=crop', // Crossfit & barbell
  'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?q=80&w=600&auto=format&fit=crop', // Training racks
];

const DEFAULT_GYMS = [
  {
    gymId: 'default-1',
    gymName: 'Gold Fitness',
    rating: '4.8',
    reviewCount: 128,
    distance: '0.8 km away',
    address: '100 Feet Rd, Indiranagar',
    city: 'Bengaluru',
    state: 'Karnataka',
    tags: ['CARDIO', 'STRENGTH', 'PERSONAL TRAINING'],
    image: GYM_SHOWCASE_PHOTOS[0],
    latitude: 12.9716,
    longitude: 77.5946,
  },
  {
    gymId: 'default-2',
    gymName: 'Power House',
    rating: '4.6',
    reviewCount: 96,
    distance: '1.2 km away',
    address: '12th Main, Koramangala 4th Block',
    city: 'Bengaluru',
    state: 'Karnataka',
    tags: ['WEIGHT TRAINING', 'CROSSFIT', 'HIIT'],
    image: GYM_SHOWCASE_PHOTOS[1],
    latitude: 12.9352,
    longitude: 77.6245,
  },
  {
    gymId: 'default-3',
    gymName: 'Iron Forge Gym',
    rating: '4.9',
    reviewCount: 214,
    distance: '2.1 km away',
    address: '24th Cross, HSR Layout Sector 2',
    city: 'Bengaluru',
    state: 'Karnataka',
    tags: ['BODYBUILDING', 'POWERLIFTING', 'CARDIO'],
    image: GYM_SHOWCASE_PHOTOS[2],
    latitude: 12.9121,
    longitude: 77.6446,
  },
  {
    gymId: 'default-4',
    gymName: 'Olympus Athletics',
    rating: '4.7',
    reviewCount: 82,
    distance: '3.0 km away',
    address: 'Outer Ring Rd, Bellandur',
    city: 'Bengaluru',
    state: 'Karnataka',
    tags: ['HIIT', 'ZUMBA', 'CROSSFIT'],
    image: GYM_SHOWCASE_PHOTOS[3],
    latitude: 12.9260,
    longitude: 77.6762,
  },
];

const TIME_SLOTS = [
  { id: 'm1', label: '06:00 AM - 07:30 AM', period: 'Morning' },
  { id: 'm2', label: '07:30 AM - 09:00 AM', period: 'Morning' },
  { id: 'm3', label: '09:00 AM - 10:30 AM', period: 'Morning' },
  { id: 'e1', label: '05:00 PM - 06:30 PM', period: 'Evening' },
  { id: 'e2', label: '06:30 PM - 08:00 PM', period: 'Evening' },
  { id: 'e3', label: '08:00 PM - 09:30 PM', period: 'Evening' },
];

export default function ExploreGymsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [searchQuery, setSearchQuery] = useState('');
  const [activeChip, setActiveChip] = useState<'near' | 'rating' | 'filters'>('near');
  const [minRating, setMinRating] = useState<number | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const [bookingModalVisible, setBookingModalVisible] = useState(false);
  const [selectedGym, setSelectedGym] = useState<any>(null);
  const [selectedSlot, setSelectedSlot] = useState<string>('m1');
  const [bookingSuccess, setBookingSuccess] = useState(false);

  const { data: dbGyms = [], isLoading, refetch } = useGyms();

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const combinedGyms = useMemo(() => {
    if (dbGyms && dbGyms.length > 0) {
      const mappedDbGyms = dbGyms.map((g: any, index: number) => {
        const photo = g.logo || GYM_SHOWCASE_PHOTOS[index % GYM_SHOWCASE_PHOTOS.length];
        return {
          gymId: g.gymId,
          gymName: g.gymName || 'Fitness Center',
          rating: (4.5 + ((index * 3) % 5) * 0.1).toFixed(1),
          reviewCount: 60 + ((index * 17) % 150),
          distance: `${(0.8 + index * 0.6).toFixed(1)} km away`,
          address: g.address || `${g.city || 'City'}, ${g.state || 'India'}`,
          city: g.city || 'Bengaluru',
          state: g.state || 'Karnataka',
          tags: index % 2 === 0
            ? ['CARDIO', 'STRENGTH', 'PERSONAL TRAINING']
            : ['WEIGHT TRAINING', 'CROSSFIT', 'HIIT'],
          image: photo,
          latitude: 12.9716,
          longitude: 77.5946,
        };
      });

      const existingNames = new Set(mappedDbGyms.map((g: any) => g.gymName.toLowerCase()));
      const supplementary = DEFAULT_GYMS.filter(
        (dg) => !existingNames.has(dg.gymName.toLowerCase())
      );
      return [...mappedDbGyms, ...supplementary];
    }
    return DEFAULT_GYMS;
  }, [dbGyms]);

  const filteredGyms = useMemo(() => {
    let result = combinedGyms;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (g: any) =>
          g.gymName.toLowerCase().includes(q) ||
          g.city.toLowerCase().includes(q) ||
          g.address.toLowerCase().includes(q) ||
          g.tags.some((t: string) => t.toLowerCase().includes(q))
      );
    }

    if (minRating) {
      result = result.filter((g: any) => parseFloat(g.rating) >= minRating);
    }

    return result;
  }, [combinedGyms, searchQuery, minRating]);

  const handleOpenMap = (gym: any) => {
    triggerLightHaptic();
    const query = encodeURIComponent(`${gym.gymName}, ${gym.address}, ${gym.city}`);
    const url = Platform.select({
      ios: `maps:0,0?q=${query}`,
      android: `geo:0,0?q=${query}`,
      default: `https://www.google.com/maps/search/?api=1&query=${query}`,
    });
    Linking.openURL(url as string).catch(() => {
      Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${query}`);
    });
  };

  const handleOpenBooking = (gym: any) => {
    triggerLightHaptic();
    setSelectedGym(gym);
    setSelectedSlot('m1');
    setBookingSuccess(false);
    setBookingModalVisible(true);
  };

  const handleConfirmBooking = () => {
    triggerSelectionHaptic();
    setBookingSuccess(true);
    toast.success(`Slot booked at ${selectedGym?.gymName}!`);
    setTimeout(() => {
      setBookingModalVisible(false);
      setBookingSuccess(false);
    }, 1200);
  };

  const toggleRatingFilter = () => {
    triggerSelectionHaptic();
    if (!minRating) {
      setMinRating(4.7);
    } else if (minRating === 4.7) {
      setMinRating(4.5);
    } else {
      setMinRating(null);
    }
  };

  return (
    <View className="flex-1 bg-black" style={{ paddingTop: insets.top }}>
      <View className="px-5 pt-3 pb-3 flex-row items-center">
        <Pressable
          onPress={() => {
            triggerLightHaptic();
            router.back();
          }}
          className="w-11 h-11 rounded-full bg-[#161616] border border-[#222222] items-center justify-center mr-3 active:opacity-70"
        >
          <ArrowLeft size={20} color="#FFFFFF" weight="bold" />
        </Pressable>

        <View className="flex-1">
          <Text className="text-white text-2xl font-semibold tracking-tight">Explore Gyms</Text>
          <View className="flex-row items-center gap-1 mt-0.5">
            <MapPin size={13} color="#CCFF00" weight="fill" />
            <Text className="text-[#CCFF00] text-xs font-semibold">{filteredGyms.length} </Text>
            <Text className="text-[#888888] text-xs font-medium">gyms near you</Text>
          </View>
        </View>
      </View>

      <View className="px-5 mb-3">
        <View className="bg-[#121212] border border-[#222222] rounded-2xl flex-row items-center px-4 py-3">
          <MagnifyingGlass size={18} color="#888888" />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search gyms, areas or locations"
            placeholderTextColor="#666666"
            className="flex-1 ml-3 text-white text-sm font-medium"
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => setSearchQuery('')} className="p-1">
              <X size={16} color="#888888" />
            </Pressable>
          )}
        </View>
      </View>

      <View className="mb-3">
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }}
        >
          <Pressable
            onPress={() => {
              triggerSelectionHaptic();
              setActiveChip('near');
            }}
            className={`px-4 py-2.5 rounded-xl flex-row items-center gap-1.5 ${activeChip === 'near'
              ? 'bg-[#CCFF00]'
              : 'bg-[#121212] border border-[#222222]'
              }`}
          >
            <MapPin
              size={14}
              color={activeChip === 'near' ? '#000000' : '#CCFF00'}
              weight="fill"
            />
            <Text
              className={`text-xs font-semibold ${activeChip === 'near' ? 'text-black' : 'text-white'
                }`}
            >
              Near Me
            </Text>
          </Pressable>

          <Pressable
            onPress={toggleRatingFilter}
            className={`px-4 py-2.5 rounded-xl flex-row items-center gap-1.5 ${minRating
              ? 'bg-[#1E2512] border border-[#CCFF00]'
              : 'bg-[#121212] border border-[#222222]'
              }`}
          >
            <Star
              size={14}
              color={minRating ? '#CCFF00' : '#888888'}
              weight={minRating ? 'fill' : 'regular'}
            />
            <Text
              className={`text-xs font-medium ${minRating ? 'text-[#CCFF00] font-semibold' : 'text-white'
                }`}
            >
              {minRating ? `${minRating}+ Rating` : 'Rating'}
            </Text>
            <CaretDown size={12} color={minRating ? '#CCFF00' : '#888888'} />
          </Pressable>

          <Pressable
            onPress={() => {
              triggerSelectionHaptic();
              setActiveChip('filters');
            }}
            className="bg-[#121212] border border-[#222222] px-4 py-2.5 rounded-xl flex-row items-center gap-1.5"
          >
            <Faders size={14} color="#888888" />
            <Text className="text-white text-xs font-medium">Filters</Text>
          </Pressable>
        </ScrollView>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingBottom: insets.bottom + 40,
        }}
        refreshControl={
          <CustomRefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {isLoading && !refreshing ? (
          <View className="py-16 items-center justify-center">
            <ActivityIndicator size="large" color="#CCFF00" />
            <Text className="text-[#888888] text-xs mt-3">Finding gyms near you...</Text>
          </View>
        ) : filteredGyms.length === 0 ? (
          <View className="py-16 items-center justify-center bg-[#121212] border border-[#222222] rounded-3xl p-6 mt-2">
            <MapPin size={42} color="#666666" />
            <Text className="text-white text-base font-semibold mt-3">No Gyms Found</Text>
            <Text className="text-[#888888] text-xs text-center mt-1">
              Try searching with a different keyword or location.
            </Text>
            <Pressable
              onPress={() => {
                setSearchQuery('');
                setMinRating(null);
              }}
              className="mt-4 bg-[#CCFF00] px-4 py-2 rounded-xl"
            >
              <Text className="text-black text-xs font-semibold">Reset Filters</Text>
            </Pressable>
          </View>
        ) : (
          filteredGyms.map((gym: any) => (
            <View
              key={gym.gymId}
              className="bg-[#121212] border border-[#222222] rounded-3xl p-4 mb-4"
            >
              <View className="flex-row gap-3.5 mb-3.5">
                <View className="w-28 h-28 rounded-2xl overflow-hidden bg-[#1E1E22] shrink-0 border border-[#27272A]">
                  <Image
                    source={{ uri: gym.image }}
                    className="w-full h-full"
                    resizeMode="cover"
                  />
                </View>

                <View className="flex-1 justify-between py-0.5">
                  <View>
                    <Text className="text-white text-lg font-semibold" numberOfLines={1}>
                      {gym.gymName}
                    </Text>

                    <View className="flex-row items-center gap-1.5 mt-1">
                      <Star size={13} color="#CCFF00" weight="fill" />
                      <Text className="text-white text-xs font-semibold">{gym.rating}</Text>
                      <Text className="text-[#888888] text-xs">({gym.reviewCount} reviews)</Text>
                    </View>

                    <View className="flex-row items-center gap-1 mt-1">
                      <MapPin size={13} color="#CCFF00" weight="fill" />
                      <Text className="text-[#888888] text-xs font-medium" numberOfLines={1}>
                        {gym.distance}
                      </Text>
                    </View>
                  </View>

                  <View className="flex-row flex-wrap gap-1.5 mt-2">
                    {gym.tags.map((tag: string) => (
                      <View
                        key={tag}
                        className="bg-[#1E1E24] px-2 py-0.5 rounded-md border border-[#27272A]"
                      >
                        <Text className="text-[#A1A1AA] text-[9px] font-semibold tracking-wider uppercase">
                          {tag}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              </View>

              <View className="flex-row gap-2.5">
                <Pressable
                  onPress={() => handleOpenMap(gym)}
                  className="flex-1 border border-[#CCFF00] py-3 rounded-2xl flex-row items-center justify-center gap-1.5 active:opacity-75 bg-transparent"
                >
                  <Text className="text-[#CCFF00] font-semibold text-xs">Map View</Text>
                  <ArrowRight size={13} color="#CCFF00" weight="bold" />
                </Pressable>

                <Pressable
                  onPress={() => handleOpenBooking(gym)}
                  className="flex-1 border border-[#CCFF00] py-3 rounded-2xl flex-row items-center justify-center gap-1.5 active:opacity-75 bg-transparent"
                >
                  <Text className="text-[#CCFF00] font-semibold text-xs">Book Slot</Text>
                  <ArrowRight size={13} color="#CCFF00" weight="bold" />
                </Pressable>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      <Modal
        visible={bookingModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setBookingModalVisible(false)}
      >
        <View className="flex-1 justify-end bg-black/75">
          <View className="bg-[#121212] border-t border-[#222222] rounded-t-3xl p-5 pb-8 max-h-[85%]">
            <View className="flex-row items-center justify-between pb-3.5 border-b border-[#222222] mb-4">
              <View>
                <Text className="text-white text-lg font-semibold">Book Workout Slot</Text>
                <Text className="text-[#888888] text-xs mt-0.5">{selectedGym?.gymName}</Text>
              </View>
              <Pressable
                onPress={() => setBookingModalVisible(false)}
                className="w-8 h-8 rounded-full bg-[#27272A] items-center justify-center active:opacity-70"
              >
                <X size={16} color="#FFFFFF" weight="bold" />
              </Pressable>
            </View>

            {bookingSuccess ? (
              <View className="py-10 items-center justify-center">
                <CheckCircle size={60} color="#CCFF00" weight="fill" />
                <Text className="text-white text-lg font-semibold mt-4">Slot Booked Successfully!</Text>
                <Text className="text-[#888888] text-xs mt-1">See you at {selectedGym?.gymName}.</Text>
              </View>
            ) : (
              <>
                <Text className="text-white text-xs font-semibold uppercase tracking-wider mb-2.5">
                  Select Time Slot (Today)
                </Text>

                <View className="gap-2 mb-5">
                  {TIME_SLOTS.map((slot) => {
                    const isSelected = selectedSlot === slot.id;
                    return (
                      <Pressable
                        key={slot.id}
                        onPress={() => setSelectedSlot(slot.id)}
                        className={`p-3 rounded-2xl flex-row items-center justify-between border ${isSelected
                          ? 'bg-[#1F2B0E] border-[#CCFF00]'
                          : 'bg-[#18181A] border-[#27272A]'
                          }`}
                      >
                        <View className="flex-row items-center gap-2.5">
                          <Clock size={16} color={isSelected ? '#CCFF00' : '#888888'} />
                          <Text
                            className={`text-sm ${isSelected ? 'text-[#CCFF00] font-semibold' : 'text-white font-medium'
                              }`}
                          >
                            {slot.label}
                          </Text>
                        </View>
                        <View className="bg-[#27272A] px-2 py-0.5 rounded-md">
                          <Text className="text-[#888888] text-[10px] font-semibold">{slot.period}</Text>
                        </View>
                      </Pressable>
                    );
                  })}
                </View>

                <Pressable
                  onPress={handleConfirmBooking}
                  className="bg-[#CCFF00] py-3.5 rounded-2xl items-center active:opacity-80"
                >
                  <Text className="text-black font-semibold text-sm">Confirm Booking</Text>
                </Pressable>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}
