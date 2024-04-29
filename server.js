require('dotenv').config()
const express = require('express')
const app = express()

const { Client } = require('@notionhq/client')
const notion = new Client({ auth: process.env.NOTION_KEY })
const port = process.env.PORT || 3000

// http://expressjs.com/en/starter/static-files.html
app.use(express.static('public'))
app.use(express.json()) // for parsing application/json

DATABASE_ID = process.env.DATABASE_ID

// http://expressjs.com/en/starter/basic-routing.html
app.get('/', (req, res) => {
   res.send('Hello, World!')
})
// Create new database. The page ID is set in the environment variables.
app.post('/databases', async function (request, response) {
   const pageId = process.env.NOTION_PAGE_ID
   const title = request.body.dbName

   try {
      const newDb = await notion.databases.create({
         parent: {
            type: 'page_id',
            page_id: pageId,
         },
         title: [
            {
               type: 'text',
               text: {
                  content: title,
               },
            },
         ],
         properties: {
            Name: {
               title: {},
            },
         },
      })
      response.json({ message: 'success!', data: newDb })
   } catch (error) {
      response.json({ message: 'error', error })
   }
})

// Create new page. The database ID is provided in the web form.
app.post('/pages', async function (request, response) {
   const { dbID, pageName, header } = request.body

   try {
      const newPage = await notion.pages.create({
         parent: {
            type: 'database_id',
            database_id: dbID,
         },
         properties: {
            Name: {
               title: [
                  {
                     text: {
                        content: pageName,
                     },
                  },
               ],
            },
         },
         children: [
            {
               object: 'block',
               heading_2: {
                  rich_text: [
                     {
                        text: {
                           content: header,
                        },
                     },
                  ],
               },
            },
         ],
      })
      response.json({ message: 'success!', data: newPage })
   } catch (error) {
      response.json({ message: 'error', error })
   }
})
// Create new page. The database ID is provided in the web form.
app.post('/saveWord', async function (request, response) {
   const { word, phonetic, meanings, audioSrc, source } = request.body
   console.log(word, phonetic, meanings, audioSrc, source)
   const properties = {
      Word: {
         title: [
            {
               text: {
                  content: word,
               },
            },
         ],
      },
      Phonetics: {
         rich_text: [
            {
               text: {
                  content: phonetic,
               },
            },
         ],
      },
      Meaning: {
         rich_text: [
            {
               text: {
                  content: meanings[0].definitions[0].definition,
               },
            },
         ],
      },
      Example: {
         rich_text: [
            {
               text: {
                  content: meanings[0].definitions[0].example,
               },
            },
         ],
      },
      State: {
         select: {
            name: 'New',
         },
      },
      Source: {
         rich_text: [
            {
               text: {
                  content: source.title,
                  link: {
                     url: source.url,
                  },
               },
            },
         ],
      },
   }
   const children = []

   // 添加词性和含义的文本块
   meanings.forEach((meaning) => {
      const partOfSpeech = meaning.partOfSpeech
      children.push({
         object: 'block',
         type: 'paragraph',
         paragraph: {
            rich_text: [
               {
                  type: 'text',
                  text: {
                     content: partOfSpeech,
                  },
                  annotations: {
                     italic: true,
                     color: 'gray',
                  },
               },
            ],
         },
      })

      const definitions = meaning.definitions
      definitions.forEach((definition, index) => {
         const definitionText = definition.definition
         const exampleText = definition.example
         children.push({
            object: 'block',
            type: 'numbered_list_item',
            numbered_list_item: {
               rich_text: [
                  {
                     type: 'text',
                     text: {
                        content: `${definitionText}\n`,
                     },
                  },
                  {
                     type: 'text',
                     text: {
                        content: exampleText,
                     },
                     annotations: {
                        color: 'gray',
                     },
                  },
               ],
            },
         })
      })
   })
   // 在项的详情中添加音频链接
   if (audioSrc) {
      if (audioSrc.endsWith('.mp3')) {
         // 在项的详情中添加空行
         children.push({
            object: 'block',
            type: 'paragraph',
            paragraph: {
               rich_text: [
                  {
                     type: 'text',
                     text: {
                        content: '',
                     },
                  },
               ],
            },
         })
         children.push({
            object: 'block',
            type: 'audio',
            audio: {
               external: {
                  url: audioSrc,
               },
            },
         })
      } else {
         children.push({
            object: 'block',
            type: 'paragraph',
            paragraph: {
               rich_text: [
                  {
                     type: 'text',
                     text: {
                        content: 'voice link',
                        link: {
                           url: audioSrc,
                        },
                     },
                  },
               ],
            },
         })
      }
   }
   // console.log(properties, children)
   try {
      const start = performance.now()
      await notion.pages.create({
         parent: {
            type: 'database_id',
            database_id: DATABASE_ID,
         },
         properties: properties,
         icon: {
            type: 'emoji', // 使用内置的表情符号
            emoji: '🐣', // 内置的孵化小鸡图标
         },
         children: children,
      })
      const end = performance.now()
      console.log(end - start)
      response.json({ message: 'success!' })
   } catch (error) {
      response.json({ message: 'error', error })
   }
})
// Create new block (page content). The page ID is provided in the web form.
app.post('/blocks', async function (request, response) {
   const { pageID, content } = request.body

   try {
      const newBlock = await notion.blocks.children.append({
         block_id: pageID, // a block ID can be a page ID
         children: [
            {
               // Use a paragraph as a default but the form or request can be updated to allow for other block types: https://developers.notion.com/reference/block#keys
               paragraph: {
                  rich_text: [
                     {
                        text: {
                           content: content,
                        },
                     },
                  ],
               },
            },
         ],
      })
      response.json({ message: 'success!', data: newBlock })
   } catch (error) {
      response.json({ message: 'error', error })
   }
})

// listen for requests :)
app.listen(port, function () {
   console.log('Your app is listening on port ' + port)
})
