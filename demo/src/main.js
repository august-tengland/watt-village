import Boot from "./scenes/BootScene.js";
import Menu from "./scenes/MenuScene.js";
import Simulation from "./scenes/SimulationScene.js";

var config = {
    type: Phaser.AUTO,
    width: 1920*0.8,
    height: 1080*0.8,
    parent: 'canvasContainer',
    zoom: 1,
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 0 },
            debug: false
        }
    },
    scene: [Boot,Menu,Simulation]
};

var game = new Phaser.Game(config);

