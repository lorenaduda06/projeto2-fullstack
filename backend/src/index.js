import 'dotenv/config'

import express from 'express'

const PORT = process.env.PORT

async function main() {
  const app = express()

  app.use(express.json())
  
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`)
  })
}

main()