const bg = chrome.extension.getBackgroundPage();

// 为啥Vue.watch就不行啊 啊啊啊啊啊啊啊
bg.Vue.watch(
  () => bg.contentList.value,
  () => {
    console.log("watch ppppppp");
  },
  { deep: true }
);

let app = Vue.createApp({
  // el: "#app",
  data() {
    return {
      contentList: [],
      indeterminate: false,
      checkAll: false,
      maxDownloadCount: bg.maxDownloadCount.value,
    };
  },
  mounted() {
    this.onRefresh();
  },
  watch: {
    maxDownloadCount(val) {
      bg.maxDownloadCount.value = val;
    },
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
    onCheckChange(content, val) {
      this.checkAll = this.isCheckAll;
      this.indeterminate = this.isIndeterminate;
      this.bgContent(content).selected = val;
    },
    onCheckAllChange(val) {
      bg.contentList.value.forEach((content) => (content.selected = val));
      // this.contentList = JSON.parse(JSON.stringify(this.contentList));
      this.indeterminate = false;
      // 这里对contentList重新赋值，重新激活content.selected双向绑定
      // loadData(this);
    },
    bgContent(content) {
      return bg.contentList.value.find((c) => c.video_id === content.video_id);
    },
    // 是否是开始下载之后的状态
    isStartDownload(content) {
      return content.beforeDownload || content.downloading || content.finish;
    },
    // 放入下载等待队列
    onDownload(content) {
      this.bgContent(content).beforeDownload = true;
    },
    // 批量下载，同时只能存在一个下载任务
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

app = app.use(ElementPlus).mount("#app");

function loadData(_vm) {
  const vm = _vm || app;
  vm && (vm.contentList = JSON.parse(JSON.stringify(bg.contentList.value)));
}

function sendMessageToContentScript(message, callback) {
  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    chrome.tabs.sendMessage(tabs[0].id, message, function (response) {
      if (callback) callback(response);
    });
  });
}
