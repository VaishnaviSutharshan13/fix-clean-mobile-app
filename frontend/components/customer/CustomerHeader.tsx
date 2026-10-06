import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { cc, cf, GUTTER } from '../../constants/customerTheme';
import { useAuth } from '../../hooks/useAuth';
import { notificationService } from '../../services/notificationService';
import { latestUnreadBookingId } from '../../utils/notifications';
import CustomerAvatar from './CustomerAvatar';
import { openAccountSheet } from '../AccountSheet';
import { photoUri } from '../../services/userService';

// Opens the account menu (profile photo, sign out).
export function useAccountPrompt() {
  return openAccountSheet;
}

// The signed-in customer's avatar. Opens the account menu.
export function AccountButton({ size = 36 }: { size?: number }) {
  const { user } = useAuth();
  const openAccount = useAccountPrompt();
  return (
    <Pressable onPress={openAccount} hitSlop={6} accessibilityRole="button" accessibilityLabel="Account and sign out">
      <CustomerAvatar
        name={user?.name ?? 'Customer'}
        size={size}
        shape="circle"
        bg={cc.containerHigh}
        imageUrl={photoUri(user?.avatarUrl)}
      />
    </Pressable>
  );
}

// Bell backed by stored notifications (GET /notifications/me). The dot shows
// an unread booking update; tapping opens that booking's Track Booking screen,
// where the update is shown and marked read when dismissed.
function NotificationBell() {
  const [bookingId, setBookingId] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      notificationService
        .listMine()
        .then((list) => active && setBookingId(latestUnreadBookingId(list.items)))
        .catch(() => active && setBookingId(null));
      return () => {
        active = false;
      };
    }, []),
  );

  return (
    <Pressable
      onPress={() => bookingId && router.push({ pathname: '/customer/track-booking', params: { id: bookingId } })}
      disabled={!bookingId}
      hitSlop={8}
      style={styles.bell}
      accessibilityRole="button"
      accessibilityLabel={bookingId ? 'New booking update. Opens Track Booking' : 'No new notifications'}
      accessibilityState={{ disabled: !bookingId }}
    >
      <Ionicons name="notifications-outline" size={24} color={cc.text} />
      {bookingId ? <View style={styles.bellDot} /> : null}
    </Pressable>
  );
}

// Home / Provider List top bar (reference: brand tile, two-line title, bell, avatar).
export function CustomerTopBar({ title = 'Explore Services' }: { title?: string }) {
  return (
    <View style={styles.bar}>
      <View style={styles.logo}>
        <MaterialCommunityIcons name="hammer-wrench" size={24} color={cc.onPrimary} />
      </View>
      <View style={styles.brand}>
        <Text style={styles.brandSmall} numberOfLines={1}>
          Fix &amp; Clean Co.
        </Text>
        <Text style={styles.brandTitle} numberOfLines={1} accessibilityRole="header">
          {title}
        </Text>
      </View>
      <NotificationBell />
      <AccountButton />
    </View>
  );
}

// Detail screen header (reference: back arrow, left-aligned title, 3-dots menu, avatar).
export function CustomerHeader({
  title,
  onBack,
  right,
  showMore = true,
}: {
  title: string;
  onBack?: () => void;
  right?: ReactNode;
  showMore?: boolean;
}) {
  const openAccount = useAccountPrompt();
  const goBack = () => {
    if (onBack) return onBack();
    if (router.canGoBack()) router.back();
    else router.replace('/customer/home');
  };
  return (
    <View style={styles.bar}>
      <Pressable onPress={goBack} hitSlop={12} accessibilityRole="button" accessibilityLabel="Go back" style={styles.back}>
        <Ionicons name="arrow-back" size={24} color={cc.text} />
      </Pressable>
      <Text style={styles.title} numberOfLines={1} accessibilityRole="header">
        {title}
      </Text>
      {right}
      {showMore ? (
        <Pressable onPress={openAccount} hitSlop={10} style={styles.moreBtn} accessibilityRole="button" accessibilityLabel="More options">
          <Ionicons name="ellipsis-vertical" size={20} color={cc.text} />
        </Pressable>
      ) : null}
      <AccountButton />
    </View>
  );
}

// Secondary row under a detail header: "‹ Back · LABEL · right" (Book Service,
// Track Booking, Confirmation references).
export function SubNavRow({
  backLabel,
  onBack,
  center,
  right,
}: {
  backLabel?: string;
  onBack?: () => void;
  center?: string;
  right?: ReactNode;
}) {
  return (
    <View style={styles.subRow}>
      <View style={styles.subSide}>
        {backLabel && onBack ? (
          <Pressable onPress={onBack} hitSlop={10} style={styles.subBack} accessibilityRole="button" accessibilityLabel={backLabel}>
            <Ionicons name="chevron-back" size={18} color={cc.primary} />
            <Text style={styles.subBackText}>{backLabel}</Text>
          </Pressable>
        ) : null}
      </View>
      {center ? <Text style={styles.subCenter}>{center}</Text> : null}
      <View style={[styles.subSide, styles.subRight]}>{right}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: GUTTER,
    paddingVertical: 12,
    backgroundColor: cc.bg,
    shadowColor: cc.shadow,
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    zIndex: 2,
  },
  logo: {
    width: 42,
    height: 42,
    borderRadius: 10,
    backgroundColor: cc.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brand: { flex: 1, minWidth: 0 },
  brandSmall: { fontFamily: cf.semibold, fontSize: 12, color: cc.amber },
  brandTitle: { fontFamily: cf.heading, fontSize: 19, color: cc.text, letterSpacing: -0.3 },
  bell: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  bellDot: {
    position: 'absolute',
    top: 6,
    right: 7,
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: cc.amberBright,
    borderWidth: 1.5,
    borderColor: cc.bg,
  },
  back: { width: 32, height: 36, justifyContent: 'center' },
  moreBtn: { width: 30, height: 36, alignItems: 'center', justifyContent: 'center' },
  title: { flex: 1, minWidth: 0, fontFamily: cf.headingSemi, fontSize: 19, color: cc.text },
  subRow: { flexDirection: 'row', alignItems: 'center', minHeight: 28 },
  subSide: { flex: 1, flexDirection: 'row' },
  subRight: { justifyContent: 'flex-end' },
  subBack: { flexDirection: 'row', alignItems: 'center', gap: 2, minHeight: 28 },
  subBackText: { fontFamily: cf.semibold, fontSize: 15, color: cc.primary },
  subCenter: { fontFamily: cf.semibold, fontSize: 12, color: cc.textSubtle, letterSpacing: 1 },
});
