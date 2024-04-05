
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
    currentApartmentConsumption;
    currentOutsideConsumption;  
    // aggregated values
    individualCost;
    individualSelling;
    individualSavings;
  
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
      this.individualCost = 0;
      this.individualSelling = 0;
      this.individualSavings = 0;
    }
  
    runUpdate(newTime) {
      this.time = newTime % this.dayLength;
      this.time = newTime;
      this.updateCurrentConsumption();
    }
  
     updateCurrentConsumption() {
      this.currentConsumption = 0;
      this.currentApartmentConsumption = 0;
      this.currentOutsideConsumption = 0;  
      for(var [key, device] of this.devices) {
        this.currentConsumption += device.getCurrentConsumption();
        if (["car"].includes(device.type)) {
          this.currentOutsideConsumption += device.getCurrentConsumption();  
        } else {
          this.currentApartmentConsumption += device.getCurrentConsumption();
        }
      }
      //console.log("current consumption for apartment ",this.apartment, ": ", this.currentConsumption);
     }
  
     updateTotalCost(params) { // params: {costThisTimeUnit, sellingThisTimeUnit, savingsThisTimeUnit}
      //console.log("Cost for apartment", this.apartment, "this time unit:",params['costThisTimeUnit']);
      //console.log("Selling for apartment", this.apartment, "this time unit:",params['sellingThisTimeUnit']);
      //console.log("Savings for apartment", this.apartment, "this time unit:",params['savingsThisTimeUnit']);

      this.individualCost += params['costThisTimeUnit'];
      this.individualSelling += params['sellingThisTimeUnit'];
      this.individualSavings += params['savingsThisTimeUnit'];
      if(this.apartment == 1) {
        this.scene.events.emit('individualStatsChanged', this.individualCost, this.individualSelling, this.individualSavings);
      }
     }

   }