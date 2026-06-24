Component({
  properties: {
    options: { type: Array, value: [] },
    value: { type: String, value: '' },

    // 外观配置
    height: { type: String, value: '72rpx' },
    pad: { type: String, value: '6rpx' },
    radius: { type: String, value: '9999rpx' },
    bg: { type: String, value: '#FFFFFF' },
    thumbBg: { type: String, value: 'rgb(43,43,43)' },

    textColor: { type: String, value: '#000000' },
    activeTextColor: { type: String, value: '#FFFFFF' },
    fontWeight: { type: Number, value: 600 },
    fontSize: { type: String, value: '32rpx' },

    // 视觉微调：如果你还想更精细，默认 0
    textNudgeY: { type: String, value: '0rpx' }
  },

  data: {
    thumbW: 0,
    thumbLeft: 0,
    rootStyle: '',
    thumbStyle: '',
    textStyle: '',
    activeTextStyle: ''
  },

  observers: {
    options(opts) {
      this._updateThumb(opts, this.data.value);
    },
    value(val) {
      this._updateThumb(this.data.options, val);
    },
    'height,pad,radius,bg,thumbBg,textColor,activeTextColor,fontWeight,fontSize,textNudgeY': function () {
      this._buildStyles();
    }
  },

  lifetimes: {
    attached() {
      this._buildStyles();
      this._updateThumb(this.data.options, this.data.value);
    }
  },

  methods: {
    _buildStyles() {
      const rootStyle =
        `height:${this.data.height};` +
        `background:${this.data.bg};` +
        `border-radius:${this.data.radius};` +
        `padding:${this.data.pad};` +
        `box-sizing:border-box;`;

      const thumbStyle =
        `background:${this.data.thumbBg};` +
        `border-radius:${this.data.radius};`;

      const base =
        `font-size:${this.data.fontSize};` +
        `font-weight:${this.data.fontWeight};` +
        `transform: translateY(${this.data.textNudgeY});`;

      const textStyle = `color:${this.data.textColor};${base}`;
      const activeTextStyle = `color:${this.data.activeTextColor};${base}`;

      this.setData({ rootStyle, thumbStyle, textStyle, activeTextStyle });
    },

    _updateThumb(opts, val) {
      if (!opts || !opts.length) return;

      const n = opts.length;
      const thumbW = 100 / n;

      let idx = opts.findIndex(o => o && o.key === val);
      if (idx < 0) idx = 0;

      this.setData({ thumbW, thumbLeft: idx * thumbW });
    },

    onItemTap(e) {
      const { key, index } = e.currentTarget.dataset;
      if (!key) return;
      if (key === this.data.value) return;

      const n = (this.data.options && this.data.options.length) || 0;
      if (!n) return;

      const thumbW = 100 / n;
      this.setData({ thumbW, thumbLeft: Number(index) * thumbW });

      this.triggerEvent('change', { value: key, index: Number(index) });
    }
  }
});