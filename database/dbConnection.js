import { Client } from "pg";

export const client = new Client({
    host: "localhost",
    port: 5432,
    user: "postgres",
    database: "mydb"
  });

  export async function dbConnect() {
  
     try {
        await client.connect() 
        console.log("DB Connected Securly!")
     }

     catch(err){
        console.log("conncection refused", err)
     }

}