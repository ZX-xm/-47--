export type PendingTargetMode =

  | "enemy"

  | "pupa"

  | "pupa_then_enemy"

  | "gene_spend"

  | "consumable_enemy"

  | null;



export interface PupaUnit {

  id: string;

  name: string;

  hp: number;

  maxHp: number;

  attack: number;

  strength: number;

  block: number;

  turnsRemaining: number;

  weak: boolean;

}



export interface PupaSnapshot {

  maxHp: number;

  attack: number;

  strength: number;

  weak: boolean;

}



export interface IntentOverride {

  block: number;

}


