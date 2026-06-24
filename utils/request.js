const API_BASE_URL = "http://127.0.0.1:8080/api";

function request(options) {
  const { url, method = "GET", data = {}, header = {} } = options || {};
  const token = wx.getStorageSync("token");
  const authHeader = token ? { Authorization: `Bearer ${token}` } : {};

  return new Promise((resolve, reject) => {
    wx.request({
      url: `${API_BASE_URL}${url}`,
      method,
      data,
      header: {
        "content-type": "application/json",
        ...authHeader,
        ...header
      },
      success(res) {
        const status = res.statusCode || 0;
        if (status >= 200 && status < 300) {
          const body = res.data || {};

          if (Object.prototype.hasOwnProperty.call(body, "code")) {
            if (body.code === 200) {
              resolve(body.data);
              return;
            }

            reject({
              statusCode: status,
              message: body.message || "Request failed",
              response: body
            });
            return;
          }

          resolve(body);
          return;
        }

        reject({
          statusCode: status,
          message: "Request failed",
          response: res.data
        });
      },
      fail(err) {
        reject({
          message: err && err.errMsg ? err.errMsg : "Network request failed",
          response: err
        });
      }
    });
  });
}

module.exports = {
  API_BASE_URL,
  request
};
