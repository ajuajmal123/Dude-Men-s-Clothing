const mongoose= require('mongoose')
const categorySchema = new mongoose.Schema({
    cat_name:{
        type:String,
        required:true
    },
    cat_status:{
        type:Boolean,
        required:true,
        default:true
    },
    delete:{
        type:Boolean,
        required:true,
        default:false
    }, 
    offer:{
        type:Number,
        default:0
    },
    expirationDate: {
         type: Date
        },
    OfferisActive:{
        type:Boolean,
        default:true
    },
}
)

module.exports = mongoose.model('Category',categorySchema);