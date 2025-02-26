const {google} = require("googleapis");

async function getCalendarList(auth) {
    return new Promise(async (resolve, reject) => {
        try {
            const calendar = google.calendar({version: 'v3', auth});
            const getCalendarList = await calendar.calendarList.list({});
            console.log(getCalendarList)
            if (getCalendarList.status === 200) {
                resolve(getCalendarList.data.items)
            } else {
                resolve([]);
            }
        } catch (e) {
            console.log('getCalendarListError:', e)
            resolve(null);
        }
    });
}

async function getEventsNextHourTodayListByCalendarId(auth, calendarId) {
    return new Promise(async (resolve, reject) => {
        try {
            const calendar = google.calendar({version: 'v3', auth});
            const getEventsListByCalendarId = await calendar.events.list({
                calendarId: calendarId,
                maxAttendees: 2500,
                timeMin: new Date(),
                timeMax: new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate(), new Date().getHours()+1)
            });
            console.log(getEventsListByCalendarId)
            if (getEventsListByCalendarId.status === 200) {
                if(getEventsListByCalendarId.data.items && Array.isArray(getEventsListByCalendarId.data.items) && getEventsListByCalendarId.data.items.length){
                    getEventsListByCalendarId.data.items = getEventsListByCalendarId.data.items.filter(item => {
                        return (!item.start.dateTime  || (item.start.dateTime && (new Date(item.start.dateTime) > new Date())));
                    })
                }
                resolve(getEventsListByCalendarId.data.items)
            } else {
                resolve([]);
            }
        } catch (e) {
            console.log('getEventsNextHourTodayListByCalendarIdError:', e)
            resolve(null);
        }
    });
}

module.exports = {getCalendarList, getEventsNextHourTodayListByCalendarId};
