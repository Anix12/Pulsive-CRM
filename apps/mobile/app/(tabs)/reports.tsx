import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
}

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardLabel}>{label}</Text>
      <Text style={styles.cardValue}>{value}</Text>
      {sub && <Text style={styles.cardSub}>{sub}</Text>}
    </View>
  );
}

export default function ReportsScreen() {
  const { data, isLoading } = useQuery({
    queryKey: ['reports', 'business'],
    queryFn: async () => { const { data } = await api.get('/api/v1/reports/business-performance'); return data.data; },
  });

  if (isLoading) {
    return <View style={styles.loading}><Text style={styles.loadingText}>Loading...</Text></View>;
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.sectionTitle}>This Month</Text>

      <View style={styles.grid}>
        <StatCard label="Revenue" value={formatCurrency(data?.revenue?.total || 0)} />
        <StatCard label="Calls Made" value={data?.calls?.total || 0} sub={`${data?.calls?.completionRate || 0}% completion`} />
        <StatCard label="Messages Sent" value={data?.messages?.total || 0} sub="SMS + WhatsApp" />
        <StatCard label="Deals Won" value={data?.deals?.won || 0} sub={`${data?.deals?.conversionRate || 0}% conversion`} />
      </View>

      <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Pipeline</Text>

      {data?.pipeline && Object.entries(data.pipeline as Record<string, any>).map(([stage, d]) => (
        <View key={stage} style={styles.pipelineRow}>
          <Text style={styles.pipelineStage}>{stage}</Text>
          <View style={styles.pipelineRight}>
            <Text style={styles.pipelineCount}>{(d as any).count} deals</Text>
            <Text style={styles.pipelineValue}>{formatCurrency((d as any).value)}</Text>
          </View>
        </View>
      ))}

      <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Conversion</Text>

      <View style={styles.convCard}>
        {[
          { label: 'Total Deals', value: data?.deals?.total || 0, color: '#6B7280' },
          { label: 'Won', value: data?.deals?.won || 0, color: '#10B981' },
          { label: 'Lost', value: data?.deals?.lost || 0, color: '#EF4444' },
        ].map(({ label, value, color }) => (
          <View key={label} style={styles.convRow}>
            <Text style={styles.convLabel}>{label}</Text>
            <Text style={[styles.convValue, { color }]}>{value}</Text>
          </View>
        ))}
        <View style={[styles.convRow, { borderTopWidth: 1, borderTopColor: '#F3F4F6', paddingTop: 12, marginTop: 4 }]}>
          <Text style={[styles.convLabel, { fontWeight: '600' }]}>Conversion Rate</Text>
          <Text style={[styles.convValue, { color: '#6366F1', fontWeight: '700' }]}>{data?.deals?.conversionRate || 0}%</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  content: { padding: 16, paddingBottom: 40 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { color: '#9CA3AF', fontSize: 14 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: '#6B7280', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, flex: 1, minWidth: '45%', shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, shadowOffset: { width: 0, height: 1 }, elevation: 1 },
  cardLabel: { fontSize: 12, color: '#6B7280' },
  cardValue: { fontSize: 22, fontWeight: '700', color: '#111827', marginTop: 4 },
  cardSub: { fontSize: 11, color: '#9CA3AF', marginTop: 2 },
  pipelineRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 8 },
  pipelineStage: { fontSize: 14, color: '#374151', fontWeight: '500' },
  pipelineRight: { alignItems: 'flex-end' },
  pipelineCount: { fontSize: 12, color: '#9CA3AF' },
  pipelineValue: { fontSize: 13, fontWeight: '600', color: '#111827', marginTop: 1 },
  convCard: { backgroundColor: '#fff', borderRadius: 12, padding: 16, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, shadowOffset: { width: 0, height: 1 }, elevation: 1 },
  convRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 },
  convLabel: { fontSize: 14, color: '#6B7280' },
  convValue: { fontSize: 15, fontWeight: '600' },
});
