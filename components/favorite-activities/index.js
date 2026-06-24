const {
  fetchFavoriteActivityPosts,
  updateActivityFavorite
} = require("../../api/activity");

Component({
  data: {
    loading: false,
    posts: []
  },

  lifetimes: {
    attached() {
      this.loadFavorites();
    }
  },

  methods: {
    noop() {},

    loadFavorites() {
      if (this.data.loading) return;
      this.setData({ loading: true });

      fetchFavoriteActivityPosts({ page: 1, pageSize: 50 })
        .then((res) => {
          this.setData({ posts: res.list || [] });
        })
        .catch((err) => {
          console.error("[favorite activities load failed]", err);
          wx.showToast({ title: "收藏加载失败", icon: "none" });
        })
        .finally(() => {
          this.setData({ loading: false });
        });
    },

    onClose() {
      this.triggerEvent("close");
    },

    onTapCard(event) {
      const id = event && event.detail ? event.detail.id : null;
      if (!id) return;
      this.triggerEvent("openpost", { id });
    },

    onFavoriteChange(event) {
      const detail = (event && event.detail) || {};
      const id = detail.id;
      if (!id) return;

      const previousPosts = this.data.posts || [];
      const posts = detail.favorited
        ? previousPosts.map((item) => {
            if (item._id !== id && item.id !== id) return item;
            return { ...item, favorited: true };
          })
        : previousPosts.filter((item) => item._id !== id && item.id !== id);

      this.setData({ posts });
      this.triggerEvent("favoritechange", detail);

      updateActivityFavorite({ id, favorited: detail.favorited }).catch((err) => {
        console.error("[favorite activity update failed]", id, err);
        this.setData({ posts: previousPosts });
        this.triggerEvent("favoritechange", { id, favorited: !detail.favorited });
        wx.showToast({ title: "收藏同步失败", icon: "none" });
      });
    }
  }
});
