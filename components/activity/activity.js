const { fetchActivityPosts, updateActivityFavorite } = require("../../api/activity");

Component({
  data: {
    posts: [],
    navOptions: [
      { key: "day", label: "1\u5929" },
      { key: "week", label: "7\u5929" },
      { key: "month", label: "30\u5929" }
    ],
    navValue: "day",
    loading: false,
    refreshing: false,
    requestError: ""
  },

  lifetimes: {
    attached() {
      this.loadActivityPosts({
        range: this.data.navValue,
        refresh: true,
        source: "init"
      });
      this.startRealtimeRefresh();
    },
    detached() {
      this.stopRealtimeRefresh();
    }
  },

  pageLifetimes: {
    show() {
      this.startRealtimeRefresh();
      this.refreshActivityPostsSilently();
    },
    hide() {
      this.stopRealtimeRefresh();
    }
  },

  methods: {
    startRealtimeRefresh() {
      if (this._realtimeTimer) return;
      this._realtimeTimer = setInterval(() => {
        this.refreshActivityPostsSilently();
      }, 10000);
    },

    stopRealtimeRefresh() {
      if (!this._realtimeTimer) return;
      clearInterval(this._realtimeTimer);
      this._realtimeTimer = null;
    },

    refreshActivityPostsSilently() {
      if (this.data.loading) return Promise.resolve();

      return fetchActivityPosts({
        range: this.data.navValue || "day",
        page: 1,
        pageSize: 20,
        refresh: true
      }).then((res) => {
        this.setData({ posts: res.list || [] });
      }).catch((err) => {
        console.error("[activity realtime refresh failed]", err);
      });
    },

    onSearchTap() {
      this.triggerEvent("search");
    },

    onNavChange(e) {
      const value = e && e.detail ? e.detail.value : "";
      if (!value) return;
      if (value === this.data.navValue && this.data.loading) return;

      this.setData({ navValue: value });
      this.loadActivityPosts({
        range: value,
        refresh: true,
        source: "tab"
      });
    },

    onRefresh() {
      this.loadActivityPosts({
        range: this.data.navValue,
        refresh: true,
        source: "pull"
      });
    },

    loadActivityPosts(options) {
      const { range, refresh, source } = options || {};
      const targetRange = range || this.data.navValue || "day";

      this.setData({
        loading: true,
        refreshing: !!refresh,
        requestError: ""
      });

      return fetchActivityPosts({
        range: targetRange,
        page: 1,
        pageSize: 20,
        refresh: !!refresh
      }).then((res) => {
        this.setData({
          posts: res.list || [],
          loading: false,
          refreshing: false
        });
      }).catch((err) => {
        console.error("[activity posts request failed]", source, targetRange, err);
        this.setData({
          loading: false,
          refreshing: false,
          requestError: "\u6d3b\u52a8\u52a0\u8f7d\u5931\u8d25"
        });
        wx.showToast({
          title: "\u6d3b\u52a8\u52a0\u8f7d\u5931\u8d25",
          icon: "none"
        });
      });
    },

    onTapCard(e) {
      const id = e.detail && e.detail.id;
      if (!id) return;
      this.triggerEvent("openpost", { id });
    },

    onFavoriteChange(e) {
      const detail = e.detail || {};
      const id = detail.id;
      if (!id) return;

      const previousPosts = this.data.posts || [];
      const posts = previousPosts.map((item) => {
        if (item._id !== id && item.id !== id) return item;
        return {
          ...item,
          favorited: detail.favorited
        };
      });

      this.setData({ posts });
      this.triggerEvent("favoritechange", detail);

      updateActivityFavorite({
        id,
        favorited: detail.favorited
      }).catch((err) => {
        console.error("[activity favorite request failed]", id, err);
        this.setData({ posts: previousPosts });
        this.triggerEvent("favoritechange", { id, favorited: !detail.favorited });
        wx.showToast({
          title: "\u6536\u85cf\u540c\u6b65\u5931\u8d25",
          icon: "none"
        });
      });
    },

    syncFavoriteState(detail) {
      const id = detail && detail.id;
      if (!id) return;
      this.setData({
        posts: (this.data.posts || []).map((item) => {
          if (item._id !== id && item.id !== id) return item;
          return { ...item, favorited: !!detail.favorited };
        })
      });
    }
  }
});
