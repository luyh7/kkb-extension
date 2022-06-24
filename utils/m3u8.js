class M3U8Downloader {
  constructor(content) {
    this.content = content;
    // 碎片下载完后的回调
    this.finishCallback = null;
    this.progressCallback = null;
    this.downloading = false;
    this.url = content.videoInfo.playURL;
    this.finishNum = 0;
    this.finishList = []; // 下载完成项目
    this.tsUrlList = []; // ts URL数组
    this.mediaFileList = []; // 下载的媒体数组
    // 是否转码为 MP4 下载
    this.isGetMP4 = true;
    // 当前下载片段
    this.downloadIndex = 0;
    // 特定范围下载
    this.rangeDownload = {
      isShowRange: false, // 是否显示范围下载
      startSegment: "", // 起始片段
      endSegment: "", // 截止片段
      targetSegment: 1, // 待下载片段
    };
    // AES 视频解密配置
    this.aesConf = {
      method: "", // 加密算法
      uri: "", // key 所在文件路径
      iv: "", // 偏移值
      key: "", // 秘钥
      decryptor: null, // 解码器对象

      stringToBuffer: function (str) {
        return new TextEncoder().encode(str);
      },
    };
  }
  getM3U8({ start, progress, finish }) {
    if (this.content.downloading) {
      console.log("资源下载中，请稍后");
      return;
    }
    start &&
      start({
        content: this.content,
      });
    this.finishCallback = finish;
    this.progressCallback = progress;

    // 在下载页面才触发，代码注入的页面不需要校验
    // 当前协议不一致，切换协议
    // if (
    //   location.href.indexOf("blog.luckly-mjw.cn") > -1 &&
    //   this.url.indexOf(location.protocol) === -1
    // ) {
    //   //alert('当前协议不一致，跳转至正确页面重新下载')
    //   location.href = `${
    //     this.url.split(":")[0]
    //   }://blog.luckly-mjw.cn/tool-show/m3u8-downloader/index.html?source=${
    //     this.url
    //   }`;
    //   return;
    // }

    // 在下载页面才触发，修改页面 URL，携带下载路径，避免刷新后丢失
    // if (location.href.indexOf("blog.luckly-mjw.cn") > -1) {
    //   window.history.replaceState(
    //     null,
    //     "",
    //     `${location.href.split("?")[0]}?source=${this.url}`
    //   );
    // }

    this.tips = "m3u8 文件下载中，请稍后";
    this.beginTime = new Date();
    this.ajax({
      url: this.url,
      success: (m3u8Str) => {
        // console.log("m3u8Str", m3u8Str);
        this.tsUrlList = [];
        this.finishList = [];

        // 提取 ts 视频片段地址
        m3u8Str.split("\n").forEach((item) => {
          if (
            item.toLowerCase().indexOf(".ts") > -1 ||
            item.toLowerCase().indexOf(".image") > -1
          ) {
            this.tsUrlList.push(this.applyURL(item, this.url));
            this.finishList.push({
              title: item,
              status: "",
            });
          }
        });

        // 仅获取视频片段

        let startSegment = Math.max(this.rangeDownload.startSegment || 1, 1); // 最小为 1
        let endSegment = Math.max(
          this.rangeDownload.endSegment || this.tsUrlList.length,
          1
        );
        startSegment = Math.min(startSegment, this.tsUrlList.length); // 最大为 this.tsUrlList.length
        endSegment = Math.min(endSegment, this.tsUrlList.length);
        this.rangeDownload.startSegment = Math.min(startSegment, endSegment);
        this.rangeDownload.endSegment = Math.max(startSegment, endSegment);
        this.rangeDownload.targetSegment =
          this.rangeDownload.endSegment - this.rangeDownload.startSegment + 1;
        this.downloadIndex = this.rangeDownload.startSegment - 1;
        this.downloading = true;

        // 获取需要下载的 MP4 视频长度
        if (this.isGetMP4) {
          let infoIndex = 0;
          m3u8Str.split("\n").forEach((item) => {
            if (item.toUpperCase().indexOf("#EXTINF:") > -1) {
              // 计算视频总时长，设置 mp4 信息时使用
              infoIndex++;
              if (
                this.rangeDownload.startSegment <= infoIndex &&
                infoIndex <= this.rangeDownload.endSegment
              ) {
                this.durationSecond += parseFloat(item.split("#EXTINF:")[1]);
              }
            }
          });
        }

        // 检测视频 AES 加密
        if (m3u8Str.indexOf("#EXT-X-KEY") > -1) {
          this.aesConf.method = (m3u8Str.match(/(.*METHOD=([^,\s]+))/) || [
            "",
            "",
            "",
          ])[2];
          this.aesConf.uri = (m3u8Str.match(/(.*URI="([^"]+))"/) || [
            "",
            "",
            "",
          ])[2];
          this.aesConf.iv = (m3u8Str.match(/(.*IV=([^,\s]+))/) || [
            "",
            "",
            "",
          ])[2];
          this.aesConf.iv = this.aesConf.iv
            ? this.aesConf.stringToBuffer(this.aesConf.iv)
            : "";
          this.aesConf.uri = this.applyURL(this.aesConf.uri, this.url);

          // let params = m3u8Str.match(/#EXT-X-KEY:([^,]*,?METHOD=([^,]+))?([^,]*,?URI="([^,]+)")?([^,]*,?IV=([^,^\n]+))?/)
          // this.aesConf.method = params[2]
          // this.aesConf.uri = this.applyURL(params[4], this.url)
          // this.aesConf.iv = params[6] ? this.aesConf.stringToBuffer(params[6]) : ''
          this.getAES();
        } else if (this.tsUrlList.length > 0) {
          // 如果视频没加密，则直接下载片段，否则先下载秘钥
          this.downloadTS();
        } else {
          this.alertError("资源为空，请查看链接是否有效");
        }
      },
      fail: () => {
        this.alertError("链接不正确，请查看链接是否有效");
      },
    });
  }

  // ajax 请求
  ajax(options) {
    options = options || {};
    let xhr = new XMLHttpRequest();
    if (options.type === "file") {
      xhr.responseType = "arraybuffer";
    }

    xhr.onreadystatechange = function () {
      if (xhr.readyState === 4) {
        let status = xhr.status;
        if (status >= 200 && status < 300) {
          options.success && options.success(xhr.response);
        } else {
          options.fail && options.fail(status);
        }
      }
    };

    xhr.open("GET", options.url, true);
    xhr.send(null);
  }

  // 合成URL
  applyURL(targetURL, baseURL) {
    baseURL = baseURL || location.href;
    if (targetURL.indexOf("http") === 0) {
      return targetURL;
    } else if (targetURL[0] === "/") {
      let domain = baseURL.split("/");
      return domain[0] + "//" + domain[2] + targetURL;
    } else {
      let domain = baseURL.split("/");
      domain.pop();
      return domain.join("/") + "/" + targetURL;
    }
  }
  // 获取AES配置
  getAES() {
    console.log("视频被 AES 加密，进行视频解码");
    this.ajax({
      type: "file",
      url: this.aesConf.uri,
      success: (key) => {
        // console.log('getAES', key)
        // this.aesConf.key = this.aesConf.stringToBuffer(key)
        this.aesConf.key = key;
        this.aesConf.decryptor = new AESDecryptor();
        this.aesConf.decryptor.constructor();
        this.aesConf.decryptor.expandKey(this.aesConf.key);

        this.downloadTS();
      },
      fail: () => {
        this.alertError("视频已进行定制化加密，不提供定制化解密下载");
      },
    });
  }

  // 下载分片
  downloadTS() {
    this.tips = "ts 视频碎片下载中，请稍后";
    let download = () => {
      let isPause = this.isPause; // 使用另一个变量来保持下载前的暂停状态，避免回调后没修改
      let index = this.downloadIndex;
      this.downloadIndex++;
      if (this.finishList[index] && this.finishList[index].status === "") {
        this.ajax({
          url: this.tsUrlList[index],
          type: "file",
          success: (file) => {
            this.dealTS(
              file,
              index,
              () =>
                this.downloadIndex < this.rangeDownload.endSegment &&
                !isPause &&
                download()
            );
          },
          fail: () => {
            this.errorNum++;
            this.finishList[index].status = "error";
            if (this.downloadIndex < this.rangeDownload.endSegment) {
              !isPause && download();
            }
          },
        });
      } else if (this.downloadIndex < this.rangeDownload.endSegment) {
        // 跳过已经成功的片段
        !isPause && download();
      }
    };

    // 建立多少个 ajax 线程
    for (
      let i = 0;
      i < Math.min(10, this.rangeDownload.targetSegment - this.finishNum);
      i++
    ) {
      download(i);
    }
  }

  // 处理 ts 片段，AES 解密、mp4 转码
  dealTS(file, index, callback) {
    const data = this.aesConf.uri ? this.aesDecrypt(file, index) : file;
    this.conversionMp4(data, index, (afterData) => {
      // mp4 转码
      this.mediaFileList[index - this.rangeDownload.startSegment + 1] =
        afterData; // 判断文件是否需要解密
      this.finishList[index].status = "finish";
      this.finishNum++;
      this.progressCallback({
        content: this.content,
        downloadCount: this.finishNum,
        total: this.finishList.length,
      });
      // console.log(`${this.finishNum}/${this.finishList.length}`);
      if (this.finishNum === this.rangeDownload.targetSegment) {
        // 整合文件交给注入页面完成
        // this.fragmentFinishCallback &&
        //   this.fragmentFinishCallback(this.mediaFileList);
        console.log(`下载完成，正在整理文件碎片`);
        this.finishCallback({
          content: this.content,
        });
        this.downloadFile(
          this.mediaFileList,
          this.formatTime(this.beginTime, "YYYY_MM_DD hh_mm_ss")
        );
      }
      callback && callback();
    });
  }
  // 格式化时间
  formatTime(date, formatStr) {
    const formatType = {
      Y: date.getFullYear(),
      M: date.getMonth() + 1,
      D: date.getDate(),
      h: date.getHours(),
      m: date.getMinutes(),
      s: date.getSeconds(),
    };
    return formatStr.replace(/Y+|M+|D+|h+|m+|s+/g, (target) =>
      (new Array(target.length).join("0") + formatType[target[0]]).substr(
        -target.length
      )
    );
  }

  // ts 片段的 AES 解码
  aesDecrypt(data, index) {
    let iv =
      this.aesConf.iv ||
      new Uint8Array([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, index]);
    return this.aesConf.decryptor.decrypt(data, 0, iv.buffer || iv, true);
  }

  // 转码为 mp4
  conversionMp4(data, index, callback) {
    if (this.isGetMP4) {
      let transmuxer = new muxjs.Transmuxer({
        keepOriginalTimestamps: true,
        duration: parseInt(this.durationSecond),
      });
      transmuxer.on("data", (segment) => {
        if (index === this.rangeDownload.startSegment - 1) {
          let data = new Uint8Array(
            segment.initSegment.byteLength + segment.data.byteLength
          );
          data.set(segment.initSegment, 0);
          data.set(segment.data, segment.initSegment.byteLength);
          callback(data.buffer);
        } else {
          callback(segment.data);
        }
      });
      transmuxer.push(new Uint8Array(data));
      transmuxer.flush();
    } else {
      callback(data);
    }
  }

  // 下载整合后的TS文件
  downloadFile(fileDataList, fileName) {
    this.tips = "ts 碎片整合中，请留意浏览器下载";
    let fileBlob = null;
    let a = document.createElement("a");
    if (this.isGetMP4) {
      fileBlob = new Blob(fileDataList, { type: "video/mp4" }); // 创建一个Blob对象，并设置文件的 MIME 类型
      a.download = fileName + ".mp4";
    } else {
      fileBlob = new Blob(fileDataList, { type: "video/MP2T" }); // 创建一个Blob对象，并设置文件的 MIME 类型
      a.download = fileName + ".ts";
    }
    a.href = URL.createObjectURL(fileBlob);
    a.style.display = "none";
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  // 根据url下载blob
  downloadBlob(url, fileName) {
    console.log("downloading blob:", fileName, " :: ", url);
    let a = document.createElement("a");
    if (this.isGetMP4) {
      a.download = fileName + ".mp4";
    } else {
      a.download = fileName + ".ts";
    }
    a.href = url;
    a.style.display = "none";
    document.body.appendChild(a);
    a.click();
    a.remove();
  }
}
