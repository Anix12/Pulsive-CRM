import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  Modal, ScrollView, TextInput, Alert,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Phone, PhoneOutgoing, PhoneIncoming, Plus, X, Search } from 'lucide-react-native';
import { format } from 'date-fns';
import { useState } from 'react';

const statusColors: Record<string, string> = {
  COMPLETED: '#10B981', FAILED: '#EF4444', IN_PROGRESS: '#3B82F6',
  RINGING: '#F59E0B', BUSY: '#F97316', NO_ANSWER: '#9CA3AF',
  INITIATED: '#6366F1', CANCELLED: '#9CA3AF',
};

function formatDuration(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function NewCallModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<any>(null);

  const { data: contacts } = useQuery({
    queryKey: ['contacts-picker', search],
    queryFn: async () => {
      const { data } = await api.get('/api/v1/contacts', { params: { search: search || undefined, limit: 20 } });
      return data.data || [];
    },
  });

  const initiate = useMutation({
    mutationFn: () => api.post('/api/v1/calls/initiate', { contactId: selected.id, toNumber: selected.phone }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['calls'] });
      Alert.alert('Call Initiated', `Calling ${selected.firstName} ${selected.lastName || ''}...`);
      setSelected(null);
      setSearch('');
      onClose();
    },
    onError: () => Alert.alert('Error', 'Failed to initiate call. Check your Twilio config.'),
  });

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={ms.header}>
        <Text style={ms.title}>New Call</Text>
        <TouchableOpacity onPress={onClose}><X size={22} color="#6B7280" /></TouchableOpacity>
      </View>

      <View style={ms.searchWrap}>
        <Search size={16} color="#9CA3AF" />
        <TextInput
          style={ms.searchInput}
          placeholder="Search contacts..."
          value={search}
          onChangeText={setSearch}
          placeholderTextColor="#9CA3AF"
          autoCapitalize="none"
        />
      </View>

      <ScrollView style={{ flex: 1 }}>
        {(contacts || []).map((c: any) => (
          <TouchableOpacity
            key={c.id}
            style={[ms.contactRow, selected?.id === c.id && ms.contactRowSelected]}
            onPress={() => setSelected(selected?.id === c.id ? null : c)}
          >
            <View style={ms.avatar}>
              <Text style={ms.avatarText}>{c.firstName[0]}{c.lastName?.[0] || ''}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={ms.contactName}>{c.firstName} {c.lastName}</Text>
              <Text style={ms.contactPhone}>{c.phone}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {selected && (
        <View style={ms.footer}>
          <Text style={ms.selectedText}>Calling: {selected.firstName} · {selected.phone}</Text>
          <TouchableOpacity
            style={[ms.callBtn, initiate.isPending && { opacity: 0.5 }]}
            onPress={() => initiate.mutate()}
            disabled={initiate.isPending}
          >
            <Phone size={18} color="#fff" />
            <Text style={ms.callBtnText}>{initiate.isPending ? 'Initiating...' : 'Call Now'}</Text>
          </TouchableOpacity>
        </View>
      )}
    </Modal>
  );
}

export default function CallsScreen() {
  const [showNew, setShowNew] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['calls'],
    queryFn: async () => { const { data } = await api.get('/api/v1/calls'); return data; },
    refetchInterval: 10000,
  });

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <Text style={styles.heading}>Call History</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => setShowNew(true)}>
          <Plus size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={data?.data || []}
        keyExtractor={(item: any) => item.id}
        renderItem={({ item }) => (
          <View style={styles.item}>
            <View style={[styles.iconWrap, { backgroundColor: `${statusColors[item.status] || '#9CA3AF'}15` }]}>
              {item.direction === 'OUTBOUND'
                ? <PhoneOutgoing size={18} color={statusColors[item.status] || '#9CA3AF'} />
                : <PhoneIncoming size={18} color={statusColors[item.status] || '#9CA3AF'} />}
            </View>
            <View style={styles.info}>
              <Text style={styles.contact}>
                {item.contact ? `${item.contact.firstName} ${item.contact.lastName || ''}` : item.toNumber}
              </Text>
              <Text style={styles.meta}>
                {item.direction === 'OUTBOUND' ? 'Outbound' : 'Inbound'} · {item.status}
                {item.duration ? ` · ${formatDuration(item.duration)}` : ''}
              </Text>
            </View>
            <Text style={styles.date}>{format(new Date(item.createdAt), 'dd MMM')}</Text>
          </View>
        )}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        contentContainerStyle={styles.list}
        ListEmptyComponent={() => !isLoading ? (
          <View style={styles.empty}>
            <Phone size={40} color="#E5E7EB" />
            <Text style={styles.emptyText}>No calls yet</Text>
          </View>
        ) : null}
      />

      <NewCallModal visible={showNew} onClose={() => setShowNew(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
  heading: { fontSize: 17, fontWeight: '700', color: '#111827' },
  addBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#6366F1', alignItems: 'center', justifyContent: 'center' },
  list: { paddingHorizontal: 16, paddingBottom: 32 },
  item: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, padding: 14, gap: 12 },
  iconWrap: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  info: { flex: 1 },
  contact: { fontSize: 14, fontWeight: '600', color: '#111827' },
  meta: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  date: { fontSize: 12, color: '#9CA3AF' },
  separator: { height: 8 },
  empty: { alignItems: 'center', paddingTop: 80, gap: 12 },
  emptyText: { fontSize: 14, color: '#9CA3AF' },
});

const ms = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  title: { fontSize: 18, fontWeight: '700', color: '#111827' },
  searchWrap: { flexDirection: 'row', alignItems: 'center', margin: 16, backgroundColor: '#F9FAFB', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, gap: 8, borderWidth: 1, borderColor: '#E5E7EB' },
  searchInput: { flex: 1, fontSize: 14, color: '#111827' },
  contactRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, gap: 12, borderBottomWidth: 1, borderBottomColor: '#F9FAFB' },
  contactRowSelected: { backgroundColor: '#EEF2FF' },
  avatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#EEF2FF', alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 13, fontWeight: '600', color: '#6366F1' },
  contactName: { fontSize: 14, fontWeight: '600', color: '#111827' },
  contactPhone: { fontSize: 12, color: '#6B7280', marginTop: 1 },
  footer: { padding: 16, borderTopWidth: 1, borderTopColor: '#F3F4F6', gap: 10 },
  selectedText: { fontSize: 13, color: '#6B7280', textAlign: 'center' },
  callBtn: { backgroundColor: '#6366F1', borderRadius: 12, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  callBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
