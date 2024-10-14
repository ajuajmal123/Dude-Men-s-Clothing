const mongoose = require("mongoose");

const wishlistSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Types.ObjectId,
        ref: "User",
        required: true,
    },
    productId:
    {
        type: mongoose.Types.ObjectId,
        ref: "Products",
        required: true,
    },

});

module.exports = mongoose.model("wishlist", wishlistSchema);