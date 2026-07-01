const {
  approveActivityRegistration,
  blacklistActivityRegistration,
  fetchActivityReviewBlacklist,
  fetchActivityReviewRegistrations,
  fetchPendingReviewActivities,
  rejectActivityRegistration,
  unblockActivityApplicant
} = require("../../api/activity");

const STATUS_OPTIONS = [
  { key: "all", label: "全部" },
  { key: "pending", label: "待审核" },
  { key: "approved", label: "已通过" },
  { key: "rejected", label: "已拒绝" }
];

const REJECT_REASONS = [
  { key: "not_match", label: "不符合要求" },
  { key: "full", label: "名额已满" },
  { key: "incomplete", label: "信息不完整" },
  { key: "other", label: "其他原因" }
];

const BLACKLIST_REASONS = [
  { key: "no_show", label: "多次无故缺席" },
  { key: "not_match", label: "不符合要求" },
  { key: "spam", label: "恶意报名" },
  { key: "harassment", label: "骚扰他人" },
  { key: "other", label: "其他原因" }
];

function formatRelativeTime(ts) {
  const time = Number(ts) || 0;
  if (!time) return "";
  const diff = Math.max(0, Date.now() - time);
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "刚刚";
  if (minutes < 60) return `${minutes}分钟前`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}小时前`;
  return `${Math.floor(hours / 24)}天前`;
}

function formatDate(ts) {
  const time = Number(ts) || 0;
  if (!time) return "";
  const date = new Date(time);
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");
  return `${month}/${day} ${hour}:${minute}`;
}

function statusText(status) {
  return {
    pending: "待审核",
    approved: "已通过",
    joined_group: "已入群",
    rejected: "已拒绝",
    cancelled: "已取消",
    blacklisted: "已拉黑"
  }[status] || "未知";
}

function enrichApplicant(item) {
  const ratings = [item.punctualRating, item.communicationRating, item.friendlyRating]
    .map(Number)
    .filter((value) => Number.isFinite(value) && value > 0);
  const overallRating = ratings.length
    ? ratings.reduce((sum, value) => sum + value, 0) / ratings.length
    : 5;
  const applicationText = item.applicationText || "";

  return {
    ...item,
    displayUserId: item.displayId || item.userId || "",
    statusText: statusText(item.status),
    appliedText: formatRelativeTime(item.appliedAt),
    blacklistedText: formatRelativeTime(item.blacklistedAt),
    applicationText,
    applicationPreview: applicationText || "未填写报名消息",
    reasonText: item.reviewReasonText || "未填写原因",
    overallRatingText: `${overallRating.toFixed(1)}/5`,
    punctualRatingText: item.punctualRating == null ? "暂无" : `${Number(item.punctualRating).toFixed(1)}/5`,
    communicationRatingText: item.communicationRating == null ? "暂无" : `${Number(item.communicationRating).toFixed(1)}/5`,
    friendlyRatingText: item.friendlyRating == null ? "暂无" : `${Number(item.friendlyRating).toFixed(1)}/5`,
    hasRealRating: ratings.length > 0,
    reviewCount: Number(item.reviewCount) || 0,
    canReview: item.status === "pending"
  };
}

function enrichActivity(item) {
  return {
    ...item,
    startText: formatDate(item.startAt),
    latestText: formatRelativeTime(item.latestAppliedAt),
    summaryText: `${item.totalRegistrationCount}人报名 · ${item.pendingCount}待审核 · ${item.approvedCount}通过`
  };
}

Component({
  lifetimes: {
    attached() {
      this.loadActivities();
    }
  },

  data: {
    activities: [],
    applicants: [],
    blacklist: [],
    selectedActivity: null,
    viewMode: "activities",
    activeTab: "registrations",
    statusOptions: STATUS_OPTIONS,
    statusFilter: "all",
    loading: false,
    actingId: null
  },

  methods: {
    noop() {},

    onBack() {
      if (this.data.viewMode === "detail") {
        this.setData({
          viewMode: "activities",
          selectedActivity: null,
          applicants: [],
          blacklist: [],
          activeTab: "registrations",
          statusFilter: "all"
        });
        this.loadActivities();
        return;
      }
      this.triggerEvent("close");
    },

    loadActivities() {
      this.setData({ loading: true });
      fetchPendingReviewActivities()
        .then((activities) => {
          const items = (activities || []).map(enrichActivity);
          this.setData({ activities: items });
          const count = items.reduce((sum, item) => sum + Number(item.pendingCount || 0), 0);
          this.triggerEvent("countchange", { count });
        })
        .catch((err) => {
          wx.showToast({ title: (err && err.message) || "审核活动加载失败", icon: "none" });
        })
        .finally(() => this.setData({ loading: false }));
    },

    onOpenActivity(e) {
      const index = Number(e.currentTarget.dataset.index);
      const selectedActivity = this.data.activities[index];
      if (!selectedActivity) return;
      this.setData({
        selectedActivity,
        viewMode: "detail",
        activeTab: "registrations",
        statusFilter: "all"
      });
      this.loadApplicants();
    },

    onSwitchTab(e) {
      const tab = e.currentTarget.dataset.tab;
      if (!tab || tab === this.data.activeTab) return;
      this.setData({ activeTab: tab });
      if (tab === "blacklist") {
        this.loadBlacklist();
      } else {
        this.loadApplicants();
      }
    },

    onSelectStatus(e) {
      const statusFilter = e.currentTarget.dataset.status || "all";
      if (statusFilter === this.data.statusFilter) return;
      this.setData({ statusFilter });
      this.loadApplicants();
    },

    loadApplicants() {
      const activity = this.data.selectedActivity;
      if (!activity) return;
      this.setData({ loading: true });
      fetchActivityReviewRegistrations(activity.activityId, this.data.statusFilter)
        .then((items) => this.setData({ applicants: (items || []).map(enrichApplicant) }))
        .catch((err) => wx.showToast({ title: (err && err.message) || "报名名单加载失败", icon: "none" }))
        .finally(() => this.setData({ loading: false }));
    },

    loadBlacklist() {
      const activity = this.data.selectedActivity;
      if (!activity) return;
      this.setData({ loading: true });
      fetchActivityReviewBlacklist(activity.activityId)
        .then((items) => this.setData({ blacklist: (items || []).map(enrichApplicant) }))
        .catch((err) => wx.showToast({ title: (err && err.message) || "黑名单加载失败", icon: "none" }))
        .finally(() => this.setData({ loading: false }));
    },

    onApprove(e) {
      const id = e.currentTarget.dataset.id;
      if (!id || this.data.actingId) return;
      wx.showModal({
        title: "通过报名",
        content: "通过后对方可以查看活动群二维码。",
        confirmText: "通过",
        success: (res) => {
          if (res.confirm) {
            this.reviewRegistration(id, approveActivityRegistration, {}, "已通过");
          }
        }
      });
    },

    onReject(e) {
      const id = e.currentTarget.dataset.id;
      if (!id || this.data.actingId) return;
      this.pickReason(REJECT_REASONS, (payload) => {
        this.reviewRegistration(id, rejectActivityRegistration, payload, "已拒绝");
      });
    },

    onBlacklist(e) {
      const id = e.currentTarget.dataset.id;
      if (!id || this.data.actingId) return;
      this.pickReason(BLACKLIST_REASONS, (payload) => {
        this.reviewRegistration(id, blacklistActivityRegistration, payload, "已拉黑");
      });
    },

    pickReason(reasons, done) {
      wx.showActionSheet({
        itemList: reasons.map((item) => item.label),
        success: (action) => {
          const reason = reasons[action.tapIndex];
          if (!reason) return;
          wx.showModal({
            title: reason.label,
            content: "可以补充说明，也可以直接确认。",
            editable: true,
            placeholderText: "补充原因",
            confirmText: "确认",
            success: (res) => {
              if (!res.confirm) return;
              done({
                reasonType: reason.key,
                reasonText: (res.content || reason.label).trim() || reason.label
              });
            }
          });
        }
      });
    },

    reviewRegistration(id, action, payload, successText) {
      this.setData({ actingId: id });
      action(id, payload)
        .then((result) => {
          if (result && result.status === "pending") {
            wx.showToast({ title: "名额已满，申请继续等待", icon: "none" });
            return;
          }
          wx.showToast({ title: successText, icon: "none" });
          if (this.data.activeTab === "blacklist") {
            this.loadBlacklist();
          } else {
            this.loadApplicants();
          }
        })
        .catch((err) => wx.showToast({ title: (err && err.message) || "操作失败", icon: "none" }))
        .finally(() => this.setData({ actingId: null }));
    },

    onUnblock(e) {
      const id = e.currentTarget.dataset.id;
      if (!id || this.data.actingId) return;
      wx.showModal({
        title: "移出黑名单",
        content: "移出后，对方可以重新看到并报名你的活动。",
        confirmText: "移出",
        success: (res) => {
          if (!res.confirm) return;
          this.setData({ actingId: id });
          unblockActivityApplicant(id)
            .then(() => {
              wx.showToast({ title: "已移出", icon: "none" });
              this.loadBlacklist();
            })
            .catch((err) => wx.showToast({ title: (err && err.message) || "操作失败", icon: "none" }))
            .finally(() => this.setData({ actingId: null }));
        }
      });
    }
  }
});
