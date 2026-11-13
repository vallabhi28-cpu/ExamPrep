import { View, Text, StyleSheet } from 'react-native';
import { Link } from 'expo-router';
import { Colors, Spacing } from '@/constants/theme';

export default function NotFoundScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.code}>404</Text>
      <Text style={styles.title}>Page not found</Text>
      <Link href="/(auth)/login" style={styles.link}>
        Return to login
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.bg, padding: Spacing.lg },
  code: { fontSize: 64, fontWeight: '800', color: Colors.bgTertiary, marginBottom: 8 },
  title: { fontSize: 17, fontWeight: '500', color: Colors.textSecondary, marginBottom: 24 },
  link: { color: Colors.primary, fontSize: 15, fontWeight: '600' },
});
