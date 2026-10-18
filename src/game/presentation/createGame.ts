import Phaser from 'phaser';
import { RegionalMapScene } from './scenes/RegionalMapScene';
import { ShellScene } from './scenes/ShellScene';

export function createGame(): Phaser.Game {
  return new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'phaser-stage',
    transparent: true,
    antialias: true,
    roundPixels: true,
    scale: {
      mode: Phaser.Scale.RESIZE,
      width: window.innerWidth,
      height: window.innerHeight,
    },
    scene: [ShellScene, RegionalMapScene],
    input: {
      activePointers: 2,
      smoothFactor: 0.2,
    },
    render: {
      powerPreference: 'high-performance',
      antialias: true,
      antialiasGL: true,
    },
    banner: false,
  });
}
