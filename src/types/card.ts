export type CardType = "attack" | "skill" | "power";



export interface CardTemplate {

  id: string;

  name: string;

  cost: number;

  type: CardType;

  damage?: number;

  block?: number;

  heal?: number;

  stun?: boolean;

  exhaust?: boolean;

  powerId?: string;

  requiresTarget?: boolean;
  /** 场上有多个敌人时需手动选择目标（如打击） */
  chooseTargetWhenMulti?: boolean;

  requiresTentacleMark?: boolean;

  requiresPupa?: boolean;

  requiresAnyPupa?: boolean;

  /** 出牌额外消耗的基因物质（蜂巢第二费用） */

  geneMaterialCost?: number;

  /** 击杀目标时获得基因物质 */

  geneMaterialOnKill?: number;

  /** 商店购买价格（阵营贡献） */

  shopPrice?: number;

  applyWeak?: number;

  applyVulnerable?: number;

  grantCardToHand?: string;

  weakOnElite?: number;

  hiveSpecial?: boolean;

  /** 抽牌数量（信息素诱捕等） */

  drawCount?: number;

  /** 本回合召唤过蛹时额外获得能量 */

  bonusEnergyIfSummonedPupa?: number;

  /** 本回合曾受伤时额外伤害 */

  bonusDamageIfHitThisTurn?: number;

  /** 本回合曾受伤时额外基因物质 */

  bonusGeneIfHitThisTurn?: number;

  /** 对所有敌人造成伤害（采集蜂群） */

  damageAll?: number;

  /** 每命中一名敌人获得基因（上限见 geneMaterialPerHitMax） */

  geneMaterialPerHit?: number;

  geneMaterialPerHitMax?: number;

  /** 对每个带 debuff 的敌人获得基因（上限见 geneMaterialPerDebuffMax） */

  geneMaterialPerDebuff?: number;

  geneMaterialPerDebuffMax?: number;

  /** 下一张攻击牌额外伤害（复眼加强） */

  nextAttackBonusGrant?: number;

  /** 可选消耗基因增伤（过载充能） */

  optionalGeneSpendMax?: number;

  bonusDamagePerGeneSpent?: number;

  /** 若目标有寄生则移除并额外伤害（酸性喷吐） */

  parasiteBonusDamage?: number;

  /** 不在奖励/商店池，仅事件获得 */
  eventOnly?: boolean;

  /** 联邦义体卡（蓝色标识） */
  federationCybernetic?: boolean;

  /** 战斗开始时从牌库自动安装 */
  autoInstallAtBattleStart?: boolean;

  /** 无法主动打出 */
  unplayable?: boolean;

  /** 多段伤害次数 */
  damageHits?: number;

  /** 从消耗堆洗回抽牌堆的最大张数（基因回收） */
  exhaustRecycleMax?: number;

  /** 每洗回一张获得的基因物质 */
  geneMaterialPerRecycled?: number;

  /** 处决：目标生命比例低于此值才生效 */
  executeThreshold?: number;

  /** 召唤帝国攻击无人机 */
  summonEmpireDrone?: boolean;

  /** 永久增加最大生命（Run） */
  permanentMaxHpGain?: number;

  /** 本场战斗临时生命 */
  battleTempHp?: number;

  /** 战术撤退 */
  tacticalRetreat?: boolean;

  /** 商店专属，不进奖励池 */
  marketShopOnly?: boolean;

  description: string;

}



export interface CardInstance {

  instanceId: string;

  templateId: string;

  name: string;

  cost: number;

  type: CardType;

  damage?: number;

  block?: number;

  heal?: number;

  stun?: boolean;

  exhaust?: boolean;

  powerId?: string;

  requiresTarget?: boolean;
  /** 场上有多个敌人时需手动选择目标（如打击） */
  chooseTargetWhenMulti?: boolean;

  requiresTentacleMark?: boolean;

  requiresPupa?: boolean;

  requiresAnyPupa?: boolean;

  geneMaterialCost?: number;

  geneMaterialOnKill?: number;

  applyWeak?: number;

  applyVulnerable?: number;

  grantCardToHand?: string;

  weakOnElite?: number;

  hiveSpecial?: boolean;

  drawCount?: number;

  bonusEnergyIfSummonedPupa?: number;

  bonusDamageIfHitThisTurn?: number;

  bonusGeneIfHitThisTurn?: number;

  damageAll?: number;

  geneMaterialPerHit?: number;

  geneMaterialPerHitMax?: number;

  geneMaterialPerDebuff?: number;

  geneMaterialPerDebuffMax?: number;

  nextAttackBonusGrant?: number;

  optionalGeneSpendMax?: number;

  bonusDamagePerGeneSpent?: number;

  parasiteBonusDamage?: number;

  exhaustRecycleMax?: number;

  geneMaterialPerRecycled?: number;

  description: string;

}



export const POWER_LABELS: Record<string, string> = {

  counter_awareness: "反击意识",

  defense_awareness: "防御意识",

  empire_shield: "帝国护盾",

  self_destruct_order: "自爆指令",

  regeneration_plan: "再生计划",

  swarm_echo: "蜂群回响",

};

/** 能力具体效果说明（悬停展示） */
export const POWER_DESCRIPTIONS: Record<string, string> = {
  counter_awareness: "每回合第一次被攻击时，获得一张反击",
  defense_awareness: "每回合第一次攻击敌人时，获得一张迅防",
  empire_shield: "每回合开始时获得 4 点格挡（可叠加，每层 +4）",
  self_destruct_order: "召唤蛹时，将一张自爆指令加入手牌",
  regeneration_plan: "蛹死亡后，下回合开始时复活该蛹（每场一次）",
  swarm_echo: "牺牲蛹时，对随机敌人 3 伤并回复 1 生命（可叠加）",
};

/** 可叠加层数的能力 */
export const POWER_STACKABLE = new Set([
  "empire_shield",
  "swarm_echo",
  "self_destruct_order",
]);

export function isPowerStackable(powerId: string): boolean {
  return POWER_STACKABLE.has(powerId);
}

export function getPowerDisplayLabel(powerId: string, stacks: number): string {
  const name = POWER_LABELS[powerId] ?? powerId;
  if (isPowerStackable(powerId)) {
    return `${name} ×${stacks}`;
  }
  return name;
}

export function getPowerTooltip(powerId: string): string {
  const name = POWER_LABELS[powerId] ?? powerId;
  const desc = POWER_DESCRIPTIONS[powerId];
  return desc ? `${name}\n${desc}` : name;
}



/** 卡牌奖励中排除（含能力牌衍生的 0 费牌） */

export const REWARD_EXCLUDED_TEMPLATES = new Set([

  "strike",

  "defend",

  "counter",

  "swift_defend",

  "follow_up_strike",

  "empire_pulse_pistol",

  "empire_service_rifle",

  "cyber_flame_hand",

  "cyber_second_heart",

  "cyber_blade_claw",

  "cyber_muscle_fiber",

  "cyber_glide_wing",

  "standard_body_armor",

  "first_aid_syringe",

  "tactical_mark",

  "fragmentation_grenade",

  "empire_shield_generator",

  "adrenaline",

  "execute_order",

  "empire_mech_pack",

  "gene_enhancement_needle",

  "tactical_retreat",

]);


