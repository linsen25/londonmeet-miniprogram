const { API_BASE_URL } = require("../utils/request");

const API_ORIGIN = API_BASE_URL.replace(/\/api\/?$/, "");

function resolveBackendUrl(url) {
  if (!url) return "";
  if (/^https?:\/\//i.test(url)) return url;
  if (url.charAt(0) === "/") return `${API_ORIGIN}${url}`;
  return url;
}

function uploadImage(filePath, options) {
  const { folder = "londonmeet/dev" } = options || {};
  const token = wx.getStorageSync("token");

  return new Promise((resolve, reject) => {
    if (!filePath) {
      reject({ message: "图片路径为空" });
      return;
    }

    wx.uploadFile({
      url: `${API_BASE_URL}/v1/uploads/image`,
      filePath,
      name: "file",
      header: token ? { Authorization: `Bearer ${token}` } : {},
      formData: {
        folder
      },
      success(res) {
        let body = {};
        try {
          body = JSON.parse(res.data || "{}");
        } catch (err) {
          reject({ message: "图片上传响应解析失败", response: res });
          return;
        }

        const data = body.data || body;
        if (res.statusCode >= 200 && res.statusCode < 300 && body.code === 200 && data.secureUrl) {
          resolve({
            url: resolveBackendUrl(data.secureUrl),
            secureUrl: resolveBackendUrl(data.secureUrl),
            publicId: data.publicId || "",
            bytes: Number(data.bytes) || 0,
            width: Number(data.width) || 0,
            height: Number(data.height) || 0
          });
          return;
        }

        reject({
          statusCode: res.statusCode,
          message: body.message || "图片上传失败",
          response: body
        });
      },
      fail(err) {
        reject({
          message: err && err.errMsg ? err.errMsg : "图片上传失败",
          response: err
        });
      }
    });
  });
}

module.exports = {
  uploadImage
};
