import fs from "node:fs";
import {client} from "../database/dbConnection.js";
import jwt from "jsonwebtoken";
import Stripe from "stripe";
import { randomUUID } from "node:crypto";
import {getCookie} from "../functions/getcookie.js";
import bcrypt from "bcrypt";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export function home(req,res,skeleton,params){
    const pageInfo = fs.readFileSync("./views/homeView.html", "utf8");
     const finalPage= skeleton.replace('__info__', pageInfo)
     res.setHeader("Content-Type", "text/html");
    res.end(finalPage);
}

export function productsHtml(req,res,skeleton,params){
    const pageInfo = fs.readFileSync("./views/products.html", "utf8");
     const finalPage= skeleton.replace('__info__', pageInfo)
     res.setHeader("Content-Type", "text/html");
     res.end(finalPage);
}

export function getProducts(req,res,skeleton,params){
    const products= [{id:1, name:"game boy", price: 20}, {id:2, name:"game boy color", price: 30 }];
    res.setHeader("Content-Type",  "application/json");
    res.end(JSON.stringify(products));
}

export function addToBasket(req,res,skeleton,params){
    let body=" "
    req.on('data', chunk =>
     
        body+=chunk 
    
    );

    req.on('end', async()=>{
    
    const refreshToken = getCookie(req,"refreshToken")

    const data=  JSON.parse(body)
    const name=data.name; 
    const result= await client.query('select * from products where name=$1',
    [name])


    const productId= result.rows[0].id;


    let decoded;
   
    try {
   decoded=jwt.verify(refreshToken,process.env.JWT_REFRESH_SECRET)
     } 
    catch{
     decoded=null;
    }   
   
//user  basket 
if(decoded) {
    const userId=decoded.id
    const basketQtyCheck= await client.query('select * from basket where product_id=$1 and user_id=$2',
    [productId, userId])

    if(basketQtyCheck.rows.length>0)  { 
        const updateBasket = await client.query(
        'UPDATE basket SET quantity = quantity +1  WHERE product_id = $1 AND user_id= $2',
        [productId, userId] )
        console.log(updateBasket);
        res.setHeader("Content-Type", "Application/json")
        res.end(JSON.stringify("increased item qty in user basket"))
    }

else {

   const insertIntoBasket = await client.query('insert into basket (product_id, user_id, user_type) values($1,$2,$3)', 
    [productId, userId, 'User']);
    res.setHeader("Content-Type", "Application/json")
    res.end(JSON.stringify("increased item qty in user basket"))
}
}
//adding to guest basket 
else {

    const guestToken = getCookie(req,"guestToken");

    let guest;
    try{
     guest=jwt.verify(guestToken,process.env.JWT_GUEST_SECRET_KEY);
    }

    catch {
        const guestUser=jwt.sign( 
            {id: randomUUID()},
            process.env.JWT_GUEST_SECRET_KEY,
            {expiresIn:"7d"}
            );

            guest=jwt.verify(guestUser,process.env.JWT_GUEST_SECRET_KEY);
           
            console.log(guest.id);
         
           res.setHeader("Set-Cookie",`guestToken=${guestUser}; HttpOnly; SameSite=Strict; Path=/; Max-Age=604800`);
    }
    
    const guestID=guest.id;
            

    const basketQtyCheck= await client.query('select * from basket where product_id=$1 AND guest_id=$2',
    [productId,guestID])

    if(basketQtyCheck.rows.length>0)  { 
        const updateBasket = await client.query(
        'UPDATE basket SET quantity = quantity +1  WHERE product_id = $1 AND guest_id=$2',
        [productId,guestID] )
        res.setHeader("Content-Type", "Application/json")
        res.end(JSON.stringify("increased item qty in guest basket"))
    }

else {
   const insertIntoBasket = await client.query('insert into basket (product_id, guest_id) values($1,$2)', 
    [productId, guestID]);
    res.setHeader("Content-Type", "Application/json")
    res.end(JSON.stringify("added item to guest basket"))
}

}

})
    
}

export function basketHtml(req,res, skeleton, params) {
  const pageInfo=fs.readFileSync("./views/basket.html","utf8");
  const finalPage= skeleton.replace('__info__',pageInfo);
  res.end(finalPage);
}

