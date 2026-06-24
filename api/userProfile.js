const { API_BASE_URL, request } = require("../utils/request");

const API_ORIGIN = API_BASE_URL.replace(/\/api\/?$/, "");
const FALLBACK_AVATAR = "https://dummyimage.com/300x300/ffffff/111111.png&text=Avatar";
const FALLBACK_COVER = "https://dummyimage.com/1200x800/2b2b2b/ffffff.png&text=Cover";
const DEFAULT_MOTTO = "\u6765\u5427\uff0c\u8ba9\u6211\u8ba4\u8bc6\u66f4\u591a\u6709\u8da3\u7684\u4eba";
const MAX_COVER_MB = 8;
const MAX_COVER_BYTES = MAX_COVER_MB * 1024 * 1024;
const MAX_AVATAR_MB = 5;
const MAX_AVATAR_BYTES = MAX_AVATAR_MB * 1024 * 1024;

function resolveAssetUrl(url, fallback) {
  if (!url) return fallback;
  if (/^https?:\/\//i.test(url)) return url;
  if (url.indexOf("/uploads/avatar/default-avatar") === 0) return FALLBACK_AVATAR;
  if (url.charAt(0) === "/") return `${API_ORIGIN}${url}`;
  return url;
}

function normalizeProfile(raw) {
  const profile = raw || {};
  const stats = profile.stats || {};
  const tags = Array.isArray(profile.tags) ? profile.tags.filter(Boolean) : [];

  return {
    userId: profile.userId,
    name: profile.nickname || "MeetFun User",
    avatarUrl: resolveAssetUrl(profile.avatarUrl, FALLBACK_AVATAR),
    coverUrl: resolveAssetUrl(profile.coverUrl, FALLBACK_COVER),
    motto: profile.motto || DEFAULT_MOTTO,
    tags,
    stats: {
      myEvents: Number(stats.myEvents) || 0,
      ongoing: Number(stats.ongoing) || 0,
      likes: Number(stats.likes) || 0
    }
  };
}

function fetchUserProfile() {
  return request({
    url: "/user/profile",
    method: "GET"
  }).then(normalizeProfile);
}

function updateUserProfile(payload) {
  return request({
    url: "/user/profile",
    method: "PUT",
    data: payload || {}
  }).then(normalizeProfile);
}

function getFileSize(filePath) {
  return new Promise((resolve) => {
    wx.getFileInfo({
      filePath,
      success(res) {
        resolve(Number(res.size) || 0);
      },
      fail() {
        resolve(0);
      }
    });
  });
}

function compressCover(filePath) {
  return new Promise((resolve) => {
    if (!wx.compressImage) {
      resolve(filePath);
      return;
    }

    wx.compressImage({
      src: filePath,
      quality: 80,
      success(res) {
        resolve(res.tempFilePath || filePath);
      },
      fail() {
        resolve(filePath);
      }
    });
  });
}

async function prepareCoverFile(filePath) {
  const compressedPath = await compressCover(filePath);
  const size = await getFileSize(compressedPath);

  if (size > MAX_COVER_BYTES) {
    throw new Error(`\u6587\u4ef6\u4e0d\u53ef\u8d85\u8fc7 ${MAX_COVER_MB}MB`);
  }

  return compressedPath;
}

async function uploadProfileCover(filePath) {
  const preparedPath = await prepareCoverFile(filePath);
  const token = wx.getStorageSync("token");

  return new Promise((resolve, reject) => {
    wx.uploadFile({
      url: `${API_BASE_URL}/user/profile/cover`,
      filePath: preparedPath,
      name: "file",
      header: token ? { Authorization: `Bearer ${token}` } : {},
      success(res) {
        let body = {};
        try {
          body = JSON.parse(res.data || "{}");
        } catch (err) {
          reject({ message: "\u80cc\u666f\u56fe\u4e0a\u4f20\u54cd\u5e94\u89e3\u6790\u5931\u8d25", response: res });
          return;
        }

        if (res.statusCode >= 200 && res.statusCode < 300 && body.code === 200) {
          resolve(resolveAssetUrl(body.data && body.data.coverUrl, FALLBACK_COVER));
          return;
        }

        reject({
          statusCode: res.statusCode,
          message: body.message || `\u80cc\u666f\u56fe\u4e0a\u4f20\u5931\u8d25\uff0c\u6587\u4ef6\u4e0d\u53ef\u8d85\u8fc7 ${MAX_COVER_MB}MB`,
          response: body
        });
      },
      fail(err) {
        reject({
          message: err && err.errMsg ? err.errMsg : "\u80cc\u666f\u56fe\u4e0a\u4f20\u5931\u8d25",
          response: err
        });
      }
    });
  });
}

async function uploadProfileAvatar(filePath) {
  const size = await getFileSize(filePath);
  if (size > MAX_AVATAR_BYTES) {
    throw new Error(`头像不可超过 ${MAX_AVATAR_MB}MB`);
  }

  const token = wx.getStorageSync("token");

  return new Promise((resolve, reject) => {
    wx.uploadFile({
      url: `${API_ORIGIN}/wx/upload-avatar`,
      filePath,
      name: "file",
      header: token ? { Authorization: `Bearer ${token}` } : {},
      success(res) {
        let body = {};
        try {
          body = JSON.parse(res.data || "{}");
        } catch (err) {
          reject({ message: "头像上传响应解析失败", response: res });
          return;
        }

        if (res.statusCode >= 200 && res.statusCode < 300 && body.code === 200) {
          resolve(resolveAssetUrl(body.data && body.data.avatarUrl, FALLBACK_AVATAR));
          return;
        }

        reject({
          statusCode: res.statusCode,
          message: body.message || "头像上传失败",
          response: body
        });
      },
      fail(err) {
        reject({
          message: err && err.errMsg ? err.errMsg : "头像上传失败",
          response: err
        });
      }
    });
  });
}

module.exports = {
  MAX_AVATAR_BYTES,
  MAX_AVATAR_MB,
  MAX_COVER_BYTES,
  MAX_COVER_MB,
  fetchUserProfile,
  updateUserProfile,
  uploadProfileAvatar,
  uploadProfileCover
};
