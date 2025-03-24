const mongoose = require("./db")

let info = mongoose.Schema({
    name:String,
    address:String,
    phone:String,
    email:String,
    yingyezhizhao:String,
    shopimg:String,
    door:String,
    cates:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'cates'
    },
    startTime:String,
    endTime:String,
    status:Number,
    regtime:String
})

let catelist = mongoose.Schema({
    name:String,
})
let dingdan = mongoose.Schema({
    name:String,
    status:String,
    time:String,
    shoplist:{
        type:Array,
        default:[]
    }
})

let cateModel = mongoose.model("cates", catelist, "cates")

let infoModel = mongoose.model("info", info, "info")
module.exports ={
    infoModel,
    cateModel,
}
