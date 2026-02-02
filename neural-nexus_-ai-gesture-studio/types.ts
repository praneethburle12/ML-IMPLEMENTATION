export interface Landmark {
  x: number;
  y: number;
  z: number;
}

export interface GestureData {
  name: string;
  emoji: string;
  fingerCount: number;
  confidence: number;
  description: string;
}

export interface HandResults {
  landmarks: Landmark[];
  gesture: GestureData | null;
  fps: number;
  handedness: 'Left' | 'Right';
}

export enum Direction {
  UP = 'UP',
  DOWN = 'DOWN',
  LEFT = 'LEFT',
  RIGHT = 'RIGHT',
  NONE = 'NONE'
}