export async function renderBasket(req,res, skeleton, params) {
      const refreshToken = getCookie(req,"refreshToken");
     
      let decoded;
    
      try {
     decoded= jwt.verify(refreshToken,process.env.JWT_REFRESH_SECRET);
      }
      catch {
        decoded=null;
      }
//user basket rendering
      if(decoded){
       const  userId=decoded.id;
       const  userName=decoded.userName;
       const result= await client.query("select basket.product_id, basket.quantity, products.name, products.price from basket inner join products on basket.product_id = products.id where user_id=$1",
         [userId])

         if(result.rows.length>0) {
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify(result.rows));
         } 
         else {
            res.statusCode = 404;
            res.end(`no items in ${userName}'s basket `);
         } 
      }
       else {

        const guestToken = getCookie(req,"guestToken");

        let decoded;
        try {
            decoded=jwt.verify(guestToken,process.env.JWT_GUEST_SECRET_KEY);
        }
        catch{
            res.end(`no items in basket dkdkdkdkddkdk`);
            return;
        }
           
        const guestID=decoded.id;

        const result= await client.query("select basket.product_id, basket.quantity, products.name, products.price from basket inner join products on basket.product_id = products.id where guest_id=$1",
        [guestID])

        if(result.rows.length>0) {
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify(result.rows));
         } 
         else {
            res.statusCode = 404;
            res.end(`no items in Guest basket`);
         } 

       }

  }

export function removeBasket(req,res, skeleton, params){
   const refreshToken = getCookie(req,"refreshToken");
   let decoded;
    try {
     decoded= jwt.verify(refreshToken,process.env.JWT_REFRESH_SECRET);
    }
    catch {
        decoded=null;
    }

    let body='';
    req.on('data', chunk => 
     body+=chunk
   );

   req.on('end',async()=>{
   
    const data=JSON.parse(body);
    const productId= data.productId;
 
    if(decoded) {
    const userId= decoded.id;
    const result=await client.query('delete from basket where product_id=$1 and user_id=$2', 
    [productId, userId]);

    if (result.rowCount>0) {
    console.log(result);
    res.setHeader("Content-Type", "application/json")
    res.end(JSON.stringify("deleted user item"))
    }
}
      else {
       const guestToken = getCookie(req,"guestToken");
    
       decoded= jwt.verify(guestToken, process.env.JWT_GUEST_SECRET_KEY);

       const guestID= decoded.id;

      const result= await client.query('delete from basket where product_id=$1 AND guest_id=$2',
       [productId,guestID]);

       if(result.rowCount>0){
        res.setHeader("Content-Type", "application/json")
        res.end(JSON.stringify("deleted guest item"))
       }
      }
   })

}


