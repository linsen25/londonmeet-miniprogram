const { API_BASE_URL, request } = require("../utils/request");

const API_ORIGIN = API_BASE_URL.replace(/\/api\/?$/, "");

function resolveBackendUrl(url) {
  if (!url) return "";
  if (/^https?:\/\//i.test(url)) return url;
  if (url.charAt(0) === "/") return `${API_ORIGIN}${url}`;
  return url;
}

function fetchStaticMap(address) {
  return request({
    url: "/map/static",
    method: "GET",
    data: { address }
  }).then((res) => ({
    ...(res || {}),
    imageUrl: resolveBackendUrl(res && res.imageUrl)
  }));
}

module.exports = {
  fetchStaticMap
};
