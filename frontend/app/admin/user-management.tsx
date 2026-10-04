import { StyleSheet, Text, View } from 'react-native';

// Placeholder screen — real UI will be implemented in a later milestone.
export default function UserManagement() {
  return (
    <View style={styles.container}>
      <Text>User Management</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
