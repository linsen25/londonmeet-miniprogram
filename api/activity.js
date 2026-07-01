const { API_BASE_URL, request } = require("../utils/request");

const API_ORIGIN = API_BASE_URL.replace(/\/api\/?$/, "");
const FALLBACK_AVATAR = `${API_ORIGIN}/api/v1/uploads/image-proxy?publicId=v1782629106/londonmeet/defaultUser&format=png`;

const ACTIVITY_ENDPOINTS = {
  create: "/v1/activities",
  list: "/v1/activities",
  myOngoing: "/v1/activities/me/ongoing",
  myCreated: "/v1/activities/me/created",
  myFavorites: "/v1/activities/me/favorites",
  myHistory: "/v1/activities/me/history",
  pendingReview: "/v1/activities/pending-review",
  pendingReviewActivities: "/v1/activities/pending-review/activities",
  activityReviewRegistrations: "/v1/activities/pending-review/activities/:id/registrations",
  activityReviewBlacklist: "/v1/activities/pending-review/activities/:id/blacklist",
  approveRegistration: "/v1/activities/registrations/:id/approve",
  rejectRegistration: "/v1/activities/registrations/:id/reject",
  blacklistRegistration: "/v1/activities/registrations/:id/blacklist",
  unblockApplicant: "/v1/activities/blacklist/:id/unblock",
  detail: "/v1/activities/:id",
  apply: "/v1/activities/:id/apply",
  joinGroup: "/v1/activities/:id/join-group",
  cancelRegistration: "/v1/activities/:id/cancel-registration",
  favorite: "/v1/activities/:id/favorite",
  report: "/v1/activities/:id/report",
  remindQr: "/v1/activities/:id/invite-qr/remind",
  cancelActivity: "/v1/activities/:id/cancel",
  events: "/v1/activities/events",
  update: "/v1/activities/:id",
  updateQr: "/v1/activities/:id/invite-qr"
};

