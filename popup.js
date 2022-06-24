const bg = chrome.extension.getBackgroundPage();

var app = new Vue({
  el: "#app",
  data() {
    return {
      contentList: [],
      indeterminate: false,
      checkAll: false,
    };
  },
  mounted() {
    this.onRefresh();
  },
  computed: {
    isIndeterminate: function () {
      return Boolean(
        this.contentList.find((content) => content.selected) &&
          this.contentList.find(
            (content) => !content.selected && !this.isStartDownload(content)
          )
      );
    },
    isCheckAll: function () {
      return Boolean(
        this.contentList.find((content) => content.selected) &&
          !this.contentList.find(
            (content) => !content.selected && !this.isStartDownload(content)
          )
      );
    },
  },
  methods: {
    onRefresh() {
      loadData(this);
    },
    onCheckChange() {
      this.checkAll = this.isCheckAll;
      this.indeterminate = this.isIndeterminate;
    },
    onCheckAllChange(val) {
      this.contentList.forEach((content) => (content.selected = val));
      // 这里对contentList重新赋值，重新激活content.selected双向绑定
      this.contentList = JSON.parse(JSON.stringify(this.contentList));
      this.indeterminate = false;
    },
    // 是否是开始下载之后的状态
    isStartDownload(content) {
      return content.beforeDownload || content.downloading || content.finish;
    },
    onDownload(content) {
      sendMessageToContentScript({ type: "download", content: content });
      const bgContent = bg.contentList.find(
        (c) => c.video_id === content.video_id
      );
      bgContent.beforeDownload = true;
      loadData(this);
    },
    onDownloadBatch() {
      this.contentList
        .filter((content) => content.selected)
        .forEach((content) => {
          this.onDownload(content);
        });
    },
    percentOf(content) {
      let percent = (content.downloadCount / content.total) * 100;
      if (isNaN(percent)) {
        percent = 0;
      }
      return +percent.toFixed(2);
    },

    progressFormatOf(content) {
      if (content.downloading) {
        return this.percentOf(content) + "%";
      } else if (content.finish) {
        return "已完成";
      } else if (content.beforeDownload) {
        return "等待下载";
      }
      return "";
    },
    statusOf(content) {
      if (content.finish) {
        return "success";
      }
    },
  },
});

function loadData(_vm) {
  const vm = _vm || app;
  vm &&
    vm.$set(
      vm,
      "contentList",
      JSON.parse(JSON.stringify(bg.contentList)).sort(
        (a, b) => a.video_id - b.video_id
      )
    );
}

function sendMessageToContentScript(message, callback) {
  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    chrome.tabs.sendMessage(tabs[0].id, message, function (response) {
      if (callback) callback(response);
    });
  });
}

const exp = {
  video_id: 96713,
  content_id: 326989,
  group_id: 42771,
  section_id: 44077,
  chapter_id: 213783,
  course_id: 212328,
  video_vendor: 5,
  status: 2,
  duration: 8272,
  file_size: 0,
  image:
    "https://v.baoshiyun.com/resource/media-846643034750976/e42e7df5008f4763a4c27465d492e3b2_00001.jpg",
  callback_key: "media-846643034750976",
  hide: 0,
  support_free_see: 0,
  support_free_see_type: 0,
  is_signin: 0,
  chapterName: "第7章",
  sectionName: "第1节",
  t: "直播",
  contentName: "小程序-01：微信原生小程序+云开发",
  videoInfo: {
    videoId: "video-846657323171840",
    extension: ".m3u8",
    resolution: "超清",
    presetName: "lud",
    bucketName: "bsy-vod-output",
    objectName:
      "resource/media-846643034750976/lud/a07d66565eca4382a369906a5ddd30b7.m3u8",
    isEncryption: true,
    noAuth: true,
    playURL:
      "https://v.baoshiyun.com/resource/media-846643034750976/lud/a07d66565eca4382a369906a5ddd30b7.m3u8?MtsHlsUriToken=33767a5310b14d8ab581cea3a293342854bc9e3a7f6a43c282f5aece7b0678e0",
    size: "438306208",
    duration: "8272.379778",
    title: "小程序-01：微信原生小程序 云开发",
  },
};
