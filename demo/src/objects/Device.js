
export class Device extends Phaser.GameObjects.Sprite  {
    body;

    key; 
    currentScene;
    isActive;
    animationKey; // Each activity can only take place at one location
    powerConsumption;
    
    constructor(params) { 
      super(params.scene, params.x, params.y, params.texture, params.frame);

      // variables
      this.key = params.key;
      this.currentScene = params.scene;
      this.isActive = false;
      this.animationKey = params.animationKey;
      this.powerConsumption = params.powerConsumption;
      this.currentScene.add.existing(this);
    }

    update() {
      this.handleAnimations();
    }

    handleAnimations() {
      this.anims.play(this.animationKey,true);
    }

 }