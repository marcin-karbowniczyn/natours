class APIFeatures {
    constructor(query, queryString) {
      this.query = query;
      this.queryString = queryString;
    }
  
    filter() {
      // 1A) Filtering
      const queryObj = { ...this.queryString }; // Tworzymy nowy obiekt za pomocą destructuring
  
      const excludedFields = ['page', 'sort', 'limit', 'fields']; // Musimy pozbyć się tych properties, żeby móc wyszukać potrzebne nam wyniki a dopiero później je posortować, dodać strony itd.
      excludedFields.forEach(el => delete queryObj[el]);
  
      // 1B) Advanced filtering
      let queryStr = JSON.stringify(queryObj);
  
      // Funkcja replace akceptuje callback, którego 1 argumentem jest pasujący wyraz (odnaleziony).
      queryStr = queryStr.replace(/\b(gte|gt|lte|lt)\b/g, match => `$${match}`);
      
      this.query = this.query.find(JSON.parse(queryStr));
  
      return this; // Musimy zwrócić ten obiekt, żeby móc połączyć ze sobą metody takie jak filter, sort itd.
    }
  
    sort() {
      if (this.queryString.sort) {
        const sortBy = this.queryString.sort.split(',').join(' '); // syntax req.query.sort('x y')
        this.query = this.query.sort(sortBy); // req.query.sort === price jeśli URL to "api/tours?sort=price"
      } else {
        this.query = this.query.sort('-createdAt'); // '-' oznacza od największej do najmniejszej
      }
      return this;
    }
  
    limitFields() {
      if (this.queryString.fields) {
        const fields = this.queryString.fields.split(',').join(' ');
        this.query = this.query.select(fields); // Selecting certain field names is called PROJECTING
      } else {
        this.query = this.query.select('-__v'); // '-' === exclude (not include)!!!!!
      }
      return this;
    }
  
    paginate() {
      const page = this.queryString.page * 1 || 1; // 1 to domyślna wartość, jeśli żadna inna nie została wprowadzona.
      const limit = this.queryString.limit * 1 || 100; // req.query.limit * 1 === parseInt(req.query.limit)
      const skip = (page - 1) * limit; // page=2&limit=10, 1-10 is page 1, 11-20 is page 2, 21-30 is page 3, etc.
  
      this.query = this.query.skip(skip).limit(limit);
  
      return this;
    }
  }

module.exports = APIFeatures;