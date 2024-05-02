const { Buffer } = require('node:buffer')
const { Client } = require('@notionhq/client')

async function getOauth(req) {
   const { code, error } = req.query
   if (error) {
      return {
         message: 'Failed to authorize Notion: access denied!',
         ok: false,
      }
   }
   // encode in base 64
   const encoded = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')
   const response = await fetch('https://api.notion.com/v1/oauth/token', {
      method: 'POST',
      headers: {
         Accept: 'application/json',
         'Content-Type': 'application/json',
         Authorization: `Basic ${encoded}`,
      },
      body: JSON.stringify({
         grant_type: 'authorization_code',
         code: code,
         redirect_uri: redirectUri,
      }),
   })

   const data = await response.json()
   //get user page
   const accessToken = data.access_token
   const workspaceId = data.workspace_id
   const botId = data.bot_id
   const notion = new Client({
      auth: accessToken,
   })
   let pageId, databaseId
   try {
      // 调用 Notion API 搜索页面
      const response = await notion.search({
         filter: {
            property: 'object',
            value: 'page',
         },
      })

      const topLevelPages = response.results.filter(
         (page) => page.parent.type === 'workspace',
      )
      // 设置页面id
      if (topLevelPages.length > 0) {
         pageId = topLevelPages[0].id
      } else {
         return { message: 'No page choosed!', ok: false }
      }
   } catch (error) {
      console.error('Error:', error)
      return { message: 'error', ok: false }
   }
   //create database for storing words
   try {
      const newDb = await notion.databases.create({
         parent: {
            type: 'page_id',
            page_id: pageId || workspaceId,
         },
         title: [
            {
               type: 'text',
               text: {
                  content: 'Dictionary to Notion',
               },
            },
         ],
         icon: {
            type: 'emoji',
            emoji: '📖',
         },
         properties: {
            Word: { title: {} },
            Phonetics: { rich_text: {} },
            Meaning: { rich_text: {} },
            Example: { rich_text: {} },
            State: {
               select: {
                  options: [
                     {
                        name: 'New',
                        color: 'purple',
                     },
                     {
                        name: 'Learning',
                        color: 'blue',
                     },
                     {
                        name: 'I know',
                        color: 'green',
                     },
                  ],
               },
            },
            Source: { rich_text: {} },
         },
      })
      databaseId = newDb.id
   } catch (error) {
      console.log({ message: 'error', error })
      return { message: 'error', ok: false }
   }
   return {
      accessToken,
      botId,
      workspaceId,
      databaseId,
      ok: true,
   }
}

module.exports = getOauth