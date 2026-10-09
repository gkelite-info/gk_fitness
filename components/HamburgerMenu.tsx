import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  Modal,
  Animated,
  Dimensions,
  Alert,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, usePathname } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useUser } from '@/context/UserContext';
import { StaticAvatar } from '@/components/ui/StaticAvatar';
import { triggerLightHaptic, triggerMediumHaptic, triggerWarningHaptic } from '@/lib/haptics';
import {
  House,
  Barbell,
  ChartLineUp,
  Compass,
  Drop,
  Footprints,
  Flame,
  Lightning,
  ForkKnife,
  BowlFood,
  UsersThree,
  Crown,
  QrCode,
  User,
  Bell,
  Headphones,
  SignOut,
  X,
  Users,
  CalendarCheck,
  CurrencyDollar,
  Wallet,
  Receipt,
  Package,
  Headset,
  Fingerprint,
  Buildings,
  ShieldCheck,
  CaretRight,
  CreditCard,
  Megaphone,
} from 'phosphor-react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const DRAWER_WIDTH = Math.min(SCREEN_WIDTH * 0.84, 340);

interface HamburgerMenuProps {
  visible: boolean;
  onClose: () => void;
}

interface MenuItem {
  name: string;
  href: string;
  icon: React.ComponentType<any>;
  badge?: string;
}

interface MenuSection {
  title?: string;
  items: MenuItem[];
}