export function updateBasket(req,res, skeleton, params) {
    let body="";
    req.on("data",chunk=> 
    body+=chunk
   )
 
   req.on("end",async()=>{
     const refreshToken = getCookie(req,"refreshToken");
     let refreshTokenDecoded;
 
     try {
      refreshTokenDecoded=jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
     }
 
     catch {
         refreshTokenDecoded=null;
     }
 
     const data=JSON.parse(body);
     const productId= data.productId;
 
     if(refreshTokenDecoded) {
         const userId=refreshTokenDecoded.id;
 
         if(data.action==="increase") {
             const result= await client.query('update basket set quantity=quantity +1 where user_id=$1 and product_id=$2',
                 [userId,productId]);
             console.log(result);
             if(result.rowCount>0) {
                 res.end(JSON.stringify("increased quantity"));
             }
         }
 
         if(data.action==="decrease") {
             const result= await client.query(
                 'select * from basket WHERE user_id = $1 AND product_id = $2',
                 [userId, productId]
             );
 
             const resultRowQuantity= result.rows[0].quantity;
             if(resultRowQuantity===1){
                 res.statusCode=400;
                 res.end(JSON.stringify(" cannot decrease if the item is equal to 1"));
                 return;
             }
 
             const updateQuery= await client.query(
                 'UPDATE basket SET quantity = quantity - 1  WHERE user_id = $1 AND product_id = $2',
                 [userId, productId]
             );
 
             if(updateQuery.rowCount>0) {
                 res.end(JSON.stringify("decreased quantity"));
             }
         }
 
     } else {
         const guestToken = getCookie(req,"guestToken")
         let guestDecoded;
         try{
             guestDecoded= jwt.verify(guestToken,process.env.JWT_GUEST_SECRET_KEY);
         }
 
         catch {
             res.statusCode=404;
             res.end();
             return;
         }
 
         const guestID= guestDecoded.id;
 
         if(data.action==="increase") {
             const result= await client.query('update basket set quantity=quantity +1 where guest_id=$1 and product_id=$2',
                 [guestID,productId]);
             console.log(result);
             if(result.rowCount>0) {
                 res.end(JSON.stringify("increased quantity"));
             }
         }
 
         if(data.action==="decrease") {
             const result= await client.query(
                 'select * from basket WHERE guest_id = $1 AND product_id = $2',
                 [guestID, productId]
             );
 
             const resultRowQuantity= result.rows[0].quantity;
             if(resultRowQuantity===1){
                 res.statusCode=400;
                 res.end(JSON.stringify(" cannot decrease if the item is equal to 1"));
                 return;
             }
 
             const updateQuery= await client.query(
                 'UPDATE basket SET quantity = quantity - 1  WHERE guest_id = $1 AND product_id = $2',
                 [guestID, productId]
             );
 
             if(updateQuery.rowCount>0) {
                 res.end(JSON.stringify("decreased quantity"));
             }
         }
     }
   })
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

export function orders(req,res, skeleton, params){

    const view= "orders.html";
    authUser(req, res, skeleton,view);
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
   
      let username=data.name
      let password=data.password
            
      const result= await client.query("SELECT * FROM USERS WHERE username=$1",
         [username]
        );
         
       console.log(result.rows);
  
       if(result.rows.length>0 && await bcrypt.compare(password, result.rows[0].password)){ 
       
         const resultUsername=result.rows[0].username;
         const resultPassword=result.rows[0].password;
         const resultId= result.rows[0].id;
  
         if(username===resultUsername) {
        res.setHeader("Content-Type", "application/json");
         
        const token= jwt.sign(
         {username:resultUsername, 
          id:resultId
        },
        process.env.TOKEN_SECERT_KEY,
         {expiresIn: "10s"}
        )
        
        const refreshToken= jwt.sign(
          {username:resultUsername,
            id:resultId
        },
        process.env.JWT_REFRESH_SECRET,
          {expiresIn: "7d"}
         )

  const guestToken =  getCookie(req,"guestToken");

         try{
         const guest=  jwt.verify(guestToken,process.env.JWT_GUEST_SECRET_KEY);
         const guestID= guest.id;
         const result= await client.query('update basket set user_id=$1, guest_id=NULL where guest_id=$2',
         [resultId,guestID]);

         res.setHeader("Set-Cookie", [
            `token=${token}; HttpOnly; Path=/; Max-Age=10; SameSite=Lax`,
            `refreshToken=${refreshToken}; HttpOnly; Path=/; Max-Age=${60*60*24*7}; SameSite=Lax`,
            "guestToken=; Max-Age=0; Path=/; HttpOnly"
          ]);   
    
          res.end(JSON.stringify({ message:`${resultUsername} has logged in`, redirect: `/users?name=${resultUsername}`}));
         }

        catch { 
            res.setHeader("Set-Cookie", [
                `token=${token}; HttpOnly; Path=/; Max-Age=10; SameSite=Lax`,
                `refreshToken=${refreshToken}; HttpOnly; Path=/; Max-Age=${60*60*24*7}; SameSite=Lax`,
                
              ]);
              
              res.end(JSON.stringify({ message:`${resultUsername} has logged in`, redirect: `/users?name=${resultUsername}`}));
        
         }
        }
     
       }
  
       else {
          res.statusCode=401;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({error:"invalid username or password!"}));
       }
      
    })
    
}


export function userGet(req,res,skeleton,params) {
 
const view="users.html";
authUser(req, res, skeleton,view);
}


export function authUser(req, res, skeleton, view) {
  
  const token =  getCookie(req,"token");

  
  const refreshToken = getCookie(req,"refreshToken");

  if(!token) {
    return tryRefresh(req,res,refreshToken, skeleton, view);
   }
  
  try {
  const decoded = jwt.verify(token,process.env.TOKEN_SECERT_KEY);
  req.name=decoded.username; 
  const viewHtml=fs.readFileSync(`./views/${view}`, "utf8");
  const viewHtmlFinal=viewHtml.replaceAll("--name",decoded.username );
  const finalHtml = skeleton.replace("__info__",viewHtmlFinal);
  return res.end(finalHtml);

  }

  catch(err) {
    console.log(err)
    res.statusCode=401;
    return tryRefresh(req,res,refreshToken, skeleton, view);

  }

}


