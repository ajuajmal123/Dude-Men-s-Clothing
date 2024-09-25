const Product = require("../models/productModel");
const User = require("../models/userModel");
const Category = require("../models/categoryModel");

const get_searchedProducts = async (req, res) => {
  try {
    const priceRange = req.query.priceRange;
    const sortBy = req.query.sortBy;

    let query = { delete: false };
    let sortCriteria = {};

    if (priceRange) {
      const [minPrice, maxPrice] = priceRange.split('-').map(Number);
      query.selling_price = { $gt: minPrice, $lte: maxPrice };
    }

    switch (sortBy) {
      case "lowToHigh":
        sortCriteria.selling_price = 1;
        break;
      case "highToLow":
        sortCriteria.selling_price = -1;
        break;
      case "aA-zZ":
        sortCriteria.product_name = 1;
        break;
      case "zZ-aA":
        sortCriteria.product_name = -1;
        break;

    }

    const products = await Product.find(query).populate("category_id").sort(sortCriteria);
    const totalCount = await Product.countDocuments({ delete: false });

    // Retrieve categories, and colors for filtering
    const categories = await Category.find({ cat_status: true });

    const uniqueColors = await Product.distinct("color", { delete: false });

    const user = req.session.user_id;

    // Render the filter page with the retrieved data
    res.render("filter", {
      user,
      totalCount,
      categories,
      uniqueColors,
      products
    });
  } catch (error) {
    console.error("Error fetching products:", error);
    res.status(500).send("Internal Server Error");
  }
};

module.exports = {
  get_searchedProducts,
};