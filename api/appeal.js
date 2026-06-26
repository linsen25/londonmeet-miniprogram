const { request } = require("../utils/request");

function fetchAccountAppeals() {
  return request({
    url: "/v1/appeals",
    method: "GET"
  });
}

function submitAccountAppeal(content) {
  return request({
    url: "/v1/appeals",
    method: "POST",
    data: { content: content || "" }
  });
}

module.exports = {
  fetchAccountAppeals,
  submitAccountAppeal
};