export function tryRefresh(req,res,refreshToken, skeleton,view) {

    if(!refreshToken) return res.end("no Refresh token you need to login again!");
    
   try{
   const refreshTokenDecoded=jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);

   const accessToken= jwt.sign(
    {username: refreshTokenDecoded.username,
    id: refreshTokenDecoded.id
    },
    process.env.TOKEN_SECERT_KEY,
    { expiresIn:"10s" }
   );

   res.setHeader("Set-Cookie", [
    `token=${accessToken}; HttpOnly;  Max-Age=10; SameSite=Lax`
  ]);
  
 
  const viewHtml=fs.readFileSync(`./views/${view}`, "utf8");
  const viewHtmlFinal=viewHtml.replaceAll("--name", refreshTokenDecoded.username);
  const finalHtml = skeleton.replace("__info__",viewHtmlFinal);
  return res.end(finalHtml);
   
}

   catch(err) {
    console.log(err)
    return res.end(" refresh token doesnt exist")
   }

}

export function checkoutHtml(req,res, skeleton, params) {
  console.log("CHECKOUT ROUTE HIT");
  const pageInfo=fs.readFileSync("./views/checkout.html","utf8")
  const finalPage= skeleton.replace('__info__',pageInfo);
  res.setHeader("Content-Type", "text/html");
  res.end(finalPage);
}


export async function checkout(req, res) {
    let body = "";

    req.on("data", chunk => {
        body += chunk;
    });

    req.on("end", async () => {
        try {
            const data = JSON.parse(body);

            const deliveryCosts = {
                standard: 399,
                express: 799
            };

            if (!Object.hasOwn(deliveryCosts, data.delivery)) {
                res.writeHead(400, {
                    "Content-Type": "application/json"
                });
            
                return res.end(JSON.stringify({
                    error: "Invalid delivery option."
                }));
            }

            //Guest Checkout cookie
          
            const guestToken =  getCookie(req,"guestToken");

            //User checkout
            
            const refreshToken = getCookie(req,"refreshToken");

            let refreshTokenDecoded;
            let guestTokenDecoded;

            try {
                refreshTokenDecoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
            } catch {
               
                refreshTokenDecoded=null;
            }

            try {
                guestTokenDecoded = jwt.verify(guestToken, process.env.JWT_GUEST_SECRET_KEY);
            } catch {
               
                guestTokenDecoded=null;
            }

            if(refreshTokenDecoded) {
            const user_id=refreshTokenDecoded.id

            const result = await client.query(
                `SELECT products.name, products.price, basket.quantity
                 FROM basket
                 INNER JOIN products
                 ON products.id = basket.product_id
                 WHERE basket.user_id = $1`,
                [user_id]
            );
            
            if(result.rows.length<1){
                res.writeHead(400, {
                    "Content-Type": "application/json"
                });
            
                return res.end(JSON.stringify({
                    error: "Your basket is empty."
                }));
            
            }
             
            // Calculate the basket subtotal in pence
            const subtotal = result.rows.reduce((total, item) => {
            const price = Number(item.price);
            const quantity = Number(item.quantity);

                if (
                    !Number.isFinite(price) ||
                    price < 0 ||
                    !Number.isSafeInteger(quantity) ||
                    quantity < 1
                ) {
                    throw new Error("Invalid basket item.");
                }

                return total + Math.round(price * 100) * quantity;
            }, 0);
       
            const amount = subtotal + deliveryCosts[data.delivery];

            if (!Number.isSafeInteger(amount) || amount <= 0) {
                throw new Error("Invalid payment amount.");
            }

          
            // Create a PaymentIntent instead of a Checkout Session
            const paymentIntent = await stripe.paymentIntents.create({
                amount:amount,
                currency: "gbp",
                automatic_payment_methods: {
                    enabled: true
                },
                receipt_email: data.email,
                metadata: {
                    user_id: String(user_id),
                    expectedAmount: String(amount)
                }
            })


            res.writeHead(200, {
                "Content-Type": "application/json"
            });

            res.end(JSON.stringify({
                clientSecret: paymentIntent.client_secret
            }));

        } 
        //guest checkout
    else if(guestTokenDecoded) {
        const guest_id=guestTokenDecoded.id

        const result = await client.query(
            `SELECT products.name, products.price, basket.quantity
             FROM basket
             INNER JOIN products
             ON products.id = basket.product_id
             WHERE basket.guest_id = $1`,
            [guest_id]
        );
        
        if(result.rows.length<1){
            res.writeHead(400, {
                "Content-Type": "application/json"
            });
        
            return res.end(JSON.stringify({
                error: "Your basket is empty."
            }));
        
        }
         
        // Calculate the basket subtotal in pence
        const subtotal = result.rows.reduce((total, item) => {
        const price = Number(item.price);
        const quantity = Number(item.quantity);

            if (
                !Number.isFinite(price) ||
                price < 0 ||
                !Number.isSafeInteger(quantity) ||
                quantity < 1
            ) {
                throw new Error("Invalid basket item.");
            }

            return total + Math.round(price * 100) * quantity;
        }, 0);
   
        const amount = subtotal + deliveryCosts[data.delivery];

        if (!Number.isSafeInteger(amount) || amount <= 0) {
            throw new Error("Invalid payment amount.");
        }

      
        // Create a PaymentIntent instead of a Checkout Session
        const paymentIntent = await stripe.paymentIntents.create({
            amount:amount,
            currency: "gbp",
            automatic_payment_methods: {
                enabled: true
            },
            metadata: {
                guest_id: String(guest_id),
                expectedAmount: String(amount)
            }
        })

        res.writeHead(200, {
            "Content-Type": "application/json"
        });

        res.end(JSON.stringify({
            clientSecret: paymentIntent.client_secret
        }));
        
    }
    
    else {
         res.statusCode=401;
         res.end("Neither guest or user is logged in")
    }
    }catch (error) {
            console.error("Checkout error:", error);

            res.writeHead(500, {
                "Content-Type": "application/json"
            });

            res.end(JSON.stringify({
                error: "Unable to start payment."
            }));

            
        }
    });
   
}


