const { request } = require("../utils/request");

const NOTIFICATION_ENDPOINTS = {
  list: "/v1/notifications",
  unreadCount: "/v1/notifications/unread-count",
  markRead: "/v1/notifications/:id/read",
  markAllRead: "/v1/notifications/read-all"
};

function formatNotificationTime(value) {
  const timestamp = Number(value) || 0;
  if (!timestamp) return "";

  const now = Date.now();
  const diff = Math.max(0, now - timestamp);
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (diff < minute) return "刚刚";
  if (diff < hour) return `${Math.floor(diff / minute)}分钟前`;
  if (diff < day) return `${Math.floor(diff / hour)}小时前`;
  if (diff < 2 * day) return "昨天";

  const date = new Date(timestamp);
  const pad = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function normalizeNotification(raw) {
  const item = raw || {};
  const type = item.type || "";
  const relatedType = item.relatedType || "";
  const relatedId = item.relatedId;
  const hasRelated = !!(
    relatedType === "pending_review" ||
    (relatedType === "activity" && relatedId) ||
    type === "review_available" ||
    type === "review_reminder"
  );

  return {
    id: item.id,
    type,
    title: item.title || "",
    content: item.content || "",
    relatedType,
    relatedId,
    hasRelated,
    read: !!item.read,
    createdAt: Number(item.createdAt) || 0,
    timeText: formatNotificationTime(item.createdAt)
  };
}

function fetchNotifications(params) {
  const { pageSize = 50 } = params || {};

  return request({
    url: NOTIFICATION_ENDPOINTS.list,
    method: "GET",
    data: { pageSize }
  }).then((res) => (res || []).map(normalizeNotification));
}

function fetchNotificationUnreadCount() {
  return request({
    url: NOTIFICATION_ENDPOINTS.unreadCount,
    method: "GET"
  }).then((res) => Number((res && res.count) || 0));
}

function markNotificationRead(id) {
  return request({
    url: NOTIFICATION_ENDPOINTS.markRead.replace(":id", id),
    method: "POST"
  }).then(normalizeNotification);
}

function markAllNotificationsRead() {
  return request({
    url: NOTIFICATION_ENDPOINTS.markAllRead,
    method: "POST"
  }).then((res) => Number((res && res.count) || 0));
}

module.exports = {
  fetchNotificationUnreadCount,
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead
};
