import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  TextInput, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { MessageSquare, Send, ArrowLeft } from 'lucide-react-native';
import { format } from 'date-fns';
import { useState } from 'react';

const channelColor: Record<string, string> = { SMS: '#3B82F6', WHATSAPP: '#10B981' };

function ConversationScreen({ contactId, contactName, onBack }: { contactId: string; contactName: string; onBack: () => void }) {
  const qc = useQueryClient();
  const [body, setBody] = useState('');
  const [channel, setChannel] = useState<'SMS' | 'WHATSAPP'>('SMS');

  const { data } = useQuery({
    queryKey: ['conversation', contactId],
    queryFn: async () => {
      const { data } = await api.get(`/api/v1/messages?contactId=${contactId}&limit=50`);
      return (data.data || []).reverse();
    },
    refetchInterval: 5000,
  });

  const send = useMutation({
    mutationFn: () => api.post('/api/v1/messages/send', { contactId, body, channel }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['conversation', contactId] });
      qc.invalidateQueries({ queryKey: ['messages'] });
      setBody('');
    },
  });

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90}>
      <View style={cs.navbar}>
        <TouchableOpacity onPress={onBack} style={{ padding: 4 }}>
          <ArrowLeft size={20} color="#374151" />
        </TouchableOpacity>
        <Text style={cs.navName}>{contactName}</Text>
        <View style={cs.channelToggle}>
          {(['SMS', 'WHATSAPP'] as const).map((c) => (
            <TouchableOpacity
              key={c}
              onPress={() => setChannel(c)}
              style={[cs.channelBtn, channel === c && { backgroundColor: channelColor[c] }]}
            >
              <Text style={[cs.channelBtnText, channel === c && { color: '#fff' }]}>{c}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <ScrollView
        style={{ flex: 1, backgroundColor: '#F9FAFB' }}
        contentContainerStyle={{ padding: 16, gap: 8 }}
        ref={(ref) => { setTimeout(() => ref?.scrollToEnd({ animated: false }), 100); }}
      >
        {(data || []).map((msg: any) => {
          const isOut = msg.direction === 'OUTBOUND';
          return (
            <View key={msg.id} style={[cs.bubble, isOut ? cs.bubbleOut : cs.bubbleIn]}>
              <Text style={[cs.bubbleText, isOut && { color: '#fff' }]}>{msg.body}</Text>
              <Text style={[cs.bubbleTime, isOut && { color: 'rgba(255,255,255,0.7)' }]}>
                {format(new Date(msg.createdAt), 'hh:mm a')}
              </Text>
            </View>
          );
        })}
      </ScrollView>

      <View style={cs.inputBar}>
        <TextInput
          style={cs.input}
          placeholder="Type a message..."
          placeholderTextColor="#9CA3AF"
          value={body}
          onChangeText={setBody}
          multiline
        />
        <TouchableOpacity
          style={[cs.sendBtn, { backgroundColor: channelColor[channel] }, (!body.trim() || send.isPending) && { opacity: 0.4 }]}
          onPress={() => body.trim() && send.mutate()}
          disabled={!body.trim() || send.isPending}
        >
          <Send size={18} color="#fff" />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

export default function MessagesScreen() {
  const [active, setActive] = useState<{ contactId: string; name: string } | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['messages'],
    queryFn: async () => { const { data } = await api.get('/api/v1/messages?limit=50'); return data; },
    refetchInterval: 8000,
  });

  const grouped: Record<string, any[]> = {};
  (data?.data || []).forEach((msg: any) => {
    const key = msg.contactId || msg.toNumber;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(msg);
  });

  const threads = Object.values(grouped)
    .map((msgs) => msgs[0])
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  if (active) {
    return (
      <ConversationScreen
        contactId={active.contactId}
        contactName={active.name}
        onBack={() => setActive(null)}
      />
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={threads}
        keyExtractor={(item: any) => item.id}
        renderItem={({ item }) => {
          const name = item.contact
            ? `${item.contact.firstName} ${item.contact.lastName || ''}`.trim()
            : item.toNumber;
          return (
            <TouchableOpacity
              style={styles.item}
              onPress={() => item.contactId && setActive({ contactId: item.contactId, name })}
            >
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {item.contact ? `${item.contact.firstName?.[0]}${item.contact.lastName?.[0] || ''}` : '?'}
                </Text>
              </View>
              <View style={styles.info}>
                <View style={styles.row}>
                  <Text style={styles.name} numberOfLines={1}>{name}</Text>
                  <Text style={styles.time}>{format(new Date(item.createdAt), 'dd MMM')}</Text>
                </View>
                <View style={styles.row}>
                  <Text style={styles.preview} numberOfLines={1}>{item.body}</Text>
                  <View style={[styles.channelBadge, { backgroundColor: `${channelColor[item.channel]}20` }]}>
                    <Text style={[styles.channelText, { color: channelColor[item.channel] }]}>{item.channel}</Text>
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          );
        }}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        contentContainerStyle={styles.list}
        ListEmptyComponent={() => !isLoading ? (
          <View style={styles.empty}>
            <MessageSquare size={40} color="#E5E7EB" />
            <Text style={styles.emptyText}>No messages yet</Text>
          </View>
        ) : null}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  list: { padding: 16, paddingBottom: 32 },
  item: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, padding: 14, gap: 12 },
  separator: { height: 8 },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#EEF2FF', alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 15, fontWeight: '600', color: '#6366F1' },
  info: { flex: 1, gap: 4 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  name: { fontSize: 14, fontWeight: '600', color: '#111827', flex: 1 },
  time: { fontSize: 12, color: '#9CA3AF', marginLeft: 8 },
  preview: { fontSize: 13, color: '#6B7280', flex: 1 },
  channelBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8, marginLeft: 8 },
  channelText: { fontSize: 10, fontWeight: '600' },
  empty: { alignItems: 'center', paddingTop: 80, gap: 12 },
  emptyText: { fontSize: 14, color: '#9CA3AF' },
});

const cs = StyleSheet.create({
  navbar: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  navName: { flex: 1, fontSize: 16, fontWeight: '600', color: '#111827' },
  channelToggle: { flexDirection: 'row', borderRadius: 8, overflow: 'hidden', borderWidth: 1, borderColor: '#E5E7EB' },
  channelBtn: { paddingHorizontal: 10, paddingVertical: 5 },
  channelBtnText: { fontSize: 11, fontWeight: '700', color: '#6B7280' },
  bubble: { maxWidth: '75%', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 8 },
  bubbleIn: { backgroundColor: '#fff', alignSelf: 'flex-start', borderBottomLeftRadius: 4 },
  bubbleOut: { backgroundColor: '#6366F1', alignSelf: 'flex-end', borderBottomRightRadius: 4 },
  bubbleText: { fontSize: 14, color: '#111827', lineHeight: 20 },
  bubbleTime: { fontSize: 10, color: '#9CA3AF', marginTop: 3, textAlign: 'right' },
  inputBar: { flexDirection: 'row', alignItems: 'flex-end', gap: 10, padding: 12, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#F3F4F6' },
  input: { flex: 1, backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, color: '#111827', maxHeight: 100 },
  sendBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
});
