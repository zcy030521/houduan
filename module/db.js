let mongoose = require('mongoose');
mongoose.connect("mongodb+srv://2956239093:zcy.521521@cluster0.a6g8b.mongodb.net/myfirstdata");

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