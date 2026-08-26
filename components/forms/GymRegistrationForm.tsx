import React, { useState, useEffect, useRef } from 'react';
import { View, ScrollView, Pressable, TextInput, Image, ActivityIndicator, Clipboard, Share, Linking } from 'react-native';
import { Text } from '@/components/nativewindui/Text';
import { useRouter } from 'expo-router';
import {
  Plus,
  CaretDown,
  Calendar,
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
import * as FileSystem from 'expo-file-system/legacy';
import { useUser } from '@/context/UserContext';
import { supabase, supabaseAdminAuth } from '@/lib/supabase';
import { createUser, updateUser } from '@/helpers/otpHelper';
import { saveGym, uploadGymLogo, uploadGymQR, fetchGymById } from '@/helpers/gym/gymHelper';
import { saveGymOwner, fetchGymOwners } from '@/helpers/gymOwners/gymOwnersHelper';
import { toast } from '@/lib/toast';
import { fetchGymLeadById, updateGymLeadStatus } from '@/helpers/gymLeads/gymLeadsHelper';
import { StateSelectorModal } from './StateSelectorModal';
import { YearSelectorModal } from './YearSelectorModal';

interface GymRegistrationFormProps {
  editGymId?: string;
  gymLeadId?: string;
}

export function GymRegistrationForm({ editGymId, gymLeadId }: GymRegistrationFormProps) {
  const router = useRouter();
  const { userId: currentUserId } = useUser();

  const [gymLeadIdState, setGymLeadIdState] = useState<string | null>(null);
  const [leadPassword, setLeadPassword] = useState<string | null>(null);

  const [viewMode, setViewMode] = useState<'form' | 'success'>('form');
  const [saving, setSaving] = useState(false);
  const [temporaryPassword, setTemporaryPassword] = useState('');

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
  const [yearModalVisible, setYearModalVisible] = useState(false);
  const [createdGymId, setCreatedGymId] = useState<string | null>(null);

  const [qrCodeId, setQrCodeId] = useState<string | null>(null);
  const qrRef = useRef<any>(null);

  const [editingGymIdState, setEditingGymIdState] = useState<string | null>(null);
  const [editingGymOwnerId, setEditingGymOwnerId] = useState<string | null>(null);
  const [editingOwnerUserId, setEditingOwnerUserId] = useState<string | null>(null);

  useEffect(() => {
    const fetchEditData = async () => {
      if (editGymId) {
        setSaving(true);
        try {
          const gymDetails = await fetchGymById(editGymId);
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
            setQrCodeId(editGymId);

            const allOwners = await fetchGymOwners(editGymId);
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

            setEditingGymIdState(editGymId);
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
  }, [editGymId]);

  useEffect(() => {
    const fetchLeadData = async () => {
      if (gymLeadId) {
        setSaving(true);
        try {
          const leadDetails = await fetchGymLeadById(gymLeadId);
          if (leadDetails) {
            setGymName(leadDetails.gymName || '');
            setGymEmail(leadDetails.gymEmail || '');

            const gymMobile = leadDetails.gymMobile || leadDetails.mobile || '';
            if (gymMobile.startsWith('+91')) {
              setPhoneCode('+91');
              setPhoneNumber(gymMobile.slice(3));
            } else {
              setPhoneCode('+91');
              setPhoneNumber(gymMobile);
            }

            const gymAltMobile = leadDetails.gymAlternateMobile || leadDetails.alternateMobile || '';
            if (gymAltMobile) {
              if (gymAltMobile.startsWith('+91')) {
                setAltPhoneCode('+91');
                setAltPhoneNumber(gymAltMobile.slice(3));
              } else {
                setAltPhoneCode('+91');
                setAltPhoneNumber(gymAltMobile);
              }
            }

            setAddress(leadDetails.gymAddress || leadDetails.address || '');
            setCity(leadDetails.gymCity || '');
            setStateName(leadDetails.gymState || 'Telangana');
            setPinCode(leadDetails.gymPincode ? leadDetails.gymPincode.toString() : '');

            setOwnerName(leadDetails.fullName || '');
            setOwnerEmail(leadDetails.email || '');

            const ownerPhoneVal = leadDetails.mobile || '';
            if (ownerPhoneVal.startsWith('+91')) {
              setOwnerPhoneCode('+91');
              setOwnerPhone(ownerPhoneVal.slice(3));
            } else {
              setOwnerPhoneCode('+91');
              setOwnerPhone(ownerPhoneVal);
            }

            const ownerAltPhoneVal = leadDetails.alternateMobile || '';
            if (ownerAltPhoneVal) {
              if (ownerAltPhoneVal.startsWith('+91')) {
                setOwnerAltPhoneCode('+91');
                setOwnerAltPhone(ownerAltPhoneVal.slice(3));
              } else {
                setOwnerAltPhoneCode('+91');
                setOwnerAltPhone(ownerAltPhoneVal);
              }
            }

            setBranches(leadDetails.noOfBranches ? leadDetails.noOfBranches.toString() : '');
            setEstablishedYear(leadDetails.establishYear || '');
            setWebsite(leadDetails.website || '');
            setNotes(leadDetails.note || '');

            if (leadDetails.logo) {
              const { data: publicUrlData } = supabase.storage
                .from('gym-lead-logos')
                .getPublicUrl(leadDetails.logo);
              setLogoUri(publicUrlData.publicUrl);
            } else {
              setLogoUri(null);
            }

            setLeadPassword(leadDetails.password || null);
            setGymLeadIdState(gymLeadId);
            setViewMode('form');
          }
        } catch (e) {
          console.error('[register.tsx] fetchLeadData error:', e);
          toast.error('Failed to fetch lead details.');
        } finally {
          setSaving(false);
        }
      }
    };
    fetchLeadData();
  }, [gymLeadId]);

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
    setGymLeadIdState(null);
    setLeadPassword(null);
  };

  const handleGenerateQR = () => {
    if (saving || editingGymIdState) return;
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
    if (!qrCodeId) {
      toast.error("Please generate an Attendance QR Code.");
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

      let finalLogoUrl = logoUri;
      if (logoUri && (logoUri.startsWith('file:') || logoUri.startsWith('/') || logoUri.startsWith('content:'))) {
        const uploadedUrl = await uploadGymLogo(logoUri);
        if (uploadedUrl) {
          finalLogoUrl = uploadedUrl;
        }
      }

      const ownerPhoneNum = ownerPhoneCode + ownerPhone;
      let authUserId = editingOwnerUserId;

      if (!editingGymIdState) {
        const uuid = Crypto.randomUUID();
        const tempPassword = `TK-${uuid.substring(0, 5).toUpperCase()}-${uuid.substring(9, 10).toUpperCase()}`;
        const actualPassword = leadPassword || tempPassword;
        if (!leadPassword) {
          setTemporaryPassword(tempPassword);
        }

        const { data: authData, error: authError } = await supabaseAdminAuth.auth.signUp({
          email: ownerEmail.trim().toLowerCase(),
          password: actualPassword,
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

      let finalQrPath: string | null | undefined = editingGymIdState ? undefined : null;
      if (!editingGymIdState && qrCodeId) {
        const qrBase64 = await getQRBase64();
        if (qrBase64) {
          finalQrPath = await uploadGymQR(qrBase64, qrCodeId);
        }
      }

      const gymPhoneNum = phoneCode + phoneNumber;
      const gymAltPhoneNum = altPhoneNumber ? (altPhoneCode + altPhoneNumber) : null;
      const payload = {
        gymId: editingGymIdState || undefined,
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
        throw new Error(editingGymIdState ? 'Failed to update gym organization entry.' : 'Failed to create gym organization entry.');
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

      if (gymLeadIdState) {
        await updateGymLeadStatus(gymLeadIdState, 'approved');
      }

      toast.success('Gym and Gym Owner registered successfully!');
      setCreatedGymId(createdGym.gymId);
      setViewMode('success');
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
      router.push('/(superadmin)/dashboard/gym' as any);
    }
  };

  const handleBackToGyms = () => {
    clearForm();
    router.push('/(superadmin)/dashboard/gym' as any);
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

  return (
    <View className="flex-1 bg-[#0A0A0A]">
      {viewMode === 'form' && (
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 20, paddingBottom: 120 }}
          showsVerticalScrollIndicator={false}>
          <View className="flex-row items-center gap-3 mb-6">
            <Pressable
              onPress={() => !saving && router.push('/(superadmin)/dashboard/gym' as any)}
              disabled={saving}
              className={`w-9 h-9 rounded-full bg-[#111622] border border-[#1F293D] items-center justify-center active:opacity-70 ${saving ? 'opacity-50' : ''}`}>
              <ArrowLeft size={18} color="#FFFFFF" />
            </Pressable>
            <View className="flex-1">
              <Text className="text-xl font-semibold text-white">{editingGymIdState ? 'Edit Gym' : 'Register New Gym'}</Text>
              <Text className="text-xs text-[#888888] mt-0.5">
                {editingGymIdState ? 'Update the gym organization details.' : 'Add a new gym organization to the platform.'}
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
            editable={!saving && !editingGymIdState}
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
            editable={!saving && !editingGymIdState}
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
              <Text className="text-xs text-[#888888]">Attendance QR Code (Static) <Text className="text-red-500 text-sm">*</Text></Text>
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
                {!editingGymIdState && (
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
                router.push('/(superadmin)/dashboard/gym' as any);
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
              {saving ? (editingGymIdState ? 'Saving...' : 'Creating Gym...') : (editingGymIdState ? 'Save Changes' : 'Create Gym')}
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
            <Text className="text-2xl font-semibold text-white text-center">{editingGymIdState ? 'Gym Updated Successfully!' : 'Gym Registered Successfully!'}</Text>
            <Text className="text-sm text-[#888888] text-center mt-2 px-6">
              {editingGymIdState ? 'The gym details have been updated successfully.' : 'The gym and owner account have been created and are now active on the platform.'}
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

          <View className="bg-[#0F0F0F] border border-[#1F293D] rounded-2xl p-4 mb-6">
            <Text className="text-xs font-semibold text-[#CCFF00] tracking-wider mb-4">LOGIN CREDENTIALS</Text>

            <Text className="text-[10px] text-[#888888] mb-1.5 font-semibold tracking-wider">EMAIL OR PHONE</Text>
            <View className="bg-[#111622] border border-[#1F293D] rounded-xl p-3.5 mb-4">
              <Text className="text-white text-sm">{ownerEmail}</Text>
            </View>

            {gymLeadIdState ? (
              <View className="bg-[#111622] border border-[#1F293D] rounded-xl p-3.5 flex-row items-center justify-between">
                <Text className="text-white text-sm">•••••••• (Set during registration)</Text>
              </View>
            ) : (
              <>
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
              </>
            )}
          </View>

          {!gymLeadIdState && (
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
          )}

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

      <StateSelectorModal
        visible={stateModalVisible}
        onClose={() => setStateModalVisible(false)}
        onSelectState={setStateName}
        selectedState={stateName}
      />

      <YearSelectorModal
        visible={yearModalVisible}
        onClose={() => setYearModalVisible(false)}
        onSelectYear={setEstablishedYear}
        selectedYear={establishedYear}
      />
    </View>
  );
}
