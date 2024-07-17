const mongoose = require('mongoose');

const OTPSchema = new mongoose.Schema({
    
      otp: {
        type: String,
        required: true,
      },
      email:{
        type:String,
        required:true
      },
      createdAt: { 
        type: Date,
        default: Date.now,
        expires: 60,
      }
});

module.exports = mongoose.model("userOTP",OTPSchema)