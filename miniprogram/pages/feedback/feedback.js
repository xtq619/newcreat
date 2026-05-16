const api = require('../../utils/api');
const auth = require('../../utils/auth');

Page({
  data: {
    items: [],
    content: '',
    loading: true,
    submitting: false,
    isLoggedIn: false,
  },

  onShow() {
    const isLoggedIn = auth.isLoggedIn();
    this.setData({ isLoggedIn });
    if (isLoggedIn) {
      this.loadFeedback();
    } else {
      this.setData({ loading: false, items: [] });
    }
  },

  async loadFeedback() {
    this.setData({ loading: true });
    try {
      const data = await api.listMyFeedback();
      this.setData({ items: data.items || [] });
    } catch (err) {
      wx.showToast({ title: '加载失败', icon: 'none' });
    } finally {
      this.setData({ loading: false });
    }
  },

  onInput(e) {
    this.setData({ content: e.detail.value });
  },

  async submit() {
    if (!auth.isLoggedIn()) {
      wx.showToast({ title: '请先登录哦~', icon: 'none' });
      return;
    }

    const { content } = this.data;
    if (!content.trim()) {
      wx.showToast({ title: '请输入内容', icon: 'none' });
      return;
    }
    this.setData({ submitting: true });
    try {
      await api.createFeedback({ content });
      wx.showToast({ title: '提交成功', icon: 'success' });
      this.setData({ content: '' });
      this.loadFeedback();
    } catch (err) {
      wx.showToast({ title: err.message || '提交失败', icon: 'none' });
    } finally {
      this.setData({ submitting: false });
    }
  },

  async deleteItem(e) {
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

  onShareAppMessage() {
    return {
      title: '建议留言 — 写下你的想法',
      path: '/pages/feedback/feedback',
    };
  },
});
