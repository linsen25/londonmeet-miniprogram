const {
  fetchUserProfile,
  getCachedUserProfile,
  updateUserProfile,
  uploadProfileAvatar,
  uploadProfileCover
} = require("../../api/userProfile");
const {
  fetchMyOngoingActivityPosts,
  fetchPendingReviews,
  updateActivityFavorite,
  cancelActivityRegistration
} = require("../../api/activity");
const { fetchReviewTasks, submitBatchGood } = require("../../api/review");
const { fetchNotificationUnreadCount } = require("../../api/notification");
const { syncNotificationUnreadCount } = require("../../utils/notificationSound");

const BADGE_REFRESH_INTERVAL = 30000;

function gcd(a, b) {
  let x = Math.abs(Math.round(a));
  let y = Math.abs(Math.round(b));
  while (y) {
    const t = y;
    y = x % y;
    x = t;
  }
  return x || 1;
}

function buildCropScale(width, height) {
  const w = Math.max(1, Math.round(width));
  const h = Math.max(1, Math.round(height));
  const d = gcd(w, h);
  return `${Math.round(w / d)}:${Math.round(h / d)}`;
}

function getProfileCoverCropScale() {
  const info = wx.getSystemInfoSync();
  const rpxPerPx = 750 / info.windowWidth;
  const rowRpx = (info.windowHeight / 8) * rpxPerPx;
  return buildCropScale(750, rowRpx * 3);
}

