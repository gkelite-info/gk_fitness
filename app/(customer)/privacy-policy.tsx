import React from 'react';
import { View, ScrollView, Pressable } from 'react-native';
import { Text } from '@/components/nativewindui/Text';
import { ArrowLeft } from 'phosphor-react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function PrivacyPolicy() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const handleBack = () => {
    router.push('/(customer)/profile');
  }

  const BulletPoint = ({ children }: { children: React.ReactNode }) => (
    <View className="flex-row mt-1 px-2">
      <Text className="text-white text-sm mr-2">•</Text>
      <Text className="text-white text-sm flex-1 leading-5">{children}</Text>
    </View>
  );

  return (
    <View className="flex-1 bg-[#0F0F0F] pb-10" style={{ paddingTop: insets.top }}>
      <View className="flex-row items-center px-5 py-4 border-b border-[#27272A]">
        <Pressable onPress={() => handleBack()} className="mr-4 active:opacity-70">
          <ArrowLeft size={24} color="#FFFFFF" />
        </Pressable>
        <Text className="text-white text-xl font-semibold">Privacy & Security</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 20, paddingBottom: 60 }}>
        <Text className="text-[#D4FF00] font-semibold text-2xl">Privacy Policy</Text>
        <Text className="text-sm mt-3 text-white leading-5 font-sans">
          GK-GYMLIFE is committed to protecting the privacy, security, and confidentiality of every member, trainer, gym owner, and platform user. This Privacy Policy explains how information is collected, used, stored, and protected while using the GK-GYMLIFE platform and its associated services.
        </Text>

        <Text className="text-base font-semibold mt-6 text-[#D4FF00]">1. Information We Collect</Text>
        <Text className="text-sm text-white mt-3 leading-5 font-sans">
          GK-GYMLIFE is committed to protecting the privacy, security, and confidentiality of every member, trainer, gym owner, and platform user. This Privacy Policy explains how information is collected, used, stored, and protected while using the GK-GYMLIFE platform and its associated services.
        </Text>

        <Text className="text-base font-semibold mt-6 text-[#D4FF00]">2. How We Use Your Information</Text>
        <Text className="text-sm text-white mt-3 leading-5 mb-2 font-sans">
          The information collected through GK-GYMLIFE is used to deliver a personalized and secure fitness experience.
        </Text>
        <BulletPoint>Personalizing workout plans, fitness recommendations, and wellness content.</BulletPoint>
        <BulletPoint>Managing memberships, renewals, attendance, and payment records.</BulletPoint>
        <BulletPoint>Assigning trainers and managing workout schedules.</BulletPoint>
        <BulletPoint>Tracking workout progress, completed challenges, and member engagement.</BulletPoint>
        <BulletPoint>Providing health and wellness features including recipes, hydration tracking, and progress monitoring.</BulletPoint>
        <BulletPoint>Sending membership reminders, announcements, notifications, and important updates.</BulletPoint>
        <BulletPoint>Improving platform performance, reliability, and user experience.</BulletPoint>
        <BulletPoint>Supporting gym owners in managing members, equipment inventory, memberships, and business operations.</BulletPoint>

        <Text className="text-base font-semibold mt-6 text-[#D4FF00]">3. Data Security</Text>
        <Text className="text-sm text-white mt-3 leading-5 mb-2 font-sans">
          GK-GYMLIFE follows industry-standard security practices to protect user information from unauthorized access, misuse, disclosure, or loss.
        </Text>
        <BulletPoint>Secure authentication and encrypted communication.</BulletPoint>
        <BulletPoint>Role-based access control for members, trainers, gym owners, and administrators.</BulletPoint>
        <BulletPoint>Secure cloud infrastructure with monitored access management.</BulletPoint>
        <BulletPoint>Regular security reviews and platform maintenance.</BulletPoint>
        <BulletPoint>Activity logs for important system operations and account security.</BulletPoint>
        <Text className="text-sm text-[#A1A1AA] mt-3 leading-5 font-medium font-sans">
          Security Notice: While we implement strong security measures, users are responsible for maintaining the confidentiality of their login credentials and account information.
        </Text>

        <Text className="text-base font-semibold mt-6 text-[#D4FF00]">4. Information Sharing</Text>
        <Text className="text-sm text-white mt-3 leading-5 mb-2 font-sans">
          GK-GYMLIFE does not sell or rent your personal information to third parties. Information may only be shared under the following circumstances:
        </Text>
        <BulletPoint>With your registered gym to provide membership and fitness services.</BulletPoint>
        <BulletPoint>With your assigned trainer to manage workouts and training schedules.</BulletPoint>
        <BulletPoint>With authorized payment service providers to process membership payments.</BulletPoint>
        <BulletPoint>When required by applicable laws, regulations, or legal authorities.</BulletPoint>
        <BulletPoint>To prevent fraud, misuse, security threats, or unauthorized activities.</BulletPoint>

        <Text className="text-base font-semibold mt-6 text-[#D4FF00]">5. User Rights & Access</Text>
        <Text className="text-sm text-white mt-3 leading-5 mb-2 font-sans">
          Users have control over their personal information and account.
        </Text>
        <BulletPoint>Update personal profile information.</BulletPoint>
        <BulletPoint>Modify fitness preferences and goals.</BulletPoint>
        <BulletPoint>Request correction of inaccurate information.</BulletPoint>
        <BulletPoint>Request account deletion or deactivation, subject to applicable policies.</BulletPoint>
        <BulletPoint>Download available account information where supported.</BulletPoint>
        <BulletPoint>Access platform features according to assigned user roles and permissions.</BulletPoint>

        <Text className="text-base font-semibold mt-6 text-[#D4FF00]">6. Payments & Memberships</Text>
        <Text className="text-sm text-white mt-3 leading-5 mb-2 font-sans">
          GK-GYMLIFE provides secure payment options for membership purchases and renewals.
        </Text>
        <BulletPoint>Payments made through supported online payment methods are securely processed and automatically recorded.</BulletPoint>
        <BulletPoint>QR-based payments may require manual entry by the registered gym owner for record management.</BulletPoint>
        <BulletPoint>Membership activation, renewal, and payment history are maintained within the platform.</BulletPoint>
        <BulletPoint>Payment information is handled securely through trusted payment partners.</BulletPoint>
        <BulletPoint>If you are registered under a local gym, GK-GYMLIFE is not responsible for your payments or refunds. Please coordinate directly with your gym owner.</BulletPoint>
        <BulletPoint>If you are a global customer purchasing platform-direct services, GK-GYMLIFE handles your payments and associated responsibilities.</BulletPoint>

        <Text className="text-base font-semibold mt-6 text-[#D4FF00]">7. Cookies & Analytics</Text>
        <Text className="text-sm text-white mt-3 leading-5 mb-2 font-sans">
          GK-GYMLIFE uses cookies and analytics technologies to improve platform performance and user experience.
        </Text>
        <BulletPoint>Maintaining secure login sessions.</BulletPoint>
        <BulletPoint>Remembering user preferences.</BulletPoint>
        <BulletPoint>Improving platform speed and reliability.</BulletPoint>
        <BulletPoint>Understanding platform usage trends.</BulletPoint>
        <BulletPoint>Enhancing product features based on anonymous usage insights.</BulletPoint>

        <Text className="text-base font-semibold mt-6 text-[#D4FF00]">8. Health & Fitness Information</Text>
        <Text className="text-sm text-white mt-3 leading-5 mb-2 font-sans">
          The health and fitness information you provide is used solely to personalize your experience within the platform. This may include:
        </Text>
        <BulletPoint>Fitness goals</BulletPoint>
        <BulletPoint>Workout preferences</BulletPoint>
        <BulletPoint>Height and weight</BulletPoint>
        <BulletPoint>Water intake goals</BulletPoint>
        <BulletPoint>Dietary preferences</BulletPoint>
        <BulletPoint>Workout history</BulletPoint>
        <BulletPoint>Challenge participation</BulletPoint>
        <BulletPoint>Progress tracking</BulletPoint>
        <Text className="text-sm text-white mt-3 leading-5 font-sans">
          This information is used only to improve recommendations and platform functionality.
        </Text>
        <Text className="text-sm text-[#A1A1AA] mt-3 leading-5 font-medium font-sans">
          Disclaimer: GK-GYMLIFE is not responsible for any adverse health issues or reactions resulting from diet or workout recommendations. Every body reacts differently to nutritional and physical changes. Please consult a healthcare professional before starting any new diet or fitness program.
        </Text>

        <Text className="text-base font-semibold mt-6 text-[#D4FF00]">9. Data Retention</Text>
        <Text className="text-sm text-white mt-3 leading-5 font-sans">
          User information is retained only for as long as necessary to provide platform services, maintain membership records, ensure platform security, and comply with applicable legal requirements.
        </Text>
        <Text className="text-sm text-white mt-3 leading-5 font-sans">
          Certain information, including workout history, attendance records, payment history, and membership records, may be retained for auditing, reporting, and operational purposes.
        </Text>

        <Text className="text-base font-semibold mt-6 text-[#D4FF00]">10. Changes to This Policy</Text>
        <Text className="text-sm text-white mt-3 leading-5 font-sans">
          GK-GYMLIFE may update this Privacy Policy periodically to reflect platform improvements, feature enhancements, legal requirements, or security updates.
        </Text>
        <Text className="text-sm text-white mt-3 leading-5 font-sans">
          Any changes will be published on this page along with the updated revision date.
        </Text>

        <Text className="text-base font-semibold mt-6 text-[#D4FF00]">11. Contact Us</Text>
        <Text className="text-sm text-white mt-3 leading-5 font-sans">
          If you have any questions or concerns regarding this Privacy Policy, you may contact the GK-GYMLIFE support team through the official platform.
        </Text>
        <Text className="text-sm text-[#A1A1AA] mt-3 leading-5 font-sans">Platform: GK-GYMLIFE</Text>
        <Text className="text-sm text-[#A1A1AA] mt-1 leading-5 font-sans">Purpose: Gym Management, Fitness Tracking & Wellness Platform</Text>

      </ScrollView>
    </View>
  );
}
