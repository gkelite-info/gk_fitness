import React from 'react';
import {
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  StyleProp,
  ViewStyle,
  StyleSheet,
  ScrollViewProps,
} from 'react-native';

interface KeyboardDismissViewProps extends ScrollViewProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  contentContainerStyle?: StyleProp<ViewStyle>;
  keyboardVerticalOffset?: number;
  scrollable?: boolean;
}

/**
 * Drop-in iOS keyboard avoidance and interactive dismissal wrapper.
 * Strictly preserves exact styling and layout of underlying ScrollView or View.
 */
export function KeyboardDismissView({
  children,
  style,
  contentContainerStyle,
  keyboardVerticalOffset = Platform.OS === 'ios' ? 0 : 0,
  scrollable = true,
  ...otherProps
}: KeyboardDismissViewProps) {
  const behavior = Platform.OS === 'ios' ? 'padding' : undefined;

  if (!scrollable) {
    return (
      <KeyboardAvoidingView
        style={style}
        behavior={behavior}
        keyboardVerticalOffset={keyboardVerticalOffset}
      >
        {children}
      </KeyboardAvoidingView>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[{ flex: 1 }, style]}
      behavior={behavior}
      keyboardVerticalOffset={keyboardVerticalOffset}
    >
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={contentContainerStyle}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
        {...otherProps}
      >
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
