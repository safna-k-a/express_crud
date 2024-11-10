const http=require("http");
http.createServer((req,res)=>{
    res.write("Haii");
    res.end();
}).listen(3000);