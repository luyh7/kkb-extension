const { ref, reactive, watch } = Vue;
var contentList = ref([]);
var maxDownloadCount = ref(2);

// 监听contentList内容更新
watch(
  () => contentList.value,
  (val) => {
    // 更新页面
    const popup = getPopup();
    popup && popup.loadData && popup.loadData();

    // 下载任务小于最大同时下载数时，开启一个等待中的下载
    const downloadCount = val.filter(
      (content) => content.downloading && !content.finish
    ).length;
    if (downloadCount < maxDownloadCount.value) {
      const nextDownloadContent = val.find(
        (content) =>
          content.beforeDownload && !content.downloading && !content.finish
      );
      nextDownloadContent && startDownload(nextDownloadContent);
    }
  },
  { deep: true }
);

function startDownload(content) {
  const find = contentList.value.find((c) => c.video_id === content.video_id);
  find && (find.downloading = true);
  sendMessageToContentScript({ type: "download", content: content });
}

// todo 接受消息的行为改为表驱动
// 例如，根据接受的type来调用方法：
// if !messageHandle[request.type] throw error
// messageHandle[request.type](request,sender,sendResponse)
chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  // receive m3u8 links
  if (request.type == "m3u8") {
    console.log("bg receive m3u8", request);
    // todo 这里或许可以改成叠加的方式
    contentList.value = request.list
      .sort((a, b) => a.contentIndex - b.contentIndex)
      .sort((a, b) => a.sectionIndex - b.sectionIndex)
      .sort((a, b) => a.chapterIndex - b.chapterIndex);
    console.log("contentList", contentList.value);

    // https://stackoverflow.com/questions/8593896/chrome-extension-how-to-pass-arraybuffer-or-blob-from-content-script-to-the-bac
    // 尝试过在bg下载文件Buffer，然后通过序列化的方式传输到前台
    // 由于文件太大传输失败
    // 所以改为前台下载
    // const m3u8 = new M3U8Downloader(contentList[0].videoInfo.playURL);
    // m3u8.getM3U8((fileDataList) => {
    //   //   download finish, send data to content script
    //   console.log("fileDataList", fileDataList);
    // });
  }
});

// 监听页面变化
chrome.tabs.onUpdated.addListener(function (tabId, changeInfo, tab) {
  if (changeInfo.url) {
    console.log("onPageChange", changeInfo.url);
    chrome.tabs.sendMessage(tabId, {
      type: "inject_page_change",
      data: changeInfo,
    });
  }
});

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  if (request.type == "bg_start_download") {
    const data = request.data;
    // const content = contentList.value.find(
    //   (content) => content.video_id === data.content.video_id
    // );
    // content && (content.downloading = true);
  }

  if (request.type == "bg_progress") {
    const data = request.data;
    const content = contentList.value.find(
      (content) => content.video_id === data.content.video_id
    );
    content && (content.downloadCount = data.downloadCount);
    content && (content.total = data.total);
  }
  if (request.type == "bg_finish") {
    const data = request.data;
    const content = contentList.value.find(
      (content) => content.video_id === data.content.video_id
    );
    content && (content.downloading = false);
    content && (content.finish = true);
  }
});

function getPopup() {
  const pups =
    chrome.extension.getViews({
      type: "popup",
    }) || [];
  const popup = pups[0];
  return popup;
}

function sendMessageToContentScript(message, callback) {
  chrome.tabs.query({ url: 'https://learn.kaikeba.com/*' }, function (tabs) {
    chrome.tabs.sendMessage(tabs[0].id, message, function (response) {
      if (callback) callback(response);
    });
  });
}
