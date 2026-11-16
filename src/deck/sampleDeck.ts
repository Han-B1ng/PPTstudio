import type { DeckModel, EvidenceRecord, SlideRecord } from "../types";

const FONT =
  "WenQuanYi Micro Hei, Noto Sans SC, PingFang SC, Microsoft YaHei, sans-serif";

export const PAGE1_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 900" font-family="${FONT}">
  <rect width="1600" height="900" fill="#F6F3EC"/>
  <rect width="18" height="900" fill="#141414"/>
  <text x="72" y="86" fill="#6F6A62" font-size="18" letter-spacing="2.5">XINGHE RETAIL</text>
  <text x="1528" y="86" fill="#141414" font-size="18" text-anchor="end">01 / 03</text>
  <rect x="72" y="128" width="14" height="14" fill="#141414"/>
  <rect x="79" y="135" width="14" height="14" fill="none" stroke="#A68456" stroke-width="1.5"/>
  <text x="72" y="390" fill="#141414" font-size="92" font-weight="700">星河零售</text>
  <text x="76" y="468" fill="#1F4B3A" font-size="40">2026 Q3 业务回顾</text>
  <rect x="76" y="504" width="156" height="3" fill="#A68456"/>
  <text x="76" y="560" fill="#4E4A44" font-size="22">三页短报，只讲增长结构和会后要落地的事</text>
  <rect x="1060" y="188" width="468" height="520" fill="#EFEAE1"/>
  <text x="1104" y="252" fill="#6F6A62" font-size="16" letter-spacing="1.5">本季口径</text>
  <text x="1104" y="340" fill="#141414" font-size="36" font-weight="700">门店 428</text>
  <text x="1104" y="378" fill="#6F6A62" font-size="18">直营与加盟，不含快闪</text>
  <text x="1104" y="470" fill="#141414" font-size="36" font-weight="700">覆盖 36 城</text>
  <text x="1104" y="508" fill="#6F6A62" font-size="18">即时达已开通 19 城</text>
  <text x="1104" y="600" fill="#141414" font-size="36" font-weight="700">会员 1,280 万</text>
  <text x="1104" y="638" fill="#6F6A62" font-size="18">可识别会员，不含匿名客流</text>
  <text x="72" y="820" fill="#6F6A62" font-size="18">内部经营会</text>
  <text x="210" y="820" fill="#C9C2B6" font-size="18">/</text>
  <text x="236" y="820" fill="#6F6A62" font-size="18">2026 年 10 月 18 日</text>
