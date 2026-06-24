const { request } = require("../utils/request");

function normalizeTag(raw) {
  const tag = raw || {};
  const id = Number(tag.id);

  return {
    id,
    name: tag.name || ""
  };
}

function fetchActivityTags() {
  return request({
    url: "/v1/tags",
    method: "GET"
  }).then((res) => (res || []).map(normalizeTag).filter((tag) => tag.id && tag.name));
}

module.exports = {
  fetchActivityTags
};
