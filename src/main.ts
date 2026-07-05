import * as THREE from 'three';
import { Game } from './game/Game';
import { UI } from './ui/UI';
import './style.css';

const canvas = document.createElement('canvas');
canvas.id = 'three-canvas';
document.body.appendChild(canvas);

const game = new Game(canvas);
const ui = new UI(game);

(window as any).game = game;
(window as any).ui = ui;

game.startLoop();
