const { fetchHistoryActivityPosts } = require("../../api/activity");

Component({
  data: {
    loading: false,
    posts: [],
    activeType: "joined"
  },

  lifetimes: {
    attached() {
      this.loadHistory();
    }
  },

  methods: {
    noop() {},

    loadHistory() {
      if (this.data.loading) return;
      this.setData({ loading: true });

      fetchHistoryActivityPosts({
        page: 1,
        pageSize: 50,
        type: this.data.activeType
      })
        .then((res) => {
          this.setData({ posts: res.list || [] });
        })
        .catch((err) => {
          console.error("[history activities load failed]", err);
          wx.showToast({ title: "历史活动加载失败", icon: "none" });
        })
        .finally(() => {
          this.setData({ loading: false });
        });
    },

    onClose() {
      this.triggerEvent("close");
    },

    onSwitchType(event) {
      const type = event.currentTarget.dataset.type;
      if (!type || type === this.data.activeType || this.data.loading) return;
      this.setData({
        activeType: type,
        posts: []
      }, () => this.loadHistory());
    },

    onTapCard(event) {
      const id = event && event.detail ? event.detail.id : null;
      if (!id) return;
      this.triggerEvent("openpost", { id });
    }
  }
});