</svg>`;

export const PAGE2_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 900" font-family="${FONT}">
  <rect width="1600" height="900" fill="#F6F3EC"/>
  <rect width="1600" height="8" fill="#1F4B3A"/>
  <!-- title-decoy: 会员与即时达拉动增长 -->
  <text x="72" y="58" fill="#6F6A62" font-size="16" letter-spacing="1.2">02    增长结构</text>
  <text x="1528" y="58" fill="#141414" font-size="16" text-anchor="end">星河零售</text>
  <g data-element="title-hit">
    <rect x="60" y="86" width="1280" height="82" fill="#000" fill-opacity="0"/>
    <text data-element="title" x="72" y="146" fill="#141414" font-size="48" font-weight="700">会员与即时达拉动增长</text>
  </g>
  <text x="72" y="196" fill="#4E4A44" font-size="20">本季 GMV 同比 +18.4%。结构比新开门店更重要。</text>
  <rect x="72" y="230" width="468" height="150" fill="#FFFFFF" stroke="#E4DDD2"/>
  <text x="100" y="292" fill="#1F4B3A" font-size="44" font-weight="700">+18.4%</text>
  <text x="100" y="338" fill="#6F6A62" font-size="18">GMV 同比</text>
  <rect x="564" y="230" width="468" height="150" fill="#FFFFFF" stroke="#E4DDD2"/>
  <text x="592" y="292" fill="#141414" font-size="44" font-weight="700">41%</text>
  <text x="592" y="338" fill="#6F6A62" font-size="18">会员复购率</text>
  <rect x="1056" y="230" width="472" height="150" fill="#FFFFFF" stroke="#E4DDD2"/>
  <text x="1084" y="292" fill="#141414" font-size="44" font-weight="700">126 万</text>
  <text x="1084" y="338" fill="#6F6A62" font-size="18">即时达订单</text>
  <text x="72" y="444" fill="#141414" font-size="18" font-weight="700">结构要点</text>
  <rect x="72" y="478" width="8" height="8" fill="#A68456"/>
  <text x="96" y="488" fill="#141414" font-size="20">会员贡献 GMV 占比从 46% 升至 53%</text>
  <rect x="72" y="530" width="8" height="8" fill="#A68456"/>
  <text x="96" y="540" fill="#141414" font-size="20">即时达履约时效中位数 28 分钟</text>
  <rect x="72" y="582" width="8" height="8" fill="#A68456"/>
  <text x="96" y="592" fill="#141414" font-size="20">线下来客持平，客单提升 6.2%</text>
  <text x="72" y="680" fill="#6F6A62" font-size="16">口径：可识别会员。即时达含前置仓与门店拣货。</text>
  <text x="72" y="712" fill="#6F6A62" font-size="16">样本数据，只供这页演示，不是交付件。</text>
  <rect x="860" y="420" width="668" height="400" fill="#FFFFFF" stroke="#E4DDD2"/>
  <text x="892" y="464" fill="#141414" font-size="18" font-weight="700">GMV 指数</text>
  <text x="1008" y="464" fill="#6F6A62" font-size="15">2025 Q3 = 100</text>
  <line x1="900" y1="730" x2="1476" y2="730" stroke="#E4DDD2"/>
  <rect x="980" y="592" width="64" height="138" fill="#1F4B3A"/>
  <rect x="1160" y="580" width="64" height="150" fill="#1F4B3A"/>
  <rect x="1340" y="550" width="64" height="180" fill="#A68456"/>
  <text x="1012" y="578" fill="#141414" font-size="16" text-anchor="middle">86</text>
  <text x="1192" y="566" fill="#141414" font-size="16" text-anchor="middle">94</text>
  <text x="1372" y="536" fill="#141414" font-size="16" text-anchor="middle">112</text>
  <text x="1012" y="762" fill="#6F6A62" font-size="16" text-anchor="middle">7 月</text>
  <text x="1192" y="762" fill="#6F6A62" font-size="16" text-anchor="middle">8 月</text>
  <text x="1372" y="762" fill="#6F6A62" font-size="16" text-anchor="middle">9 月</text>
</svg>`;

export const PAGE3_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 900" font-family="${FONT}">
  <rect width="1600" height="900" fill="#F6F3EC"/>
  <rect width="1600" height="292" fill="#141414"/>
  <rect x="72" y="64" width="14" height="14" fill="#F6F3EC"/>
  <rect x="79" y="71" width="14" height="14" fill="none" stroke="#A68456" stroke-width="1.5"/>
  <text x="112" y="76" fill="#C9C2B6" font-size="16">03    下一步</text>
  <text x="72" y="176" fill="#FCFCFC" font-size="64" font-weight="700">会后三十天</text>
  <text x="72" y="232" fill="#C9C2B6" font-size="22">只保留三件必须落地的事</text>
  <text x="72" y="390" fill="#A68456" font-size="28" font-weight="700">01</text>
  <text x="168" y="374" fill="#6F6A62" font-size="16">11 月 8 日</text>
  <text x="168" y="414" fill="#141414" font-size="30">会员日第二波，只推高复购商品</text>
  <line x1="72" y1="456" x2="1528" y2="456" stroke="#E4DDD2"/>
  <text x="72" y="530" fill="#A68456" font-size="28" font-weight="700">02</text>
  <text x="168" y="514" fill="#6F6A62" font-size="16">11 月 20 日前</text>
  <text x="168" y="554" fill="#141414" font-size="30">即时达扩城方案，提交 12 城清单</text>
  <line x1="72" y1="596" x2="1528" y2="596" stroke="#E4DDD2"/>
  <text x="72" y="670" fill="#A68456" font-size="28" font-weight="700">03</text>
  <text x="168" y="654" fill="#6F6A62" font-size="16">12 月第一周</text>
  <text x="168" y="694" fill="#141414" font-size="30">复盘 37 家低效门店，关停或改造</text>
  <text x="72" y="820" fill="#6F6A62" font-size="16">此页没有归档来源。证据记为未知，不补写出处。</text>
  <text x="1528" y="820" fill="#141414" font-size="16" text-anchor="end">星河零售 · Q3</text>
