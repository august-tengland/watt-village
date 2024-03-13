// This is the scene in which the player schedules activities for the day

export default class PlannerScene extends Phaser.Scene {
    startKey;
    bitmapTexts = [];
  
    constructor() {
      super({
        key: 'PlannerScene'
      });
    }
  
    init() {
      this.startKey = this.input.keyboard.addKey(
        Phaser.Input.Keyboard.KeyCodes.S
      );
      this.startKey.isDown = false;
      //this.initGlobalDataManager();
    }
  
    create() {  
      this.bitmapTexts.push(
        this.add.text(
          this.sys.canvas.width / 2 - 22,
          105,
          'START'
        )
      );
      
      const element = this.add.dom(400, 600).createFromCache('form');

      console.log(element);
    }
  
    update() {
      if (this.startKey.isDown) {
        //this.scene.start('HUDScene');
        this.scene.start('SimulationScene');
        //this.scene.bringToTop('HUDScene');
      }
    }
  
    // initGlobalDataManager() {
    //   this.registry.set('time', 400);
    //   this.registry.set('worldTime', 'WORLD TIME');
    //   this.registry.set('score', 0);
    //   this.registry.set('coins', 0);
    //   this.registry.set('spawn', { x: 12, y: 44, dir: 'down' });
    // }
  }