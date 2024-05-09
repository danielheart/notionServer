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

const { NOTION_CLIENT_ID, NOTION_REDIRECT_URI } = process.env

// homepage: dictionary.danielhe.art
app.get('/', function (req, res) {
   res.sendFile(path.join(__dirname, '..', 'components', 'home.htm'))
})

// get redirect link code to authroize notion
app.get('/redirect', async function (req, res) {
   const result = await getOauth(req)

   if (result.ok) {
      const { botId, accessToken, databaseId, workspaceId } = result
      //store data to vercel cv
      await kv.set(botId, { accessToken, databaseId, workspaceId })

      const html = `
      <html>
        <head>
          <title>Dictionary to Notion</title>
        </head>
        <body>
          <h1>Congratulations</h1>
          <p>Authorize Notion successfully!</p>
          <script>
               var extensionId = 'deaiipjieiccllhfmlnblcnjlegopdka'
               chrome.runtime.sendMessage(
                  extensionId,
                  { accessToken:"${accessToken}",databaseId:"${databaseId}"},
                  function (response) {
                     console.log(response)
                  },
               )
               setTimeout(function() {
                  window.close()
                }, 3000)
          </script>
        </body>
      </html>
    `
      // set cookies
      const expireDate = new Date()
      expireDate.setFullYear(expireDate.getFullYear() + 10) // 设置 Cookie 的过期时间为十年后
      const cookieOptions = { expires: expireDate, path: '/' }
      res.cookie('botId', botId, cookieOptions)
         .cookie('accessToken', accessToken, cookieOptions)
         .cookie('databaseId', databaseId, cookieOptions)
         .send(html)
      console.log('Cookie generated successfully')
   } else {
      res.send(result.message)
   }
})

// save word to notion database
app.get('/oauth/notion', async function (req, res) {
   // 处理回调逻辑
   // if (req.cookies && req.cookies.accessToken) {
   //    console.log('use Cookie access token')
   //    // 返回响应或执行其他操作
   //    saveWord(req.body, req.cookies.accessToken, req.cookies.databaseId)
   //       .then((state) => {
   //          res.json(state)
   //       })
   //       .catch((error) => {
   //          console.log(error)
   //          res.json({ message: 'error' })
   //       })
   // } else {
   // redirect if no cookie find
   console.log('redirect to get access')
   const authParams = new URLSearchParams({
      client_id: NOTION_CLIENT_ID,
      redirect_uri: NOTION_REDIRECT_URI,
      response_type: 'code',
      owner: 'user',
   })
   const authUrl = `https://api.notion.com/v1/oauth/authorize?${authParams}`
   res.redirect(authUrl)
   // }
})

// listen for requests :)
// app.listen(port, function () {
//    console.log('Your app is listening on port ' + port)
// })
module.exports = app
