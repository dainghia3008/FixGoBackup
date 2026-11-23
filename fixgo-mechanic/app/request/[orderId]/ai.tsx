import React, { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Button, Card, H, Screen, Spinner } from '@/shared/mobile/ui';
import { colors, font } from '@/shared/mobile/theme';
import type { AiResult } from '@/shared/core/types';
import { useMechanic } from '@/store';
import { useRequestGuard } from '@/guard';
import { askAi } from '@/actions';

function List({ items, icon }: { items: string[]; icon: React.ComponentProps<typeof Ionicons>['name'] }) {
  if (!items.length) return <Text style={font.sub}>Không có gợi ý.</Text>;
  return <>{items.map((t, i) => (
    <View key={i} style={{ flexDirection: 'row', gap: 8, marginBottom: 6 }}>
      <Ionicons name={icon} size={16} color={colors.primary} style={{ marginTop: 3 }} />
      <Text style={[font.body, { flex: 1 }]}>{t}</Text>
    </View>
  ))}</>;
}

// M-06: Trợ lý AI (Gemini) – chỉ chạy khi thợ chủ động mở; kết quả chỉ để tham khảo
export default function Ai() {
  const { orderId } = useLocalSearchParams<{ orderId: string }>();
  const router = useRouter();
  const exists = useRequestGuard(orderId);
  const cached = useMechanic((s) => s.dispatches.find((d) => d.order_id === orderId)?.ai_result ?? null);
  const [res, setRes] = useState<AiResult | null>(cached);
  const [loading, setLoading] = useState(!cached);
  const [error, setError] = useState('');

  const run = async () => {
    setLoading(true); setError('');
    try { setRes(await askAi(orderId)); }
    catch { setError('Trợ lý AI đang gặp sự cố. Bạn vẫn có thể đọc nội dung yêu cầu và chấp nhận/từ chối bình thường.'); }
    finally { setLoading(false); }
  };
  useEffect(() => { if (!cached) run(); }, []);
  if (!exists) return null;

  return (
    <Screen title="Trợ lý AI" subtitle="Chỉ mang tính tham khảo" onBack={() => router.back()}>
      {loading && <Spinner text="AI đang phân tích sự cố…" />}
      {!!error && <Card><Text style={{ color: colors.danger }}>{error}</Text><View style={{ height: 10 }} /><Button title="Thử lại" variant="secondary" onPress={run} /></Card>}
      {res && (
        <>
          <H>Tóm tắt và giải thích</H>
          <Card><Text style={font.body}>{res.summary}</Text></Card>
          <H>Chẩn đoán sơ bộ</H>
          <Card><List items={res.diagnosis} icon="search-outline" /></Card>
          <H>Gợi ý dụng cụ mang theo</H>
          <Card>
            <Text style={font.label}>Dụng cụ</Text><List items={res.toolkit.tools} icon="hammer-outline" />
            <Text style={[font.label, { marginTop: 8 }]}>Thiết bị</Text><List items={res.toolkit.equipment} icon="build-outline" />
            <Text style={[font.label, { marginTop: 8 }]}>Phụ tùng</Text><List items={res.toolkit.parts} icon="cog-outline" />
          </Card>
          <Text style={font.sub}>Kết quả không tự gửi cho khách và không tự điền vào đề xuất.</Text>
        </>
      )}
    </Screen>
  );
}
