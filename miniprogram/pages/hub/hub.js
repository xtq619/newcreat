Page({
  data: {
    timeline: [
      {
        year: '1950',
        emoji: '🧠',
        img: 'https://xtq619.xyz/turing.jpg',
        title: '图灵测试',
        desc: '艾伦·图灵发表《计算机器与智能》，提出了著名的"图灵测试"——如果机器能骗过人类，让人类无法分辨它是人还是机器，那就可以认为机器具有智能。这一问题至今仍在被讨论。'
      },
      {
        year: '1956',
        emoji: '🎓',
        img: 'https://xtq619.xyz/dartmouth.webp',
        title: '人工智能诞生',
        desc: '达特茅斯会议上，约翰·麦卡锡首次提出"人工智能"（Artificial Intelligence）这一术语。一群年轻的科学家聚在一起，大胆预言：人类可以在一代人的时间内创造出具有人类智能的机器。'
      },
      {
        year: '1997',
        emoji: '♟️',
        img: 'https://xtq619.xyz/deepblue.jpg',
        title: '深蓝击败卡斯帕罗夫',
        desc: 'IBM 的深蓝超级计算机在国际象棋比赛中击败世界冠军加里·卡斯帕罗夫。这是计算机首次在正式比赛中战胜人类顶尖棋手，引发了"机器是否会超越人类"的广泛讨论。'
      },
      {
        year: '2012',
        emoji: '🔥',
        img: 'https://xtq619.xyz/alexnet.webp',
        title: '深度学习崛起',
        desc: '杰弗里·辛顿的学生 Alex Krizhevsky 用深度卷积神经网络 AlexNet 在 ImageNet 图像识别比赛中以碾压优势获胜，错误率从 26% 降到 16%。深度学习时代正式开启。'
      },
      {
        year: '2016',
        emoji: '🎮',
        img: 'https://xtq619.xyz/alphago.jpg',
        title: 'AlphaGo 战胜李世石',
        desc: 'DeepMind 的 AlphaGo 以 4:1 击败围棋世界冠军李世石。围棋的变化数超过宇宙中原子的数量，一直被认为是人类智慧的最后堡垒。这场胜利让全世界真正意识到了 AI 的潜力。'
      },
      {
        year: '2017',
        emoji: '📄',
        img: 'https://xtq619.xyz/transformer.jpg',
        title: 'Transformer 架构',
        desc: 'Google 团队发表论文《Attention Is All You Need》，提出了 Transformer 架构。这种全新的神经网络结构彻底改变了自然语言处理领域，成为了后来 GPT、BERT 等所有大语言模型的基石。'
      },
      {
        year: '2022',
        emoji: '💬',
        img: 'https://xtq619.xyz/chatgpt.jpeg',
        title: 'ChatGPT 时刻',
        desc: 'OpenAI 发布 ChatGPT，两个月内用户突破一亿。AI 第一次真正走进普通人的日常生活——写文章、改代码、翻译、聊天。这一年，每个人都开始思考：AI 会如何改变我的工作和生活？'
      },
      {
        year: '2024',
        emoji: '🎬',
        img: 'https://xtq619.xyz/multimodal.png',
        title: '多模态 AI 爆发',
        desc: 'GPT-4o 能听能看能说，Claude 3 在推理能力上突飞猛进，Sora 能生成逼真的视频。AI 不再只是"能聊天的文字机器"，而是开始像人类一样理解文字、图像、声音和视频。'
      },
      {
        year: '2025',
        emoji: '🌍',
        img: 'https://xtq619.xyz/deepseek.webp',
        title: '推理模型崛起',
        desc: 'OpenAI o1、DeepSeek R1……AI 不再只是快速回答，而是学会了"想一想再回答"。推理能力的突破让 AI 在数学、编程、逻辑分析上达到了新的高度，也让我们重新定义了"智能"的含义。'
      },
      {
        year: '2026',
        emoji: '🤖',
        img: 'https://xtq619.xyz/agent.jpg',
        title: 'AI Agent 时代',
        desc: 'AI 不再只是一个对话框，而是学会了使用工具、操作电脑、管理日程、编写和运行代码。从 Copilot 到 OpenClaw，AI 正在从"助手"进化成"代理"——一个能替你完成任务的数字伙伴。'
      }
    ],
    thoughts: {
      product: '这个产品还有很多的可能性。我们相信，技术最好的样子不是炫技，而是让你忘记技术的存在。就像你不会去想手机里有多少个晶体管，你只想给在乎的人发一条消息。我们想做的，就是这样一个入口——让不同的 AI 在这里对话、碰撞、融合，而你只需要提出你真正关心的问题。Think Different，不只是口号，是我们对产品最朴素的期待。'
    }
  },

  onLoad() {
    this.loadHubContent();
  },

  onPullDownRefresh() {
    this.loadHubContent();
  },

  loadHubContent() {
    wx.request({
      url: `${getApp().globalData.baseUrl}/public/hub/content`,
      success: (res) => {
        if (res.statusCode === 200 && res.data) {
          const data = res.data;
          if (data.product_thoughts && data.product_thoughts.content) {
            this.setData({ 'thoughts.product': data.product_thoughts.content });
          }
        }
      },
      complete: () => {
        wx.stopPullDownRefresh();
      },
    });
  },

  onShareAppMessage() {
    return {
      title: 'Think Different — AI 发展之路',
      path: '/pages/hub/hub',
    };
  }
});