</svg>`;

const PAGE1_EVIDENCE: EvidenceRecord[] = [
  {
    id: "p1-cover",
    grade: "已验证",
    title: "经营会封面口径",
    kind: "文稿",
    note: "演示样本里的封面段落，用来核对标题和三个口径数字。",
    excerpt:
      "本次内部经营会只用三页：封面、增长结构、会后三十天。封面数字口径为门店 428、覆盖 36 城、可识别会员 1,280 万。不含快闪，不含匿名客流。",
  },
  {
    id: "p1-agent",
    grade: "Agent 自述",
    title: "封面用色说明",
    kind: "自述",
    note: "Agent 自述：封面用了墨色与暖纸。没有品牌手册或设计规范可以对照，不能写成已验证。",
    excerpt: null,
  },
];

const PAGE2_EVIDENCE: EvidenceRecord[] = [
  {
    id: "p2-manuscript",
    grade: "已验证",
    title: "经营会文稿 · 增长段",
    kind: "文稿",
    note: "可打开的样本文稿摘录。它不是 PPT-Master 从磁盘读来的项目文件。",
    excerpt:
      "第三季度的增长不来自新开门店。会员贡献的 GMV 占比由 46% 升至 53%，即时达订单达到 126 万，履约时效中位数 28 分钟。线下来客与去年持平，客单提升 6.2%。下一阶段的资源继续压在复购，而不是再铺一轮广域拉新。",
  },
  {
    id: "p2-asset",
    grade: "已验证",
    title: "样本表 · Q3 经营指标",
    kind: "素材",
    note: "与本页数字卡、柱状图对应的样本记录。",
    excerpt:
      "周期：2026-07-01 至 2026-09-30。GMV 指数（2025 Q3 = 100）：7 月 86，8 月 94，9 月 112。GMV 同比 +18.4%。会员复购率 41%。即时达订单 126 万。",
  },
  {
    id: "p2-infer",
    grade: "推断",
    title: "柱状图读法",
    kind: "推断",
    note: "柱高直接来自样本数字。没有日志说明纵轴是否被改写，所以读法只能算推断。",
    excerpt: null,
  },
];

const PAGE3_EVIDENCE: EvidenceRecord[] = [
  {
    id: "p3-actions",
    grade: "未知",
    title: "会后行动清单",
    kind: "缺失",
    note: null,
    excerpt: null,
  },
  {
    id: "p3-cities",
    grade: "未知",
    title: "十二城扩张名单",
    kind: "缺失",
    note: null,
    excerpt: null,
  },
];

function slide(input: {
  id: string;
  page: number;
  kicker: string;
  fallbackTitle: string;
  evidenceSummary: string;
  svg: string;
  evidence: EvidenceRecord[];
}): SlideRecord {
  return {
    id: input.id,
    page: input.page,
    kicker: input.kicker,
    fallbackTitle: input.fallbackTitle,
    evidenceSummary: input.evidenceSummary,
    evidence: input.evidence,
    currentVersionId: `${input.id}-v1`,
    versions: [
      {
        id: `${input.id}-v1`,
        label: "v1 · 原稿",
        svg: input.svg,
        note: "演示稿初始版本。",
      },
    ],
  };
}

export function createInitialDeck(): DeckModel {
  return {
    candidate: null,
    slides: [
      slide({
        id: "p1",
        page: 1,
        kicker: "封面",
        fallbackTitle: "星河零售",
        evidenceSummary: "含自述",
        svg: PAGE1_SVG,
        evidence: PAGE1_EVIDENCE,
      }),
      slide({
        id: "p2",
        page: 2,
        kicker: "增长",
        fallbackTitle: "会员与即时达拉动增长",
        evidenceSummary: "已验证",
        svg: PAGE2_SVG,
        evidence: PAGE2_EVIDENCE,
      }),
      slide({
        id: "p3",
        page: 3,
        kicker: "收束",
        fallbackTitle: "会后三十天",
        evidenceSummary: "未知",
        svg: PAGE3_SVG,
        evidence: PAGE3_EVIDENCE,
      }),
    ],
  };
}
