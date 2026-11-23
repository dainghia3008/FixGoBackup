import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { AppMap } from '@/shared/mobile/maps';
import { Button, Sheet } from '@/shared/mobile/ui';
import { colors, font } from '@/shared/mobile/theme';
import { useCustomer } from '@/store';
import { askAndCancel } from '@/actions';

// U-06: đang tìm thợ – số thợ đã chấp nhận cập nhật real-time
export default function Searching() {
  const router = useRouter();
  const order = useCustomer((s) => s.order);
  const accepted = useCustomer((s) => s.acceptedCount);
  const pulse = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(Animated.timing(pulse, { toValue: 1, duration: 1800, easing: Easing.out(Easing.quad), useNativeDriver: true })).start();
  }, []);
  if (!order) return null;
  const ring = { transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.4, 2.6] }) }], opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.5, 0] }) };

  return (
    <View style={{ flex: 1 }}>
      <AppMap center={order} zoom={15} markers={[{ id: 'me', lat: order.lat, lng: order.lng, kind: 'customer' }]} />
      <View pointerEvents="none" style={{ position: 'absolute', top: '36%', left: 0, right: 0, alignItems: 'center' }}>
        <Animated.View style={[{ width: 120, height: 120, borderRadius: 60, backgroundColor: colors.primary }, ring]} />
      </View>
      <Sheet>
        <Text style={font.h2}>Đang tìm thợ…</Text>
        <Text style={[font.sub, { marginTop: 6, marginBottom: 14 }]}>
          {accepted > 0 ? `${accepted} thợ đã nhận yêu cầu và đang chuẩn bị đề xuất cho bạn.` : 'Yêu cầu của bạn đã được gửi tới các thợ gần đó. Vui lòng chờ trong giây lát.'}
        </Text>
        {accepted > 0 && (
          <View style={{ backgroundColor: colors.primarySoft, borderRadius: 14, padding: 12, marginBottom: 14, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Text style={{ fontSize: 26, fontWeight: '800', color: colors.primaryDark }}>{accepted}</Text>
            <Text style={[font.body, { flex: 1 }]}>thợ đã chấp nhận, chưa gửi đề xuất</Text>
          </View>
        )}
        <Button title="Xem lại yêu cầu cứu hộ" variant="secondary" icon="document-text-outline" onPress={() => router.push('/order/view')} style={{ marginBottom: 10 }} />
        <Button title="Hủy yêu cầu cứu hộ" variant="dangerSoft" onPress={() => askAndCancel(order.id)} />
      </Sheet>
    </View>
  );
}
