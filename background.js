var contentList = [];
chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  // receive m3u8 links
  if (request.type == "m3u8") {
    console.log("bg receive m3u8", request);
    const popup = getPopup();
    popup && popup.loadData();
    // todo 这里或许可以改成叠加的方式
    contentList = request.list;
    console.log("contentList", contentList);

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
    const content = contentList.find(
      (content) => content.video_id === data.content.video_id
    );
    content && (content.downloading = true);
    const popup = getPopup();
    popup && popup.loadData();
  }

  if (request.type == "bg_progress") {
    const data = request.data;
    const content = contentList.find(
      (content) => content.video_id === data.content.video_id
    );
    content && (content.downloadCount = data.downloadCount);
    content && (content.total = data.total);
    const popup = getPopup();
    popup && popup.loadData();
  }
  if (request.type == "bg_finish") {
    const data = request.data;
    const content = contentList.find(
      (content) => content.video_id === data.content.video_id
    );
    content && (content.downloading = false);
    content && (content.finish = true);
    const popup = getPopup();
    popup && popup.loadData();
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
  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    chrome.tabs.sendMessage(tabs[0].id, message, function (response) {
      if (callback) callback(response);
    });
  });
}
