const {
  cancelActivityByCreator,
  fetchActivityDetail,
  fetchMyCreatedActivityPosts,
  updateActivityQr
} = require("../../api/activity");

const ACTIVITY_CANCEL_REASONS = [
  { key: "time_changed", label: "时间安排变化" },
  { key: "location_unavailable", label: "地点无法确认" },
  { key: "not_enough_people", label: "人数不足" },
  { key: "content_changed", label: "活动内容调整" },
  { key: "not_holding", label: "不再举办" },
  { key: "other", label: "其他原因" }
];

Component({
  properties: {
    accountDisabled: {
      type: Boolean,
      value: false
    },
    pendingReviewCount: {
      type: Number,
      value: 0
    }
  },

  data: {
    loading: false,
    refreshing: false,
    loadingMore: false,
    page: 1,
    pageSize: 20,
    hasMore: false,
    posts: [],
    showQrPopup: false,
    qrActivityId: null,
    qrActivityTitle: "",
    qrSaving: false,
    cancelSaving: false
  },

  lifetimes: {
    attached() {
      this.loadActivities();
    }
  },

  methods: {
    noop() {},

    loadActivities(options) {
      const { page = 1, append = false, refresh = false } = options || {};
      if (this.data.loading || this.data.loadingMore) return;
      this.setData({
        loading: !append && !refresh,
        refreshing: !!refresh,
        loadingMore: !!append
      });
      fetchMyCreatedActivityPosts({ page, pageSize: this.data.pageSize })
        .then((res) => this.setData({
          posts: append ? (this.data.posts || []).concat(res.list || []) : (res.list || []),
          page: Number(res.page) || page,
          hasMore: !!res.hasMore
        }))
        .catch((err) => {
          console.error("[my activities load failed]", err);
          wx.showToast({ title: err.message || "我的活动加载失败", icon: "none" });
        })
        .finally(() => this.setData({ loading: false, refreshing: false, loadingMore: false }));
    },

    onRefresh() {
      this.loadActivities({ page: 1, refresh: true });
    },

    onLoadMore() {
      if (!this.data.hasMore || this.data.loading || this.data.loadingMore) return;
      this.loadActivities({ page: this.data.page + 1, append: true });
    },

    onClose() {
      this.triggerEvent("close");
    },

    onTapPendingReview() {
      if (this.properties.accountDisabled) {
        wx.showToast({ title: "账号已禁用，暂时不能审核报名", icon: "none" });
        return;
      }
      this.triggerEvent("openpendingreview");
    },

    onTapCard(event) {
      const id = event && event.detail ? event.detail.id : null;
      const item = (this.data.posts || []).find((post) => post._id === id || post.id === id);
      if (!id || !item) return;
      wx.showActionSheet({
        itemList: ["查看活动", "修改活动内容", "修改群二维码", "下架活动"],
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
          } else if (res.tapIndex === 3) {
            this.openCancelActivity(id, item.title || "");
          }
        }
      });
    },

    openCancelActivity(id, title) {
      if (this.data.cancelSaving) return;
      wx.showActionSheet({
        itemList: ACTIVITY_CANCEL_REASONS.map((item) => item.label),
        success: (action) => {
          const reason = ACTIVITY_CANCEL_REASONS[action.tapIndex];
          if (!reason) return;
          wx.showModal({
            title: "下架活动",
            content: `确认下架「${title}」？下架后不可恢复，系统会通知相关报名和收藏用户。`,
            editable: true,
            placeholderText: reason.key === "other" ? "请填写下架原因" : "可补充说明",
            confirmText: "确认下架",
            confirmColor: "#ee4d4d",
            success: (res) => {
              if (!res.confirm) return;
              const reasonText = String(res.content || "").trim();
              if (reason.key === "other" && !reasonText) {
                wx.showToast({ title: "请填写下架原因", icon: "none" });
                return;
              }
              this.cancelActivity(id, {
                reasonType: reason.key,
                reasonText: reasonText || reason.label
              });
            }
          });
        }
      });
    },

    cancelActivity(id, payload) {
      this.setData({ cancelSaving: true });
      cancelActivityByCreator(id, payload)
        .then(() => {
          this.setData({
            posts: (this.data.posts || []).filter((item) => item._id !== id && item.id !== id)
          });
          wx.showToast({ title: "活动已下架", icon: "success" });
        })
        .catch((err) => {
          wx.showToast({ title: (err && err.message) || "下架失败", icon: "none" });
        })
        .finally(() => this.setData({ cancelSaving: false }));
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
          if (detail.editBlockedReason === "ended") {
            message = "活动已结束，不能再修改活动内容。";
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
