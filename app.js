var logger = require('morgan')
var express = require('express')
var bodyParser = require('body-parser')
var low = require('lowdb')
var FileAsync = require('lowdb/adapters/FileAsync')
var crypto = require('crypto')
var fs = require('fs')
var FileStreamRotator = require('file-stream-rotator')
var log4js = require('log4js')
var uuidV1 = require('uuid/v1')
var cors = require('cors')


var app = express()
var port = 8888
var jsonParser = bodyParser.json()
var urlencodedParser = bodyParser.urlencoded({extended:true})
app.use(jsonParser)
app.use(urlencodedParser)
app.use(express.static('public'))
app.use(cors())
/********* http logger *******/
var logdir = './log/'
fs.existsSync(logdir) || fs.mkdirSync(logdir)

var accessLogStream = FileStreamRotator.getStream({
  filename: logdir + '/access-%DATE%.log',
  frequency: 'daily',
  verbose: false
})
app.use(logger('combined',{stream:accessLogStream}))
/*********** log4js log *************/
 log4js.configure({

   appenders:{
	 ruleConsole:{ type:'console'},
	 ruleFile:{
       type:'dateFile',
       filename:logdir+'all.log',
	   alwaysIncludePattern:true,
       pattern:"-yyyy-MM-dd.log"	   
     }    
   },
   categories:{
       file:{appenders:['ruleFile'],level:'info'},
       another:{appenders:['ruleConsole'],level:'trace'} ,
	   default:{appenders:['ruleFile','ruleConsole'],level:'trace'} 
   }
	   
 })
var logger4js = log4js.getLogger('file')

/**********   md5 with salt  *************/

 function passwordcrypto(password){
 
   var saltPassword = password+"%%cib_salt##"
   var md5 = crypto.createHash('md5')
   var result = md5.update(saltPassword).digest('hex')
	   
   return result
 }

/**********   lowdb  *************/
// Create database instance 
const adapter = new FileAsync('db.json')

