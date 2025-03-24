var express = require('express');
var router = express.Router();
let { userModel, LYModel, roleModel } = require("../module/modules")
let { shopmodel, catemodel, inventorymodel, descriptionmodel } = require("../module/shopmodule")
let { infoModel, cateModel } = require("../module/tuanzhangmodel")
let jwt = require('jsonwebtoken');
const xlsx = require('xlsx');
const Excel = require('exceljs');
const workbook = new Excel.Workbook();

var multiparty = require('multiparty')
var fse = require('fs-extra')
var path = require('path');
// 定义uploads目录
const UPLOAD_DIR = path.resolve(__dirname, '../uploads')

// 存储导入进度的对象
const importProgress = {};

// 提取文件扩展名
const extractExt = filename => filename.slice(filename.lastIndexOf('.'))

// 处理分片上传
router.post('/upload', function (req, res) {
  const form = new multiparty.Form();
  form.parse(req, async (err, fields, files) => {
    console.log(fields);

    // fields中存储的是前端传递fileHash和thunkHash
    // files中存储的是上传文件的切片
    if (err) {
      return res.status(500).json({ ok: false, msg: "上传失败" });
    }

    // 获取fileHash和thunkHash
    const fileHash = fields['fileHash'][0];  // 文件哈希值
    const chunkHash = fields['thunkHash'][0];  // 切片哈希值
    console.log(fileHash, chunkHash);

    // const fileName = fields['fileName'][0];
    // 存放当前文件的所有切片的路径
    const chunkDir = path.resolve(UPLOAD_DIR, `${fileHash}`);

    // if (fse.existsSync(chunkDir)) {
    //   console.log('已存在');
    //   return
    // }

    // 创建存放切片的目录（如果不存在）
    if (!fse.existsSync(chunkDir)) {
      await fse.ensureDir(chunkDir);
    }

    // 将切片移动到thunkDir
    const oldPath = files['thunk'][0]['path'];  // 上传的临时文件路径
    const chunkPath = path.resolve(chunkDir, chunkHash);  // 目标路径
    console.log(oldPath, chunkPath);

    // 移动文件到切片目录
    await fse.move(oldPath, chunkPath, { overwrite: true });

    res.status(200).json({ ok: true, msg: '切片上传成功' });
  });
});


