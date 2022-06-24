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
