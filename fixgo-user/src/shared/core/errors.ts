export const ERROR_MESSAGES: Record<string, string> = {
  NOT_AUTHENTICATED: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.',
  ACTIVE_ORDER_EXISTS: 'Bạn đang có một yêu cầu cứu hộ chưa kết thúc.',
  ORDER_NOT_FOUND: 'Không tìm thấy đơn cứu hộ.',
  ORDER_NOT_SEARCHING: 'Yêu cầu này không còn ở bước tìm thợ.',
  PROPOSAL_UNAVAILABLE: 'Thợ này không còn khả dụng. Vui lòng chọn thợ khác.',
  MECHANIC_BUSY: 'Thợ vừa được khách khác chọn. Vui lòng chọn thợ khác.',
  MECHANIC_OFFLINE: 'Bạn đang Offline. Hãy bật Online trước khi gửi đề xuất.',
  MECHANIC_LOCKED: 'Thợ này không còn khả dụng. Vui lòng chọn thợ khác.',
  ACCOUNT_LOCKED: 'Tài khoản của bạn đang bị khóa.',
  NOT_APPROVED: 'Hồ sơ của bạn chưa được duyệt.',
  LOCATION_REQUIRED: 'Không lấy được vị trí. Hãy bật định vị rồi thử lại.',
  REQUEST_UNAVAILABLE: 'Yêu cầu này không còn khả dụng.',
  NOT_ACCEPTED: 'Bạn cần nhấn [Chấp nhận] trước khi gửi đề xuất.',
  CANNOT_CANCEL: 'Không thể hủy đơn ở bước hiện tại.',
  INVALID_STATE: 'Đơn đã chuyển sang bước khác. Màn hình sẽ được cập nhật.',
  QUOTE_SUPERSEDED: 'Thợ vừa gửi phiếu mới hơn. Vui lòng xem phiên bản mới nhất.',
  INVALID_QUOTE: 'Phiếu đề xuất chưa hợp lệ.',
  ALREADY_REVIEWED: 'Bạn đã đánh giá đơn này rồi.',
  REVIEW_NOT_ALLOWED: 'Đơn này chưa thể đánh giá.',
  INVALID_INPUT: 'Thông tin chưa hợp lệ. Vui lòng kiểm tra lại.',
  INVALID_PROFILE: 'Hồ sơ chưa hợp lệ. Vui lòng kiểm tra lại các trường.',
  FORBIDDEN: 'Bạn không có quyền thực hiện thao tác này.',
  REPORT_NOT_ALLOWED: 'Không thể gửi báo cáo cho đơn này.',
  CHAT_CLOSED: 'Cuộc trò chuyện đã kết thúc.',
};

export function errorCode(e: unknown): string {
  const raw = typeof e === 'string' ? e : (e as { message?: string } | null)?.message ?? '';
  const m = raw.match(/^[A-Z][A-Z0-9_]{2,}/);
  return m ? m[0] : raw;
}

export function errorMessage(e: unknown): string {
  const code = errorCode(e);
  if (ERROR_MESSAGES[code]) return ERROR_MESSAGES[code];
  const raw = (e as { message?: string } | null)?.message ?? '';
  if (/network|fetch|timeout/i.test(raw)) return 'Mất kết nối mạng. Vui lòng thử lại.';
  return raw || 'Đã xảy ra lỗi. Vui lòng thử lại.';
}
