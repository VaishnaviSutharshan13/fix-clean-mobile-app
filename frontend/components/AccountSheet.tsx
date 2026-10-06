import { Ionicons } from '@expo/vector-icons';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { cc, cf, cr } from '../constants/customerTheme';
import { useAuth } from '../hooks/useAuth';
import { photoUri, userService } from '../services/userService';
import { getFriendlyErrorMessage } from '../utils/helpers';
import CustomerAvatar from './customer/CustomerAvatar';

// One AccountSheetHost is mounted per signed-in area (customer, provider);
// avatars and the Account tab open it with openAccountSheet().
let open: (() => void) | null = null;
export function openAccountSheet(): void {
  open?.();
}

const ROLE_LABEL = { customer: 'Customer', provider: 'Service provider', admin: 'Administrator' } as const;

type ActionProps = {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  onPress: () => void;
  danger?: boolean;
  disabled?: boolean;
};

function Action({ icon, label, onPress, danger, disabled }: ActionProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [styles.action, pressed && styles.pressed, disabled && styles.disabled]}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
    >
      <Ionicons name={icon} size={21} color={danger ? cc.danger : cc.primary} />
      <Text style={[styles.actionText, danger && styles.dangerText]}>{label}</Text>
    </Pressable>
  );
}

// Account menu: change / remove the profile photo and sign out.
export function AccountSheetHost() {
  const { user, logout, refreshUser } = useAuth();
  const insets = useSafeAreaInsets();
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState<'upload' | 'remove' | null>(null);
  const [error, setError] = useState<string>();

  useEffect(() => {
    open = () => {
      setError(undefined);
      setVisible(true);
    };
    return () => {
      open = null;
    };
  }, []);

  if (!user) return null;
  const close = () => !busy && setVisible(false);

  const changePhoto = async () => {
    setError(undefined);
    const picked = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });
    if (picked.canceled || !picked.assets[0]) return;
    setBusy('upload');
    try {
      // Square-cropped by the picker; resized here so uploads stay small.
      const photo = await manipulateAsync(picked.assets[0].uri, [{ resize: { width: 512 } }], {
        compress: 0.7,
        format: SaveFormat.JPEG,
        base64: true,
      });
      await userService.setAvatar(`data:image/jpeg;base64,${photo.base64}`);
      await refreshUser();
    } catch (err) {
      setError(getFriendlyErrorMessage(err, { 400: 'That image could not be used. Please choose a JPEG or PNG photo.' }));
    } finally {
      setBusy(null);
    }
  };

  const removePhoto = async () => {
    setError(undefined);
    setBusy('remove');
    try {
      await userService.removeAvatar();
      await refreshUser();
    } catch (err) {
      setError(getFriendlyErrorMessage(err));
    } finally {
      setBusy(null);
    }
  };

  const signOut = async () => {
    setVisible(false);
    await logout();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={close}>
      <Pressable style={styles.backdrop} onPress={close} accessibilityLabel="Close account menu" />
      <View style={[styles.sheet, { paddingBottom: 20 + insets.bottom }]} accessibilityViewIsModal>
        <View style={styles.handle} />
        <View style={styles.profile}>
          <CustomerAvatar name={user.name} size={72} shape="circle" ring imageUrl={photoUri(user.avatarUrl)} bg={cc.containerHigh} />
          <View style={styles.profileText}>
            <Text style={styles.name} numberOfLines={1}>
              {user.name}
            </Text>
            <Text style={styles.email} numberOfLines={1}>
              {user.email}
            </Text>
            <Text style={styles.role}>{ROLE_LABEL[user.role]}</Text>
          </View>
        </View>

        {busy ? (
          <View style={styles.busy} accessibilityLiveRegion="polite">
            <ActivityIndicator color={cc.primary} />
            <Text style={styles.email}>{busy === 'upload' ? 'Uploading photo…' : 'Removing photo…'}</Text>
          </View>
        ) : null}
        {error ? (
          <Text style={styles.error} accessibilityRole="alert">
            {error}
          </Text>
        ) : null}

        <Action
          icon="camera-outline"
          label={user.avatarUrl ? 'Change profile photo' : 'Add profile photo'}
          onPress={changePhoto}
          disabled={!!busy}
        />
        {user.avatarUrl ? (
          <Action icon="trash-outline" label="Remove photo" onPress={removePhoto} disabled={!!busy} />
        ) : null}
        <Action icon="log-out-outline" label="Sign out" onPress={signOut} danger disabled={!!busy} />
        <Action icon="close" label="Close" onPress={close} disabled={!!busy} />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(19,27,46,0.4)' },
  sheet: {
    backgroundColor: cc.card,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: 16,
    paddingTop: 10,
    gap: 6,
  },
  handle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: cc.outlineSoft, marginBottom: 8 },
  profile: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingBottom: 12 },
  profileText: { flex: 1, minWidth: 0, gap: 2 },
  name: { fontFamily: cf.heading, fontSize: 19, color: cc.text },
  email: { fontFamily: cf.body, fontSize: 14, color: cc.textMuted },
  role: { fontFamily: cf.semibold, fontSize: 12, color: cc.primary },
  busy: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 },
  error: { fontFamily: cf.medium, fontSize: 13, color: cc.danger },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    minHeight: 52,
    paddingHorizontal: 12,
    borderRadius: cr.md,
    backgroundColor: cc.containerLow,
  },
  pressed: { opacity: 0.8 },
  disabled: { opacity: 0.5 },
  actionText: { fontFamily: cf.semibold, fontSize: 16, color: cc.text },
  dangerText: { color: cc.danger },
});
