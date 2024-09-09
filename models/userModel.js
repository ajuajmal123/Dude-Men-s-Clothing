const mongoose= require('mongoose')

const userSchema=mongoose.Schema({

name:{
    type:String,
    required:true
},
email:{
    type:String,
    required:true
},
password:{
    type:String,
    required:false
},
mobile:{
    type:String,
    required:false,
    sparse:true,
    unique:true,
    default:null    
},
googleId:{
type:String,
unique:true
},
is_admin:{
    type:Number,
    required:false
},
blocked: {
     type: Number,
     default: 0 } 
})

module.exports= mongoose.model('User',userSchema)