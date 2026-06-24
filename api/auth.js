const { request } = require("../utils/request");

function wechatLogin(params) {
  const { code, nickname = "", avatarUrl = "" } = params || {};

  return request({
    url: "/auth/wechat-login",
    method: "POST",
    data: {
      code,
      nickname,
      avatarUrl
    }
  });
}

module.exports = {
  wechatLogin
};
