const localData = require('./matches');
const localTeams = require('./teams');

// Mutable references — swapped to API data on successful fetch
let groupMatches = localData.groupMatches;
let knockoutMatches = localData.knockoutMatches;
let allMatches = localData.allMatches;
let stageLabels = localData.stageLabels;
let groups = localData.groups;
let teamDetails = localTeams.teamDetails;

const api = require('../../utils/api');

Page({
  data: {
    activeTab: 'group',
    daysLeft: 0,
    // 小组赛日期选择
    groupDateList: [],
    activeDate: '',
    activeDateMatches: [],
    // 淘汰赛对阵图
    bracketRounds: [],
    // 我的预测
    guessDateGroups: [],
    guessStats: { total: 0, correct: 0, rate: 0 },
    myGuesses: {},
    // AI分析
    analyzableMatches: [],
    analysisDateList: [],
    activeAnalysisDate: '',
    analysisDateMatches: [],
    // 球队详情
    showTeamDetail: false,
    teamDetail: null,
  },

  async onLoad() {
    this.calcCountdown();
    await this.fetchWorldCupData();
    this.initGroupDates();
    this.loadUserData();
  },

  async fetchWorldCupData() {
    try {
      const [matchRes, teamRes] = await Promise.all([
        api.getWorldCupMatches(),
        api.getWorldCupTeams(),
      ]);
      if (matchRes && matchRes.matches && matchRes.matches.length > 0) {
        const matches = matchRes.matches;
        groupMatches = matches.filter(m => m.stage === 'group');
        knockoutMatches = matches.filter(m => m.stage !== 'group');
        allMatches = matches;
        // Rebuild groups from team data
        if (teamRes && teamRes.teams) {
          const g = {};
          teamRes.teams.forEach(t => {
            const letter = t.group;
            if (!g[letter]) g[letter] = [];
            g[letter].push({ code: t.code, name: t.name, flag: t.flag });
          });
          if (Object.keys(g).length > 0) groups = g;
        }
        console.log(`Fetched ${matches.length} matches from API`);
      }
      if (teamRes && teamRes.teams && teamRes.teams.length > 0) {
        const td = {};
        teamRes.teams.forEach(t => {
          td[t.code] = {
            fifaRank: t.fifaRank,
            appearances: t.appearances,
            best: t.best,
            coach: t.coach,
            keyPlayer: t.keyPlayer,
            squadConfirmed: t.squadConfirmed,
            squad: t.squad || [],
          };
        });
        if (Object.keys(td).length > 0) teamDetails = td;
        console.log(`Fetched ${Object.keys(td).length} teams from API`);
      }
    } catch (e) {
      console.log('Worldcup API fetch failed, using local data:', e.message || e);
    }
  },

  calcCountdown() {
    const openDate = new Date('2026-06-11T00:00:00');
    const now = new Date();
    const diff = openDate - now;
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    this.setData({ daysLeft: days });
  },

  // ===== 小组赛 —— 日期选择器 =====
  initGroupDates() {
    const dates = [...new Set(groupMatches.map(m => m.date))].sort();
    const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
    const dateList = dates.map(d => {
      const obj = new Date(d);
      return {
        date: d,
        month: obj.getMonth() + 1,
        day: obj.getDate(),
        weekday: weekdays[obj.getDay()],
      };
    });
    this.setData({
      groupDateList: dateList,
      activeDate: dateList[0]?.date || '',
    });
    this.buildDateMatches();
    this.buildBracket();
  },

  buildDateMatches() {
    const { activeDate, myGuesses } = this.data;
    const matches = groupMatches
      .filter(m => m.date === activeDate)
      .map(m => {
        const guess = myGuesses[m.id];
        let _guessResult = null;
        if (m.status === 'finished' && guess) {
          _guessResult = {
            correct: guess.a === m.scoreA && guess.b === m.scoreB,
          };
        }
        return {
          ...m,
          _guessA: guess ? String(guess.a) : '',
          _guessB: guess ? String(guess.b) : '',
          _guessed: !!guess,
          _guessResult,
        };
      });
    this.setData({ activeDateMatches: matches });
  },

  selectDate(e) {
    const date = e.currentTarget.dataset.date;
    this.setData({ activeDate: date }, () => this.buildDateMatches());
  },

  // ===== 淘汰赛对阵图 =====
  buildBracket() {
    const bracketRounds = [
      { key: 'round32', label: '32 强', dates: '6.30 - 7.05', matchCount: 16 },
      { key: 'round16', label: '16 强', dates: '7.05 - 7.08', matchCount: 8 },
      { key: 'quarter', label: '1/4 决赛', dates: '7.10 - 7.11', matchCount: 4 },
      { key: 'semi', label: '半决赛', dates: '7.15 - 7.16', matchCount: 2 },
      { key: 'third', label: '三四名', dates: '7.19', matchCount: 1 },
      { key: 'final', label: '决赛', dates: '7.20', matchCount: 1 },
    ];
    const rounds = bracketRounds.map(r => {
      const matches = knockoutMatches
        .filter(m => m.stage === r.key)
        .map(m => {
          const d = new Date(m.date);
          return { ...m, dateLabel: `${d.getMonth() + 1}月${d.getDate()}日` };
        });
      return { ...r, matches };
    });
    this.setData({ bracketRounds: rounds });
  },

  // ===== 切换 Tab =====
  switchTab(e) {
    const tab = e.currentTarget.dataset.tab;
    this.setData({ activeTab: tab });
    if (tab === 'group') this.buildDateMatches();
    if (tab === 'knockout') this.buildBracket();
    if (tab === 'guess') this.prepareGuessList();
    if (tab === 'analysis') {
      this.initAnalysisDates();
      this.loadCachedAnalyses();
    }
  },

  // ===== 小组赛内快速预测 =====
  onQuickGuessInput(e) {
    const id = e.currentTarget.dataset.id;
    const side = e.currentTarget.dataset.side;
    const val = e.detail.value;
    const key = side === 'A' ? '_guessA' : '_guessB';
    const idx = this.data.activeDateMatches.findIndex(m => m.id === id);
    if (idx >= 0) {
      this.setData({ [`activeDateMatches[${idx}].${key}`]: val });
    }
  },

  // ===== 我的预测列表 =====
  prepareGuessList() {
    const { myGuesses } = this.data;
    const guessedIds = Object.keys(myGuesses);
    if (guessedIds.length === 0) {
      this.setData({ guessDateGroups: [] });
      return;
    }

    const matches = groupMatches
      .filter(m => myGuesses[m.id])
      .map(m => {
        const guess = myGuesses[m.id];
        let guessResult = null;
        if (m.status === 'finished' && guess) {
          guessResult = {
            correct: guess.a === m.scoreA && guess.b === m.scoreB,
          };
        }
        return {
          ...m,
          stageLabel: stageLabels[m.stage],
          myGuessA: String(guess.a),
          myGuessB: String(guess.b),
          guessResult,
        };
      });

    const dateMap = {};
    matches.forEach(m => {
      if (!dateMap[m.date]) dateMap[m.date] = [];
      dateMap[m.date].push(m);
    });
    const dateGroups = Object.keys(dateMap).sort().map(date => ({
      date,
      label: this._formatDateLabel(date),
      matches: dateMap[date],
    }));
    this.setData({ guessDateGroups: dateGroups });
  },

  // ===== 预测提交 =====
  submitGuess(e) {
    const id = e.currentTarget.dataset.id;
    let match;
    // Try activeDateMatches first (小组赛 Tab), then guessDateGroups (我的预测 Tab)
    const activeIdx = this.data.activeDateMatches.findIndex(m => m.id === id);
    if (activeIdx >= 0) {
      match = this.data.activeDateMatches[activeIdx];
      const a = parseInt(match._guessA);
      const b = parseInt(match._guessB);
      if (isNaN(a) || isNaN(b)) {
        wx.showToast({ title: '请输入比分', icon: 'none' });
        return;
      }
      const guesses = { ...this.data.myGuesses, [id]: { a, b } };
      this.setData({ myGuesses: guesses });
      wx.setStorageSync('wc_guesses', guesses);
      this.calcGuessStats(guesses);
      this.buildDateMatches(); // refresh inline view
      wx.showToast({ title: '预测已保存', icon: 'success' });
      api.submitGuess(id, { score_a: a, score_b: b }).catch(() => {});
      return;
    }

    // Fallback: my predictions tab
    const guessIdx = this.data.guessDateGroups.findIndex(g => g.matches.some(m => m.id === id));
    if (guessIdx >= 0) {
      const mIdx = this.data.guessDateGroups[guessIdx].matches.findIndex(m => m.id === id);
      const m = this.data.guessDateGroups[guessIdx].matches[mIdx];
      const a = parseInt(m.myGuessA);
      const b = parseInt(m.myGuessB);
      if (isNaN(a) || isNaN(b)) {
        wx.showToast({ title: '请输入比分', icon: 'none' });
        return;
      }
      const guesses = { ...this.data.myGuesses, [id]: { a, b } };
      this.setData({ myGuesses: guesses });
      wx.setStorageSync('wc_guesses', guesses);
      this.calcGuessStats(guesses);
      this.prepareGuessList();
      wx.showToast({ title: '预测已保存', icon: 'success' });
      api.submitGuess(id, { score_a: a, score_b: b }).catch(() => {});
    }
  },

  onGuessInput(e) {
    const id = e.currentTarget.dataset.id;
    const side = e.currentTarget.dataset.side;
    const val = e.detail.value;
    const key = side === 'A' ? 'myGuessA' : 'myGuessB';
    const idx = this.data.guessDateGroups.findIndex(g => g.matches.some(m => m.id === id));
    if (idx >= 0) {
      const mIdx = this.data.guessDateGroups[idx].matches.findIndex(m => m.id === id);
      if (mIdx >= 0) {
        this.setData({ [`guessDateGroups[${idx}].matches[${mIdx}].${key}`]: val });
      }
    }
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

  // ===== AI分析 =====
  initAnalysisDates() {
    // Build full match list with analysis placeholders
    const allAnalysisMatches = allMatches
      .filter(m => m.teamA.code !== 'TBD' && m.teamB.code !== 'TBD')
      .map(m => ({
        ...m,
        stageLabel: stageLabels[m.stage],
        analysisData: null,
        analysisModel: '',
        showAllAnalysis: false,
        analysisLoading: false,
      }));
    this.setData({ analyzableMatches: allAnalysisMatches });

    // Build date list from these matches
    const dates = [...new Set(allAnalysisMatches.map(m => m.date))].sort();
    const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
    const dateList = dates.map(d => {
      const obj = new Date(d);
      return {
        date: d,
        month: obj.getMonth() + 1,
        day: obj.getDate(),
        weekday: weekdays[obj.getDay()],
      };
    });
    this.setData({
      analysisDateList: dateList,
      activeAnalysisDate: dateList[0]?.date || '',
    });
    this.buildAnalysisDateMatches();
  },

  selectAnalysisDate(e) {
    const date = e.currentTarget.dataset.date;
    this.setData({ activeAnalysisDate: date }, () => this.buildAnalysisDateMatches());
  },

  buildAnalysisDateMatches() {
    const { activeAnalysisDate, analyzableMatches } = this.data;
    const matches = analyzableMatches.filter(m => m.date === activeAnalysisDate);
    this.setData({ analysisDateMatches: matches });
  },

  analyzeMatch(e) {
    const idx = e.currentTarget.dataset.idx;
    const matchId = e.currentTarget.dataset.id;
    const match = this.data.analysisDateMatches[idx];
    if (!match || match.analysisLoading) return;
    this.setData({ [`analysisDateMatches[${idx}].analysisLoading`]: true });
    api.analyzeWorldCupMatch(match.teamA.name, match.teamB.name).then(data => {
      const analysisData = data.analysis && typeof data.analysis === 'object'
        ? data.analysis
        : (typeof data.analysis === 'string' ? { raw_text: data.analysis } : { raw_text: '暂无分析' });
      // Update both analysisDateMatches and analyzableMatches
      this.setData({
        [`analysisDateMatches[${idx}].analysisData`]: analysisData,
        [`analysisDateMatches[${idx}].analysisModel`]: data.model || '',
        [`analysisDateMatches[${idx}].analysisLoading`]: false,
      });
      const fullIdx = this.data.analyzableMatches.findIndex(m => m.id === matchId);
      if (fullIdx >= 0) {
        this.setData({
          [`analyzableMatches[${fullIdx}].analysisData`]: analysisData,
          [`analyzableMatches[${fullIdx}].analysisModel`]: data.model || '',
          [`analyzableMatches[${fullIdx}].analysisLoading`]: false,
        });
      }
      this.cacheAnalysis(match.id, { analysis: analysisData, model: data.model || '' });
    }).catch(err => {
      this.setData({ [`analysisDateMatches[${idx}].analysisLoading`]: false });
      const fullIdx = this.data.analyzableMatches.findIndex(m => m.id === matchId);
      if (fullIdx >= 0) {
        this.setData({ [`analyzableMatches[${fullIdx}].analysisLoading`]: false });
      }
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
    const dateIdx = this.data.analysisDateMatches.findIndex(m => m.id === id);
    if (dateIdx >= 0) {
      const current = this.data.analysisDateMatches[dateIdx].showAllAnalysis || false;
      this.setData({ [`analysisDateMatches[${dateIdx}].showAllAnalysis`]: !current });
    }
  },

  cacheAnalysis(matchId, data) {
    const cache = wx.getStorageSync('wc_analysis_cache') || {};
    cache[matchId] = { analysis: data.analysis, model: data.model, timestamp: Date.now() };
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
    this.buildAnalysisDateMatches();
  },

  // ===== 球队详情 =====
  onTeamTap(e) {
    const code = e.currentTarget.dataset.code;
    if (!code || code === 'TBD') return;
    const detail = teamDetails[code];
    if (!detail) return;
    const team = this._findTeamByCode(code);
    this.setData({
      teamDetail: { ...detail, flag: team.flag, name: team.name, group: team.group || '' },
      showTeamDetail: true,
    });
  },

  closeTeamDetail() {
    this.setData({ showTeamDetail: false });
  },

  _findTeamByCode(code) {
    for (const [letter, teams] of Object.entries(groups)) {
      const found = teams.find(t => t.code === code);
      if (found) return { ...found, group: letter };
    }
    return {};
  },

  // ===== 用户数据 =====
  loadUserData() {
    const guesses = wx.getStorageSync('wc_guesses') || {};
    this.setData({ myGuesses: guesses });
    this.calcGuessStats(guesses);
    this.buildDateMatches();
    this.prepareGuessList();
    api.getMyGuesses().then(data => {
      if (data && data.items) {
        const g = {};
        data.items.forEach(item => {
          g[item.match_id] = { a: item.score_a, b: item.score_b };
        });
        const merged = { ...guesses, ...g };
        this.setData({ myGuesses: merged });
        this.calcGuessStats(merged);
        this.buildDateMatches();
        this.prepareGuessList();
      }
    }).catch(() => {});
  },

  _formatDateLabel(dateStr) {
    const d = new Date(dateStr);
    const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
    return `${d.getMonth() + 1}月${d.getDate()}日 周${weekdays[d.getDay()]}`;
  },

  onShareAppMessage() {
    return { title: '2026 世界杯', path: '/pages/worldcup/worldcup' };
  },
});