// 处理文件合并
router.post('/merge', async (req, res) => {
  const { fileHash, fileName, size } = req.body;
  // fileHash文件唯一id
  // fileName文件名
  // size切片大小

  // 合成后文件路径
  const filePath = path.resolve(UPLOAD_DIR, fileHash + extractExt(fileName));
  // 存放切片的目录
  const chunkDir = path.resolve(UPLOAD_DIR, fileHash);

  if (!fse.existsSync(chunkDir)) {
    return res.status(400).json({ ok: false, msg: '切片目录不存在' });
  }

  // 获取所有切片文件
  const chunkPaths = await fse.readdir(chunkDir);
  // 对切片进行排序
  chunkPaths.sort((a, b) => parseInt(a.split('-')[1]) - parseInt(b.split('-')[1]));

  // 逐个合并切片
  for (let i = 0; i < chunkPaths.length; i++) {
    // 当前切片的路径
    const chunkPath = path.resolve(chunkDir, chunkPaths[i]);
    // 创建写入流，使用追加方式
    const writeStream = fse.createWriteStream(filePath, { flags: "a" });
    await new Promise((resolve) => {
      // 异步方法，读取当前切片内容
      const readStream = fse.createReadStream(chunkPath);
      // 将readStream的值进行追加
      readStream.pipe(writeStream);
      // 监听end事件，将合并完的切片进行删除
      readStream.on("end", async () => {
        await fse.unlink(chunkPath);  // 删除切片
        resolve();
      });
    });
  }

  await fse.remove(chunkDir);  // 删除存放切片的目录

  // Start processing the Excel file after sending the response
  res.status(200).json({ ok: true, msg: '文件合并成功，开始处理数据导入...' });

  // 优化Excel处理，支持大数据量导入
  const processExcelFile = async (filePath) => {
    try {
      console.log(`开始处理Excel文件: ${filePath}`);

      // 读取Excel文件，使用stream方式处理大文件
      const workbook = xlsx.readFile(filePath, {
        cellFormula: false,  // 禁用公式解析以提高性能
        cellStyles: false,   // 禁用样式解析以提高性能
        cellNF: false,       // 禁用数字格式解析以提高性能
      });

      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];

      // 获取所有分类和标签，减少数据库查询次数
      const allCategories = await catemodel.find({}).lean();
      const allDescriptions = await descriptionmodel.find({}).lean();

      // 创建分类和标签的映射，减少查询时间
      const categoryMap = new Map();
      const descriptionMap = new Map();

      allCategories.forEach(cat => categoryMap.set(cat.name, cat._id));
      allDescriptions.forEach(desc => descriptionMap.set(desc.name, desc._id));

      // 批量处理数据，每次处理BATCH_SIZE条记录
      const BATCH_SIZE = 1000;
      let processedCount = 0;
      let errorCount = 0;
      let totalCount = 0;
      let batch = [];

      // 使用流式处理，减少内存占用
      const jsonData = xlsx.utils.sheet_to_json(worksheet);
      totalCount = jsonData.length;
      console.log(`总记录数: ${totalCount}`);

      for (const item of jsonData) {
        try {
          // 使用映射查找ID，避免数据库查询
          const categoryId = categoryMap.get(item.cate);
          const descriptionId = descriptionMap.get(item.description);

          // 如果找不到分类或标签，自动创建
          if (!categoryId && item.cate) {
            const newCategory = await catemodel.create({ name: item.cate });
            categoryMap.set(item.cate, newCategory._id);
          }

          if (!descriptionId && item.description) {
            const newDescription = await descriptionmodel.create({ name: item.description });
            descriptionMap.set(item.description, newDescription._id);
          }

          // 将处理好的数据添加到批次中
          batch.push({
            name: item.name,
            price: item.price,
            img: item.img ? [item.img] : [],
            cate: categoryMap.get(item.cate),
            number: item.number,
            description: descriptionMap.get(item.description)
          });

          // 当批次达到指定大小时，执行批量插入
          if (batch.length >= BATCH_SIZE) {
            await shopmodel.insertMany(batch, { ordered: false });
            processedCount += batch.length;
            console.log(`已处理 ${processedCount}/${totalCount} 条记录 (${Math.round((processedCount / totalCount) * 100)}%)`);
            batch = [];
          }
        } catch (err) {
          errorCount++;
          console.error(`处理记录错误: ${err.message}`);
        }
      }

      // 处理剩余的批次
      if (batch.length > 0) {
        await shopmodel.insertMany(batch, { ordered: false });
        processedCount += batch.length;
      }

      console.log(`数据导入完成。成功: ${processedCount}, 失败: ${errorCount}, 总计: ${totalCount}`);
      return { processed: processedCount, errors: errorCount, total: totalCount };
    } catch (err) {
      console.error(`处理Excel文件失败: ${err.message}`);
      return { processed: 0, errors: 1, total: 1 };
    }
  };

  // 异步处理Excel文件，不阻塞响应
  processExcelFile(`./uploads/${fileHash}${extractExt(fileName)}`).catch(err => {
    console.error('Excel处理失败:', err);
  });
});

// 获取导入进度的API
router.get('/import-progress/:fileHash', function (req, res) {
  const { fileHash } = req.params;
  if (importProgress[fileHash]) {
    res.status(200).json(importProgress[fileHash]);
  } else {
    res.status(404).json({ error: '未找到该文件的导入进度' });
  }
});

router.post("/uploadimage", async (req, res) => {
  let from = new multiparty.Form()
  from.uploadDir = "./public/images"
  from.parse(req, (err, fields, files) => {
    let file = files
    console.log(file);
    res.send({
      code: 200,
      url: "http://localhost:3100/" + file.file[0].path
    })
  })


})
router.post("/login", async (req, res) => {
  let { user, password } = req.body
  const userinfo = await userModel.findOne({ user: user })
  console.log(userinfo, user, password);

  if (!userinfo) {
    res.send({
      code: 400,
      msg: "用户不存在"
    })
    return false
  }
  if (userinfo.password !== password) {
    res.send({
      code: 400,
      msg: "密码错误"
    })
    return false
  }
  const token = jwt.sign({ userId: userinfo._id }, '2404B')
  console.log(token);
  // let list = req.get("Authorization")
  // console.log(list);
  res.send({
    code: 200,
    token,
    ...req.user
  })
})
router.get("/rolelist", async (req, res) => {
  let data = await roleModel.find()
  res.send({
    code: 200,
    data
  })
})
router.get("/li", async (req, res) => {
  let data = await LYModel.find().populate("p_id")
  res.send({
    code: 200,
    data
  })
})
router.post("/adduser", (req, res) => {
  userModel.create(req.body)
  res.send({
    code: 200,
    msg: "添加成功"
  })
})

