import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

import { cc, cf } from '../../constants/customerTheme';
import { getInitials } from '../../utils/helpers';

type Props = {
  name: string;
  size?: number;
  shape?: 'square' | 'circle';
  verified?: boolean;
  online?: boolean;
  tint?: string;
  bg?: string;
  ring?: boolean;
  imageUrl?: string;
};

// Avatar: a real image when one is passed, otherwise clean initials.
export default function CustomerAvatar({
  name,
  size = 56,
  shape = 'circle',
  verified,
  online,
  tint = cc.primary,
  bg = cc.primaryFixed,
  ring,
  imageUrl,
}: Props) {
  const r = shape === 'circle' ? size / 2 : Math.round(size * 0.22);
  const badge = Math.max(18, Math.round(size * 0.34));
  // Only a real image URL is shown; otherwise initials (no stock photos of strangers).
  const resolvedUrl = imageUrl;
  const [imageError, setImageError] = useState(false);

  return (
    <View style={{ width: size, height: size }} importantForAccessibility="no" accessibilityElementsHidden>
      <View
        style={[
          styles.face,
          { width: size, height: size, borderRadius: r, backgroundColor: bg },
          ring && styles.ring,
        ]}
      >
        {resolvedUrl && !imageError ? (
          <Image
            source={{ uri: resolvedUrl }}
            style={{ width: size, height: size, borderRadius: r }}
            resizeMode="cover"
            onError={() => setImageError(true)}
          />
        ) : (
          <Text style={[styles.initials, { color: tint, fontSize: Math.round(size * 0.36) }]}>
            {getInitials(name)}
          </Text>
        )}
      </View>
      {verified ? (
        <View style={[styles.badge, { width: badge, height: badge, borderRadius: badge / 2 }]}>
          <Ionicons name="checkmark" size={Math.round(badge * 0.62)} color={cc.onPrimary} />
        </View>
      ) : null}
      {online ? <View style={styles.online} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  face: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  ring: { borderWidth: 3, borderColor: cc.card },
  initials: { fontFamily: cf.heading },
  badge: {
    position: 'absolute',
    right: -3,
    bottom: -3,
    backgroundColor: cc.success,
    borderWidth: 2,
    borderColor: cc.card,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  online: {
    position: 'absolute',
    right: -1,
    bottom: -1,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#00A86B',
    borderWidth: 2,
    borderColor: cc.card,
    zIndex: 2,
  },
});
