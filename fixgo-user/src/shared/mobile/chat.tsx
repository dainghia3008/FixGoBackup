import React, { useEffect, useRef, useState } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StreamChat, type Channel } from 'stream-chat';
import { create } from 'zustand';
import { ENV } from './env';
import { callFunction } from './supabase';
import { Screen, Spinner, toast } from './ui';
import { colors, font, radius } from './theme';

// ───────────── Quản lý kết nối Stream (1 WebSocket, chỉ khi đơn đã chốt thợ) ─────────────
let client: StreamChat | null = null;
let current: { orderId: string; channel: Channel; off: () => void } | null = null;
let chatScreenOpen = false;

export const useChatUnread = create<{ count: number; inc: () => void; reset: () => void }>((set) => ({
  count: 0, inc: () => set((s) => ({ count: s.count + 1 })), reset: () => set({ count: 0 }),
}));

async function ensureClient(userId: string): Promise<StreamChat> {
  if (!client) client = StreamChat.getInstance(ENV.STREAM_KEY);
  if (client.userID === userId) return client;
  await client.connectUser({ id: userId }, async () => (await callFunction<{ token: string }>('stream-token')).token);
  return client;
}

export async function attachChat(userId: string, orderId: string): Promise<Channel> {
  if (current?.orderId === orderId) return current.channel;
  const c = await ensureClient(userId);
  await callFunction('stream-token', { order_id: orderId }); // tạo kênh cho đơn nếu chưa có
  const channel = c.channel('messaging', orderId);
  await channel.watch({ messages: { limit: 50 } });
  const h = channel.on('message.new', (e) => {
    if (e.user?.id !== userId && !chatScreenOpen) useChatUnread.getState().inc();
  });
  current = { orderId, channel, off: () => h.unsubscribe() };
  return channel;
}

// BR-15: gọi khi đơn rời trạng thái cho phép chat (hoàn tất sửa chữa / hủy / kết thúc)
export async function detachChat() {
  if (current) { try { current.off(); await current.channel.stopWatching(); } catch { /* bỏ qua */ } }
  current = null;
  useChatUnread.getState().reset();
  try { await client?.disconnectUser(); } catch { /* bỏ qua */ }
}

interface Msg { id: string; text: string; mine: boolean; at: Date }

export function ChatScreen({ orderId, userId, readOnly, quickReplies, peerName, onBack }: {
  orderId: string; userId: string; readOnly?: boolean; quickReplies?: string[]; peerName?: string; onBack: () => void;
}) {
  const [channel, setChannel] = useState<Channel | null>(null);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);
  const listRef = useRef<FlatList<Msg>>(null);

  const read = (ch: Channel) =>
    setMsgs(ch.state.messages.filter((m) => m.type !== 'system' && !m.deleted_at).map((m) => ({
      id: m.id, text: m.text ?? '', mine: m.user?.id === userId, at: new Date(m.created_at as any),
    })));

  useEffect(() => {
    let off: (() => void) | undefined;
    chatScreenOpen = true;
    useChatUnread.getState().reset();
    (async () => {
      try {
        const ch = await attachChat(userId, orderId);
        setChannel(ch);
        read(ch);
        const a = ch.on('message.new', () => read(ch));
        const b = ch.on('message.updated', () => read(ch));
        off = () => { a.unsubscribe(); b.unsubscribe(); };
        await ch.markRead().catch(() => {});
      } catch (e: any) {
        setError(e?.message === 'CHAT_CLOSED' ? 'Cuộc trò chuyện đã kết thúc.' : 'Không kết nối được tin nhắn. Vui lòng thử lại.');
      }
    })();
    return () => { chatScreenOpen = false; off?.(); };
  }, [orderId, userId]);

  const send = async (t: string) => {
    const body = t.trim();
    if (!body || !channel || sending) return;
    setSending(true);
    try {
      await channel.sendMessage({ text: body });
      setText('');
      read(channel);
    } catch {
      toast('Gửi tin nhắn không thành công', 'error');
    } finally { setSending(false); }
  };

  return (
    <Screen title={peerName ?? 'Tin nhắn'} subtitle={readOnly ? 'Cuộc trò chuyện đã kết thúc' : 'Trao đổi về đơn cứu hộ'} onBack={onBack} scroll={false} padded={false}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}>
        {!channel && !error ? <Spinner text="Đang kết nối…" /> : (
          <>
            {!!error && <Text style={{ color: colors.danger, padding: 16, textAlign: 'center' }}>{error}</Text>}
            <FlatList
              ref={listRef}
              data={[...msgs].reverse()}
              inverted
              keyExtractor={(m) => m.id}
              contentContainerStyle={{ padding: 12, gap: 6 }}
              ListEmptyComponent={<Text style={[font.sub, { textAlign: 'center', transform: [{ scaleY: -1 }], marginTop: 24 }]}>Chưa có tin nhắn. Hãy chào đối phương nhé!</Text>}
              renderItem={({ item }) => (
                <View style={{ alignItems: item.mine ? 'flex-end' : 'flex-start' }}>
                  <View style={{
                    maxWidth: '80%', paddingVertical: 9, paddingHorizontal: 14, borderRadius: 18,
                    backgroundColor: item.mine ? colors.primary : colors.card,
                    borderBottomRightRadius: item.mine ? 4 : 18, borderBottomLeftRadius: item.mine ? 18 : 4,
                  }}>
                    <Text style={{ color: item.mine ? '#fff' : colors.text, fontSize: 15 }}>{item.text}</Text>
                  </View>
                  <Text style={{ fontSize: 10, color: colors.sub, marginTop: 2, marginHorizontal: 4 }}>
                    {`${String(item.at.getHours()).padStart(2, '0')}:${String(item.at.getMinutes()).padStart(2, '0')}`}
                  </Text>
                </View>
              )}
            />
            {!readOnly && !error && (
              <View style={{ backgroundColor: colors.card, borderTopWidth: 1, borderTopColor: colors.line, paddingBottom: 8 }}>
                {!!quickReplies?.length && (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 12, paddingTop: 8, gap: 8 }}>
                    {quickReplies.map((q) => (
                      <Pressable key={q} onPress={() => send(q)} style={{ paddingHorizontal: 12, paddingVertical: 7, borderRadius: radius.pill, backgroundColor: colors.primarySoft }}>
                        <Text style={{ color: colors.primaryDark, fontWeight: '600', fontSize: 13 }}>{q}</Text>
                      </Pressable>
                    ))}
                  </ScrollView>
                )}
                <View style={{ flexDirection: 'row', alignItems: 'flex-end', padding: 10, gap: 8 }}>
                  <TextInput
                    value={text} onChangeText={setText} placeholder="Nhập tin nhắn…" placeholderTextColor="#98A2B3" multiline
                    style={{ flex: 1, maxHeight: 110, backgroundColor: colors.bg, borderRadius: 22, paddingHorizontal: 16, paddingVertical: 10, fontSize: 15, color: colors.text }}
                  />
                  <Pressable onPress={() => send(text)} disabled={!text.trim() || sending}
                    style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: text.trim() ? colors.primary : colors.line, alignItems: 'center', justifyContent: 'center' }}>
                    <Ionicons name="send" size={19} color="#fff" />
                  </Pressable>
                </View>
              </View>
            )}
          </>
        )}
      </KeyboardAvoidingView>
    </Screen>
  );
}
