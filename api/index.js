import { kv } from '@vercel/kv'

require('dotenv').config()
const express = require('express')

const app = express()
const path = require('path')

const port = process.env.PORT || 3000

const saveWord = require('./saveWord')
const getOauth = require('./getOauth')
// http://expressjs.com/en/starter/static-files.html
app.use(express.static('public'))
app.use(express.json()) // for parsing application/json
const cookieParser = require('cookie-parser')
app.use(cookieParser())

const {
   NOTION_CLIENT_ID,
   NOTION_REDIRECT_URI,
   KV_REST_API_URL,
   KV_REST_API_TOKEN,
} = process.env

// homepage: dictionary.danielhe.art
app.get('/', function (req, res) {
   res.sendFile(path.join(__dirname, '..', 'components', 'home.htm'))
})
// test
app.get('/test', async function (req, res) {
   const botId = '7b9f027f-c3b9-46f6-adb2-2707239f68d1'
   const accessToken = 'secret_L3z6tdl6waQTm7XpRxSzHgke3VXpclZMOlzgtZGLHhY'
   const databaseId = '78c82987-c683-4f80-b42d-2c0cca841246'
   const workspaceId = 'my-workspace-id'

   await kv.set(botId, { accessToken, databaseId, workspaceId })
   const data = await kv.get(botId)
   if (data) {
      const { accessToken, databaseId, workspaceId } = data
      // 使用 accessToken 和 databaseId
   }
   res.send(data)
})
// get redirect link code to authroize notion
app.get('/redirect', async function (req, res) {
   const result = await getOauth(req)

   if (result.ok) {
      const { botId, accessToken, databaseId, workspaceId } = result
      //store data to vercel cv
      await kv.set(botId, { accessToken, databaseId, workspaceId })

      // set cookies
      const expireDate = new Date()
      expireDate.setFullYear(expireDate.getFullYear() + 10) // 设置 Cookie 的过期时间为十年后
      const cookieOptions = { expires: expireDate, path: '/' }
      res.cookie('botId', botId, cookieOptions)
         .cookie('accessToken', accessToken, cookieOptions)
         .cookie('databaseId', databaseId, cookieOptions)
         .send('Authorize Notion successfully')
      console.log('Cookie generated successfully')
   } else {
      res.send(result.message)
   }
})

// save word to notion database
app.post('/saveWord', async function (req, res) {
   // 处理回调逻辑
   if (req.cookies && req.cookies.accessToken) {
      console.log('use Cookie access token')
      // 返回响应或执行其他操作
      saveWord(req.body, req.cookies.accessToken, req.cookies.databaseId).then(
         (state) => res.json(state),
      )
   } else {
      //
      console.log('redirect to get access')
      const authParams = new URLSearchParams({
         client_id: NOTION_CLIENT_ID,
         redirect_uri: NOTION_REDIRECT_URI,
         response_type: 'code',
         owner: 'user',
      })
      const authUrl = `https://api.notion.com/v1/oauth/authorize?${authParams}`
      res.redirect(authUrl)
   }
})

// listen for requests :)
// app.listen(port, function () {
//    console.log('Your app is listening on port ' + port)
// })
module.exports = app
