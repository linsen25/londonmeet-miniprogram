Component({
  properties: {
    text: { type: String, value: 'Button' },
    disabled: { type: Boolean, value: false },
    loading: { type: Boolean, value: false },
    variant: { type: String, value: 'primary' },
    block: { type: Boolean, value: true },
    size: { type: String, value: 'default' },

    bg: { type: String, value: '' },        // 背景色
    color: { type: String, value: '' },     // 字体色
    radius: { type: String, value: '' },    // 圆角
    height: { type: String, value: '' },    // 高度
    width: { type: String, value: '' },     // ✅ 新增：宽度
    fontSize: { type: String, value: '' },  // 字号
    padding: { type: String, value: '' },   // 内边距
    customStyle: { type: String, value: '' }// 额外 style
  },

  data: {
    pressed: false,
    variantClass: 'is-primary',

    _wrapStyle: '',
    _innerStyle: '',
    _textStyle: ''
  },

  observers: {
    variant(v) {
      const map = { primary: 'is-primary', ghost: 'is-ghost', secondary: 'is-secondary' };
      this.setData({ variantClass: map[v] || 'is-primary' });
    },

    // ✅ 关键：当这些参数变化时，重建 style
    'bg,color,radius,height,width,fontSize,padding,customStyle,block': function () {
      const inner = [];
      const text = [];
      const wrap = [];

      if (this.data.bg) inner.push(`background:${this.data.bg};`);
      if (this.data.height) inner.push(`height:${this.data.height};`);
      if (this.data.width) inner.push(`width:${this.data.width};`);
      if (this.data.radius) inner.push(`border-radius:${this.data.radius};`);
      if (this.data.padding) inner.push(`padding:${this.data.padding};`);

      if (this.data.customStyle) inner.push(this.data.customStyle);

      if (this.data.color) text.push(`color:${this.data.color};`);
      if (this.data.fontSize) text.push(`font-size:${this.data.fontSize};`);

      // block=false 时，外层也别占满（可选，但更符合预期）
      if (!this.data.block && this.data.width) wrap.push(`width:${this.data.width};`);

      this.setData({
        _wrapStyle: wrap.join(''),
        _innerStyle: inner.join(''),
        _textStyle: text.join('')
      });
    }
  },

  methods: {
    onPressStart() {
      if (this.data.disabled) return;
      this.setData({ pressed: true });
    },
    onPressEnd() {
      if (this.data.disabled) return;
      this.setData({ pressed: false });
    },
    onTap() {
      if (this.data.disabled) return;
      this.triggerEvent('tap');
    }
  }
});