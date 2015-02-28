
/**
 *
 * 채팅방 목록을 사용자 인테 페이스에 보여주기.
 * 보안 관점의 두종류의 텍스트
 *  - 하나는 애플리케이션이 생성한 텍스트 데이터 신뢰할 수 있음.
 *  - 또하나는 애플리케이션의 사용자가 생성한 텍스트
 *    - 악의적인 사용자가 < script>테그에 자바스크립트 로직이 들어간 텍스트 데이터를 고의로 입력할 가능성.
 *      (이러한 공격을 "XSS 공격" 이라고함. 하이재킹 가능)
 *
 *  따라서 두가지 헬퍼함수를 사용함.
 *  1. divEscapedContentElement():신뢰할 수 없는 텍스트 출력.(p67)
 *  2. divSystemContentElement(): 신뢰할 수 있는 텍스트 출력함수.
 *      - 사용자가 아닌 시스템이 생성한 텍스트.
 * * jQuery를 사용함.
 * **/


function divEscapedContentElement(message){
    return $('<div></div>').text(message);
}

function divSystemContentElement(message){
    return $('<div></div>').html('<i>' + message + '</i>');
}

// 사용자 입력처리
// 사용자가 (/) 문자를 시작으로 작성한 글은 채팅 명령으로 처리된다.
// 그 이외의 메시지는 다른 모든 사용자에게 전송되고 현재 참여한 채팅방의의 대화글 목록에 추가된다.
function processUserInput(chatApp, socket){
    var message = $('#send-message').val();
    var systemMessage;

    // 사용자 입력이 '/' 로 시작하면 채팅 명령으로 처리함.
    if(message.charAt(0) == '/'){
        systemMessage = chatApp.processCommand(message);
        if(systemMessage){
            $('#messages').append(divSystemContentElement(systemMessage));
        }
    }else{
        //다른 사용자에게 입력한 내용전달.
        chatApp.sendMessage($('#room').text(), message);
        $('#messages').append(divEscapedContentElement(message));
        $('#messages').scrollTop($('#messages').prop('scrollHeight'));
    }
    $('#send-message').val('');
}


/**
 * 이코드는 Socket.IO 이벤트를 다루는 클라이언트 측 초기화를 처리한다.
 * **/

var socket = io.connect();

$(document).ready(function(){
   var chatApp = new Chat(socket);

//----------------------------------------------------------------
// 닉네임 변경 요청 결과 출력
   socket.on('nameResult', function(result){
       var message;

       if(result.success){
           message = '당신의 현재 이름: ' + result.name + '. ';
       }else{
           message = result.message;
       }
       $('#messages').append(divSystemContentElement(message));
   });

//--------------------------------------------------------------------
// 채팅 변경 결과 출력
    socket.on('joinResult', function(result){
       $('#room').text(result.room);
       $('#messages').append(divSystemContentElement('Room Changed.'));
    });

//-----------------------------------------------------------------
// 수신 메시지 출력
    socket.on('message', function(message){
       var newElement = $('<div></div>').text(message.text);
       $('#messages').append(newElement);
    });

//----------------------------------------------------------------
// 입장할 수 있는 채팅방 목록 출력
    socket.on('rooms', function(rooms){
        $('#room-list').empty();
        for(var room in rooms){
            room = room.substring(1, room.length);
            if (room != ''){
                $('#room-list').append(divEscapedContentElement(room));
            }
        }

   
//---------------------------------------------------------------
// 채팅방 이름을 클릭해 채팅방을 변경 할 수 잇게 한다.
        $('#room-list div').click(function(){
           chatApp.processCommand('/join ' + $(this).text());
           $('#send-message').focus();
        });
    });

//----------------------------------------------------------------
// 주기적으로 현재 채팅방 목록 요청
    setInterval(function(){
        socket.emit('rooms');
    }, 1000);

    $('#send-message').focus();

    // 메시지를 전송하기 위해 폼을 제출할 수 있게 한다.
    $('#send-form').submit(function(){
        processUserInput(chatApp, socket);
        return false;
    });
});

























