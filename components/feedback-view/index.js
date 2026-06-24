const { submitFeedback } = require("../../api/feedback");

Component({
  data: {
    subject: "",
    content: "",
    subjectLength: 0,
    contentLength: 0,
    submitting: false
  },

  methods: {
    onBackTap() {
      if (this.data.submitting) return;
      this.triggerEvent("close");
    },

    onSubjectInput(event) {
      const subject = String(event.detail.value || "").slice(0, 100);
      this.setData({ subject, subjectLength: subject.length });
    },

    onContentInput(event) {
      const content = String(event.detail.value || "").slice(0, 1000);
      this.setData({ content, contentLength: content.length });
    },

    onSubmit() {
      if (this.data.submitting) return;
      const subject = this.data.subject.trim();
      const content = this.data.content.trim();
      if (!subject) {
        wx.showToast({ title: "请填写意见主题", icon: "none" });
        return;
      }
      if (!content) {
        wx.showToast({ title: "请填写意见内容", icon: "none" });
        return;
      }
      wx.showModal({
        title: "确认提交",
        content: "确定提交这条意见吗？",
        confirmText: "确认提交",
        cancelText: "再看看",
        success: (result) => {
          if (!result.confirm) return;
          this.setData({ submitting: true });
          submitFeedback({ subject, content })
            .then(() => {
              wx.showToast({ title: "意见已提交", icon: "success" });
              this.setData({ subject: "", content: "", subjectLength: 0, contentLength: 0 });
              setTimeout(() => this.triggerEvent("close"), 500);
            })
            .catch((error) => {
              wx.showToast({
                title: (error && error.message) || "提交失败",
                icon: "none"
              });
            })
            .finally(() => this.setData({ submitting: false }));
        }
      });
    }
  }
});
