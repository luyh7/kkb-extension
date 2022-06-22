let changeColor = document.getElementById("changeColor");

changeColor.onclick = function (el) {
  console.log("chrome", chrome);
  //请求百度的logo图片 会拦截
  fetch("https://www.baidu.com/img/bd_logo1.png", { method: "get" })
    .then(function (response) {
      console.log(response);
    })
    .catch(function (err) {
      console.log("Fetch错误:" + err);
    });
  //请求百度 不会拦截
  fetch("https://www.baidu.com/", { method: "get" })
    .then(function (response) {
      console.log(response);
    })
    .catch(function (err) {
      console.log("Fetch错误:" + err);
    });
};
chrome.webRequest.onHeadersReceived.addListener(
  function (details) {
    console.log("onHeadersReceived", details); //请求baidu .png文件时会拦截
    //onHeadersReceived {frameId: 0, initiator: "chrome-extension://agkllkkjbhclhjnlebdbdagkagfgcecj", method: "GET", parentFrameId: -1, requestId: "72074", …}
    return { cancel: true };
  },
  { urls: ["*://*.baidu.com/*.png*"] },
  ["responseHeaders", "blocking"]
);
