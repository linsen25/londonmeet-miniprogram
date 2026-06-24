const { request } = require("../utils/request");

function submitFeedback(data) {
  return request({
    url: "/v1/feedback",
    method: "POST",
    data: {
      subject: data && data.subject ? data.subject : "",
      content: data && data.content ? data.content : ""
    }
  });
}

module.exports = { submitFeedback };
