import { StyleSheet, Text, View } from 'react-native';

import { cc, cf, cr } from '../../constants/customerTheme';
import { IconTile } from './CustomerPrimitives';

type Props = {
  title: string;
  message: string;
  // "amber": thumbs-up tile (Provider List); "blue": shield tile (Provider Details).
  tone?: 'amber' | 'blue';
};

// "Fix & Clean Guarantee" style trust card. Callers pass statements that the
// app actually enforces (admin verification, cash after the job, privacy).
export default function CustomerPromiseCard({ title, message, tone = 'amber' }: Props) {
  return (
    <View style={styles.card} accessible accessibilityLabel={`${title}. ${message}`}>
      {tone === 'amber' ? (
        <IconTile icon="thumb-up-outline" mc color={cc.amber} bg={cc.amberSoft} size={44} round />
      ) : (
        <IconTile icon="shield-outline" color={cc.onPrimary} bg={cc.primaryBright} size={44} round />
      )}
      <View style={styles.text}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.message}>{message}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: cc.containerHigh,
    borderRadius: cr.lg,
    paddingHorizontal: 16,
    paddingVertical: 18,
  },
  text: { flex: 1, gap: 3 },
  title: { fontFamily: cf.headingSemi, fontSize: 17, color: cc.text },
  message: { fontFamily: cf.body, fontSize: 13, lineHeight: 18, color: cc.textMuted },
});
