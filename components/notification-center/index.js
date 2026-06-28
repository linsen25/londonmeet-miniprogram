const {
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead
} = require("../../api/notification");

Component({
  data: {
    loading: false,
    items: []
  },

  lifetimes: {
    attached() {
      this.loadNotifications();
    }
  },

  methods: {
    noop() {},

    loadNotifications() {
      if (this.data.loading) return;
      this.setData({ loading: true });

      fetchNotifications({ pageSize: 50 })
        .then((items) => {
          this.setData({ items: items || [] });
          this.triggerUnreadChange();
        })
        .catch((err) => {
          console.error("[notifications load failed]", err);
          wx.showToast({
            title: err.message || "通知加载失败",
            icon: "none"
          });
          this.setData({ items: [] });
        })
        .finally(() => {
          this.setData({ loading: false });
        });
    },

    triggerUnreadChange() {
      const unreadCount = (this.data.items || []).filter((item) => !item.read).length;
      this.triggerEvent("unreadchange", { count: unreadCount });
    },

    onClose() {
      this.triggerEvent("close");
    },

    onReadAll() {
      if (!this.data.items.length) return;

      markAllNotificationsRead()
        .then((count) => {
          const items = this.data.items.map((item) => ({
            ...item,
            read: true
          }));
          this.setData({ items });
          this.triggerEvent("unreadchange", { count });
        })
        .catch((err) => {
          wx.showToast({
            title: err.message || "操作失败",
            icon: "none"
          });
        });
    },

    onTapItem(e) {
      const id = e.currentTarget.dataset.id;
      const item = this.data.items.find((value) => String(value.id) === String(id));
      if (!item) return;

      const afterRead = () => {
        if (!item.hasRelated) return;
        this.triggerEvent("openrelated", {
          id: item.id,
          relatedType: item.relatedType,
          relatedId: item.relatedId,
          type: item.type
        });
      };

      if (item.read) {
        afterRead();
        return;
      }

      markNotificationRead(id)
        .then(() => {
          const items = this.data.items.map((value) => (
            String(value.id) === String(id)
              ? { ...value, read: true }
              : value
          ));
          this.setData({ items }, () => {
            this.triggerUnreadChange();
            afterRead();
          });
        })
        .catch((err) => {
          wx.showToast({
            title: err.message || "操作失败",
            icon: "none"
          });
        });
    }
  }
});
