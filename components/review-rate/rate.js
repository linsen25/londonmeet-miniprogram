function cloneItems(items) {
  return items.map((item) => ({ ...item }));
}

const DEFAULT_ACTIVITY_ITEMS = [
  { key: "organization", label: "组织安排", value: 0, color: "#07C160" },
  { key: "experience", label: "活动体验", value: 0, color: "#3B82F6" },
  { key: "atmosphere", label: "现场氛围", value: 0, color: "#A855F7" },
  { key: "match", label: "内容匹配", value: 0, color: "#F59E0B" }
];

const DEFAULT_MEMBER_ITEMS = [
  { key: "punctual", label: "准时守约", value: 0, color: "#07C160" },
  { key: "communication", label: "沟通配合", value: 0, color: "#3B82F6" },
  { key: "friendly", label: "友善礼貌", value: 0, color: "#A855F7" }
];

Component({
  properties: {
    mode: {
      type: String,
      value: "activity"
    },
    itemTitle: {
      type: String,
      value: "评价"
    },
    itemId: {
      type: String,
      value: ""
    },
    activityId: {
      type: Number,
      optionalTypes: [String],
      value: null
    },
    targetId: {
      type: Number,
      optionalTypes: [String],
      value: null
    }
  },

  data: {
    activityItems: cloneItems(DEFAULT_ACTIVITY_ITEMS),
    memberItems: cloneItems(DEFAULT_MEMBER_ITEMS),
    averageText: "0.0 / 5",
    scoreSummary: [],
    showLowReason: false,
    lowReason: "",
    lowReasonLength: 0,
    lowScoreText: ""
  },

  lifetimes: {
    attached() {
      this.refreshSummary();
    }
  },

  methods: {
    getCurrentItems() {
      return this.data.mode === "member"
        ? this.data.memberItems
        : this.data.activityItems;
    },

    getAverage(items) {
      if (!items.length) return 0;
      const sum = items.reduce((acc, cur) => acc + Number(cur.value || 0), 0);
      return sum / items.length;
    },

    refreshSummary() {
      const items = this.getCurrentItems();
      const average = this.getAverage(items);
      this.setData({
        averageText: `${average.toFixed(1)} / 5`,
        scoreSummary: items.map((item) => ({
          ...item,
          width: `${Math.max(0, Math.min(100, (Number(item.value || 0) / 5) * 100))}%`
        }))
      });
    },

    resetScores() {
      this.setData(
        {
          activityItems: cloneItems(DEFAULT_ACTIVITY_ITEMS),
          memberItems: cloneItems(DEFAULT_MEMBER_ITEMS)
        },
        () => this.refreshSummary()
      );
    },

    onBack() {
      this.triggerEvent("close");
    },

    onRateChange(e) {
      const index = e.currentTarget.dataset.index;
      const value = Number(e.detail);
      const field =
        this.data.mode === "member"
          ? `memberItems[${index}].value`
          : `activityItems[${index}].value`;

      this.setData({ [field]: value }, () => {
        this.refreshSummary();
      });
    },

    onSubmit() {
      const items = this.getCurrentItems();
      if (items.some((item) => Number(item.value || 0) <= 0)) {
        wx.showToast({
          title: "请完成所有评分",
          icon: "none"
        });
        return;
      }

      const lowItems = items.filter((item) => Number(item.value) < 3);
      if (lowItems.length) {
        this.setData({
          showLowReason: true,
          lowReason: "",
          lowReasonLength: 0,
          lowScoreText: lowItems.map((item) => `${item.label} ${item.value}`).join(", ")
        });
        return;
      }
      this.emitSubmit("");
    },

    emitSubmit(reason) {
      const items = this.getCurrentItems();
      const average = this.getAverage(items);
      const title = this.properties.itemTitle || "评价对象";
      this.triggerEvent("submit", {
        mode: this.data.mode,
        title,
        itemId: this.properties.itemId,
        activityId: this.properties.activityId,
        targetId: this.properties.targetId,
        average,
        reason: reason || "",
        items: items.map((item) => ({
          key: item.key,
          label: item.label,
          value: Number(item.value || 0)
        }))
      });
    },

    onLowReasonInput(event) {
      const lowReason = String(event.detail.value || "").slice(0, 300);
      this.setData({ lowReason, lowReasonLength: lowReason.length });
    },

    onCloseLowReason() {
      this.setData({ showLowReason: false });
    },

    onConfirmLowReason() {
      const reason = this.data.lowReason.trim();
      if (!reason) {
        wx.showToast({ title: "请填写原因", icon: "none" });
        return;
      }
      this.setData({ showLowReason: false }, () => this.emitSubmit(reason));
    }
  },

  observers: {
    mode() {
      this.resetScores();
    },
    itemTitle() {
      this.refreshSummary();
    }
  }
});
