const {strict: assert} = require('assert')
const _ = require('lodash')
const {describe, it} = require('mocha')
const sinon = require('sinon')
const {Controller} = require('../controller')

describe('Controller', function() {
  it('handleStationChange', async function() {
    const id = 'test'
    const stationUpdate = {
     fetchedAt: new Date('2022-06-02T11:36:07.067Z'),
     location: { type: 'Point', coordinates: [ 27.557071, 50.184329 ] },
     fuels: {
       ds: {
         inStock: true,
         desc: 'ДП - тільки спецтранспорт.',
         means: { special_transport: 'unknown' }
       },
       a92: { inStock: false, desc: 'А92 - Пальне відсутнє.', means: null },
       a95: {
         inStock: true,
         desc: 'А95 - тільки спецтранспорт.',
         means: { special_transport: 'unknown' }
       },
       a95p: {
         inStock: true,
         desc: 'М95 - Готівка, банк.картки 20л. Гаманець ПРАЙД до 100л. Талони до 40л. Паливна картка (ліміт картки).',
         means: {
           cash: '20л',
           brand_wallet: '100л',
           coupon: '40л',
           fuel_card: 'ліміт картки'
          }
        }
      }
    }
    const stationsDAO = {
      findOne: () => ({id, ...stationUpdate})
    }
    const usersDAO = {
      findNear: () => ([
        {
      	  _id : 'test1',
      	  tgId: 244585129,
      	  subscribed: true,
      	  location: {
      	  	type: 'Point',
      	  	coordinates: [
      	  		28.638315,
      	  		50.131368
      	  	]
      	  },
      	  means: [
      	  	'cash',
      	  	'special_transport',
      	  	'coupon',
      	  	'brand_wallet',
      	  	'fuel_card'
      	  ],
      	  fuels: [
      	  	'ds',
      	  	'dsp'
      	  ],
      	  maxDistance: 100000
        },
        {
      	  _id : 'test2',
      	  tgId: 244585120,
      	  subscribed: true,
      	  location: {
      	  	type: 'Point',
      	  	coordinates: [
      	  		28.638315,
      	  		50.131368
      	  	]
      	  },
      	  means: [
      	  	'cash',
      	  	'special_transport',
      	  	'coupon',
      	  	'brand_wallet',
      	  	'fuel_card'
      	  ],
      	  fuels: [
      	  	'ds',
      	  	'dsp'
      	  ],
      	  maxDistance: 100000
        }
      ])
    }
    const notifier = {
      notifyUser: _.noop
    }
    const spy = sinon.spy(notifier, 'notifyUser')

    const controller = new Controller(stationsDAO, usersDAO, notifier)
    await controller.handleStationChange(id, stationUpdate)
    
    assert(spy.calledTwice)
  })
})