export async function stripWebhook(req, res) {

    const webhookSecret = process.env.WEBHOOK_SECERT;
    const signature = req.headers["stripe-signature"];
    let body = "";

    req.on("data", chunk => {
        body += chunk;
    });

    req.on("end", async() => {
        try {
             if(!signature) throw new Error("no signature!");

            const event = stripe.webhooks.constructEvent(
                body,
                signature,
                webhookSecret
            );

            if (event.type === "payment_intent.succeeded") {
                const paymentIntent = event.data.object;
                const expectedAmount = Number(paymentIntent.metadata.expectedAmount);
                const amount=event.data.object.amount;
                if(amount !==expectedAmount) throw new Error ("amount not the same as expected amount!")
                const data = event.data.object.metadata;
                const paymentIntent_id= event.data.object.id;
                await createOrder(data,amount,paymentIntent_id);
                console.log(paymentIntent);
                console.log("Payment successful:", paymentIntent.id);
            }

            res.statusCode = 200;
            res.end("Webhook received");
        } catch (err) {
            console.error("Webhook verification failed:", err.message);
            if(err.message=="no signature!") {
            res.statusCode = 400;
            res.end("Invalid webhook signature");
            } 
            else {
            res.statusCode = 500;
            res.end("Webhook processing failed");
            }
        }
    });
}

export async function createOrder(info,amount,paymentIntent_id){
const user_id=info.user_id;

if(user_id) {

const result= await client.query('INSERT INTO ORDERS (user_id,order_amount,payment_intent_id) VALUES($1,$2,$3) ON CONFLICT (payment_intent_id) DO NOTHING',
[user_id,amount,paymentIntent_id]);

if(result.rowCount===1) await clearBasket(info);

}

else{
    const guest_id=info.guest_id;
    const result= await client.query('INSERT INTO ORDERS (guest_id,order_amount,payment_intent_id) VALUES($1,$2,$3) ON CONFLICT (payment_intent_id) DO NOTHING',
    [guest_id,amount,paymentIntent_id
    ]);
    
    if(result.rowCount===1) await clearBasket(info);
}

}

export async function clearBasket(info){
   //clear users basket
    const user_id=info.user_id;

    if(user_id) {
   const result=await client.query('delete from basket where user_id=$1',
   [user_id])

   if(result.rowCount>0) console.log("cart cleared")
}
//clear guests basket
    else {
        const guest_id=info.guest_id;
        const result=await client.query('delete from basket where guest_id=$1',
        [guest_id])
     
        if(result.rowCount>0) console.log("cart cleared")
    }
}

export function ViewOrders(req,res){

}
