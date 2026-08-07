import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase, supabaseAdminAuth } from '@/lib/supabase';
import { View, ScrollView, Pressable, TextInput, Image, Modal, FlatList, Alert, ActivityIndicator, Clipboard, Share, Linking } from 'react-native';
import { Text } from '@/components/nativewindui/Text';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
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
  CheckCircle,
  WarningCircle,
  ClipboardText,
  ShareNetwork,
  EnvelopeSimple,
  Copy,
  QrCode,
} from 'phosphor-react-native';
import QRCodeSvg from 'react-native-qrcode-svg';
import * as ImagePicker from 'expo-image-picker';
import * as Crypto from 'expo-crypto';
import { State } from 'country-state-city';
import * as FileSystem from 'expo-file-system/legacy';
import { useUser } from '@/context/UserContext';
import { createUser, updateUser } from '@/helpers/otpHelper';
import { saveGym, uploadGymLogo, fetchGyms, uploadGymQR, fetchGymById } from '@/helpers/gym/gymHelper';
import { saveGymOwner, fetchGymOwners } from '@/helpers/gymOwners/gymOwnersHelper';
import { fetchGymCustomers } from '@/helpers/customers/customerHelper';
import { fetchTrainers } from '@/helpers/trainers/trainerHelper';
import { toast } from '@/lib/toast';

