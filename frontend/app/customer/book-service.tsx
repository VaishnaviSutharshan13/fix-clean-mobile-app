import { StyleSheet, Text, View } from 'react-native';

// Placeholder screen — real UI will be implemented in a later milestone.
export default function BookService() {
  return (
    <View style={styles.container}>
      <Text>Book Service</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
