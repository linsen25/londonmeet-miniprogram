const { createActivity } = require("../../api/activity");
const { uploadImage } = require("../../api/cloudinary");
const { fetchStaticMap } = require("../../api/map");
const { fetchActivityTags } = require("../../api/tag");

const RECRUIT_OPTIONS = Array.from({ length: 20 }, (_, index) => index + 1);

function buildTagList(tags, selectedMap) {
  const map = selectedMap || {};
  return (tags || []).map((tag) => ({
    ...tag,
    selected: !!map[tag.id]
  }));
}

Component({
  data: {
    fileList: [],
    previewImages: [],
    hasImages: false,
    submitting: false,
    scrollTarget: "",
    validationErrorKey: "",
    validationErrorMessage: "",
    maxCount: 4,
    maxSize: 5 * 1024 * 1024,

    title: "",
    content: "",
    lastTitle: "",
    lastContent: "",
    titleFocus: false,
    contentFocus: false,
    titleMaxChars: 30,
    contentMaxChars: 400,
    titleMaxLines: 2,
    contentMaxLines: 12,
    contentLineCount: 5,
    contentHeight: 210,
    contentLength: 0,

    tagIds: [],
    tagsDisplay: "请选择活动标签",
    showTagPicker: false,
    tagMax: 4,
    allTags: [],
    filteredTags: [],
    selectedTags: [],
    selectedTagMap: {},

    recruitCount: "",
    recruitDisplay: "请选择人数",
    showRecruitPicker: false,
    recruitColumns: [],

    startTime: "",
    endTime: "",
    startTimeDisplay: "请选择开始时间",
    endTimeDisplay: "请选择结束时间",
    showTimePicker: false,
    activeTimeField: "",
    timePickerTitle: "选择时间",
    timeColumns: [],

    inviteFileList: [],
    inviteDisplay: "请上传群二维码（必填）",

    locationText: "",
    locationDisplay: "",
    mapImageUrl: "",
    mapLoadFailed: false,
    locationDebounceTimer: null,

    showHelpPopup: false,
    helpTitle: "",
    helpDescription: "",
    helpImages: [],

    showCalendar: false,
    dateRange: null,
    dateText: "请选择开始和结束日期",
    minDate: 0,
    maxDate: 0
  },

  lifetimes: {
    attached() {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
      const max = today + 30 * 24 * 60 * 60 * 1000;
      const recruitColumns = RECRUIT_OPTIONS.map((value) => `${value}人`);

      const hourColumns = [];
      for (let i = 1; i <= 12; i++) {
        hourColumns.push(String(i).padStart(2, "0"));
      }

      const minuteColumns = [];
      for (let i = 0; i < 60; i++) {
        minuteColumns.push(String(i).padStart(2, "0"));
      }

      this.setData({
        minDate: today,
        maxDate: max,
        recruitColumns,
        timeColumns: [
          { values: hourColumns },
          { values: minuteColumns },
          { values: ["AM", "PM"] }
        ]
      });

      this._loadTags();
    },

    detached() {
      if (this.locationDebounceTimer) clearTimeout(this.locationDebounceTimer);
    }
  },

  methods: {
    onBackTap() {
      this.triggerEvent("close");
    },

    onOpenHelp(e) {
      const type = e && e.currentTarget && e.currentTarget.dataset
        ? e.currentTarget.dataset.type
        : "";
      const isLocation = type === "location";

      this.setData({
        showHelpPopup: true,
        helpTitle: isLocation ? "如何填写活动地址" : "如何上传加群码",
        helpDescription: isLocation
          ? "从 Google Maps 复制活动地点地址，然后粘贴到地址输入框。"
          : "先在群聊信息中打开群二维码，再保存二维码图片并上传。",
        helpImages: isLocation
          ? [{ src: "/assets/tutorials/mapTutor.jpg", label: "长按地点地址并复制" }]
          : [
              { src: "/assets/tutorials/group1.jpg", label: "步骤 1：点击群二维码" },
              { src: "/assets/tutorials/group2.jpg", label: "步骤 2：保存二维码图片" }
            ]
      });
    },

    onCloseHelp() {
      this.setData({ showHelpPopup: false });
    },

    _clearValidationError(key) {
      if (this.data.validationErrorKey !== key) return;
      this.setData({
        validationErrorKey: "",
        validationErrorMessage: ""
      });
    },

    _showValidationError(key, message) {
      const target = `field-${key}`;
      this.setData({
        scrollTarget: "",
        validationErrorKey: key,
        validationErrorMessage: message
      }, () => {
        setTimeout(() => this.setData({ scrollTarget: target }), 20);
      });
      this._toast(message);
      return null;
    },

    _loadTags() {
      fetchActivityTags()
        .then((tags) => {
          this.setData({
            allTags: tags,
            filteredTags: buildTagList(tags, this.data.selectedTagMap)
          });
        })
        .catch((err) => {
          console.error("[activity tags request failed]", err);
          this._toast("标签加载失败");
        });
    },

    _syncPreviewImages() {
      const previewImages = (this.data.fileList || [])
        .filter((item) => !!item.url)
        .map((item) => ({ url: item.url }));

      this.setData({
        previewImages,
        hasImages: previewImages.length > 0
      });
    },

    beforeRead(e) {
      const detail = (e && e.detail) || {};
      const files = Array.isArray(detail.file) ? detail.file : [detail.file];
      const ok = files.every((file) => String((file && file.type) || "").includes("image"));

      if (typeof detail.callback === "function") detail.callback(ok);
      if (!ok) wx.showToast({ title: "只允许上传图片", icon: "none" });
    },

    afterRead(e) {
      const detail = (e && e.detail) || {};
      const files = Array.isArray(detail.file) ? detail.file : [detail.file];
      const fileList = this.data.fileList || [];
      const remain = (this.data.maxCount || 4) - fileList.length;
      const picked = files.slice(0, Math.max(0, remain));

      const appended = picked.map((file) => ({
        url: file.url,
        localUrl: file.url,
        name: file.name || "",
        type: "image",
        status: "uploading",
        message: "上传中"
      }));

      const startIndex = fileList.length;
      this.setData({ fileList: fileList.concat(appended) }, () => this._syncPreviewImages());
      picked.forEach((file, offset) => {
        this._uploadActivityImage(file, startIndex + offset);
      });

      if (files.length > remain) {
        wx.showToast({ title: `最多只能选 ${this.data.maxCount} 张`, icon: "none" });
      }
    },

    onDelete(e) {
      const index = Number(e && e.detail ? e.detail.index : -1);
      if (index < 0) return;

      const list = (this.data.fileList || []).slice();
      list.splice(index, 1);
      this.setData({ fileList: list }, () => this._syncPreviewImages());
    },

    _uploadActivityImage(file, index) {
      uploadImage(file && file.url, { folder: "londonmeet/dev/activity" })
        .then((result) => {
          const list = (this.data.fileList || []).slice();
          if (!list[index]) return;

          list[index] = {
            ...list[index],
            url: result.secureUrl,
            publicId: result.publicId,
            status: "done",
            message: ""
          };
          this.setData({ fileList: list }, () => this._syncPreviewImages());
          if (list.every((item) => item && item.status === "done")) {
            this._clearValidationError("images");
          }
        })
        .catch((err) => {
          const list = (this.data.fileList || []).slice();
          if (list[index]) {
            list[index] = {
              ...list[index],
              status: "failed",
              message: "上传失败"
            };
            this.setData({ fileList: list }, () => this._syncPreviewImages());
          }
          this._toast((err && err.message) || "活动图片上传失败");
        });
    },

    onOversize() {
      wx.showToast({ title: "图片太大了", icon: "none" });
    },

    onTitleLineChange(e) {
      const lines = e.detail.lineCount || 1;
      this.setData(lines > this.data.titleMaxLines ? { title: this.data.lastTitle } : { lastTitle: this.data.title });
    },

    onContentLineChange(e) {
      const lines = Math.max(1, Number(e.detail.lineCount) || 1);
      const visibleLines = Math.max(5, Math.min(this.data.contentMaxLines, lines));
      this.setData({
        contentLineCount: lines,
        contentHeight: visibleLines * 42
      });
    },

    focusTitle() {
      this.setData({ titleFocus: true, contentFocus: false });
    },

    focusContent() {
      this.setData({ titleFocus: false, contentFocus: true });
    },

    onTitleInput(e) {
      const title = e.detail.value || "";
      this.setData({ title });
      if (title.trim()) this._clearValidationError("title");
    },

    onContentInput(e) {
      const content = String(e.detail.value || "").slice(0, this.data.contentMaxChars);
      this.setData({
        content,
        contentLength: content.length
      });
      if (content.trim()) this._clearValidationError("content");
    },

    onInviteAfterRead(e) {
      const detail = (e && e.detail) || {};
      const files = Array.isArray(detail.file) ? detail.file : [detail.file];
      const first = files[0];
      if (!first) return;

      this.setData({
        inviteFileList: [{
          url: first.url,
          localUrl: first.url,
          name: first.name || "",
          type: "image",
          status: "uploading",
          message: "上传中"
        }],
        inviteDisplay: "群二维码上传中..."
      });

      uploadImage(first.url, { folder: "londonmeet/dev/group-qr" })
        .then((result) => {
          this.setData({
            inviteFileList: [{
              url: result.secureUrl,
              publicId: result.publicId,
              name: first.name || "",
              type: "image",
              status: "done"
            }],
            inviteDisplay: "已上传群二维码"
          });
          this._clearValidationError("invite");
        })
        .catch((err) => {
          this.setData({
            inviteFileList: [{
              url: first.url,
              localUrl: first.url,
              name: first.name || "",
              type: "image",
              status: "failed",
              message: "上传失败"
            }],
            inviteDisplay: "群二维码上传失败，请重试"
          });
          this._toast((err && err.message) || "群二维码上传失败");
        });
    },

    onInviteDelete() {
      this.setData({
        inviteFileList: [],
        inviteDisplay: "请上传群二维码（必填）"
      });
    },

    onTapRecruitRow() {
      this.setData({ showRecruitPicker: true });
    },

    onCloseRecruitPicker() {
      this.setData({ showRecruitPicker: false });
    },

    onConfirmRecruitPicker(event) {
      const value = event.detail.value || "";
      this.setData({
        recruitCount: value,
        recruitDisplay: value || "请选择人数",
        showRecruitPicker: false
      });
      if (value) this._clearValidationError("recruit");
    },

    onTapStartTimeRow() {
      this.setData({
        showTimePicker: true,
        activeTimeField: "start",
        timePickerTitle: "选择开始时间"
      });
    },

    onTapEndTimeRow() {
      this.setData({
        showTimePicker: true,
        activeTimeField: "end",
        timePickerTitle: "选择结束时间"
      });
    },

    onCloseTimePicker() {
      this.setData({ showTimePicker: false, activeTimeField: "" });
    },

    onConfirmTimePicker(event) {
      const value = this._parsePickerValue(event);
      if (!value) {
        this.onCloseTimePicker();
        return;
      }

      const [hour, minute, period] = value;
      const timeText = `${hour}:${minute} ${period}`;
      const field = this.data.activeTimeField;
      const next = { showTimePicker: false, activeTimeField: "" };

      if (field === "start") {
        next.startTime = timeText;
        next.startTimeDisplay = timeText;
      } else if (field === "end") {
        next.endTime = timeText;
        next.endTimeDisplay = timeText;
      }

      this.setData(next);
      if (field) this._clearValidationError(field);
    },

    _parsePickerValue(event) {
      const detail = (event && event.detail) || {};
      const raw = Array.isArray(detail.value) ? detail.value : [];
      if (!raw.length) return null;

      const value = raw.map((item) => {
        if (item && typeof item === "object") {
          return item.name || item.text || item.value || "";
        }
        return item;
      });

      return value.length >= 3 ? value.slice(0, 3) : null;
    },

    onOpenTagPicker() {
      this.setData({
        showTagPicker: true,
        filteredTags: buildTagList(this.data.allTags, this.data.selectedTagMap)
      });
    },

    onCloseTagPicker() {
      this.setData({
        showTagPicker: false,
        filteredTags: buildTagList(this.data.allTags, this.data.selectedTagMap)
      });
    },

    onToggleTag(e) {
      const id = Number(e && e.currentTarget && e.currentTarget.dataset ? e.currentTarget.dataset.id : 0);
      if (!id) return;

      const all = this.data.allTags || [];
      const tag = all.find((item) => item.id === id);
      if (!tag) return;

      const map = { ...(this.data.selectedTagMap || {}) };
      const ids = (this.data.tagIds || []).slice();
      const selected = (this.data.selectedTags || []).slice();
      const max = this.data.tagMax || 1;

      if (map[id]) {
        delete map[id];
        const idIndex = ids.indexOf(id);
        if (idIndex >= 0) ids.splice(idIndex, 1);
        const tagIndex = selected.findIndex((item) => item.id === id);
        if (tagIndex >= 0) selected.splice(tagIndex, 1);
      } else {
        if (ids.length >= max) {
          this._toast(`最多选择 ${max} 个标签`);
          return;
        }
        map[id] = true;
        ids.push(id);
        selected.push(tag);
      }

      this.setData({
        tagIds: ids,
        selectedTags: selected,
        selectedTagMap: map,
        filteredTags: buildTagList(this.data.allTags, map)
      });
    },

    onClearTags() {
      this.setData({
        tagIds: [],
        selectedTags: [],
        selectedTagMap: {},
        filteredTags: buildTagList(this.data.allTags, {}),
        tagsDisplay: "请选择活动标签"
      });
    },

    onConfirmTags() {
      const names = (this.data.selectedTags || []).map((item) => item.name);
      this.setData({
        tagsDisplay: names.length ? names.join(" ") : "请选择活动标签"
      });
      if (names.length) this._clearValidationError("tags");
      this.onCloseTagPicker();
    },

    onOpenCalendar() {
      this.setData({ showCalendar: true });
    },

    onCloseCalendar() {
      this.setData({ showCalendar: false });
    },

    onConfirmCalendar(e) {
      const detail = e && e.detail;
      let start = null;
      let end = null;

      if (Array.isArray(detail) && detail.length >= 2) {
        start = detail[0];
        end = detail[1];
      } else if (detail && detail.start && detail.end) {
        start = detail.start;
        end = detail.end;
      }

      if (!start || !end) {
        this.setData({ showCalendar: false });
        return;
      }

      this.setData({
        showCalendar: false,
        dateRange: [start, end],
        dateText: `${this._fmtDate(start)} - ${this._fmtDate(end)}`
      });
      this._clearValidationError("date");
    },

    _fmtDate(ts) {
      const d = new Date(ts);
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const dd = String(d.getDate()).padStart(2, "0");
      return `${mm}/${dd}`;
    },

    _sanitizeLocationText(value) {
      return String(value || "").trim();
    },

    _normalizeMapLocation(value) {
      return String(value || "").replace(/\s+/g, " ").trim();
    },

    _buildStaticMapUrl(value) {
      const location = this._normalizeMapLocation(this._sanitizeLocationText(value));
      if (!location) return;

      fetchStaticMap(location)
        .then((res) => {
          if (res && res.imageUrl) {
            this.setData({ mapImageUrl: res.imageUrl, mapLoadFailed: false });
            return;
          }
          this.setData({ mapImageUrl: "", mapLoadFailed: true });
          if (res && res.error) {
            console.warn("[static map unavailable]", res.error);
            wx.showToast({ title: "地图暂时不可用", icon: "none" });
          }
        })
        .catch((err) => {
          console.error("Map Request Error", err);
          this.setData({ mapImageUrl: "", mapLoadFailed: true });
          wx.showToast({ title: "地图加载失败", icon: "none" });
        });
    },

    onLocationInput(e) {
      const value = (e.detail && e.detail.value) || "";
      this.setData({ locationText: value, locationDisplay: value, mapLoadFailed: false });
      if (value.trim()) this._clearValidationError("location");

      if (this.locationDebounceTimer) clearTimeout(this.locationDebounceTimer);
      this.locationDebounceTimer = setTimeout(() => this._buildStaticMapUrl(value), 1000);
    },

    onPasteLocation() {
      wx.getClipboardData({
        success: (res) => {
          const text = res.data || "";
          this.setData({ locationText: text, locationDisplay: text, mapLoadFailed: false });
          if (text.trim()) this._clearValidationError("location");
          this._buildStaticMapUrl(text);
        }
      });
    },

    onPickLocation() {
      if (!wx.chooseLocation) return;

      wx.chooseLocation({
        success: (res) => {
          const text = res && (res.name || res.address) ? (res.name || res.address) : "已选择位置";
          this.setData({ locationText: text, locationDisplay: text, mapLoadFailed: false });
          this._clearValidationError("location");
          this._buildStaticMapUrl(text);
        },
        fail: () => {
          if (!this.data.locationText) {
            this.setData({ locationText: "", locationDisplay: "", mapImageUrl: "", mapLoadFailed: false });
          }
        }
      });
    },

    _toast(title) {
      wx.showToast({ title, icon: "none" });
    },

    _dateValue(value) {
      if (!value) return null;
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) return null;
      return new Date(date.getFullYear(), date.getMonth(), date.getDate());
    },

    _parseTimeText(value) {
      const text = String(value || "").trim();
      const matched = text.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
      if (!matched) return null;

      let hour = Number(matched[1]);
      const minute = Number(matched[2]);
      const period = matched[3].toUpperCase();

      if (hour < 1 || hour > 12 || minute < 0 || minute > 59) return null;
      if (period === "AM") {
        hour = hour === 12 ? 0 : hour;
      } else {
        hour = hour === 12 ? 12 : hour + 12;
      }

      return { hour, minute };
    },

    _combineDateTime(dateValue, timeText) {
      const date = this._dateValue(dateValue);
      const time = this._parseTimeText(timeText);
      if (!date || !time) return null;

      date.setHours(time.hour, time.minute, 0, 0);
      return date.getTime();
    },

    _parseRecruitCount(value) {
      const text = String(value || "").trim();
      if (!text) return null;
      const matched = text.match(/\d+/);
      return matched ? Number(matched[0]) : null;
    },

    _buildSubmitPayload() {
      const title = String(this.data.title || "").trim();
      const content = String(this.data.content || "").trim();
      const locationText = this._sanitizeLocationText(this.data.locationText || this.data.locationDisplay);
      const dateRange = this.data.dateRange || [];
      const activityFiles = this.data.fileList || [];
      const imageUrls = activityFiles
        .filter((item) => item && item.status === "done")
        .map((item) => item && item.url)
        .filter(Boolean);
      const inviteQrItem = this.data.inviteFileList && this.data.inviteFileList[0];
      const inviteQrUrl = inviteQrItem && inviteQrItem.status === "done"
        ? this.data.inviteFileList[0].url
        : "";
      const recruitCount = this._parseRecruitCount(this.data.recruitCount);

      if (activityFiles.some((item) => item && item.status === "uploading")) {
        return this._showValidationError("images", "活动图片正在上传，请稍候");
      }
      if (activityFiles.some((item) => item && item.status === "failed")) {
        return this._showValidationError("images", "请删除上传失败的活动图片后重试");
      }
      if (!imageUrls.length) {
        return this._showValidationError("images", "活动图片未上传");
      }
      if (!this.data.tagIds || !this.data.tagIds.length) {
        return this._showValidationError("tags", "活动标签未选择");
      }
      if (!dateRange[0] || !dateRange[1]) {
        return this._showValidationError("date", "活动日期未填写");
      }
      if (!this.data.startTime) {
        return this._showValidationError("start", "开始时间未填写");
      }
      if (!this.data.endTime) {
        return this._showValidationError("end", "结束时间未填写");
      }

      const startAt = this._combineDateTime(dateRange[0], this.data.startTime);
      const endAt = this._combineDateTime(dateRange[1], this.data.endTime);
      if (!startAt) {
        return this._showValidationError("start", "开始时间格式不正确");
      }
      if (!endAt) {
        return this._showValidationError("end", "结束时间格式不正确");
      }
      if (startAt < Date.now()) {
        return this._showValidationError("start", "开始时间不能早于当前时间");
      }
      if (endAt <= startAt) {
        return this._showValidationError("end", "结束时间必须晚于开始时间");
      }
      if (!recruitCount) {
        return this._showValidationError("recruit", "招募人数未填写");
      }
      if (!title) {
        return this._showValidationError("title", "活动标题未填写");
      }
      if (!content) {
        return this._showValidationError("content", "正文未填写");
      }
      if (!locationText) {
        return this._showValidationError("location", "活动地址未填写");
      }
      if (inviteQrItem && inviteQrItem.status === "uploading") {
        return this._showValidationError("invite", "加群码正在上传，请稍候");
      }
      if (inviteQrItem && inviteQrItem.status === "failed") {
        return this._showValidationError("invite", "加群码上传失败，请重新上传");
      }
      if (!inviteQrUrl) {
        return this._showValidationError("invite", "加群码未上传");
      }

      this.setData({ validationErrorKey: "", validationErrorMessage: "" });

      return {
        title,
        content,
        tagId: (this.data.tagIds || [])[0],
        tagIds: (this.data.tagIds || []).slice(0, this.data.tagMax || 4),
        startAt,
        endAt,
        recruitCount,
        locationText,
        mapImageUrl: this.data.mapImageUrl || "",
        imageUrls,
        inviteQrUrl
      };
    },

    onSubmit() {
      if (this.data.submitting) return;

      const payload = this._buildSubmitPayload();
      if (!payload) return;

      this.setData({ submitting: true });
      wx.showLoading({ title: "创建中...", mask: true });

      createActivity(payload)
        .then((activity) => {
          wx.hideLoading();
          wx.showToast({ title: "创建成功", icon: "success" });
          this.setData({ submitting: false });
          this.triggerEvent("created", { activity });
        })
        .catch((err) => {
          wx.hideLoading();
          console.error("[create activity failed]", err);
          this.setData({ submitting: false });
          this._toast((err && err.message) || "创建失败");
        });
    }
  }
});
