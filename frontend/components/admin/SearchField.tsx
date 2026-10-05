import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { ac, af, ar, cardShadow } from '../../constants/adminTheme';

type Props = { value: string; onChangeText: (text: string) => void; placeholder: string };

// Figma search bar (User Management 1:2209): white, 16px radius, soft shadow.
export default function SearchField({ value, onChangeText, placeholder }: Props) {
  return (
    <View style={styles.box}>
      <Ionicons name="search" size={22} color={ac.outline} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={ac.outline}
        style={styles.input}
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="search"
        maxLength={60}
        accessibilityLabel={placeholder}
      />
      {value ? (
        <Pressable onPress={() => onChangeText('')} hitSlop={8} accessibilityRole="button" accessibilityLabel="Clear search">
          <Ionicons name="close-circle" size={20} color={ac.outline} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: ac.card,
    borderRadius: ar.lg,
    paddingHorizontal: 16,
    minHeight: 52,
    ...cardShadow,
  },
  input: { outlineWidth: 0, outlineStyle: 'solid', flex: 1, minWidth: 0, fontFamily: af.body, fontSize: 15, color: ac.text, paddingVertical: 10 },
});
