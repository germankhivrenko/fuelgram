require('dotenv').config()
const _ = require('lodash')
const {MongoClient} = require('mongodb')
const {createBot} = require('./bot')
const {UsersDAO} = require('./users-dao')
const {StationsDAO} = require('./stations-dao')
const {FUELS, FUEL_NAMES, BRANDS, BRAND_NAMES, MEANS} = require('./const')
const {Controller} = require('./controller')

;(async () => {
  // setup mongo client
  const client = new MongoClient(process.env.MONGO_URL)
  await client.connect()
  console.log('Successfully connected')
  const db = client.db(process.env.MONGO_DB)

  // init services
  const stationsDAO = new StationsDAO(db)
  const usersDAO = new UsersDAO(db)
  const notifier = {
    notifyUser: async (user, msg, location) => {
      try {
        const {latitude, longitude} = location
        await bot.telegram.sendMessage(user.tgId, msg)
        await bot.telegram.sendLocation(user.tgId, latitude, longitude)
      } catch(err) {
        console.error(err)
      }
    }
  }
  const controller = new Controller(stationsDAO, usersDAO, notifier)

  // create bot
  const bot = createBot({usersDAO, db})

  // launch bot
  bot.launch()

  // TODO: create index for location
  // await db.collection('users').createIndex({location: '2dsphere'})
  // await db.collection('stations').createIndex({location: '2dsphere'})

  // change stream
  const changeStream = db.collection('stations').watch()
  // stationsDAO.watch()
  changeStream.on('change', async (change) => {
    const stationUpdatePath = {
      insert: 'fullDocument',
      update: 'updateDescription.updatedFields'
    }[change.operationType]
    const stationUpdate = _.get(change, stationUpdatePath)
    await controller.handleStationChange(change.documentKey._id, stationUpdate)
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

