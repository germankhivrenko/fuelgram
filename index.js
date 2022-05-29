require('dotenv').config()
const {MongoClient} = require('mongodb')
const {createBot} = require('./bot')
const {UsersDAO} = require('./users-dao')
const {FUELS} = require('./const')

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
  // const pipeline = [{$match: {'fuels.ds.inStock': true}}]
  // const changeStream = db.collection('stations').watch(pipeline)
  // changeStream.on('change', (next) => {
  //   console.dir(next)
  // })

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

