const _ = require('lodash')
const {FUELS, FUEL_NAMES, BRAND_NAMES, MEANS} = require('./const')

class Controller {
  constructor(stationsDAO, usersDAO, notifier) {
    this._stationsDAO = stationsDAO
    this._usersDAO = usersDAO
    this._notifier = notifier
  }

  async handleStationChange(id, stationUpdate) {
    const fuelsByCash = _.filter(FUELS, (fuel) => {
      return _.chain(stationUpdate).get(`fuels.${fuel}.means`).has(MEANS.cash).value()
    })

    if (_.isEmpty(fuelsByCash)) {
      return
    }

    const {brand, address, fetchedAt, location, desc, _id: stationId} = await this._stationsDAO.findOne({_id: id})
    return Promise.all(_.map(fuelsByCash, async (fuel) => {
      const users = await this._usersDAO.findNear({
        location,
        maxDistance: 100000, // FIXME: hardcode
        filterByDistance: true,
        query: {
          subscribed: true,
          fuels: fuel
        }
      })

      for await (const user of users) {
        const distanceKm = (user.distance / 1000).toFixed(1)
        fetchedAt.setTime(fetchedAt.getTime() + 3 * 60 * 60 * 1000) // FIXME: timezone
        const msg = `${FUEL_NAMES[fuel]} на ${BRAND_NAMES[brand]}, ` +
          `${address} (${distanceKm} км).\n\n${desc}\n\n` +
          `P.S. дані на ${fetchedAt.toLocaleTimeString()}` // FIXME: container timezone
        const {coordinates: [longitude, latitude]} = location

        console.log(`Notificating user ${user._id} about ${fuel} at ${brand} ${stationId}`)
        await this._notifier.notifyUser(user, msg, {longitude, latitude})
      }      
    }))
  }
}

module.exports = {
  Controller
}

