// Cấp token Stream Chat và (khi có order_id) tạo kênh chat cho đơn – chỉ 2 bên của đơn, chỉ khi chat còn mở (BR-15).
import { StreamChat } from 'npm:stream-chat@9';
import { adminClient, env, handle, HttpError, json, requireUser } from '../_shared/http.ts';

const CHAT_STATUSES = ['selected', 'traveling', 'arrived', 'quote_pending', 'repairing'];

Deno.serve(handle(async (req) => {
  if (req.method !== 'POST') throw new HttpError(405, 'METHOD_NOT_ALLOWED');
  const { user } = await requireUser(req);
  const { order_id } = await req.json().catch(() => ({}));
  const apiKey = env('STREAM_API_KEY');
  const server = StreamChat.getInstance(apiKey, env('STREAM_API_SECRET'));
  const token = server.createToken(user.id);

  if (!order_id) return json({ token, api_key: apiKey, user_id: user.id });

  const admin = adminClient();
  const { data: o } = await admin.from('orders').select('id, status, customer_id, mechanic_id').eq('id', order_id).maybeSingle();
  if (!o || !o.mechanic_id || (o.customer_id !== user.id && o.mechanic_id !== user.id)) throw new HttpError(403, 'FORBIDDEN');
  if (!CHAT_STATUSES.includes(o.status)) throw new HttpError(409, 'CHAT_CLOSED');

  const [{ data: c }, { data: m }] = await Promise.all([
    admin.from('customers').select('full_name').eq('id', o.customer_id).maybeSingle(),
    admin.from('mechanics').select('full_name, face_photo').eq('id', o.mechanic_id).maybeSingle(),
  ]);
  await server.upsertUsers([
    { id: o.customer_id, name: c?.full_name ?? 'Khách hàng', role: 'user' },
    { id: o.mechanic_id, name: m?.full_name ?? 'Thợ', role: 'user' },
  ]);
  const channel = server.channel('messaging', o.id, { members: [o.customer_id, o.mechanic_id], created_by_id: o.customer_id } as Record<string, unknown>);
  await channel.create();
  return json({ token, api_key: apiKey, user_id: user.id, channel_id: o.id });
}));
