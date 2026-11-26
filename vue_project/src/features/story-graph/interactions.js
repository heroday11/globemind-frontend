const IRAN_MACRO = 'fast_l3_v1_046b120031562a86'

const IRAN_INTERACTIONS = [
  {
    id: 'lebanon-strikes-ceasefire-risk',
    sourceId: 'fast_l2_v1_47090fc6cacc9d15',
    targetId: 'fast_l2_v1_584be832d1a81e8d',
    title: '威胁停火',
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
    summary: '据 CBS 报道，特朗普以北约盟友未参与对伊战争为由，表示考虑让美国退出北约。',
    evidence: {
      title: 'Trump says he may try to pull U.S. out of NATO since allies “weren’t there for us” in Iran war',
      url: 'https://www.cbsnews.com/news/trump-nato-could-try-to-pull-us-out/',
    },
  },
]

export function getStoryInteractions(runId, storyId, nodes) {
  if (runId !== 'fast_l3_v1' || storyId !== IRAN_MACRO) return []
  const nodeIds = new Set(nodes.map((node) => node.id))
  return IRAN_INTERACTIONS.filter((interaction) =>
    nodeIds.has(interaction.sourceId) && nodeIds.has(interaction.targetId),
  ).map((interaction) => ({ ...interaction, kind: 'interaction' }))
}
