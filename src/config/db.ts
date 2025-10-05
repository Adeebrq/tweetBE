import { Pool } from "pg"
import dotenv from "dotenv"

dotenv.config()

// const pool= new Pool({
//     user: process.env.DB_USER ,
//     host: process.env.DB_HOST ,
//     database: process.env.DB_DATABASE,
//     port: process.env.DB_PORT,
//     password: process.env.DB_PASSWORD
// })

const pool= new Pool({
    connectionString: process.env.SUPABASE_DB,
    ssl:{
        rejectUnauthorized: false
    }
})

pool.on("connect", ()=>{
    console.log("Connected to db")
})


export default pool;    