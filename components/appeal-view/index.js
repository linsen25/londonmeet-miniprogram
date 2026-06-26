const { fetchAccountAppeals, submitAccountAppeal } = require("../../api/appeal");

Component({
  data: {
    content: "",
    contentLength: 0,
    submitting: false,
    loading: false,
    appeals: [],
    hasPending: false
  },

  lifetimes: {
    attached() {
      this.loadAppeals();
    }
  },

  methods: {
    loadAppeals() {
      this.setData({ loading: true });
      fetchAccountAppeals()
        .then((appeals) => {
          const list = (appeals || []).map((item) => ({
            ...item,
            statusText: item.status === "PENDING"
              ? "处理中"
              : item.status === "APPROVED" ? "已通过" : "已驳回",
            createdText: item.createdAt
              ? new Date(item.createdAt).toLocaleString("zh-CN")
              : ""
          }));
          this.setData({
            appeals: list,
            hasPending: list.some((item) => item.status === "PENDING")
          });
          const accountStatus = list.length ? list[0].accountStatus : "";
          if (accountStatus === "ACTIVE") {
            const loginUser = wx.getStorageSync("loginUser") || {};
            wx.setStorageSync("loginUser", { ...loginUser, status: "ACTIVE" });
            this.triggerEvent("statuschange", { status: "ACTIVE" });
          }
        })
        .catch((error) => {
          wx.showToast({ title: error.message || "申诉记录加载失败", icon: "none" });
        })
        .finally(() => this.setData({ loading: false }));
    },

    onBackTap() {
      if (!this.data.submitting) this.triggerEvent("close");
    },

    onContentInput(event) {
      const content = String(event.detail.value || "").slice(0, 1000);
      this.setData({ content, contentLength: content.length });
    },

    onSubmit() {
      if (this.data.submitting || this.data.hasPending) return;
      const content = this.data.content.trim();
      if (!content) {
        wx.showToast({ title: "请填写申诉说明", icon: "none" });
        return;
      }
      wx.showModal({
        title: "确认提交申诉",
        content: "同一次账号禁用只能保留一条处理中申诉，请确认内容已填写完整。",
        confirmText: "提交申诉",
        success: (result) => {
          if (!result.confirm) return;
          this.setData({ submitting: true });
          submitAccountAppeal(content)
            .then(() => {
              wx.showToast({ title: "申诉已提交", icon: "success" });
              this.setData({ content: "", contentLength: 0 });
              this.loadAppeals();
            })
            .catch((error) => {
              wx.showToast({ title: error.message || "申诉提交失败", icon: "none" });
            })
            .finally(() => this.setData({ submitting: false }));
        }
      });
    }
  }
});
