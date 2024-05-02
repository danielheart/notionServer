const { Client } = require('@notionhq/client')
async function saveWord(wordInfo, accessToken, databaseId) {
   const { word, phonetic, meanings, audioSrc, source } = wordInfo

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
   const notion = new Client({ auth: accessToken })
   try {
      await notion.pages.create({
         parent: {
            type: 'database_id',
            database_id: databaseId,
         },
         properties,
         icon: {
            type: 'emoji',
            emoji: '🐣',
         },
         children,
      })
      return { message: 'success!' }
   } catch (error) {
      return { message: 'error', error }
   }
}
module.exports = saveWord