low(adapter)
  .then(db => {


/**********   manage invite code  *************/

 function verifyCode(invitecode){
   var result = false
     var ifhas = db.get('inviteCode')
        .find({ code: ''+invitecode })
        .value()
	   
     if(ifhas === undefined){
		 result = false
	 }else{
         result = true
	 }
   return result
 }
function updateCode(invitecode){
   db.get('inviteCode')	   
	   .find({code:''+invitecode})
	   .assign({code:''+uuidV1()})
	   .write()
}
//-----------------sign up----------------------------
    // POST /signup
    app.post('/signup', (req, res) => {
       var result = ""
	   console.log('post req:'+req.body.name+','+req.body.password+','+req.body.invitecode)
  if(verifyCode(req.body.invitecode)){
       var ifhas = db.get('userinfo')
        .find({ name: ''+req.body.name })
        .value()
       if(ifhas === undefined){
	        db.get('userinfo')
            .push({name:req.body.name,password:passwordcrypto(req.body.password)})
            .write()
       
	        var userinfo = db.get('userinfo')
            .find({ name: ''+req.body.name })
            .value()

           if(userinfo === undefined){
		       var resultJson = {
		    	  "code":"-1001",
                  "content":"add user failed"
		    	}
	           result = JSON.stringify(resultJson)
	       }else{
               var resultJson = {
			      "code":"1000",
                  "content":"add user ok"
    
			    }
               updateCode(req.body.invitecode)
	           result = JSON.stringify(resultJson)
	       }
	   }else{
		   var resultJson = {
			  "code":"-1002",
              "content":"user exist"
			}
	       result = JSON.stringify(resultJson)
	   }
  }else{
           var resultJson = {
			  "code":"-1003",
              "content":"invite code invalid"
			}
	       result = JSON.stringify(resultJson)
  }


	   console.log("result:"+result)
	   logger4js.info("result:"+result)

	   res.send(result)
    })


//-----------------sign in----------------------------
    // POST /signin
    app.post('/signin', (req, res) => {
       
	   console.log('post req:'+req.body.name+','+req.body.password)
              
	    var userinfo = db.get('userinfo')
        .find({ name: ''+req.body.name })
        .value()

       var result = ""

       if(userinfo === undefined){
		   var resultJson = {
			  "code":"-2001",
              "content":"username or password not correct"
			}
	       result = JSON.stringify(resultJson)
		   console.log("no this username")
	   }else if(userinfo.password !== passwordcrypto(req.body.password)){
		   var resultJson = {
			  "code":"-2002",
              "content":"username or password not correct"
			}
	       result = JSON.stringify(resultJson)
		   console.log("password error")
	   }else{
           var resultJson = {
			  "code":"2000",
              "content":"login success!"

			}
	       result = JSON.stringify(resultJson)
	   }
       logger4js.info("result:"+result)
	   res.send(result)
    })
//-----------------add msg----------------------------
    // POST /addmsg
    app.post('/addmsg', (req, res) => {
       
	   console.log('post req:'+req.body.receivableAmount+','+req.body.receiptAmount)
      

       var result = ""

       var contentJson ={
	       "receivableAmount":req.body.receivableAmount,
		   "receiptAmount":req.body.receiptAmount,
		   "notifyInfo":req.body.notifyInfo	   
	   }
	   db.get('msg')
            .push({name:"015650",content:contentJson})
            .write()
       
	        var msginfo = db.get('msg')
            .find({ content: contentJson})
            .value()

           if(msginfo === undefined){
		       var resultJson = {
		    	  "code":"-3001",
                  "content":"add msg failed"
		    	}
	           result = JSON.stringify(resultJson)
	       }else{
               var resultJson = {
			      "code":"3000",
                  "content":"add msg ok"
    
			    }
              
	           result = JSON.stringify(resultJson)
	       }
      
       logger4js.info("result:"+result)
	   res.send(result)
    })
//-----------------get msg----------------------------
    // POST /getmsg
    app.post('/getmsg', (req, res) => {
       
	   console.log('post req:'+req.body.name+','+req.body.content)
              
	    var msginfo = db.get('msg')
        .filter({ name: ''+req.body.name })
        .value()

       var result = ""

       if(msginfo === undefined || msginfo.length === 0){
		   var resultJson = {
			  "code":"4001",
              "content":"no msg"
			}
	       result = JSON.stringify(resultJson)
		   console.log("no msg")
	   }else{
           var resultJson = {
			  "code":"4000",
              "content":msginfo

			}
	       result = JSON.stringify(resultJson)
	   }
       logger4js.info("result:"+result)
	   res.send(result)
    })
//----------------- mk an invite code ----------------------------
    // GET /mkinvitecode
    app.get('/mkinvitecode', (req, res) => {
       
	   console.log('get req:'+req.query.access)
	   var dateNow = new Date()
	   var countresult = dateNow.getDate()*dateNow.getHours()+dateNow.getMinutes()
	   console.log("countresult:"+countresult)
		   console.log("parseInt(req.query.access):"+parseInt(req.query.access))
   var result = ""

   if(parseInt(req.query.access) >= countresult-1 && parseInt(req.query.access) <= countresult+1){
       var radomnum = ''+(Math.floor(Math.random()*10)+1) 
	    var invitecode = db.get('inviteCode')
        .find({ id: radomnum})
        .value()

       

       if(invitecode === undefined){
		  
		   console.log("error random:"+radomnum)
		   logger4js.info("error random:"+radomnum)

		   result = "check the log,something goes wrong"
	   }else{
           
	       result = invitecode.code
	   }
   }else{
           result="access error!"
   }
       logger4js.info("result:"+result)
	   res.send(result)
   })


//----------------- get rn version  ----------------------------
    // GET /getmsg
   app.get('/getversion', (req, res) => {
       
	   console.log('rn get req:'+req.query.type)
	  
   var result = ''
   if(req.query.type === 'android'){
       if(req.query.bundleName === 'index.zip'){
             result = '1.0.2'
       }else if(req.query.bundleName === 'index2.zip'){
             result = '1.0.0'
       } 
	    
   }else{
           result= '0.0.1'
   }
       logger4js.info("rn result:"+result)
	   res.send(result)
   })




  /* db.defaults({
	   inviteCode:[
	   {id:"1",code:uuidV1()},
	   {id:"2",code:uuidV1()},
       {id:"3",code:uuidV1()},
	   {id:"4",code:uuidV1()},
	   {id:"5",code:uuidV1()},
	   {id:"6",code:uuidV1()},
       {id:"7",code:uuidV1()},
	   {id:"8",code:uuidV1()},
	   {id:"9",code:uuidV1()},
	   {id:"10",code:uuidV1()}  
       ]
	   }).write()
 */


  })
/*********************************/




app.listen(port,function(){
         console.log('server start at port:'+port)
       })

