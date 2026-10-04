import { Text, View } from 'react-native';

import type { Provider } from '../types/provider';

// Placeholder — final design to be implemented later.
export type ProviderCardProps = {
  provider: Provider;
};

export default function ProviderCard({ provider }: ProviderCardProps) {
  return (
    <View>
      <Text>{provider.name}</Text>
    </View>
  );
}