export default function RegisterGymScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ openForm?: string; editGymId?: string }>();
  const { userId: currentUserId } = useUser();

  const [viewMode, setViewMode] = useState<'list' | 'form' | 'success'>('list');
  const [saving, setSaving] = useState(false);
  const [gyms, setGyms] = useState<any[]>([]);
  const [loadingGyms, setLoadingGyms] = useState(false);
  const [temporaryPassword, setTemporaryPassword] = useState('');

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
  const [website, setWebsite] = useState('');
  const [notes, setNotes] = useState('');

  const [logoUri, setLogoUri] = useState<string | null>(null);
  const [stateModalVisible, setStateModalVisible] = useState(false);
  const [stateSearchQuery, setStateSearchQuery] = useState('');
  const [yearModalVisible, setYearModalVisible] = useState(false);
  const [createdGymId, setCreatedGymId] = useState<string | null>(null);

  const [qrCodeId, setQrCodeId] = useState<string | null>(null);
  const qrRef = useRef<any>(null);

  const [editingGymId, setEditingGymId] = useState<string | null>(null);
  const [editingGymOwnerId, setEditingGymOwnerId] = useState<string | null>(null);
  const [editingOwnerUserId, setEditingOwnerUserId] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      // Do nothing on focus
      return () => {
        // When screen loses focus (e.g., tab changed), reset the form
        clearForm();
        setViewMode('list');
      };
    }, [])
  );

  const indianStates = State.getStatesOfCountry('IN');

  const loadGymsData = async () => {
    setLoadingGyms(true);
    try {
      const fetchedGyms = await fetchGyms();
      const fetchedOwners = await fetchGymOwners();
      const allTrainers = await fetchTrainers();
      const allCustomers = await fetchGymCustomers();

      const mapped = fetchedGyms.map((g: any) => {
        const owner = fetchedOwners.find((o: any) => o.gymId === g.gymId);
        const gymTrainersCount = allTrainers.filter((t: any) => t.gymId === g.gymId).length;
        const gymCustomersCount = allCustomers.filter((c: any) => c.gymId === g.gymId).length;

        return {
          id: g.gymId,
          name: g.gymName,
          owner: owner ? owner.ownerFullname : 'Unknown Owner',
          location: `${g.city}, ${g.state}`,
          registeredDate: new Date(g.createdAt).toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
          }),
          status: g.isActive ? 'ACTIVE' : 'INACTIVE',
          members: gymTrainersCount + gymCustomersCount,
          trainers: gymTrainersCount,
          logo: g.logo,
        };
      });
      setGyms(mapped);
    } catch (err: any) {
      console.error('Error loading gyms list:', err);
    } finally {
      setLoadingGyms(false);
    }
  };

  useEffect(() => {
    loadGymsData();
  }, []);

  useEffect(() => {
    const fetchEditData = async () => {
      if (params.editGymId) {
        setSaving(true);
        try {
          const gymDetails = await fetchGymById(params.editGymId);
          if (gymDetails) {
            setGymName(gymDetails.gymName);
            setGymEmail(gymDetails.gymEmail);

            if (gymDetails.phone.startsWith('+91')) {
              setPhoneCode('+91');
              setPhoneNumber(gymDetails.phone.slice(3));
            } else {
              setPhoneNumber(gymDetails.phone);
            }

            if (gymDetails.alternatePhone) {
              if (gymDetails.alternatePhone.startsWith('+91')) {
                setAltPhoneCode('+91');
                setAltPhoneNumber(gymDetails.alternatePhone.slice(3));
              } else {
                setAltPhoneNumber(gymDetails.alternatePhone);
              }
            }

            setAddress(gymDetails.address);
            setCity(gymDetails.city);
            setStateName(gymDetails.state);
            setPinCode(gymDetails.pinCode);
            setBranches(gymDetails.noOfBranches ? gymDetails.noOfBranches.toString() : '');
            setEstablishedYear(gymDetails.establishYear || '');
            setWebsite(gymDetails.website || '');
            setNotes(gymDetails.notes || '');
            setLogoUri(gymDetails.logo || null);
            setQrCodeId(params.editGymId); // Set something so QR renders

            const allOwners = await fetchGymOwners(params.editGymId);
            const owner = allOwners[0];
            if (owner) {
              setEditingOwnerUserId(owner.userId);
              setEditingGymOwnerId(owner.gymOwnerId);
              setOwnerName(owner.ownerFullname);
              setOwnerEmail(owner.ownerEmail);

              if (owner.ownerPhone.startsWith('+91')) {
                setOwnerPhoneCode('+91');
                setOwnerPhone(owner.ownerPhone.slice(3));
              } else {
                setOwnerPhone(owner.ownerPhone);
              }

              if (owner.ownerAlternatePhone) {
                if (owner.ownerAlternatePhone.startsWith('+91')) {
                  setOwnerAltPhoneCode('+91');
                  setOwnerAltPhone(owner.ownerAlternatePhone.slice(3));
                } else {
                  setOwnerAltPhone(owner.ownerAlternatePhone);
                }
              }
            }

            setEditingGymId(params.editGymId);
            setViewMode('form');
          }
        } catch (e) {
          console.error(e);
        } finally {
          setSaving(false);
        }
      }
    };
    fetchEditData();
  }, [params.editGymId]);

  const clearForm = () => {
    setGymName('');
    setGymEmail('');
    setPhoneNumber('');
    setAltPhoneNumber('');
    setAddress('');
    setCity('');
    setStateName('Telangana');
    setPinCode('');
    setOwnerName('');
    setOwnerEmail('');
    setOwnerPhone('');
    setOwnerAltPhone('');
    setBranches('');
    setEstablishedYear('');
    setWebsite('');
    setNotes('');
    setLogoUri(null);
    setCreatedGymId(null);
    setQrCodeId(null);
  };

  const handleGenerateQR = () => {
    if (saving || editingGymId) return;
    const newId = Crypto.randomUUID();
    setQrCodeId(newId);
  };

  const handleCreateGym = async () => {
    if (!logoUri) {
      toast.error('Please upload a gym logo.');
      return;
    }
    if (!gymName.trim()) {
      toast.error('Please enter a gym name.');
      return;
    }
    if (!gymEmail.trim()) {
      toast.error('Please enter a gym email.');
      return;
    }
    if (!phoneNumber.trim()) {
      toast.error('Please enter a gym phone number.');
      return;
    }
    if (!address.trim()) {
      toast.error('Please enter a gym address.');
      return;
    }
    if (!city.trim()) {
      toast.error('Please enter a gym city.');
      return;
    }
    if (!pinCode.trim()) {
      toast.error('Please enter a gym PIN code.');
      return;
    }
    if (!ownerName.trim()) {
      toast.error("Please enter the owner's full name.");
      return;
    }
    if (!ownerEmail.trim()) {
      toast.error("Please enter the owner's email address.");
      return;
    }
    if (!ownerPhone.trim()) {
      toast.error("Please enter the owner's phone number.");
      return;
    }

    setSaving(true);
    try {
      const getQRBase64 = (): Promise<string | null> => {
        return new Promise((resolve) => {
          if (qrRef.current) {
            qrRef.current.toDataURL((data: string) => resolve(data));
          } else {
            resolve(null);
          }
        });
      };

      const uuid = Crypto.randomUUID();
      let finalLogoUrl = logoUri;
      if (logoUri && (logoUri.startsWith('file:') || logoUri.startsWith('/') || logoUri.startsWith('content:'))) {
        const uploadedUrl = await uploadGymLogo(logoUri);
        if (uploadedUrl) {
          finalLogoUrl = uploadedUrl;
        }
      }

      const ownerPhoneNum = ownerPhoneCode + ownerPhone;
      let authUserId = editingOwnerUserId;

      if (!editingGymId) {
        const uuid = Crypto.randomUUID();
        const tempPassword = `TK-${uuid.substring(0, 5).toUpperCase()}-${uuid.substring(9, 10).toUpperCase()}`;
        setTemporaryPassword(tempPassword);

        const { data: authData, error: authError } = await supabaseAdminAuth.auth.signUp({
          email: ownerEmail.trim().toLowerCase(),
          password: tempPassword,
          options: {
            data: {
              name: ownerName.trim(),
              phone: ownerPhoneNum,
              role: 'owner',
            },
          },
        });

        if (authError) {
          throw authError;
        }

        authUserId = authData?.user?.id || null;
        if (!authUserId) {
          throw new Error('Supabase Auth did not return a valid user ID.');
        }

        const ownerUser = await createUser({
          userId: authUserId,
          name: ownerName.trim(),
          email: ownerEmail.trim().toLowerCase(),
          phone: ownerPhoneNum,
          address: address.trim(),
          role: 'owner',
        });

        if (!ownerUser || !ownerUser.userId) {
          throw new Error('Failed to create gym owner user account.');
        }
      } else {
        if (authUserId) {
          await updateUser(authUserId, {
            name: ownerName.trim(),
            phone: ownerPhoneNum,
            address: address.trim(),
          });
        }
      }

      let finalQrPath: string | null | undefined = editingGymId ? undefined : null;
      if (!editingGymId && qrCodeId) {
        const qrBase64 = await getQRBase64();
        if (qrBase64) {
          finalQrPath = await uploadGymQR(qrBase64, qrCodeId);
        }
      }

      const gymPhoneNum = phoneCode + phoneNumber;
      const gymAltPhoneNum = altPhoneNumber ? (altPhoneCode + altPhoneNumber) : null;
      const payload = {
        gymId: editingGymId || undefined,
        gymName: gymName.trim(),
        gymEmail: gymEmail.trim().toLowerCase(),
        phone: gymPhoneNum,
        alternatePhone: gymAltPhoneNum,
        address: address.trim(),
        city: city.trim(),
        state: stateName,
        pinCode: pinCode.trim(),
        noOfBranches: branches ? parseInt(branches, 10) : null,
        establishYear: establishedYear || null,
        website: website.trim() || null,
        notes: notes.trim() || null,
        logo: finalLogoUrl,
        qrPath: finalQrPath,
        isActive: true,
        createdBy: currentUserId || '',
      };

      const createdGym = await saveGym(payload);

      if (!createdGym || !createdGym.gymId) {
        throw new Error(editingGymId ? 'Failed to update gym organization entry.' : 'Failed to create gym organization entry.');
      }

      const ownerAltPhoneNum = ownerAltPhone ? (ownerAltPhoneCode + ownerAltPhone) : null;
      const createdOwnerLink = await saveGymOwner({
        gymOwnerId: editingGymOwnerId || undefined,
        userId: authUserId as string,
        gymId: createdGym.gymId,
        ownerFullname: ownerName.trim(),
        ownerEmail: ownerEmail.trim().toLowerCase(),
        ownerPhone: ownerPhoneNum,
        ownerAlternatePhone: ownerAltPhoneNum,
        isActive: true,
        createdBy: currentUserId || '',
      });

      if (!createdOwnerLink) {
        throw new Error('Failed to associate owner user with the gym.');
      }

      toast.success('Gym and Gym Owner registered successfully!');
      setCreatedGymId(createdGym.gymId);
      setViewMode('success');
      await loadGymsData();
    } catch (error: any) {
      console.error('[register.tsx] handleCreateGym: Error caught:', error);
      toast.error(error?.message || 'An unexpected error occurred during gym registration.');
    } finally {
      setSaving(false);
    }
  };

  const handleCopyCredentials = () => {
    const credText = `Email: ${ownerEmail.trim().toLowerCase()}\nPassword: ${temporaryPassword}`;
    Clipboard.setString(credText);
    toast.success('Credentials copied to clipboard!');
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Gym Owner Credentials:\nEmail: ${ownerEmail.trim().toLowerCase()}\nPassword: ${temporaryPassword}`,
      });
    } catch (err: any) {
      console.error('Error sharing credentials:', err);
    }
  };

  const handleEmail = () => {
    const subject = encodeURIComponent('Your Gym Owner Credentials');
    const body = encodeURIComponent(
      `Hello ${ownerName},\n\nYour gym "${gymName}" has been registered successfully.\n\nHere are your temporary login credentials:\n\nEmail: ${ownerEmail.trim().toLowerCase()}\nTemporary Password: ${temporaryPassword}\n\nYou will be prompted to change this password on your first login.\n\nBest regards,\nPlatform Administration`
    );
    Linking.openURL(`mailto:${ownerEmail}?subject=${subject}&body=${body}`).catch((err) => {
      toast.error('Could not open email application.');
      console.error('Error opening email client:', err);
    });
  };

  const handleViewGymDetails = () => {
    const id = createdGymId;
    clearForm();
    if (id) {
      router.push(`/(superadmin)/dashboard/gym/${id}` as any);
    } else {
      setViewMode('list');
    }
  };

  const handleBackToGyms = () => {
    clearForm();
    router.replace('/(superadmin)/gyms');
  };

  const pickImage = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        toast.error('Permission to access photos is needed to upload a gym logo.');
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
          toast.error('Please select an image smaller than 2MB.');
          return;
        }

        setLogoUri(asset.uri);
      }
    } catch (error: any) {
      toast.error(`Something went wrong while picking the image: ${error?.message || error}`);
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

  const filteredGyms = gyms.filter((gym) => {
    const matchesSearch =
      gym.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      gym.owner.toLowerCase().includes(searchQuery.toLowerCase()) ||
      gym.location.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesFilter =
      selectedFilter === 'all' ||
      (selectedFilter === 'active' && gym.status === 'ACTIVE') ||
      (selectedFilter === 'inactive' && gym.status === 'INACTIVE');

    return matchesSearch && matchesFilter;
  });

  return (
    <View className="flex-1 bg-[#0A0A0A]">
      {viewMode === 'list' && (
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
                className="flex-1 text-white text-sm py-0 font-sans"
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
              Total Gyms: <Text className="text-[#CCFF00] font-semibold">{gyms.length}</Text>
            </Text>

            <Pressable className="flex-row items-center gap-1">
              <Text className="text-xs text-[#888888]">Sort by: </Text>
              <Text className="text-xs text-white font-semibold">Newest First</Text>
              <CaretDown size={12} color="#FFFFFF" />
            </Pressable>
          </View>

          {loadingGyms ? (
            <View className="py-12 items-center justify-center">
              <ActivityIndicator size="large" color="#CCFF00" />
            </View>
          ) : filteredGyms.length === 0 ? (
            <View className="py-12 items-center justify-center">
              <Text className="text-[#888888] text-sm">No gyms registered yet.</Text>
            </View>
          ) : (
            filteredGyms.map((gym) => (
              <Pressable
                key={gym.id}
                onPress={() => router.push(`/(superadmin)/dashboard/gym/${gym.id}` as any)}
                className="bg-[#0F0F0F] border border-[#1F293D] rounded-2xl p-4 mb-3">
                <View className="flex-row items-start justify-between">
                  <View className="flex-row items-start gap-3 flex-1 pr-2">
                    {gym.logo ? (
                      <Image source={{ uri: gym.logo }} className="w-14 h-14 rounded-xl bg-[#111622] border border-[#1F293D]" resizeMode="cover" />
                    ) : (
                      <View className="w-14 h-14 rounded-xl bg-[#111622] border border-[#1F293D] items-center justify-center">
                        <Text className="text-[#888888] text-xs font-semibold">LOGO</Text>
                      </View>
                    )}
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

                  <View className={`px-2.5 py-1 rounded-full flex-row items-center gap-1.5 ${gym.status === 'ACTIVE'
                    ? 'bg-[#064E3B]/40 border border-[#059669]/30'
                    : 'bg-red-500/10 border border-red-500/20'
                    }`}>
                    <View className={`w-1.5 h-1.5 rounded-full ${gym.status === 'ACTIVE' ? 'bg-[#10B981]' : 'bg-red-500'}`} />
                    <Text className={`text-[10px] font-semibold tracking-wider ${gym.status === 'ACTIVE' ? 'text-[#10B981]' : 'text-red-500'}`}>
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

                    {/* <View>
                      <Text className="text-[#888888] text-[10px] font-semibold tracking-wider mb-0.5">
                        DOCTORS
                      </Text>
                      <Text className="text-white text-lg font-semibold">{gym.doctors}</Text>
                    </View> */}
                  </View>

                  <CaretRight size={18} color="#888888" />
                </View>
              </Pressable>
            ))
          )}
        </ScrollView>
      )}

      {viewMode === 'form' && (
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 20, paddingBottom: 120 }}
          showsVerticalScrollIndicator={false}>
          <View className="flex-row items-center gap-3 mb-6">
            <Pressable
              onPress={() => !saving && setViewMode('list')}
              disabled={saving}
              className={`w-9 h-9 rounded-full bg-[#111622] border border-[#1F293D] items-center justify-center active:opacity-70 ${saving ? 'opacity-50' : ''}`}>
              <ArrowLeft size={18} color="#FFFFFF" />
            </Pressable>
            <View className="flex-1">
              <Text className="text-xl font-semibold text-white">{editingGymId ? 'Edit Gym' : 'Register New Gym'}</Text>
              <Text className="text-xs text-[#888888] mt-0.5">
                {editingGymId ? 'Update the gym organization details.' : 'Add a new gym organization to the platform.'}
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
                onPress={() => !saving && setLogoUri(null)}
                disabled={saving}
                className={`absolute top-3 right-3 p-1.5 bg-[#1F293D] rounded-full active:opacity-75 z-10 ${saving ? 'opacity-50' : ''}`}
                hitSlop={8}
              >
                <X size={14} color="#FFFFFF" />
              </Pressable>
              <Pressable onPress={() => !saving && pickImage()} disabled={saving} className="items-center justify-center active:opacity-90">
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
              onPress={() => !saving && pickImage()}
              disabled={saving}
              className={`border border-dashed border-[#1F293D] bg-[#0F0F0F] rounded-2xl p-6 items-center justify-center mb-4 active:opacity-90 overflow-hidden ${saving ? 'opacity-50' : ''}`}
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
            editable={!saving}
            autoComplete="off"
            autoCorrect={false}
            placeholder="Enter gym name"
            placeholderTextColor="#6B7280"
            className={`bg-[#0F0F0F] border border-[#1F293D] rounded-xl p-3.5 text-white text-sm mb-4 font-sans ${!saving ? '' : 'opacity-60'}`}
          />

          <Text className="text-xs text-[#888888] mb-1.5">Gym Email <Text className='text-red-500 text-sm'>*</Text></Text>
          <TextInput
            value={gymEmail}
            onChangeText={setGymEmail}
            editable={!saving && !editingGymId}
            autoComplete="off"
            autoCorrect={false}
            placeholder="info@powerhousegym.com"
            placeholderTextColor="#6B7280"
            keyboardType="email-address"
            className={`bg-[#0F0F0F] border border-[#1F293D] rounded-xl p-3.5 text-white text-sm mb-4 font-sans ${!saving ? '' : 'opacity-60'}`}
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
              editable={!saving}
              autoComplete="off"
              autoCorrect={false}
              placeholder="Enter phone number"
              placeholderTextColor="#6B7280"
              keyboardType="phone-pad"
              maxLength={10}
              className={`flex-1 bg-[#0F0F0F] border border-[#1F293D] rounded-xl p-3.5 text-white text-sm font-sans ${!saving ? '' : 'opacity-60'}`}
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
              editable={!saving}
              autoComplete="off"
              autoCorrect={false}
              placeholder="Enter alternate phone number"
              placeholderTextColor="#6B7280"
              keyboardType="phone-pad"
              maxLength={10}
              className={`flex-1 bg-[#0F0F0F] border border-[#1F293D] rounded-xl p-3.5 text-white text-sm font-sans ${!saving ? '' : 'opacity-60'}`}
            />
          </View>

          <Text className="text-xs text-[#888888] mb-1.5">Address <Text className='text-red-500 text-sm'>*</Text></Text>
          <TextInput
            value={address}
            onChangeText={setAddress}
            editable={!saving}
            autoComplete="off"
            autoCorrect={false}
            placeholder="Plot No. 45, Begumpet road, Ameerpet"
            placeholderTextColor="#6B7280"
            className={`bg-[#0F0F0F] border border-[#1F293D] rounded-xl p-3.5 text-white text-sm mb-4 font-sans ${!saving ? '' : 'opacity-60'}`}
          />

          <View className="flex-row items-center gap-2 mb-4">
            <View className="flex-1">
              <Text className="text-xs text-[#888888] mb-1.5">City <Text className='text-red-500 text-sm'>*</Text></Text>
              <TextInput
                value={city}
                onChangeText={setCity}
                editable={!saving}
                autoComplete="off"
                autoCorrect={false}
                placeholder="Hyderabad"
                placeholderTextColor="#6B7280"
                className={`bg-[#0F0F0F] border border-[#1F293D] rounded-xl p-3.5 text-white text-sm font-sans ${!saving ? '' : 'opacity-60'}`}
              />
            </View>

            <Pressable
              onPress={() => {
                if (!saving) {
                  setStateSearchQuery('');
                  setStateModalVisible(true);
                }
              }}
              disabled={saving}
              className="flex-1"
            >
              <Text className="text-xs text-[#888888] mb-1.5">State <Text className='text-red-500 text-sm'>*</Text></Text>
              <View className={`bg-[#0F0F0F] border border-[#1F293D] rounded-xl p-3.5 flex-row items-center justify-between ${!saving ? '' : 'opacity-60'}`}>
                <Text className="text-white text-sm">{stateName || 'Select State'}</Text>
                <CaretDown size={12} color="#888888" />
              </View>
            </Pressable>

            <View className="flex-1">
              <Text className="text-xs text-[#888888] mb-1.5">PIN Code <Text className='text-red-500 text-sm'>*</Text></Text>
              <TextInput
                value={pinCode}
                onChangeText={setPinCode}
                editable={!saving}
                autoComplete="off"
                autoCorrect={false}
                placeholder="500016"
                placeholderTextColor="#6B7280"
                keyboardType="numeric"
                className={`bg-[#0F0F0F] border border-[#1F293D] rounded-xl p-3.5 text-white text-sm font-sans ${!saving ? '' : 'opacity-60'}`}
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
            editable={!saving}
            autoComplete="off"
            autoCorrect={false}
            placeholder="Enter owner full name"
            placeholderTextColor="#6B7280"
            className={`bg-[#0F0F0F] border border-[#1F293D] rounded-xl p-3.5 text-white text-sm mb-4 font-sans ${!saving ? '' : 'opacity-60'}`}
          />

          <Text className="text-xs text-[#888888] mb-1.5">Email Address <Text className='text-red-500 text-sm'>*</Text></Text>
          <TextInput
            value={ownerEmail}
            onChangeText={setOwnerEmail}
            editable={!saving && !editingGymId}
            autoComplete="off"
            autoCorrect={false}
            placeholder="Enter email address"
            placeholderTextColor="#6B7280"
            keyboardType="email-address"
            className={`bg-[#0F0F0F] border border-[#1F293D] rounded-xl p-3.5 text-white text-sm mb-4 font-sans ${!saving ? '' : 'opacity-60'}`}
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
              editable={!saving}
              autoComplete="off"
              autoCorrect={false}
              placeholder="Enter phone number"
              placeholderTextColor="#6B7280"
              keyboardType="phone-pad"
              maxLength={10}
              className={`flex-1 bg-[#0F0F0F] border border-[#1F293D] rounded-xl p-3.5 text-white text-sm font-sans ${!saving ? '' : 'opacity-60'}`}
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
              editable={!saving}
              autoComplete="off"
              autoCorrect={false}
              placeholder="Enter alternate phone number"
              placeholderTextColor="#6B7280"
              keyboardType="phone-pad"
              maxLength={10}
              className={`flex-1 bg-[#0F0F0F] border border-[#1F293D] rounded-xl p-3.5 text-white text-sm font-sans ${!saving ? '' : 'opacity-60'}`}
            />
          </View>

          <Text className="text-xs font-semibold text-[#CCFF00] tracking-wider mb-3 mt-2">
            ADDITIONAL INFORMATION
          </Text>

          <Text className="text-xs text-[#888888] mb-1.5">Number of Branches</Text>
          <TextInput
            value={branches}
            onChangeText={setBranches}
            editable={!saving}
            autoComplete="off"
            autoCorrect={false}
            placeholder="Enter number of branches"
            placeholderTextColor="#6B7280"
            keyboardType="numeric"
            className={`bg-[#0F0F0F] border border-[#1F293D] rounded-xl p-3.5 text-white text-sm mb-4 font-sans ${!saving ? '' : 'opacity-60'}`}
          />

          <Text className="text-xs text-[#888888] mb-1.5">Established Year (Optional)</Text>
          <Pressable
            onPress={() => {
              if (!saving) {
                setYearModalVisible(true);
              }
            }}
            disabled={saving}
            className={`bg-[#0F0F0F] border border-[#1F293D] rounded-xl p-3.5 flex-row items-center justify-between mb-4 active:opacity-80 ${!saving ? '' : 'opacity-60'}`}
          >
            <Text className={`flex-1 text-sm py-0 ${establishedYear ? 'text-white' : 'text-[#6B7280]'}`}>
              {establishedYear || 'Select year'}
            </Text>
            <Calendar size={16} color="#888888" />
          </Pressable>

          <Text className="text-xs text-[#888888] mb-1.5">Website (Optional)</Text>
          <TextInput
            value={website}
            onChangeText={setWebsite}
            editable={!saving}
            autoComplete="off"
            autoCorrect={false}
            autoCapitalize="none"
            placeholder="e.g. www.mygym.com"
            placeholderTextColor="#6B7280"
            className={`bg-[#0F0F0F] border border-[#1F293D] rounded-xl p-3.5 text-white text-sm mb-4 font-sans ${!saving ? '' : 'opacity-60'}`}
          />

          <View className="flex-row items-center justify-between mb-1.5">
            <Text className="text-xs text-[#888888]">Notes (Optional)</Text>
            <Text className="text-xs text-[#888888]">{notes.length}/250</Text>
          </View>
          <TextInput
            value={notes}
            onChangeText={setNotes}
            editable={!saving}
            autoComplete="off"
            autoCorrect={false}
            maxLength={250}
            multiline
            numberOfLines={4}
            placeholder="Add any additional notes..."
            placeholderTextColor="#6B7280"
            textAlignVertical="top"
            className={`bg-[#0F0F0F] border border-[#1F293D] rounded-xl p-3.5 text-white text-sm min-h-[90px] mb-6 font-sans ${!saving ? '' : 'opacity-60'}`}
          />

          <View className="mb-6">
            <View className="flex-row items-center justify-between mb-3">
              <Text className="text-xs text-[#888888]">Attendance QR Code (Static)</Text>
              {qrCodeId && (
                <View className="flex-row items-center gap-1">
                  <CheckCircle size={14} color="#CCFF00" weight="fill" />
                  <Text className="text-[10px] text-[#CCFF00]">Generated</Text>
                </View>
              )}
            </View>

            {qrCodeId ? (
              <View className="items-center bg-[#0F0F0F] border border-[#1F293D] rounded-xl p-6">
                <View className="bg-white p-2 rounded-xl">
                  <QRCodeSvg
                    value={qrCodeId}
                    size={150}
                    getRef={(c) => (qrRef.current = c)}
                  />
                </View>
                <Text className="text-[#888888] text-xs mt-4 text-center">
                  This QR code will be assigned to the gym upon creation.
                </Text>
                {!editingGymId && (
                  <Pressable
                    onPress={handleGenerateQR}
                    disabled={saving}
                    className="mt-4 flex-row items-center gap-2 active:opacity-80"
                  >
                    <QrCode size={16} color="#BAFF00" />
                    <Text className="text-[#BAFF00] text-sm text-white">Regenerate QR</Text>
                  </Pressable>
                )}
              </View>
            ) : (
              <Pressable
                onPress={handleGenerateQR}
                disabled={saving}
                className={`bg-[#0F0F0F] border border-[#1F293D] border-dashed rounded-xl p-6 items-center justify-center active:opacity-80 ${!saving ? '' : 'opacity-60'}`}
              >
                <View className="w-12 h-12 rounded-full bg-[#1A1A1A] items-center justify-center mb-3">
                  <QrCode size={24} color="#BAFF00" />
                </View>
                <Text className="text-white text-sm font-semibold mb-1">Generate Attendance QR</Text>
                <Text className="text-[#6B7280] text-xs text-center px-4">
                  Tap here to generate a static QR code for this gym's check-ins.
                </Text>
              </Pressable>
            )}
          </View>

          <Pressable
            onPress={() => {
              if (!saving) {
                clearForm();
                setViewMode('list');
              }
            }}
            disabled={saving}
            className={`bg-[#0F0F0F] border border-[#1F293D] rounded-xl py-3.5 items-center justify-center mb-3 active:opacity-80 ${saving ? 'opacity-50' : ''}`}>
            <Text className="text-white text-sm font-semibold">Cancel</Text>
          </Pressable>

          <Pressable
            onPress={handleCreateGym}
            disabled={saving}
            className={`bg-[#CCFF00] rounded-xl py-3.5 flex-row items-center justify-center gap-2 active:opacity-90 ${saving ? 'opacity-70' : ''}`}>
            {saving ? (
              <ActivityIndicator size="small" color="#000000" />
            ) : (
              <View className="w-4 h-4 rounded-full border border-black items-center justify-center">
                <Plus size={10} color="#000000" weight="bold" />
              </View>
            )}
            <Text className="text-black text-sm font-semibold">
              {saving ? (editingGymId ? 'Saving...' : 'Creating Gym...') : (editingGymId ? 'Save Changes' : 'Create Gym')}
            </Text>
          </Pressable>
        </ScrollView>
      )}

      {viewMode === 'success' && (
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 20, paddingBottom: 120 }}
          showsVerticalScrollIndicator={false}>

          <View className="items-center mt-8 mb-6">
            <View className="w-16 h-16 rounded-full bg-[#CCFF00]/10 border border-[#CCFF00]/20 items-center justify-center mb-4">
              <CheckCircle size={36} color="#CCFF00" weight="fill" />
            </View>
            <Text className="text-2xl font-semibold text-white text-center">{editingGymId ? 'Gym Updated Successfully!' : 'Gym Registered Successfully!'}</Text>
            <Text className="text-sm text-[#888888] text-center mt-2 px-6">
              {editingGymId ? 'The gym details have been updated successfully.' : 'The gym and owner account have been created and are now active on the platform.'}
            </Text>
          </View>

          <View className="bg-[#0F0F0F] border border-[#1F293D] rounded-2xl p-4 mb-6">
            <View className="flex-row items-center gap-3 mb-4">
              {logoUri ? (
                <Image source={{ uri: logoUri }} className="w-14 h-14 rounded-xl bg-white" resizeMode="cover" />
              ) : (
                <View className="w-14 h-14 rounded-xl bg-[#111622] border border-[#1F293D] items-center justify-center">
                  <Text className="text-[#888888] text-xs font-semibold">LOGO</Text>
                </View>
              )}
              <View className="flex-1">
                <Text className="text-lg font-semibold text-white leading-5">{gymName}</Text>
                <Text className="text-xs text-[#888888] mt-0.5">{city}, {stateName}</Text>
                <View className="flex-row items-center gap-1 mt-1.5">
                  <Calendar size={12} color="#888888" />
                  <Text className="text-[11px] text-[#888888]">
                    Registered: {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </Text>
                </View>
              </View>
              <View className="bg-[#064E3B]/40 border border-[#059669]/30 px-2.5 py-1 rounded-full">
                <Text className="text-[#10B981] text-[10px] font-semibold tracking-wider">ACTIVE</Text>
              </View>
            </View>

            <View className="h-[1px] bg-[#1F293D] my-3.5" />

            <Text className="text-xs font-semibold text-[#CCFF00] tracking-wider mb-3">OWNER DETAILS</Text>
            <View className="flex-row justify-between mb-2">
              <Text className="text-xs text-[#888888]">Full Name</Text>
              <Text className="text-xs text-white font-medium">{ownerName}</Text>
            </View>
            <View className="flex-row justify-between mb-2">
              <Text className="text-xs text-[#888888]">Email Address</Text>
              <Text className="text-xs text-white font-medium">{ownerEmail}</Text>
            </View>
            <View className="flex-row justify-between">
              <Text className="text-xs text-[#888888]">Phone Number</Text>
              <Text className="text-xs text-white font-medium">{ownerPhoneCode} {ownerPhone}</Text>
            </View>
          </View>

          {/* Credentials Card */}
          <View className="bg-[#0F0F0F] border border-[#1F293D] rounded-2xl p-4 mb-6">
            <Text className="text-xs font-semibold text-[#CCFF00] tracking-wider mb-4">LOGIN CREDENTIALS</Text>

            <Text className="text-[10px] text-[#888888] mb-1.5 font-semibold tracking-wider">EMAIL OR PHONE</Text>
            <View className="bg-[#111622] border border-[#1F293D] rounded-xl p-3.5 mb-4">
              <Text className="text-white text-sm">{ownerEmail}</Text>
            </View>

            <Text className="text-[10px] text-[#888888] mb-1.5 font-semibold tracking-wider">TEMPORARY PASSWORD</Text>
            <View className="bg-[#111622] border border-[#1F293D] rounded-xl p-3.5 flex-row items-center justify-between">
              <Text className="text-white text-sm font-mono">{temporaryPassword}</Text>
              <Pressable onPress={handleCopyCredentials} className="active:opacity-75">
                <ClipboardText size={18} color="#CCFF00" />
              </Pressable>
            </View>

            <View className="flex-row items-start gap-2 mt-4 bg-[#CCFF00]/5 border border-[#CCFF00]/10 rounded-xl p-3">
              <View className="mt-0.5">
                <WarningCircle size={14} color="#CCFF00" />
              </View>
              <Text className="flex-1 text-[11px] text-[#CCFF00] leading-4">
                The owner will be asked to change the password after first login.
              </Text>
            </View>
          </View>

          {/* Share/Email/Copy Action Buttons */}
          <View className="flex-row gap-3 mb-6">
            <Pressable onPress={handleCopyCredentials} className="flex-1 bg-[#0F0F0F] border border-[#1F293D] rounded-xl py-3.5 items-center justify-center active:opacity-80">
              <Copy size={20} color="#FFFFFF" />
              <Text className="text-[#888888] text-[10px] font-semibold tracking-wider mt-1.5">COPY</Text>
            </Pressable>

            <Pressable onPress={handleShare} className="flex-1 bg-[#0F0F0F] border border-[#1F293D] rounded-xl py-3.5 items-center justify-center active:opacity-80">
              <ShareNetwork size={20} color="#FFFFFF" />
              <Text className="text-[#888888] text-[10px] font-semibold tracking-wider mt-1.5">SHARE</Text>
            </Pressable>

            <Pressable onPress={handleEmail} className="flex-1 bg-[#0F0F0F] border border-[#1F293D] rounded-xl py-3.5 items-center justify-center active:opacity-80">
              <EnvelopeSimple size={20} color="#FFFFFF" />
              <Text className="text-[#888888] text-[10px] font-semibold tracking-wider mt-1.5">EMAIL</Text>
            </Pressable>
          </View>

          {/* View Gym / Back buttons */}
          <Pressable
            onPress={handleViewGymDetails}
            className="bg-[#CCFF00] rounded-xl py-3.5 items-center justify-center mb-3 active:opacity-90">
            <Text className="text-black text-sm font-semibold">VIEW GYM DETAILS</Text>
          </Pressable>

          <Pressable
            onPress={handleBackToGyms}
            className="bg-[#0F0F0F] border border-[#1F293D] rounded-xl py-3.5 items-center justify-center active:opacity-80">
            <Text className="text-white text-sm font-semibold">BACK TO REGISTERED GYMS</Text>
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
