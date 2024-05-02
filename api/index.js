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

clientId = process.env.CLIENT_ID
clientSecret = process.env.CLIENT_SECRET
redirectUri = process.env.REDIRECT_URI

// http://expressjs.com/en/starter/basic-routing.html
app.get('/', function (req, res) {
   res.sendFile(path.join(__dirname, '..', 'components', 'home.htm'))
})

app.get('/redirect', async function (req, res) {
   const { accessToken, botId, workspaceId, databaseId } = await getOauth(req)

   if (databaseId) {
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
      res.send('failed to authorize Notion')
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
         client_id: clientId,
         redirect_uri: redirectUri,
         response_type: 'code',
         owner: 'user',
      })
      const authUrl = `https://api.notion.com/v1/oauth/authorize?${authParams}`
      res.redirect(authUrl)
   }
})

// listen for requests :)
app.listen(port, function () {
   console.log('Your app is listening on port ' + port)
})
module.exports = app
