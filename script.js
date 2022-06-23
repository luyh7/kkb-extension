(function () {
  console.log("hack started!");
  var origOpen = XMLHttpRequest.prototype.open;
  //   console.log("XMLHttpRequest.prototype", XMLHttpRequest.prototype);
  XMLHttpRequest.prototype.open = function () {
    this.addEventListener("load", function () {
      // 拦截页面请求，获取课程信息
      if (this.responseURL.match(/courseinfo/)) {
        // console.log("responseURL", this.responseURL);
        const { data } = JSON.parse(this.responseText);
        console.log("courseInfo", data);
        // 清空已经获取的视频信息
        contentSrcList = [];
        const chapterList = data.chapter_list;
        chapterNum = chapterList.length;
        chapterList.forEach((chapter, cIndex) => {
          getChapterInfo(chapter.course_id, chapter.chapter_id, cIndex);
        });
      }
    });
    origOpen.apply(this, arguments);
  };
})();

// 封装cookie操作-
const cookie = {
  get(keys) {
    let mat = new RegExp("(^|[^a-z])" + keys + "=(.*?)(;|$)", "i").exec(
      document.cookie
    );
    return mat ? decodeURIComponent(mat[2]) : "";
  },
  set(name, value, expires, path, domain, secure) {
    let cookieText = encodeURIComponent(name) + "=" + encodeURIComponent(value);
    if (expires instanceof Date) {
      cookieText += "; expires=" + expires.toGMTString();
    }
    if (path) {
      cookieText += "; path=" + path;
    }
    if (domain) {
      cookieText += "; domain=" + domain;
    }
    if (secure) {
      cookieText += "; secure";
    }
    document.cookie = cookieText;
  },
  unset(name, path, domain, secure) {
    this.set(name, null, new Date(0), path, domain, secure);
  },
  delete(name, path, domain) {
    this.set(name, "", -1, path, domain);
  },
};

let contentSrcList = [];
let chapterNum = 0;
let getChapterInfoFinish = 0;
function getChapterInfo(courseId, chapterId, chapterIndex) {
  fetch(
    `https://weblearn.kaikeba.com/student/chapterinfo?course_id=${courseId}&chapter_id=${chapterId}&__timestamp=${new Date().getTime()}`,
    {
      headers: {
        authorization: `Bearer pc:${cookie.get("access-edu_online")}`,
        Cookie: document.cookie,
        accept: "application/json, text/plain, */*",
      },
    }
  )
    .then((response) => response.text())
    .then((text) => JSON.parse(text))
    .then(({ data }) => {
      const chapterName = `第${chapterIndex + 1}章`;
      //   console.log("chapterInfo", data.chapter_name, data);
      //   let videoContentList = data.section_list
      //     .flatMap((item) => item.group_list)
      //     .flatMap((item) => item.content_list)
      //     .flatMap((item) => item.content)
      //     .filter((item) => item.video_id);
      const sectionList = data.section_list;
      sectionList.forEach((section, sectionIndex) => {
        const sectionName = `第${sectionIndex + 1}节`;
        const contentList = section.group_list.flatMap(
          (item) => item.content_list
        );

        contentList.forEach((content, contentIndex) => {
          content.content.forEach((contentSrc) => {
            contentSrc.chapterName = chapterName;
            contentSrc.sectionName = sectionName;
            contentSrc.t = VIDEO_VENDOR[contentSrc.video_vendor];
            contentSrc.contentName = content.content_title;
            contentSrcList.push(contentSrc);
          });
        });
      });

      getChapterInfoFinish++;
      if (chapterNum === getChapterInfoFinish) {
        const contentVideoSrcList = contentSrcList.filter(
          (contentSrc) => contentSrc.video_id
        );
        // console.log("contentVideoSrcList", contentVideoSrcList);

        let getM3U8Finish = 0;
        getLiveAccessToken().then((token) => {
          contentVideoSrcList.forEach((contentSrc) => {
            getM3U8(contentSrc, token).then((video) => {
              getM3U8Finish++;
              contentSrc.videoInfo = video;
              // 全部完成后
              if (getM3U8Finish === contentVideoSrcList.length) {
                // todo这里应该把链接内容贴到popup上面，然后由popup发起下载请求

                console.log("contentVideoSrcList", contentVideoSrcList);
                // page->content_script
                sendMessageToContentScript({
                  type: "m3u8",
                  list: contentVideoSrcList,
                });
              }
            });
          });
        });
      }
    })
    .catch((error) => {});
}

const VIDEO_VENDOR = {
  4: "点播",
  5: "直播",
};

async function getM3U8(contentSrc, token) {
  const mediaInfo = await fetch(
    `https://api-vod.baoshiyun.com/vod/v1/platform/media/detail?mediaId=${contentSrc.callback_key}&accessToken=${token}`,
    {
      headers: {
        authorization: `Bearer pc:${cookie.get("access-edu_online")}`,
        Cookie: document.cookie,
        accept: "application/json, text/plain, */*",
      },
    }
  )
    .then((response) => response.text())
    .then((res) => JSON.parse(res))
    .then(({ data }) => data);
  const video = mediaInfo.mediaMetaInfo.videoGroup[0];
  video.title = mediaInfo.title;
  return video;
}

async function getLiveAccessToken() {
  const token = await fetch(
    "https://weblearn.kaikeba.com/get/bsy_video/access_token",
    {
      headers: {
        authorization: `Bearer pc:${cookie.get("access-edu_online")}`,
        Cookie: document.cookie,
        accept: "application/json, text/plain, */*",
      },
    }
  )
    .then((response) => response.text())
    .then((res) => JSON.parse(res))
    .then(({ data }) => data.access_token);
  return token;
}

const eventDiv = document.createElement("div");
eventDiv.setAttribute("id", "myCustomEventDiv");
document.body.appendChild(eventDiv);

var customEvent = document.createEvent("Event");
customEvent.initEvent("myCustomEvent", true, true);

function sendMessageToContentScript(message) {
  //   fireCustomEvent(JSON.stringify(message));
  window.postMessage(message, "*");
}

window.addEventListener("message", function ({ data }) {
  if (data.type === "download") {
    console.log("接受到来自popup的download数据", data);
    const content = data.content;
    const m3u8 = new M3U8Downloader(content);
    console.log("m3u8", m3u8);
    m3u8.getM3U8({
      start: (data) => {
        sendMessageToContentScript({ type: "bg_start_download", data: data });
      },
      finish: (data) => {
        sendMessageToContentScript({ type: "bg_finish", data: data });
      },
      progress: (data) => {
        sendMessageToContentScript({ type: "bg_progress", data: data });
      },
    });
  }
});

function fireCustomEvent(data) {
  const hiddenDiv = document.getElementById("myCustomEventDiv");
  hiddenDiv.innerText = data;
  hiddenDiv.dispatchEvent(customEvent);
}
