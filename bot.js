const _ = require('lodash')
const {Telegraf} = require('telegraf')
const {FUELS, FUEL_NAMES, MEANS, MEAN_NAMES} = require('./const')

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
    const user = {tgId: ctx.from.id}
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

  bot.command('means', async (ctx) => {
    await bot.telegram.sendMessage(
      ctx.chat.id,
      'Choose your purchase possibilities',
      {
        reply_markup: {
          inline_keyboard: [
            [
              {text: MEAN_NAMES[MEANS.cash], callback_data: MEANS.cash},
              {text: MEAN_NAMES[MEANS.fuel_card], callback_data: MEANS.fuel_card},
              {text: MEAN_NAMES[MEANS.brand_wallet], callback_data: MEANS.brand_wallet}
            ],
            [
              {text: MEAN_NAMES[MEANS.coupon], callback_data: MEANS.coupon},
              {text: MEAN_NAMES[MEANS.special_transport], callback_data: MEANS.special_transport}
            ],
            [
              {text: 'Clear', callback_data: 'clear_means'}
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

  _.each(MEANS, (mean) => {
    bot.action(mean, async (ctx) => {
      await usersDAO.addMean({tgId: ctx.from.id}, mean) 
      await ctx.reply(`${MEAN_NAMES[mean]} has been added your purchase means`)
    })
  })

  bot.action('clear_means', async (ctx) => {
    await usersDAO.updateOne({tgId: ctx.from.id}, {means: []}) 
    await ctx.reply('Your purchase means have been cleared')
  })

  bot.on('message', async (ctx) => {
    const location = ctx.message.location
    if (location) {
      const {longitude, latitude} = location
      await usersDAO.updateOne({tgId: ctx.from.id}, {
        location: {
          type: 'Point',
          coordinates: [longitude, latitude]
        }
      })
    }
  })

  return bot
}

module.exports = {
  createBot
}

