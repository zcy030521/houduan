let mongoose = require('mongoose');
mongoose.connect("mongodb+srv://2956239093:zcy.521521@cluster0.a6g8b.mongodb.net/myfirstdata");

let LY = new mongoose.Schema({
    key:String,
    label:String,
    p_id:{
        type:mongoose.Types.ObjectId,
        ref:'LY'
    },
    level:Number
});
let Login =new mongoose.Schema({
    user:String,
    pwd:String,
    email:{
        type:String,
        default:''
    },
    phone:{
        type:String,
        default:''
    },
    img:{
        type:String,
        default:"http://localhost:3100/images/header.jpg"
    }
})
let LYModel = mongoose.model('LY', LY);
let LoginModel = mongoose.model('Login', Login);
module.exports = {
    LYModel,
    LoginModel
};
// let LY = new mongoose.Schema({
//     key:String,
//     label:String,
//     p_id:{
//         type:mongoose.Types.ObjectId,
//         ref:'LY'
//     },
//     level:Number
// });
// let LYModel = mongoose.model('LY', LY);
// module.exports = {
//     LYModel,
// };

module.exports = mongoose;