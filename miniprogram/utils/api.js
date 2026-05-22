const app = getApp();

function request(path, options = {}) {
  return new Promise((resolve, reject) => {
    const token = wx.getStorageSync('token');
    wx.request({
      url: `${app.globalData.baseUrl}${path}`,
      method: options.method || 'GET',
      data: options.data,
      timeout: options.timeout || 15000,
      header: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.header || {}),
      },
      success(res) {
        if (res.statusCode === 401) {
          app.logout();
          reject(new Error('请先登录'));
          return;
        }
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(res.data);
        } else {
          const msg = (res.data && res.data.detail) || `请求失败 (${res.statusCode})`;
          reject(new Error(typeof msg === 'string' ? msg : JSON.stringify(msg)));
        }
      },
      fail(err) {
        reject(new Error(err.errMsg || '网络请求失败'));
      },
    });
  });
}

module.exports = {
  // Auth
  register: (data) => request('/auth/register', { method: 'POST', data }),
  login: (data) => request('/auth/login', { method: 'POST', data }),
  wxLogin: (code, nickname, avatarUrl) => request('/auth/wxlogin', { method: 'POST', data: { code, nickname: nickname || '', avatar_url: avatarUrl || '' } }),
  wxBind: (data) => request('/auth/wxbind', { method: 'POST', data }),
  getMe: () => request('/auth/me'),

  // Keys
  listKeys: () => request('/keys'),
  createKey: (data) => request('/keys', { method: 'POST', data }),
  deleteKey: (id) => request(`/keys/${id}`, { method: 'DELETE' }),
  toggleKey: (id) => request(`/keys/${id}/toggle`, { method: 'PATCH' }),
  testKey: (id, message) => request(`/keys/${id}/test`, { method: 'POST', data: { message: message || 'Hi' } }),
  updateKeyModels: (id, model_ids) => request(`/keys/${id}/models`, { method: 'PUT', data: { model_ids } }),

  // Models
  listModels: () => request('/models'),

  // Usage
  getUsageLogs: (days = 7, limit = 50, offset = 0) => request(`/usage/logs?days=${days}&limit=${limit}&offset=${offset}`),
  getUsageStats: (days = 7) => request(`/usage/stats?days=${days}`),
  getUsageSummary: (days = 1) => request(`/usage/summary?days=${days}`),

  // Billing
  getBalance: () => request('/billing/balance'),
  recharge: (amount) => request('/billing/recharge', { method: 'POST', data: { amount, payment_method: 'manual' } }),
  getTransactions: (limit = 50, offset = 0) => request(`/billing/transactions?limit=${limit}&offset=${offset}`),

  // Feedback
  createFeedback: (data) => request('/feedback', { method: 'POST', data }),
  listMyFeedback: (limit = 20, offset = 0) => request(`/feedback?limit=${limit}&offset=${offset}`),
  deleteFeedback: (id) => request(`/feedback/${id}`, { method: 'DELETE' }),
  listPublicFeedback: (limit = 20, offset = 0) => request(`/public/feedback?limit=${limit}&offset=${offset}`),

  // News (public)
  listNews: (limit = 20, offset = 0, category) => {
    let url = `/public/news?limit=${limit}&offset=${offset}`;
    if (category) url += `&category=${encodeURIComponent(category)}`;
    return request(url);
  },

  // Digest (user)
  getMyDigestPref: () => request('/digest'),
  updateMyDigestPref: (data) => request('/digest', { method: 'PATCH', data }),

  // World Cup
  getWorldCupMatches: () => request('/public/worldcup/matches'),
  getWorldCupTeams: () => request('/public/worldcup/teams'),
  getWorldCupPrediction: (matchId) => request(`/public/worldcup/matches/${matchId}/prediction`),
  submitGuess: (matchId, data) => request(`/worldcup/guess/${matchId}`, { method: 'POST', data }),
  getMyGuesses: () => request('/worldcup/guesses'),
  submitEmotion: (matchId, data) => request(`/worldcup/emotion/${matchId}`, { method: 'POST', data }),
  getEmotions: (matchId) => request(`/worldcup/emotion/${matchId}`),
  analyzeWorldCupMatch: (teamA, teamB) => request('/worldcup/analysis', { method: 'POST', data: { team_a: teamA, team_b: teamB }, timeout: 180000 }),

  // Admin
  adminUsers: () => request('/admin/users'),
  adminDeleteUser: (id) => request(`/admin/users/${id}`, { method: 'DELETE' }),
  adminStats: () => request('/admin/stats'),
  adminAddModel: (data) => request('/admin/models', { method: 'POST', data }),
  adminToggleModel: (id) => request(`/admin/models/${id}/toggle`, { method: 'PATCH' }),
  adminDeleteModel: (id) => request(`/admin/models/${id}`, { method: 'DELETE' }),
  adminGetModel: (id) => request(`/admin/models/${id}`),
  adminUpdateModel: (id, data) => request(`/admin/models/${id}`, { method: 'PATCH', data }),
  adminListNews: (limit = 20, offset = 0) => request(`/admin/news?limit=${limit}&offset=${offset}`),
  adminCreateNews: (data) => request('/admin/news', { method: 'POST', data }),
  adminUpdateNews: (id, data) => request(`/admin/news/${id}`, { method: 'PATCH', data }),
  adminDeleteNews: (id) => request(`/admin/news/${id}`, { method: 'DELETE' }),
  autoFetchNews: () => request('/admin/news/auto-fetch', { method: 'POST' }),
  listRssSources: () => request('/admin/news/auto-fetch/sources'),
  getNewsSettings: () => request('/admin/news/settings'),
  updateNewsSettings: (data) => request('/admin/news/settings', { method: 'PATCH', data }),
  adminListFeedback: (limit = 50, offset = 0) => request(`/admin/feedback?limit=${limit}&offset=${offset}`),
  adminReplyFeedback: (id, reply) => request(`/admin/feedback/${id}/reply`, { method: 'PATCH', data: { reply } }),
  getSmtpSettings: () => request('/admin/digest'),
  updateSmtpSettings: (data) => request('/admin/digest', { method: 'PATCH', data }),
  sendTestEmail: (email) => request(`/admin/digest/test?recipient_email=${encodeURIComponent(email)}`, { method: 'POST' }),
};
