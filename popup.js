// import "./pkg/vue/vue.min.js";
// import Vue from "./pkg/vue/vue.esm.browser.js";
// import "./pkg/element-ui/lib/index.js";
const bg = chrome.extension.getBackgroundPage();

var app = new Vue({
  el: "#app",
  data() {
    return {
      contentList: [],
      indeterminate: false,
      checkAll: false,
      maxDownloadCount: 1,
    };
  },
  mounted() {
    console.log("popup mounted");
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
  watch: {
    // contentList 更新时检查状态，决定下一步操作
    // todo 鉴于获取下载进度时也会更新contentList, 需要讨论这个watcher是否会严重影响性能
    contentList() {
      // 下载任务小于最大同时下载数时，开启一个等待中的下载
      const downloadCount = this.contentList.filter(
        (content) => content.downloading && !content.finish
      ).length;
      if (downloadCount < this.maxDownloadCount) {
        console.log("downloadCount", downloadCount);
        const nextDownloadContent = this.contentList.find(
          (content) =>
            content.beforeDownload && !content.downloading && !content.finish
        );
        nextDownloadContent && this.startDownload(nextDownloadContent);
      }
    },
  },
  /**
   * content发生变化时尽量让 bgContent 跟着变，这样才能保持一致
   */
  methods: {
    onRefresh() {
      loadData(this);
    },
    onCheckChange(content, val) {
      this.checkAll = this.isCheckAll;
      this.indeterminate = this.isIndeterminate;
      this.bgContent(content).selected = val;
    },
    onCheckAllChange(val) {
      bg.contentList.forEach((content) => (content.selected = val));
      // this.contentList = JSON.parse(JSON.stringify(this.contentList));
      this.indeterminate = false;
      // 这里对contentList重新赋值，重新激活content.selected双向绑定
      loadData(this);
    },
    bgContent(content) {
      return bg.contentList.find((c) => c.video_id === content.video_id);
    },
    // 是否是开始下载之后的状态
    isStartDownload(content) {
      return content.beforeDownload || content.downloading || content.finish;
    },
    // 放入下载等待队列
    onDownload(content) {
      this.bgContent(content).beforeDownload = true;
      loadData(this);
    },
    // 批量下载，同时只能存在一个下载任务
    onDownloadBatch() {
      this.contentList
        .filter((content) => content.selected)
        .forEach((content) => {
          this.onDownload(content);
        });
    },
    // 开始下载
    startDownload(content) {
      this.bgContent(content).downloading = true;
      content.downloading = true;
      sendMessageToContentScript({ type: "download", content: content });
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
  vm && vm.$set(vm, "contentList", JSON.parse(JSON.stringify(bg.contentList)));
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
