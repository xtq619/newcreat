const { groupMatches, knockoutMatches, allMatches, stageLabels, emotions } = require('./matches');
const api = require('../../utils/api');

Page({
  data: {
    activeTab: 'schedule',
    daysLeft: 0,
    stageFilter: 'all',
    filteredMatches: [],
    guessableMatches: [],
    emotionMatches: [],
    analyzableMatches: [],
    guessStats: { total: 0, correct: 0, rate: 0 },
    emotions: emotions,
    myGuesses: {},
    myEmotions: {},
  },

  onLoad() {
    this.calcCountdown();
    this.prepareMatches();
    this.loadUserData();
  },

  calcCountdown() {
    const openDate = new Date('2026-06-11T00:00:00');
    const now = new Date();
    const diff = openDate - now;
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    this.setData({ daysLeft: days });
  },

  prepareMatches() {
    this.setData({ filteredMatches: this.processMatches('all') });
  },

  processMatches(filter) {
    let matches;
    if (filter === 'group') {
      matches = groupMatches;
    } else if (filter === 'knockout') {
      matches = knockoutMatches;
    } else {
      matches = allMatches;
    }

    return matches.map((m, i) => {
      const showDate = i === 0 || m.date !== matches[i - 1].date;
      const dateObj = new Date(m.date);
      const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
      const dateLabel = `${dateObj.getMonth() + 1}月${dateObj.getDate()}日 周${weekdays[dateObj.getDay()]}`;
      const stageLabel = stageLabels[m.stage] || m.stage;
      return { ...m, showDate, dateLabel, stageLabel };
    });
  },

  switchTab(e) {
    const tab = e.currentTarget.dataset.tab;
    this.setData({ activeTab: tab });
    if (tab === 'guess') this.prepareGuessMatches();
    if (tab === 'emotion') this.prepareEmotionMatches();
    if (tab === 'analysis') {
      this.prepareAnalysisMatches();
      this.loadCachedAnalyses();
    }
  },

  filterStage(e) {
    const stage = e.currentTarget.dataset.stage;
    this.setData({
      stageFilter: stage,
      filteredMatches: this.processMatches(stage),
    });
  },

  // ===== 竞猜 =====
  prepareGuessMatches() {
    const matches = groupMatches.slice(0, 12).map(m => {
      const guess = this.data.myGuesses[m.id];
      let guessResult = null;
      if (m.status === 'finished' && guess) {
        guessResult = {
          correct: guess.a === m.scoreA && guess.b === m.scoreB,
        };
      }
      return {
        ...m,
        stageLabel: stageLabels[m.stage],
        myGuessA: guess ? String(guess.a) : '',
        myGuessB: guess ? String(guess.b) : '',
        guessResult,
      };
    });
    this.setData({ guessableMatches: matches });
  },

  onGuessInput(e) {
    const id = e.currentTarget.dataset.id;
    const side = e.currentTarget.dataset.side;
    const val = e.detail.value;
    const key = side === 'A' ? 'myGuessA' : 'myGuessB';
    const idx = this.data.guessableMatches.findIndex(m => m.id === id);
    if (idx >= 0) {
      this.setData({ [`guessableMatches[${idx}].${key}`]: val });
    }
  },

  submitGuess(e) {
    const id = e.currentTarget.dataset.id;
    const match = this.data.guessableMatches.find(m => m.id === id);
    if (!match) return;

    const a = parseInt(match.myGuessA);
    const b = parseInt(match.myGuessB);
    if (isNaN(a) || isNaN(b)) {
      wx.showToast({ title: '请输入比分', icon: 'none' });
      return;
    }

    const guesses = { ...this.data.myGuesses, [id]: { a, b } };
    this.setData({ myGuesses: guesses });
    wx.setStorageSync('wc_guesses', guesses);
    wx.showToast({ title: '预测已保存', icon: 'success' });

    // 更新统计
    this.calcGuessStats(guesses);

    // 尝试提交到后端
    api.submitGuess(id, { score_a: a, score_b: b }).catch(() => {});
  },

  calcGuessStats(guesses) {
    const keys = Object.keys(guesses);
    let correct = 0;
    keys.forEach(id => {
      const match = allMatches.find(m => m.id == id);
      if (match && match.status === 'finished') {
        const g = guesses[id];
        if (g.a === match.scoreA && g.b === match.scoreB) correct++;
      }
    });
    const total = keys.length;
    this.setData({
      guessStats: {
        total,
        correct,
        rate: total > 0 ? Math.round((correct / total) * 100) : 0,
      },
    });
  },

  // ===== 情绪 =====
  prepareEmotionMatches() {
    const upcoming = allMatches.filter(m => m.status !== 'finished').slice(0, 10);
    const matches = upcoming.map(m => {
      const myEmotion = this.data.myEmotions[m.id];
      // 模拟情绪统计数据
      const emotionStats = emotions.map(emo => ({
        ...emo,
        pct: Math.floor(Math.random() * 40) + 5,
      }));
      // 归一化到 100%
      const sum = emotionStats.reduce((s, e) => s + e.pct, 0);
      emotionStats.forEach(e => { e.pct = Math.round((e.pct / sum) * 100); });
      return { ...m, myEmotion, emotionStats };
    });
    this.setData({ emotionMatches: matches });
  },

  submitEmotion(e) {
    const id = e.currentTarget.dataset.id;
    const emotion = e.currentTarget.dataset.emotion;
    const emotions = { ...this.data.myEmotions, [id]: emotion };
    this.setData({ myEmotions: emotions });
    wx.setStorageSync('wc_emotions', emotions);
    wx.showToast({ title: '已投票', icon: 'success' });

    // 尝试提交到后端
    api.submitEmotion(id, { emotion }).catch(() => {});
  },

  // ===== 分析 =====
  prepareAnalysisMatches() {
    const matches = allMatches.filter(m => m.teamA.code !== 'TBD' && m.teamB.code !== 'TBD').map(m => ({
      ...m,
      stageLabel: stageLabels[m.stage],
      analysisData: null,
      analysisModel: '',
      showAllAnalysis: false,
      analysisLoading: false,
    }));
    this.setData({ analyzableMatches: matches });
  },

  analyzeMatch(e) {
    const idx = e.currentTarget.dataset.idx;
    const match = this.data.analyzableMatches[idx];
    if (!match || match.analysisLoading) return;

    this.setData({ [`analyzableMatches[${idx}].analysisLoading`]: true });

    api.analyzeWorldCupMatch(match.teamA.name, match.teamB.name).then(data => {
      const analysisData = data.analysis && typeof data.analysis === 'object'
        ? data.analysis
        : (typeof data.analysis === 'string' ? { raw_text: data.analysis } : { raw_text: '暂无分析' });

      this.setData({
        [`analyzableMatches[${idx}].analysisData`]: analysisData,
        [`analyzableMatches[${idx}].analysisModel`]: data.model || '',
        [`analyzableMatches[${idx}].analysisLoading`]: false,
      });

      this.cacheAnalysis(match.id, { analysis: analysisData, model: data.model || '' });
    }).catch(err => {
      this.setData({ [`analyzableMatches[${idx}].analysisLoading`]: false });
      wx.showToast({ title: err.message || '分析失败', icon: 'none' });
    });
  },

  toggleAnalysisDetail(e) {
    const id = e.currentTarget.dataset.id;
    const idx = this.data.analyzableMatches.findIndex(m => m.id === id);
    if (idx >= 0) {
      const current = this.data.analyzableMatches[idx].showAllAnalysis || false;
      this.setData({ [`analyzableMatches[${idx}].showAllAnalysis`]: !current });
    }
  },

  cacheAnalysis(matchId, data) {
    const cache = wx.getStorageSync('wc_analysis_cache') || {};
    cache[matchId] = {
      analysis: data.analysis,
      model: data.model,
      timestamp: Date.now(),
    };
    wx.setStorageSync('wc_analysis_cache', cache);
  },

  loadCachedAnalyses() {
    const cache = wx.getStorageSync('wc_analysis_cache') || {};
    const now = Date.now();
    const MAX_AGE = 24 * 60 * 60 * 1000;
    const matches = this.data.analyzableMatches.map(m => {
      const cached = cache[m.id];
      if (cached && (now - cached.timestamp) < MAX_AGE) {
        return { ...m, analysisData: cached.analysis, analysisModel: cached.model };
      }
      return m;
    });
    this.setData({ analyzableMatches: matches });
  },

  // ===== 加载用户数据 =====
  loadUserData() {
    const guesses = wx.getStorageSync('wc_guesses') || {};
    const emotions = wx.getStorageSync('wc_emotions') || {};
    this.setData({ myGuesses: guesses, myEmotions: emotions });
    this.calcGuessStats(guesses);

    // 尝试从后端加载
    api.getMyGuesses().then(data => {
      if (data && data.items) {
        const g = {};
        data.items.forEach(item => {
          g[item.match_id] = { a: item.score_a, b: item.score_b };
        });
        this.setData({ myGuesses: { ...guesses, ...g } });
        this.calcGuessStats(this.data.myGuesses);
      }
    }).catch(() => {});
  },

  onShareAppMessage() {
    return {
      title: '2026 世界杯 — 赛程 · 竞猜 · 情绪',
      path: '/pages/worldcup/worldcup',
    };
  },
});
