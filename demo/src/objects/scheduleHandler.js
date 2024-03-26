
// Manages updates of energy production, pricing, and calculates costs
export class ScheduleHandler {
  
    // init from params
    currentDayKey;
    scene;
    scheduleDataPerTimeUnit;
    tucf;
  
    constructor(params) { 
      // variables
      this.currentDayKey = params.currentDayKey;
      this.scene = params.scene; 
      this.tucf = params.tucf;
      this.scheduleDataPerTimeUnit = this.loadScheduleData(this.currentDayKey);
      console.log("and when is this called?");
    }

    loadScheduleData(currentDayKey) {
        const json = this.scene.cache.json.get('dailySchedulesJSON');
        const scheduleData = json[currentDayKey];
        console.log("when is this called?");
        return this.convertScheduleDataToArray(scheduleData);
    }

    convertScheduleDataToArray(scheduleData) {
        var scheduleDataPerTimeUnit = {};
        for (const [personKey, scheduleValue] of Object.entries(scheduleData)) {
            scheduleDataPerTimeUnit[personKey] = {};
            for (const [timestepKey, timestepActivity] of Object.entries(scheduleValue)) {
                var timestep = this.convertTimestep(timestepKey); 
                var activityKey = "a" + personKey.substring(1) + timestepActivity;
                scheduleDataPerTimeUnit[personKey][timestep] = activityKey; 
            }
        }
        return scheduleDataPerTimeUnit;
    }

    convertTimestep(timestepKey) { // timestepKey on the form HH:MM
        var hour = parseInt(timestepKey.substring(0,2), 10);
        var minute = parseInt(timestepKey.substring(3), 10);
        console.log(hour*this.tucf + minute/60*this.tucf);
        return (hour*this.tucf + minute/60*this.tucf);
    }
  
    getSchedule(personKey, activityMap) {
        const schedule = new Map();
        console.log("Creating schedule for person:", personKey);
        console.log(this.scheduleDataPerTimeUnit[personKey]);
        const scheduleFromJson = this.scheduleDataPerTimeUnit[personKey];
        for (const [time, activityKey] of Object.entries(scheduleFromJson)) {
            // Get full activity from reference to activity map
           schedule.set(time, activityMap.get(activityKey))
        }
        return schedule;
    }

    createControlledSchedule(personKey, definedActivities, activityMap) {
        const schedule = new Map();
        console.log("Creating controlled schedule for person:", personKey);
        console.log(definedActivities);
        for (const [time, activityKey] of Object.entries(definedActivities)) {
            // Get full activity from reference to activity map
           schedule.set(time, activityMap.get(activityKey))
        }
        return schedule;
    }
   }