export function HamburgerMenu({ visible, onClose }: HamburgerMenuProps) {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const { name, email, role, profilePhoto } = useUser();

  const translateX = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(translateX, {
          toValue: 0,
          useNativeDriver: true,
          bounciness: 0,
          speed: 16,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(translateX, {
          toValue: -DRAWER_WIDTH,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  const handleNavigate = (href: string) => {
    triggerLightHaptic();
    onClose();
    setTimeout(() => {
      router.push(href as any);
    }, 150);
  };

  const handleSignOut = () => {
    triggerWarningHaptic();
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out of your account?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            try {
              triggerMediumHaptic();
              onClose();
              await supabase.auth.signOut();
              router.replace('/auth/otp-auth');
            } catch (err) {
              console.error('Sign out error:', err);
            }
          },
        },
      ]
    );
  };

  // Build role-tailored sections
  const getMenuSections = (): MenuSection[] => {
    const userRole = (role || 'customer').toLowerCase();

    if (userRole === 'owner') {
      return [
        {
          title: 'CORE MANAGEMENT',
          items: [
            { name: 'Dashboard', href: '/(owner)/dashboard', icon: House },
            { name: 'Users & Members', href: '/(owner)/users', icon: Users },
            { name: 'Membership Plans', href: '/(owner)/membership', icon: Crown },
            { name: 'Membership Expiry', href: '/(owner)/dashboard/renewals', icon: CalendarCheck },
            { name: 'PT Sessions', href: '/(owner)/explore/trainers', icon: Barbell },
          ],
        },
        {
          title: 'FINANCE & OPERATIONS',
          items: [
            { name: 'Finance Overview', href: '/(owner)/finance', icon: CurrencyDollar },
            { name: 'Expenditure', href: '/(owner)/finance/expenditure', icon: CreditCard },
            { name: 'Payments & Fees', href: '/(owner)/dashboard/payments', icon: Wallet },
            { name: 'Revenue & Expenses', href: '/(owner)/finance/revenue', icon: Receipt },
            { name: 'Manage Inventory', href: '/(owner)/dashboard/manage-inventory', icon: Package },
          ],
        },
        {
          title: 'COMMUNITY & LEADS',
          items: [
            { name: 'Explore Programs', href: '/(owner)/explore', icon: Compass },
            { name: 'Enquiries & Leads', href: '/(owner)/dashboard/enquiries', icon: Headset },
            { name: 'Alerts & Reminders', href: '/(owner)/dashboard/alerts', icon: Bell },
            { name: 'Announcements', href: '/(owner)/announcements', icon: Megaphone },
            { name: 'Biometric Access', href: '/(owner)/profile/gym-access/settings', icon: Fingerprint },
          ],
        },
        {
          title: 'ACCOUNT',
          items: [
            { name: 'Profile & Settings', href: '/(owner)/profile', icon: User },
          ],
        },
      ];
    }

    if (userRole === 'trainer') {
      return [
        {
          title: 'TRAINER HUB',
          items: [
            { name: 'Dashboard', href: '/(trainer)/home', icon: House },
            { name: 'My Clients', href: '/(trainer)/clients', icon: Users },
            { name: 'Workout Builder', href: '/(trainer)/workoutPlan', icon: Barbell },
            { name: 'Weekly Schedule', href: '/(trainer)/weeklyWorkoutPlan', icon: CalendarCheck },
            { name: 'Explore Workouts', href: '/(trainer)/explore', icon: Compass },
          ],
        },
        {
          title: 'ACCOUNT',
          items: [
            { name: 'Trainer Profile', href: '/(trainer)/profile', icon: User },
          ],
        },
      ];
    }

    if (userRole === 'superadmin') {
      return [
        {
          title: 'SUPERADMIN PORTAL',
          items: [
            { name: 'Dashboard', href: '/(superadmin)/dashboard', icon: House },
            { name: 'Gyms Directory', href: '/(superadmin)/gyms', icon: Buildings },
            { name: 'Users Directory', href: '/(superadmin)/users', icon: Users },
            { name: 'System Settings', href: '/(superadmin)/settings', icon: ShieldCheck },
          ],
        },
        {
          title: 'ACCOUNT',
          items: [
            { name: 'Admin Profile', href: '/(superadmin)/profile', icon: User },
          ],
        },
      ];
    }

    // Default: CUSTOMER ROLE
    return [
      {
        title: 'MAIN',
        items: [
          { name: 'Dashboard', href: '/(customer)/home', icon: House },
          { name: 'Workouts & Routine', href: '/(customer)/workout', icon: Barbell },
          { name: 'Progress & Stats', href: '/(customer)/progress', icon: ChartLineUp },
          { name: 'Explore Exercises', href: '/(customer)/explore', icon: Compass },
        ],
      },
      {
        title: 'FITNESS & HEALTH TRACKING',
        items: [
          { name: 'Water Tracker', href: '/(customer)/fitness/water', icon: Drop },
          { name: 'Daily Steps', href: '/(customer)/fitness/steps', icon: Footprints },
          { name: 'Calorie Burn', href: '/(customer)/fitness/calories', icon: Flame },
          { name: 'Workout Streaks', href: '/(customer)/streak-details', icon: Lightning },
        ],
      },
      {
        title: 'NUTRITION & COACHING',
        items: [
          { name: 'Diet & Meal Plan', href: '/(customer)/nutrition', icon: ForkKnife },
          { name: 'Food Preferences', href: '/(customer)/nutrition/food-preferences', icon: BowlFood },
          { name: 'My Trainer', href: '/(customer)/my-trainer', icon: UsersThree },
          { name: 'Gym Access / Scan', href: '/(customer)/home/scan', icon: QrCode },
          { name: 'Membership Plans', href: '/(customer)/memberships', icon: Crown },
        ],
      },
      {
        title: 'PREFERENCES & SUPPORT',
        items: [
          { name: 'Profile Details', href: '/(customer)/profile', icon: User },
          { name: 'Reminders & Notifications', href: '/(customer)/notifications/preferences', icon: Bell },
          { name: 'Help & Support', href: '/(customer)/help-support', icon: Headphones },
        ],
      },
    ];
  };

  const menuSections = getMenuSections();

  const getPortalLabel = () => {
    const userRole = (role || 'customer').toLowerCase();
    if (userRole === 'owner') return 'Owner Portal';
    if (userRole === 'trainer') return 'Trainer Portal';
    if (userRole === 'superadmin') return 'SuperAdmin Portal';
    return 'Customer Portal';
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View className="flex-1 flex-row">
        {/* Animated Dark Frosted Backdrop */}
        <Animated.View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.72)',
            opacity: fadeAnim,
          }}
        >
          <Pressable className="flex-1" onPress={onClose} />
        </Animated.View>

        {/* Sliding Drawer Container */}
        <Animated.View
          style={{
            width: DRAWER_WIDTH,
            transform: [{ translateX }],
            paddingTop: Math.max(insets.top, 16),
            paddingBottom: Math.max(insets.bottom, 16),
          }}
          className="h-full bg-[#0E0F13] border-r-2 border-[#232631] shadow-2xl justify-between"
        >
          {/* Top Brand & Header Section */}
          <View className="px-5 pt-3 pb-4 border-b border-[#232631]">
            <View className="flex-row items-center justify-between mb-4">
              <View className="flex-row items-center gap-3">
                <View className="w-10 h-10 bg-[#D4FF32] rounded-xl items-center justify-center shadow-lg">
                  <Barbell size={22} weight="fill" color="#000000" />
                </View>
                <View>
                  <Text className="text-white font-bold text-base tracking-tight">
                    GK-Gym Life
                  </Text>
                  <Text className="text-[#94A3B8] text-[11px] font-semibold tracking-wider uppercase">
                    {getPortalLabel()}
                  </Text>
                </View>
              </View>

              <Pressable
                onPress={() => {
                  triggerLightHaptic();
                  onClose();
                }}
                className="w-9 h-9 rounded-xl bg-[#1A1C23] border border-[#232631] items-center justify-center active:opacity-70"
              >
                <X size={18} color="#94A3B8" weight="bold" />
              </Pressable>
            </View>

            {/* Quick Profile Summary Card */}
            <Pressable
              onPress={() => {
                const target = role === 'owner' ? '/(owner)/profile' : role === 'trainer' ? '/(trainer)/profile' : '/(customer)/profile';
                handleNavigate(target);
              }}
              className="flex-row items-center gap-3 bg-[#15161C] border border-[#232631] rounded-2xl p-3 active:bg-[#1A1C23]"
            >
              <StaticAvatar
                uri={profilePhoto}
                name={name || 'User'}
                size={40}
                className="w-10 h-10 rounded-full border border-[#D4FF32]/30"
              />
              <View className="flex-1">
                <Text className="text-white font-bold text-sm tracking-tight" numberOfLines={1}>
                  {name || 'Fitness Member'}
                </Text>
                <Text className="text-[#94A3B8] text-xs font-medium" numberOfLines={1}>
                  {email || 'Member Profile'}
                </Text>
              </View>
              <CaretRight size={16} color="#94A3B8" />
            </Pressable>
          </View>

          {/* Scrollable Navigation Menu */}
          <ScrollView
            className="flex-1 px-4 pt-3"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 20 }}
          >
            {menuSections.map((section, sIdx) => (
              <View key={sIdx} className="mb-5">
                {section.title && (
                  <Text className="text-[#64748B] text-[11px] font-bold tracking-wider uppercase mb-2 px-3">
                    {section.title}
                  </Text>
                )}

                <View className="gap-y-1">
                  {section.items.map((item) => {
                    const isActive = pathname === item.href || (item.href !== '/(customer)/home' && item.href !== '/(owner)/dashboard' && pathname.startsWith(item.href));
                    const IconComponent = item.icon;

                    return (
                      <Pressable
                        key={item.name}
                        onPress={() => handleNavigate(item.href)}
                        className={`flex-row items-center justify-between px-3.5 py-3 rounded-2xl transition-all ${
                          isActive
                            ? 'bg-[#D4FF32]/10 border border-[#D4FF32]'
                            : 'active:bg-[#1A1C23]'
                        }`}
                      >
                        <View className="flex-row items-center gap-3.5 flex-1">
                          <IconComponent
                            size={20}
                            weight={isActive ? 'fill' : 'regular'}
                            color={isActive ? '#D4FF32' : '#94A3B8'}
                          />
                          <Text
                            className={`text-sm tracking-wide ${
                              isActive ? 'text-[#D4FF32] font-bold' : 'text-[#94A3B8] font-medium'
                            }`}
                            numberOfLines={1}
                          >
                            {item.name}
                          </Text>
                        </View>

                        {item.badge ? (
                          <View className="bg-[#D4FF32] rounded-full px-2 py-0.5">
                            <Text className="text-black text-[10px] font-bold">{item.badge}</Text>
                          </View>
                        ) : (
                          <CaretRight
                            size={14}
                            color={isActive ? '#D4FF32' : '#475569'}
                          />
                        )}
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            ))}
          </ScrollView>

          {/* Drawer Footer: Logout & Version */}
          <View className="px-5 pt-3 border-t border-[#232631]">
            <Pressable
              onPress={handleSignOut}
              className="flex-row items-center justify-center gap-2.5 bg-[#231518] border border-[#EF4444]/25 rounded-2xl py-3 px-4 active:opacity-75"
            >
              <SignOut size={18} color="#EF4444" weight="bold" />
              <Text className="text-[#EF4444] font-bold text-sm">Sign Out</Text>
            </Pressable>

            <Text className="text-[#475569] text-[11px] text-center font-medium mt-3">
              GK-Gym Life • v1.0.0
            </Text>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}
