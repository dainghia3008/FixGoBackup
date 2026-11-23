import React, { useEffect, useRef, useState } from 'react';
import { FlatList, Pressable, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppMap } from '@/shared/mobile/maps';
import { Button, RoundButton, Sheet, toast } from '@/shared/mobile/ui';
import { getCurrentPoint } from '@/shared/mobile/location';
import { geocodeSearch, reverseGeocode, type GeoResult } from '@/shared/mobile/mapbox-api';
import { colors, font, radius, shadow } from '@/shared/mobile/theme';
import type { LatLng } from '@/shared/core/types';
import { useDraft } from '@/draft';

// U-05: thay đổi vị trí – ghim cố định giữa màn hình, kéo bản đồ để chọn
export default function ChangeLocation() {
  const router = useRouter();
  const start = useDraft.getState().loc;
  const [center, setCenter] = useState<LatLng>(start ?? { lat: 10.7769, lng: 106.7009 });
  const [picked, setPicked] = useState<LatLng>(center);
  const [address, setAddress] = useState(start?.address ?? '');
  const [q, setQ] = useState('');
  const [results, setResults] = useState<GeoResult[]>([]);
  const geoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const onIdle = (c: LatLng) => {
    setPicked(c);
    if (geoTimer.current) clearTimeout(geoTimer.current);
    geoTimer.current = setTimeout(async () => setAddress((await reverseGeocode(c)) ?? `${c.lat.toFixed(5)}, ${c.lng.toFixed(5)}`), 350);
  };

  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (q.trim().length < 3) { setResults([]); return; }
    const ctrl = new AbortController();
    searchTimer.current = setTimeout(async () => { try { setResults(await geocodeSearch(q, picked, ctrl.signal)); } catch { /* huỷ */ } }, 400);
    return () => ctrl.abort();
  }, [q]);

  const useMyLocation = async () => {
    const p = await getCurrentPoint();
    if (!p) { toast('Không lấy được vị trí hiện tại', 'warn'); return; }
    setCenter({ ...p });
  };

  return (
    <View style={{ flex: 1 }}>
      <AppMap center={center} zoom={16.5} onIdle={onIdle} centerPin showUser />
      <SafeAreaView edges={['top']} style={{ position: 'absolute', top: 0, left: 0, right: 0 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12 }}>
          <RoundButton icon="chevron-back" onPress={() => router.back()} />
          <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderRadius: radius.pill, paddingHorizontal: 14, ...shadow }}>
            <Ionicons name="search" size={18} color={colors.sub} />
            <TextInput value={q} onChangeText={setQ} placeholder="Tìm địa chỉ…" placeholderTextColor="#98A2B3" style={{ flex: 1, height: 46, paddingHorizontal: 8, fontSize: 15, color: colors.text }} />
            {!!q && <Pressable onPress={() => setQ('')}><Ionicons name="close-circle" size={18} color={colors.sub} /></Pressable>}
          </View>
        </View>
        {results.length > 0 && (
          <FlatList
            data={results} keyExtractor={(r) => r.id} keyboardShouldPersistTaps="handled"
            style={{ marginHorizontal: 12, backgroundColor: colors.card, borderRadius: radius.lg, maxHeight: 280, ...shadow }}
            renderItem={({ item }) => (
              <Pressable onPress={() => { setCenter({ lat: item.lat, lng: item.lng }); setQ(''); setResults([]); }} style={{ padding: 14, borderBottomWidth: 1, borderBottomColor: colors.line }}>
                <Text style={font.h3} numberOfLines={1}>{item.title}</Text>
                <Text style={font.sub} numberOfLines={1}>{item.address}</Text>
              </Pressable>
            )}
          />
        )}
      </SafeAreaView>
      <View style={{ position: 'absolute', right: 16, bottom: 210 }}><RoundButton icon="locate" onPress={useMyLocation} /></View>
      <Sheet>
        <Text style={font.label}>Vị trí cứu hộ</Text>
        <Text style={[font.h3, { marginTop: 2, marginBottom: 14 }]} numberOfLines={2}>{address || 'Kéo bản đồ để chọn vị trí…'}</Text>
        <Button title="Dùng vị trí hiện tại" variant="secondary" icon="locate" onPress={useMyLocation} style={{ marginBottom: 10 }} />
        <Button title="Xác nhận vị trí" icon="checkmark" onPress={() => {
          useDraft.getState().setLoc({ ...picked, address: address || `${picked.lat.toFixed(5)}, ${picked.lng.toFixed(5)}` });
          router.back();
        }} />
      </Sheet>
    </View>
  );
}
