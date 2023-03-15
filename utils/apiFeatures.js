class ApiFeatures {
  constructor(query, queryString) {
    this.query = query;
    this.queryString = queryString;
  }
  filter() {
    let queryObj = { ...this.queryString };
    const excludedFields = ["page", "sort", "limit", "field"];
    excludedFields.forEach((el) => {
      delete queryObj[el];
    });
    let queryStr = JSON.stringify(queryObj);
    queryStr = queryStr.replace(
      /\b(gt|gte|lt|lte|ne)\b/g,
      (match) => `$${match}`
    );
    this.query = this.query.find(JSON.parse(queryStr));

    return this;
  }

  sort() {
    if (this.queryString.sort) {
      const sortedBy = JSON.stringify(this.queryString.sort)
        .split(",")
        .join(" ");
      this.query = this.query.sort(JSON.parse(sortedBy));
    }
    return this;
  }

  limitFields() {
    if (this.queryString.fields) {
      console.log(this.queryString.fields);
      const desiredFields = JSON.stringify(this.queryString.fields)
        .split(",")
        .join(" ");
      this.query = this.query.select(JSON.parse(desiredFields));
    } else {
      this.query = this.query.select("-__v");
    }
    return this;
  }

  pagination() {
    const limit = this.queryString.limit * 1 || 100;
    const page = this.queryString.page * 1 || 1;
    const skip = (page - 1) * limit;
    this.query = this.query.skip(skip).limit(limit);

    return this;
  }
}

module.exports = ApiFeatures;
