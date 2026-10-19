// Logical resolution: everything in the sim and renderer uses these units.
export const W = 960;
export const H = 540;
export const GROUND = 478;
export const WALL_L = 30;
export const WALL_R = 930;

export const FPS = 60;
export const GRAVITY = 0.8;
export const ROUND_TIME = 90;
export const ENERGY_MAX = 100;
export const INTRO_FRAMES = 110;
export const END_FRAMES = 170;

// Input bitmask shared by keyboard, touch, AI and the network.
export const IN = { L: 1, R: 2, U: 4, P: 8, K: 16, B: 32, S: 64 };

export const VERSION = '1.0.0';
export const NET_PROTOCOL = 1;
