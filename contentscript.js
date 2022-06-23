var aes = document.createElement("script");
aes.src = chrome.extension.getURL("aes-decryptor.js");
(document.head || document.documentElement).appendChild(aes);

var mux = document.createElement("script");
mux.src = chrome.extension.getURL("mux-mp4.js");
(document.head || document.documentElement).appendChild(mux);

var m3u8 = document.createElement("script");
m3u8.src = chrome.extension.getURL("m3u8.js");
(document.head || document.documentElement).appendChild(m3u8);

var s = document.createElement("script");
s.src = chrome.extension.getURL("script.js");
(document.head || document.documentElement).appendChild(s);

// var port = chrome.extension.connect();

s.onload = () => {
  // 监听注入脚本发出的自定义事件，然后发送到background
  document
    .getElementById("myCustomEventDiv")
    .addEventListener("myCustomEvent", function () {
      var eventData = document.getElementById("myCustomEventDiv").innerText;

      console.log("getmess1", JSON.parse(eventData));
      chrome.runtime.sendMessage(JSON.parse(eventData), function (response) {});
    });
};

window.addEventListener(
  "message",
  function (e) {
    if (e.data.type === "m3u8") {
      console.log("发送m3u8链接到bg", e.data);
      chrome.runtime.sendMessage(e.data);
    }
    if (e.data.type && e.data.type.match(/^bg_/)) {
      chrome.runtime.sendMessage(e.data);
    }
  }
  //   false
);

// 接受来自bg/popup的消息
chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  if (request.type == "download") {
    console.log("接收到来自popup的下载信号");

    // At the receivers end. In your case: chrome.extension.onRequest
    //   var receivedData = JSON.parse(transportData);

    //   // data.data is an Object, NOT an ArrayBuffer or Uint8Array
    //   receivedData.data = new Uint8Array(receivedData.data).buffer;

    console.log("req", request);
    window.postMessage(request, "*");
  }
});
