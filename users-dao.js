class UsersDAO {
  constructor(db) {
    this._db = db
  }

  findOne(filter) {
    return this._db.collection('users').findOne(filter)
  }

  findNear({location, maxDistance, filterByDistance, query}) {
    const pipeline = [
      {
        $geoNear: {
          near: location,
          distanceField: 'distance',
          maxDistance: maxDistance,
          spherical: true,
          query
        }
      }
    ]

    if (filterByDistance) {
      pipeline.push({
        $match: {
          $expr: {$lte: ['$distance', '$maxDistance']}
        }
      })
    }

    return this._db.collection('users').aggregate(pipeline)
  }

  upsertOne(filter, data) {
    const options = {upsert: true}
    const update = {$set: data}
    
    return this._db.collection('users').updateOne(filter, update, options)
  }

  updateOne(filter, data) {
    const update = {$set: data}
    return this._db.collection('users').updateOne(filter, update)
  }

  addFuel(filter, fuel) {
    const update = {$addToSet: {fuels: fuel}}
    return this._db.collection('users').updateOne(filter, update)
  }

  addMean(filter, mean) {
    const update = {$addToSet: {means: mean}}
    
    return this._db.collection('users').updateOne(filter, update)
  }
}

module.exports = {
  UsersDAO
}

