
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
    lightning;
    // An animation that repeats simply starts and stops
    // A one-time animation is played in reverse when stopping device
    repeatAnimation; 
    boot;
    
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
      this.lightning = params.lightning;
      this.booting = true;
      this.currentScene.add.existing(this);
      this.setLightningToCorrectPosition();
      this.deviceSpecificHandling();
      this.handleAnimations();
    }

    deviceSpecificHandling() {
      switch (this.type) {
        case 'bed':
          if(this.apartment % 2 == 0) {
            this.flipX = true;
          }
          break;
        case 'carCharger':
          if(this.apartment % 2 == 0) {
            this.flipX = true;
          }
          break;
      }
    }

    handleAnimations() {
      if(this.isActive) {
        console.log("playing active animation for:",this.key);
        this.anims.play(this.animationKeys['active'],true);
      } else {
        if(this.repeatAnimation) {
          this.anims.stop();
          this.setFrame(0);
          
        } else if(!this.booting) {
          this.anims.playReverse(this.animationKeys['active'],true);
        }
      }

      if((this.isActive || this.isIdleConsuming) && this.powerConsumption > 0) {
        this.lightning.setVisible(true)
        this.lightning.anims.play("lightningActive");
      } 
      else {
        this.lightning.setVisible(false);
        this.lightning.anims.stop();
        this.lightning.setFrame(0);
      }
      this.booting = false;
    }

    startDevice(delayUntilStart) {
      this.isActive = true;
      setTimeout(() => {
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
      //console.log("getting consumption from",this.key,":",(this.isActive||this.isIdleConsuming) ? this.powerConsumption : 0);
      return (this.isActive||this.isIdleConsuming) ? this.powerConsumption : 0;
      // Check how long the device has been active, maybe something with system time
    }

    setLightningToCorrectPosition() {
      const specialDevices = ['stove',"fridge"];
      if(specialDevices.indexOf(this.type) > -1) this.lightning.y -= this.height/1.5;//this.height/2;
      else this.lightning.y -= this.height;
    }

 }