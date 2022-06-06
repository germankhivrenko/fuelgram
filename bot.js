const _ = require('lodash')
const {Telegraf} = require('telegraf')
const {FUELS, FUEL_NAMES, MEANS, MEAN_NAMES, BRAND_NAMES} = require('./const')

const formatSettingsMsg = (user) => {
  if (!user) return 'restart bot - /start'
  const {fuels, maxDistance, location} = user
  const fuelsStr = _.chain(fuels).map((fuel) => FUEL_NAMES[fuel]).join(', ').value()
  const locationStr = location ? '' : ' (Залишилось поділитись локацією - /location)'
  return `Ви отримуватимите сповіщення про появу: ${fuelsStr} в радіусі ${maxDistance/1000} км${locationStr}`
}

const createBot = ({usersDAO, db}) => {
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
  const requestFuels = (ctx) => {
    return bot.telegram.sendMessage(
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
  }
  
  bot.start(async (ctx) => {
    await ctx.reply('Ласкаво просимо!\n' +
      'Цей бот допоможе слідкувати на наявністю потрібного палива на АЗС навколо тебе.\n' +
      'Шукай паливо доступне на данний момент, а також отримуй повідомлення щойно воно з\'явиться в наявності.\n\n' +
      'Для цього Вам потрібно:\n' +
      '1) Обрати паливо, за яким ви полюєте - /fuels\n' +
      // '2) Обрати способи для купівлі (чи отримання) пального (напр. готівка чи паливна карта, чи можливо ви водій спецтранспорту)\n' +
      '2) Поділитися своєю локацією - /location\n' +
      '3) Шукайте доступне на даний момент паливо - /search\n' +
      '3.1) Для отримання повідомлень Ви маєте бути підпісаним на них (Ви автоматично підписуєтесь при старті бота)\n' +
      '3.2) Оберіть бажаний радіус пошуку - /distance\n\n' +
      'P.S. на даний момент ми слідкуємо за наступними АЗК: OKKO, WOG.\n\n' +
      'P.P.S. Побажання, відгуки і т.д.: germankhivrenko@gmail.com')
      // 'Команди:\n' +
      // '/fuels - вибір пального\n' +
      // // '/means - вибір способів для купівлі/отримання пального\n' +
      // '/location - оновити свою локацію\n' +
      // '/search - знайти паливо доступне на данний момент\n' +
      // '/distance - встановити радіус пошуку\n' +
      // '/unsubscribe - скасувати підписку на повідомлення\n' +
      // '/subscribe - підписатися на повідомлення\n')
    const user = {tgId: ctx.from.id}
    const foundUser = await usersDAO.findOne(user)
    const maxDistance = _.get(foundUser, 'maxDistance') || 50000
    await usersDAO.upsertOne(user, {...user, maxDistance, subscribed: true}) 
    // await requestLocation(ctx)
  })

  // commands
  bot.command('fuels', async (ctx) => {
    await requestFuels(ctx)
  })

  // bot.command('means', async (ctx) => {
  //   await bot.telegram.sendMessage(
  //     ctx.chat.id,
  //     'Оберіть доступні Вам способи купівлі/отримання пального',
  //     {
  //       reply_markup: {
  //         inline_keyboard: [
  //           [
  //             {text: MEAN_NAMES[MEANS.cash], callback_data: MEANS.cash},
  //           ],
  //           [
  //             {text: MEAN_NAMES[MEANS.fuel_card], callback_data: MEANS.fuel_card},
  //             {text: MEAN_NAMES[MEANS.brand_wallet], callback_data: MEANS.brand_wallet}
  //           ],
  //           [
  //             {text: MEAN_NAMES[MEANS.coupon], callback_data: MEANS.coupon},
  //             {text: MEAN_NAMES[MEANS.special_transport], callback_data: MEANS.special_transport}
  //           ],
  //           [
  //             {text: 'Очистити', callback_data: 'clear_means'}
  //           ]
  //         ] 
  //       }
  //     })
  // })

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

  bot.command('search', async (ctx) => {
    const user = await usersDAO.findOne({tgId: ctx.from.id}) 
    
    if (_.isEmpty(user.fuels)) {
      await ctx.reply(`Ви не маєте жодного обраного пального`)
      await requestFuels(ctx)
      return
    }
    if (_.isEmpty(user.location)) {
      await ctx.reply('Для пошуку ви повинні поділитися своєю локацією')
      await requestLocation(ctx)
      return
    }

    const query = _.reduce(user.fuels, (acc, fuel) => {
      acc.$or.push({[`fuels.${fuel}.means.cash`]: {$exists: true}})
      return acc
    }, {$or: []})
    // TODO: sort by distance
    const stations = await db.collection('stations').aggregate(
      [
        {
          $geoNear: {
            near: user.location,
            distanceField: 'distance',
            maxDistance: user.maxDistance,
            spherical: true,
            query
          }
        }
      ])

    if (!(await stations.hasNext())) {
      await bot.telegram.sendMessage(
        user.tgId,
        `Нічого не знайдено`)
      return
    }

    for await (const station of stations) {
      const {desc, brand, address, distance, fetchedAt, location: {coordinates: [longitude, latitude]}} = station
      const distanceKm = (station.distance / 1000).toFixed(1)
      try {
        await bot.telegram.sendMessage(
          user.tgId,
          `${BRAND_NAMES[brand]}, ${address} (${distanceKm} км)\n\n` +
          `${desc}\n\n` + `P.S. дані на ${fetchedAt.toLocaleTimeString()}`)
        await bot.telegram.sendLocation(user.tgId, latitude, longitude)
      } catch(err) {
        console.error(err)
      }
    }
  })

  bot.command('distance', async (ctx) => {
    await bot.telegram.sendMessage(
      ctx.chat.id,
      'Оберіть радіус пошуку',
      {
        reply_markup: {
          inline_keyboard: [
            [
              {text: '20 км', callback_data: '20km'},
              {text: '50 км', callback_data: '50km'},
              {text: '100 км', callback_data: '100km'}
            ]
          ] 
        }
      })
  })

  // actions 
  _.each(FUELS, (fuel) => {
    bot.action(fuel, async (ctx) => {
      await usersDAO.addFuel({tgId: ctx.from.id}, fuel) 
      const user = await usersDAO.findOne({tgId: ctx.from.id})
      await ctx.reply(formatSettingsMsg(user))
    })
  })
  
  bot.action('clear_fuels', async (ctx) => {
    await usersDAO.updateOne({tgId: ctx.from.id}, {fuels: []}) 
    await ctx.reply('Усі види палива видалені з пошуку')
  })

  // _.each(MEANS, (mean) => {
  //   bot.action(mean, async (ctx) => {
  //     await usersDAO.addMean({tgId: ctx.from.id}, mean) 
  //     await ctx.reply(`${MEAN_NAMES[mean]} додано як спосіб купівлі/отримання`)
  //   })
  // })

  // bot.action('clear_means', async (ctx) => {
  //   await usersDAO.updateOne({tgId: ctx.from.id}, {means: []}) 
  //   await ctx.reply('Усі способи купівлі/отримання видалені')
  // })
  
  bot.action('20km', async (ctx) => {
    await usersDAO.updateOne({tgId: ctx.from.id}, {maxDistance: 20000}) 
    const user = await usersDAO.findOne({tgId: ctx.from.id})
    await ctx.reply(formatSettingsMsg(user))
  })
  bot.action('50km', async (ctx) => {
    await usersDAO.updateOne({tgId: ctx.from.id}, {maxDistance: 50000}) 
    const user = await usersDAO.findOne({tgId: ctx.from.id})
    await ctx.reply(formatSettingsMsg(user))
  })
  bot.action('100km', async (ctx) => {
    await usersDAO.updateOne({tgId: ctx.from.id}, {maxDistance: 100000}) 
    const user = await usersDAO.findOne({tgId: ctx.from.id})
    await ctx.reply(formatSettingsMsg(user))
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

