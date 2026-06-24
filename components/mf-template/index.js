Component({
  options: {
    multipleSlots: true,
    addGlobalClass: true
  },

  properties: {
    // 8行规则：0.5 / 1 / 2 / 3 ...
    rows: { type: Number, value: 1 },

    // 只影响 padding/gap，不影响行高
    density: { type: String, value: "md" }, // sm | md | lg

    // 中间内容对齐
    align: { type: String, value: "left" }, // left | center

    clickable: { type: Boolean, value: true },
    to: { type: String, value: "" },

    // 自定义样式（外层壳）
    customStyle: { type: String, value: "" },

    // 外层背景/圆角（可选，默认跟你现在一致）
    bg: { type: String, value: "#E6E6E6" },
    radius: { type: String, value: "12rpx" }
  },

  data: {
    pressed: false,

    minH: "0rpx",

    // ✅ padding 放到 grid 上（关键）
    pad: "24rpx",

    // center 与左右 icon 的间距
    centerGap: "16rpx"
  },

  lifetimes: {
    attached() {
      this._calcMinH();
      this._applyDensity();
    }
  },

  observers: {
    rows() {
      this._calcMinH();
    },
    density() {
      this._applyDensity();
    }
  },

  methods: {
    _applyDensity() {
      let pad = "24rpx";
      let gap = "16rpx";

      switch (this.data.density) {
        case "sm":
          pad = "16rpx";
          gap = "12rpx";
          break;
        case "lg":
          pad = "32rpx";
          gap = "20rpx";
          break;
      }

      this.setData({ pad, centerGap: gap });
    },

    _calcMinH() {
      const info = wx.getSystemInfoSync();
      const rpxPerPx = 750 / info.windowWidth;

      const rowPx = info.windowHeight / 8;
      const rowRpx = rowPx * rpxPerPx;

      const rows = Number(this.data.rows) || 1;
      this.setData({
        minH: `${(rowRpx * rows).toFixed(2)}rpx`
      });
    },

    onTouchStart() {
      if (!this.data.clickable) return;
      this.setData({ pressed: true });
    },
    onTouchEnd() {
      if (!this.data.clickable) return;
      this.setData({ pressed: false });
    },
    onTouchCancel() {
      if (!this.data.clickable) return;
      this.setData({ pressed: false });
    },

    onTap() {
      this.triggerEvent("rowtap", {}, { bubbles: true, composed: true });

      if (!this.data.clickable) return;
      if (!this.data.to) return;

      wx.navigateTo({
        url: this.data.to,
        fail: (err) => console.warn("[mf-template] navigateTo failed:", this.data.to, err)
      });
    }
  }
});
