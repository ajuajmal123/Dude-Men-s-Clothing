const mongoose = require('mongoose');

const cartSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user',
        required: true
    },
    products: [
        {
            productId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Products',
                required: true
            },
            quantity: {
                type: Number,
                required: true,
                default: 1 // Initial quantity set to 1
            },
            price:{
                type:Number,
                default:0
            },
            size:
                 { type: String, 
                   required: true 
                }
           
        }
    ]
});

module.exports = mongoose.model('Cart', cartSchema);