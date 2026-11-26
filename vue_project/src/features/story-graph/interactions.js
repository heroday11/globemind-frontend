import { L3_RUN_ID } from './config.js'

const SOURCED_INTERACTIONS = [
  {
    id: 'lebanon-strikes-ceasefire-risk',
    sourceId: 'fast_l2_v1_47090fc6cacc9d15',
    targetId: 'fast_l2_v1_584be832d1a81e8d',
    title: '威胁停火',
    turningPoint: true,
    summary: '联合国秘书长发言人表示，以色列在黎巴嫩的持续军事行动给美伊停火带来严重风险。',
    evidence: {
      title: 'Israeli strikes on Lebanon pose grave risk to Iran-US ceasefire — UN',
      url: 'https://tass.com/world/2114199',
    },
  },
  {
    id: 'iran-war-oil-price',
    sourceId: 'fast_l2_v1_e6bf1ae0af11b539',
    targetId: 'fast_l2_v1_8c75b318097e48f4',
    title: '供应受阻推升油价',
    turningPoint: true,
    summary: '《耶路撒冷邮报》将油价大涨归因于霍尔木兹海峡关闭造成的石油运输和供应中断。',
    evidence: {
      title: 'Oil surges past $100 amid Iran conflict as G7 weighs emergency reserve release',
      url: 'https://www.jpost.com/crypto-currency/article-889464',
    },
  },
  {
    id: 'iran-war-nato-withdrawal',
    sourceId: 'fast_l2_v1_e6bf1ae0af11b539',
    targetId: 'fast_l2_v1_ce5a3e97cc9349fe',
    title: '引发退约表态',
    turningPoint: true,
    summary: '据 CBS 报道，特朗普以北约盟友未参与对伊战争为由，表示考虑让美国退出北约。',
    evidence: {
      title: 'Trump says he may try to pull U.S. out of NATO since allies “weren’t there for us” in Iran war',
      url: 'https://www.cbsnews.com/news/trump-nato-could-try-to-pull-us-out/',
    },
  },
  {
    id: 'iran-ceasefire-follow-up-talks',
    sourceId: 'fast_l2_v1_584be832d1a81e8d',
    targetId: 'fast_l2_v1_d901bb4b33d22b9a',
    title: '停火后派团谈判',
    turningPoint: true,
    summary: '美伊宣布临时停火后，白宫宣布派谈判团队赴巴基斯坦，就停火协议继续磋商。',
    evidence: {
      title: 'US dispatching negotiating team for Iran talks, Tehran signals willingness to hand over uranium',
      url: 'https://www.jpost.com/international/article-892388',
    },
  },
  {
    id: 'pakistan-mediates-iran-talks',
    sourceId: 'fast_l2_v1_7ba7610634ee2706',
    targetId: 'fast_l2_v1_d901bb4b33d22b9a',
    title: '斡旋接续谈判',
    turningPoint: true,
    summary: '巴基斯坦先参与美伊间接接触并表示愿意主持谈判。停火宣布后，白宫确认将派谈判团赴巴基斯坦。',
    evidence: {
      title: 'Pakistan says US-Iran backchannel talks continue despite Tehran rejecting 15-point plan',
      url: 'https://www.jpost.com/middle-east/article-891422',
    },
  },
  {
    id: 'iran-war-saudi-oil-reroute',
    sourceId: 'fast_l2_v1_e6bf1ae0af11b539',
    targetId: 'fast_l2_v1_3548cf8fbe827dd8',
    title: '石油运输改道',
    turningPoint: true,
    summary: '霍尔木兹海峡运输受阻后，沙特利用绕开海峡的输油管道维持石油出口。',
    evidence: {
      title: 'Saudi pipeline that bypasses Strait of Hormuz hits 7 million barrel capacity',
      url: 'https://www.straitstimes.com/world/middle-east/saudi-pipeline-that-bypasses-strait-of-hormuz-hits-7-million-barrel-capacity',
    },
  },
  {
    id: 'iran-war-uk-fuel-policy',
    sourceId: 'fast_l2_v1_e6bf1ae0af11b539',
    targetId: 'fast_l2_v1_538c5c694616b4fb',
    title: '燃油涨价牵动制裁',
    turningPoint: true,
    summary: '报道将英国放宽部分俄罗斯石油产品的进口限制，置于伊朗战争推升燃油价格的背景下。',
    evidence: {
      title: 'Ukraine ally Britain eases new sanctions on Russian oil as fuel prices surge over Iran war',
      url: 'https://www.asiaone.com/world/ukraine-ally-britain-eases-new-sanctions-russian-oil-fuel-prices-surge-over-iran-war',
    },
  },
  {
    id: 'iran-strikes-called-off',
    sourceId: 'fast_l2_v1_6fccf582eab6c6b0',
    targetId: 'fast_l2_v1_0448de44cae972ce',
    title: '撤回打击计划',
    turningPoint: true,
    summary: '报道指出，特朗普以结束战争的谈判取得突破为由，取消了原计划对伊朗发动的打击。',
    evidence: {
      title: 'Trump calls off latest threats to strike Iran, citing a breakthrough in talks to end the war',
      url: 'https://www.asiaone.com/world/trump-calls-latest-threats-strike-iran-citing-breakthrough-talks-end-war-0',
    },
  },
  {
    id: 'iran-talks-ringgit',
    sourceId: 'fast_l2_v1_d901bb4b33d22b9a',
    targetId: 'fast_l2_v1_efdf2135b880ec2e',
    title: '谈判预期提振林吉特',
    turningPoint: true,
    summary: '马来西亚媒体报道，美伊谈判前景引发市场乐观情绪，林吉特小幅走强。',
    evidence: {
      title: 'Ringgit ticks up on optimism over US-Iran talks',
      url: 'https://www.freemalaysiatoday.com/category/business/2026/04/16/ringgit-ticks-up-on-optimism-over-us-iran-talks',
    },
  },
  {
    id: 'netanyahu-meeting-iran-talks',
    sourceId: 'fast_l2_v1_6283a612325615ae',
    targetId: 'fast_l2_v1_e79a0a4cf0ed158d',
    title: '会谈确认继续谈判',
    turningPoint: true,
    summary: '埃菲社报道，特朗普在白宫会见内塔尼亚胡时表示，仍倾向通过谈判限制伊朗的核计划。',
    evidence: {
      title: 'Trump se reúne con Netanyahu y le dice que prefiere una solución negociada con Irán',
      url: 'https://efe.com/mundo/2026-02-11/trump-netanyahu-reunion-washington-israel-gaza-iran/',
    },
  },
]

export function getStoryInteractions(runId, nodes) {
  if (runId !== L3_RUN_ID) return []
  const nodeIds = new Set(nodes.map((node) => node.id))
  const interactions = SOURCED_INTERACTIONS.filter((interaction) =>
    nodeIds.has(interaction.sourceId) && nodeIds.has(interaction.targetId),
  )
  const outgoing = new Map()
  const incoming = new Map()
  for (const { sourceId, targetId } of interactions) {
    if (!outgoing.has(sourceId)) outgoing.set(sourceId, new Set())
    if (!incoming.has(targetId)) incoming.set(targetId, new Set())
    outgoing.get(sourceId).add(targetId)
    incoming.get(targetId).add(sourceId)
  }
  return interactions.map((interaction) => ({
    ...interaction,
    kind: 'interaction',
    converges: incoming.get(interaction.targetId).size > 1,
    diverges: outgoing.get(interaction.sourceId).size > 1,
  }))
}
