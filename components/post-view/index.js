const {
  applyActivity,
  fetchActivityDetail,
  joinActivityGroup,
  recordActivityEvents,
  reportActivity
} = require("../../api/activity");

const FALLBACK_IMAGE = "https://dummyimage.com/600x400/ddd/333.png&text=IMG";
const FALLBACK_AVATAR = "https://dummyimage.com/100x100/555555/ffffff.png&text=U";

function pad(value) {
  return String(value).padStart(2, "0");
}

function formatDateParts(ts) {
  if (!ts) {
    return { date: "", time: "" };
  }

  const d = new Date(ts);
  return {
    date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
    time: `${pad(d.getHours())}:${pad(d.getMinutes())}`
  };
}

function buildRemainText(endAt) {
  const remain = Number(endAt) - Date.now();
  if (!Number.isFinite(remain) || remain <= 0) {
    return "已结束";
  }

  const totalHours = Math.floor(remain / (60 * 60 * 1000));
  const days = Math.floor(totalHours / 24);
  const hours = totalHours % 24;

  if (days > 0) {
    return `杩樺墿 ${days} 澶?${hours} 灏忔椂`;
  }
  return `杩樺墿 ${Math.max(1, hours)} 灏忔椂`;
}

Component({
  properties: {
    postId: {
      type: String,
      value: "",
      observer(value) {
        if (value) {
          this.loadDetail(value);
        }
      }
    }
  },

  lifetimes: {
    attached() {
      if (this.data.postId) {
        this.loadDetail(this.data.postId);
      }
    },

    detached() {
      if (this._applyTimer) {
        clearTimeout(this._applyTimer);
      }
    }
  },

  data: {
    loading: false,
    applying: false,
    images: [FALLBACK_IMAGE],
    title: "",
    desc: "",
    authorName: "",
    authorAvatarUrl: "",
    organizerRatingText: "5.0/5 · 暂无真实评分",
    hasOrganizerRating: false,
    authorMotto: "你好呀，准备好出去转转了么~",
    authorTags: ["未添加标签"],
    tags: [],
    address: "",
    joinedCount: 0,
    totalCount: 0,
    progressPct: -1,
    progressText: "",
    remainText: "",
    startAt: 0,
    endAt: 0,
    startDate: "",
    startTime: "",
    endDate: "",
    endTime: "",
    registrationStatus: "",
    noticeCode: null,
    isCreator: false,
    isFull: false,
    isEnded: false,
    applyText: "报名",
    applyDisabled: false,
    applyBg: "#07C160",
    showApplyPopup: false,
    applicationText: "",
    applicationTextLength: 0,
    showReportPopup: false,
    reportReason: "",
    reportReasonLength: 0,
    reporting: false,
    showGroupPopup: false,
    showImagePreview: false,
    previewIndex: 0,
    groupQrUrl: "",
    qrExpiresAt: 0,
    qrExpired: false,
    mapImgUrl: ""
  },

  methods: {
    loadDetail(id) {
      if (!id) return;

      this.setData({ loading: true });

      fetchActivityDetail(id)
        .then((detail) => {
          this.applyDetail(detail);
          recordActivityEvents("DETAIL_VIEW", [detail.id || id]).catch((err) => {
            console.warn("[activity detail analytics failed]", err);
          });
        })
        .catch((err) => {
          console.error("[activity detail request failed]", id, err);
          wx.showToast({
            title: (err && err.message) || "娲诲姩璇︽儏鍔犺浇澶辫触",
            icon: "none"
          });
        })
        .finally(() => {
          this.setData({ loading: false });
        });
    },

    applyDetail(detail) {
      const start = formatDateParts(detail.startAt);
      const end = formatDateParts(detail.endAt);
      const totalCount = Number(detail.totalCount) || 0;
      const joinedCount = Number(detail.joinedCount) || 0;
      const progressPct = totalCount > 0
        ? Math.min(100, Math.max(0, Math.round(joinedCount * 100 / totalCount)))
        : 0;

      this.setData({
        images: detail.imageUrls && detail.imageUrls.length ? detail.imageUrls : [FALLBACK_IMAGE],
        title: detail.title || "",
        desc: detail.content || "",
        authorName: detail.authorName || "活动发起人",
        authorAvatarUrl: detail.authorAvatarUrl || FALLBACK_AVATAR,
        organizerRatingText: detail.organizerRating == null
          ? "5.0/5 · 暂无真实评分"
          : `${Number(detail.organizerRating).toFixed(1)}/5`,
        hasOrganizerRating: detail.organizerRating != null,
        authorMotto: detail.authorMotto || "你好呀，准备好出去转转了么~",
        authorTags: Array.isArray(detail.authorTags) && detail.authorTags.length
          ? detail.authorTags
          : ["未添加标签"],
        tags: Array.isArray(detail.tags) ? detail.tags.filter(Boolean) : [],
        address: detail.locationText || "",
        joinedCount,
        totalCount,
        progressPct,
        progressText: totalCount > 0 ? `${joinedCount}/${totalCount} 人` : `${joinedCount} 人`,
        remainText: buildRemainText(detail.endAt),
        startAt: detail.startAt || 0,
        endAt: detail.endAt || 0,
        startDate: start.date,
        startTime: start.time,
        endDate: end.date,
        endTime: end.time,
        registrationStatus: detail.registrationStatus || "",
        noticeCode: detail.noticeCode,
        isCreator: !!detail.isCreator,
        isFull: !!detail.full,
        isEnded: !!detail.ended,
        groupQrUrl: detail.inviteQrUrl || "",
        qrExpiresAt: Number(detail.qrExpiresAt) || 0,
        qrExpired: Number(detail.qrExpiresAt) > 0
          && Number(detail.qrExpiresAt) <= Date.now(),
        mapImgUrl: detail.mapImageUrl || ""
      }, () => this.syncApplyState());
    },

    syncApplyState() {
      const status = this.data.registrationStatus;
      const isFull = this.data.isFull;
      const isEnded = this.data.isEnded;
      const isCreator = this.data.isCreator;
      const loginUser = wx.getStorageSync("loginUser") || {};
      const accountDisabled = loginUser.status === "DISABLED";
      let applyText = "报名";
      let applyDisabled = false;
      let applyBg = "#07C160";

      if (accountDisabled) {
        applyText = "账号已禁用";
        applyDisabled = true;
        applyBg = "#6B6B70";
      } else if (isCreator) {
        applyText = "加入群聊";
      } else if (isEnded) {
        applyText = "已结束";
        applyDisabled = true;
        applyBg = "#6B6B70";
      } else if (status === "pending") {
        applyText = "审核中";
        applyDisabled = true;
        applyBg = "#FF3B30";
      } else if (status === "approved") {
        applyText = "加入群聊";
      } else if (status === "joined_group") {
        applyText = "已加入群聊";
      } else if (isFull) {
        applyText = "申请候补";
        applyBg = "#FF9500";
      }

      this.setData({
        applyText,
        applyDisabled,
        applyBg
      });
    },

    onBackTap() {
      this.triggerEvent("close");
    },

    onCopyAddress() {
      const text = this.data.address || "";
      if (!text) return;

      wx.setClipboardData({
        data: text,
        success: () => {
          wx.showToast({
            title: "已复制",
            icon: "none"
          });
        }
      });
    },

    onApply() {
      if (this.data.applyDisabled || this.data.applying) return;

      const status = this.data.registrationStatus;
      if (this.data.isCreator || status === "approved" || status === "joined_group") {
        this.openGroupPopup();
        return;
      }

      const id = this.data.postId;
      if (!id) return;

      this.setData({
        showApplyPopup: true,
        applicationText: "",
        applicationTextLength: 0
      });
    },

    onApplicationInput(event) {
      const value = String(event.detail.value || "").slice(0, 100);
      this.setData({
        applicationText: value,
        applicationTextLength: value.length
      });
    },

    onCloseApplyPopup() {
      if (this.data.applying) return;
      this.setData({ showApplyPopup: false });
    },

    onOpenReport() {
      if (this.data.isCreator) return;
      this.setData({
        showReportPopup: true,
        reportReason: "",
        reportReasonLength: 0
      });
    },

    onCloseReport() {
      if (this.data.reporting) return;
      this.setData({ showReportPopup: false });
    },

    onReportInput(event) {
      const value = String(event.detail.value || "").slice(0, 300);
      this.setData({
        reportReason: value,
        reportReasonLength: value.length
      });
    },

    onConfirmReport() {
      if (this.data.reporting) return;
      const reason = (this.data.reportReason || "").trim();
      if (!reason) {
        wx.showToast({ title: "请填写举报原因", icon: "none" });
        return;
      }

      this.setData({ reporting: true });
      reportActivity(this.data.postId, reason)
        .then(() => {
          this.setData({ showReportPopup: false });
          wx.showToast({ title: "举报已提交", icon: "success" });
        })
        .catch((err) => {
          wx.showToast({
            title: (err && err.message) || "举报提交失败",
            icon: "none"
          });
        })
        .finally(() => {
          this.setData({ reporting: false });
        });
    },

    onConfirmApply() {
      if (this.data.applyDisabled || this.data.applying) return;

      const id = this.data.postId;
      if (!id) return;

      this.setData({ applying: true });
      applyActivity(id, { applicationText: this.data.applicationText })
        .then((registration) => {
          this.setData({
            showApplyPopup: false,
            registrationStatus: registration.status || "pending",
            noticeCode: registration.noticeCode == null ? this.data.noticeCode : registration.noticeCode
          }, () => this.syncApplyState());
          wx.showToast({
            title: "已提交申请",
            icon: "none"
          });
        })
        .catch((err) => {
          wx.showToast({
            title: (err && err.message) || "报名失败",
            icon: "none"
          });
        })
        .finally(() => {
          this.setData({ applying: false });
        });
    },

    openGroupPopup() {
      const id = this.data.postId;
      this.setData({ showGroupPopup: true });
      const canUseQr = !!id && !!this.data.groupQrUrl && !this.data.qrExpired;
      if (canUseQr && !this.data.isCreator) {
        recordActivityEvents("QR_OPEN", [id]).catch((err) => {
          console.warn("[activity qr analytics failed]", err);
        });
      }

      if (!canUseQr || this.data.isCreator || this.data.registrationStatus === "joined_group") {
        return;
      }

      joinActivityGroup(id)
        .then((registration) => {
          this.setData({
            registrationStatus: registration.status || "joined_group",
            noticeCode: registration.noticeCode == null ? this.data.noticeCode : registration.noticeCode
          }, () => this.syncApplyState());
        })
        .catch((err) => {
          console.error("[join activity group failed]", id, err);
        });
    },

    onCloseGroupPopup() {
      this.setData({
        showGroupPopup: false
      });
    },

    onPreviewGroupQr() {
      const url = this.data.groupQrUrl;
      if (!url) return;

      wx.previewImage({
        current: url,
        urls: [url]
      });
    },

    onPreviewMap() {
      const url = this.data.mapImgUrl;
      if (!url) return;

      wx.previewImage({
        urls: [url]
      });
    },

    onPreviewImage(event) {
      const dataset = (event && event.currentTarget && event.currentTarget.dataset) || {};
      const index = Number(dataset.index);
      const urls = (this.data.images || []).filter(Boolean);
      const current = this.data.images[index];

      if (!current || !urls.length) return;

      this.setData({
        showImagePreview: true,
        previewIndex: index
      });
    },

    onPreviewSwiperChange(event) {
      const previewIndex = Number(event && event.detail ? event.detail.current : 0);
      this.setData({ previewIndex });
    },

    onCloseImagePreview() {
      this.setData({ showImagePreview: false });
    },

    onPreviewTouchMove() {},

    onSwiperTouchStart() {
      this.triggerEvent("swipertouch", { inSwiper: true });
    },

    onSwiperTouchEnd() {
      this.triggerEvent("swipertouch", { inSwiper: false });
    }
  }
});