router.post("/roleadd", async (req, res) => {
  let data = await roleModel.create(req.body)
  res.send({
    code: 200,
  })
})
router.get("/li/:id", async (req, res) => {
  let data = await roleModel.findOne({ _id: req.params.id })
  res.send({
    code: 200,
    data
  })
})
router.post("/roleupdate", async (req, res) => {
  let data = await roleModel.updateOne({ _id: req.body.id }, req.body)
  res.send({
    code: 200,
  })
})
router.post("/deljs", async (req, res) => {
  let data = await roleModel.deleteOne({ _id: req.body.id })
  res.send({
    code: 200,
  })
})

router.get("/userlist", async (req, res) => {
  let data = await userModel.find().populate("role")
  res.send({
    code: 200,
    data
  })
})
router.get("/userlist/:id", async (req, res) => {
  let data = await userModel.findOne({ _id: req.params.id })
  res.send({
    code: 200,
    data
  })
})
router.post("/userupdate", async (req, res) => {
  await userModel.updateOne({ _id: req.body.id }, req.body)
  res.send({
    code: 200,
  })
})
router.get("/list", async (req, res) => {
  let token = req.get('Authorization');
  token = token.split("Bearer ")[1];
  const { userId } = jwt.verify(token, "2404B");
  // console.log(user);
  console.log(jwt.verify(token, "2404B"));

  let data = await userModel.findOne({ _id: userId }).populate({
    path: "role",
    populate: {
      path: "permission",
      populate: {
        path: "p_id",
      }
    },
  })
  console.log(data);
  res.send({
    code: 200,
    data,
  })
})

// router.post("/login", async (req, res) => {
//   let { user, pwd } = req.body
//   let data = await LoginModel.findOne({ user, pwd })
//   if (data) res.send({ code: 200, msg: "登录成功" })
//   else res.send({ code: 404, msg: "登录失败" })
// })
const systemPrompt = `你是一个友好的多语言 AI 助手。请遵循以下规则：
1. 检测用户输入的语言，并用相同的语言回复
2. 保持专业、友好的语气
3. 回答后使用"---"作为分隔符
4. 在分隔符后提供三个相关的追问，每个以"•"开头
5. 相关问题使用与用户相同的语言`;

router.post('/chat', async (req, res) => {
  // 获取用户输入的消息和上一个问题
  const { message, lastQuestion } = req.body;
  if (!message) {
    return res.status(400).json({ error: '消息不能为空' });
  }
  try {
    const messagesToSend = [
      { role: "system", content: systemPrompt }
    ];
    // 如果有上一个问题，添加到消息列表中
    if (lastQuestion) {
      messagesToSend.push({ role: "user", content: lastQuestion });
    }
    // 添加当前问题
    messagesToSend.push({ role: "user", content: message });
    // 调用 AI API
    const response = await axios.post(
      'https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation',
      {
        model: "qwen-turbo",
        input: {
          messages: messagesToSend
        },
        parameters: {
          max_tokens: 2048,
          temperature: 0.7,
          top_p: 0.8
        }
      },
      {
        headers: {
          'Authorization': `Bearer sk-11b93c1819924bd7ad59fe3f8026f1ca`,
          'Content-Type': 'application/json'
        }
      }
    );
    // 处理 AI 响应
    const fullResponse = response.data.output.text;
    // 分割主回答和相关问题
    const [answer, relatedQuestionsText] = fullResponse.split('---').map(str => str.trim());
    // 提取相关问题
    const relatedQuestions = relatedQuestionsText ?
      relatedQuestionsText.split('\n')
        .filter(q => q.trim().startsWith('•'))
        .map(q => q.trim().substring(1).trim())
      : [];
    // 逐字发送响应
    const chars = answer.split('');
    for (let char of chars) {
      res.write(`data: ${JSON.stringify({ text: char, done: false })}\n\n`);
      await new Promise(resolve => setTimeout(resolve, 50)); // 添加延迟以实现打字效果
    }
    // 发送完成信号和相关问题
    res.write(`data: ${JSON.stringify({
      done: true,
      relatedQuestions: relatedQuestions
    })}\n\n`);
    res.end();

  } catch (error) {
    console.error('API 错误:', error);
    res.write(`data: ${JSON.stringify({
      error: '服务器错误',
      details: error.message
    })}\n\n`);
    res.end();
  }
});
router.post("/register", async (req, res) => {
  let { user, pwd } = req.body
  await LoginModel.create({ user, pwd })
  res.send({ code: 200, msg: "注册成功" })
})
router.post("/add", async (req, res) => {
  let result = await LYModel.create(req.body)
  res.send({ result })
})

