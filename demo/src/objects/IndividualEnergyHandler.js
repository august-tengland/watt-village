
// Manages updates of energy production, pricing, and calculates costs
export class IndividualEnergyHandler {
  
    // init from params
    key
    scene;
    devices;
    time;
    dayLength;
    currentDayKey;
    apartment;
    house;
  
    // init from json-data
    energyPricesPerTimeUnit;
    
    // current values
    currentConsumption;
    currentSolarPanelGeneration;
  
    // aggregated values
    totalCost;
  
    constructor(params) { 
      // variables
      this.key = params.key;
      this.scene = params.scene;
      this.apartment = params.apartment;
      this.house = params.house;
      this.devices = params.devices;
      this.time = params.time;
      this.dayLength = params.dayLength;
      this.currentDayKey = params.currentDayKey;
      this.currentConsumption = 0;
      this.totalCost = 0;
    }
  
    runUpdate(newTime) {
      this.time = newTime;
      this.updateCurrentConsumption();
    }
  
     updateCurrentConsumption() {
      this.currentConsumption = 0;
      for(var [key, device] of this.devices) {
        this.currentConsumption += device.getCurrentConsumption();
      }
      console.log("current consumption for apartment ",this.apartment, ": ", this.currentConsumption);
     }
  
     updateTotalCost() {
      //console.log(this.scene.registry.values.individualCost);
      //console.log("current energy price:", this.energyPricesPerTimeUnit[this.time]);
      var costThisTimeUnit = this.currentConsumption * this.energyPricesPerTimeUnit[this.time];
      this.totalCost += costThisTimeUnit;
      this.scene.registry.values.individualCost = this.totalCost;
      //console.log("cost this time unit:", costThisTimeUnit);
      //console.log("totalCost:", this.totalCost);
     }

   }