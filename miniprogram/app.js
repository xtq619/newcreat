App({
  globalData: {
    baseUrl: 'https://api.xtq619.xyz/api/v1',
    token: '',
    user: null,
  },

  onLaunch() {
    this.globalData.token = wx.getStorageSync('token') || '';
    this.globalData.user = wx.getStorageSync('user') || null;

    if (this.globalData.token) {
      this.fetchUser();
    }
  },

  fetchUser() {
    const that = this;
    wx.request({
      url: `${this.globalData.baseUrl}/auth/me`,
      header: { Authorization: `Bearer ${this.globalData.token}` },
      timeout: 10000,
      success(res) {
        if (res.statusCode === 200) {
          that.globalData.user = res.data;
          wx.setStorageSync('user', res.data);
        } else if (res.statusCode === 401) {
          that.logout();
        }
      },
      fail() {
        // 静默处理，不阻断启动
      },
    });
  },

  isLoggedIn() {
    return !!this.globalData.token;
  },

  isAdmin() {
    return this.globalData.user?.role === 'admin';
  },

  logout() {
    this.globalData.token = '';
    this.globalData.user = null;
    wx.removeStorageSync('token');
    wx.removeStorageSync('user');
  },
});
