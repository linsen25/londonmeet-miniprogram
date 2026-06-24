const { request } = require("../utils/request");
const { resolveAssetUrl } = require("./activity");

const REVIEW_ENDPOINTS = {
  tasks: "/v1/reviews/tasks",
  submit: "/v1/reviews"
};

function formatTime(value) {
  const timestamp = Number(value) || 0;
  if (!timestamp) return "";

  const date = new Date(timestamp);
  const pad = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function normalizeReviewTask(raw) {
  const item = raw || {};
  const mode = item.mode || "activity";
  const id = item.id || `${mode}-${item.activityId || ""}-${item.targetId || 0}`;

  return {
    _id: id,
    id,
    mode,
    activityId: item.activityId,
    targetId: item.targetId,
    title: item.title || item.activityTitle || "",
    activityTitle: item.activityTitle || item.title || "",
    name: item.name || item.title || "",
    avatarUrl: resolveAssetUrl(item.avatarUrl || ""),
    startAt: Number(item.startAt) || 0,
    endAt: Number(item.endAt) || 0,
    startText: formatTime(item.startAt),
    endText: formatTime(item.endAt),
    overallRating: Number(item.overallRating) || 0,
    timelinessRating: Number(item.timelinessRating) || 0,
    reviewCount: Number(item.reviewCount) || 0,
    scoreText: item.reviewCount ? `综合评分：${Number(item.overallRating || 0).toFixed(1)}/5` : "综合评分：暂无",
    speedText: item.reviewCount ? `准时守约：${Number(item.timelinessRating || 0).toFixed(1)}/5` : "准时守约：暂无"
  };
}

function fetchReviewTasks(params) {
  const { mode = "" } = params || {};

  return request({
    url: REVIEW_ENDPOINTS.tasks,
    method: "GET",
    data: mode ? { mode } : {}
  }).then((res) => (res || []).map(normalizeReviewTask));
}

function submitReview(payload) {
  return request({
    url: REVIEW_ENDPOINTS.submit,
    method: "POST",
    data: payload || {}
  });
}

module.exports = {
  fetchReviewTasks,
  submitReview
};
