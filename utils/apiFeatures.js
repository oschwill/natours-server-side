class APIFeatures {
  constructor(query, queryString) {
    this.query = query;
    this.queryString = queryString;
  }

  filter() {
    // 1A) Filtering
    const queryObj = { ...this.queryString }; // Eine harte Kopie erzeugen!! DA => const queryObj = req.query nur eine Referenz wäre
    const excludeFields = ['page', 'sort', 'limit', 'fields']; // Felder die gelöscht werden müssen, da diese nicht den Filterkriterien entsprechen sondern für das Sorting da sind
    excludeFields.forEach(el => delete queryObj[el]); // Die Felder in excludeFields löschen
    // ein anderer Weg die Felder aus dem Object zu löschen
    // const { page, sort, limit, fields, ...rest } = req.query;
    // await Tour.find(rest);

    // 1B) Advanced Filtering
    let queryStr = JSON.stringify(queryObj);
    queryStr = queryStr.replace(/\b(gte|gt|lte|lt)\b/g, match => `$${match}`); // exakte Wörter finden und austauschen

    /* 1. Variante zu filtern */
    this.query = this.query.find(JSON.parse(queryStr));

    return this;
  }

  sort() {
    // 2) Sorting / Sortierung nach z.B. price etc.
    if (this.queryString.sort) {
      // aus der den query PArametern { sort: '-price,ratingsAverage' } machen wir -price ratingsAverage
      const sortBy = this.queryString.sort.split(',').join(' '); // replace das Komma mit einem Leerzeichen
      this.query = this.query.sort(sortBy); // sort(price ratingsAverage)
      // sort('price ratingsAverage')
    } else {
      this.query = this.query.sort('-createdAt'); // Wenn keine manuelle Sortierung vorhanden ist, dann soll default nach createAt sortiert werden
    }

    return this;

    /* 2. Variante zu filtern */
    // const query = Tour.find()
    //   .where('duration')
    //   .equals(5)
    //   .where('difficulty')
    //   .equals('easy');
  }

  limitFields() {
    // 3) Field Limiting / Limitierung auf bestimmte Felder z.B. nur Price und Duration
    if (this.queryString.fields) {
      const fields = this.queryString.fields.split(',').join(' ');
      this.query = this.query.select(fields);
    } else {
      this.query = this.query.select('-__v'); // Wir excluden das __v aus. Das __v erzeugt MongoDB automatisch und wird von Mongoose genutzt!
    }

    return this;
  }

  paginate() {
    // 4) Pagination
    const page = this.queryString.page * 1 || 1;
    const limit = this.queryString.limit * 1 || 100;
    const skip = (page - 1) * limit;
    // page=2&limit=10
    this.query = this.query.skip(skip).limit(limit);

    return this;
  }
}

module.exports = APIFeatures;
