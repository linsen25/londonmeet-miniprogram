const FALLBACK_COVER = "https://dummyimage.com/600x800/3a3a3a/ffffff.png&text=cover";
const FALLBACK_AVATAR = "https://dummyimage.com/100x100/555555/ffffff.png&text=U";

Component({
  properties: {
    data: {
      type: Object,
      value: {}
    },
    dimEnded: {
      type: Boolean,
      value: true
    },
    dimFull: {
      type: Boolean,
      value: true
    }
  },

  data: {
    coverSrc: FALLBACK_COVER,
    coverLoaded: false,
    avatarSrc: FALLBACK_AVATAR,
    displayTitle: "",
    progressPct: -1,
    progressText: "",
    isFull: false,
    isEnded: false,
    innerFavorited: false,
    statusText: ""
  },

  observers: {
    "data": function(value) {
      this.syncCardData(value || {});
    }
  },

  lifetimes: {
    attached() {
      this.syncCardData(this.data.data || {});
    }
  },

  methods: {
    syncCardData(card) {
      const coverSrc = card.coverUrl || FALLBACK_COVER;
      const coverChanged = coverSrc !== this.data.coverSrc;

      this.setData({
        coverSrc,
        coverLoaded: coverChanged ? false : this.data.coverLoaded,
        avatarSrc: card.avatarUrl || FALLBACK_AVATAR,
        displayTitle: card.title || "未命名活动",
        progressPct: this.resolveProgressPct(card),
        progressText: this.resolveProgressText(card),
        isFull: this.resolveIsFull(card),
        isEnded: !!card.ended || (Number(card.endAt) > 0 && Number(card.endAt) <= Date.now()),
        innerFavorited: !!card.favorited,
        statusText: this.resolveStatusText(card.registrationStatus)
      });
    },

    onCoverLoad() {
      this.setData({ coverLoaded: true });
    },

    onCoverError() {
      if (this.data.coverSrc === FALLBACK_COVER) {
        this.setData({ coverLoaded: true });
        return;
      }

      this.setData({
        coverSrc: FALLBACK_COVER,
        coverLoaded: false
      });
    },

    resolveProgressPct(card) {
      const raw = card.progressPct == null ? card.progressPercent : card.progressPct;
      const n = Number(raw);
      if (!Number.isFinite(n) || n < 0) return -1;
      return Math.max(0, Math.min(100, Math.round(n)));
    },

    resolveProgressText(card) {
      const joined = Math.max(0, Number(card.joinedCount) || 0);
      const total = Math.max(0, Number(card.totalCount) || 0);
      if (total > 0) {
        return `${joined}/${total} 人`;
      }
      return `${joined} 人`;
    },

    resolveIsFull(card) {
      const joined = Math.max(0, Number(card.joinedCount) || 0);
      const total = Math.max(0, Number(card.totalCount) || 0);
      return total > 0 && joined >= total;
    },

    resolveStatusText(status) {
      if (status === "pending") return "待审核";
      if (status === "approved") return "已通过";
      if (status === "joined_group") return "已入群";
      return "";
    },

    onTap() {
      const d = this.data.data || {};
      const id = d._id || d.id;
      if (!id) return;

      this.triggerEvent("tapcard", { id });
    },

    onFavoriteTap() {
      const d = this.data.data || {};
      const id = d._id || d.id;
      const favorited = !this.data.innerFavorited;

      this.setData({ innerFavorited: favorited });

      this.triggerEvent("favoritechange", {
        id,
        favorited
      });
    }
  }
});
