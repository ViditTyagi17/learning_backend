

import 'dotenv/config'





import connectDB from "./db/index.js ";
import { app } from './app';

connectDB()
  .then(()=>{
    app.listen(process.env.PORT || 8000,()=>{
      console.log(` Server is running at PORT : ${process.env.PORT}`)
    })
  })
  .catch((err)=>{
    console.log("DB is not connected",err)
  })




// require ('dotenv').config({path: './env'})
// import express from "express";
// const app = express()


//   (async () => {
//     try {
//       await mongoose.connect(` ${process.env.MONGODB_URI}/${DB_NAME}`)
//       app.on("Error :", (error) => {
//         console.log(error)
//         throw error
//       })
//       app.listen(process.env.PORT, () => {
//         console.log(`app is listening on  port ${process.env.PORT}`)
//       })
//     } catch (error) {
//       console.error("Error", error)
//       throw error
//     }
//   })()

