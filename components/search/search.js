const { searchActivities } = require("../../api/search");
const { updateActivityFavorite } = require("../../api/activity");
const { fetchActivityTags } = require("../../api/tag");

function buildTagMap(tags) {
  return (tags || []).reduce((map, tag) => {
    map[tag.id] = true;
    return map;
  }, {});
}

Component({
  data: {
    keyword: "",
    hotTags: [],
    tagsLoading: false,
    selectedTags: [],
    selectedTagsMap: {},
    showResult: false,
    searching: false,
    skeletonItems: [1, 2, 3, 4],
    resultPosts: []
  },

  lifetimes: {
    attached() {
      this.loadTags();
    }
  },

  methods: {
    loadTags() {
      if (this.data.tagsLoading) return;
      this.setData({ tagsLoading: true });
      fetchActivityTags()
        .then((tags) => {
          const enabledTags = tags || [];
          const validIds = enabledTags.reduce((map, tag) => {
            map[tag.id] = true;
            return map;
          }, {});
          const selectedTags = (this.data.selectedTags || [])
            .filter((tag) => validIds[tag.id]);
          this.setData({
            hotTags: enabledTags,
            selectedTags,
            selectedTagsMap: buildTagMap(selectedTags)
          });
        })
        .catch((err) => {
          console.error("[search tags request failed]", err);
          wx.showToast({ title: "标签加载失败", icon: "none" });
        })
        .finally(() => {
          this.setData({ tagsLoading: false });
        });
    },

    onBackTap() {
      this.triggerEvent("close");
    },

    onInput(e) {
      this.setData({
        keyword: e.detail.value || ""
      });
    },

    onTagTap(e) {
      const id = Number(e.currentTarget.dataset.id);
      if (!id) return;
      const tag = (this.data.hotTags || []).find((item) => item.id === id);
      if (!tag) return;

      const selected = this.data.selectedTags || [];
      const exists = selected.some((item) => item.id === id);
      const next = exists
        ? selected.filter((item) => item.id !== id)
        : selected.concat(tag);

      this.setData({
        selectedTags: next,
        selectedTagsMap: buildTagMap(next)
      });
    },

    onSearchTap() {
      const keyword = (this.data.keyword || "").trim();
      const selectedTags = this.data.selectedTags || [];
      const tags = selectedTags.map((tag) => tag.name);

      this.setData({
        showResult: true,
        searching: true
      });

      // TODO(api): 这里请求搜索活动结果。
      // 请求参数：keyword=输入框文字；tags=已选热点标签数组。
      // 返回结果按活动瀑布流卡片字段渲染到 resultPosts。
      return searchActivities({
        keyword,
        tags,
        page: 1,
        pageSize: 20
      }).then((res) => {
        this.setData({
          resultPosts: res.list || [],
          searching: false
        });

        this.triggerEvent("search", {
          keyword,
          tags,
          tagIds: selectedTags.map((tag) => tag.id)
        });
      }).catch((err) => {
        console.error("[search request failed]", err);
        this.setData({ searching: false });
        wx.showToast({
          title: "搜索失败",
          icon: "none"
        });
      });
    },

    onTapCard(e) {
      const id = e.detail && e.detail.id;
      if (!id) return;
      this.triggerEvent("openpost", { id });
    },

    onFavoriteChange(e) {
      const detail = e.detail || {};
      const id = detail.id;
      if (!id) return;

      const previousPosts = this.data.resultPosts || [];
      const resultPosts = previousPosts.map((item) => {
        if (item._id !== id && item.id !== id) return item;
        return {
          ...item,
          favorited: detail.favorited
        };
      });

      this.setData({ resultPosts });
      this.triggerEvent("favoritechange", detail);

      updateActivityFavorite({ id, favorited: detail.favorited }).catch((err) => {
        console.error("[search favorite request failed]", id, err);
        this.setData({ resultPosts: previousPosts });
        this.triggerEvent("favoritechange", { id, favorited: !detail.favorited });
        wx.showToast({ title: "\u6536\u85cf\u540c\u6b65\u5931\u8d25", icon: "none" });
      });
    },

    syncFavoriteState(detail) {
      const id = detail && detail.id;
      if (!id) return;
      this.setData({
        resultPosts: (this.data.resultPosts || []).map((item) => {
          if (item._id !== id && item.id !== id) return item;
          return { ...item, favorited: !!detail.favorited };
        })
      });
    }
  }
});
