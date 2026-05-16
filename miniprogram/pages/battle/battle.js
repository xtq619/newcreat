const api = require('../../utils/api');
const auth = require('../../utils/auth');

Page({
  data: {
    models: [],
    topic: '',
    modelA: '',
    modelB: '',
    judgeModel: '',
    rounds: 2,
    running: false,
    turns: [],
    judgeSummary: '',
    done: false,
    history: [],
    showHistory: false,
  },

  onLoad() {
    this.loadModels();
    this.loadHistory();
  },

  onUnload() {
    if (this.socket) {
      this.socket.close();
    }
  },

  async loadModels() {
    try {
      const data = await api.listModels();
      const models = Array.isArray(data) ? data : (data.items || []);
      this.setData({ models });
      this.assignModels();
    } catch (err) {
      // 静默处理
    }
  },

  assignModels() {
    const { models } = this.data;
    if (models.length < 2) return;
    // 随机打乱分配
    const shuffled = [...models].sort(() => Math.random() - 0.5);
    const mimoModel = models.find(m => (m.display_name || '').toLowerCase().includes('mimo'));
    this.setData({
      modelA: shuffled[0]?.id || '',
      modelB: shuffled[1]?.id || '',
      judgeModel: mimoModel?.id || shuffled[2]?.id || shuffled[0]?.id || '',
    });
  },

  async loadHistory() {
    try {
      const data = await api.getBattleHistory(10, 0);
      this.setData({ history: data.items || [] });
    } catch (err) {
      // ignore
    }
  },

  onTopicInput(e) {
    this.setData({ topic: e.detail.value });
  },

  toggleHistory() {
    this.setData({ showHistory: !this.data.showHistory });
  },

  async viewHistoryDetail(e) {
    const id = e.currentTarget.dataset.id;
    try {
      const detail = await api.getBattleDetail(id);
      this.setData({
        showHistory: false,
        turns: (detail.turns || []).map((t, i) => ({
          model: t.model,
          round: t.round || Math.floor(i / 2) + 1,
          content: t.content,
        })),
        judgeSummary: detail.judge_summary || '',
        done: true,
      });
    } catch (err) {
      wx.showToast({ title: '加载失败', icon: 'none' });
    }
  },

  startBattle() {
    if (!auth.isLoggedIn()) {
      wx.showToast({ title: '请先登录哦~', icon: 'none' });
      return;
    }

    const { topic, modelA, modelB, judgeModel, rounds } = this.data;
    if (!topic.trim()) {
      wx.showToast({ title: '请输入讨论主题', icon: 'none' });
      return;
    }

    // 每次开始时重新随机分配模型
    this.assignModels();

    this.setData({
      running: true,
      turns: [],
      judgeSummary: '',
      done: false,
    });

    const token = wx.getStorageSync('token');
    const socket = wx.connectSocket({
      url: `wss://api.xtq619.xyz/api/v1/battle/ws?token=${token}`,
    });

    this.socket = socket;

    socket.onOpen(() => {
      socket.send({
        data: JSON.stringify({
          topic,
          model_a_id: this.data.modelA,
          model_b_id: this.data.modelB,
          judge_model_id: this.data.judgeModel,
          rounds,
        }),
      });
    });

    socket.onMessage((res) => {
      try {
        const event = JSON.parse(res.data);
        if (event.type === 'turn') {
          const turns = [...this.data.turns, event];
          this.setData({ turns });
        } else if (event.type === 'judge') {
          this.setData({ judgeSummary: event.content });
        } else if (event.type === 'done') {
          this.setData({ done: true, running: false });
          this.loadHistory();
        } else if (event.type === 'error') {
          wx.showToast({ title: event.detail || '讨论出错', icon: 'none' });
          this.setData({ running: false });
        }
      } catch (e) {
        // ignore parse errors
      }
    });

    socket.onError(() => {
      wx.showToast({ title: '连接出错', icon: 'none' });
      this.setData({ running: false });
    });

    socket.onClose(() => {
      this.setData({ running: false });
    });
  },

  onShareAppMessage() {
    const { topic } = this.data;
    return {
      title: topic ? `话题讨论 — ${topic}` : '话题讨论',
      path: '/pages/battle/battle',
    };
  },
});
