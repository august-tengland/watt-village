
export class Device extends Phaser.GameObjects.Sprite  {
    body;

    key; 
    currentScene;
    isActive;
    animationKeys; 
    powerConsumption;
    // An animation that repeats simply starts and stops
    // A one-time animation is played in reverse when stopping device
    repeatAnimation; 
    
    constructor(params) { 
      super(params.scene, params.x, params.y, params.texture, params.frame);

      // variables
      this.key = params.key;
      this.currentScene = params.scene;
      this.isActive = false;
      this.animationKeys = params.animationKeys;
      this.powerConsumption = params.powerConsumption;
      this.repeatAnimation = params.repeatAnimation;
      
      this.currentScene.add.existing(this);
    }

    handleAnimations() {
      if(this.isActive) {
        this.anims.play(this.animationKeys['active'],true);
      } else {
        if(this.repeatAnimation) {
          //HI DISCORD!
          // Instead of stopping the animatio at the current frame, 
          // I want to set it to frame 0, that is inside the spritesheet but outside the animation;
          this.anims.stop();
          this.setFrame(0);
        } else {
          this.anims.playReverse(this.animationKeys['active'],true);
        }
      }
    }

    startDevice(delayUntilStart) {
      setTimeout(() => {
        this.isActive = true;
        console.log("device started: ", this.key);
        this.handleAnimations();
      }, delayUntilStart);
    }

    stopDevice() {
      this.isActive = false;
      console.log("device stopped: ", this.key);
      this.handleAnimations();
    }

 }