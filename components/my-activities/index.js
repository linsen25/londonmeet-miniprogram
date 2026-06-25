const {
  fetchActivityDetail,
  fetchMyCreatedActivityPosts,
  updateActivityQr
} = require("../../api/activity");

Component({
  data: {
    loading: false,
    posts: [],
    showQrPopup: false,
    qrActivityId: null,
    qrActivityTitle: "",
    qrSaving: false
  },

  lifetimes: {
    attached() {
      this.loadActivities();
    }
  },

  methods: {
    noop() {},

    loadActivities() {
      if (this.data.loading) return;
      this.setData({ loading: true });
      fetchMyCreatedActivityPosts({ page: 1, pageSize: 50 })
        .then((res) => this.setData({ posts: res.list || [] }))
        .catch((err) => {
          console.error("[my activities load failed]", err);
          wx.showToast({ title: err.message || "我的活动加载失败", icon: "none" });
        })
        .finally(() => this.setData({ loading: false }));
    },

    onClose() {
      this.triggerEvent("close");
    },

    onTapCard(event) {
      const id = event && event.detail ? event.detail.id : null;
      const item = (this.data.posts || []).find((post) => post._id === id || post.id === id);
      if (!id || !item) return;
      wx.showActionSheet({
        itemList: ["查看活动", "修改活动内容", "修改群二维码"],
        success: (res) => {
          if (res.tapIndex === 0) {
            this.triggerEvent("openpost", { id });
          } else if (res.tapIndex === 1) {
            this.checkAndOpenEdit(id);
          } else if (res.tapIndex === 2) {
            this.setData({
              showQrPopup: true,
              qrActivityId: id,
              qrActivityTitle: item.title || "",
              qrSaving: false
            }, () => {
              const uploader = this.selectComponent("#replaceQrUploader");
              if (uploader && typeof uploader.reset === "function") {
                uploader.reset({ url: "", remainingDays: 7 });
              }
            });
          }
        }
      });
    },

    checkAndOpenEdit(id) {
      wx.showLoading({ title: "检查修改资格...", mask: true });
      fetchActivityDetail(id)
        .then((detail) => {
          if (detail.canEdit) {
            this.triggerEvent("edit", { id });
            return;
          }

          let message = "该活动当前无法修改。";
          if (detail.editBlockedReason === "edit_limit_reached") {
            message = "该活动的一次修改机会已经使用完。";
          } else if (detail.editBlockedReason === "within_12_hours") {
            message = "距离原活动开始时间已不足12小时，不能再修改活动内容。";
          } else if (detail.editBlockedReason === "not_creator") {
            message = "只有活动发起者可以修改活动。";
          }
          wx.showModal({
            title: "无法修改",
            content: message,
            showCancel: false,
            confirmText: "知道了"
          });
        })
        .catch((err) => {
          wx.showToast({ title: err.message || "修改资格检查失败", icon: "none" });
        })
        .finally(() => wx.hideLoading());
    },

    onCloseQrPopup() {
      if (this.data.qrSaving) return;
      this.setData({ showQrPopup: false, qrActivityId: null });
    },

    onQrUploaderChange(event) {
      this._qrUploaderValue = event.detail || {};
    },

    onSaveQr() {
      if (this.data.qrSaving) return;
      const uploader = this.selectComponent("#replaceQrUploader");
      const value = uploader && typeof uploader.getValue === "function"
        ? uploader.getValue()
        : (this._qrUploaderValue || {});
      if (value.uploading) {
        wx.showToast({ title: "二维码正在上传，请稍候", icon: "none" });
        return;
      }
      if (value.failed || !value.url) {
        wx.showToast({ title: "请先上传新的群二维码", icon: "none" });
        return;
      }
      this.setData({ qrSaving: true });
      updateActivityQr(this.data.qrActivityId, {
        inviteQrUrl: value.url,
        remainingDays: Number(value.remainingDays) || 7
      })
        .then(() => {
          wx.showToast({ title: "二维码已更新", icon: "success" });
          this.setData({ showQrPopup: false, qrActivityId: null });
        })
        .catch((err) => {
          wx.showToast({ title: err.message || "二维码更新失败", icon: "none" });
        })
        .finally(() => this.setData({ qrSaving: false }));
    }
  }
});
