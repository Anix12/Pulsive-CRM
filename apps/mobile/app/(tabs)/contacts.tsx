import {
  View, Text, FlatList, TextInput, TouchableOpacity,
  StyleSheet, Modal, Alert, ScrollView, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useState } from 'react';
import { router } from 'expo-router';
import { Search, Plus, X } from 'lucide-react-native';

const statusColors: Record<string, string> = {
  LEAD: '#3B82F6', PROSPECT: '#8B5CF6', CUSTOMER: '#10B981',
  CHURNED: '#9CA3AF', BLOCKED: '#EF4444',
};

const STATUSES = ['LEAD', 'PROSPECT', 'CUSTOMER', 'CHURNED', 'BLOCKED'];

function CreateContactModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({ firstName: '', lastName: '', phone: '', email: '', company: '', status: 'LEAD' });
  const [error, setError] = useState('');

  const create = useMutation({
    mutationFn: () => api.post('/api/v1/contacts', form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['contacts'] });
      setForm({ firstName: '', lastName: '', phone: '', email: '', company: '', status: 'LEAD' });
      onClose();
    },
    onError: () => setError('Failed to create contact'),
  });

  const submit = () => {
    if (!form.firstName.trim()) { setError('First name is required'); return; }
    if (!form.phone.trim()) { setError('Phone is required'); return; }
    setError('');
    create.mutate();
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <View style={ms.header}>
          <Text style={ms.title}>New Contact</Text>
          <TouchableOpacity onPress={onClose}><X size={22} color="#6B7280" /></TouchableOpacity>
        </View>
        <ScrollView style={ms.body} keyboardShouldPersistTaps="handled">
          {[
            { key: 'firstName', label: 'First Name *', placeholder: 'John' },
            { key: 'lastName', label: 'Last Name', placeholder: 'Doe' },
            { key: 'phone', label: 'Phone *', placeholder: '+91 98765 43210', keyboard: 'phone-pad' },
            { key: 'email', label: 'Email', placeholder: 'john@example.com', keyboard: 'email-address' },
            { key: 'company', label: 'Company', placeholder: 'Acme Inc' },
          ].map((f) => (
            <View key={f.key} style={ms.field}>
              <Text style={ms.label}>{f.label}</Text>
              <TextInput
                style={ms.input}
                placeholder={f.placeholder}
                placeholderTextColor="#9CA3AF"
                value={(form as any)[f.key]}
                onChangeText={(v) => setForm((p) => ({ ...p, [f.key]: v }))}
                keyboardType={(f.keyboard as any) || 'default'}
                autoCapitalize={f.keyboard ? 'none' : 'words'}
              />
            </View>
          ))}
          <View style={ms.field}>
            <Text style={ms.label}>Status</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 6 }}>
              {STATUSES.map((s) => (
                <TouchableOpacity
                  key={s}
                  onPress={() => setForm((p) => ({ ...p, status: s }))}
                  style={[ms.statusChip, form.status === s && { backgroundColor: statusColors[s] }]}
                >
                  <Text style={[ms.statusChipText, form.status === s && { color: '#fff' }]}>{s}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
          {error ? <Text style={ms.error}>{error}</Text> : null}
          <TouchableOpacity
            style={[ms.btn, create.isPending && { opacity: 0.5 }]}
            onPress={submit}
            disabled={create.isPending}
          >
            <Text style={ms.btnText}>{create.isPending ? 'Creating...' : 'Create Contact'}</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export default function ContactsScreen() {
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['contacts', search],
    queryFn: async () => {
      const { data } = await api.get('/api/v1/contacts', { params: { search: search || undefined } });
      return data;
    },
  });

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <View style={styles.searchWrap}>
          <Search size={16} color="#9CA3AF" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search contacts..."
            value={search}
            onChangeText={setSearch}
            placeholderTextColor="#9CA3AF"
            autoCapitalize="none"
          />
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={() => setShowCreate(true)}>
          <Plus size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={data?.data || []}
        keyExtractor={(item: any) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.item} onPress={() => router.push(`/contact/${item.id}`)}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{item.firstName[0]}{item.lastName?.[0] || ''}</Text>
            </View>
            <View style={styles.itemContent}>
              <Text style={styles.name}>{item.firstName} {item.lastName}</Text>
              <Text style={styles.phone}>{item.phone}</Text>
              {item.company && <Text style={styles.company}>{item.company}</Text>}
            </View>
            <View style={[styles.badge, { backgroundColor: `${statusColors[item.status]}20` }]}>
              <Text style={[styles.badgeText, { color: statusColors[item.status] }]}>{item.status}</Text>
            </View>
          </TouchableOpacity>
        )}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        contentContainerStyle={styles.list}
        ListEmptyComponent={() => !isLoading ? (
          <View style={styles.empty}><Text style={styles.emptyText}>No contacts yet</Text></View>
        ) : null}
      />

      <CreateContactModal visible={showCreate} onClose={() => setShowCreate(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  topBar: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 10 },
  searchWrap: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, gap: 8, borderWidth: 1, borderColor: '#E5E7EB' },
  searchInput: { flex: 1, fontSize: 14, color: '#111827' },
  addBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#6366F1', alignItems: 'center', justifyContent: 'center' },
  list: { paddingHorizontal: 16, paddingBottom: 24 },
  item: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, padding: 12, gap: 12 },
  separator: { height: 8 },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#EEF2FF', alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 14, fontWeight: '600', color: '#6366F1' },
  itemContent: { flex: 1 },
  name: { fontSize: 14, fontWeight: '600', color: '#111827' },
  phone: { fontSize: 13, color: '#6B7280', marginTop: 1 },
  company: { fontSize: 12, color: '#9CA3AF', marginTop: 1 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  badgeText: { fontSize: 11, fontWeight: '600' },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyText: { color: '#9CA3AF', fontSize: 14 },
});

const ms = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  title: { fontSize: 18, fontWeight: '700', color: '#111827' },
  body: { flex: 1, padding: 20 },
  field: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '500', color: '#374151', marginBottom: 6 },
  input: { backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 11, fontSize: 14, color: '#111827' },
  statusChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1, borderColor: '#E5E7EB', marginRight: 8, backgroundColor: '#fff' },
  statusChipText: { fontSize: 12, fontWeight: '600', color: '#6B7280' },
  error: { color: '#EF4444', fontSize: 13, marginBottom: 12 },
  btn: { backgroundColor: '#6366F1', borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 8, marginBottom: 32 },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
