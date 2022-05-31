require('dotenv').config()
const _ = require('lodash')
const {MongoClient} = require('mongodb')
const {createBot} = require('./bot')
const {UsersDAO} = require('./users-dao')
const {FUELS, FUEL_NAMES, BRANDS, BRAND_NAMES} = require('./const')

;(async () => {
  // setup mongo client
  const mongoURL = `mongodb://${process.env.MONGO_USER}:${process.env.MONGO_PASSWORD}`
    + `@${process.env.MONGO_HOST}:${process.env.MONGO_PORT}`
  const client = new MongoClient(mongoURL)
  await client.connect()
  console.log('Successfully connected')
  const db = client.db(process.env.MONGO_DB)

  // create users dao
  const usersDAO = new UsersDAO(db)

  // create bot
  const bot = createBot({usersDAO})

  // launch bot
  bot.launch()

  // TODO: create index for location
  // create index
  await db.collection('users').createIndex({location: '2dsphere'})

  // change stream
  const changeStream = db.collection('stations').watch()
  changeStream.on('change', async (change) => {
    const {updateDescription: {updatedFields}} = change
    const updatedFuels = _.chain(FUELS)
      .map((fuel) => {
        const path = `fuels.${fuel}.inStock` 
        // FIXME: updatedFields can be both {'prop.name': value} and {prop: {name: value}}
        return _.has(updatedFields, path) ? {fuel, inStock: _.get(updatedFields, path)} : null
      })
      .compact()
      .value()

    if (_.isEmpty(updatedFuels)) {
      return
    }

    const station = await db.collection('stations').findOne({_id: change.documentKey._id})
    await Promise.all(_.map(updatedFuels, async ({fuel, inStock}) => {
      if (!inStock) {
        return
      }

      console.log(`${new Date()}: Station ${station._id} updated fuel ${FUEL_NAMES[fuel]} state`)
      const means = _.chain(station).get(`fuels.${fuel}.means`).keys().value()

      const usersCursor = await db.collection('users').aggregate(
        [
          {
            $geoNear: {
              near: station.location,
              distanceField: 'distance',
              maxDistance: 100000, // FIXME: hardcode
              spherical: true,
              query: {
                subscribed: true,
                fuels: fuel,
                means: {$in: means}
              }
            }
          }
        ])

      for await (const user of usersCursor) {
        console.log(`Notificating user ${user._id}`)
        const {brand, address, fetchedAt, location: {coordinates: [longitude, latitude]}} = station
        const description = _.get(station, `fuels.${fuel}.desc`)
        const distanceKm = (user.distance / 1000).toFixed(1)

        await bot.telegram.sendMessage(
          user.tgId,
          `Паливо "${FUEL_NAMES[fuel]}" ${inStock ? 'з\'явилось' : 'закінчилось'} на ${BRAND_NAMES[brand]},\n` +
          `${address} (${distanceKm} км),\n\n` +
          `${description} (дані на ${fetchedAt.toLocaleTimeString()})`)
        await bot.telegram.sendLocation(user.tgId, latitude, longitude)
      }
    }))
  })

  // shut down gracefully
  process.once('SIGINT', () => {
    changeStream.close()
    bot.stop('SIGINT')
    client.close(() => console.log('Successfully closed'))
  })
  process.once('SIGTERM', () => {
    changeStream.close()
    bot.stop('SIGTERM')
    client.close(() => console.log('Successfully closed'))
  })
})()

