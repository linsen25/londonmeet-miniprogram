const {
  approveActivityRegistration,
  fetchPendingReviews,
  rejectActivityRegistration
} = require("../../api/activity");

function formatAppliedText(ts) {
  const time = Number(ts) || 0;
  if (!time) return "";

  const diff = Math.max(0, Date.now() - time);
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "刚刚";
  if (minutes < 60) return `${minutes}分钟前`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}小时前`;

  const days = Math.floor(hours / 24);
  return `${days}天前`;
}

function enrichReview(item) {
  const applicationText = item.applicationText || "";
  const preview = applicationText
    ? `${Array.from(applicationText).slice(0, 4).join("")}${Array.from(applicationText).length > 4 ? "…" : ""}`
    : "未填写";
  return {
    ...item,
    applicationText,
    applicationPreview: preview,
    fullApplicationText: applicationText || "未填写报名申请",
    punctualText: formatRating(item.punctualRating),
    communicationText: formatRating(item.communicationRating),
    friendlyText: formatRating(item.friendlyRating),
    hasMemberRating: [
      item.punctualRating,
      item.communicationRating,
      item.friendlyRating
    ].some((value) => value != null),
    appliedText: formatAppliedText(item.appliedAt)
  };
}

function formatRating(value) {
  const rating = Number(value);
  return Number.isFinite(rating) && rating > 0 ? `${rating.toFixed(1)}/5` : "暂无评价";
}

Component({
  lifetimes: {
    attached() {
      this.loadPendingReviews();
    }
  },

  data: {
    reviewers: [],
    loading: false,
    actingId: null,
    showDetail: false,
    selectedReview: null
  },

  methods: {
    noop() {},

    onBack() {
      this.triggerEvent("close");
    },

    loadPendingReviews() {
      this.setData({ loading: true });

      fetchPendingReviews()
        .then((reviewers) => {
          const items = (reviewers || []).map(enrichReview);
          this.setData({
            reviewers: items
          });
          this.triggerEvent("countchange", { count: items.length });
        })
        .catch((err) => {
          wx.showToast({
            title: (err && err.message) || "待审核列表加载失败",
            icon: "none"
          });
        })
        .finally(() => {
          this.setData({ loading: false });
        });
    },

    onOpenDetail(e) {
      const index = Number(e.currentTarget.dataset.index);
      const selectedReview = this.data.reviewers[index];
      if (!selectedReview) return;

      this.setData({
        showDetail: true,
        selectedReview
      });
    },

    onCloseDetail() {
      this.setData({
        showDetail: false,
        selectedReview: null
      });
    },

    onApprove(e) {
      const id = e.currentTarget.dataset.id;
      if (!id || this.data.actingId) return;

      wx.showModal({
        title: "确认通过审核？",
        content: "通过后，该成员将可以加入群聊。",
        confirmText: "通过",
        cancelText: "取消",
        success: (res) => {
          if (res.confirm) {
            this.reviewRegistration(id, approveActivityRegistration, "已通过");
          }
        }
      });
    },

    onReject(e) {
      const id = e.currentTarget.dataset.id;
      if (!id || this.data.actingId) return;

      wx.showModal({
        title: "确认拒绝报名？",
        content: "拒绝后，该成员将无法加入该活动群聊。",
        confirmText: "拒绝",
        confirmColor: "#FF3B30",
        cancelText: "取消",
        success: (res) => {
          if (res.confirm) {
            this.reviewRegistration(id, rejectActivityRegistration, "已拒绝");
          }
        }
      });
    },

    reviewRegistration(id, action, successText) {
      this.setData({ actingId: id });

      action(id)
        .then(() => {
          const reviewers = this.data.reviewers.filter((item) => String(item.registrationId) !== String(id));
          const selectedReview = this.data.selectedReview;
          const isSelected = selectedReview && String(selectedReview.registrationId) === String(id);

          this.setData({
            reviewers,
            showDetail: isSelected ? false : this.data.showDetail,
            selectedReview: isSelected ? null : selectedReview
          });
          this.triggerEvent("countchange", { count: reviewers.length });
          wx.showToast({
            title: successText,
            icon: "none"
          });
        })
        .catch((err) => {
          wx.showToast({
            title: (err && err.message) || "操作失败",
            icon: "none"
          });
        })
        .finally(() => {
          this.setData({ actingId: null });
        });
    }
  }
});
