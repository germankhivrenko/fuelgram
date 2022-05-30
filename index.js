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

  // change stream
  const changeStream = db.collection('stations').watch()
  changeStream.on('change', async (change) => {
    const {updateDescription: {updatedFields}} = change
    const updatedFuels = _.chain(FUELS)
      .map((fuel) => {
        const path = `fuels.${fuel}.inStock` 
        return _.has(updatedFields, path) ? {fuel, inStock: updatedFields[path]} : null
      })
      .compact()
      .value()

    await Promise.all(_.map(updatedFuels, async ({fuel, inStock}) => {
      const station = await db.collection('stations').findOne({_id: change.documentKey._id})
      const means = _.chain(station).get(`fuels.${fuel}.means`).keys().value()
      const usersCursor = await db.collection('users').find({
        fuels: fuel,
        means: {$in: means}
      })

      for await (const user of usersCursor) {
        const {brand, address, fetchedAt, location: {latitude, longitude}} = station
        await bot.telegram.sendMessage(
          user.tgId,
          `${FUEL_NAMES[fuel]} ${inStock ? 'appeared' : 'is out'} at ${BRAND_NAMES[brand]},\n` +
          `${address} (updated at ${fetchedAt.toLocaleTimeString()})\n`)
        await bot.telegram.sendLocation(user.tgId, latitude, longitude)
      }
    }))
  })

  // shut down gracefully
  process.once('SIGINT', () => {
    bot.stop('SIGINT')
    client.close(() => console.log('Successfully closed'))
  })
  process.once('SIGTERM', () => {
    bot.stop('SIGTERM')
    client.close(() => console.log('Successfully closed'))
  })
})()

