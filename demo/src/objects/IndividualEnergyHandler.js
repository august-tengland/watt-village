
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
    baseline;
    isActive;
  
    // init from json-data
    energyPricesPerTimeUnit;
    
    // current values
    currentConsumption;
    currentApartmentConsumption;
    currentOutsideConsumption;  
    totalConsumption;
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
      this.baseline = params.baseline;
      this.isActive = params.isActive;
      this.currentConsumption = 0;
      this.totalConsumption = 0;
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
      if(this.isActive) {
        for(var [key, device] of this.devices) {
          this.currentConsumption += device.getCurrentConsumption();
          if (["carCharger"].includes(device.type)) {
            this.currentOutsideConsumption += device.getCurrentConsumption();  
          } else {
            this.currentApartmentConsumption += device.getCurrentConsumption();
          }
        }
      }
      }
  
     updateTotalCost(params) { 

      if(this.isActive) {
        this.totalConsumption += this.currentConsumption;
        this.individualCost += params['costThisTimeUnit'];
        this.individualSelling += params['sellingThisTimeUnit'];
        const progression = this.totalConsumption/this.baseline['estimatedIndividualConsumption'];
        const consumptionBaseline = (this.individualCost-this.individualSelling);
        this.individualSavings = (this.baseline['estimatedIndividualCost'] -consumptionBaseline/progression) * progression;
  
        if(this.apartment == 1) {
          //console.log(progression);
          this.scene.events.emit('individualStatsChanged', this.individualCost, this.individualSelling, this.individualSavings);
        }
      }
     }

     getStats() {
      const stats = {
        buy: this.individualCost,
        sell: this.individualSelling,
        save: this.individualSavings,
      }

      return stats;
     }

   }