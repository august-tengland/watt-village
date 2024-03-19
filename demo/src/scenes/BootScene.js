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
            progress.destroy();
            this.initGlobalDataManager();
            this.scene.start('HUDScene');
            this.scene.start('SimulationScene');
            this.scene.bringToTop('HUDScene');
            //this.scene.start('PlannerScene');
        });

        //  load all assets
        this.load.pack('preload', './assets/pack.json', 'preload');
    }

    initGlobalDataManager() {
        this.registry.set("time", 0);
        this.registry.set("dayLength", 0);
    }
}

