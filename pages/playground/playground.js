Page({
  data: {
    rowH: "160rpx",
    halfRowH: "80rpx",
    twoRowH: "320rpx",
    threeRowH: "480rpx",
    showExtra: false,
    segOptions: [
      { key: 'week', label: '本周' },
      { key: 'month', label: '本月' }
    ],
    segValue: 'week',
  },

  onLoad() {
    const info = wx.getSystemInfoSync();
    const rpxPerPx = 750 / info.windowWidth;

    const rowPx = info.windowHeight / 8;
    const rowRpx = rowPx * rpxPerPx;

    this.setData({
      rowH: `${rowRpx.toFixed(2)}rpx`,
      halfRowH: `${(rowRpx / 2).toFixed(2)}rpx`,
      twoRowH: `${(rowRpx * 2).toFixed(2)}rpx`,
      threeRowH: `${(rowRpx * 3).toFixed(2)}rpx`
    });
  },

  toggleExtra() {
    this.setData({ showExtra: !this.data.showExtra });
  },

  onRowTap() {
    console.log("rowtap fired");
  },

  onSegChange(e) {
    const v = e && e.detail ? e.detail.value : '';
    if (!v) return;
    this.setData({ segValue: v });
  }
});
