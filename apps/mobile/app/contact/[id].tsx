import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, Linking } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { router, useLocalSearchParams } from 'expo-router';
import { Phone, MessageSquare, ArrowLeft, Trash2 } from 'lucide-react-native';
import { format } from 'date-fns';

const statusColors: Record<string, string> = {
  LEAD: '#3B82F6', PROSPECT: '#8B5CF6', CUSTOMER: '#10B981',
  CHURNED: '#9CA3AF', BLOCKED: '#EF4444',
};

export default function ContactDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['contact', id],
    queryFn: async () => { const { data } = await api.get(`/api/v1/contacts/${id}`); return data.data; },
  });

  const deleteContact = useMutation({
    mutationFn: () => api.delete(`/api/v1/contacts/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['contacts'] });
      router.back();
    },
  });

  const confirmDelete = () => {
    Alert.alert('Delete Contact', 'Are you sure? This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteContact.mutate() },
    ]);
  };

  if (isLoading || !data) {
    return <View style={styles.loading}><Text style={styles.loadingText}>Loading...</Text></View>;
  }

  return (
    <View style={styles.container}>
      <View style={styles.navbar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={20} color="#374151" />
        </TouchableOpacity>
        <Text style={styles.navTitle}>Contact</Text>
        <TouchableOpacity onPress={confirmDelete} style={styles.deleteBtn}>
          <Trash2 size={18} color="#EF4444" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{data.firstName[0]}{data.lastName?.[0] || ''}</Text>
          </View>
          <Text style={styles.fullName}>{data.firstName} {data.lastName}</Text>
          {data.company && <Text style={styles.company}>{data.company}</Text>}
          {data.jobTitle && <Text style={styles.jobTitle}>{data.jobTitle}</Text>}
          <View style={[styles.statusBadge, { backgroundColor: `${statusColors[data.status]}20` }]}>
            <Text style={[styles.statusText, { color: statusColors[data.status] }]}>{data.status}</Text>
          </View>
        </View>

        <View style={styles.actions}>
          <TouchableOpacity style={styles.actionBtn} onPress={() => Linking.openURL(`tel:${data.phone}`)}>
            <Phone size={20} color="#6366F1" />
            <Text style={styles.actionText}>Call</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={() => Linking.openURL(`sms:${data.phone}`)}>
            <MessageSquare size={20} color="#10B981" />
            <Text style={styles.actionText}>SMS</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Details</Text>
          {[
            { label: 'Phone', value: data.phone },
            { label: 'Email', value: data.email },
            { label: 'Company', value: data.company },
            { label: 'Job Title', value: data.jobTitle },
            { label: 'Source', value: data.source },
          ].filter((r) => r.value).map((row) => (
            <View key={row.label} style={styles.detailRow}>
              <Text style={styles.detailLabel}>{row.label}</Text>
              <Text style={styles.detailValue}>{row.value}</Text>
            </View>
          ))}
        </View>

        {data.deals?.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Deals ({data.deals.length})</Text>
            {data.deals.map((deal: any) => (
              <View key={deal.id} style={styles.dealRow}>
                <Text style={styles.dealName}>{deal.title}</Text>
                <Text style={styles.dealValue}>₹{deal.value?.toLocaleString('en-IN') || 0}</Text>
              </View>
            ))}
          </View>
        )}

        {data.activities?.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Recent Activity</Text>
            {data.activities.slice(0, 5).map((a: any) => (
              <View key={a.id} style={styles.activityRow}>
                <View style={styles.activityDot} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.activitySubject}>{a.subject}</Text>
                  <Text style={styles.activityTime}>{format(new Date(a.occurredAt), 'dd MMM, hh:mm a')}</Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { color: '#9CA3AF' },
  navbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  backBtn: { padding: 4 },
  navTitle: { fontSize: 16, fontWeight: '600', color: '#111827' },
  deleteBtn: { padding: 4 },
  content: { padding: 16, paddingBottom: 40 },
  profileCard: { backgroundColor: '#fff', borderRadius: 16, padding: 20, alignItems: 'center', marginBottom: 16 },
  avatar: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#EEF2FF', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  avatarText: { fontSize: 22, fontWeight: '700', color: '#6366F1' },
  fullName: { fontSize: 20, fontWeight: '700', color: '#111827' },
  company: { fontSize: 14, color: '#6B7280', marginTop: 2 },
  jobTitle: { fontSize: 13, color: '#9CA3AF', marginTop: 1 },
  statusBadge: { marginTop: 10, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20 },
  statusText: { fontSize: 12, fontWeight: '600' },
  actions: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  actionBtn: { flex: 1, backgroundColor: '#fff', borderRadius: 12, paddingVertical: 14, alignItems: 'center', gap: 6, borderWidth: 1, borderColor: '#E5E7EB' },
  actionText: { fontSize: 13, fontWeight: '600', color: '#374151' },
  section: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 12 },
  sectionTitle: { fontSize: 12, fontWeight: '700', color: '#6B7280', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F9FAFB' },
  detailLabel: { fontSize: 13, color: '#6B7280' },
  detailValue: { fontSize: 13, fontWeight: '500', color: '#111827', maxWidth: '60%', textAlign: 'right' },
  dealRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F9FAFB' },
  dealName: { fontSize: 13, color: '#374151' },
  dealValue: { fontSize: 13, fontWeight: '600', color: '#111827' },
  activityRow: { flexDirection: 'row', gap: 12, paddingVertical: 8 },
  activityDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#6366F1', marginTop: 4 },
  activitySubject: { fontSize: 13, color: '#374151' },
  activityTime: { fontSize: 11, color: '#9CA3AF', marginTop: 2 },
});
