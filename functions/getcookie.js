export function getCookie(req,name){

    const cookie=req.headers.cookie || "";
    
   return cookie.split("; ")
    .find(c => c.startsWith(`${name}=`))
    ?.slice(name.length + 1);
}