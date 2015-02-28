// 변수 선언문은 socket.io의사용과 대화 상태를 정의하는 여러 변수의 초기화와 관련된 내용.
var socketio = require('socket.io');
var io;
var guestNumber = 1;
var nickNames = {};
var namesUsed = [];
var currentRoom = {};

/*******************************
 * 연결 맺기 로직
 * 서버 함수인 listen을 정의한다.
 * ****************************/
//기존의 http서버에 피기백(piggyback)방식으로 SocketIO서버를 시작
 exports.listen = function(server){
    io = socketio.listen(server);
    io.set('log level', 1);
    io.sockets.on('connection', function(socket){ // 각 연결을 어떻게 처리해야 할지 정의
        guestNumber = assignGuestName(socket, guestNumber, nickNames, namesUsed); //사용자가 접속하면 닉네임을 부여
        joinRoom(socket,'Lobby');  //사용자가 접속 대기실(Lobby)로 이동
        handleMessageBroadcasting(socket, nickNames); //사용자의 메시지,닉네임변경,채팅방 생성이나 변경에 관한 처리.
        handleNameChangeAttempts(socket, nickNames, namesUsed); //이름변경 요청 처리
        handleRoomJoining(socket);
        socket.on('rooms', function(){  //요청 시 이미 생성된 채팅방 목록을 사용자에게 제공
        socket.emit('rooms', io.sockets.manager.rooms);
        });
        handleClientDisconnection(socket, nickNames, namesUsed); //사용자가 접속을 끊었을때 관련 데이터를 정리하기 위한 로직
    });
 };
/**********************************************************
 * ---------------- function assignGuestName()
 *
 * 이 에플리케이션의 요구사한을 처리할 각 헬퍼 함수를 추가.
 * 먼저 추가야하는 헬퍼함수는 새로운 사용자의 닉네임과 관련된 처리를 담당하는 assgnGuestName함수.
 * - 새로운 사용자가 처음 채팅방에 접속하면 Lobby라는 채팅방에 입장하게 되며 다른 사용자와 구분 할 수 있는
 *   이름을 부여하기 위해 assignGuestName 함수를 호출함.
 * - 기본적으로 손님 닉네임은 Guest 뒤에 새로운 사용자가 접속할 때마다 증가하는 숫자를 붙여서 만듦.
 *   생성된 닉네임은 nickName 변수에 저장되며 내부적으로 소켓 아이디와 연동됨. 또한 손님 닉네임은
 *   현재 사용중인 모든 닉네임을 저장하는 변수인 nameUsed에도 추가됨.
 **********************************************************/
function assignGuestName(socket, guestNumber, nickNames, namesUsed){
    var name = 'Guest' + guestNumber; //새로운 손님 닉네임 생성.
    //닉네임을 클라이언트 연결 아이디와 연동
    nickNames[socket.id] = name;
    // 손님에게 닉네임을 알려줌.
    socket.emit('nameResult',{
       success: true,
           name: name
    });
    //생성된 닉네임을 사용중 닉네임에 추가
    namesUsed.push(name);
    //손님 닉네임 생성에 사용되는 카운터 숫자 증가.
    return guestNumber + 1;
} //end function assignGuestName()

/**********************************************************
 * --------------- function joinRoom()
 *
 * 채팅방 입장 JoinRoom 함수
 * 사용자가 socket.IO 로 만든방에 입장 간단함,
 * socket객체의 join 함수만 호출하면됨.
 * 애플리케이션은 입장한 사용자와 같은 방에 있는 다른 사용자와 관련된 세부 내용을 주고 받음.
 * 애플리케이션은 입장한 사용자에게 채팅방에 있는 다른 사용자들의 정보를 알려주고 사용자들에게
 * 새로운 사용자가 입장했다는것을 알려 줘야함.
 **********************************************************/
