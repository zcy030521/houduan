var express = require('express');
var router = express.Router();
let { userModel, LYModel, roleModel } = require("../module/modules")
let jwt = require('jsonwebtoken')
const axios = require('axios');


router.post("/login", async (req, res) => {
  let { user, password } = req.body
  const userinfo = await userModel.findOne({ user:user })
  console.log(userinfo,user,password);
  
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
router.get("/list", async(req, res) => {
  let token = req.get('Authorization');
  token = token.split("Bearer ")[1];
  const { userId } = jwt.verify(token, "2404B");
  // console.log(user);
  console.log(jwt.verify(token, "2404B"));
  
  let data = await userModel.findOne({ _id:userId }).populate({
    path: "role",
    populate: {
      path: "permission",
      populate:{
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

module.exports = router;
