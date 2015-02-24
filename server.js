var http  = require('http');

// 파일 시스템 관련기능을 제공하는 내장 fs 모듈
var fs = require('fs');

// 파일 시스템 경로 관련 기능을 제공하는 내장 path 모듈
var path = require('path');

// MIME 타입을 판단 할수 있는 서드파티(외부모듈) 모듈을 이용.
var  mime = require('mime');

// 캐시 변수는 캐시 파일 데이터를 다루는데 사용됨.
var cache = {};

/*****************************************************
* 파일 데이타 보내기와 오류 응답
* 정적 http 파일 서비스에 필요한 세개의 헬퍼 함수를 작성
*****************************************************/

// 첫번째: 요청한 파일이 존재하지 않을 때 404 오류를 전송하는 부분.
function send404(response){
    response.writeHead(404, {'Content-Type' : 'text/plain'});
    response.write('Error 404 : resource not found 파일을 찾을 수 없습니다!');
    response.end();
} // function send404 END

// 두번째: 파일 데이타 서비스 함수, 먼저 적절한 http 헤더를 작성한 다음 파일 내용을 전송.
function sendFile(response, filePath, fileContents) {
    response.writeHead(
            200,
            {"Content-Type" : mime.lookup(path.basename(filePath))}
        );
    response.end(fileContents);
} // function sendFile END

// 세번째:
//  다음 함수는 캐시에 파일이 존재하는지 판단하여 캐시에 있다면
//  바로 서비스하고 없다면 디스크에서 읽어와서 서비스한다.
//  만약 디스크에도 파일이 존재하지 않는다면 응답으로
//  HTTP404 오류를 반환한다.
function serveStatic(response, cache, absPath){

    //파일이 메모리에 캐시되어있는지 확인.
    if(cache[absPath]){

        // 캐시에 존재하는 파일이면 바로 서비스.
        sendFile(response, absPath, cache[absPath]);
    } else {
        // 파일 존재 여부 검사
        fs.exists(absPath, function(exists){
            if(exists){
                    // 디스크에서 파일 읽기
                    fs.readFile(absPath, function(err, data)  {
                        if(err){
                            send404(response);
                        } else {
                            // 디스크에 저장된 파일 캐시로드 및 서비스
                            cache[absPath] = data;
                            sendFile(response, absPath, data);
                        }
                    });
                // HTTP 오류응답.
            } else {
                send404(response);
            }
        });
    }
} //function serveStatic END

/**************************************************************
 * HTTP 서버를 생성할 때는 각 HTTP 요청을 어떻게 처리해야 하는지를 정의한
 * 콜백 역할을 하는 익명함수가 createServer 에 인자로 전달된다.
 * 콜백 함수는 require 와 response 두개의 인자를 받는다.
 * 콜백이 실행될 때 HTTP 서버는 두개의 인자로 사용될 객체를 생성해
 * 전달하게 되는데 이를 이용해서 세부적인 요청사항에 대한 처리와 응답을
 * 보내게 된다.node,js의 http모듈 간단 설명
 * ***********************************************************/
// 요청에 대한 처리를 정의하고 있는 익명함수를 이용한 HTTP 서버 생성.
var server;
server = http.createServer(function (request, response) {

    //변수 선언
    var filePath = false;

    // 기본적으로 서비스되는 HTML 파일 결정
    if(request.url == '/'){
      filePath = 'public/index.html';
    }else{
        // url 파일을 상대 경로로 변환
        filePath = 'public' + request.url;
    }//if END

    var absPath = './' + filePath;
    //정적 파일 서비스
    serveStatic(response, cache, absPath);
});

//HTTP 서버 시작
server.listen(3000, function(){
    console.log("Server listening on port 3000.");
});










