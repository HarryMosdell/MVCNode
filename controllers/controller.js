import fs from "node:fs";
import {client} from "../database/dbConnection.js";
import jwt from "jsonwebtoken";


export function home(req,res,skeleton,params){
    const pageInfo = fs.readFileSync("./views/homeView.html", "utf8");
     const finalPage= skeleton.replace('__info__', pageInfo)
     res.setHeader("Content-Type", "text/html");
    res.end(finalPage);
}


export function users(req,res, skeleton, params){
    if (params && [...params].length > 0) {
         userGet(req, res, skeleton, params);
         return;

    }
    res.end("users route hit!");
}

export function loginHtml(req,res, skeleton, params){
    const pageInfo = fs.readFileSync("./views/loginHtml.html", "utf8");
    const finalPage= skeleton.replace('__info__', pageInfo)
    res.end(finalPage);
}


export async function login(req,res, skeleton, params){
  
    let body="";

    req.on("data" , chunk => 
    body += chunk 
    ); 
     
  
    req.on("end", async ()=> {
      
      let data = JSON.parse(body);
      if(data.name.length<5){
          res.statusCode=400;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({error:"username too short"}))
          return;
      }
       console.log(data.name);
      let username=data.name
      const result= await client.query("SELECT * FROM USERS WHERE username=$1",
         [username]
        );
  
       console.log(result.rows);
  
       if(result.rows.length>0){
       
         const resultUsername=result.rows[0].username;
  
         if(username===resultUsername) {
        res.setHeader("Content-Type", "application/json");
  
        const token= jwt.sign(
         {username:resultUsername},
         "S_Key",
         {expiresIn: "10s"}
        )
        
        const refreshToken= jwt.sign(
          {username:resultUsername},
          "R_S_Key",
          {expiresIn: "7d"}
         )
  
  
         res.setHeader("Set-Cookie", [
          `token=${token}; HttpOnly; Path=/; Max-Age=10; SameSite=Lax`,
          `refreshToken=${refreshToken}; HttpOnly; Path=/; Max-Age=${60*60*24*7}; SameSite=Lax`
        ]);
        
  
        res.end(JSON.stringify({ message:`${resultUsername} has logged in`, redirect: `/users?name=${resultUsername}`}));
        
         }
  
         else{
          res.statusCode=401;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({error:"invalid username"}));
         }
  
       }
  
       else {
          res.statusCode=401;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({error:"username doesnt exist"}));
       }
      
    })
    
}


export function userGet(req,res,skeleton,params) {
 //const name= params.get("name")
 req.name= params.get("name")
authUser(req, res);
}


export function authUser(req, res) {
  
  const cookie= req.headers.cookie || "";
  const token = cookie?.split("; ")
  .find(c => c.startsWith("token="))
  ?.slice("token=".length);

  const refreshToken = cookie?.split("; ")
  .find(c => c.startsWith("refreshToken="))
  ?.slice("refreshToken=".length);


  if(!token) {
    return tryRefresh(res,refreshToken);
   }
  
  try {
  const decoded = jwt.verify(token,"S_Key")
  return res.end(`logged in ${req.name}`);
  }

  catch(err) {
    console.log(err)
    res.statusCode=401;
    
    return res.end("no token you must login");
  }

}


export function tryRefresh(res,refreshToken) {

    if(!refreshToken) return res.end("no Refresh token you need to login again!");
    
   try{
   const refreshTokenDecoded=jwt.verify(refreshToken, "R_S_Key");

   const accessToken= jwt.sign(
    {userName: refreshTokenDecoded.username},
    "S_Key",
    { expiresIn:"10s" }
   );

    const accessTokenVerified= jwt.verify(accessToken,"S_Key");

   res.setHeader("Set-Cookie", [
    `token=${accessToken}; HttpOnly; Path=/; Max-Age=10; SameSite=Lax`
  ]);
  
  return res.end("logged in (refreshed)");
   
}

   catch(err) {
    console.log(err)
    return res.end(" refresh token doesnt exist")
   }

}





