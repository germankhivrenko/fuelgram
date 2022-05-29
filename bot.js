const _ = require('lodash')
const {Telegraf} = require('telegraf')
const {FUELS, FUEL_NAMES} = require('./const')

// commands: start, fuels, means, location, subscribe, unsubscribe
const createBot = ({usersDAO}) => {
  const bot = new Telegraf(process.env.BOT_TOKEN)
  const requestLocation = (ctx) => {
    return bot.telegram.sendMessage(
      ctx.chat.id,
      'Share your location by clicking',
      {
        reply_markup: {
          one_time_keyboard: true,
          keyboard: [
            [{text: 'Share Location', request_location: true}]
          ]
        }
      })
  }
  
  bot.start(async (ctx) => {
    await ctx.reply('Welcome to Fuel Master\n' +
      '/fuels - to choose fuels you want to watch\n' +
      '/means - to select yout purchase means\n' +
      '/location - to update your location\n' +
      '/unsubscribe - to unsubscribe from notifications\n' +
      '/subscribe - to subscribe back\n')
    const user = {}
    await usersDAO.upsertOne(user, {...user, subscribed: true}) 
    await requestLocation(ctx)
  })

  // commands
  bot.command('fuels', async (ctx) => {
    await bot.telegram.sendMessage(
      ctx.chat.id,
      'Choose fuels you want to watch',
      {
        reply_markup: {
          inline_keyboard: [
            [
              {text: FUEL_NAMES[FUELS.ds], callback_data: FUELS.ds},
              {text: FUEL_NAMES[FUELS.dsp], callback_data: FUELS.dsp}
            ],
            [
              {text: FUEL_NAMES[FUELS.a92], callback_data: FUELS.a92}, 
              {text: FUEL_NAMES[FUELS.a95], callback_data: FUELS.a95},
              {text: FUEL_NAMES[FUELS.a95p], callback_data: FUELS.a95p}
            ],
            [
              {text: FUEL_NAMES[FUELS.gs], callback_data: FUELS.gs}
            ],
            [
              {text: 'Clear', callback_data: 'clear_fuels'}
            ]
          ] 
        }
      })
  })

  bot.command('location', async (ctx) => {
    await requestLocation(ctx)
  })

  bot.command('subscribe', async (ctx) => {
    await usersDAO.updateOne({tgId: ctx.from.id}, {subscribed: true}) 
    await bot.telegram.sendMessage(ctx.chat.id, 'Successfully subscribed')
  })

  bot.command('unsubscribe', async (ctx) => {
    await usersDAO.updateOne({tgId: ctx.from.id}, {subscribed: false}) 
    await bot.telegram.sendMessage(ctx.chat.id, 'Successfully unsubscribed')
  })

  // actions 
  _.each(FUELS, (fuel) => {
    bot.action(fuel, async (ctx) => {
      await usersDAO.addFuel({tgId: ctx.from.id}, fuel) 
      await ctx.reply(`${FUEL_NAMES[fuel]} has been added your preferences`)
    })
  })
  
  bot.action('clear_fuels', async (ctx) => {
    await usersDAO.updateOne({tgId: ctx.from.id}, {fuels: []}) 
    await ctx.reply('Your preferences have been cleared')
  })

  bot.on('message', async (ctx) => {
    const location = ctx.message.location
    if (location) {
      await usersDAO.updateOne({tgId: ctx.from.id}, {location})
    }
  })

  return bot
}

module.exports = {
  createBot
}

