import http from "node:http";
import fs from "node:fs";
import { dbConnect, client } from "./database/dbConnection.js";
import { home, users, loginHtml, login, userGet, authUser,tryRefresh} from "./controllers/controller.js";
import { url } from "node:inspector";
import bcrypt from "bcrypt";

const routes= {
    "/home": home,
    "/users": users,
    "/login": loginHtml,
    "/loginAsk": login
}

dbConnect();

let skeleton= fs.readFileSync("skeleton.html", "utf8");

const server=http.createServer((req,res)=>{
   
    const urlObj = new URL(req.url, `http://${req.headers.host}`);
    const path= urlObj.pathname;
    const searchParams= urlObj.searchParams || "";
   
    if (req.url.startsWith("/css/")) {
        const cssPath = "public" + req.url;
        const css = fs.readFileSync(cssPath, "utf8");
        res.setHeader("Content-Type", "text/css");
        res.end(css);
        return;
    }
    
const route= routes[path];


if(route) {
    route(req,res,skeleton,searchParams);
}
else {
    res.statusCode=401;
    res.end("not found")
}


})

server.listen(3083,()=>{
console.log("mvc project working");

} )