Component({
  properties: {
    accountDisabled: {
      type: Boolean,
      value: false
    }
  },

  data: {
    rowH: "160rpx",
    halfRowH: "80rpx",
    twoRowH: "320rpx",
    threeRowH: "480rpx",
    sevenHalfRowH: "1200rpx",
    outer2CompactH: "320rpx",
    outer2LoadingH: "480rpx",
    outer2MinH: "480rpx",

    profile: {
      coverUrl: "",
      avatarUrl: "/assets/logo.png",
      name: "MeetFun User",
      userId: "",
      displayUserId: "",
      motto: "你好呀，准备好出去转转了么~",
      tags: ["未添加标签"],
      stats: {
        myEvents: 0,
        ongoing: 0
      }
    },
    profileLoading: false,
    showEditProfile: false,
    editProfileSaving: false,
    editName: "",
    editAvatarUrl: "",
    editMotto: "",
    editTags: ["", "", ""],
    unreadNotificationCount: 0,
    hasUnreadNotifications: false,
    pendingReviewCount: 0,
    showMoreMenu: false,

    outer2Tabs: [
      { key: "ongoing", label: "待开始" },
      { key: "review", label: "待评价" }
    ],
    outer2TabValue: "ongoing",
    outer2Loading: false,
    reviewTasksLoading: false,
    outer2ReviewTabs: [
      { key: "event", label: "评价活动" },
      { key: "member", label: "评价成员" }
    ],
    outer2ReviewTabValue: "event",

    outer2Posts: [],

    reviewEventPosts: [],
    reviewMemberPosts: [],
    hasBatchGoodMembers: false,
    showBatchGood: false,
    batchGoodCandidates: [],
    batchGoodSubmitting: false,
    showCancelRegistration: false,
    cancelActivityId: null,
    cancelActivityTitle: "",
    cancelActivityStartAt: 0,
    cancelReasonType: "",
    cancelReasonText: "",
    cancelReasonLength: 0,
    cancelSubmitting: false,
    cancelReasons: [
      { key: "time_conflict", label: "时间冲突" },
      { key: "temporary_issue", label: "临时有事" },
      { key: "activity_changed", label: "活动信息变更" },
      { key: "location_inconvenient", label: "地点不便" },
      { key: "other", label: "其他" }
    ]
  },

  lifetimes: {
    attached() {
      const info = wx.getSystemInfoSync();
      const rpxPerPx = 750 / info.windowWidth;
      const rowPx = info.windowHeight / 8;
      const rowRpx = rowPx * rpxPerPx;

      this.setData({
        rowH: `${rowRpx.toFixed(2)}rpx`,
        halfRowH: `${(rowRpx / 2).toFixed(2)}rpx`,
        twoRowH: `${(rowRpx * 2).toFixed(2)}rpx`,
        threeRowH: `${(rowRpx * 3).toFixed(2)}rpx`,
        sevenHalfRowH: `${(rowRpx * 7.5).toFixed(2)}rpx`,
        outer2CompactH: `${(rowRpx * 1.8).toFixed(2)}rpx`,
        outer2LoadingH: `${(rowRpx * 2.4).toFixed(2)}rpx`,
        outer2MinH: `${(rowRpx * 2.4).toFixed(2)}rpx`
      });

      this.applyCachedProfile();
      this.loadProfile({ force: true });
      this.loadMyOngoingActivities();
      this.loadPendingReviewCount();
      this.loadReviewTasks();
      this.loadNotificationUnreadCount();
      this.startBadgeRefresh();
    },
    detached() {
      this.stopBadgeRefresh();
    }
  },

  pageLifetimes: {
    show() {
      this.startBadgeRefresh();
      this.refreshHomeData({ forceContent: true });
    },
    hide() {
      this.stopBadgeRefresh();
    }
  },

  methods: {
    noop() {},

    updateOuter2MinH(overrides) {
      const state = {
        ...this.data,
        ...(overrides || {})
      };
      let loading = false;
      let hasContent = false;

      if (state.outer2TabValue === "ongoing") {
        loading = !!state.outer2Loading;
        hasContent = !!((state.outer2Posts || []).length);
      } else {
        loading = !!state.reviewTasksLoading;
        hasContent = state.outer2ReviewTabValue === "member"
          ? !!((state.reviewMemberPosts || []).length)
          : !!((state.reviewEventPosts || []).length);
      }

      const nextMinH = loading
        ? state.outer2LoadingH
        : (hasContent ? state.sevenHalfRowH : state.outer2CompactH);

      if (nextMinH && nextMinH !== this.data.outer2MinH) {
        this.setData({ outer2MinH: nextMinH });
      }
    },

    refreshBadges() {
      this.loadPendingReviewCount();
      this.loadNotificationUnreadCount();
    },

    refreshHomeData(options) {
      const opts = options || {};
      this.refreshBadges();
      if (opts.profile) {
        this.loadProfile({ force: true });
      }
      this.refreshVisibleContent({ force: !!opts.forceContent });
    },

    refreshVisibleContent(options) {
      const force = !!(options && options.force);
      const now = Date.now();
      if (!force && this._lastVisibleContentRefreshAt && now - this._lastVisibleContentRefreshAt < 5000) {
        return;
      }
      this._lastVisibleContentRefreshAt = now;

      if (this.data.outer2TabValue === "ongoing") {
        this.loadMyOngoingActivities({ force });
        return;
      }
      this.loadReviewTasks(
        this.data.outer2ReviewTabValue === "member" ? "member" : "activity",
        { force }
      );
    },

    startBadgeRefresh() {
      if (this._badgeRefreshTimer) return;
      this._badgeRefreshTimer = setInterval(() => {
        this.refreshBadges();
      }, BADGE_REFRESH_INTERVAL);
    },

    stopBadgeRefresh() {
      if (!this._badgeRefreshTimer) return;
      clearInterval(this._badgeRefreshTimer);
      this._badgeRefreshTimer = null;
    },

    passTouchStart(e) {
      this.triggerEvent("passthroughstart", e);
    },

    passTouchMove(e) {
      this.triggerEvent("passthroughmove", e);
    },

    passTouchEnd(e) {
      this.triggerEvent("passthroughend", e);
    },

    passTouchCancel(e) {
      this.triggerEvent("passthroughend", e);
    },

    applyCachedProfile() {
      const profile = getCachedUserProfile();
      if (!profile) return false;
      this.setData({ profile });
      this.triggerEvent("accountstatus", { status: profile.status });
      return true;
    },

    loadProfile(options) {
      if (this.data.profileLoading) return;
      const force = !!(options && options.force);
      if (!force && this.applyCachedProfile()) return;
      this.setData({ profileLoading: true });

      fetchUserProfile({ force })
        .then((profile) => {
          const loginUser = wx.getStorageSync("loginUser") || {};
          wx.setStorageSync("loginUser", { ...loginUser, status: profile.status });
          this.setData({ profile });
          this.triggerEvent("accountstatus", { status: profile.status });
        })
        .catch((err) => {
          console.error("[profile load failed]", err);
        })
        .finally(() => {
          this.setData({ profileLoading: false });
        });
    },

    loadMyOngoingActivities(options) {
      if (this.data.outer2Loading) return;
      this.setData({ outer2Loading: true }, () => this.updateOuter2MinH());

      fetchMyOngoingActivityPosts({
        page: 1,
        pageSize: 30
      })
        .then((res) => {
          this.setData({
            outer2Posts: res.list || []
          }, () => this.updateOuter2MinH());
        })
        .catch((err) => {
          console.error("[my ongoing activities load failed]", err);
          this.setData({
            outer2Posts: []
          }, () => this.updateOuter2MinH());
        })
        .finally(() => {
          this.setData({ outer2Loading: false }, () => this.updateOuter2MinH());
        });
    },

    loadPendingReviewCount() {
      fetchPendingReviews()
        .then((items) => {
          this.updatePendingReviewCount((items || []).length);
        })
        .catch((err) => {
          console.error("[pending review count load failed]", err);
          this.updatePendingReviewCount(0);
        });
    },

    updatePendingReviewCount(count) {
      const nextCount = Math.max(0, Number(count) || 0);
      this.setData({ pendingReviewCount: nextCount });
      this.triggerEvent("pendingreviewcountchange", { count: nextCount });
    },

    loadReviewTasks(mode, options) {
      if (this.properties.accountDisabled) {
        this.setData({
          reviewEventPosts: [],
          reviewMemberPosts: [],
          hasBatchGoodMembers: false
        });
        return;
      }
      if (this.data.reviewTasksLoading) return;

      const requestMode = mode || "";
      this.setData({ reviewTasksLoading: true }, () => this.updateOuter2MinH());

      fetchReviewTasks({ mode: requestMode })
        .then((items) => {
          const tasks = items || [];
          const nextData = {};

          if (!requestMode || requestMode === "activity") {
            nextData.reviewEventPosts = tasks.filter((item) => item.mode === "activity");
          }
          if (!requestMode || requestMode === "member") {
            nextData.reviewMemberPosts = tasks.filter((item) => item.mode === "member");
            nextData.hasBatchGoodMembers = nextData.reviewMemberPosts.some(
              (item) => item.canBatchGood
            );
          }

          this.setData(nextData, () => this.updateOuter2MinH());
        })
        .catch((err) => {
          console.error("[review tasks load failed]", err);
          const nextData = {};
          if (!requestMode || requestMode === "activity") {
            nextData.reviewEventPosts = [];
          }
          if (!requestMode || requestMode === "member") {
            nextData.reviewMemberPosts = [];
            nextData.hasBatchGoodMembers = false;
          }
          this.setData(nextData, () => this.updateOuter2MinH());
        })
        .finally(() => {
          this.setData({ reviewTasksLoading: false }, () => this.updateOuter2MinH());
        });
    },

    loadNotificationUnreadCount() {
      fetchNotificationUnreadCount()
        .then((count) => {
          syncNotificationUnreadCount(count);
          this.setData({
            unreadNotificationCount: count,
            hasUnreadNotifications: count > 0
          });
        })
        .catch((err) => {
          console.error("[notification unread count load failed]", err);
          this.setData({
            unreadNotificationCount: 0,
            hasUnreadNotifications: false
          });
        });
    },

    updateNotificationUnreadCount(count) {
      const unreadCount = Number(count) || 0;
      syncNotificationUnreadCount(unreadCount, { silent: true });
      this.setData({
        unreadNotificationCount: unreadCount,
        hasUnreadNotifications: unreadCount > 0
      });
    },

    onTapMore() {
      this.setData({ showMoreMenu: true });
    },

    onCloseMoreMenu() {
      this.setData({ showMoreMenu: false });
    },

    onTapFeedback() {
      if (this.properties.accountDisabled) {
        wx.showToast({ title: "账号禁用期间请使用“我要申诉”", icon: "none" });
        return;
      }
      this.setData({ showMoreMenu: false });
      this.triggerEvent("openfeedback");
    },

    onTapAppeal() {
      this.setData({ showMoreMenu: false });
      this.triggerEvent("openappeal");
    },

    onTapNotifications() {
      this.triggerEvent("opennotifications");
    },

    onBatchGoodMembers() {
      const tasks = (this.data.reviewMemberPosts || []).filter((item) => item.canBatchGood);
      if (!tasks.length) return;
      this.setData({
        showBatchGood: true,
        batchGoodCandidates: tasks.map((item) => ({ ...item, selected: true }))
      });
    },

    onToggleBatchGood(e) {
      const index = Number(e.currentTarget.dataset.index);
      this.setData({
        [`batchGoodCandidates[${index}].selected`]:
          !this.data.batchGoodCandidates[index].selected
      });
    },

    onCloseBatchGood() {
      if (!this.data.batchGoodSubmitting) this.setData({ showBatchGood: false });
    },

    async onConfirmBatchGood() {
      const selected = (this.data.batchGoodCandidates || []).filter((item) => item.selected);
      if (!selected.length) {
        wx.showToast({ title: "请至少选择一位参与者", icon: "none" });
        return;
      }
      const groups = selected.reduce((map, item) => {
        const key = String(item.activityId);
        if (!map[key]) map[key] = [];
        map[key].push(item.targetId);
        return map;
      }, {});
      this.setData({ batchGoodSubmitting: true });
      const submittedTaskKeys = [];
      let skippedCount = 0;
      try {
        for (const activityId of Object.keys(groups)) {
          const result = await submitBatchGood(Number(activityId), groups[activityId]);
          ((result && result.submittedTargetIds) || []).forEach((targetId) => {
            submittedTaskKeys.push(`${activityId}:${targetId}`);
          });
          skippedCount += Object.keys((result && result.skippedTargets) || {}).length;
        }
        const submittedSet = submittedTaskKeys.reduce((map, key) => {
          map[key] = true;
          return map;
        }, {});
        const remaining = (this.data.reviewMemberPosts || []).filter(
          (item) => !submittedSet[`${item.activityId}:${item.targetId}`]
        );
        this.setData({
          reviewMemberPosts: remaining,
          hasBatchGoodMembers: remaining.some((item) => item.canBatchGood),
          showBatchGood: false
        }, () => this.updateOuter2MinH());
        wx.showToast({
          title: skippedCount
            ? `成功${submittedTaskKeys.length}人，跳过${skippedCount}人`
            : `已好评${submittedTaskKeys.length}人`,
          icon: "none"
        });
      } catch (error) {
        wx.showToast({ title: error.message || "提交失败", icon: "none" });
      } finally {
        this.setData({ batchGoodSubmitting: false });
      }
    },

    onEditProfile() {
      if (this.properties.accountDisabled) {
        wx.showToast({ title: "账号已禁用，暂时不能编辑资料", icon: "none" });
        return;
      }
      const tags = (this.data.profile.tags || [])
        .filter((tag) => tag !== "未添加标签")
        .slice(0, 3);
      while (tags.length < 3) tags.push("");

      this.setData({
        showEditProfile: true,
        editName: this.data.profile.name || "",
        editAvatarUrl: this.data.profile.avatarUrl || "",
        editMotto: this.data.profile.motto || "",
        editTags: tags
      });
    },

    onCloseEditProfile() {
      if (this.data.editProfileSaving) return;
      this.setData({ showEditProfile: false });
    },

    onEditMottoInput(e) {
      this.setData({ editMotto: (e.detail && e.detail.value) || "" });
    },

    onEditNameInput(e) {
      this.setData({ editName: (e.detail && e.detail.value) || "" });
    },

    onChooseAvatar(e) {
      if (this.data.editProfileSaving) return;
      const avatarUrl = e && e.detail ? e.detail.avatarUrl : "";
      if (!avatarUrl) return;

      this.setData({ editProfileSaving: true });
      wx.showLoading({ title: "加载中", mask: true });

      uploadProfileAvatar(avatarUrl)
        .then((uploadedUrl) => {
          this.setData({
            editAvatarUrl: uploadedUrl,
            profile: {
              ...this.data.profile,
              avatarUrl: uploadedUrl
            }
          });
        })
        .catch((err) => {
          wx.showToast({
            title: err.message || "澶村儚涓婁紶澶辫触",
            icon: "none"
          });
        })
        .finally(() => {
          wx.hideLoading();
          this.setData({ editProfileSaving: false });
        });
    },

    onEditTagInput(e) {
      const index = Number(e.currentTarget.dataset.index);
      const value = (e.detail && e.detail.value) || "";
      const editTags = this.data.editTags.slice();
      editTags[index] = value;
      this.setData({ editTags });
    },

    onChooseCover() {
      if (this.data.editProfileSaving) return;

      wx.chooseMedia({
        count: 1,
        mediaType: ["image"],
        sourceType: ["album", "camera"],
        success: (res) => {
          const file = res.tempFiles && res.tempFiles[0];
          const filePath = file && file.tempFilePath;
          if (!filePath) return;

          this.setData({ editProfileSaving: true });
          wx.showLoading({ title: "加载中", mask: true });

          this.cropProfileCover(filePath)
            .then((croppedPath) => uploadProfileCover(croppedPath))
            .then((coverUrl) => {
              this.setData({
                profile: {
                  ...this.data.profile,
                  coverUrl
                }
              });
            })
            .catch((err) => {
              wx.showToast({
                title: err.message || "涓婁紶澶辫触",
                icon: "none"
              });
            })
            .finally(() => {
              wx.hideLoading();
              this.setData({ editProfileSaving: false });
            });
        }
      });
    },

    cropProfileCover(filePath) {
      if (!filePath || typeof wx.cropImage !== "function") {
        return Promise.resolve(filePath);
      }

      const cropScale = getProfileCoverCropScale();
      return new Promise((resolve) => {
        wx.cropImage({
          src: filePath,
          cropScale,
          success: (res) => resolve(res.tempFilePath || filePath),
          fail: (err) => {
            console.warn("[profile cover crop failed]", cropScale, err);
            resolve(filePath);
          }
        });
      });
    },

    onSaveEditProfile() {
      if (this.data.editProfileSaving) return;

      const tags = (this.data.editTags || [])
        .map((tag) => (tag || "").trim())
        .filter(Boolean);
      const nickname = (this.data.editName || "").trim();

      if (!nickname) {
        wx.showToast({ title: "请输入昵称", icon: "none" });
        return;
      }
      if (nickname.length > 30) {
        wx.showToast({ title: "昵称最多 30 个字", icon: "none" });
        return;
      }
      if (tags.length > 3) {
        wx.showToast({ title: "标签最多 3 个", icon: "none" });
        return;
      }
      if (tags.some((tag) => tag.length > 10)) {
        wx.showToast({ title: "每个标签最多 10 个字", icon: "none" });
        return;
      }

      this.setData({ editProfileSaving: true });

      updateUserProfile({
        nickname,
        motto: this.data.editMotto,
        tags
      })
        .then((profile) => {
          const loginUser = wx.getStorageSync("loginUser") || {};
          wx.setStorageSync("loginUser", {
            ...loginUser,
            nickname: profile.name,
            avatarUrl: profile.avatarUrl
          });
          this.setData({
            profile,
            showEditProfile: false
          });
        })
        .catch((err) => {
          wx.showToast({
            title: err.message || "保存失败",
            icon: "none"
          });
        })
        .finally(() => {
          this.setData({ editProfileSaving: false });
        });
    },

    onTapCard(e) {
      const id = e.detail && e.detail.id;
      if (!id) return;
      const item = (this.data.outer2Posts || []).find((post) => post._id === id || post.id === id);
      if (!item) return;
      const canCancel = ["pending", "approved", "joined_group"].includes(item.registrationStatus)
        && Number(item.startAt) > Date.now() + 3 * 60 * 60 * 1000;
      const itemList = canCancel ? ["查看活动", "取消报名"] : ["查看活动"];
      wx.showActionSheet({
        itemList,
        success: (res) => {
          if (res.tapIndex === 0) {
            this.triggerEvent("openpost", { id });
            return;
          }
          if (res.tapIndex === 1) {
            this.setData({
              showCancelRegistration: true,
              cancelActivityId: id,
              cancelActivityTitle: item.title || "",
              cancelActivityStartAt: item.startAt || 0,
              cancelReasonType: "",
              cancelReasonText: "",
              cancelReasonLength: 0
            });
          }
        }
      });
    },

    onCloseCancelRegistration() {
      if (this.data.cancelSubmitting) return;
      this.setData({
        showCancelRegistration: false,
        cancelActivityId: null,
        cancelReasonType: "",
        cancelReasonText: "",
        cancelReasonLength: 0
      });
    },

    onSelectCancelReason(e) {
      const key = e.currentTarget.dataset.key || "";
      this.setData({
        cancelReasonType: key,
        cancelReasonText: key === "other" ? this.data.cancelReasonText : "",
        cancelReasonLength: key === "other" ? this.data.cancelReasonLength : 0
      });
    },

    onCancelReasonInput(e) {
      const value = String(e.detail.value || "").slice(0, 100);
      this.setData({
        cancelReasonText: value,
        cancelReasonLength: value.length
      });
    },

    onSubmitCancelRegistration() {
      if (this.data.cancelSubmitting) return;
      if (!this.data.cancelReasonType) {
        wx.showToast({ title: "请选择取消原因", icon: "none" });
        return;
      }
      if (this.data.cancelReasonType === "other" && !this.data.cancelReasonText.trim()) {
        wx.showToast({ title: "请填写其他原因", icon: "none" });
        return;
      }

      wx.showModal({
        title: "确认取消报名",
        content: "取消后不可恢复；如报名已通过，将立即释放名额。如果你已加入群聊，请自行退出活动群。",
        confirmText: "确认取消",
        confirmColor: "#ee4d4d",
        success: (res) => {
          if (!res.confirm) return;
          this.setData({ cancelSubmitting: true });
          cancelActivityRegistration(this.data.cancelActivityId, {
            reasonType: this.data.cancelReasonType,
            reasonText: this.data.cancelReasonText.trim()
          })
            .then(() => {
              const id = this.data.cancelActivityId;
              this.setData({
                outer2Posts: (this.data.outer2Posts || []).map((item) => {
                  if (item._id !== id && item.id !== id) return item;
                  return { ...item, registrationStatus: "cancelled" };
                }),
                showCancelRegistration: false,
                cancelActivityId: null,
                cancelReasonType: "",
                cancelReasonText: "",
                cancelReasonLength: 0
              });
              wx.showToast({ title: "已取消报名", icon: "success" });
              this.loadProfile({ force: true });
            })
            .catch((err) => {
              wx.showToast({ title: err.message || "鍙栨秷鎶ュ悕澶辫触", icon: "none" });
            })
            .finally(() => this.setData({ cancelSubmitting: false }));
        }
      });
    },

    onOuter2FavoriteChange(e) {
      const detail = e.detail || {};
      const id = detail.id;
      if (!id) return;

      const outer2Posts = (this.data.outer2Posts || []).map((item) => {
        if (item._id !== id && item.id !== id) return item;
        return {
          ...item,
          favorited: detail.favorited
        };
      });

      const previousPosts = this.data.outer2Posts || [];
      this.setData({ outer2Posts });
      this.triggerEvent("favoritechange", detail);

      updateActivityFavorite({ id, favorited: detail.favorited }).catch((err) => {
        console.error("[home favorite request failed]", id, err);
        this.setData({ outer2Posts: previousPosts });
        this.triggerEvent("favoritechange", { id, favorited: !detail.favorited });
        wx.showToast({ title: "鏀惰棌鍚屾澶辫触", icon: "none" });
      });
    },

    onTapPendingReview() {
      if (this.properties.accountDisabled) {
        wx.showToast({ title: "璐﹀彿宸茬鐢紝鏆傛椂涓嶈兘瀹℃牳鎶ュ悕", icon: "none" });
        return;
      }
      this.triggerEvent("openpendingreview");
    },

    onTapFavorites() {
      this.triggerEvent("openfavorites");
    },

    onTapHistory() {
      this.triggerEvent("openhistory");
    },

    onTapMyActivities() {
      this.triggerEvent("openmyactivities");
    },

    syncFavoriteState(detail) {
      const id = detail && detail.id;
      if (!id) return;
      this.setData({
        outer2Posts: (this.data.outer2Posts || []).map((item) => {
          if (item._id !== id && item.id !== id) return item;
          return { ...item, favorited: !!detail.favorited };
        })
      });
    },

    onOuter2TabChange(e) {
      const value = e && e.detail ? e.detail.value : "";
      if (!value) return;
      this.setData({ outer2TabValue: value }, () => this.updateOuter2MinH());
      if (value === "ongoing") {
        this.loadMyOngoingActivities({ force: true });
      } else if (value === "review") {
        this.loadReviewTasks(this.data.outer2ReviewTabValue === "member" ? "member" : "activity", { force: true });
      }
    },

    openReviewTasks() {
      this.setData({ outer2TabValue: "review" }, () => this.updateOuter2MinH());
      this.loadReviewTasks(this.data.outer2ReviewTabValue === "member" ? "member" : "activity", { force: true });
    },

    onOuter2ReviewTabChange(e) {
      const value = e && e.detail ? e.detail.value : "";
      if (!value) return;
      this.setData({ outer2ReviewTabValue: value }, () => this.updateOuter2MinH());
      this.loadReviewTasks(value === "member" ? "member" : "activity", { force: true });
    },

    onTapReviewEventItem(e) {
      const id = e.currentTarget.dataset.id;
      const item = this.data.reviewEventPosts.find((v) => v._id === id);
      if (!item) return;

      this.triggerEvent("openreviewrate", {
        mode: "activity",
        itemTitle: item.title,
        itemId: item._id,
        activityId: item.activityId,
        targetId: item.targetId
      });
    },

    onTapReviewMemberItem(e) {
      const id = e.currentTarget.dataset.id;
      const item = this.data.reviewMemberPosts.find((v) => v._id === id);
      if (!item) return;

      this.triggerEvent("openreviewrate", {
        mode: "member",
        itemTitle: item.name,
        itemId: item._id,
        activityId: item.activityId,
        targetId: item.targetId
      });
    },

    markReviewCompleted(detail) {
      const itemId = detail && detail.itemId;
      const activityId = detail && detail.activityId;
      const targetId = detail && detail.targetId;

      if (detail && detail.mode === "member") {
        const reviewMemberPosts = this.data.reviewMemberPosts.filter((item) => {
          if (itemId && item._id === itemId) return false;
          return !(String(item.activityId) === String(activityId) && String(item.targetId) === String(targetId));
        });
        this.setData({
          reviewMemberPosts,
          hasBatchGoodMembers: reviewMemberPosts.filter((item) => {
            return !(
              Number(item.activityId) === Number(detail.activityId)
              && Number(item.targetId) === Number(detail.targetId)
            );
          }).some((item) => item.canBatchGood)
        }, () => this.updateOuter2MinH());
        return;
      }

      this.setData({
        reviewEventPosts: this.data.reviewEventPosts.filter((item) => {
          if (itemId && item._id === itemId) return false;
          return String(item.activityId) !== String(activityId);
        })
      }, () => this.updateOuter2MinH());
    }
  }
});
