function cloneItems(items) {
  return items.map((item) => ({ ...item }));
}

const SCORE_LABELS = {
  organization: "组织安排",
  experience: "活动体验",
  atmosphere: "现场氛围",
  match: "内容匹配",
  punctual: "准时守约",
  communication: "沟通配合",
  friendly: "友善礼貌"
};

const DEFAULT_ACTIVITY_ITEMS = [
  { key: "organization", label: "organization", displayLabel: SCORE_LABELS.organization, value: 0, color: "#07C160" },
  { key: "experience", label: "experience", displayLabel: SCORE_LABELS.experience, value: 0, color: "#3B82F6" },
  { key: "atmosphere", label: "atmosphere", displayLabel: SCORE_LABELS.atmosphere, value: 0, color: "#A855F7" },
  { key: "match", label: "match", displayLabel: SCORE_LABELS.match, value: 0, color: "#F59E0B" }
];

const DEFAULT_MEMBER_ITEMS = [
  { key: "punctual", label: "punctual", displayLabel: SCORE_LABELS.punctual, value: 0, color: "#07C160" },
  { key: "communication", label: "communication", displayLabel: SCORE_LABELS.communication, value: 0, color: "#3B82F6" },
  { key: "friendly", label: "friendly", displayLabel: SCORE_LABELS.friendly, value: 0, color: "#A855F7" }
];

function displayLabel(item) {
  return SCORE_LABELS[item.key] || item.label || item.key;
}

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
          displayLabel: displayLabel(item),
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
          lowScoreText: lowItems.map((item) => `${displayLabel(item)} ${item.value}`).join(", ")
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
          label: item.key,
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
