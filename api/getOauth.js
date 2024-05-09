const { Buffer } = require('node:buffer')
const { Client } = require('@notionhq/client')
const { NOTION_CLIENT_ID, NOTION_CLIENT_SECRET, NOTION_REDIRECT_URI } =
   process.env
async function getOauth(req) {
   const { code, error } = req.query
   if (error) {
      return {
         message: 'Failed to authorize Notion: access denied!',
         ok: false,
      }
   }
   // encode in base 64
   const encoded = Buffer.from(
      `${NOTION_CLIENT_ID}:${NOTION_CLIENT_SECRET}`,
   ).toString('base64')
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
         redirect_uri: NOTION_REDIRECT_URI,
      }),
   })
   const data = await response.json()
   if (response.status !== 200) {
      return {
         message: data.error_description,
         ok: false,
      }
   }

   //get oauth infomation data
   const accessToken = data.access_token
   const workspaceId = data.workspace_id
   const botId = data.bot_id
   const templateId = data.duplicated_template_id

   //if user choose a template id
   if (templateId !== null) {
      return {
         accessToken,
         botId,
         workspaceId,
         databaseId: templateId,
         ok: true,
      }
   }
   console.log('not find template id')
   // if not choose template id
   let pageId, databaseId
   const notion = new Client({
      auth: accessToken,
   })

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
