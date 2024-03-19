

export class HouseSolarPanelHandler {
  
    // init from params
    key;
    scene;
    time;
    dayLength;
    solarPanelEffect;
    house;
    currentDayKey;
  
    // init from json-data
    solarSchedulePerTimeUnit;
    
    // current values
    currentSolarProduction;
  
  
    constructor(params) { 
      // variables
      this.key = params.key;
      this.scene = params.scene;
      this.time = params.time;
      this.house = params.house;
      this.dayLength = params.dayLength;
      this.currentDayKey = params.currentDayKey;
      this.solarPanelEffect = params.solarPanelEffect;
      this.currentSolarProduction = 0;
      this.solarSchedulePerTimeUnit = this.generateSolarSchedule(params.currentDayKey);
  
    }
  
    runUpdate(newTime) {
      this.time = newTime+4*4; //NOTE: Change this when troubleshooting
      this.updateSolarPanelProduction();
    }
  
     updateSolarPanelProduction() {
      this.currentSolarProduction = this.solarSchedulePerTimeUnit[this.time] * this.solarPanelEffect;
     }

     generateSolarSchedule(currentDayKey) {
      var solarScheduleData = null;
      fetch("./src/data/solarSchedule.json")
        .then((response) => response.json())
        .then((json) => {
          solarScheduleData = json[this.currentDayKey];
          this.solarSchedulePerTimeUnit = this.convertSolarScheduleToArray(solarScheduleData);
        });
     }
  
     // Converts the loaded json file to array
     // Solar Schedule converted to sun per time unit
     convertSolarScheduleToArray(solarScheduleData) {
        var solarScheduleArray = [];
        // Time Unit Conversion Factor
        var tucf = this.dayLength / 24;
        for (var h = 0; h < 24; h++) {
          for (var d = 0; d < tucf; d++) {
            
            if (h == 23) {
              solarScheduleArray[h*tucf+d] = (solarScheduleData[h.toString(10)]*((tucf-d)/tucf) 
                                              + solarScheduleData["0"]*(d/tucf));
            } else {
              solarScheduleArray[h*tucf+d] = (solarScheduleData[h.toString(10)]*((tucf-d)/tucf) 
                                              + solarScheduleData[(h+1).toString(10)]*(d/tucf));
            }
          }
        }
        //console.log(solarScheduleData);
        //console.log(solarScheduleArray);
        return solarScheduleArray;
     }
   }