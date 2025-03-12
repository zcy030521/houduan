const mongoose = require("./db")

let cate = new mongoose.Schema({
    name:String,
})
let catemodel = mongoose.model("cate", cate, "cate")
let shoplist = new mongoose.Schema({
    name:String,
    price:Number,
    img:String,
    description:String,
    category:String,
})
let shopmodel = mongoose.model("shoplist", shoplist, "shoplist")

module.exports = {
    catemodel,
    shopmodel
}