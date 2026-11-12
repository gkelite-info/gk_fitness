import React, { forwardRef } from 'react';
import {
  TextInput,
  TextInputProps,
} from 'react-native';

export interface SafePasswordInputProps extends TextInputProps {
  showPassword?: boolean;
}

export const SafePasswordInput = forwardRef<TextInput, SafePasswordInputProps>(
  (
    {
      value = '',
      onChangeText,
      showPassword = false,
      autoCapitalize = 'none',
      autoCorrect = false,
      spellCheck = false,
      ...props
    },
    ref
  ) => {
    return (
      <TextInput
        ref={ref}
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={!showPassword}
        autoCapitalize={autoCapitalize}
        autoCorrect={autoCorrect}
        spellCheck={spellCheck}
        {...props}
      />
    );
  }
);

SafePasswordInput.displayName = 'SafePasswordInput';

