class StationsDAO {
  constructor(db) {
    this._db = db
  }

  findOne(filter) {
    return this._db.collection('stations').findOne(filter)
  }
}

module.exports = {
  StationsDAO
}

