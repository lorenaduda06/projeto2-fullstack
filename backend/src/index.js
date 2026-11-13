import 'dotenv/config'

import express from 'express'
import cors from 'cors'

import { db } from './db.js'

const PORT = process.env.PORT ?? 3000

async function main() {
  // Criando o servidor Express
  const app = express()

  app.use(express.json())
  app.use(cors({ origin: '*' }))

  // Conectando ao banco de dados
  await db.connect().catch((err) => {
    console.error('Erro ao conectar ao banco de dados:', err)
    process.exit(1)
  })
  
  // Iniciando o web server
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`)
  })
}

main()
