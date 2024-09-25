const mongoose = require('mongoose')
const { Schema } = mongoose;

const walletSchema = new Schema({
    userId: {
        type: Schema.ObjectId,
        ref: 'user',
        require: true
    },
    balance: {
        type: Number,
        default: 0
    },
    history: [
        {
            amount: {
                type: Number
            },
            type: {
                type: String,
                enum: ['credit', 'debit']
            },
            createdAt: {
                type: Date,
                default: () => Date.now()
            }
        }
    ],
})

module.exports = mongoose.model("Wallet", walletSchema)   