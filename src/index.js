const path = require('path')
const http  = require('http')
const express = require('express')
const socketio = require('socket.io')
const Filter = require('bad-words')
const {generateMessage,generateLocation} = require('./utils/messages')
const {addUser,removeUser,getUser,getUsersInRoom} = require('./utils/users')

const app = express()
const server = http.createServer(app) // create new web server
const io = socketio(server) // configure socket io

const port = process.env.PORT || 3000

const publicDirectoryPath = path.join(__dirname,'../public')

app.use(express.static(publicDirectoryPath))


io.on('connection',(socket)=>{ // printing when a user connect 
    console.log('New web socket connection')

    socket.on("join",(options,callback)=>{
        const {error,user} = addUser({id:socket.id,...options})
        
    if(error){
        return callback(error)
    }

    socket.join(user.room) // join the room
    socket.emit('message', generateMessage('Admin','Welcome'))
    socket.broadcast.to(user.room).emit('message',generateMessage("Admin",`${user.username} has joined!`))
    io.to(user.room).emit('roomData',{
        room:user.room,
        users:getUsersInRoom(user.room)
    })

    callback()
        // socket.emit, io.emit, socket.broadcast.emit
        // io.to.emit, socket.broadcast.to.emit
    })

    socket.on('sendMessage',(message,callback)=>{
        const filter = new Filter()
        const user = getUser(socket.id)
        if(filter.isProfane(message)){
            return callback('Profanity is not allowed')
        }
        io.to(user.room).emit('message',generateMessage(user.username,message))
        callback()
    })

    socket.on('sendLocation',(locationMessage,callback)=>{
        const user = getUser(socket.id)
        io.to(user.room).emit('locationMessage',generateLocation(user.username,`https://google.com/maps?q=${locationMessage.latitude},${locationMessage.longitude}`))
        callback()
    })

    socket.on('disconnect',()=>{ // when a user remove the page
        const user = removeUser(socket.id)
        if(user){
            io.to(user.room).emit('message',generateMessage('Admin',`${user.username} has left!`))
            io.to(user.room).emit('roomData',{
                room:user.room,
                users:getUsersInRoom(user.room)
            })
        }

    })
})

server.listen(port,()=>{
    console.log("Listening on the port ",port)
})
