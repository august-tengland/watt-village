
export class Device extends Phaser.GameObjects.Sprite  {
    body;

    key; 
    type;
    currentScene;
    isActive;
    isIdleConsuming; // if true, uses power regardless of if its "interacted with" or not
    animationKeys; 
    apartment;
    powerConsumption; // In kWh
    // An animation that repeats simply starts and stops
    // A one-time animation is played in reverse when stopping device
    repeatAnimation; 
    
    constructor(params) { 
      super(params.scene, params.x, params.y, params.texture, params.frame);

      // variables
      this.key = params.key;
      this.currentScene = params.scene;
      this.isActive = false;
      this.type = params.texture;
      this.apartment = params.apartment;
      this.isIdleConsuming = params.isIdleConsuming;
      this.animationKeys = params.animationKeys;
      this.powerConsumption = params.powerConsumption;
      this.repeatAnimation = params.repeatAnimation;
      this.currentScene.add.existing(this);
      this.deviceSpecificHandling();
    }

    deviceSpecificHandling() {
      switch (this.type) {
        case 'bed':
          if(this.apartment % 2 == 0) {
            this.flipX = true;
          }
          break;
      }
    }

    handleAnimations() {
      if(this.isActive) {
        this.anims.play(this.animationKeys['active'],true);
      } else {
        if(this.repeatAnimation) {
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
        ////console.log("device started: ", this.key);
        this.handleAnimations();
      }, delayUntilStart);
    }

    stopDevice() {
      this.isActive = false;
      ////console.log("device stopped: ", this.key);
      this.handleAnimations();
    }

    getCurrentConsumption() {
      console.log("getting consumption from",this.key,":",(this.isActive||this.isIdleConsuming) ? this.powerConsumption : 0);
      return (this.isActive||this.isIdleConsuming) ? this.powerConsumption : 0;
      // Check how long the device has been active, maybe something with system time
    }

 }