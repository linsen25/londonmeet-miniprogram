const { request } = require("../utils/request");

const SEARCH_ENDPOINTS = {
  activities: "/v1/search/activities"
};

function normalizePost(raw) {
  const post = raw || {};

  return {
    _id: post._id || post.id,
    title: post.title || "",
    authorName: post.authorName || "",
    coverUrl: post.coverUrl || "",
    avatarUrl: post.avatarUrl || "",
    favoriteCount: Number(post.favoriteCount) || 0,
    favorited: !!post.favorited,
    progressPct: post.progressPct == null ? post.progressPercent : post.progressPct,
    startAt: Number(post.startAt) || 0,
    endAt: Number(post.endAt) || 0,
    progressGif: post.progressGif || ""
  };
}

function searchActivities(params) {
  const { keyword = "", tags = [], page = 1, pageSize = 20 } = params || {};

  return request({
    url: SEARCH_ENDPOINTS.activities,
    method: "GET",
    data: {
      keyword,
      tags: (tags || []).join(","),
      page,
      pageSize
    }
  }).then((res) => ({
    ...res,
    list: (res.list || []).map(normalizePost)
  }));
}

module.exports = {
  SEARCH_ENDPOINTS,
  searchActivities
};
