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
    // 留言相关
    feedbackContent: '',
    feedbackItems: [],
    feedbackLoading: true,
    feedbackSubmitting: false,
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
      this.loadFeedback();
    } else {
      this.setData({ feedbackLoading: false, feedbackItems: [] });
    }
  },

  // ====== 留言 ======
  async loadFeedback() {
    this.setData({ feedbackLoading: true });
    try {
      const data = await api.listMyFeedback();
      this.setData({ feedbackItems: data.items || [] });
    } catch (err) {
      // 静默失败
    } finally {
      this.setData({ feedbackLoading: false });
    }
  },

  onFeedbackInput(e) {
    this.setData({ feedbackContent: e.detail.value });
  },

  async submitFeedback() {
    const { feedbackContent } = this.data;
    if (!feedbackContent.trim()) {
      wx.showToast({ title: '请输入内容', icon: 'none' });
      return;
    }
    this.setData({ feedbackSubmitting: true });
    try {
      await api.createFeedback({ content: feedbackContent.trim() });
      wx.showToast({ title: '已发送', icon: 'success' });
      this.setData({ feedbackContent: '' });
      this.loadFeedback();
    } catch (err) {
      wx.showToast({ title: err.message || '发送失败', icon: 'none' });
    } finally {
      this.setData({ feedbackSubmitting: false });
    }
  },

  async deleteFeedback(e) {
    const id = e.currentTarget.dataset.id;
    wx.showModal({
      title: '确认删除',
      content: '确定删除这条留言？',
      success: async (res) => {
        if (res.confirm) {
          try {
            await api.deleteFeedback(id);
            wx.showToast({ title: '已删除', icon: 'success' });
            this.loadFeedback();
          } catch (err) {
            wx.showToast({ title: err.message || '删除失败', icon: 'none' });
          }
        }
      },
    });
  },

  // ====== 登录 ======
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
            feedbackContent: '', feedbackItems: [],
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
