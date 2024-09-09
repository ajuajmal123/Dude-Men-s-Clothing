const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const orderSchema = new Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user',
        required: true
    },
    address: {
        name: {
            type: String,
            required: true
          },
          mobile: {
            type: Number, 
            required: true
          },
          address: {
            type: String,
            required: true
          },
          pincode: {
            type: Number, 
            required: true
          },
          state: {
            type: String,
            required: true
          },
          district: {
            type: String,
            required: true
          },
          city: {
            type: String,
            required: true
          }
    },
    items: [
        {
            productId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Products',
                required: true
            },
            deliveryStatus: {
                type: String,
                enum: ['Payment Pending', 'Processing', 'Cancelled', 'Delivered' , 'Returned','Return Requested'], 
                default: 'Processing' 
            },
            quantity: {
                type: Number,
                required: true,
                default: 1 
            },
            price:{
                type:Number,
                default:0
            },
            returnReason: {
                type: String,
                default: ''
            }
           
        }
    ],
    paymentMethod: {
        type: String,
        enum: ['Cash on Delivery', 'Online payment', 'Online', 'Wallet'],
        required: true
    },
    deliveryCharge: {
        type: Number,
        default: 0
    },
    couponDiscount: {
         type: Number,
        
         },
    totalAmount: {
        type: Number,
        required: true
    },
    status: {
        type: String,
        enum: ['paid', 'unpaid','pending','retry done'],
        default: 'unpaid'
    },
  
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Order', orderSchema);