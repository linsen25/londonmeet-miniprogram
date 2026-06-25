const { uploadImage } = require("../../api/cloudinary");

Component({
  properties: {
    initialUrl: {
      type: String,
      value: ""
    },
    initialDays: {
      type: Number,
      value: 7
    },
    maxSize: {
      type: Number,
      value: 5 * 1024 * 1024
    }
  },

  data: {
    fileList: [],
    uploadedUrl: "",
    uploading: false,
    remainingDays: 7,
    daysDisplay: "剩余 7 天",
    reminderText: "预计7天后失效，我们将在6天后提醒你更换。",
    dayColumns: ["1天", "2天", "3天", "4天", "5天", "6天", "7天"],
    showDaysPicker: false
  },

  lifetimes: {
    attached() {
      this.reset({
        url: this.properties.initialUrl,
        remainingDays: this.properties.initialDays
      });
    }
  },

  methods: {
    reset(options) {
      const value = options || {};
      const url = String(value.url || "");
      const days = Math.min(7, Math.max(1, Number(value.remainingDays) || 7));
      this.setData({
        fileList: url ? [{ url, status: "done", message: "" }] : [],
        uploadedUrl: url,
        uploading: false,
        remainingDays: days,
        daysDisplay: `剩余 ${days} 天`,
        reminderText: `预计${days}天后失效，我们将在${Math.max(0, days - 1)}天后提醒你更换。`,
        showDaysPicker: false
      });
      this.emitChange();
    },

    getValue() {
      return {
        url: this.data.uploadedUrl || "",
        remainingDays: this.data.remainingDays,
        uploading: this.data.uploading,
        failed: !!(this.data.fileList[0] && this.data.fileList[0].status === "failed")
      };
    },

    emitChange() {
      this.triggerEvent("change", this.getValue());
    },

    beforeRead(event) {
      const detail = event.detail || {};
      const files = Array.isArray(detail.file) ? detail.file : [detail.file];
      const ok = files.every((file) => file && String(file.type || "").includes("image"));
      if (typeof detail.callback === "function") detail.callback(ok);
      if (!ok) wx.showToast({ title: "只允许上传图片", icon: "none" });
    },

    afterRead(event) {
      const detail = event.detail || {};
      const files = Array.isArray(detail.file) ? detail.file : [detail.file];
      const file = files[0];
      if (!file || !file.url) return;

      this.setData({
        fileList: [{
          url: file.url,
          localUrl: file.url,
          name: file.name || "",
          type: "image",
          status: "uploading",
          message: "上传中"
        }],
        uploadedUrl: "",
        uploading: true
      });
      this.emitChange();

      uploadImage(file.url, { folder: "londonmeet/dev/group-qr" })
        .then((result) => {
          const secureUrl = result.secureUrl || result.url || "";
          if (!secureUrl) throw new Error("上传结果缺少图片地址");
          this.setData({
            fileList: [{
              url: secureUrl,
              publicId: result.publicId || "",
              name: file.name || "",
              type: "image",
              status: "done",
              message: ""
            }],
            uploadedUrl: secureUrl,
            uploading: false
          });
          this.emitChange();
          this.triggerEvent("uploaded", { url: secureUrl, publicId: result.publicId || "" });
        })
        .catch((err) => {
          this.setData({
            fileList: [{
              url: file.url,
              localUrl: file.url,
              name: file.name || "",
              type: "image",
              status: "failed",
              message: "上传失败"
            }],
            uploadedUrl: "",
            uploading: false
          });
          this.emitChange();
          wx.showToast({ title: err.message || "群二维码上传失败", icon: "none" });
        });
    },

    onDelete() {
      this.setData({
        fileList: [],
        uploadedUrl: "",
        uploading: false
      });
      this.emitChange();
    },

    onOversize() {
      wx.showToast({ title: "图片不能超过5MB", icon: "none" });
    },

    onPreview() {
      const url = this.data.uploadedUrl
        || (this.data.fileList[0] && this.data.fileList[0].url)
        || "";
      if (!url) return;
      wx.previewImage({ current: url, urls: [url] });
    },

    onOpenDaysPicker() {
      this.setData({ showDaysPicker: true });
    },

    onCloseDaysPicker() {
      this.setData({ showDaysPicker: false });
    },

    onConfirmDaysPicker(event) {
      const raw = event.detail && event.detail.value;
      const value = Array.isArray(raw) ? raw[0] : raw;
      const matched = String(value || "").match(/\d+/);
      const days = matched ? Number(matched[0]) : 7;
      this.setData({
        remainingDays: days,
        daysDisplay: `剩余 ${days} 天`,
        reminderText: `预计${days}天后失效，我们将在${Math.max(0, days - 1)}天后提醒你更换。`,
        showDaysPicker: false
      });
      this.emitChange();
    }
  }
});
