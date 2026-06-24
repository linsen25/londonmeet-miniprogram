Component({
  options: {
    multipleSlots: true,
    addGlobalClass: true
  },

  properties: {
    // 最小高度（你按 8 行规则在页面里算出来传进来）
    minH: { type: String, value: "" }, // e.g. "320rpx"

    // ✅ 新增：宽/高（可选）
    w: { type: String, value: "" },    // e.g. "86%" / "640rpx"
    h: { type: String, value: "" },    // e.g. "360rpx"

    // ✅ 新增：外边距（可选）
    margin: { type: String, value: "" }, // e.g. "24rpx 16rpx"

    // ✅ 新增：透明模式（只做分区，不要背景/边框/阴影）
    transparent: { type: Boolean, value: false },

    // 默认布局：center（垂直居中）
    layout: { type: String, value: "center" }, // "center" | "stack"

    // 密度：影响默认 padding/gap（可用 padding/gap 覆盖）
    density: { type: String, value: "md" }, // "sm" | "md" | "lg"
    padding: { type: String, value: "" },  // e.g. "24rpx"
    gap: { type: String, value: "" },      // e.g. "16rpx"

    // 外观
    radius: { type: String, value: "24rpx" },
    bg: { type: String, value: "#FFFFFF" },
    border: { type: Boolean, value: false },
    shadow: { type: Boolean, value: false },

    // 行为
    clickable: { type: Boolean, value: false },
    to: { type: String, value: "" },

    // 自定义样式
    customStyle: { type: String, value: "" }
  },

  data: {
    _style: "",
    _contentStyle: "",
    _gap: ""
  },

  lifetimes: {
    attached() {
      this._rebuildStyle();
    }
  },

  observers: {
    // ✅ 扩展：监听新增的 w/h/margin/transparent
    "minH,w,h,margin,transparent,layout,density,padding,gap,radius,bg,border,shadow,customStyle": function () {
      this._rebuildStyle();
    }
  },

  methods: {
    _densityDefaults(density) {
      switch (density) {
        case "sm": return { pad: "16rpx", gap: "12rpx" };
        case "lg": return { pad: "32rpx", gap: "20rpx" };
        case "md":
        default:   return { pad: "24rpx", gap: "16rpx" };
      }
    },

    _rebuildStyle() {
      const d = this._densityDefaults(this.data.density);
      const pad = this.data.padding || d.pad;
      const gap = this.data.gap || d.gap;

      const parts = [];

      // ✅ 尺寸
      if (this.data.w) parts.push(`width:${this.data.w};`);
      if (this.data.h) parts.push(`height:${this.data.h};`);
      if (this.data.minH) parts.push(`min-height:${this.data.minH};`);

      // ✅ 外边距
      if (this.data.margin) parts.push(`margin:${this.data.margin};`);

      // ✅ padding / radius
      parts.push(`padding:${pad};`);
      parts.push(`border-radius:${this.data.radius};`);

      // ✅ 透明模式（只做分区）
      const isTransparent = !!this.data.transparent || this.data.bg === "transparent";
      if (isTransparent) {
        parts.push(`background:transparent;`);
        parts.push(`border:none;`);
        parts.push(`box-shadow:none;`);
      } else {
        parts.push(`background:${this.data.bg};`);
        parts.push(this.data.border ? `border:1rpx solid rgba(0,0,0,0.08);` : `border:none;`);

        // shadow 用一个默认阴影（如果你已有 scss 阴影体系，也可以不写 box-shadow，改成 class）
        parts.push(this.data.shadow ? `box-shadow:0 20rpx 50rpx rgba(0,0,0,0.18);` : `box-shadow:none;`);
      }

      const style = parts.join("") + (this.data.customStyle ? this.data.customStyle : "");

      // ✅ 把 minH（或 h）同步给内部 content，避免百分比高度失效
      const contentH = this.data.minH || this.data.h;
      const contentStyle = contentH ? `min-height:${contentH};` : "";

      this.setData({
        _style: style,
        _contentStyle: contentStyle,
        _gap: gap
      });
    },

    onTap() {
      this.triggerEvent("shelltap", {}, { bubbles: true, composed: true });

      if (!this.data.clickable) return;
      if (!this.data.to) return;

      wx.navigateTo({
        url: this.data.to,
        fail: (err) => console.warn("[mf-shell] navigateTo failed:", this.data.to, err)
      });
    }
  }
});