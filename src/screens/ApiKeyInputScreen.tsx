import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import React, { useMemo, useState } from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { validateApiKey } from '../api';
import type { RootStackParamList } from '../navigation/types';
import { saveApiKey } from '../storage';
import {
  useTheme,
  COLORS,
  SPACING,
  FONT_SIZES,
  BORDER_RADIUS,
  MIN_TOUCH_TARGET,
} from '../theme';

type ApiKeyInputNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'ApiKeyInput'
>;

export function ApiKeyInputScreen() {
  const navigation = useNavigation<ApiKeyInputNavigationProp>();
  const { colors, shadow } = useTheme();
  const [apiKey, setApiKey] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dynamicStyles = useMemo(
    () => ({
      primaryButtonText: {
        color: colors.text.inverse,
      },
    }),
    [colors.text.inverse],
  );

  const handleValidate = async () => {
    const trimmedKey = apiKey.trim();
    if (!trimmedKey) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await validateApiKey(trimmedKey);

      if (result.success) {
        await saveApiKey(trimmedKey);
        navigation.navigate('Sync');
      } else {
        setError(
          "That API key didn't work. Double-check you copied the full key and try again.",
        );
      }
    } catch {
      setError(
        "Couldn't reach WaniKani. Check your internet connection and try again.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View
      style={[styles.container, { backgroundColor: colors.background.primary }]}
      testID="api-key-input-screen"
    >
      <View style={styles.content}>
        <Text style={[styles.title, { color: colors.text.primary }]}>
          Enter Your API Key
        </Text>

        <Text style={[styles.description, { color: colors.text.secondary }]}>
          Paste the API key you copied from WaniKani
        </Text>

        <TextInput
          style={[
            styles.input,
            {
              color: colors.text.primary,
              backgroundColor: colors.background.input,
              borderColor: error
                ? COLORS.feedback.incorrect
                : colors.border.medium,
            },
          ]}
          value={apiKey}
          onChangeText={text => {
            setApiKey(text);
            if (error) {
              setError(null);
            }
          }}
          placeholder="Paste your API key here"
          placeholderTextColor={colors.text.placeholder}
          cursorColor={colors.text.primary}
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
          testID="api-key-input"
        />

        {error && (
          <Text
            style={[styles.errorText, { color: COLORS.feedback.incorrect }]}
            testID="error-message"
          >
            {error}
          </Text>
        )}

        <TouchableOpacity
          style={[
            styles.primaryButton,
            {
              backgroundColor: COLORS.subject.vocabulary,
              shadowColor: shadow.color,
              shadowOffset: shadow.offset,
              shadowOpacity: shadow.opacity,
              shadowRadius: shadow.radius,
            },
            (isLoading || !apiKey.trim()) && styles.buttonDisabled,
          ]}
          onPress={handleValidate}
          activeOpacity={0.8}
          disabled={isLoading || !apiKey.trim()}
          testID="validate-button"
        >
          <Text style={[styles.primaryButtonText, dynamicStyles.primaryButtonText]}>
            {isLoading ? 'Validating...' : 'Validate & Connect'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.secondaryButton,
            { borderColor: colors.border.medium },
          ]}
          onPress={() => navigation.goBack()}
          activeOpacity={0.8}
          disabled={isLoading}
          testID="back-button"
        >
          <Text
            style={[
              styles.secondaryButtonText,
              { color: colors.text.secondary },
            ]}
          >
            Back
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: SPACING.xxl,
  },
  title: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: SPACING.lg,
  },
  description: {
    fontSize: FONT_SIZES.base,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: SPACING.xxl,
  },
  input: {
    fontSize: FONT_SIZES.base,
    paddingVertical: SPACING.lg,
    paddingHorizontal: SPACING.lg,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    marginBottom: SPACING.md,
  },
  errorText: {
    fontSize: FONT_SIZES.sm,
    marginBottom: SPACING.md,
  },
  primaryButton: {
    paddingVertical: SPACING.lg,
    minHeight: MIN_TOUCH_TARGET,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
  },
  primaryButtonText: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
  },
  secondaryButton: {
    paddingVertical: SPACING.lg,
    minHeight: MIN_TOUCH_TARGET,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  secondaryButtonText: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '500',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});
