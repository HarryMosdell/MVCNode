import http from "node:http";
import fs from "node:fs";
import { dbConnect, client } from "./database/dbConnection.js";
import { home, users, loginHtml, login, userGet, authUser,tryRefresh, orders, productsHtml, getProducts, addToBasket, basketHtml, renderBasket, removeBasket, updateBasket, checkoutHtml, checkout ,createOrder,ViewOrders, stripWebhook} from "./controllers/controller.js";
import { url } from "node:inspector";
import bcrypt from "bcrypt";

const routes= {
    "/home": home,
    "/users": users,
    "/login": loginHtml,
    "/loginAsk": login, 
    "/orders": orders, 
    "/products": productsHtml,
    "/getProducts": getProducts, 
    "/addBasket": addToBasket, 
    "/basket": basketHtml,
    "/getBasket":renderBasket,
    "/removeBasket":removeBasket, 
    "/updateBasket":updateBasket, 
    "/checkout":checkoutHtml,
    "/checkoutSend":checkout,
    "/createOrder":createOrder,
    "/orders":ViewOrders
}

dbConnect();

let skeleton= fs.readFileSync("skeleton.html", "utf8");

const server=http.createServer((req,res)=>{
   
    const urlObj = new URL(req.url, `http://${req.headers.host}`);
    const path= urlObj.pathname;
    const searchParams= urlObj.searchParams;
    req.path=path;

    if (req.url.startsWith("/css/")) {
        const cssPath = "public" + req.url;
        const css = fs.readFileSync(cssPath, "utf8");
        res.setHeader("Content-Type", "text/css");
        res.end(css);
        return;
    }

    if (req.url === "/stripe-webhook" && req.method === "POST") {
        stripWebhook(req, res);
        return;
    }

const route= routes[path];

if(route) {
    route(req,res,skeleton,searchParams);
}
else {
    res.statusCode=404;
    res.end("not found")
}


})

server.listen(3083,()=>{
console.log("mvc project working");

} )