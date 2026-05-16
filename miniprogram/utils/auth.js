const app = getApp();

function isLoggedIn() {
  return !!wx.getStorageSync('token');
}

function saveToken(token) {
  wx.setStorageSync('token', token);
  app.globalData.token = token;
}

function saveUser(user) {
  wx.setStorageSync('user', user);
  app.globalData.user = user;
}

function logout() {
  app.logout();
  wx.reLaunch({ url: '/pages/hub/hub' });
}

module.exports = { isLoggedIn, saveToken, saveUser, logout };
