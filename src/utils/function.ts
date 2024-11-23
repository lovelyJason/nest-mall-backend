export function substrUrlExceptDomain(url) {
  // var url = "http://user.api.it120.cc/user/apiextuser/info";
  return  url.replace(/^https?:\/\/[^/]+/, "");
}