import React, { forwardRef, useRef } from 'react';
import {
  TextInput,
  TextInputProps,
  Platform,
  NativeSyntheticEvent,
  TextInputSelectionChangeEventData,
} from 'react-native';

export interface SafePasswordInputProps extends TextInputProps {
  showPassword?: boolean;
}

const BULLET = '•';

export const SafePasswordInput = forwardRef<TextInput, SafePasswordInputProps>(
  (
    {
      value = '',
      onChangeText,
      showPassword = false,
      onSelectionChange,
      autoCapitalize = 'none',
      autoCorrect = false,
      spellCheck = false,
      ...props
    },
    ref
  ) => {
    const isAndroid = Platform.OS === 'android';
    const lastSelection = useRef({ start: (value || '').length, end: (value || '').length });

    const handleSelectionChange = (
      e: NativeSyntheticEvent<TextInputSelectionChangeEventData>
    ) => {
      lastSelection.current = e.nativeEvent.selection;
      onSelectionChange?.(e);
    };

    // On iOS, native secureTextEntry does not trigger WhatsApp screen-sharing black screen
    if (!isAndroid) {
      return (
        <TextInput
          ref={ref}
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={!showPassword}
          autoCapitalize={autoCapitalize}
          autoCorrect={autoCorrect}
          spellCheck={spellCheck}
          onSelectionChange={onSelectionChange}
          {...props}
        />
      );
    }

    // On Android, native secureTextEntry triggers OS-level MediaProjection / SurfaceFlinger
    // frame suppression (black screen) during screen sharing (WhatsApp, Zoom, Meet).
    // When password is hidden, we display clean bullet characters ('•') without marking
    // the native Android view as InputType.TYPE_TEXT_VARIATION_PASSWORD.
    const displayValue = showPassword ? value : BULLET.repeat((value || '').length);

    const handleAndroidTextChange = (newText: string) => {
      if (!onChangeText) return;

      if (showPassword) {
        onChangeText(newText);
        return;
      }

      // Empty text
      if (!newText || newText.length === 0) {
        onChangeText('');
        return;
      }

      // Entirely new text without bullets (e.g. paste or autofill)
      if (!newText.includes(BULLET)) {
        onChangeText(newText);
        return;
      }

      const currentActual = value || '';

      // Deletion (e.g. backspace)
      if (newText.length < currentActual.length) {
        const deletedCount = currentActual.length - newText.length;
        let deleteStart = currentActual.length - deletedCount;
        const sel = lastSelection.current;
        if (sel && sel.start > 0) {
          if (sel.start !== sel.end) {
            deleteStart = Math.min(sel.start, sel.end);
          } else {
            deleteStart = Math.max(0, sel.start - deletedCount);
          }
        }
        const updated =
          currentActual.slice(0, deleteStart) +
          currentActual.slice(deleteStart + deletedCount);
        onChangeText(updated);
        return;
      }

      // Insertion (typing a character or pasting into masked text)
      if (newText.length > currentActual.length) {
        const addedCount = newText.length - currentActual.length;
        let insertIndex = -1;
        for (let i = 0; i < newText.length; i++) {
          if (newText[i] !== BULLET) {
            insertIndex = i;
            break;
          }
        }
        if (insertIndex === -1) {
          const sel = lastSelection.current;
          insertIndex =
            sel && sel.start >= 0 ? sel.start : currentActual.length;
        }
        const addedChars = newText.slice(insertIndex, insertIndex + addedCount);
        const updated =
          currentActual.slice(0, insertIndex) +
          addedChars +
          currentActual.slice(insertIndex);
        onChangeText(updated);
        return;
      }

      // Character replacement (same length)
      if (
        newText.length === currentActual.length &&
        newText !== BULLET.repeat(currentActual.length)
      ) {
        let replaceIndex = -1;
        for (let i = 0; i < newText.length; i++) {
          if (newText[i] !== BULLET) {
            replaceIndex = i;
            break;
          }
        }
        if (replaceIndex !== -1) {
          const updated =
            currentActual.slice(0, replaceIndex) +
            newText[replaceIndex] +
            currentActual.slice(replaceIndex + 1);
          onChangeText(updated);
          return;
        }
      }

      onChangeText(currentActual);
    };

    return (
      <TextInput
        ref={ref}
        value={displayValue}
        onChangeText={handleAndroidTextChange}
        secureTextEntry={false}
        autoComplete="off"
        textContentType="none"
        importantForAutofill="no"
        autoCapitalize={autoCapitalize}
        autoCorrect={autoCorrect}
        spellCheck={spellCheck}
        onSelectionChange={handleSelectionChange}
        {...props}
      />
    );
  }
);

SafePasswordInput.displayName = 'SafePasswordInput';