function resolveAssetUrl(url) {
  if (!url) return "";
  if (url.indexOf("/uploads/avatar/default-avatar") === 0) return FALLBACK_AVATAR;
  if (/^https?:\/\//i.test(url)) return url;
  if (url.charAt(0) === "/") return `${API_ORIGIN}${url}`;
  return url;
}

function buildThumbnailUrl(url, width = 640, height = 420) {
  const resolved = resolveAssetUrl(url);
  if (!resolved || resolved.indexOf("/api/v1/uploads/image-proxy") < 0) return resolved;
  const joiner = resolved.indexOf("?") >= 0 ? "&" : "?";
  return `${resolved}${joiner}width=${width}&height=${height}`;
}

function normalizePost(raw) {
  const post = raw || {};

  return {
    _id: post._id || post.id,
    title: post.title || "",
    authorName: post.authorName || "",
    coverUrl: resolveAssetUrl(post.coverUrl || ""),
    thumbnailUrl: buildThumbnailUrl(post.coverUrl || ""),
    avatarUrl: resolveAssetUrl(post.avatarUrl || ""),
    favoriteCount: Number(post.favoriteCount) || 0,
    favorited: !!post.favorited,
    progressPct: post.progressPct == null ? post.progressPercent : post.progressPct,
    joinedCount: Number(post.joinedCount) || 0,
    totalCount: Number(post.totalCount) || 0,
    startAt: Number(post.startAt) || 0,
    endAt: Number(post.endAt) || 0,
    ended: Number(post.endAt) > 0 && Number(post.endAt) <= Date.now(),
    progressGif: post.progressGif || "",
    registrationStatus: post.registrationStatus || ""
  };
}

function fetchActivityPosts(params) {
  const { range = "day", page = 1, pageSize = 20, refresh = false } = params || {};

  return request({
    url: ACTIVITY_ENDPOINTS.list,
    method: "GET",
    data: {
      range,
      page,
      pageSize,
      refresh: refresh ? 1 : 0
    }
  }).then((res) => ({
    ...res,
    list: (res.list || []).map(normalizePost)
  }));
}

function fetchMyOngoingActivityPosts(params) {
  const { page = 1, pageSize = 20 } = params || {};

  return request({
    url: ACTIVITY_ENDPOINTS.myOngoing,
    method: "GET",
    data: {
      page,
      pageSize
    }
  }).then((res) => ({
    ...res,
    list: (res.list || []).map(normalizePost)
  }));
}

function fetchMyCreatedActivityPosts(params) {
  const { page = 1, pageSize = 50 } = params || {};
  return request({
    url: ACTIVITY_ENDPOINTS.myCreated,
    method: "GET",
    data: { page, pageSize }
  }).then((res) => ({
    ...res,
    list: (res.list || []).map(normalizePost)
  }));
}

function fetchFavoriteActivityPosts(params) {
  const { page = 1, pageSize = 30 } = params || {};

  return request({
    url: ACTIVITY_ENDPOINTS.myFavorites,
    method: "GET",
    data: { page, pageSize }
  }).then((res) => ({
    ...res,
    list: (res.list || []).map(normalizePost)
  }));
}

function fetchHistoryActivityPosts(params) {
  const { page = 1, pageSize = 50, type = "joined" } = params || {};
  return request({
    url: ACTIVITY_ENDPOINTS.myHistory,
    method: "GET",
    data: { page, pageSize, type }
  }).then((res) => ({
    ...res,
    list: (res.list || []).map(normalizePost)
  }));
}

function normalizeActivityDetail(raw) {
  const detail = raw || {};
  const images = Array.isArray(detail.imageUrls) ? detail.imageUrls.filter(Boolean) : [];
  const coverUrl = resolveAssetUrl(detail.coverUrl || "");

  return {
    id: detail.id,
    title: detail.title || "",
    content: detail.content || "",
    authorName: detail.authorName || "",
    authorUserId: detail.authorUserId,
    authorAvatarUrl: resolveAssetUrl(detail.authorAvatarUrl || ""),
    organizerRating: detail.organizerRating == null ? null : Number(detail.organizerRating),
    authorMotto: detail.authorMotto || "你好呀，准备好出去转转了么~",
    authorTags: Array.isArray(detail.authorTags) && detail.authorTags.filter(Boolean).length
      ? detail.authorTags.filter(Boolean)
      : ["未添加标签"],
    coverUrl,
    imageUrls: images.length ? images.map(resolveAssetUrl) : (coverUrl ? [coverUrl] : []),
    tags: Array.isArray(detail.tags) ? detail.tags.filter(Boolean) : [],
    tagIds: Array.isArray(detail.tagIds) ? detail.tagIds.map(Number).filter(Boolean) : [],
    startAt: Number(detail.startAt) || 0,
    endAt: Number(detail.endAt) || 0,
    joinedCount: Number(detail.joinedCount) || 0,
    totalCount: Number(detail.totalCount) || 0,
    full: !!detail.full,
    locationText: detail.locationText || "",
    mapImageUrl: resolveAssetUrl(detail.mapImageUrl || ""),
    inviteQrUrl: resolveAssetUrl(detail.inviteQrUrl || ""),
    qrExpiresAt: Number(detail.qrExpiresAt) || 0,
    editCount: Number(detail.editCount) || 0,
    canEdit: !!detail.canEdit,
    editBlockedReason: detail.editBlockedReason || "",
    isCreator: !!detail.isCreator,
    favoriteCount: Number(detail.favoriteCount) || 0,
    favorited: !!detail.favorited,
    registrationStatus: detail.registrationStatus || "",
    noticeCode: detail.noticeCode == null ? null : Number(detail.noticeCode),
    ended: Number(detail.endAt) > 0 && Number(detail.endAt) <= Date.now()
  };
}

function normalizePendingReview(raw) {
  const item = raw || {};

  return {
    registrationId: item.registrationId,
    activityId: item.activityId,
    userId: item.userId,
    displayId: item.displayId || "",
    activityTitle: item.activityTitle || "",
    nickname: item.nickname || "MeetFun User",
    avatarUrl: resolveAssetUrl(item.avatarUrl || ""),
    applicationText: item.applicationText || "",
    status: item.status || "",
    reviewReasonType: item.reviewReasonType || "",
    reviewReasonText: item.reviewReasonText || "",
    reviewedAt: Number(item.reviewedAt) || 0,
    blacklistId: item.blacklistId,
    blacklistedAt: Number(item.blacklistedAt) || 0,
    punctualRating: item.punctualRating == null ? null : Number(item.punctualRating),
    communicationRating: item.communicationRating == null ? null : Number(item.communicationRating),
    friendlyRating: item.friendlyRating == null ? null : Number(item.friendlyRating),
    reviewCount: Number(item.reviewCount) || 0,
    appliedAt: Number(item.appliedAt) || 0
  };
}

function normalizePendingReviewActivity(raw) {
  const item = raw || {};
  return {
    activityId: item.activityId,
    activityTitle: item.activityTitle || "",
    startAt: Number(item.startAt) || 0,
    endAt: Number(item.endAt) || 0,
    locationText: item.locationText || "",
    totalRegistrationCount: Number(item.totalRegistrationCount) || 0,
    pendingCount: Number(item.pendingCount) || 0,
    approvedCount: Number(item.approvedCount) || 0,
    rejectedCount: Number(item.rejectedCount) || 0,
    hasUnread: !!item.hasUnread,
    latestAppliedAt: Number(item.latestAppliedAt) || 0
  };
}

function fetchActivityDetail(id) {
  return request({
    url: ACTIVITY_ENDPOINTS.detail.replace(":id", id),
    method: "GET"
  }).then(normalizeActivityDetail);
}

function applyActivity(id, params) {
  return request({
    url: ACTIVITY_ENDPOINTS.apply.replace(":id", id),
    method: "POST",
    data: {
      applicationText: params && params.applicationText ? params.applicationText : ""
    }
  });
}

function joinActivityGroup(id) {
  return request({
    url: ACTIVITY_ENDPOINTS.joinGroup.replace(":id", id),
    method: "POST"
  });
}

function cancelActivityRegistration(id, payload) {
  return request({
    url: ACTIVITY_ENDPOINTS.cancelRegistration.replace(":id", id),
    method: "POST",
    data: payload || {}
  });
}

function cancelActivityByCreator(id, payload) {
  return request({
    url: ACTIVITY_ENDPOINTS.cancelActivity.replace(":id", id),
    method: "POST",
    data: payload || {}
  }).then(normalizeActivityDetail);
}

function fetchPendingReviews() {
  return request({
    url: ACTIVITY_ENDPOINTS.pendingReview,
    method: "GET"
  }).then((res) => (res || []).map(normalizePendingReview));
}

function fetchPendingReviewActivities() {
  return request({
    url: ACTIVITY_ENDPOINTS.pendingReviewActivities,
    method: "GET"
  }).then((res) => (res || []).map(normalizePendingReviewActivity));
}

function fetchActivityReviewRegistrations(id, status) {
  return request({
    url: ACTIVITY_ENDPOINTS.activityReviewRegistrations.replace(":id", id),
    method: "GET",
    data: { status: status || "all" }
  }).then((res) => (res || []).map(normalizePendingReview));
}

function fetchActivityReviewBlacklist(id) {
  return request({
    url: ACTIVITY_ENDPOINTS.activityReviewBlacklist.replace(":id", id),
    method: "GET"
  }).then((res) => (res || []).map(normalizePendingReview));
}

function approveActivityRegistration(id, payload) {
  return request({
    url: ACTIVITY_ENDPOINTS.approveRegistration.replace(":id", id),
    method: "POST",
    data: payload || {}
  });
}

function rejectActivityRegistration(id, payload) {
  return request({
    url: ACTIVITY_ENDPOINTS.rejectRegistration.replace(":id", id),
    method: "POST",
    data: payload || {}
  });
}

function blacklistActivityRegistration(id, payload) {
  return request({
    url: ACTIVITY_ENDPOINTS.blacklistRegistration.replace(":id", id),
    method: "POST",
    data: payload || {}
  });
}

function unblockActivityApplicant(id) {
  return request({
    url: ACTIVITY_ENDPOINTS.unblockApplicant.replace(":id", id),
    method: "POST"
  });
}

function createActivity(payload) {
  return request({
    url: ACTIVITY_ENDPOINTS.create,
    method: "POST",
    data: payload || {}
  }).then(normalizePost);
}

function updateActivity(id, payload) {
  return request({
    url: ACTIVITY_ENDPOINTS.update.replace(":id", id),
    method: "PUT",
    data: payload || {}
  }).then(normalizeActivityDetail);
}

function updateActivityQr(id, payload) {
  return request({
    url: ACTIVITY_ENDPOINTS.updateQr.replace(":id", id),
    method: "PUT",
    data: payload || {}
  }).then(normalizeActivityDetail);
}

function updateActivityFavorite(params) {
  const { id, favorited } = params || {};

  return request({
    url: ACTIVITY_ENDPOINTS.favorite.replace(":id", id),
    method: "POST",
    data: { favorited }
  });
}

function reportActivity(id, reason) {
  return request({
    url: ACTIVITY_ENDPOINTS.report.replace(":id", id),
    method: "POST",
    data: { reason }
  });
}

function remindActivityQr(id) {
  return request({
    url: ACTIVITY_ENDPOINTS.remindQr.replace(":id", id),
    method: "POST"
  });
}

function recordActivityEvents(eventType, activityIds) {
  const ids = (activityIds || []).map(Number).filter(Boolean);
  if (!ids.length) return Promise.resolve();
  return request({
    url: ACTIVITY_ENDPOINTS.events,
    method: "POST",
    data: { eventType, activityIds: ids }
  });
}

module.exports = {
  ACTIVITY_ENDPOINTS,
  applyActivity,
  approveActivityRegistration,
  cancelActivityByCreator,
  cancelActivityRegistration,
  createActivity,
  fetchActivityDetail,
  fetchActivityReviewBlacklist,
  fetchActivityReviewRegistrations,
  fetchActivityPosts,
  fetchFavoriteActivityPosts,
  fetchHistoryActivityPosts,
  fetchMyOngoingActivityPosts,
  fetchMyCreatedActivityPosts,
  fetchPendingReviewActivities,
  fetchPendingReviews,
  joinActivityGroup,
  blacklistActivityRegistration,
  resolveAssetUrl,
  rejectActivityRegistration,
  recordActivityEvents,
  reportActivity,
  remindActivityQr,
  unblockActivityApplicant,
  updateActivityFavorite,
  updateActivity,
  updateActivityQr
};
