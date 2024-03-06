import { AnimationHelper } from '../helpers/animationHelper.js';

export default class BootScene extends Phaser.Scene {

    animationHelperInstance;

    constructor() {
        super({key: 'BootScene'});
    }
    preload() {
        const progress = this.add.graphics();

        // Register a load progress event to show a load bar
        this.load.on('progress', (value) => {
            progress.clear();
            progress.fillStyle(0xffffff, 1);
            progress.fillRect(0, this.sys.game.config.height / 2, this.sys.game.config.width * value, 60);
        });

        // Register a load complete event to launch the title screen when all files are loaded
        this.load.on('complete', () => {
            // prepare all animations, defined in a separate file
            this.animationHelperInstance = new AnimationHelper(
                this,
                this.cache.json.get('animationsJSON')
            );
            console.log("test");
            progress.destroy();
            this.scene.start('SimulationScene');
        });

        //  load all assets
        this.load.pack('preload', './assets/pack.json', 'preload');

        // this.load.image('ground', 'assets/platform.png');

        // this.load.spritesheet('rut', 'assets/rut_idle.png', { frameWidth: 32, frameHeight: 48 });
        //this.load.image('sky', 'assets/sky.png');
        //this.load.image('house', 'assets/house.png');
        //this.load.image('ground', 'assets/platform.png');
        //<this.load.image('background-clouds', 'assets/images/clouds.png'); // 16-bit later

        // // Spritesheets with fixed sizes. Should be replaced with atlas:
        // this.load.spritesheet('mario', 'assets/images/mario-sprites.png', {
        //     frameWidth: 16,
        //     frameHeight: 32
        // });

    }
}

