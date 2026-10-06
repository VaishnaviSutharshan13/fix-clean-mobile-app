import type { ReactNode, Ref } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
  type RefreshControlProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { cc, GUTTER } from '../../constants/customerTheme';

type Props = {
  children: ReactNode;
  header?: ReactNode;
  // Pinned under the scroll area (e.g. the Provider Details "BOOK NOW" bar).
  footer?: ReactNode;
  // Pinned bottom navigation (Home, Provider List).
  bottomNav?: ReactNode;
  refreshControl?: React.ReactElement<RefreshControlProps>;
  scrollRef?: Ref<ScrollView>;
  contentStyle?: StyleProp<ViewStyle>;
};

// Customer page frame: lavender background, safe areas, keyboard-aware scroll
// body with the reference 16px gutter, optional pinned footer / bottom nav.
export default function CustomerScreen({ children, header, footer, bottomNav, refreshControl, scrollRef, contentStyle }: Props) {
  return (
    <SafeAreaView style={styles.safe} edges={bottomNav || footer ? ['top', 'bottom'] : ['top']}>
      {header}
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          ref={scrollRef}
          style={styles.flex}
          contentContainerStyle={[styles.content, contentStyle]}
          keyboardShouldPersistTaps="handled"
          refreshControl={refreshControl}
        >
          {children}
        </ScrollView>
        {footer ? <View style={styles.footer}>{footer}</View> : null}
      </KeyboardAvoidingView>
      {bottomNav}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: cc.bg },
  flex: { flex: 1 },
  content: { paddingHorizontal: GUTTER, paddingTop: 12, paddingBottom: 28, gap: 16, flexGrow: 1 },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: GUTTER,
    paddingVertical: 12,
    backgroundColor: cc.card,
    shadowColor: cc.shadow,
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: -2 },
    elevation: 6,
  },
});
