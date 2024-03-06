export default class MenuScene extends Phaser.Scene {
    startKey;
    bitmapTexts = [];
  
    constructor() {
      super({
        key: 'MenuScene'
      });
    }
  
    init() {
      this.startKey = this.input.keyboard.addKey(
        Phaser.Input.Keyboard.KeyCodes.S
      );
      this.startKey.isDown = false;
      this.initGlobalDataManager();
    }
  
    create() {  
      this.bitmapTexts.push(
        this.add.text(
          this.sys.canvas.width / 2 - 22,
          105,
          'START'
        )
      );
    }
  
    update() {
      if (this.startKey.isDown) {
        //this.scene.start('HUDScene');
        this.scene.start('SimulationScene');
        //this.scene.bringToTop('HUDScene');
      }
    }
  
    initGlobalDataManager() {
      this.registry.set('time', 400);
      this.registry.set('worldTime', 'WORLD TIME');
      this.registry.set('score', 0);
      this.registry.set('coins', 0);
      this.registry.set('spawn', { x: 12, y: 44, dir: 'down' });
    }
  }