import React from 'react';
import { View, TouchableOpacity, TouchableWithoutFeedback, Dimensions, Text } from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  House,
  User,
  Headphones,
  Barbell,
  ChartLineUp,
  Users,
  Calendar,
  ChatCircle,
  Gear,
  Buildings,
  ClipboardText,
} from 'phosphor-react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export function CustomTabBar({
  state,
  descriptors,
  navigation,
  centerRouteName,
}: BottomTabBarProps & { centerRouteName: string }) {
  const insets = useSafeAreaInsets();
  const bottomInset = insets.bottom || 0;

  return (
    <View
      className="absolute bottom-0 bg-transparent"
      style={{ width: SCREEN_WIDTH, height: 75 + bottomInset }}
    >
      {/* Dark background container */}
      <View
        className="absolute bottom-0 left-0 right-0 bg-[#121214] border-t border-[#27272A] rounded-t-[20px]"
        style={{ height: 58 + bottomInset }}
      />
      <View
        className="flex-row absolute left-0 right-0 items-center justify-between"
        style={{ height: 58, bottom: bottomInset }}
      >
        {state.routes.map((route, index) => {
          const isFocused = state.index === index;
          const { options } = descriptors[route.key];

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          const isCenter = route.name === centerRouteName;
          const activeColor = '#C4EF00';
          const inactiveColor = '#71717A';
          const iconColor = isFocused ? activeColor : inactiveColor;
          const iconSize = 22;

          if (isCenter) {
            return (
              <View key={route.key} className="flex-1 items-center justify-center">
                <TouchableWithoutFeedback onPress={onPress}>
                  <View
                    className="absolute -top-[60px] w-[65px] h-[65px] rounded-full bg-[#C4EF00] items-center justify-center border-[4px] border-[#09090B]"
                    style={{
                      shadowColor: '#C4EF00',
                      shadowOffset: { width: 0, height: 4 },
                      shadowOpacity: 0.45,
                      shadowRadius: 6,
                      elevation: 8,
                    }}
                  >
                    <House size={26} color="#000000" weight="fill" />
                  </View>
                </TouchableWithoutFeedback>
              </View>
            );
          }

          const renderIcon = () => {
            const name = route.name.toLowerCase();
            if (name.includes('gym')) return <Buildings size={iconSize} color={iconColor} weight={isFocused ? 'fill' : 'regular'} />;
            if (name.includes('owner')) return <Users size={iconSize} color={iconColor} weight={isFocused ? 'fill' : 'regular'} />;
            if (name.includes('support')) return <Headphones size={iconSize} color={iconColor} weight={isFocused ? 'fill' : 'regular'} />;
            if (name.includes('profile')) return <User size={iconSize} color={iconColor} weight={isFocused ? 'fill' : 'regular'} />;
            if (name.includes('user')) return <Users size={iconSize} color={iconColor} weight={isFocused ? 'fill' : 'regular'} />;
            if (name.includes('analytic')) return <ChartLineUp size={iconSize} color={iconColor} weight={isFocused ? 'fill' : 'regular'} />;
            if (name.includes('setting')) return <Gear size={iconSize} color={iconColor} weight={isFocused ? 'fill' : 'regular'} />;
            if (name.includes('workout')) return <Barbell size={iconSize} color={iconColor} weight={isFocused ? 'fill' : 'regular'} />;
            if (name.includes('progress')) return <ChartLineUp size={iconSize} color={iconColor} weight={isFocused ? 'fill' : 'regular'} />;
            if (name.includes('community')) return <Users size={iconSize} color={iconColor} weight={isFocused ? 'fill' : 'regular'} />;
            if (name.includes('schedule')) return <Calendar size={iconSize} color={iconColor} weight={isFocused ? 'fill' : 'regular'} />;
            if (name.includes('message')) return <ChatCircle size={iconSize} color={iconColor} weight={isFocused ? 'fill' : 'regular'} />;
            if (name.includes('patient')) return <ClipboardText size={iconSize} color={iconColor} weight={isFocused ? 'fill' : 'regular'} />;
            return <User size={iconSize} color={iconColor} weight={isFocused ? 'fill' : 'regular'} />;
          };

          const label = options.title !== undefined ? options.title : route.name;

          return (
            <TouchableOpacity
              key={route.key}
              onPress={onPress}
              activeOpacity={0.7}
              className="flex-1 items-center justify-center pt-1"
            >
              {renderIcon()}
              <Text
                className={`text-[10px] mt-1 font-medium tracking-wider ${isFocused ? 'text-[#C4EF00]' : 'text-[#71717A]'
                  }`}
              >
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}