function joinRoom(socket, room){

    //사용자가 채팅방에 입장
    socket.join(room);

    //사용자가 이 방에 입장 했음을 저장.
    currentRoom[socket.id] = room;

    //사용자에게 새로운 채팅방에 입장 했음을 알려줌.
    socket.emit('joinResult', {room:room});

    //채팅방의 다른 사용자들에게 새로운 사용자가 입장 했음을 알림.
    socket.broadcast.to(room).emit('message',{
       text:nickNames[socket.id] + ' has joined ' + room + '.'
    });

    //사용자가 참여한 방안에 다른 사용자가 있는지 판단.
    var usersInRoom = io.sockets.clients(room);

    if(usersInRoom.length > 1){
        //다른 사용자가 있다면 해당 사용자의 정보를 요약
        var usersInRoomSummary = 'Users currently in' + room + ': ';

            for(var index in usersInRoom){
                var userSocketId = usersInRoom[index].id;

                if(userSocketId != socket.id){
                    if(index > 0){
                        usersInRoomSummary += ', ';
                    }
                usersInRoomSummary += nickNames[userSocketId];
                }
            }//end for
    usersInRoomSummary += '.';
    //입장한 사용자에게 요약한 다른 사용자의 정보를 송신
    socket.emit('message',{text: usersInRoomSummary});
    }// end if
}// end funtion-joinRoom()


/***********************************************************
 * -------------- function handleNameChangeAttempts()
 * 닉네임 변경 요청 처리
 * 이름변경 요청 처리를 위한 로직
***********************************************************/

function handleNameChangeAttempts(socket, nickNames, namesUsed){
    //이벤트 리스너에 nameAttempt 이벤트 등록
    socket.on('nameAttempt', function(name){
        //Guest로 시작하는 닉네임은 허용불가.
       if(name.indexOf('Guest') == 0){
           socket.emit('nameResult', {
              success:false,
              message: 'Names cannot begin width "Guest".'
            });
       } else{
           // 들록되지 안은 닉네임 이라면 등록.
           if(namesUsed.indexOf(name) == -1){
               var previousName = nickNames[socket.id];
               var previousNameIndex = namesUsed.indexOf(previousName);
               namesUsed.push(name);
               nickNames[socket.id] = name;
               // 변경전 닉네임은 다른 사용자가 사용할 수 있게 삭제.
               delete namesUsed[previousNameIndex];
               socket.emit('nameResult', {
                  success: true,
                  name: name
               });

               socket.broadcast.to(currentRoom[socket.id]).emit('message', {
                   text: previousName + 'is now known as ' + name + '.'
               });

           } else{
            // 이미등롣되있는 닉네임 이라면 클라이언트에 오류 전송.
             socket.emit('nameResult', {
                 success: false,
                 message: 'That name is already in use.'
             });
        } // end-in else
       } // end-out else
    }); // end socket.on
} //end function handleNameChangeAttempts()


/**********************************************************
 * ------------- function handleMessageBroadcastiong()
 * 채팅 메시지 보내기
 * 사용자는, 메시지를 전송할 채팅방과 메시지를 명시해 이벤트를 발생시키고
 * 서버는 채팅방에 있는 다른 사용자에게 채팅 메시지를 전송한다.
 *********************************************************/
function handleMessageBroadcasting(socket){
    socket.on('message', function(message){
       socket.broadcast.to(message.room).emit('message', {
           text: nickNames[socket.id] + ': ' + message.text
       });
    });
}

/**
 * ------------- function handleRoomJoining()
 *  사용자가 이미 만들어진 채팅방에 입장하거나 새로운 채팅방을 직접 만드는 기능추가.
 *  socket.IO의 leave함수를 사용함!!!!!
 * ***/
function handleRoomJoining(socket){
    socket.on('join', function(room){
        socket.leave(currentRoom[socket.id]);
        joinRoom(socket, room.newRoom);
    });
}

/*******************************************************
 * ------------- function handleClientDisconnection()
 * 사용자의 접속처리해제
 * 사용자가 채팅방을 나갔을 때 nickNames 와 namesUsed변수에서 사용자의
 * 닉네임을 삭제하는 로직.
 *******************************************************/
function handleClientDisconnection(socket){
    socket.on('disconnect', function(){
        var nameIndex = namesUsed.indexOf(nickNames[socket.id]);
        delete namesUsed[nameIndex];
        delete nickNames[socket.id];
    });
}



