const { wechatLogin } = require("../../api/auth");
const { submitReview } = require("../../api/review");

Page({
  data: {
    isLoggedIn: false,
    loginLoading: false,
    accountDisabled: false,
    activeTab: "activity",
    showPendingReview: false,
    showFavorites: false,
    showHistory: false,
    showMyActivities: false,
    showNotifications: false,
    showReviewRate: false,
    reviewRateMode: "activity",
    reviewRateTitle: "",
    reviewRateItemId: "",
    reviewRateActivityId: null,
    reviewRateTargetId: null,
    showSearch: false,
    showFeedback: false,
    showAppeal: false,
    feedbackOverlayStyle: "",
    searchTranslateX: 0,
    searchTransition: "none",
    searchOverlayStyle: "",
    showPost: false,
    postId: "",
    postTranslateX: 0,
    postTransition: "none",
    showCreatePost: false,
    createPostTranslateX: 0,
    createPostTransition: "none",
    createPostMode: "create",
    editActivityId: null
  },

  _windowW: 375,
  _postTouchInSwiper: false,
  _searchOpenTimer: null,
  _searchSettleTimer: null,
  _searchCloseTimer: null,

  onLoad() {
    const info = wx.getSystemInfoSync();
    this._windowW = info.windowWidth || 375;

    const token = wx.getStorageSync("token");
    const loginUser = wx.getStorageSync("loginUser") || {};
    if (token) {
      this.setData({
        isLoggedIn: true,
        accountDisabled: loginUser.status === "DISABLED"
      });
    }
  },

  onShow() {
    if (!this.data.isLoggedIn) return;
    const homeView = this.selectComponent("#homeView");
    if (homeView && typeof homeView.loadProfile === "function") {
      homeView.loadProfile();
    }
  },

  onLogin() {
    if (this.data.loginLoading) return;

    this.setData({ loginLoading: true });
    wx.showLoading({
      title: "登录中...",
      mask: true
    });

    wx.login({
      success: (loginRes) => {
        const code = loginRes && loginRes.code;
        if (!code) {
          wx.hideLoading();
          wx.showToast({
            title: "微信登录失败",
            icon: "none"
          });
          this.setData({ loginLoading: false });
          return;
        }

        wechatLogin({ code })
          .then((user) => {
            if (!user || !user.token) {
              throw new Error("登录响应缺少 token");
            }

            wx.setStorageSync("token", user.token);
            wx.setStorageSync("loginUser", user);
            wx.hideLoading();

            this.setData({
              isLoggedIn: true,
              accountDisabled: user.status === "DISABLED",
              loginLoading: false,
              activeTab: "activity"
            });
          })
          .catch((err) => {
            console.error("[wechat login failed]", err);
            wx.hideLoading();
            wx.showToast({
              title: err.message || "登录失败",
              icon: "none"
            });
            this.setData({ loginLoading: false });
          });
      },
      fail: (err) => {
        console.error("[wx.login failed]", err);
        wx.hideLoading();
        wx.showToast({
          title: "微信登录失败",
          icon: "none"
        });
        this.setData({ loginLoading: false });
      }
    });
  },

  onActivitySearch() {
    if (this.data.showSearch) return;
    this.onOpenSearch();
  },

  onTabActivity() {
    this.closeSearchImmediately();
    if (this.data.activeTab === "activity") return;
    this.setData({ activeTab: "activity" });
  },

  onTabHome() {
    this.closeSearchImmediately();
    if (this.data.activeTab === "home") return;
    this.setData({ activeTab: "home" });
  },

  onTabPlus() {
    this.closeSearchImmediately();
    if (this.data.accountDisabled) {
      wx.showToast({ title: "账号已禁用，暂时不能创建活动", icon: "none" });
      return;
    }
    if (this.data.showCreatePost) return;
    this.onOpenCreatePost();
  },

  onOpenPendingReview() {
    this.setData({ showPendingReview: true });
  },

  onOpenFeedback() {
    const width = this._windowW || 375;
    this.setData({
      showFeedback: true,
      feedbackOverlayStyle: `transform: translateX(${width}px); transition: none;`
    });
    setTimeout(() => {
      this.setData({
        feedbackOverlayStyle: "transform: translateX(0px); transition: transform 260ms ease;"
      });
    }, 16);
  },

  onOpenAppeal() {
    this.setData({ showAppeal: true });
  },

  onCloseAppeal() {
    this.setData({ showAppeal: false });
  },

  onAccountStatusChange(event) {
    const status = event && event.detail ? event.detail.status : "";
    this.setData({ accountDisabled: status === "DISABLED" });
  },

  onCloseFeedback() {
    const width = this._windowW || 375;
    this.setData({
      feedbackOverlayStyle: `transform: translateX(${width}px); transition: transform 260ms ease;`
    });
    setTimeout(() => {
      this.setData({ showFeedback: false, feedbackOverlayStyle: "" });
    }, 260);
  },

  onClosePendingReview() {
    this.setData({ showPendingReview: false });
    const homeView = this.selectComponent("#homeView");
    if (homeView && typeof homeView.loadPendingReviewCount === "function") {
      homeView.loadPendingReviewCount();
    }
  },

  onPendingReviewCountChange(event) {
    const count = event && event.detail ? Number(event.detail.count) || 0 : 0;
    const homeView = this.selectComponent("#homeView");
    if (homeView && typeof homeView.updatePendingReviewCount === "function") {
      homeView.updatePendingReviewCount(count);
    }
  },

  onOpenFavorites() {
    this.setData({ showFavorites: true });
  },

  onCloseFavorites() {
    this.setData({ showFavorites: false });
  },

  onOpenHistory() {
    this.setData({ showHistory: true });
  },

  onOpenMyActivities() {
    this.setData({ showMyActivities: true });
  },

  onCloseMyActivities() {
    this.setData({ showMyActivities: false });
  },

  onOpenMyActivityPost(event) {
    const id = event && event.detail ? event.detail.id : "";
    if (!id) return;
    this.setData({ showMyActivities: false }, () => {
      this.onOpenPost({ detail: { id } });
    });
  },

  onEditMyActivity(event) {
    const id = event && event.detail ? event.detail.id : "";
    if (!id) return;
    this.setData({ showMyActivities: false }, () => {
      this.onOpenCreatePost(id);
    });
  },

  onCloseHistory() {
    this.setData({ showHistory: false });
  },

  onOpenHistoryPost(event) {
    const id = event && event.detail ? event.detail.id : "";
    if (!id) return;
    this.setData({ showHistory: false }, () => {
      this.onOpenPost({ detail: { id } });
    });
  },

  onOpenFavoritePost(event) {
    const id = event && event.detail ? event.detail.id : "";
    if (!id) return;
    this.setData({ showFavorites: false }, () => {
      this.onOpenPost({ detail: { id } });
    });
  },

  onOpenSearchPost(event) {
    const id = event && event.detail ? event.detail.id : "";
    if (!id) return;
    this.closeSearchImmediately();
    this.onOpenPost({ detail: { id } });
  },

  onFavoriteStateChange(event) {
    const detail = (event && event.detail) || {};
    if (!detail.id) return;

    ["#activityView", "#homeView", "#searchView"].forEach((selector) => {
      const component = this.selectComponent(selector);
      if (component && typeof component.syncFavoriteState === "function") {
        component.syncFavoriteState(detail);
      }
    });
  },

  onOpenNotifications() {
    this.setData({ showNotifications: true });
  },

  onCloseNotifications() {
    this.setData({ showNotifications: false });
  },

  onNotificationUnreadChange(e) {
    const count = e && e.detail ? e.detail.count : 0;
    const homeView = this.selectComponent("#homeView");
    if (homeView && typeof homeView.updateNotificationUnreadCount === "function") {
      homeView.updateNotificationUnreadCount(count);
    }
  },

  onOpenNotificationRelated(e) {
    const detail = e.detail || {};
    const relatedType = detail.relatedType || "";
    const relatedId = detail.relatedId;
    const type = detail.type || "";

    this.setData({ showNotifications: false }, () => {
      if (type === "review_available" || type === "review_reminder") {
        this.setData({ activeTab: "home" }, () => {
          setTimeout(() => {
            const homeView = this.selectComponent("#homeView");
            if (homeView && typeof homeView.openReviewTasks === "function") {
              homeView.openReviewTasks();
            }
          }, 30);
        });
        return;
      }
      if (relatedType === "pending_review") {
        this.setData({ showPendingReview: true });
        return;
      }

      if (relatedType === "activity" && relatedId) {
        this.onOpenPost({ detail: { id: relatedId } });
      }
    });
  },

  onOpenReviewRate(e) {
    const detail = e.detail || {};

    this.setData({
      showReviewRate: true,
      reviewRateMode: detail.mode || "activity",
      reviewRateTitle: detail.itemTitle || "",
      reviewRateItemId: detail.itemId || "",
      reviewRateActivityId: detail.activityId || null,
      reviewRateTargetId: detail.targetId || null
    });
  },

  onCloseReviewRate() {
    this.setData({ showReviewRate: false });
  },

  onSubmitReviewRate(e) {
    const detail = e.detail || {};

    wx.showLoading({
      title: "提交中...",
      mask: true
    });

    submitReview({
      mode: detail.mode,
      activityId: detail.activityId,
      targetId: detail.targetId,
      scores: detail.items || [],
      reason: detail.reason || ""
    })
      .then(() => {
        const homeView = this.selectComponent("#homeView");
        if (homeView && typeof homeView.markReviewCompleted === "function") {
          homeView.markReviewCompleted(detail);
        }

        wx.showToast({
          title: "评价已提交",
          icon: "success"
        });
        this.setData({ showReviewRate: false });
      })
      .catch((err) => {
        console.error("[review submit failed]", err);
        wx.showToast({
          title: err.message || "提交失败",
          icon: "none"
        });
      })
      .finally(() => {
        wx.hideLoading();
      });
  },

  onOpenPost(e) {
    const id = e && e.detail ? e.detail.id : "";
    const W = this._windowW || 375;

    this.setData({
      showPost: true,
      postId: id,
      postTranslateX: W,
      postTransition: "none"
    });

    setTimeout(() => {
      this.setData({
        postTransition: "transform 260ms ease",
        postTranslateX: 0
      });
    }, 16);
  },

  onPostClose() {
    const W = this._windowW || 375;
    const D = 260;

    this.setData({
      postTransition: `transform ${D}ms ease`,
      postTranslateX: W
    });

    setTimeout(() => {
      this.setData({
        showPost: false,
        postId: "",
        postTranslateX: 0,
        postTransition: "none"
      });

      const activityView = this.selectComponent("#activityView");
      if (activityView && typeof activityView.refreshActivityPostsSilently === "function") {
        activityView.refreshActivityPostsSilently();
      }
    }, D);
  },

  onPostSwiperTouch(e) {
    const d = e && e.detail;
    this._postTouchInSwiper = !!(d && d.inSwiper);
  },

  onOpenCreatePost(activityId) {
    const W = this._windowW || 375;
    const editId = Number(activityId) || null;

    this.setData({
      showCreatePost: true,
      createPostMode: editId ? "edit" : "create",
      editActivityId: editId,
      createPostTranslateX: W,
      createPostTransition: "none"
    });

    setTimeout(() => {
      this.setData({
        createPostTransition: "transform 260ms ease",
        createPostTranslateX: 0
      });
    }, 16);
  },

  onCreatePostClose() {
    const W = this._windowW || 375;
    const D = 260;

    this.setData({
      createPostTransition: `transform ${D}ms ease`,
      createPostTranslateX: W
    });

    setTimeout(() => {
      this.setData({
        showCreatePost: false,
        createPostMode: "create",
        editActivityId: null,
        createPostTranslateX: 0,
        createPostTransition: "none"
      });
    }, D);
  },

  onCreatePostCreated() {
    this.setData({ activeTab: "activity" }, () => {
      const activityView = this.selectComponent("#activityView");
      if (activityView && typeof activityView.loadActivityPosts === "function") {
        activityView.loadActivityPosts({
          range: activityView.data && activityView.data.navValue,
          refresh: true,
          source: "created"
        });
      }
    });
    this.onCreatePostClose();
  },

  onCreatePostUpdated() {
    wx.showToast({ title: "活动已修改", icon: "success" });
    const activityView = this.selectComponent("#activityView");
    if (activityView && typeof activityView.loadActivityPosts === "function") {
      activityView.loadActivityPosts({
        range: activityView.data && activityView.data.navValue,
        refresh: true,
        source: "updated"
      });
    }
    const homeView = this.selectComponent("#homeView");
    if (homeView && typeof homeView.loadMyOngoingActivities === "function") {
      homeView.loadMyOngoingActivities();
    }
    if (homeView && typeof homeView.refreshBadges === "function") {
      homeView.refreshBadges();
    }
    this.onCreatePostClose();
  },

  onOpenSearch() {
    const W = this._windowW || 375;
    this.clearSearchTimers();

    this.setData({
      showSearch: true,
      searchTranslateX: W,
      searchTransition: "none",
      searchOverlayStyle: `transform: translateX(${W}px); transition: none;`
    });

    this._searchOpenTimer = setTimeout(() => {
      this.setData({
        searchTransition: "transform 260ms ease",
        searchTranslateX: 0,
        searchOverlayStyle: "transform: translateX(0px); transition: transform 260ms ease;"
      });
    }, 16);

    this._searchSettleTimer = setTimeout(() => {
      if (!this.data.showSearch) return;
      this.setData({
        searchOverlayStyle: ""
      });
    }, 300);
  },

  onCloseSearch() {
    const W = this._windowW || 375;
    const D = 260;
    this.clearSearchTimers();

    this.setData({
      searchTransition: "none",
      searchTranslateX: 0,
      searchOverlayStyle: "transform: translateX(0px); transition: none;"
    });

    this._searchOpenTimer = setTimeout(() => {
      this.setData({
        searchTransition: `transform ${D}ms ease`,
        searchTranslateX: W,
        searchOverlayStyle: `transform: translateX(${W}px); transition: transform ${D}ms ease;`
      });
    }, 16);

    this._searchCloseTimer = setTimeout(() => {
      this.setData({
        showSearch: false,
        searchTranslateX: 0,
        searchTransition: "none",
        searchOverlayStyle: ""
      });
    }, D + 16);
  },

  closeSearchImmediately() {
    if (!this.data.showSearch) return;
    this.clearSearchTimers();
    this.setData({
      showSearch: false,
      searchTranslateX: 0,
      searchTransition: "none",
      searchOverlayStyle: ""
    });
  },

  clearSearchTimers() {
    if (this._searchOpenTimer) clearTimeout(this._searchOpenTimer);
    if (this._searchSettleTimer) clearTimeout(this._searchSettleTimer);
    if (this._searchCloseTimer) clearTimeout(this._searchCloseTimer);
    this._searchOpenTimer = null;
    this._searchSettleTimer = null;
    this._searchCloseTimer = null;
  },

  onDoSearch(e) {
    const keyword = e.detail.keyword || "";
    console.log("搜索词：", keyword);
  }
});
