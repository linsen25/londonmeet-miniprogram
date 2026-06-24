function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}

/** ✅ 全局共享 ticker：全小程序只开 1 个 interval */
const GlobalTicker = (() => {
  let timer = null;
  const subs = new Set();

  function start() {
    if (timer) return;
    timer = setInterval(() => {
      const now = Date.now();
      subs.forEach((fn) => { try { fn(now); } catch (e) {} });
    }, 1000);
  }

  function stopIfIdle() {
    if (subs.size > 0) return;
    if (timer) clearInterval(timer);
    timer = null;
  }

  return {
    subscribe(fn) {
      subs.add(fn);
      start();
      return () => {
        subs.delete(fn);
        stopIfIdle();
      };
    }
  };
})();

Component({
  properties: {
    startAt: { type: Number, value: 0 },
    endAt: { type: Number, value: 0 },
    value: { type: Number, value: -1 },

    // 保底宽度：避免 0% 消失（默认更小一点，适合卡片）
    minThumbPct: { type: Number, value: 6 },

    // ✅ 轮廓 / 高度 / 圆角
    height: { type: String, value: "16rpx" },
    radius: { type: String, value: "999rpx" },
    trackBg: { type: String, value: "rgba(0,0,0,0.08)" },
    trackBorder: { type: String, value: "rgba(0,0,0,0.10)" },
    borderWidth: { type: String, value: "1rpx" },

    // ✅ 阈值（按你要求）
    greenAtOrAbove: { type: Number, value: 75 },
    yellowAtOrAbove: { type: Number, value: 50 },
    orangeAtOrAbove: { type: Number, value: 25 },

    // ✅ 三色
    green: { type: String, value: "#07C160" },
    yellow: { type: String, value: "#FFD60A" },
    orange: { type: String, value: "#FF9500" },
    red: { type: String, value: "#FF3B30" },
    full: { type: String, value: "#8E8E93" },
    colorMode: { type: String, value: "time" },

    // ✅ 右侧显示：默认显示百分比
    showLabel: { type: Boolean, value: true },
    labelMode: { type: String, value: "percent" }, // "percent" | "time"
    labelText: { type: String, value: "" },
    textColor: { type: String, value: "rgba(0,0,0,0.55)" },

    endedText: { type: String, value: "Ended" },
    width: { type: String, value: "100%" },
    customStyle: { type: String, value: "" }
  },

  data: {
    pct: 60,          // 展示用（含 minThumbPct）
    pctRaw: 60,       // 真实百分比（0~100）
    displayValue: "60%",
    ended: false,

    wrapStyle: "",
    trackStyle: "",
    fillStyle: "",
    labelStyle: ""
  },

  observers: {
    "startAt,endAt,value,minThumbPct,height,radius,trackBg,trackBorder,borderWidth,greenAtOrAbove,yellowAtOrAbove,orangeAtOrAbove,green,yellow,orange,red,full,colorMode,showLabel,labelMode,labelText,textColor,endedText,width,customStyle": function () {
      this._rebuildStyles();
      this._tick(Date.now());
    }
  },

  lifetimes: {
    attached() {
      this._rebuildStyles();
      this._unsubscribe = GlobalTicker.subscribe((now) => this._tick(now));
      this._tick(Date.now());
    },
    detached() {
      if (this._unsubscribe) this._unsubscribe();
      this._unsubscribe = null;
    }
  },

  methods: {
    _colorForPct(p) {
      if (this.data.colorMode === "capacity") {
        if (p >= 100) return this.data.full;
        if (p >= 90) return this.data.red;
        if (p >= 70) return this.data.orange;
        return this.data.green;
      }
      if (p >= this.data.greenAtOrAbove) return this.data.green;
      if (p >= this.data.yellowAtOrAbove) return this.data.yellow;
      if (p >= this.data.orangeAtOrAbove) return this.data.orange;
      return this.data.red;
    },

    _rebuildStyles() {
      const wrap = [`width:${this.data.width};`];
      if (this.data.customStyle) wrap.push(this.data.customStyle);

      const track = [
        `height:${this.data.height};`,
        `border-radius:${this.data.radius};`,
        `background:${this.data.trackBg};`,
        `border:${this.data.borderWidth} solid ${this.data.trackBorder};`
      ];

      const label = [`color:${this.data.textColor};`];

      this.setData({
        wrapStyle: wrap.join(""),
        trackStyle: track.join(""),
        labelStyle: label.join("")
      });
    },

    _tick(now) {
      const fixedValue = Number(this.data.value);
      if (Number.isFinite(fixedValue) && fixedValue >= 0) {
        const pctRaw = clamp(Math.round(fixedValue), 0, 100);
        const pct = Math.max(this.data.minThumbPct, pctRaw);
        const fillColor = this._colorForPct(pctRaw);

        this.setData({
          ended: false,
          pctRaw,
          pct,
          displayValue: this.data.showLabel ? (this.data.labelText || `${pctRaw}%`) : "",
          fillStyle: `height:${this.data.height};border-radius:${this.data.radius};background:${fillColor};width:${pct}%;`
        });
        return;
      }

      const s = Number(this.data.startAt) || 0;
      const e = Number(this.data.endAt) || 0;

      // ended
      if (!e || e <= now) {
        const pctRaw = 0;
        const pct = Math.max(this.data.minThumbPct, pctRaw);
        const fillColor = this._colorForPct(pctRaw);

        this.setData({
          ended: true,
          pctRaw,
          pct,
          displayValue: this.data.showLabel ? this.data.endedText : "",
          fillStyle: `height:${this.data.height};border-radius:${this.data.radius};background:${fillColor};width:${pct}%;`
        });
        return;
      }

      // remain ratio => pctRaw 0~100
      let remainRatio = 1;
      if (s && e > s) remainRatio = (e - now) / (e - s);
      remainRatio = clamp(remainRatio, 0, 1);

      const pctRaw = Math.round(remainRatio * 100);
      const pct = Math.max(this.data.minThumbPct, pctRaw);

      // display
      let displayValue = "";
      if (this.data.showLabel) {
        if (this.data.labelMode === "time") {
          const ms = e - now;
          const totalSec = Math.floor(ms / 1000);
          const d = Math.floor(totalSec / 86400);
          const h = Math.floor((totalSec % 86400) / 3600);
          const m = Math.floor((totalSec % 3600) / 60);
          displayValue = d > 0 ? `${d}d ${h}h` : `${h}h ${m}m`;
        } else {
          displayValue = this.data.labelText || `${pctRaw}%`;
        }
      }

      const fillColor = this._colorForPct(pctRaw);

      this.setData({
        ended: false,
        pctRaw,
        pct,
        displayValue,
        fillStyle: `height:${this.data.height};border-radius:${this.data.radius};background:${fillColor};width:${pct}%;`
      });
    }
  }
});