//添加商品信息
router.post("/addshop", async (req, res) => {
  console.log(req.body);

  await shopmodel.create(req.body)
  res.send({ code: 200, msg: "添加成功" })
})
router.post("/addcate", async (req, res) => {
  console.log(req.body);
  await catemodel.create(req.body)
  res.send({ code: 200, msg: "添加成功" })
})

router.get('/search', async (req, res) => {
  const query = req.query.name
  if (!query) {
    return res.status(400).send({ error: '请输入名称进行搜索' });
  }
  // const results = shopmodel.filter(item => item.name.includes(query));
  const results = await shopmodel.find({ name: new RegExp(query, 'i') })

  res.send({ code: 200, results: results });
})
//获取商品信息
// router.get("/shoplists", async (req, res) => {
//   const { current, pageSize } = req.query
//   let data = await shopmodel.find().populate("cate").populate("description").skip((current - 1) * pageSize).limit(pageSize)
//   let total = await shopmodel.countDocuments()
//   console.log(data);

//   res.send({ code: 200, data, total })
// })
router.get("/shoplist", async (req, res) => {
  let { page = 1, limit = 10 } = req.query
  let { name, cate, description, minprice, maxprice } = req.query
  let query = {}
  if (name) query.name = { $regex: name }
  if (cate) query.cate = cate
  if (description) query.description = description

  // 修复价格区间查询
  if ((minprice && minprice !== '0') || (maxprice && maxprice !== '0')) {
    query.price = {};
    if (minprice && minprice !== '0') {
      query.price.$gte = Number(minprice);
    }
    if (maxprice && maxprice !== '0') {
      query.price.$lte = Number(maxprice);
    }
  }

  console.log("查询条件:", JSON.stringify(query));

  // 确保page和limit是数字
  page = Number(page) || 1;
  limit = Number(limit) || 10;

  // 修复查询和分页逻辑
  let skip = (page - 1) * limit;
  let data = await shopmodel.find(query).populate("cate").populate("description").skip(skip).limit(limit);
  let total = await shopmodel.countDocuments(query);

  console.log(`查询结果: ${data.length}条, 总数: ${total}`);

  res.send({ code: 200, data, total })
})
router.post("/shopupdate", async (req, res) => {
  console.log(req.body);
  let { id } = req.query;
  await shopmodel.updateOne({ _id: id }, req.body)
  res.send({ code: 200, msg: "修改成功" })

})
router.get("/catelist", async (req, res) => {

  let data = await catemodel.find()
  res.send({ code: 200, data })
})

router.get("/delectcate", async (req, res) => {
  let { id } = req.query
  await catemodel.deleteOne({ _id: id })
  res.send({ code: 200, msg: "删除成功" })
})
router.post("/addshop", async (req, res) => {
  console.log(req.body);

  await shopmodel.create(req.body)
  res.send({ code: 200, msg: "添加成功" })
})
//标签管理
router.post("/addbq", async (req, res) => {
  await descriptionmodel.create(req.body)
  res.send({ code: 200, msg: "添加成功" })
})
router.get("/bqlist", async (req, res) => {
  let data = await descriptionmodel.find()
  res.send({ code: 200, data })
})
//库存记录
router.post("/addkucun", async (req, res) => {
  await inventorymodel.create(req.body)
  res.send({ code: 200, msg: "添加成功" })
})
router.get("/kucunlist", async (req, res) => {
  let data = await inventorymodel.find()
  res.send({ code: 200, data })
})
router.post("/kucunchange", async (req, res) => {
  let { id, num } = req.body;
  let data = await inventorymodel.findOne({ _id: id })
  data.num = num
  await data.save()
  res.send({ code: 200, msg: "修改成功" })
})
// module.exports = router;

//苏浚瑞
//发送随机数数据

//生成随机数范围
const generateRandom = (min, max, fixed = 0) => {
  return (Math.random() * (max - min) + min).toFixed(fixed);
}
router.get("/metrics", async (req, res) => {
  const mockData = {
    newUsers: generateRandom(500, 2000),
  }
  res.send({
    code: 200,
    data: mockData,
    timestamp: new Date().getTime()
  })
})
module.exports = router



