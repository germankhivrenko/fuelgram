const _ = require('lodash')
const {Telegraf} = require('telegraf')
const {FUELS, FUEL_NAMES, MEANS, MEAN_NAMES} = require('./const')

// commands: start, fuels, means, location, subscribe, unsubscribe
const createBot = ({usersDAO}) => {
  const bot = new Telegraf(process.env.BOT_TOKEN)
  const requestLocation = (ctx) => {
    return bot.telegram.sendMessage(
      ctx.chat.id,
      'Поділіться своєю локацією',
      {
        reply_markup: {
          one_time_keyboard: true,
          keyboard: [
            [{text: 'Поділитися локацією', request_location: true}]
          ]
        }
      })
  }
  
  bot.start(async (ctx) => {
    await ctx.reply('Ласкаво просимо!\n' +
      'Я допоможу слідкувати на наявністю потрібного палива на АЗС навколо тебе (100 км).\n\n' +
      'Для пошуку Вам потрібно:\n' +
      '1) Обрати паливо, за яким ви полюєте\n' +
      '2) Обрати способи для купівлі (чи отримання) пального (напр. готівка чи паливна карта, чи можливо ви водій спецтранспорту)\n' +
      '3) Поділитися своєю локацією\n' +
      '4) Бути підпісаним на повідомлення (Ви автоматично підписуєтесь при старті бота)\n\n' +
      'Команди:\n' +
      '/fuels - вибір пального\n' +
      '/means - вибір способів для купівлі/отримання пального\n' +
      '/location - оновити свою локацію\n' +
      '/unsubscribe - скасувати підписку на повідомлення\n' +
      '/subscribe - підписатися на повідомлення\n')
    const user = {tgId: ctx.from.id}
    await usersDAO.upsertOne(user, {...user, subscribed: true}) 
    // await requestLocation(ctx)
  })

  // commands
  bot.command('fuels', async (ctx) => {
    await bot.telegram.sendMessage(
      ctx.chat.id,
      'Виберіть пальне для стежки',
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
              {text: 'Очистити', callback_data: 'clear_fuels'}
            ]
          ] 
        }
      })
  })

  bot.command('means', async (ctx) => {
    await bot.telegram.sendMessage(
      ctx.chat.id,
      'Оберіть доступні Вам способи купівлі/отримання пального',
      {
        reply_markup: {
          inline_keyboard: [
            [
              {text: MEAN_NAMES[MEANS.cash], callback_data: MEANS.cash},
            ],
            [
              {text: MEAN_NAMES[MEANS.fuel_card], callback_data: MEANS.fuel_card},
              {text: MEAN_NAMES[MEANS.brand_wallet], callback_data: MEANS.brand_wallet}
            ],
            [
              {text: MEAN_NAMES[MEANS.coupon], callback_data: MEANS.coupon},
              {text: MEAN_NAMES[MEANS.special_transport], callback_data: MEANS.special_transport}
            ],
            [
              {text: 'Очистити', callback_data: 'clear_means'}
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
    await bot.telegram.sendMessage(ctx.chat.id, 'Ви підписались на повідомлення')
  })

  bot.command('unsubscribe', async (ctx) => {
    await usersDAO.updateOne({tgId: ctx.from.id}, {subscribed: false}) 
    await bot.telegram.sendMessage(ctx.chat.id, 'Ви скасували підписку на повідомлення')
  })

  // actions 
  _.each(FUELS, (fuel) => {
    bot.action(fuel, async (ctx) => {
      await usersDAO.addFuel({tgId: ctx.from.id}, fuel) 
      await ctx.reply(`${FUEL_NAMES[fuel]} доданий до пошуку`)
    })
  })
  
  bot.action('clear_fuels', async (ctx) => {
    await usersDAO.updateOne({tgId: ctx.from.id}, {fuels: []}) 
    await ctx.reply('Усі види палива видалені з пошуку')
  })

  _.each(MEANS, (mean) => {
    bot.action(mean, async (ctx) => {
      await usersDAO.addMean({tgId: ctx.from.id}, mean) 
      await ctx.reply(`${MEAN_NAMES[mean]} додано як спосіб купівлі/отримання`)
    })
  })

  bot.action('clear_means', async (ctx) => {
    await usersDAO.updateOne({tgId: ctx.from.id}, {means: []}) 
    await ctx.reply('Усі способи купівлі/отримання видалені')
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

