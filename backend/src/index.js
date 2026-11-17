import 'dotenv/config'

import { createApp } from './app.js'
import { db } from './db.js'

const PORT = process.env.PORT ?? 3000

async function main() {
  const app = createApp()

  await db.connect().catch((err) => {
    console.error('Erro ao conectar ao banco de dados:', err)
    process.exit(1)
  })
  
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`)
  })
}

main()
