const api = require('../../utils/api');
const auth = require('../../utils/auth');

Page({
  data: {
    isLoggedIn: false,
    userName: 'U',
    userEmail: '',
    avatarUrl: '',
    tempAvatar: '',
    tempNickname: '',
    loading: false,
  },

  onShow() {
    this.checkLogin();
  },

  checkLogin() {
    const isLoggedIn = auth.isLoggedIn();
    this.setData({ isLoggedIn });
    if (isLoggedIn) {
      const user = getApp().globalData.user;
      if (user) {
        this.setData({
          userName: user.name ? user.name.charAt(0).toUpperCase() : 'U',
          userEmail: user.name || user.email || '',
          avatarUrl: user.avatar_url || '',
        });
      }
    }
  },

  onChooseAvatar(e) {
    this.setData({ tempAvatar: e.detail.avatarUrl });
  },

  onNicknameInput(e) {
    this.setData({ tempNickname: e.detail.value });
  },

  async wxLogin() {
    const nickname = this.data.tempNickname;
    const avatarUrl = this.data.tempAvatar;

    if (!nickname) {
      wx.showToast({ title: '请先获取昵称', icon: 'none' });
      return;
    }

    try {
      this.setData({ loading: true });

      const loginRes = await wx.login();
      if (!loginRes.code) {
        wx.showToast({ title: '微信登录失败', icon: 'none' });
        return;
      }

      const data = await api.wxLogin(loginRes.code, nickname, avatarUrl);
      auth.saveToken(data.access_token);

      try {
        const user = await api.getMe();
        auth.saveUser(user);
        getApp().globalData.user = user;
      } catch (err) { /* ignore */ }

      this.checkLogin();
    } catch (err) {
      wx.showToast({ title: err.message || '登录失败', icon: 'none' });
    } finally {
      this.setData({ loading: false });
    }
  },

  logout() {
    wx.showModal({
      title: '提示',
      content: '确定退出登录？',
      success: (res) => {
        if (res.confirm) {
          getApp().logout();
          this.setData({
            isLoggedIn: false, userName: 'U', userEmail: '',
            avatarUrl: '', tempAvatar: '', tempNickname: '',
          });
        }
      },
    });
  },

  onShareAppMessage() {
    return {
      title: 'Think Different — AI 发展之路',
      path: '/pages/hub/hub',
    };
  },
});
