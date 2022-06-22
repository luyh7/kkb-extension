chrome.runtime.onInstalled.addListener(function () {
  console.log("插件已被安装");
});
var origOpen = XMLHttpRequest.prototype.open;

XMLHttpRequest.prototype.open = function () {
  console.log("request started!");
  this.addEventListener("load", function () {
    console.log(this.responseText); // 得到Ajax的返回内容
  });
  origOpen.apply(this, arguments);
};
