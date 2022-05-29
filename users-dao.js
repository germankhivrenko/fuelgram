class UsersDAO {
  constructor(db) {
    this._coll = db.collection('users')
  }

  upsertOne(filter, data) {
    const options = {upsert: true}
    const update = {$set: data}
    
    return this._coll.updateOne(filter, update, options)
  }

  updateOne(filter, data) {
    const update = {$set: data}
    
    return this._coll.updateOne(filter, update)
  }

  addFuel(filter, fuel) {
    const update = {$addToSet: {fuels: fuel}}
    
    return this._coll.updateOne(filter, update)
  }

  addMean(filter, mean) {
    const update = {$addToSet: {means: mean}}
    
    return this._coll.updateOne(filter, update)
  }
}

module.exports = {
  UsersDAO
}

