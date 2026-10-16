import React, { useState, useMemo, useEffect, useCallback } from 'react';
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
  ArrowRight,
  X,
  Clock,
  CheckCircle,
  CalendarBlank,
  ArrowsClockwise,
  Buildings,
} from 'phosphor-react-native';
import * as Location from 'expo-location';
import { useGyms } from '@/hooks/gyms/useGyms';
import { useUser } from '@/context/UserContext';
import { CustomRefreshControl } from '@/components/CustomRefreshControl';
import { triggerLightHaptic, triggerSelectionHaptic } from '@/lib/haptics';
import { toast } from '@/lib/toast';
import { GeofenceMapViewModal } from '@/components/geofence/GeofenceMapViewModal';
import { getCoordinatesFromPinCode } from '@/helpers/geofence/pincodeGeocoder';
import { calculateHaversineDistance, formatDistance } from '@/helpers/geofence/geofenceAlgorithm';
import {
  calculateShortestPathRoute,
  buildSpatialWaypointGrid,
  findShortestPath,
} from '@/helpers/geofence/pathfinding';

// Curated high quality gym showcase images matching Image 2
const GYM_SHOWCASE_PHOTOS = [
  'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=600&auto=format&fit=crop', // Gold Fitness look
  'https://images.unsplash.com/photo-1540497077202-7c8a3999166f?q=80&w=600&auto=format&fit=crop', // Power House cardio/treadmills
  'https://images.unsplash.com/photo-1571902943202-507ec2618e8f?q=80&w=600&auto=format&fit=crop', // Strength & weights
  'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?q=80&w=600&auto=format&fit=crop', // Crossfit & barbell
  'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?q=80&w=600&auto=format&fit=crop', // Training racks
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

  const { userId } = useUser();
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [activeChip, setActiveChip] = useState<'all' | 'near' | 'rating'>('all');
  const [minRating, setMinRating] = useState<number | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const [page, setPage] = useState(1);
  const limit = 6;

  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [aStarRoutes, setAStarRoutes] = useState<Record<string, { distanceFormatted: string; distanceMeters: number }>>({});

  const [bookingModalVisible, setBookingModalVisible] = useState(false);
  const [selectedGym, setSelectedGym] = useState<any>(null);
  const [selectedSlot, setSelectedSlot] = useState<string>('m1');
  const [bookingSuccess, setBookingSuccess] = useState(false);

  const [mapModalVisible, setMapModalVisible] = useState(false);
  const [mapGym, setMapGym] = useState<any>(null);

  const { data: dbGyms = [], isLoading, refetch } = useGyms();

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 600);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, activeChip, minRating]);

  const fetchLiveLocation = useCallback(async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        if (Platform.OS === 'android') {
          try {
            await Location.enableNetworkProviderAsync();
          } catch {}
        }
        const loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Highest,
          mayShowUserSettingsDialog: true,
        });
        if (loc?.coords) {
          const fresh = {
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
          };
          setUserLocation(fresh);
          return fresh;
        }
      }
    } catch (err) {
      console.warn('[ExploreGyms] Could not obtain user location:', err);
    }
    return null;
  }, []);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      const fresh = await fetchLiveLocation();
      if (isMounted && fresh) {
        setUserLocation(fresh);
      }
    })();
    return () => {
      isMounted = false;
    };
  }, [fetchLiveLocation]);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.allSettled([refetch(), fetchLiveLocation()]);
    setRefreshing(false);
  };

  // Query high-precision A* street route distance matching GeofenceMapViewModal
  useEffect(() => {
    if (!userLocation || !dbGyms || dbGyms.length === 0) return;
    let isCancelled = false;

    dbGyms.forEach(async (g: any) => {
      if (aStarRoutes[g.gymId]) return;
      const gymPin = g.pinCode || '500016';
      const coords = getCoordinatesFromPinCode(gymPin, g.city);
      const lat =
        g.latitude && !isNaN(Number(g.latitude)) && Number(g.latitude) !== 0
          ? Number(g.latitude)
          : coords.latitude;
      const lng =
        g.longitude && !isNaN(Number(g.longitude)) && Number(g.longitude) !== 0
          ? Number(g.longitude)
          : coords.longitude;

      try {
        const route = await calculateShortestPathRoute(
          userLocation,
          { latitude: lat, longitude: lng, name: g.gymName },
          { algorithm: 'a-star' }
        );
        if (!isCancelled && route?.distanceFormatted) {
          setAStarRoutes((prev) => ({
            ...prev,
            [g.gymId]: {
              distanceFormatted: `${route.distanceFormatted} away`,
              distanceMeters: route.totalDistanceMeters,
            },
          }));
        }
      } catch {
        // Instant synchronous A* already provided in parsedGyms
      }
    });

    return () => {
      isCancelled = true;
    };
  }, [userLocation, dbGyms]);

  const parsedGyms = useMemo(() => {
    if (!dbGyms || dbGyms.length === 0) return [];

    return dbGyms.map((g: any, index: number) => {
      const photo = g.logo || GYM_SHOWCASE_PHOTOS[index % GYM_SHOWCASE_PHOTOS.length];
      const gymPin = g.pinCode || '500016';
      const coords = getCoordinatesFromPinCode(gymPin, g.city);

      const latitude = (g.latitude && !isNaN(Number(g.latitude)) && Number(g.latitude) !== 0)
        ? Number(g.latitude)
        : coords.latitude;
      const longitude = (g.longitude && !isNaN(Number(g.longitude)) && Number(g.longitude) !== 0)
        ? Number(g.longitude)
        : coords.longitude;

      let distanceMeters = Infinity;
      let distanceFormatted = 'Calculating...';

      const aStarCached = aStarRoutes[g.gymId];
      if (aStarCached) {
        distanceMeters = aStarCached.distanceMeters;
        distanceFormatted = aStarCached.distanceFormatted;
      } else if (userLocation) {
        try {
          const grid = buildSpatialWaypointGrid(
            { latitude: userLocation.latitude, longitude: userLocation.longitude },
            { latitude, longitude },
            6
          );
          const aStar = findShortestPath(grid, 'start', 'goal', 'a-star', 1.0);
          distanceMeters = aStar.totalDistanceMeters;
          distanceFormatted = `${aStar.distanceFormatted} away`;
        } catch {
          const directDist = Math.round(
            calculateHaversineDistance(
              { latitude: userLocation.latitude, longitude: userLocation.longitude },
              { latitude, longitude }
            )
          );
          distanceMeters = directDist;
          distanceFormatted = `${formatDistance(directDist)} away`;
        }
      }

      return {
        gymId: g.gymId,
        gymName: g.gymName || 'Fitness Center',
        rating: '0',
        reviewCount: 0,
        distance: distanceFormatted,
        distanceMeters,
        address: g.address || `${g.city || 'Hyderabad'}, ${g.state || 'Telangana'}`,
        city: g.city || coords.city || 'Hyderabad',
        state: g.state || coords.state || 'Telangana',
        pinCode: gymPin,
        tags: index % 2 === 0
          ? ['CARDIO', 'STRENGTH', 'PERSONAL TRAINING']
          : ['WEIGHT TRAINING', 'CROSSFIT', 'HIIT'],
        image: photo,
        latitude,
        longitude,
      };
    });
  }, [dbGyms, userLocation, aStarRoutes]);

  const filteredGyms = useMemo(() => {
    let result = [...parsedGyms];

    if (debouncedSearch.trim()) {
      const q = debouncedSearch.toLowerCase().trim();
      result = result.filter(
        (g: any) =>
          g.gymName.toLowerCase().includes(q) ||
          g.city.toLowerCase().includes(q) ||
          g.address.toLowerCase().includes(q) ||
          (g.pinCode && String(g.pinCode).toLowerCase().includes(q)) ||
          g.tags.some((t: string) => t.toLowerCase().includes(q))
      );
    }

    if (minRating) {
      result = result.filter((g: any) => parseFloat(g.rating) >= minRating);
    }

    if (activeChip === 'near') {
      result.sort((a, b) => a.distanceMeters - b.distanceMeters);
    } else if (activeChip === 'rating') {
      result.sort((a, b) => parseFloat(b.rating) - parseFloat(a.rating));
    }

    return result;
  }, [parsedGyms, debouncedSearch, minRating, activeChip]);

  const total = filteredGyms.length;
  const totalPages = Math.ceil(total / limit) || 1;
  const hasMore = page < totalPages;
  const paginatedGyms = useMemo(() => {
    return filteredGyms.slice(0, page * limit);
  }, [filteredGyms, page, limit]);

  const handleOpenMap = async (gym: any) => {
    triggerLightHaptic();
    setMapGym(gym);
    if (!userLocation) {
      const loc = await fetchLiveLocation();
      if (loc) {
        setUserLocation(loc);
      }
    }
    setMapModalVisible(true);
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
      setActiveChip('rating');
    } else if (minRating === 4.7) {
      setMinRating(4.5);
      setActiveChip('rating');
    } else {
      setMinRating(null);
      setActiveChip('all');
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
            <Text className="text-[#888888] text-xs font-medium">gyms available</Text>
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

      {/* Filter Chips: All Gyms before Near Me, Filters chip removed */}
      <View className="mb-3">
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }}
        >
          {/* All Gyms Chip */}
          <Pressable
            onPress={() => {
              triggerSelectionHaptic();
              setActiveChip('all');
            }}
            className={`px-4 py-2.5 rounded-xl flex-row items-center gap-1.5 ${activeChip === 'all'
              ? 'bg-[#CCFF00]'
              : 'bg-[#121212] border border-[#222222]'
              }`}
          >
            <Buildings
              size={14}
              color={activeChip === 'all' ? '#000000' : '#CCFF00'}
              weight={activeChip === 'all' ? 'bold' : 'regular'}
            />
            <Text
              className={`text-xs font-semibold ${activeChip === 'all' ? 'text-black' : 'text-white'
                }`}
            >
              All Gyms
            </Text>
          </Pressable>

          {/* Near Me Chip */}
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

          {/* Rating Chip */}
          <Pressable
            onPress={toggleRatingFilter}
            className={`px-4 py-2.5 rounded-xl flex-row items-center gap-1.5 ${minRating || activeChip === 'rating'
              ? 'bg-[#1E2512] border border-[#CCFF00]'
              : 'bg-[#121212] border border-[#222222]'
              }`}
          >
            <Star
              size={14}
              color={minRating || activeChip === 'rating' ? '#CCFF00' : '#888888'}
              weight={minRating || activeChip === 'rating' ? 'fill' : 'regular'}
            />
            <Text
              className={`text-xs font-medium ${minRating || activeChip === 'rating' ? 'text-[#CCFF00] font-semibold' : 'text-white'
                }`}
            >
              {minRating ? `${minRating}+ Rating` : 'Rating'}
            </Text>
            <CaretDown size={12} color={minRating || activeChip === 'rating' ? '#CCFF00' : '#888888'} />
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
                setActiveChip('all');
              }}
              className="mt-4 bg-[#CCFF00] px-4 py-2 rounded-xl"
            >
              <Text className="text-black text-xs font-semibold">Reset Filters</Text>
            </Pressable>
          </View>
        ) : (
          <>
            {paginatedGyms.map((gym: any) => (
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
                          {gym.distance} • PIN {gym.pinCode}
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
            ))}

            {/* Pagination Footer matching LogsTab.tsx pattern */}
            {hasMore ? (
              <View className="py-4 items-center">
                <Pressable
                  onPress={() => {
                    triggerSelectionHaptic();
                    setPage((p) => p + 1);
                  }}
                  className="flex-row items-center gap-x-2 bg-[#141414] border border-[#2A2A2A] px-5 py-3 rounded-2xl active:opacity-70"
                >
                  <ArrowsClockwise size={16} color="#CCFF00" />
                  <Text className="text-white text-sm font-semibold">Load More Gyms</Text>
                </Pressable>
              </View>
            ) : (
              filteredGyms.length > 0 && (
                <View className="py-6 items-center">
                  <Text className="text-[#666666] text-xs font-sans">You've reached the end of gyms</Text>
                </View>
              )
            )}
          </>
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

      {/* Interactive Geofence Map View & Live WebSocket Location Tracker */}
      {mapModalVisible && mapGym && (
        <GeofenceMapViewModal
          visible={mapModalVisible}
          gym={mapGym}
          userId={userId || undefined}
          initialUserLocation={userLocation}
          onClose={() => {
            setMapModalVisible(false);
            setMapGym(null);
          }}
        />
      )}
    </View>
  );
}
