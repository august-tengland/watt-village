import Boot from "./scenes/BootScene.js";
import Menu from "./scenes/MenuScene.js";
import Planner from "./scenes/PlannerScene.js";
import HUD from "./scenes/HUDScene.js";
import Simulation from "./scenes/SimulationScene.js";
import Guide from "./scenes/GuideScene.js";
import Summary from "./scenes/SummaryScene.js";

var config = {
    type: Phaser.AUTO,
    width: 1920*1.0,
    height: 1080*1.0,
    dom: {
        createContainer: true
      },
    parent: 'canvasContainer',
    zoom: 1,
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 0 },
            debug: false
        }
    },
    scene: [Boot,Menu,Guide,Planner,HUD,Simulation,Summary]
};

var game = new Phaser.Game(config);

