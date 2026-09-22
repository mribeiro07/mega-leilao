const http=require("http"),fs=require("fs"),path=require("path"),crypto=require("crypto");
const PORT=process.env.PORT||3000,ROOT=__dirname,PUB=path.join(ROOT,"public"),DB=path.join(ROOT,"data.json");
const read=()=>JSON.parse(fs.readFileSync(DB));const save=x=>fs.writeFileSync(DB,JSON.stringify(x,null,2));
const send=(r,s,d)=>{r.writeHead(s,{"Content-Type":"application/json; charset=utf-8","Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"Content-Type, Authorization"});r.end(JSON.stringify(d))};
const body=q=>new Promise((ok,no)=>{let b="";q.on("data",x=>b+=x);q.on("end",()=>{try{ok(b?JSON.parse(b):{})}catch(e){no(e)}})});
const hash=x=>crypto.createHash("sha256").update(String(x)).digest("hex");
function auth(req){let h=req.headers.authorization||"",t=h.startsWith("Bearer ")?h.slice(7):"",d=read(),s=d.sessions.find(x=>x.token===t);return s?d.users.find(x=>x.id===s.userId):null}
function need(req,res,role){let u=auth(req);if(!u||role&&u.role!==role){send(res,role?403:401,{error:role?"Acesso administrativo necessário.":"Faça login para continuar."});return null}return u}
async function api(req,res,p){
 let d=read();
 if(req.method==="OPTIONS")return send(res,204,{});
 if(req.method==="GET"&&p==="/api/lots")return send(res,200,d.lots);
 if(req.method==="GET"&&p.startsWith("/api/lots/")){let x=d.lots.find(x=>x.id===p.split("/").pop());return x?send(res,200,x):send(res,404,{error:"Lote não encontrado."})}
 if(req.method==="POST"&&p==="/api/register"){let b=await body(req);if(!b.name||!b.email||!b.password)return send(res,400,{error:"Preencha todos os campos."});if(d.users.some(x=>x.email===b.email))return send(res,409,{error:"E-mail já cadastrado."});d.users.push({id:crypto.randomUUID(),name:b.name,email:b.email,password:hash(b.password),role:"user"});save(d);return send(res,201,{message:"Conta criada."})}
 if(req.method==="POST"&&p==="/api/login"){let b=await body(req),u=d.users.find(x=>x.email===b.email&&x.password===hash(b.password||""));if(!u)return send(res,401,{error:"E-mail ou senha inválidos."});let token=crypto.randomBytes(32).toString("hex");d.sessions.push({token,userId:u.id});save(d);return send(res,200,{token,user:{id:u.id,name:u.name,email:u.email,role:u.role}})}
 if(req.method==="POST"&&p==="/api/logout"){let h=req.headers.authorization||"",t=h.replace("Bearer ","");d.sessions=d.sessions.filter(x=>x.token!==t);save(d);return send(res,200,{ok:true})}
 if(req.method==="GET"&&p==="/api/me"){let u=need(req,res);return u&&send(res,200,{id:u.id,name:u.name,email:u.email,role:u.role})}
 if(req.method==="GET"&&p==="/api/my-bids"){let u=need(req,res);if(!u)return;return send(res,200,d.bids.filter(b=>b.userId===u.id).map(b=>({...b,lot:d.lots.find(l=>l.id===b.lotId)})))}
 if(req.method==="POST"&&p==="/api/bids"){let u=need(req,res);if(!u)return;let b=await body(req),l=d.lots.find(x=>x.id===b.lotId),amount=Number(b.amount);if(!l)return send(res,404,{error:"Lote não encontrado."});if(l.status!=="aberto")return send(res,400,{error:"Lote encerrado."});if(!Number.isFinite(amount)||amount<=l.price)return send(res,400,{error:"O lance deve ser maior que o atual."});l.price=amount;l.bids++;d.bids.push({id:crypto.randomUUID(),lotId:l.id,userId:u.id,amount,at:new Date().toISOString()});save(d);return send(res,201,{lot:l})}
 if(req.method==="GET"&&p==="/api/admin/stats"){let u=need(req,res,"admin");if(!u)return;return send(res,200,{users:d.users.length,lots:d.lots.length,bids:d.bids.length,open:d.lots.filter(x=>x.status==="aberto").length})}
 if(req.method==="GET"&&p==="/api/admin/users"){let u=need(req,res,"admin");if(!u)return;return send(res,200,d.users.map(({password,...x})=>x))}
 if(req.method==="POST"&&p==="/api/admin/lots"){let u=need(req,res,"admin");if(!u)return;let b=await body(req);if(!b.title||!b.category||!b.price||!b.end)return send(res,400,{error:"Preencha os campos obrigatórios."});let l={id:"L"+Date.now().toString().slice(-7),title:b.title,category:b.category,price:Number(b.price),bids:0,end:b.end,location:b.location||"",status:"aberto",emoji:b.emoji||"🔨",description:b.description||""};d.lots.push(l);save(d);return send(res,201,l)}
 if((req.method==="DELETE"||req.method==="PATCH")&&p.startsWith("/api/admin/lots/")){let u=need(req,res,"admin");if(!u)return;let id=p.split("/").pop(),i=d.lots.findIndex(x=>x.id===id);if(i<0)return send(res,404,{error:"Lote não encontrado."});if(req.method==="DELETE"){d.lots.splice(i,1);save(d);return send(res,200,{ok:true})}let b=await body(req);Object.assign(d.lots[i],b);save(d);return send(res,200,d.lots[i])}
 send(res,404,{error:"Rota não encontrada."})
}
const mime={".html":"text/html; charset=utf-8",".css":"text/css; charset=utf-8",".js":"text/javascript; charset=utf-8"};
http.createServer(async(req,res)=>{try{let p=new URL(req.url,"http://localhost").pathname;if(p.startsWith("/api/"))return api(req,res,p);let f=path.join(PUB,p==="/"?"index.html":p);if(!f.startsWith(PUB))return send(res,403,{error:"Forbidden"});if(!fs.existsSync(f))f=path.join(PUB,"index.html");res.writeHead(200,{"Content-Type":mime[path.extname(f)]||"application/octet-stream"});fs.createReadStream(f).pipe(res)}catch(e){send(res,500,{error:"Erro interno."})}}).listen(PORT,()=>console.log("MegaLeilão em http://localhost:"+PORT));
