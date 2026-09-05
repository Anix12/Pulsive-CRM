import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useAuthStore } from '@/store/auth.store';
import { router } from 'expo-router';
import { LogOut, User, Building2, Shield } from 'lucide-react-native';

export default function SettingsScreen() {
  const { user, logout } = useAuthStore();

  const confirmLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out', style: 'destructive', onPress: async () => {
          await logout();
          router.replace('/(auth)/login');
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <View style={styles.profileCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {user?.firstName?.[0]}{user?.lastName?.[0] || ''}
          </Text>
        </View>
        <View>
          <Text style={styles.name}>{user?.firstName} {user?.lastName}</Text>
          <Text style={styles.email}>{user?.email}</Text>
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.row}>
          <View style={styles.rowLeft}>
            <Shield size={16} color="#6B7280" />
            <Text style={styles.rowLabel}>Role</Text>
          </View>
          <Text style={styles.rowValue}>{user?.role}</Text>
        </View>
        <View style={[styles.row, { borderBottomWidth: 0 }]}>
          <View style={styles.rowLeft}>
            <Building2 size={16} color="#6B7280" />
            <Text style={styles.rowLabel}>Tenant ID</Text>
          </View>
          <Text style={styles.rowValue} numberOfLines={1}>{user?.tenantId?.slice(0, 8)}...</Text>
        </View>
      </View>

      <TouchableOpacity style={styles.logoutBtn} onPress={confirmLogout}>
        <LogOut size={18} color="#EF4444" />
        <Text style={styles.logoutText}>Sign Out</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB', padding: 16 },
  profileCard: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 16 },
  avatar: { width: 52, height: 52, borderRadius: 26, backgroundColor: '#EEF2FF', alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 18, fontWeight: '700', color: '#6366F1' },
  name: { fontSize: 16, fontWeight: '700', color: '#111827' },
  email: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  section: { backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 16, marginBottom: 16 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  rowLabel: { fontSize: 14, color: '#374151' },
  rowValue: { fontSize: 13, color: '#6B7280', maxWidth: 160 },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#FEF2F2', borderRadius: 12, paddingVertical: 14 },
  logoutText: { fontSize: 15, fontWeight: '600', color: '#EF4444' },
});
