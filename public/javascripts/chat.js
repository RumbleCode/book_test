
/****
 * 클라이언트 측 채팅 명령과 메시지 전송 그리고 채팅방과 닉네임변경에 대한 처리를 수행할
 * 자바스크립트 프로토 타입 객체 만들기.
 ***/

// 이 코드는 자바스크립트에서 객체를 생성할  Socket.IO의 socket을 단일 인자로 받는 클래스와 같은 역할을 함.
var Chat = function(socket){
    this.socket = socket;
};

//다음으로 채팅 메시지를 전송할 함수추가.
 Chat.prototype.sendMessage = function(room,text){
     var message = {
         room: room,
         text: text
     };
     this.socket.emit('message', message);
 };

//채팅방을 변경하기위한 함수 추가
 Chat.prototype.changeRoom = function(room){
     this.socket.emit('join', {
     newRoom: room
     });
 };

// 채팅 명령을 처리하기 위한 두가지 명령수행
// join 은 채팅방에 참여하거나 생성할 수 있는 명령.
// nick 은 닉네임을 변경하는데 사용하는 명령어.
Chat.prototype.processCommand = function(command){
    var words = command.split(' ');
    var command = words[0]
        .substring(1, words[0].length)
        .toLowerCase();
    var message = false;

    switch(command){
        case 'join':
            words.shift();
            var room = words.join(' ');
            this.changeRoom(room);
            break;

        case 'nick':
            words.shift();
            var name = words.join(' ');
            this.socket.emit('nameAttempt', name);
            break;

        default:
            message = 'Unrecognized command.';
            break;
    };
    return message;
};










