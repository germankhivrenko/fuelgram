const _ = require('lodash')
const {Telegraf} = require('telegraf')

// commands: start, fuels, subscribe, unsubscribe
const createBot = ({usersDAO}) => {
  const bot = new Telegraf(process.env.BOT_TOKEN)
  
  bot.start(async (ctx) => {
    await ctx.reply('Welcome to Fuel Master\n' +
      '/fuels - to choose fuels you want to watch\n' +
      '/unsubscribe - to unsubscribe from notifications\n' +
      '/subscribe - to subscribe back\n')
    const user = {tgId: ctx.from.id}
    await usersDAO.upsertOne(user, {...user, subscribed: true}) 
  })

  // constants
  const FUELS = {
    ds: 'ds',
    dsp: 'dsp',
    a92: 'a92',
    a95: 'a95',
    a95p: 'a95p',
    gs: 'gs'
  }
  const FUEL_NAMES = {
    [FUELS.ds]: 'Diesel',
    [FUELS.dsp]: 'Diesel Premium',
    [FUELS.a92]: 'A92',
    [FUELS.a95]: 'A95',
    [FUELS.a95p]: 'A95 Premium',
    [FUELS.gs]: 'Gas',
  }

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

  return bot
}

module.exports = {
  createBot
}

