const echarts = require("../ec-canvas/echarts");

function buildRingSeries(items) {
  const baseRadius = 72;
  const gap = 12;

  return items.map((item, index) => {
    const outer = `${baseRadius - index * gap}%`;
    const inner = `${baseRadius - index * gap - 7}%`;
    const percent = Math.max(0, Math.min(100, (Number(item.value || 0) / 5) * 100));

    return {
      type: "pie",
      silent: true,
      z: 2,
      radius: [inner, outer],
      center: ["50%", "42%"],
      startAngle: 90,
      clockwise: true,
      label: { show: false },
      labelLine: { show: false },
      data: [
        {
          value: percent,
          itemStyle: {
            color: item.color,
            borderRadius: 999
          }
        },
        {
          value: 100 - percent,
          itemStyle: {
            color: "rgba(255,255,255,0.10)"
          }
        }
      ]
    };
  });
}

function getOption(items, average) {
  return {
    backgroundColor: "transparent",
    animation: true,
    series: buildRingSeries(items),
    graphic: [
      {
        type: "text",
        z: 10,
        left: "center",
        top: "33%",
        style: {
          text: average > 0 ? `${average.toFixed(1)} / 5` : "待评分",
          fill: "#FFFFFF",
          fontSize: 26,
          fontWeight: "700"
        }
      },
      {
        type: "text",
        left: "center",
        top: "43%",
        style: {
          text: "综合评分",
          fill: "rgba(255,255,255,0.72)",
          fontSize: 12
        }
      }
    ]
  };
}

function cloneItems(items) {
  return items.map((item) => ({ ...item }));
}

const DEFAULT_ACTIVITY_ITEMS = [
  { key: "organization", label: "组织安排", value: 0, color: "#07C160" },
  { key: "experience", label: "活动体验", value: 0, color: "#3B82F6" },
  { key: "atmosphere", label: "氛围互动", value: 0, color: "#A855F7" },
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
      value: "评分"
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
    ec: {
      onInit: null
    },
    activityItems: cloneItems(DEFAULT_ACTIVITY_ITEMS),
    memberItems: cloneItems(DEFAULT_MEMBER_ITEMS),
    showLowReason: false,
    lowReason: "",
    lowReasonLength: 0,
    lowScoreText: ""
  },

  lifetimes: {
    attached() {
      this.setData({
        ec: {
          onInit: this.initChart.bind(this)
        }
      });
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

    initChart(canvas, width, height, dpr) {
      const chart = echarts.init(canvas, null, {
        width,
        height,
        devicePixelRatio: dpr
      });

      canvas.setChart(chart);
      this.chart = chart;
      this.refreshChart();
      return chart;
    },

    refreshChart() {
      if (!this.chart) return;

      const items = this.getCurrentItems();
      this.chart.setOption(getOption(items, this.getAverage(items)), true);
    },

    resetScores() {
      this.setData(
        {
          activityItems: cloneItems(DEFAULT_ACTIVITY_ITEMS),
          memberItems: cloneItems(DEFAULT_MEMBER_ITEMS)
        },
        () => this.refreshChart()
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
        this.refreshChart();
      });
    },

    onSubmit() {
      const items = this.getCurrentItems();
      if (items.some((item) => Number(item.value || 0) <= 0)) {
        wx.showToast({
          title: "请完成全部评分",
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
          lowScoreText: lowItems.map((item) => `${item.label} ${item.value}分`).join("、")
        });
        return;
      }
      this.emitSubmit("");
    },

    emitSubmit(reason) {
      const items = this.getCurrentItems();
      const average = this.getAverage(items);
      const title = this.properties.itemTitle || "该项目";
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
        wx.showToast({ title: "请填写低分原因", icon: "none" });
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
      this.refreshChart();
    }
  }
});
